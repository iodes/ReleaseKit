import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { Project, prepare } from '../src/project.js';
import { collect, git } from '../src/git.js';
import { validate, finalize } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { planImages, importImage, inspectImage } from '../src/images.js';
import { markTranslation, readVisual, syncImagePolicy } from '../src/content.js';
import { readNote, writeNote, writeYaml, exists, within, parseYaml } from '../src/files.js';
import { initProject, installSkills } from '../src/install.js';
import { imagePrompt } from '../src/prompts.js';
import { configSchema } from '../src/model.js';
import { fixture, commit, release, fillNote, cleanup, png, sampleScene } from './helpers.js';

afterEach(cleanup);

describe('pinned Git evidence and history', () => {
  it('reads the requested commit without including dirty or later working-tree changes', async () => {
    const p = await fixture();
    const first = await commit(p.root, 'initial\nqueue\n', 'Add queue', 'v1');
    await commit(p.root, 'initial\nqueue\nfuture\n', 'Later change', 'v2');
    await fs.writeFile(path.join(p.root, 'app.txt'), 'uncommitted\n');
    const r = await prepare(p, '1.0', { from: 'v0', to: 'v1' });
    const patch = await fs.readFile(await p.releaseFile('1.0', 'changes.patch'), 'utf8');
    expect(r.source.toSha).toBe(first);
    expect(patch).toContain('+queue');
    expect(patch).not.toContain('future');
    expect(patch).not.toContain('uncommitted');
    git(p.root, ['tag', '-f', 'v1', 'v2']);
    expect((await p.release('1.0')).source.toSha).toBe(first);
    expect(await fs.readFile(path.join(p.root, 'app.txt'), 'utf8')).toBe('uncommitted\n');
    await expect(prepare(p, '1.0', { from: 'v0', to: 'v2' })).rejects.toThrow('already exists');
  });

  it('handles a full-history first release and rejects empty or unavailable boundaries', async () => {
    const p = await fixture();
    const first = await prepare(p, 'first', { fromRoot: true });
    expect(first.source.fromSha).toBeNull();
    expect((await p.evidence('first')).files.map(f => f.path)).toContain('app.txt');
    expect(() => collect(p.root, 'HEAD', 'HEAD')).toThrow('same commit');
    expect(() => collect(p.root, 'missing-tag', 'HEAD')).toThrow();
  });

  it('captures a reverted range as an empty net diff instead of manufacturing notes', async () => {
    const p = await fixture();
    await commit(p.root, 'temporary\n', 'Temporary change');
    await commit(p.root, 'initial\n', 'Revert temporary change');
    const r = await prepare(p, 'reverted', { from: 'v0' });
    expect((await p.evidence('reverted')).files).toEqual([]);
    expect((await validate(p, 'reverted')).valid).toBe(false);
    r.emptyReason = 'No user-visible changes remain in this range.';
    await p.save(r);
    await finalize(p, 'reverted');
    expect((await validate(p, 'reverted')).valid).toBe(true);
  });

  it('follows branch-specific previous links and preserves repeated note IDs across versions', async () => {
    const p = await fixture();
    await commit(p.root, 'initial\none\n', 'First change', 'v1');
    await release(p, '1.0', 'v0'); await finalize(p, '1.0');
    await commit(p.root, 'initial\none\ntwo\n', 'Second change', 'v2');
    await release(p, '2.0', 'v1', '1.0'); await finalize(p, '2.0');
    git(p.root, ['switch', '-c', 'maintenance', 'v1']);
    await commit(p.root, 'initial\none\nfix\n', 'Maintenance fix', 'fix');
    await release(p, '1.0.1', 'v1', '1.0'); await finalize(p, '1.0.1');
    expect((await p.history('1.0.1', 3)).map(r => r.version)).toEqual(['1.0.1', '1.0']);
    const result = await exportBundle(p, '1.0.1', { out: path.join(p.root, 'output') });
    const data = JSON.parse(await fs.readFile(result.file, 'utf8'));
    expect(data.releases.map((r: {version: string}) => r.version)).toEqual(['1.0.1', '1.0']);
    expect(data.releases.map((r: {notes: {id: string}[]}) => r.notes[0]!.id)).toEqual(['queue', 'queue']);
    expect(() => collect(p.root, 'v2', 'fix')).toThrow('not an ancestor');
    await expect(prepare(p, 'wrong-line', { from: 'v1', to: 'fix', previous: '2.0' })).rejects.toThrow('previous release');
    const older = await p.release('1.0'); older.previous = '1.0.1'; await p.save(older);
    await expect(p.history('1.0.1', 1)).rejects.toThrow('Cycle');
  });

  it('counts versions, including an intentionally empty release, and rejects broken links beyond the window', async () => {
    const p = await fixture();
    let previous: string | undefined;
    for (let i = 1; i <= 4; i++) {
      await commit(p.root, `change ${i}\n`, `Change ${i}`, `v${i}`);
      const r = await prepare(p, String(i), { from: `v${i - 1}`, previous });
      r.emptyReason = 'Internal maintenance only.'; await p.save(r); await finalize(p, String(i));
      previous = String(i);
    }
    expect((await p.history('4', 3)).map(r => r.version)).toEqual(['4', '3', '2']);
    const first = await p.release('1'); first.previous = 'missing'; await p.save(first);
    await expect(p.history('4', 1)).rejects.toThrow();
  });

  it('rejects shallow history without fetching', async () => {
    const p = await fixture();
    const clone = path.join(p.root, 'shallow');
    const { pathToFileURL } = await import('node:url');
    git(p.root, ['clone', '--depth', '1', pathToFileURL(p.root).href, clone]);
    expect(() => collect(clone, null, 'HEAD')).toThrow('shallow');
  });

  it('includes merged feature work in the net diff and recorded evidence', async () => {
    const p = await fixture();
    git(p.root, ['switch', '-c', 'feature']);
    await fs.writeFile(path.join(p.root, 'feature.txt'), 'new capability\n');
    git(p.root, ['add', '--', 'feature.txt']); git(p.root, ['commit', '-m', 'Add capability']);
    const featureCommit = git(p.root, ['rev-parse', 'HEAD']).trim();
    git(p.root, ['switch', 'main']); await commit(p.root, 'main change\n', 'Update main');
    git(p.root, ['merge', '--no-ff', 'feature', '-m', 'Merge capability']);
    const { evidence, patch } = collect(p.root, 'v0', 'HEAD');
    expect(evidence.files.map(f => f.path).sort()).toEqual(['app.txt', 'feature.txt']);
    expect(evidence.commits.some(c => c.sha === featureCommit)).toBe(true);
    expect(patch).toContain('+new capability');
  });
});

