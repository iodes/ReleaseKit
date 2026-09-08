import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { addNote, readVisual } from '../src/content.js';
import { digest, exists, writeYaml } from '../src/files.js';
import { importImage, planImages, type ImportImageOptions } from '../src/images.js';
import { type AssetVariant, themes } from '../src/model.js';
import { type Project } from '../src/project.js';
import { finalize, validate } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { fixture, commit, release, cleanup, png } from './helpers.js';

afterEach(cleanup);

async function imageDraft(policy: 'both' | 'dark' | 'light' = 'both') {
  const project = await fixture(policy);
  await commit(project.root, 'queue\n', 'Add queue', 'v1');
  await release(project, '1', 'v0', undefined, true);
  return project;
}

function cliImport(project: Project, variant: AssetVariant, file: string, source: ImportImageOptions['source']) {
  const args = ['--import', 'tsx', 'src/cli.ts', '--cwd', project.root, '--json', 'image', 'import', '1', 'queue', '--theme', variant, '--file', file];
  if (source !== undefined) args.push('--source', source);
  const result = spawnSync(process.execPath, args, {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
  });
  expect(result.stderr).toBe(''); expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as Awaited<ReturnType<typeof importImage>>;
}

async function assetSnapshot(project: Project) {
  const files: Record<string, string> = {};
  for (const file of await fs.readdir(await project.releaseFile('1', 'assets'))) {
    files[file] = digest(await fs.readFile(await project.releaseFile('1', `assets/${file}`)));
  }
  return files;
}

