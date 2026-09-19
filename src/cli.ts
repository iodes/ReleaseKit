#!/usr/bin/env node
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { Command, CommanderError, Option } from 'commander';
import { Project, prepare, startProject } from './project.js';
import { initProject, readExistingSetup, updateProject, formatUpdate, formatUpdateFailure, type InitOptions } from './install.js';
import { commaList, parseTools, interactiveSetup } from './setup.js';
import { listReleases, projectStatus, formatStatus } from './status.js';
import { refKey } from './refs.js';
import { addNote, removeNote, markTranslation, syncImagePolicy } from './content.js';
import { planImages, importImage, type ImportImageOptions } from './images.js';
import { validate, finalize } from './validate.js';
import { moveReleases, type MoveOptions } from './move.js';
import { ref } from './refs.js';
import { exportBundle } from './export.js';
import { noteMetaSchema, assetVariant, type ProjectConfig } from './model.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const program = new Command();
program.name('releasekit').description('Git-based visual release content and agent skills').version(version)
  .option('--cwd <directory>', 'project working directory', process.cwd())
  .option('--json', 'print machine-readable results')
  .option('--no-interactive', 'disable setup prompts (also disabled for JSON and non-TTY input)')
  .showSuggestionAfterError()
  .showHelpAfterError('(Run releasekit --help for available commands.)')
  .exitOverride();
program.configureOutput({ writeErr: message => {
  if (!process.argv.includes('--json')) process.stderr.write(message);
} });
program.addHelpText('after', '\nGetting started:\n  releasekit init\n  releasekit list\n  releasekit status\n\nUse releasekit-draft with your agent to write a release. Run any command with --help for details.');
type ChannelOption = { channel?: string };
const target = (version: string, options: ChannelOption) => ref({ version, channel: options.channel });
const project = () => Project.find(path.resolve(program.opts<{ cwd: string }>().cwd));
program.hook('preAction', async (_command, action) => {
  const channel = action.opts<ChannelOption>().channel;
  if (channel !== undefined) await project().requireChannel(channel);
});
function emit(value: unknown, summary?: string) {
  console.log(program.opts().json || !summary ? JSON.stringify(value, null, 2) : summary);
}

program.command('init [directory]').description('Initialize a project or reconfigure its agent tools')
  .option('--product <name>', 'product name')
  .option('--tools <tools>', 'comma-separated codex,claude,cursor, or none')
  .addOption(new Option('--themes <policy>', 'project image variants').choices(['both', 'dark', 'light']))
  .option('--source-locale <locale>', 'original language, defaults to en-US')
  .option('--locales <locales>', 'comma-separated languages including the original')
  .action(async (directory: string | undefined, options: { product?: string; tools?: string; themes?: ProjectConfig['visuals']['themes']; sourceLocale?: string; locales?: string }) => {
    const instance = directory === undefined ? project() : Project.find(path.resolve(program.opts<{ cwd: string }>().cwd, directory));
    let setup: InitOptions = { ...options, tools: options.tools === undefined ? undefined : parseTools(options.tools),
      locales: options.locales === undefined ? undefined : commaList(options.locales) };
    const existing = await readExistingSetup(instance, setup);
    if (program.opts().interactive && !program.opts().json && process.stdin.isTTY && process.stdout.isTTY) {
      if (existing && setup.tools === undefined) console.log(`Reconfigure agent tools for ${existing.product}. Saved tools are pre-selected.\n`);
      setup = await interactiveSetup(setup, {}, existing?.tools);
    }
    const result = await initProject(instance, setup);
    emit(result, result.reconfigured ? formatUpdate(result, { projectRoot: instance.root, stream: process.stdout }) : [`Initialized ReleaseKit in ${instance.root}`, `Configuration: ${result.config}`,
      `Installed skills for: ${result.tools.join(', ') || 'none'}`, ...result.tools.map(tool => result.hints[tool]),
      ...result.conflicts.map(file => `Preserved modified file: ${file}`),
      'Next: ask your agent to use releasekit-draft with a release version.', 'Check progress: releasekit status'].join('\n'));
    if (result.conflicts.length) process.exitCode = 1;
  });
program.command('update').description('Refresh skills for configured tools while preserving user edits')
  .action(async () => {
    const instance = project();
    try {
      const result = await updateProject(instance);
      emit(result, formatUpdate(result, { projectRoot: instance.root, stream: process.stdout }));
      if (result.conflicts.length) process.exitCode = 1;
    } catch (error) {
      if (program.opts().json) throw error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(formatUpdateFailure(message, { projectRoot: instance.root, stream: process.stderr }));
      process.exitCode = 1;
    }
  });
