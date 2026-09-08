import * as fs from 'node:fs/promises';
import { locale, noteMetaSchema, visualSchema, type NoteMeta } from './model.js';
import { identifier, writeYaml, writeNote, readNote, noteHash, exists, readYaml } from './files.js';
import { Project, editable } from './project.js';

export async function addNote(project: Project, version: string, id: string, category: NoteMeta['category'], image: boolean): Promise<void> {
  const release = await project.release(version);
  editable(release);
  identifier(id);
  if (release.notes.some(note => note.id === id) || await exists(await project.releaseFile(version, `notes/${id}`))) {
    throw new Error(`Note ${id} already exists; its content was preserved.`);
  }
  const note = noteMetaSchema.parse({ id, category, commits: [], paths: [], image });
  for (const language of release.locales) {
    await writeNote(await project.releaseFile(version, `notes/${id}/${language}.md`), { title: '', alt: '', sourceHash: null, body: '' });
  }
  if (image) {
    await writeYaml(await project.releaseFile(version, `visuals/${id}.yaml`), {
      schemaVersion: 1,
      scene: { archetype: 'ui-detail', subject: '', message: '', focus: '', composition: '', context: '', elements: [], preserve: [], avoid: [], text: [], references: [] },
      variants: {},
    });
  }
  release.notes.push(note);
  release.contentHash = null;
  await project.save(release);
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
  return readYaml(await project.releaseFile(version, `visuals/${identifier(id)}.yaml`), visualSchema);
}

export async function checkReferenceFiles(project: Project, references: string[]): Promise<void> {
  const { within } = await import('./files.js');
  for (const reference of references) {
    const file = await within(project.root, reference);
    if (!(await fs.stat(file)).isFile()) throw new Error(`Reference is not a file: ${reference}`);
  }
}