describe('shared and themed image transitions', () => {
  it.each(['both', 'dark', 'light'] as const)('switches %s images to shared and back through the CLI without leaving unused imports', async policy => {
    const p = await imageDraft(policy);
    const original = await readVisual(p, '1', 'queue');
    const source = path.join(p.root, 'approved capture.png');
    const bytes = await png('#aabbcc'); await fs.writeFile(source, bytes);
    const orphan = await p.releaseFile('1', 'assets/queue.shared.0123456789ab.png');
    await fs.writeFile(orphan, await png('#556677'));

    const shared = cliImport(p, 'shared', 'approved capture.png', 'provided');
    expect(await readVisual(p, '1', 'queue')).toEqual({
      ...original, scene: { ...original.scene, source: 'provided' }, variants: { shared },
    });
    expect(await fs.readdir(await p.releaseFile('1', 'assets'))).toEqual([path.posix.basename(shared.file)]);
    for (const asset of Object.values(original.variants)) expect(await exists(await p.releaseFile('1', asset.file))).toBe(false);
    expect(await exists(orphan)).toBe(false);
    expect(await fs.readFile(source)).toEqual(bytes);
    expect((await planImages(p, '1')).requests).toEqual([]);
    expect((await validate(p, '1')).valid).toBe(true);

    const configured = themes((await p.release('1')).visuals);
    for (const [index, theme] of configured.entries()) {
      const selected = cliImport(p, theme, `${theme}.png`, 'generated');
      const visual = await readVisual(p, '1', 'queue');
      expect(visual.scene.source).toBe('generated');
      expect(visual.variants.shared).toBeUndefined();
      expect(visual.variants[theme]).toEqual(selected);
      expect(await exists(await p.releaseFile('1', shared.file))).toBe(false);
      const plan = await planImages(p, '1');
      expect(plan.requests.map(({ theme, action, reason }) => ({ theme, action, reason }))).toEqual(
        configured.slice(index + 1).map(theme => ({ theme, action: 'generate', reason: 'missing' })),
      );
      if (plan.pendingAssets) await expect(finalize(p, '1')).rejects.toThrow('pending');
    }
    const finalVisual = await readVisual(p, '1', 'queue');
    expect(Object.keys(finalVisual.variants).sort()).toEqual([...configured].sort());
    expect((await fs.readdir(await p.releaseFile('1', 'assets'))).sort()).toEqual(
      Object.values(finalVisual.variants).map(asset => path.posix.basename(asset.file)).sort(),
    );
    expect(await fs.readFile(source)).toEqual(bytes);
    await finalize(p, '1');
    const output = await exportBundle(p, '1', { out: path.join(p.root, 'bundle') });
    const bundle = JSON.parse(await fs.readFile(output.files[0]!, 'utf8'));
    expect(Object.keys(bundle.releases[0].notes[0].image.variants).sort()).toEqual([...configured].sort());
    expect(output.assets).toBe(configured.length);
  });

  it('keeps the source as supplied when switching a shared capture to distinct theme captures', async () => {
    const p = await imageDraft();
    const shared = await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'), { source: 'provided' });
    // Using a currently managed file as the replacement input must copy its bytes before cleanup.
    const dark = await importImage(p, '1', 'queue', 'dark', await p.releaseFile('1', shared.file));
    expect(dark.sha256).toBe(shared.sha256);
    expect(await exists(await p.releaseFile('1', shared.file))).toBe(false);
    expect((await readVisual(p, '1', 'queue')).scene.source).toBe('provided');
    expect((await planImages(p, '1')).requests).toMatchObject([{ theme: 'light', action: 'provide', promptFile: null }]);
    await importImage(p, '1', 'queue', 'light', path.join(p.root, 'light.png'));
    expect((await planImages(p, '1')).requests).toEqual([]);
    expect(await fs.readdir(await p.releaseFile('1', 'assets'))).toHaveLength(2);
  });

  it.each(['shared', 'dark'] as const)('preserves the complete previous selection and source when a %s transition fails', async target => {
    const p = await imageDraft();
    if (target === 'dark') await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'), { source: 'provided' });
    const visualFile = await p.releaseFile('1', 'visuals/queue.yaml');
    const before = await fs.readFile(visualFile);
    const assets = await assetSnapshot(p);
    const options: ImportImageOptions = { source: target === 'shared' ? 'provided' : 'generated' };
    const source = path.join(p.root, 'replacement.png');
    await fs.writeFile(source, 'invalid image');
    await expect(importImage(p, '1', 'queue', target, source, options)).rejects.toThrow();
    expect(await fs.readFile(visualFile)).toEqual(before);
    expect(await assetSnapshot(p)).toEqual(assets);

    const bytes = await png('#334455'); await fs.writeFile(source, bytes);
    const blocker = `${visualFile}.${process.pid}.tmp`;
    await fs.writeFile(blocker, 'another pending write');
    await expect(importImage(p, '1', 'queue', target, source, options)).rejects.toThrow('EEXIST');
    expect(await fs.readFile(visualFile)).toEqual(before);
    expect(await assetSnapshot(p)).toEqual(assets);
    expect(await fs.readFile(blocker, 'utf8')).toBe('another pending write');
    expect(await fs.readFile(source)).toEqual(bytes);
  });

  it('retains former theme images referenced by other notes or releases and cleans them after those references are removed', async () => {
    const p = await imageDraft();
    const original = await readVisual(p, '1', 'queue');
    await addNote(p, '1', 'related', 'feature', true);
    const relatedFile = await p.releaseFile('1', 'visuals/related.yaml');
    const related: typeof original = { ...original, variants: { dark: original.variants.dark } };
    await writeYaml(relatedFile, related);
    await commit(p.root, 'queue\nupdated\n', 'Update queue');
    await release(p, '2', 'v1', '1', true);
    const nextFile = await p.releaseFile('2', 'visuals/queue.yaml');
    const next = await readVisual(p, '2', 'queue');
    next.scene.references = [`releasekit/releases/1/${original.variants.light!.file}`];
    await writeYaml(nextFile, next);
    const nextBytes = await fs.readFile(nextFile);
    const shared = await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'), { source: 'provided' });
    for (const asset of Object.values(original.variants)) expect(await exists(await p.releaseFile('1', asset.file))).toBe(true);
    expect(await fs.readFile(nextFile)).toEqual(nextBytes);
    expect((await readVisual(p, '1', 'queue')).variants).toEqual({ shared });

    related.variants = {}; await writeYaml(relatedFile, related);
    next.scene.references = []; await writeYaml(nextFile, next);
    await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'));
    expect(await fs.readdir(await p.releaseFile('1', 'assets'))).toEqual([path.posix.basename(shared.file)]);
    for (const asset of Object.values(next.variants)) expect(await exists(await p.releaseFile('2', asset.file))).toBe(true);
  });

  it('cleans previous theme imports left by manual entry removal and exports only the shared selection', async () => {
    const p = await imageDraft();
    const original = await readVisual(p, '1', 'queue');
    await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), {
      ...original, scene: { ...original.scene, source: 'provided' }, variants: {},
    });
    const manual = await p.releaseFile('1', 'assets/queue.dark.original.png');
    const bytes = await png('#aabbcc'); await fs.writeFile(manual, bytes);
    const shared = await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'));
    expect((await fs.readdir(await p.releaseFile('1', 'assets'))).sort()).toEqual([path.posix.basename(shared.file), path.basename(manual)].sort());
    expect(await fs.readFile(manual)).toEqual(bytes);
    await finalize(p, '1');
    const output = await exportBundle(p, '1', { out: path.join(p.root, 'bundle') });
    const bundle = JSON.parse(await fs.readFile(output.files[0]!, 'utf8'));
    expect(bundle.releases[0].notes[0].image.fallbackTheme).toBe('shared');
    expect(Object.keys(bundle.releases[0].notes[0].image.variants)).toEqual(['shared']);
    expect(output.assets).toBe(1);
  });

  it('preserves the shared selection when a requested theme is disabled', async () => {
    const p = await imageDraft('dark');
    await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'), { source: 'provided' });
    const before = await fs.readFile(await p.releaseFile('1', 'visuals/queue.yaml'));
    const assets = await assetSnapshot(p);
    await expect(importImage(p, '1', 'queue', 'light', path.join(p.root, 'dark.png'), { source: 'generated' })).rejects.toThrow('not enabled');
    expect(await fs.readFile(await p.releaseFile('1', 'visuals/queue.yaml'))).toEqual(before);
    expect(await assetSnapshot(p)).toEqual(assets);
  });

  it('rejects a generated replacement for a supplied-only subject without changing its image or source', async () => {
    const p = await imageDraft();
    const visual = await readVisual(p, '1', 'queue');
    visual.scene.archetype = 'object-detail'; visual.scene.source = 'provided';
    const visualFile = await p.releaseFile('1', 'visuals/queue.yaml');
    await writeYaml(visualFile, visual);
    await importImage(p, '1', 'queue', 'shared', path.join(p.root, 'dark.png'));
    const before = await fs.readFile(visualFile);
    const assets = await assetSnapshot(p);
    await expect(importImage(p, '1', 'queue', 'dark', path.join(p.root, 'dark.png'), { source: 'generated' })).rejects.toThrow('requires a supplied');
    expect(await fs.readFile(visualFile)).toEqual(before);
    expect(await assetSnapshot(p)).toEqual(assets);
  });
});
