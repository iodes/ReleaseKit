import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { addNote, readVisual } from '../src/content.js';
import { digest, exists, writeYaml } from '../src/files.js';
import { importImage, inspectImage, planImages } from '../src/images.js';
import { exportBundle } from '../src/export.js';
import { finalize, validate } from '../src/validate.js';
import { fixture, commit, release, cleanup, png } from './helpers.js';

afterEach(cleanup);

async function imageProject() {
  const project = await fixture();
  await commit(project.root, 'queue\n', 'Add queue', 'v1');
  await release(project, '1', 'v0', undefined, true);
  return project;
}

describe('image coverage across repeated runs', () => {
  it('includes added fixes and improvements by default and plans only their missing variants', async () => {
    const p = await imageProject();
    const original = await readVisual(p, '1', 'queue');
    const originalBrief = await fs.readFile(await p.releaseFile('1', 'visuals/queue.yaml'));
    const originalFiles = await Promise.all(Object.values(original.variants).map(async asset => fs.readFile(await p.releaseFile('1', asset.file))));
    expect((await planImages(p, '1')).requests).toEqual([]);

    const added = [{ id: 'small-fix', category: 'fix' }, { id: 'minor-improvement', category: 'improvement' }];
    for (const note of added) {
      const command = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', p.root, '--json', 'note', 'add', '1', note.id, '--category', note.category], {
        cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
      });
      expect(command.stderr).toBe(''); expect(command.status).toBe(0);
      expect((await p.release('1')).notes.find(entry => entry.id === note.id)).toMatchObject({ image: true, category: note.category });
      await writeYaml(await p.releaseFile('1', `visuals/${note.id}.yaml`), {
        schemaVersion: 1, scene: { ...original.scene, subject: note.id }, variants: {},
      });
    }
    await addNote(p, '1', 'explicit-text-only', 'fix', false);

    const pending = await planImages(p, '1');
    expect(pending.readyAssets).toBe(2);
    expect(pending.requests.map(({ note, theme, reason, action }) => ({ note, theme, reason, action }))).toEqual(
      added.flatMap(({ id }) => ['dark', 'light'].map(theme => ({ note: id, theme, reason: 'missing', action: 'generate' }))),
    );
    await importImage(p, '1', 'small-fix', 'dark', path.join(p.root, 'dark.png'));
    expect((await planImages(p, '1')).requests.map(({ note, theme }) => ({ note, theme }))).toEqual([
      { note: 'small-fix', theme: 'light' }, { note: 'minor-improvement', theme: 'dark' }, { note: 'minor-improvement', theme: 'light' },
    ]);
    await importImage(p, '1', 'small-fix', 'light', path.join(p.root, 'light.png'));
    for (const theme of ['dark', 'light'] as const) {
      await importImage(p, '1', 'minor-improvement', theme, path.join(p.root, `${theme}.png`));
    }
    const complete = await planImages(p, '1');
    expect(complete.requests).toEqual([]);
    expect(complete.readyAssets).toBe(6);
    expect(await fs.readFile(await p.releaseFile('1', 'visuals/queue.yaml'))).toEqual(originalBrief);
    expect(await Promise.all(Object.values(original.variants).map(async asset => fs.readFile(await p.releaseFile('1', asset.file))))).toEqual(originalFiles);
    expect((await fs.readdir(await p.releaseFile('1', 'prompts'))).sort()).toEqual(
      added.flatMap(({ id }) => ['dark', 'light'].map(theme => `${id}.${theme}.md`)).sort(),
    );
  });
});

