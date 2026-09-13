#!/usr/bin/env node
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import { Project, prepare, startProject } from './project.js';
import { initProject, installSkills } from './install.js';
import { addNote, removeNote, markTranslation, syncImagePolicy } from './content.js';
import { planImages, importImage, type ImportImageOptions } from './images.js';
import { validate, finalize } from './validate.js';
import { moveReleases, type MoveOptions } from './move.js';
import { ref } from './refs.js';
import { exportBundle } from './export.js';
import { configSchema, noteMetaSchema, assetVariant, type ProjectConfig } from './model.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const program = new Command();
program.name('releasekit').description('Git-based visual release content and agent skills').version(version)
  .option('--cwd <directory>', 'project working directory', process.cwd())
  .option('--json', 'print machine-readable results');
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

program.command('init').description('Initialize content and install project skills')
  .option('--product <name>', 'product name')
  .option('--tools <tools>', 'comma-separated codex,claude,cursor')
  .addOption(new Option('--themes <policy>', 'project image variants').choices(['both', 'dark', 'light']))
  .action(async (options: { product?: string; tools?: string; themes?: ProjectConfig['visuals']['themes'] }) => {
    const tools = options.tools === undefined ? undefined : configSchema.shape.tools.parse(options.tools.split(',').map(s => s.trim()).filter(Boolean));
    emit(await initProject(project(), { ...options, tools }));
  });
program.command('update').description('Refresh managed skills while preserving user edits')
  .action(async () => { const result = await installSkills(project()); emit(result); if (result.conflicts.length) process.exitCode = 1; });
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
  .action(async (version: string, options: Parameters<typeof prepare>[2]) => emit(await prepare(project(), version, options)));

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
    emit(results);
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
  const message = error instanceof Error ? error.message : String(error);
  console.error(program.opts().json ? JSON.stringify({ error: message }) : message);
  process.exitCode = 1;
});
