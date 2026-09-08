import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileKey, managedAssetFiles, retainedImageFiles, visualFileReferences } from './assets.js';
import { locale, noteMetaSchema, visualSchema, imageSource, type NoteMeta } from './model.js';
import { identifier, writeYaml, writeNote, readNote, noteHash, exists, readYaml } from './files.js';
import { Project, editable } from './project.js';

async function notePaths(project: Project, version: string, id: string): Promise<string[]> {
  return Promise.all([
    `notes/${id}`, `visuals/${id}.yaml`,
    ...['dark', 'light', 'shared'].map(variant => `prompts/${id}.${variant}.md`),
  ].map(relative => project.releaseFile(version, relative)));
}

export async function addNote(project: Project, version: string, id: string, category: NoteMeta['category'], image: boolean): Promise<void> {
  const release = await project.release(version);
  editable(release);
  identifier(id);
  const paths = await notePaths(project, version, id);
  if (release.notes.some(note => note.id === id) || (await Promise.all(paths.map(exists))).some(Boolean)) {
    throw new Error(`Note ${id} already exists or has leftover files; its content was preserved.`);
  }
  const note = noteMetaSchema.parse({ id, category, commits: [], paths: [], image });
  const directory = paths[0]!, visualFile = paths[1]!;
  await fs.mkdir(path.dirname(directory), { recursive: true });
  await fs.mkdir(directory);
  let createdVisual = false;
  try {
    for (const language of release.locales) {
      await writeNote(await project.releaseFile(version, `notes/${id}/${language}.md`), { title: '', alt: '', sourceHash: null, body: '' });
    }
    if (image) {
      await writeYaml(visualFile, {
        schemaVersion: 1,
        scene: { archetype: '', source: '', subject: '', message: '', focus: '', composition: '', context: '', elements: [], preserve: [], avoid: [], text: [], references: [] },
        variants: {},
      });
      createdVisual = true;
    }
    release.notes.push(note);
    release.emptyReason = null;
    release.contentHash = null;
    await project.save(release);
  } catch (error) {
    if (createdVisual) await fs.unlink(visualFile);
    await fs.rm(await project.releaseFile(version, `notes/${id}`), { recursive: true, force: true });
    throw error;
  }
}

export async function removeNote(project: Project, version: string, id: string) {
  const release = await project.release(version);
  editable(release);
  identifier(id);
  if (!release.notes.some(note => note.id === id)) throw new Error(`Unknown note: ${id}`);

  const paths = await notePaths(project, version, id);
  const directory = await project.releaseDir(version);
  const visualFile = paths[1]!;
  const references = await exists(visualFile) ? await visualFileReferences(project, version, visualFile) : new Set<string>();
  const retained = await retainedImageFiles(project, { version, noteId: id, visual: null });
  const owned = new Set(await managedAssetFiles(project, version, id));
  const retainedAssets: string[] = [];
  for (const file of await managedAssetFiles(project, version)) {
    const key = await fileKey(file);
    if (!owned.has(file) && !references.has(key)) continue;
    if (retained.has(key)) retainedAssets.push(file);
    else paths.push(file);
  }

  const targets: string[] = [];
  for (const file of paths) {
    if (!(await exists(file))) continue;
    const key = await fileKey(file);
    if ([...retained].some(reference => reference === key || reference.startsWith(`${key}${path.sep}`))) {
      throw new Error(`Note files are referenced by another visual; update those references before removing ${id}: ${file}`);
    }
    targets.push(file);
  }

  // Hold files inside this release until its metadata is saved, so a failed save can restore them.
  const holding = await fs.mkdtemp(await project.releaseFile(version, `.remove-${id}-`));
  const checkedHolding = await project.releaseFile(version, path.basename(holding));
  const moved: { original: string; temporary: string }[] = [];
  try {
    for (const [index, original] of targets.entries()) {
      const temporary = path.join(checkedHolding, String(index));
      await fs.rename(original, temporary);
      moved.push({ original, temporary });
    }
    await project.save({ ...release, notes: release.notes.filter(note => note.id !== id), contentHash: null });
  } catch (error) {
    const failures: unknown[] = [];
    for (const entry of moved.reverse()) {
      try { await fs.rename(entry.temporary, entry.original); } catch (restoreError) { failures.push(restoreError); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], `Note removal failed; recovery files remain in ${checkedHolding}`);
    await fs.rmdir(checkedHolding);
    throw error;
  }
  try {
    await fs.rm(await project.releaseFile(version, path.basename(checkedHolding)), { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Note ${id} was removed, but file cleanup is incomplete in ${checkedHolding}`, { cause: error });
  }
  const relative = (file: string) => path.relative(directory, file).split(path.sep).join('/');
  return { version, note: id, status: release.status, removedPaths: targets.map(relative), retainedAssets: retainedAssets.map(relative) };
}

export async function markTranslation(project: Project, version: string, id: string, language: string): Promise<string> {
  const release = await project.release(version);
  editable(release);
  identifier(id); locale.parse(language);
  if (!release.notes.some(n => n.id === id)) throw new Error(`Unknown note: ${id}`);
  if (!release.locales.includes(language) || language === release.sourceLocale) throw new Error('Choose a configured translation locale, not the source locale.');
  const source = await readNote(await project.releaseFile(version, `notes/${id}/${release.sourceLocale}.md`));
  const file = await project.releaseFile(version, `notes/${id}/${language}.md`);
  const translated = await readNote(file);
  if (!source.body || !translated.body) throw new Error('Write and review both texts before marking the translation current.');
  translated.sourceHash = noteHash(source);
  await writeNote(file, translated);
  return translated.sourceHash;
}

export async function syncImagePolicy(project: Project, version: string): Promise<void> {
  const release = await project.release(version);
  editable(release);
  const policy = (await project.config()).visuals;
  // Files are retained when changing themes; only the active scheduling policy changes.
  release.visuals = policy;
  release.contentHash = null;
  await project.save(release);
}

export async function readVisual(project: Project, version: string, id: string) {
  const visual = await readYaml(await project.releaseFile(version, `visuals/${identifier(id)}.yaml`), visualSchema);
  imageSource(visual.scene);
  return visual;
}

export async function checkReferenceFiles(project: Project, references: string[]): Promise<void> {
  const { within } = await import('./files.js');
  for (const reference of references) {
    const file = await within(project.root, reference);
    if (!(await fs.stat(file)).isFile()) throw new Error(`Reference is not a file: ${reference}`);
  }
}
