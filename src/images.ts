import * as fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { type AssetVariant, type Visual, themes, assetVariant, sceneSchema, imageSource, activeVariants } from './model.js';
import { Project, editable } from './project.js';
import { readVisual, checkReferenceFiles } from './content.js';
import { digest, identifier, exists, write, writeYaml } from './files.js';
import { imagePrompt, sceneHash } from './prompts.js';
import { fileKey, managedAssetFiles, retainedImageFiles } from './assets.js';

export async function inspectImage(bytes: Buffer) {
  const image = sharp(bytes, { limitInputPixels: 16_777_216, failOn: 'warning' });
  const metadata = await image.metadata();
  if (!metadata.format || !['png', 'jpeg', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
    throw new Error('Use a still PNG, JPEG, or WebP image.');
  }
  await image.stats(); // Decode the file so a plausible but truncated header cannot pass import.
  const rotated = (metadata.orientation ?? 1) >= 5;
  return {
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
    extension: metadata.format === 'jpeg' ? 'jpg' : metadata.format,
    sha256: digest(bytes),
  };
}

export type ImageRequest = {
  note: string; theme: AssetVariant; reason: 'missing' | 'stale';
} & ({ action: 'generate'; promptFile: string; compositionReference: string | null }
  | { action: 'provide'; promptFile: null; compositionReference: null; instruction: string });
export async function planImages(project: Project, version: string) {
  const release = await project.release(version);
  const requests: ImageRequest[] = [];
  let ready = 0;
  for (const note of release.notes.filter(n => n.image)) {
    const visual = await readVisual(project, version, note.id);
    const source = imageSource(visual.scene);
    const pair = visual.variants;
    const invalidPair = release.visuals.themes === 'both' && pair.dark && pair.light &&
      (pair.dark.sha256 === pair.light.sha256 || pair.dark.width !== pair.light.width || pair.dark.height !== pair.light.height);
    for (const variant of activeVariants(visual, release.visuals)) {
      const expected = sceneHash(visual.scene, release.visuals, variant);
      const asset = visual.variants[variant];
      const file = asset && await project.releaseFile(version, asset.file);
      const present = !!file && await exists(file);
      const current = !!asset && present && asset.sceneHash === expected && digest(await fs.readFile(file!)) === asset.sha256 && !(invalidPair && variant === 'light');
      if (current) { ready++; continue; }
      editable(release);
      if (source === 'provided') {
        requests.push({
          note: note.id, theme: variant, reason: present ? 'stale' : 'missing', action: 'provide',
          promptFile: null, compositionReference: null,
          instruction: `Use an existing approved image or ask for a capture, photograph, or content asset for "${visual.scene.subject}". Import the selected file with --theme ${variant}. Do not synthesize a replacement.`,
        });
        continue;
      }
      if (variant === 'shared') throw new Error('Generated images require a dark or light variant.');
      await checkReferenceFiles(project, visual.scene.references);
      const promptFile = await project.releaseFile(version, `prompts/${note.id}.${variant}.md`);
      await write(promptFile, imagePrompt(visual.scene, release.visuals, variant));
      const otherTheme = variant === 'dark' ? 'light' : 'dark';
      const other = visual.variants[otherTheme];
      let compositionReference: string | null = null;
      if (other && other.sceneHash === sceneHash(visual.scene, release.visuals, otherTheme)) {
        const reference = await project.releaseFile(version, other.file);
        if (await exists(reference) && digest(await fs.readFile(reference)) === other.sha256) compositionReference = reference;
      }
      requests.push({ note: note.id, theme: variant, reason: present ? 'stale' : 'missing', action: 'generate', promptFile, compositionReference });
    }
  }
  return {
    version, configuredThemes: themes(release.visuals), requestedAssets: ready + requests.length,
    readyAssets: ready, pendingAssets: requests.length, requests,
    generationRequests: requests.filter(request => request.action === 'generate').length,
    providedRequests: requests.filter(request => request.action === 'provide').length,
    costNote: 'Counts describe required output assets, not provider prices or a guarantee of one tool call per asset. No image service was called.',
  };
}

async function obsoleteNoteImages(project: Project, version: string, noteId: string, selected: Visual): Promise<string[]> {
  const candidates = await managedAssetFiles(project, version, noteId);
  if (!candidates.length) return [];
  const retained = await retainedImageFiles(project, { version, noteId, visual: selected });
  const obsolete: string[] = [];
  for (const file of candidates) {
    if (!retained.has(await fileKey(file))) obsolete.push(file);
  }
  return obsolete;
}

export interface ImportImageOptions { source?: 'generated' | 'provided' }

export async function importImage(project: Project, version: string, noteId: string, variant: AssetVariant, source: string, options: ImportImageOptions = {}) {
  const release = await project.release(version);
  editable(release); identifier(noteId); assetVariant.parse(variant);
  if (!release.notes.some(n => n.id === noteId && n.image)) throw new Error(`No image-enabled note named ${noteId}.`);
  const visual = await readVisual(project, version, noteId);
  if (options.source !== undefined) visual.scene.source = sceneSchema.shape.source.parse(options.source);
  const provided = imageSource(visual.scene) === 'provided';
  if (variant === 'shared') {
    if (!provided) throw new Error('Only supplied images can use a shared asset. Use --source provided when importing a supplied replacement.');
    visual.variants = {};
  } else {
    if (!themes(release.visuals).includes(variant)) throw new Error(`Theme ${variant} is not enabled for this release. Update the project setting and sync the draft first.`);
    delete visual.variants.shared;
  }
  const bytes = await fs.readFile(path.resolve(project.root, source));
  const inspected = await inspectImage(bytes);
  const file = `assets/${noteId}.${variant}.${inspected.sha256.slice(0, 12)}.${inspected.extension}`;
  const destination = await project.releaseFile(version, file);
  const destinationExists = await exists(destination);
  if (destinationExists && digest(await fs.readFile(destination)) !== inspected.sha256) throw new Error('The asset destination has conflicting content.');
  visual.variants[variant] = {
    file, sha256: inspected.sha256, sceneHash: sceneHash(visual.scene, release.visuals, variant),
    width: inspected.width, height: inspected.height,
  };
  // Resolve cleanup before writing, and remove old files only after the selection is saved.
  const obsolete = await obsoleteNoteImages(project, version, noteId, visual);
  if (!destinationExists) await write(destination, bytes);
  try {
    await writeYaml(await project.releaseFile(version, `visuals/${noteId}.yaml`), visual);
  } catch (error) {
    if (!destinationExists) await fs.unlink(destination);
    throw error;
  }
  for (const oldFile of obsolete) await fs.rm(oldFile, { force: true });
  return visual.variants[variant]!;
}

export async function validateImages(project: Project, version: string, noteId: string, visual: Visual, errors: string[], warnings: string[]): Promise<void> {
  const release = await project.release(version);
  for (const variant of activeVariants(visual, release.visuals)) {
    const expected = sceneHash(visual.scene, release.visuals, variant);
    const asset = visual.variants[variant];
    if (!asset) { errors.push(`${noteId}: ${variant} image is pending.`); continue; }
    try {
      if (asset.sceneHash !== expected) errors.push(`${noteId}: ${variant} image was created for an older scene or palette.`);
      const actual = await inspectImage(await fs.readFile(await project.releaseFile(version, asset.file)));
      if (actual.sha256 !== asset.sha256 || actual.width !== asset.width || actual.height !== asset.height) {
        errors.push(`${noteId}: ${variant} asset changed after import; import the selected file again.`);
      }
      const requestedRatio = release.visuals.width / release.visuals.height;
      if (imageSource(visual.scene) === 'generated' && Math.abs(actual.width / actual.height / requestedRatio - 1) > 0.05) {
        warnings.push(`${noteId}: ${variant} aspect ratio differs from the project target; review its framing.`);
      }
    } catch (error) { errors.push(`${noteId}/${variant}: ${error instanceof Error ? error.message : error}`); }
  }
  if (release.visuals.themes === 'both' && visual.variants.dark && visual.variants.light) {
    const { dark, light } = visual.variants;
    if (dark.sha256 === light.sha256) errors.push(`${noteId}: the two theme variants are identical; provide a real pair or select a single theme.`);
    if (dark.width !== light.width || dark.height !== light.height) errors.push(`${noteId}: paired variants must have identical dimensions.`);
  }
}
