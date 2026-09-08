import * as fs from 'node:fs/promises';
import path from 'node:path';
import { Project } from './project.js';
import { type Bundle, bundleSchema, activeVariants, locale } from './model.js';
import { validate } from './validate.js';
import { exists, readNote, write } from './files.js';
import { readVisual } from './content.js';

export async function exportBundle(project: Project, current: string | undefined, options: { limit?: number; locale?: string; out: string }) {
  const config = await project.config();
  const version = current ?? await project.latestVersion();
  const history = await project.history(version, options.limit ?? config.history.limit);
  const languages = options.locale === undefined ? history[0]!.locales : [locale.parse(options.locale)];
  for (const release of history) {
    if (release.status !== 'ready') throw new Error(`Release ${release.version} is still a draft.`);
    for (const language of languages) {
      if (!release.locales.includes(language)) throw new Error(`Release ${release.version} has no ${language} locale.`);
    }
    const checked = await validate(project, release.version);
    if (!checked.valid) throw new Error(checked.errors.join('\n'));
  }

  const bundles: Bundle[] = [];
  const copies = new Map<string, string>();
  for (const language of languages) {
    const bundle: Bundle = { schemaVersion: 1, currentVersion: version, locale: language, releases: [] };
    for (const release of history) {
      const entry: Bundle['releases'][number] = { version: release.version, releasedAt: release.releasedAt, previous: release.previous, notes: [] };
      for (const note of release.notes) {
        const text = await readNote(await project.releaseFile(release.version, `notes/${note.id}/${language}.md`));
        const exported: typeof entry.notes[number] = { id: note.id, category: note.category, title: text.title, bodyMarkdown: text.body, image: null };
        if (note.image) {
          const visual = await readVisual(project, release.version, note.id);
          const variants = activeVariants(visual, release.visuals);
          exported.image = { alt: text.alt, fallbackTheme: variants[0]!, variants: {} };
          for (const variant of variants) {
            const asset = visual.variants[variant]!;
            const relative = `assets/${release.version}/${path.posix.basename(asset.file)}`;
            exported.image.variants[variant] = { src: relative, width: asset.width, height: asset.height };
            copies.set(relative, await project.releaseFile(release.version, asset.file));
          }
        }
        entry.notes.push(exported);
      }
      bundle.releases.push(entry);
    }
    bundleSchema.parse(bundle);
    bundles.push(bundle);
  }

  const destination = path.resolve(options.out);
  const contentRoot = await project.content('releases');
  const relativeToContent = path.relative(contentRoot, destination);
  const gitRoot = path.join(project.root, '.git');
  const relativeToGit = path.relative(gitRoot, destination);
  const isInside = (relative: string) => relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  if (destination === project.root || isInside(relativeToContent) || isInside(relativeToGit)) {
    throw new Error('Export to a separate output directory, outside source content and Git metadata.');
  }
  if (await exists(destination)) throw new Error('The export destination already exists. Choose a new output directory.');
  // No filesystem output is created until every selected release and locale has passed validation.
  for (const [relative, src] of copies) await write(path.join(destination, relative), await fs.readFile(src));
  const files: string[] = [];
  for (const bundle of bundles) {
    const file = path.join(destination, `release-notes.${bundle.locale}.json`);
    await write(file, JSON.stringify(bundle, null, 2) + '\n');
    files.push(file);
  }
  return { files, releases: history.length, assets: copies.size };
}