describe('image replacement', () => {
  it.each(['dark', 'light', 'shared'] as const)('replaces repeated %s imports without accumulating older files', async variant => {
    const p = await imageProject();
    if (variant === 'shared') {
      const visual = await readVisual(p, '1', 'queue');
      visual.scene.source = 'provided'; visual.variants = {};
      await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), visual);
      await importImage(p, '1', 'queue', variant, path.join(p.root, 'dark.png'));
    }
    const original = await readVisual(p, '1', 'queue');
    let previous = original.variants[variant]!;
    const source = path.join(p.root, 'replacement.png');
    for (const color of ['#445566', '#8899aa']) {
      const bytes = await png(color);
      await fs.writeFile(source, bytes);
      const selected = await importImage(p, '1', 'queue', variant, source);
      expect(selected.file).not.toBe(previous.file);
      expect(await exists(await p.releaseFile('1', previous.file))).toBe(false);
      expect(await fs.readFile(await p.releaseFile('1', selected.file))).toEqual(bytes);
      expect(await fs.readFile(source)).toEqual(bytes);
      expect((await readVisual(p, '1', 'queue')).variants).toEqual({ ...original.variants, [variant]: selected });
      previous = selected;
    }
    const files = await fs.readdir(await p.releaseFile('1', 'assets'));
    expect(files.filter(file => file.startsWith(`queue.${variant}.`))).toEqual([path.posix.basename(previous.file)]);
    for (const [theme, asset] of Object.entries(original.variants)) {
      if (theme !== variant) expect(await exists(await p.releaseFile('1', asset.file))).toBe(true);
    }
    expect((await planImages(p, '1')).pendingAssets).toBe(0);
  });

  it('reuses identical bytes and cleans old imports while keeping other slots and manually named files', async () => {
    const p = await imageProject();
    const original = await readVisual(p, '1', 'queue');
    const orphan = `assets/queue.dark.${digest(await png('#778899')).slice(0, 12)}.png`;
    await fs.writeFile(await p.releaseFile('1', orphan), await png('#778899'));
    const preserved = ['queue.dark.custom.png', 'queue.dark.123456789abc.backup.png', 'queue-other.dark.123456789abc.png'];
    for (const file of preserved) await fs.writeFile(await p.releaseFile('1', `assets/${file}`), await png('#aabbcc'));

    const selected = await importImage(p, '1', 'queue', 'dark', await p.releaseFile('1', original.variants.dark!.file));
    expect(selected).toEqual(original.variants.dark);
    expect(await exists(await p.releaseFile('1', orphan))).toBe(false);
    expect((await fs.readdir(await p.releaseFile('1', 'assets'))).sort()).toEqual([
      ...Object.values(original.variants).map(asset => path.posix.basename(asset.file)), ...preserved,
    ].sort());
    expect((await validate(p, '1')).valid).toBe(true);
  });

  it('replaces an image with a different format and exports only the new selection with intact release history', async () => {
    const p = await imageProject();
    const previous = await readVisual(p, '1', 'queue');
    await finalize(p, '1');
    await commit(p.root, 'queue\nupdated\n', 'Improve queue');
    await release(p, '2', 'v1', '1', true);
    const original = await readVisual(p, '2', 'queue');
    const sharp = (await import('sharp')).default;
    const bytes = await sharp(await png('#345678')).webp().toBuffer();
    const source = path.join(p.root, 'replacement.webp'); await fs.writeFile(source, bytes);
    const selected = await importImage(p, '2', 'queue', 'dark', source);
    expect(selected.file).toMatch(/\.webp$/);
    expect(await exists(await p.releaseFile('2', original.variants.dark!.file))).toBe(false);
    expect(await exists(await p.releaseFile('1', previous.variants.dark!.file))).toBe(true);
    await finalize(p, '2');
    const output = await exportBundle(p, '2', { out: path.join(p.root, 'bundle') });
    const bundle = JSON.parse(await fs.readFile(output.file, 'utf8'));
    const exported = bundle.releases[0].notes[0].image.variants.dark.src;
    expect(exported).toBe(`assets/2/${path.posix.basename(selected.file)}`);
    expect(await fs.readFile(path.join(p.root, 'bundle', exported))).toEqual(bytes);
    expect(await fs.readdir(path.join(p.root, 'bundle/assets/2'))).toHaveLength(2);
    expect(bundle.releases[1].notes[0].image.variants.dark.src).toBe(`assets/1/${path.posix.basename(previous.variants.dark!.file)}`);
  });

  it('keeps an older file referenced by another variant or a scene in another release', async () => {
    const p = await imageProject();
    const original = await readVisual(p, '1', 'queue');
    await addNote(p, '1', 'related', 'feature', true);
    await writeYaml(await p.releaseFile('1', 'visuals/related.yaml'), {
      schemaVersion: 1, scene: original.scene, variants: { dark: original.variants.dark },
    });
    await commit(p.root, 'queue\nnew\n', 'Update queue');
    await release(p, '2', 'v1', '1', true);
    const related = await readVisual(p, '2', 'queue');
    related.scene.references = [`releasekit/releases/1/${original.variants.dark!.file}`];
    await writeYaml(await p.releaseFile('2', 'visuals/queue.yaml'), related);
    const source = path.join(p.root, 'replacement.png'); await fs.writeFile(source, await png('#112233'));

    await importImage(p, '1', 'queue', 'dark', source);
    expect(await exists(await p.releaseFile('1', original.variants.dark!.file))).toBe(true);
    const sameRelease = await readVisual(p, '1', 'related');
    sameRelease.variants = {};
    await writeYaml(await p.releaseFile('1', 'visuals/related.yaml'), sameRelease);
    await importImage(p, '1', 'queue', 'dark', source);
    expect(await exists(await p.releaseFile('1', original.variants.dark!.file))).toBe(true);
    related.scene.references = [];
    await writeYaml(await p.releaseFile('2', 'visuals/queue.yaml'), related);
    await importImage(p, '1', 'queue', 'dark', source);
    expect(await exists(await p.releaseFile('1', original.variants.dark!.file))).toBe(false);
  });

  it('allows replacement while another note has an unfinished scene', async () => {
    const p = await imageProject();
    const original = await readVisual(p, '1', 'queue');
    await addNote(p, '1', 'unfinished', 'feature', true);
    const source = path.join(p.root, 'replacement.png'); await fs.writeFile(source, await png('#123456'));
    await importImage(p, '1', 'queue', 'dark', source);
    expect(await exists(await p.releaseFile('1', original.variants.dark!.file))).toBe(false);
  });

  it('preserves the previous selection when the replacement cannot be decoded or has a conflicting destination', async () => {
    const p = await imageProject();
    const original = await readVisual(p, '1', 'queue');
    const source = path.join(p.root, 'replacement.png');
    await fs.writeFile(source, 'invalid image');
    await expect(importImage(p, '1', 'queue', 'dark', source)).rejects.toThrow();
    const bytes = await png('#334455'); await fs.writeFile(source, bytes);
    const inspected = await inspectImage(bytes);
    const conflict = await p.releaseFile('1', `assets/queue.dark.${inspected.sha256.slice(0, 12)}.png`);
    await fs.writeFile(conflict, 'conflicting content');
    await expect(importImage(p, '1', 'queue', 'dark', source)).rejects.toThrow('conflicting content');
    expect(await fs.readFile(conflict, 'utf8')).toBe('conflicting content');
    expect(await readVisual(p, '1', 'queue')).toEqual(original);
    expect(await exists(await p.releaseFile('1', original.variants.dark!.file))).toBe(true);
  });

  it('rolls back a new file if saving its selection fails', async () => {
    const p = await imageProject();
    const original = await readVisual(p, '1', 'queue');
    const directory = await p.releaseFile('1', 'assets');
    const originalFiles = await fs.readdir(directory);
    const visualFile = await p.releaseFile('1', 'visuals/queue.yaml');
    await fs.writeFile(`${visualFile}.${process.pid}.tmp`, 'another pending write');
    const source = path.join(p.root, 'replacement.png'); await fs.writeFile(source, await png('#556677'));
    await expect(importImage(p, '1', 'queue', 'dark', source)).rejects.toThrow('EEXIST');
    expect(await readVisual(p, '1', 'queue')).toEqual(original);
    expect(await fs.readdir(directory)).toEqual(originalFiles);
    expect(await fs.readFile(`${visualFile}.${process.pid}.tmp`, 'utf8')).toBe('another pending write');
  });

  it('rejects cleanup through an escaping asset directory without touching external files', async () => {
    const p = await imageProject();
    const outside = await fixture();
    const original = await readVisual(p, '1', 'queue');
    const outsideFile = path.join(outside.root, path.posix.basename(original.variants.dark!.file));
    const bytes = await png('#667788'); await fs.writeFile(outsideFile, bytes);
    const directory = await p.releaseFile('1', 'assets');
    await fs.rename(directory, await p.releaseFile('1', 'retained-assets'));
    await fs.symlink(outside.root, directory, process.platform === 'win32' ? 'junction' : 'dir');
    await expect(importImage(p, '1', 'queue', 'dark', path.join(p.root, 'dark.png'))).rejects.toThrow('Symbolic link');
    expect(await readVisual(p, '1', 'queue')).toEqual(original);
    expect(await fs.readFile(outsideFile)).toEqual(bytes);
  });
});
