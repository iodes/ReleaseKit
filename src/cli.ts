#!/usr/bin/env node
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import { Project, prepare, startProject } from './project.js';
import { initProject, installSkills } from './install.js';
import { addNote, removeNote, markTranslation, syncImagePolicy } from './content.js';
import { planImages, importImage, type ImportImageOptions } from './images.js';
import { validate, finalize } from './validate.js';
import { exportBundle } from './export.js';
import { configSchema, noteMetaSchema, assetVariant, type ProjectConfig } from './model.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const program = new Command();
program.name('releasekit').description('Git-based visual release content and agent skills').version(version)
  .option('--cwd <directory>', 'project working directory', process.cwd())
  .option('--json', 'print machine-readable results');
const project = () => Project.find(path.resolve(program.opts<{ cwd: string }>().cwd));
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
  .requiredOption('--at <ref>', 'baseline commit or tag; subsequent notes begin after this commit')
  .addOption(new Option('--past <mode>', 'summarize the baseline, analyze history, or skip earlier notes').choices(['summary', 'history', 'skip']).makeOptionMandatory())
  .option('--baseline-version <version>', 'baseline release ID, required for summary or history')
  .action(async (options: { at: string; past: Parameters<typeof startProject>[1]['past']; baselineVersion?: string }) =>
    emit(await startProject(project(), { at: options.at, past: options.past, version: options.baselineVersion })));
program.command('prepare <version>').description('Create a draft from pinned Git commits')
  .option('--from <ref>', 'comparison start commit or tag')
  .option('--to <ref>', 'comparison end commit or tag, defaults to the saved baseline or HEAD')
  .option('--previous <version>', 'explicit previous release')
  .option('--from-root', 'explicitly include the whole history')
  .option('--first-release', 'start an independent release line')
  .option('--date <YYYY-MM-DD>', 'release date, defaults to the current UTC date')
  .action(async (version: string, options: Parameters<typeof prepare>[2]) => emit(await prepare(project(), version, options)));

const note = program.command('note').description('Manage individual release notes');
note.command('add <version> <id>').description('Scaffold a note and its locale files')
  .addOption(new Option('--category <category>', 'note category').choices(['feature', 'improvement', 'fix', 'security']).default('feature'))
  .option('--no-image', 'make this note intentionally text-only')
  .action(async (version: string, id: string, options: { category: string; image: boolean }) => {
    await addNote(project(), version, id, noteMetaSchema.shape.category.parse(options.category), options.image);
    emit({ version, note: id, status: 'draft' });
  });
note.command('remove <version> <id>').description('Remove a draft note, its locale files, prompts, and unused managed images')
  .action(async (version: string, id: string) => emit(await removeNote(project(), version, id)));
const images = program.command('image').description('Plan themed illustrations and register selected files');
images.command('plan <version>').description('Plan generation or supplied-image requests without calling a model')
  .option('--sync-config', 'apply current project image settings to this draft')
  .action(async (version: string, options: { syncConfig?: boolean }) => {
    const instance = project();
    if (options.syncConfig) await syncImagePolicy(instance, version);
    emit(await planImages(instance, version));
  });
images.command('import <version> <note>').description('Import or replace an image, switch shared/themed usage, and remove unused note images')
  .addOption(new Option('--theme <theme>', 'variant to register; shared replaces themed entries and a theme replaces shared').choices(['dark', 'light', 'shared']).makeOptionMandatory())
  .addOption(new Option('--source <source>', 'save the media source with this import; otherwise keep the current source').choices(['generated', 'provided']))
  .requiredOption('--file <file>', 'selected local PNG, JPEG, or WebP')
  .action(async (version: string, id: string, options: ImportImageOptions & { theme: string; file: string }) =>
    emit(await importImage(project(), version, id, assetVariant.parse(options.theme), path.resolve(program.opts<{ cwd: string }>().cwd, options.file), { source: options.source })));
const translation = program.command('translation').description('Track source freshness for reviewed translations');
translation.command('mark <version> <note>').description('Mark an already reviewed translation current')
  .requiredOption('--locale <locale>', 'translation language code')
  .action(async (version: string, id: string, options: { locale: string }) => emit({ sourceHash: await markTranslation(project(), version, id, options.locale) }));
program.command('validate [version]').description('Validate one release or all releases')
  .action(async (version?: string) => {
    const instance = project();
    const versions = version ? [version] : await instance.versions();
    const results = await Promise.all(versions.map(v => validate(instance, v)));
    emit(results);
    if (results.some(r => !r.valid)) process.exitCode = 1;
  });
program.command('finalize <version>').description('Validate and mark local release content ready')
  .action(async (version: string) => emit(await finalize(project(), version)));
program.command('export').description('Export recent version groups and selected image variants')
  .requiredOption('--current <version>', 'current release version')
  .option('--limit <count>', 'number of version groups, including current', value => Number(value))
  .option('--locale <locale>', 'output language, defaults to the project source language')
  .requiredOption('--out <directory>', 'new output directory')
  .action(async (options: { current: string; limit?: number; locale?: string; out: string }) => emit(await exportBundle(project(), options.current, { ...options, out: path.resolve(program.opts<{ cwd: string }>().cwd, options.out) })));

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