describe('theme-aware assets', () => {
  it('plans both themes once per note, not once per translation, and reuses an imported counterpart', async () => {
    const p = await fixture();
    await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    const visual = await readVisual(p, '1', 'queue');
    visual.variants = {}; await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), visual);
    let plan = await planImages(p, '1');
    expect(plan.pendingAssets).toBe(2);
    expect(plan.requests.map(r => r.theme)).toEqual(['dark', 'light']);
    await importImage(p, '1', 'queue', 'dark', path.join(p.root, 'dark.png'));
    plan = await planImages(p, '1');
    expect(plan.readyAssets).toBe(1); expect(plan.pendingAssets).toBe(1);
    expect(plan.requests[0]!.compositionReference).not.toBeNull();
    await expect(finalize(p, '1')).rejects.toThrow('light image is pending');
    await importImage(p, '1', 'queue', 'light', path.join(p.root, 'light.png'));
    expect((await planImages(p, '1')).pendingAssets).toBe(0);
    await finalize(p, '1');
    const out = await exportBundle(p, '1', { out: path.join(p.root, 'bundle') });
    const serialized = await fs.readFile(out.file, 'utf8');
    const note = JSON.parse(serialized).releases[0].notes[0];
    expect(Object.keys(note.image.variants)).toEqual(['dark', 'light']);
    expect(note.image.variants.dark.src).toMatch(/^assets\//);
    expect(serialized).not.toContain('sceneHash');
    expect(serialized).not.toContain('changes.patch');
    expect(serialized).not.toContain(p.root);
  });

  it.each(['dark', 'light'] as const)('exports only the configured %s theme with an honest fallback', async mode => {
    const p = await fixture(mode); await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    expect((await planImages(p, '1')).requestedAssets).toBe(1);
    await finalize(p, '1');
    const out = await exportBundle(p, '1', { out: path.join(p.root, 'bundle') });
    const data = JSON.parse(await fs.readFile(out.file, 'utf8'));
    expect(Object.keys(data.releases[0].notes[0].image.variants)).toEqual([mode]);
    expect(data.releases[0].notes[0].image.fallbackTheme).toBe(mode);
  });

  it('captures policy per release and preserves current assets when enabling an additional theme', async () => {
    const p = await fixture('dark'); await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    const config = await p.config(); config.visuals.themes = 'both'; await writeYaml(await p.content('config.yaml'), config);
    expect((await planImages(p, '1')).requestedAssets).toBe(1);
    await syncImagePolicy(p, '1');
    const plan = await planImages(p, '1');
    expect(plan.readyAssets).toBe(1); expect(plan.requests.map(r => r.theme)).toEqual(['light']);
  });

  it('invalidates a changed scene and rejects identical or mismatched theme pairs', async () => {
    const p = await fixture(); await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    await importImage(p, '1', 'queue', 'light', path.join(p.root, 'dark.png'));
    expect((await validate(p, '1')).errors.join()).toContain('identical');
    expect((await planImages(p, '1')).requests.map(r => r.theme)).toEqual(['light']);
    await fs.writeFile(path.join(p.root, 'larger.png'), await png('#ffffff', 256, 160));
    await importImage(p, '1', 'queue', 'light', path.join(p.root, 'larger.png'));
    expect((await validate(p, '1')).errors.join()).toContain('identical dimensions');
    const visual = await readVisual(p, '1', 'queue'); visual.scene.focus = 'A different action';
    await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), visual);
    expect((await planImages(p, '1')).requests.every(r => r.reason === 'stale')).toBe(true);
  });

  it('regenerates only the affected variant when one theme palette changes', async () => {
    const p = await fixture(); await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    const config = await p.config(); config.visuals.light.canvas = '#F0F0F0';
    await writeYaml(await p.content('config.yaml'), config); await syncImagePolicy(p, '1');
    const plan = await planImages(p, '1');
    expect(plan.readyAssets).toBe(1); expect(plan.requests.map(r => r.theme)).toEqual(['light']);
  });

  it('checks actual raster data and prevents assets from escaping release content', async () => {
    const p = await fixture(); await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    await fs.writeFile(path.join(p.root, 'fake.png'), '<svg width="128" height="80"></svg>');
    await expect(importImage(p, '1', 'queue', 'dark', path.join(p.root, 'fake.png'))).rejects.toThrow();
    const visual = await readVisual(p, '1', 'queue'); visual.variants.dark!.file = '../outside.png';
    await writeYaml(await p.releaseFile('1', 'visuals/queue.yaml'), visual);
    expect((await validate(p, '1')).valid).toBe(false);
    await expect(within(p.root, '../outside')).rejects.toThrow('contained');
    const outside = await fixture();
    await fs.symlink(outside.root, path.join(p.root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(within(p.root, 'escape/app.txt')).rejects.toThrow('Symbolic link');
  });

  it('compiles feature-specific prompts with theme roles and a fixed scene contract', async () => {
    const p = await fixture(); const policy = (await p.config()).visuals;
    const dark = imagePrompt(sampleScene, policy, 'dark');
    const light = imagePrompt(sampleScene, policy, 'light');
    for (const prompt of [dark, light]) {
      expect(prompt).toContain(sampleScene.composition); expect(prompt).toContain(sampleScene.message);
      expect(prompt).toContain(policy.accent); expect(prompt).toContain('1280 × 800');
    }
    expect(dark).toContain(policy.dark.canvas); expect(light).toContain(policy.light.canvas);
    expect(dark).not.toBe(light);
  });

  it.each(['jpeg', 'webp'] as const)('decodes and measures actual %s images', async format => {
    const sharp = (await import('sharp')).default;
    const bytes = await sharp(await png('#abcdef')).toFormat(format).toBuffer();
    const actual = await inspectImage(bytes);
    expect(actual.width).toBe(128); expect(actual.height).toBe(80);
    expect(actual.extension).toBe(format === 'jpeg' ? 'jpg' : 'webp');
  });
});