program.command('list').description('List releases across all channels')
  .option('--channel <name>', 'show only this channel')
  .action(async (options: ChannelOption) => {
    const releases = await listReleases(project(), options.channel);
    emit(releases, releases.length ? ['Release  Status  Notes  Date', ...releases.map(r => `${refKey(r)}  ${r.status}  ${r.notes}  ${r.releasedAt}`),
      'Next: releasekit status <version> (add --channel for a channel release)'].join('\n') : 'No releases yet. Use releasekit-draft with your agent to create the first draft.');
  });
program.command('status [version]').description('Show validation issues and the next step; omit version for all releases')
  .option('--channel <name>', 'show only this channel')
  .action(async (version: string | undefined, options: ChannelOption) => {
    const result = await projectStatus(project(), version ? target(version, options) : undefined, options.channel);
    emit(result, formatStatus(result));
  });
program.command('preview <version>').description('Read a multilingual release draft in a live local preview')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .option('--locale <locale>', 'preferred reading language; incomplete translations fall back to the source')
  .option('--port <port>', 'local port; defaults to an available port', value => {
    if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error('Preview port must be an integer from 0 to 65535.');
    return Number(value);
  })
  .option('--open', 'open the preview in the default browser')
  .action(async (version: string, options: ChannelOption & { locale?: string; port?: number; open?: boolean }) => {
    const { startPreview, openPreview } = await import('./preview.js');
    const preview = await startPreview(project(), target(version, options), options);
    const { close, ...result } = preview;
    const stop = () => {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      void close().catch(() => { process.exitCode = 1; });
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    emit(result, `Preview ${refKey(result)}: ${result.url}\nKeep this process running. Press Ctrl+C to stop.\nAsk your agent in the existing conversation for changes; the preview refreshes automatically.`);
    if (options.open) {
      try { await openPreview(result.url); }
      catch { console.error(program.opts().json ? JSON.stringify({ warning: 'Could not open a browser.', url: result.url }) : `Could not open a browser. Open ${result.url} manually.`); }
    }
  });
program.command('start').description('Save the first-use Git boundary and treatment of earlier history')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .requiredOption('--at <ref>', 'baseline commit or tag; subsequent notes begin after this commit')
  .addOption(new Option('--past <mode>', 'summarize the baseline, analyze history, or skip earlier notes').choices(['summary', 'history', 'skip']).makeOptionMandatory())
  .option('--baseline-version <version>', 'baseline release ID, required for summary or history')
  .action(async (options: ChannelOption & { at: string; past: Parameters<typeof startProject>[1]['past']; baselineVersion?: string }) =>
    emit(await startProject(project(), { at: options.at, past: options.past, version: options.baselineVersion, channel: options.channel })));
program.command('prepare <version>').description('Create a draft from pinned Git commits')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .option('--from <ref>', 'comparison start commit or tag')
  .option('--to <ref>', 'comparison end commit or tag, defaults to the saved baseline or HEAD')
  .option('--previous <release>', 'previous version, or channel/version in channel history')
  .option('--from-root', 'explicitly include the whole history')
  .option('--first-release', 'start an independent release line')
  .option('--date <date-or-datetime>', 'release date or timestamp with timezone; defaults to the current UTC timestamp')
  .action(async (version: string, options: Parameters<typeof prepare>[2]) => {
    const instance = project();
    const result = await prepare(instance, version, options);
    emit(result, `Prepared draft ${refKey(result)}\nFiles: ${await instance.releaseDir(result)}\nNext: use releasekit-draft with your agent to write the notes, then run releasekit status ${version}${options.channel ? ` --channel ${options.channel}` : ''}.`);
  });

const note = program.command('note').description('Manage individual release notes');
note.command('add <version> <id>').description('Scaffold a note and its locale files')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .addOption(new Option('--category <category>', 'note category').choices(['feature', 'improvement', 'fix', 'security']).default('feature'))
  .option('--no-image', 'make this note intentionally text-only')
  .action(async (version: string, id: string, options: ChannelOption & { category: string; image: boolean }) => {
    await addNote(project(), target(version, options), id, noteMetaSchema.shape.category.parse(options.category), options.image);
    emit({ ...target(version, options), note: id, status: 'draft' });
  });
note.command('remove <version> <id>').description('Remove a draft note, its locale files, prompts, and unused managed images')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .action(async (version: string, id: string, options: ChannelOption) => emit(await removeNote(project(), target(version, options), id)));
const images = program.command('image').description('Plan themed illustrations and register selected files');
images.command('plan <version>').description('Plan generation or supplied-image requests without calling a model')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .option('--sync-config', 'apply current project image settings to this draft')
  .action(async (version: string, options: ChannelOption & { syncConfig?: boolean }) => {
    const instance = project();
    if (options.syncConfig) await syncImagePolicy(instance, target(version, options));
    emit(await planImages(instance, target(version, options)));
  });
images.command('import <version> <note>').description('Import or replace an image, switch shared/themed usage, and remove unused note images')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .addOption(new Option('--theme <theme>', 'variant to register; shared replaces themed entries and a theme replaces shared').choices(['dark', 'light', 'shared']).makeOptionMandatory())
  .addOption(new Option('--source <source>', 'save the media source with this import; otherwise keep the current source').choices(['generated', 'provided']))
  .requiredOption('--file <file>', 'selected local PNG, JPEG, or WebP')
  .action(async (version: string, id: string, options: ChannelOption & ImportImageOptions & { theme: string; file: string }) =>
    emit(await importImage(project(), target(version, options), id, assetVariant.parse(options.theme), path.resolve(program.opts<{ cwd: string }>().cwd, options.file), { source: options.source })));
const translation = program.command('translation').description('Track source freshness for reviewed translations');
translation.command('mark <version> <note>').description('Mark an already reviewed translation current')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .requiredOption('--locale <locale>', 'translation language code')
  .action(async (version: string, id: string, options: ChannelOption & { locale: string }) => emit({ sourceHash: await markTranslation(project(), target(version, options), id, options.locale) }));
program.command('validate [version]').description('Validate one release or all releases')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .action(async (version: string | undefined, options: ChannelOption) => {
    const instance = project();
    if (options.channel !== undefined) await instance.requireChannel(options.channel);
    const versions = version ? [target(version, options)] : (await instance.allRefs()).filter(r => r.channel === options.channel);
    const results = await Promise.all(versions.map(v => validate(instance, v)));
    emit(results, results.length ? results.map(r => `${refKey(r)}: ${r.valid ? 'valid' : 'needs attention'}${[...r.errors.map(e => `\n  - ${e}`), ...r.warnings.map(w => `\n  Warning: ${w}`)].join('')}`).join('\n') : 'No releases to validate. Use releasekit-draft to create the first draft.');
    if (results.some(r => !r.valid)) process.exitCode = 1;
  });
program.command('finalize <version>').description('Validate and mark local release content ready')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .action(async (version: string, options: ChannelOption) => emit(await finalize(project(), target(version, options))));
program.command('export').description('Export recent version groups and selected image variants')
  .option('--channel <name>', 'release channel; omit for unchanneled releases')
  .option('--current <version>', 'current release version, defaults to the release with no successor')
  .option('--limit <count>', 'number of version groups, after filtering; omit to export all releases', value => Number(value))
  .option('--locale <locale>', 'output language, defaults to all locales saved in the current release')
  .requiredOption('--out <directory>', 'new output directory')
  .action(async (options: ChannelOption & { current?: string; limit?: number; locale?: string; out: string }) => emit(await exportBundle(project(), options.current, { ...options, out: path.resolve(program.opts<{ cwd: string }>().cwd, options.out) })));

const release = program.command('release').description('Manage whole releases');
release.command('move <versions...>').description('Move whole releases while preserving content and ready status')
  .option('--from-channel <name>', 'source channel; omit for unchanneled releases')
  .option('--to-channel <name>', 'destination channel')
  .option('--to-unchanneled', 'move to the unchanneled history')
  .option('--after <release>', 'insert after this version or channel/version when crossing histories')
  .option('--at-start', 'insert at the oldest end when crossing histories')
  .option('--dry-run', 'validate and report changes without writing files')
  .action(async (versions: string[], options: MoveOptions) => emit(await moveReleases(project(), versions, options)));

async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major! < 22 || major === 22 && minor! < 12) throw new Error('ReleaseKit requires Node.js 22.12 or later.');
  await program.parseAsync();
}
main().catch((error: unknown) => {
  if (error instanceof CommanderError) {
    if (error.exitCode === 0) return;
    if (process.argv.includes('--json')) console.error(JSON.stringify({ error: error.message }));
    process.exitCode = error.exitCode;
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(program.opts().json ? JSON.stringify({ error: message }) : message);
  process.exitCode = 1;
});
