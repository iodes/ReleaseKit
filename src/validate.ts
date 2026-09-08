import * as fs from 'node:fs/promises';
import { imageSource, type Release } from './model.js';
import { Project, editable } from './project.js';
import { canonical, digest, readNote, noteHash, identifier } from './files.js';
import { readVisual, checkReferenceFiles } from './content.js';
import { validateImages } from './images.js';
import { checkPrevious } from './git.js';

export interface Validation { version: string; valid: boolean; errors: string[]; warnings: string[]; contentHash: string | null }

export async function contentHash(project: Project, release: Release): Promise<string> {
  const { status: _status, contentHash: _hash, ...metadata } = release;
  const parts: unknown[] = [metadata, await project.evidence(release.version), digest(await fs.readFile(await project.releaseFile(release.version, 'changes.patch')))];
  for (const note of release.notes) {
    for (const language of release.locales) parts.push(await readNote(await project.releaseFile(release.version, `notes/${note.id}/${language}.md`)));
    if (note.image) parts.push(await readVisual(project, release.version, note.id));
  }
  return digest(canonical(parts));
}

export async function validate(project: Project, version: string): Promise<Validation> {
  const errors: string[] = [], warnings: string[] = [];
  let hash: string | null = null;
  try {
    const release = await project.release(version);
    const evidence = await project.evidence(version);
    if (canonical(evidence.source) !== canonical(release.source)) errors.push('Evidence and release Git boundaries disagree.');
    if (!release.locales.includes(release.sourceLocale) || new Set(release.locales).size !== release.locales.length) errors.push('Release locales must be unique and include the source locale.');
    if (new Set(release.notes.map(n => n.id)).size !== release.notes.length) errors.push('Note IDs must be unique within a release.');
    if (!release.notes.length && !release.emptyReason?.trim()) errors.push('No notes yet. Write the notes or explain the absence of user-visible changes in emptyReason.');
    if (release.notes.length && release.emptyReason !== null) errors.push('emptyReason must be null when notes are present.');
    const commits = new Set(evidence.commits.map(c => c.sha));
    const changedPaths = new Set(evidence.files.flatMap(f => [f.path, ...(f.oldPath ? [f.oldPath] : [])]));
    for (const note of release.notes) {
      identifier(note.id);
      if (!note.commits.length && !note.paths.length) errors.push(`${note.id}: attach at least one changed path or commit as evidence.`);
      if (note.commits.some(c => !commits.has(c)) || note.paths.some(p => !changedPaths.has(p))) errors.push(`${note.id}: evidence points outside the prepared Git range.`);
      try {
        const source = await readNote(await project.releaseFile(version, `notes/${note.id}/${release.sourceLocale}.md`));
        if (!source.body.trim()) errors.push(`${note.id}: source body is empty.`);
        for (const language of release.locales) {
          const text = await readNote(await project.releaseFile(version, `notes/${note.id}/${language}.md`));
          if (!text.body.trim()) errors.push(`${note.id}/${language}: body is empty.`);
          if (note.image && !text.alt.trim()) errors.push(`${note.id}/${language}: image alt text is missing.`);
          if (language !== release.sourceLocale && text.sourceHash !== noteHash(source)) errors.push(`${note.id}/${language}: translation is missing or stale; review it and mark it current.`);
        }
      } catch (error) { errors.push(`${note.id}: ${error instanceof Error ? error.message : error}`); }
      if (note.image) {
        try {
          const visual = await readVisual(project, version, note.id);
          if (release.status === 'draft' && imageSource(visual.scene) === 'generated') await checkReferenceFiles(project, visual.scene.references);
          await validateImages(project, version, note.id, visual, errors, warnings);
        } catch (error) { errors.push(`${note.id}: ${error instanceof Error ? error.message : error}`); }
      }
    }
    try { await project.history(version, 1); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    if (release.status === 'draft' && release.previous) {
      try { checkPrevious(project.root, await project.release(release.previous), evidence); }
      catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
    if (!errors.length) hash = await contentHash(project, release);
    if (release.status === 'ready' && release.contentHash !== hash && !errors.length) errors.push('Ready release content changed. Reopen the draft and finalize it again.');
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return { version, valid: errors.length === 0, errors, warnings, contentHash: hash };
}

export async function finalize(project: Project, version: string): Promise<Validation> {
  const release = await project.release(version);
  editable(release);
  const result = await validate(project, version);
  if (!result.valid || !result.contentHash) throw new Error(result.errors.join('\n'));
  const chain = await project.history(version, 100);
  if (chain.slice(1).some(r => r.status !== 'ready')) throw new Error('Finalize the previous releases before finalizing this release.');
  release.status = 'ready';
  release.contentHash = result.contentHash;
  await project.save(release);
  return result;
}