describe('content, installation, and command-line behavior', () => {
  it('detects stale translations and edits after finalization', async () => {
    const p = await fixture(); await commit(p.root, 'queue\n', 'Add queue'); await release(p, '1', 'v0');
    const file = await p.releaseFile('1', 'notes/queue/ko-KR.md');
    const text = await readNote(file); text.body += '\n추가 설명입니다.'; await writeNote(file, text);
    expect((await validate(p, '1')).errors.join()).toContain('stale');
    await markTranslation(p, '1', 'queue', 'en-US'); await finalize(p, '1');
    const englishFile = await p.releaseFile('1', 'notes/queue/en-US.md');
    const english = await readNote(englishFile); english.body += ' Another sentence.'; await writeNote(englishFile, english);
    expect((await validate(p, '1')).errors.join()).toContain('content changed');
    const out = path.join(p.root, 'invalid-output');
    await expect(exportBundle(p, '1', { out })).rejects.toThrow(); expect(await exists(out)).toBe(false);
  });

  it('installs shared skills once, preserves custom edits, and retains project settings', async () => {
    const p = await fixture('light');
    const config = await p.config(); config.tools = ['codex', 'claude', 'cursor']; await writeYaml(await p.content('config.yaml'), config);
    const installed = await installSkills(p);
    expect(installed.conflicts).toEqual([]);
    expect(await exists(path.join(p.root, '.cursor', 'skills'))).toBe(false);
    const skill = path.join(p.root, '.agents', 'skills', 'releasekit-image', 'SKILL.md');
    await fs.appendFile(skill, '\nProject-specific instructions.\n');
    const updated = await installSkills(p);
    expect(updated.conflicts).toContain('.agents/skills/releasekit-image/SKILL.md');
    expect(await fs.readFile(skill, 'utf8')).toContain('Project-specific instructions.');
    await expect(initProject(p, { themes: 'both' })).rejects.toThrow('already initialized');
    expect((await p.config()).visuals.themes).toBe('light');
    for (const root of ['.agents', '.claude']) for (const name of ['draft', 'image', 'translate', 'review']) {
      expect(await exists(path.join(p.root, root, 'skills', `releasekit-${name}`, 'references', 'theme-pairing.md'))).toBe(true);
    }
  });

  it('rejects duplicate YAML keys and unsupported theme policies', () => {
    expect(() => parseYaml('themes: dark\nthemes: light\n')).toThrow();
    expect(configSchema.shape.visuals.shape.themes.safeParse('auto-invert').success).toBe(false);
  });

  it('supports machine-readable CLI output from a directory with spaces', async () => {
    const p = await fixture();
    const nested = path.join(p.root, 'directory with spaces'); await fs.mkdir(nested);
    const packageRoot = fileURLToPath(new URL('../', import.meta.url));
    const command = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', nested, '--json', 'validate'], {
      cwd: packageRoot, encoding: 'utf8', windowsHide: true,
    });
    expect(command.stderr).toBe(''); expect(command.status).toBe(0); expect(JSON.parse(command.stdout)).toEqual([]);
  });

  it('resolves an imported image relative to the explicit CLI working directory', async () => {
    const p = await fixture('dark'); await commit(p.root, 'queue\n', 'Add queue');
    await release(p, '1', 'v0', undefined, true);
    const packageRoot = fileURLToPath(new URL('../', import.meta.url));
    const command = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', p.root, '--json', 'image', 'import', '1', 'queue', '--theme', 'dark', '--file', 'dark.png'], {
      cwd: packageRoot, encoding: 'utf8', windowsHide: true,
    });
    expect(command.stderr).toBe(''); expect(command.status).toBe(0);
    expect(JSON.parse(command.stdout).width).toBe(128);
  });
});
