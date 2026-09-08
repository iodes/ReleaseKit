import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { addNote, removeNote, readVisual } from '../src/content.js';
import { exists, digest, noteHash, writeNote, writeYaml } from '../src/files.js';
import { planImages, importImage } from '../src/images.js';
import { prepare } from '../src/project.js';
import { validate, finalize } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { fixture, commit, release, cleanup, png } from './helpers.js';

afterEach(cleanup);

async function draft(image = true) {
  const project = await fixture();
  const config = await project.config();
  config.locales.push('ko-KR');
  await writeYaml(await project.content('config.yaml'), config);
  await commit(project.root, 'queue\n', 'Add queue', 'v1');
  await release(project, '1', 'v0', undefined, image);
  return project;
}

async function snapshot(directory: string) {
  const files: Record<string, string> = {};
  for (const file of (await fs.readdir(directory, { recursive: true, withFileTypes: true }))) {
    if (!file.isFile()) continue;
    const absolute = path.join(file.parentPath, file.name);
    files[path.relative(directory, absolute)] = digest(await fs.readFile(absolute));
  }
  return files;
}

describe('draft note changes', () => {
  it('removes a note through the CLI with its translations, prompts, and all unused managed images', async () => {
    const p = await draft();
    const original = await p.release('1');
    const visual = await readVisual(p, '1', 'queue');
    visual.scene.message = 'The queue action is available for saved items.';
    await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), visual);
    const plan = await planImages(p, '1');
    expect(plan.requests).toHaveLength(2);
    const obsolete = 'assets/queue.shared.0123456789ab.webp';
    await fs.writeFile(await p.releaseFile('1', obsolete), await png('#aabbcc'));
    const preserved = ['queue.dark.manual.png', 'queue.dark.0123456789ab.backup.png', 'queue-other.dark.0123456789ab.png', 'queue.dark.dark.0123456789ab.png'];
    for (const file of preserved) await fs.writeFile(await p.releaseFile('1', `assets/${file}`), await png('#223344'));
    await addNote(p, '1', 'retained', 'fix', false);
    const withOther = await p.release('1');
    withOther.notes[1]!.paths = ['app.txt'];
    await p.save(withOther);
    for (const locale of original.locales) {
      const text = await fs.readFile(await p.releaseFile('1', `notes/queue/${locale}.md`));
      await fs.writeFile(await p.releaseFile('1', `notes/retained/${locale}.md`), text);
    }
    const otherFiles = await snapshot(await p.releaseFile('1', 'notes/retained'));
    const originals = await Promise.all(['dark.png', 'light.png'].map(file => fs.readFile(path.join(p.root, file))));
    const nested = path.join(p.root, 'directory with spaces'); await fs.mkdir(nested);
    const command = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', nested, '--json', 'note', 'remove', '1', 'queue'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
    });
    expect(command.stderr).toBe(''); expect(command.status).toBe(0);
    const result = JSON.parse(command.stdout);
    expect(result).toMatchObject({ version: '1', note: 'queue', status: 'draft', retainedAssets: [] });
    expect(result.removedPaths.sort()).toEqual([
      'notes/queue', 'visuals/queue.yaml', 'prompts/queue.dark.md', 'prompts/queue.light.md',
      ...Object.values(visual.variants).map(asset => asset.file), obsolete,
    ].sort());
    for (const file of result.removedPaths) expect(await exists(await p.releaseFile('1', file))).toBe(false);
    expect((await fs.readdir(await p.releaseFile('1', 'assets'))).sort()).toEqual(preserved.sort());
    expect(await snapshot(await p.releaseFile('1', 'notes/retained'))).toEqual(otherFiles);
    expect(await Promise.all(['dark.png', 'light.png'].map(file => fs.readFile(path.join(p.root, file))))).toEqual(originals);
    expect(await p.release('1')).toEqual({ ...withOther, notes: [withOther.notes[1]], contentHash: null });
    expect((await planImages(p, '1')).requests).toEqual([]);
    expect((await validate(p, '1')).valid).toBe(true);
    expect((await fs.readdir(await p.releaseDir('1'))).some(file => file.startsWith('.remove-'))).toBe(false);
    await finalize(p, '1');
    const output = await exportBundle(p, '1', { out: path.join(p.root, 'bundle') });
    const bundle = JSON.parse(await fs.readFile(output.files[0]!, 'utf8'));
    expect(bundle.releases[0].notes.map((note: { id: string }) => note.id)).toEqual(['retained']);
    expect(output.assets).toBe(0);
  });

  it('keeps shared files until their last variant or scene reference is removed', async () => {
    const p = await draft();
    const visual = await readVisual(p, '1', 'queue');
    await addNote(p, '1', 'related', 'feature', true);
    await writeYaml(await p.releaseFile('1', 'visuals/related.yaml'), {
      ...visual, variants: { dark: visual.variants.dark },
      scene: { ...visual.scene, references: [`releasekit/releases/1/${visual.variants.light!.file}`] },
    });
    const result = await removeNote(p, '1', 'queue');
    expect(result.retainedAssets.sort()).toEqual(Object.values(visual.variants).map(asset => asset.file).sort());
    for (const file of result.retainedAssets) expect(await exists(await p.releaseFile('1', file))).toBe(true);
    await addNote(p, '1', 'queue', 'feature', false);
    await removeNote(p, '1', 'queue');
    await removeNote(p, '1', 'related');
    expect(await fs.readdir(await p.releaseFile('1', 'assets'))).toEqual([]);
  });

  it('preserves images used as references by a different release', async () => {
    const p = await draft();
    const visual = await readVisual(p, '1', 'queue');
    await commit(p.root, 'queue\nupdated\n', 'Update queue');
    await release(p, '2', 'v1', '1', true);
    const next = await readVisual(p, '2', 'queue');
    next.scene.references = [`releasekit/releases/1/${visual.variants.dark!.file}`];
    await writeYaml(await p.releaseFile('2', 'visuals/queue.yaml'), next);
    const before = await snapshot(await p.releaseDir('2'));
    const result = await removeNote(p, '1', 'queue');
    expect(result.retainedAssets).toEqual([visual.variants.dark!.file]);
    expect(await exists(await p.releaseFile('1', visual.variants.dark!.file))).toBe(true);
    expect(await exists(await p.releaseFile('1', visual.variants.light!.file))).toBe(false);
    expect(await snapshot(await p.releaseDir('2'))).toEqual(before);
  });

  it('preserves a finalized predecessor containing the same note ID', async () => {
    const p = await draft();
    await finalize(p, '1');
    const previous = await snapshot(await p.releaseDir('1'));
    await commit(p.root, 'queue\nupdated\n', 'Update queue');
    await release(p, '2', 'v1', '1', true);
    await removeNote(p, '2', 'queue');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(previous);
    expect((await validate(p, '1')).valid).toBe(true);
    expect((await p.release('2')).previous).toBe('1');
  });

  it('removes supplied imports while retaining the source image and manually named assets', async () => {
    const p = await draft();
    const visual = await readVisual(p, '1', 'queue');
    visual.scene.source = 'provided'; visual.variants = {};
    const source = path.join(p.root, 'approved.png');
    const bytes = await png('#aabbcc'); await fs.writeFile(source, bytes);
    visual.scene.references = ['approved.png'];
    await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), visual);
    await importImage(p, '1', 'queue', 'shared', source);
    const manual = await p.releaseFile('1', 'assets/approved-original.png');
    await fs.writeFile(manual, bytes);
    await removeNote(p, '1', 'queue');
    expect(await fs.readdir(await p.releaseFile('1', 'assets'))).toEqual(['approved-original.png']);
    expect(await fs.readFile(source)).toEqual(bytes);
    expect(await fs.readFile(manual)).toEqual(bytes);
  });

  it('removes unfinished and missing note files, including leftovers after image work is disabled', async () => {
    const p = await draft(false);
    await addNote(p, '1', 'unfinished', 'feature', true);
    const r = await p.release('1'); r.notes[1]!.image = false; await p.save(r);
    await fs.mkdir(await p.releaseFile('1', 'assets'));
    const orphan = await p.releaseFile('1', 'assets/unfinished.dark.0123456789ab.png');
    await fs.writeFile(orphan, await png('#334455'));
    await removeNote(p, '1', 'unfinished');
    expect(await exists(orphan)).toBe(false);
    expect(await exists(await p.releaseFile('1', 'visuals/unfinished.yaml'))).toBe(false);
    for (const locale of r.locales) await fs.unlink(await p.releaseFile('1', `notes/queue/${locale}.md`));
    await fs.rmdir(await p.releaseFile('1', 'notes/queue'));
    await removeNote(p, '1', 'queue');
    expect((await p.release('1')).notes).toEqual([]);
    expect((await p.release('1')).emptyReason).toBeNull();
    expect((await validate(p, '1')).valid).toBe(false);
    await addNote(p, '1', 'queue', 'feature', false);
    expect((await p.release('1')).notes.map(note => note.id)).toEqual(['queue']);
  });

  it('restores all note files when saving the removal fails', async () => {
    const p = await draft();
    const releaseFile = await p.releaseFile('1', 'release.yaml');
    const blocker = `${releaseFile}.${process.pid}.tmp`;
    await fs.writeFile(blocker, 'another pending write');
    const before = await snapshot(await p.releaseDir('1'));
    await expect(removeNote(p, '1', 'queue')).rejects.toThrow('EEXIST');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(before);
    expect((await fs.readdir(await p.releaseDir('1'))).some(file => file.startsWith('.remove-'))).toBe(false);
    await fs.unlink(blocker);
    await removeNote(p, '1', 'queue');
    expect(await exists(await p.releaseFile('1', 'notes/queue'))).toBe(false);
  });

  it('rejects removal of note files used as another scene reference before changing anything', async () => {
    const p = await draft();
    const visual = await readVisual(p, '1', 'queue');
    await addNote(p, '1', 'related', 'feature', true);
    await writeYaml(await p.releaseFile('1', 'visuals/related.yaml'), {
      ...visual, scene: { ...visual.scene, references: ['releasekit/releases/1/notes/queue/en-US.md'] },
    });
    const before = await snapshot(await p.releaseDir('1'));
    await expect(removeNote(p, '1', 'queue')).rejects.toThrow('referenced');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(before);
  });

  it.each(['notes/queue', 'assets'])('rejects an escaping %s directory before removing files', async relative => {
    const p = await draft();
    const outside = await fixture();
    const source = path.join(outside.root, 'preserved.png');
    const bytes = await png('#556677'); await fs.writeFile(source, bytes);
    const directory = await p.releaseFile('1', relative);
    await fs.rename(directory, await p.releaseFile('1', 'preserved-directory'));
    await fs.symlink(outside.root, directory, process.platform === 'win32' ? 'junction' : 'dir');
    const metadata = await fs.readFile(await p.releaseFile('1', 'release.yaml'));
    await expect(removeNote(p, '1', 'queue')).rejects.toThrow('Symbolic link');
    expect(await fs.readFile(await p.releaseFile('1', 'release.yaml'))).toEqual(metadata);
    expect(await fs.readFile(source)).toEqual(bytes);
  });

  it('rejects unknown IDs, traversal, and changes to ready releases without touching content', async () => {
    const p = await draft();
    const before = await snapshot(await p.releaseDir('1'));
    await expect(removeNote(p, '1', 'missing')).rejects.toThrow('Unknown note');
    await expect(removeNote(p, '1', '../queue')).rejects.toThrow();
    await expect(addNote(p, '1', 'queue', 'feature', false)).rejects.toThrow('already exists');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(before);
    await finalize(p, '1');
    const ready = await snapshot(await p.releaseDir('1'));
    await expect(removeNote(p, '1', 'queue')).rejects.toThrow('ready');
    await expect(addNote(p, '1', 'new-feature', 'feature', false)).rejects.toThrow('ready');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(ready);
  });

  it('clears an empty-release reason when adding notes and uses the saved release locales', async () => {
    const p = await fixture();
    await commit(p.root, 'queue\n', 'Add queue');
    const r = await prepare(p, '1', { from: 'v0' });
    r.locales.push('ko-KR'); r.emptyReason = 'Only internal maintenance is selected.';
    await p.save(r);
    const command = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', p.root, '--json', 'note', 'add', '1', 'queue', '--no-image'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
    });
    expect(command.stderr).toBe(''); expect(command.status).toBe(0);
    expect(JSON.parse(command.stdout)).toEqual({ version: '1', note: 'queue', status: 'draft' });
    expect((await p.release('1')).emptyReason).toBeNull();
    expect((await p.release('1')).source).toEqual(r.source);
    expect((await p.config()).locales).toEqual(['en-US']);
    expect((await fs.readdir(await p.releaseFile('1', 'notes/queue'))).sort()).toEqual(['en-US.md', 'ko-KR.md']);
    const updated = await p.release('1'); updated.notes[0]!.paths = ['app.txt']; await p.save(updated);
    const text = { title: 'Queue', body: 'Add a saved item to the queue.', alt: '', sourceHash: null };
    await writeNote(await p.releaseFile('1', 'notes/queue/en-US.md'), text);
    await writeNote(await p.releaseFile('1', 'notes/queue/ko-KR.md'), { ...text, sourceHash: noteHash(text) });
    expect((await validate(p, '1')).valid).toBe(true);
  });

  it('rolls back newly added note files if release metadata cannot be saved', async () => {
    const p = await fixture();
    await commit(p.root, 'queue\n', 'Add queue');
    await prepare(p, '1', { from: 'v0' });
    const blocker = `${await p.releaseFile('1', 'release.yaml')}.${process.pid}.tmp`;
    await fs.writeFile(blocker, 'another pending write');
    const before = await snapshot(await p.releaseDir('1'));
    await expect(addNote(p, '1', 'queue', 'feature', true)).rejects.toThrow('EEXIST');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(before);
    expect(await exists(await p.releaseFile('1', 'notes/queue'))).toBe(false);
    expect(await exists(await p.releaseFile('1', 'visuals/queue.yaml'))).toBe(false);
  });

  it('preserves leftover visual briefs when an ID has no note folder', async () => {
    const p = await fixture();
    await commit(p.root, 'queue\n', 'Add queue');
    await prepare(p, '1', { from: 'v0' });
    const file = await p.releaseFile('1', 'visuals/queue.yaml');
    await writeYaml(file, { retained: 'hand-authored scene' });
    const before = await snapshot(await p.releaseDir('1'));
    await expect(addNote(p, '1', 'queue', 'feature', true)).rejects.toThrow('leftover');
    expect(await snapshot(await p.releaseDir('1'))).toEqual(before);
  });
});
