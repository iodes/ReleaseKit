import * as fs from 'node:fs/promises';
import { visualSchema, type AssetVariant, type Visual } from './model.js';
import { Project } from './project.js';
import { exists, identifier, readYaml, within } from './files.js';

// References remain readable while a draft's scene brief is unfinished.
const imageReferencesSchema = visualSchema.pick({ variants: true }).extend({
  scene: visualSchema.shape.scene.pick({ references: true }).strip(),
}).strip();

export async function fileKey(file: string): Promise<string> {
  const resolved = await exists(file) ? await fs.realpath(file) : file;
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export async function visualFileReferences(project: Project, version: string, file: string, selected?: Visual): Promise<Set<string>> {
  const visual = selected ?? await readYaml(file, imageReferencesSchema);
  const references = new Set<string>();
  for (const asset of Object.values(visual.variants)) {
    if (asset) references.add(await fileKey(await project.releaseFile(version, asset.file)));
  }
  for (const reference of visual.scene.references) references.add(await fileKey(await within(project.root, reference)));
  return references;
}

export async function retainedImageFiles(project: Project, replacement: { version: string; noteId: string; visual: Visual | null }): Promise<Set<string>> {
  const retained = new Set<string>();
  for (const version of await project.versions()) {
    const directory = await project.releaseFile(version, 'visuals');
    if (!(await exists(directory))) continue;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() || !entry.name.endsWith('.yaml')) continue;
      const replacing = version === replacement.version && entry.name === `${replacement.noteId}.yaml`;
      if (replacing && replacement.visual === null) continue;
      const file = await project.releaseFile(version, `visuals/${entry.name}`);
      for (const reference of await visualFileReferences(project, version, file, replacing ? replacement.visual! : undefined)) {
        retained.add(reference);
      }
    }
  }
  return retained;
}

export async function managedAssetFiles(project: Project, version: string, noteId?: string, variant?: AssetVariant): Promise<string[]> {
  if (noteId !== undefined) identifier(noteId);
  const directory = await project.releaseFile(version, 'assets');
  if (!(await exists(directory))) return [];
  const prefix = noteId === undefined ? '' : `${noteId}.${variant ? `${variant}.` : ''}`;
  const suffix = noteId === undefined
    ? /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,95}\.(dark|light|shared)\.[a-f0-9]{12}\.(png|jpg|webp)$/
    : variant ? /^[a-f0-9]{12}\.(png|jpg|webp)$/ : /^(dark|light|shared)\.[a-f0-9]{12}\.(png|jpg|webp)$/;
  const files: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith(prefix) && suffix.test(entry.name.slice(prefix.length))) {
      files.push(await project.releaseFile(version, `assets/${entry.name}`));
    }
  }
  return files.sort();
}
