import { type ReleaseId } from './model.js';
import { ref, refKey } from './refs.js';
import { imageSource, type Release } from './model.js';
import { Project, editable } from './project.js';
import { canonical, digest, readNote, noteHash, identifier } from './files.js';
import { readVisual, checkReferenceFiles } from './content.js';
import { validateImages } from './images.js';
import { collect, collectSnapshot } from './git.js';

export interface Validation { version: string; channel?: string; valid: boolean; errors: string[]; warnings: string[]; contentHash: string | null }

export async function contentHash(project: Project, release: Release): Promise<string> {
  const { status: _status, contentHash: _hash, ...metadata } = release;
  const parts: unknown[] = [metadata];
  for (const note of release.notes) {
    for (const language of release.locales) parts.push(await readNote(await project.releaseFile(release, `notes/${note.id}/${language}.md`)));
    if (note.image) parts.push(await readVisual(project, release, note.id));
  }
  return digest(canonical(parts));
}

export async function validate(project: Project, version: ReleaseId): Promise<Validation> {
  return validateOne(project, version);
}

// Reuse structural validation within an export or move, without caching across mutations.
export async function validateMany(project: Project, versions: ReleaseId[]): Promise<Validation[]> {
  const checkedHistory = new Set<string>();
  if (versions.some(v => ref(v).channel !== undefined)) {
    for (const release of await project.channelHistory()) checkedHistory.add(refKey(release));
  }
  for (const version of versions) {
    if (!checkedHistory.has(refKey(version))) {
      for (const release of await project.history(version)) checkedHistory.add(refKey(release));
    }
  }
  return Promise.all(versions.map(version => validateOne(project, version, checkedHistory)));
}

async function validateOne(project: Project, version: ReleaseId, checkedHistory?: Set<string>): Promise<Validation> {
  const errors: string[] = [], warnings: string[] = [];
  let hash: string | null = null;
  try {
    const release = await project.release(version);
    if (release.initialContent && (release.source.fromSha !== null || release.source.fromRef !== null)) {
      errors.push('Initial content requires a root baseline Git range.');
    }
    // Summaries inspect only the baseline snapshot; ready releases use their finalized fingerprint.
    const summary = release.initialContent === 'summary';
    const evidence = release.status !== 'draft' ? null : summary
      ? collectSnapshot(project.root, release.source.toSha)
      : collect(project.root, release.source.fromSha, release.source.toSha);
    if (!release.locales.includes(release.sourceLocale) || new Set(release.locales).size !== release.locales.length) errors.push('Release locales must be unique and include the source locale.');
    if (new Set(release.notes.map(n => n.id)).size !== release.notes.length) errors.push('Note IDs must be unique within a release.');
    if (!release.notes.length && !release.emptyReason?.trim()) errors.push('No notes yet. Write the notes or explain the absence of user-visible changes in emptyReason.');
    if (release.notes.length && release.emptyReason !== null) errors.push('emptyReason must be null when notes are present.');
    const commits = new Set(evidence?.commits.map(c => c.sha));
    const changedPaths = new Set(evidence?.files.flatMap(f => [f.path, ...(f.oldPath ? [f.oldPath] : [])]));
    for (const note of release.notes) {
      identifier(note.id);
      if (!note.commits.length && !note.paths.length) errors.push(`${note.id}: attach at least one ${summary ? 'snapshot path or the baseline commit' : 'changed path or commit'} as evidence.`);
      if (evidence && (note.commits.some(c => !commits.has(c)) || note.paths.some(p => !changedPaths.has(p)))) errors.push(`${note.id}: evidence points outside the ${summary ? 'baseline snapshot' : 'prepared Git range'}.`);
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
    try { if (!checkedHistory?.has(refKey(version))) await project.history(version, 1); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    // Git scope was pinned independently; display links can change during moves.
    if (!errors.length) hash = await contentHash(project, release);
    if (release.status === 'ready' && release.contentHash !== hash && !errors.length) errors.push('Ready release content changed. Reopen the draft and finalize it again.');
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return { ...ref(version), valid: errors.length === 0, errors, warnings, contentHash: hash };
}

export async function finalize(project: Project, version: ReleaseId): Promise<Validation> {
  const release = await project.release(version);
  editable(release);
  const result = await validate(project, version);
  if (!result.valid || !result.contentHash) throw new Error(result.errors.join('\n'));
  const chain = await project.history(version);
  if (release.channel === undefined && chain.slice(1).some(r => r.status !== 'ready')) throw new Error('Finalize the previous releases before finalizing this release.');
  release.status = 'ready';
  release.contentHash = result.contentHash;
  await project.save(release);
  return result;
}
