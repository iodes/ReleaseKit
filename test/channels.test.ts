import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Project, prepare, startProject } from '../src/project.js';
import { configSchema, releasedAtSchema, type ReleaseRef } from '../src/model.js';
import { refKey } from '../src/refs.js';
import { finalize, validate, contentHash } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { moveReleases } from '../src/move.js';
import { readVisual, addNote, removeNote } from '../src/content.js';
import { sceneHash } from '../src/prompts.js';
import { planImages } from '../src/images.js';
import * as files from '../src/files.js';
import { fixture, cleanup, commit, fillNote } from './helpers.js';

afterEach(async () => { vi.restoreAllMocks(); await cleanup(); });
const defaults = { prod: { include: ['prod'] }, dev: { include: ['dev', 'prod'] }, stage: { include: ['prod'] } };
async function configured() {
  const p = await fixture();
  const config = await p.config();
  config.channels = structuredClone(defaults);
  await files.writeYaml(await p.content('config.yaml'), config);
  return p;
}
async function create(p: Project, identity: ReleaseRef, ready = true, image = false, date = '2026-09-14') {
  await commit(p.root, `Change ${refKey(identity)}\n`, `Change ${refKey(identity)}`);
  const legacyPrevious = identity.channel === undefined && (await p.versions()).length ? await p.latestVersion() : undefined;
  await prepare(p, identity.version, { channel: identity.channel, ...(legacyPrevious ? { previous: legacyPrevious } : { from: 'v0' }), date });
  if (ready || image) await fillNote(p, identity, image);
  if (ready) await finalize(p, identity);
  return p.release(identity);
}
async function bundle(p: Project, channel: string, folder: string, limit?: number) {
  const result = await exportBundle(p, undefined, { channel, limit, out: path.join(p.root, folder) });
  return JSON.parse(await fs.readFile(result.files[0]!, 'utf8'));
}
async function snapshot(p: Project) {
  const directory = await p.content('.');
  const contents: Record<string, string> = {};
  for (const entry of await fs.readdir(directory, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) contents[path.relative(directory, path.join(entry.parentPath, entry.name))] = files.digest(await fs.readFile(path.join(entry.parentPath, entry.name)));
  }
  return contents;
}
function cli(p: Project, args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', p.root, '--json', ...args], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
  });
}

describe('channel configuration and timestamps', () => {
  it('keeps first-use undecided, persists disabled or custom channels, and rejects invalid combinations', async () => {
    const p = await fixture();
    const config = await p.config();
    expect(config).not.toHaveProperty('channels');
    expect(config).not.toHaveProperty('history');
    config.channels = false;
    await files.writeYaml(await p.content('config.yaml'), config);
    expect((await p.config()).channels).toBe(false);
    expect(configSchema.safeParse({ ...config, channels: defaults }).success).toBe(true);
    for (const channels of [{}, { dev: { include: [] } }, { dev: { include: ['prod'] } }, { dev: { include: ['dev', 'dev'] } }]) {
      expect(configSchema.safeParse({ ...config, channels }).success).toBe(false);
    }
    await files.writeYaml(await p.content('config.yaml'), { ...config, history: { limit: 3 } });
    await expect(p.config()).rejects.toThrow(/Remove history.limit.*--limit/);
  });

  it('accepts real dates and timezone timestamps without changing their strings', async () => {
    for (const date of ['2024-02-29', '2026-09-14T09:30:00Z', '2026-09-14T18:30:00.123+09:00']) expect(releasedAtSchema.parse(date)).toBe(date);
    for (const date of ['2026-02-29', '2026-09-14T18:30:00', '2026-09-14T18:30Z', '2026-09-14T18:30:00.1234Z']) expect(releasedAtSchema.safeParse(date).success).toBe(false);
    const p = await configured();
    const before = Date.now();
    const release = await prepare(p, '1', { channel: 'dev', fromRoot: true });
    expect(release.releasedAt).toMatch(/\.\d{3}Z$/);
    expect(Date.parse(release.releasedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(release.releasedAt)).toBeLessThanOrEqual(Date.now());
  });

  it('keeps display ancestry independent from same-channel Git comparison and baseline setup', async () => {
    const p = await configured();
    const prod = await create(p, { channel: 'prod', version: '1' });
    await create(p, { channel: 'dev', version: '1' }, false);
    await commit(p.root, 'Production update\n', 'Production update');
    const next = await prepare(p, '2', { channel: 'prod' });
    expect(next.previous).toEqual({ channel: 'dev', version: '1' });
    expect(next.source.fromSha).toBe(prod.source.toSha);
    await fillNote(p, next, false);
    await finalize(p, next);
    expect((await p.release(next)).releasedAt).toBe(next.releasedAt);
    await startProject(p, { channel: 'stage', at: 'HEAD', past: 'summary', version: 'intro' });
    const baseline = await prepare(p, 'intro', { channel: 'stage' });
    expect(baseline.previous).toEqual({ channel: 'prod', version: '2' });
    expect(baseline.source.fromSha).toBeNull();
    await fillNote(p, baseline, false);
    expect((await finalize(p, baseline)).valid).toBe(true);
  });
});

describe('filtered global history', () => {
  it('traverses across hidden channels and drafts, keeps duplicate versions, and filters before limiting', async () => {
    const p = await configured();
    await create(p, { version: 'single' });
    await create(p, { channel: 'prod', version: '1' }, true, true, '2026-09-14');
    await create(p, { channel: 'dev', version: '1' }, true, true, '2026-09-13');
    await create(p, { channel: 'prod', version: '2' }, true, false, '2026-09-12');
    await create(p, { channel: 'dev', version: 'unfinished' }, false);
    const before = await snapshot(p);
    const result = await bundle(p, 'dev', 'dev-out');
    expect(result.releases.map(refKey)).toEqual(['prod/2', 'dev/1', 'prod/1']);
    expect(result.currentChannel).toBe('prod');
    expect(result.releases.map((r: { previous: unknown }) => r.previous)).toEqual([{ channel: 'dev', version: '1' }, { channel: 'prod', version: '1' }, null]);
    const limited = await bundle(p, 'stage', 'stage-out', 1);
    expect(limited.releases.map(refKey)).toEqual(['prod/2']);
    expect(limited.releases[0].previous).toBeNull();
    expect(await files.exists(path.join(p.root, 'stage-out/assets'))).toBe(false);
    expect(await files.exists(path.join(p.root, 'dev-out/assets/dev/1'))).toBe(true);
    expect(await files.exists(path.join(p.root, 'dev-out/assets/prod/1'))).toBe(true);
    expect(await snapshot(p)).toEqual(before);
    const config = await p.config();
    if (!config.channels) throw new Error('Missing channels');
    config.channels.stage!.include = ['dev'];
    await files.writeYaml(await p.content('config.yaml'), config);
    expect((await bundle(p, 'stage', 'changed-out')).releases.map(refKey)).toEqual(['dev/1']);
    const single = await exportBundle(p, undefined, { out: path.join(p.root, 'single-out') });
    const plain = JSON.parse(await fs.readFile(single.files[0]!, 'utf8'));
    expect(plain).not.toHaveProperty('viewChannel');
    expect(plain.releases.map(refKey)).toEqual(['single']);
  });

  it('rejects branches, disconnected roots, cycles, missing references and nonlatest explicit predecessors', async () => {
    const p = await configured();
    const first = await create(p, { channel: 'prod', version: '1' });
    const second = await create(p, { channel: 'dev', version: '2' });
    await expect(prepare(p, '3', { channel: 'prod', previous: 'prod/1', fromRoot: true })).rejects.toThrow('latest');
    const third = await create(p, { channel: 'dev', version: '3' }, false);
    for (const previous of [first, undefined, third, { channel: 'prod', version: 'missing' }]) {
      await p.save({ ...third, previous: previous ? { channel: previous.channel!, version: previous.version } : null });
      await expect(bundle(p, 'prod', 'invalid', 1)).rejects.toThrow();
      expect(await files.exists(path.join(p.root, 'invalid'))).toBe(false);
    }
    await p.save({ ...third, previous: { channel: second.channel!, version: second.version } });
    expect((await p.channelHistory()).map(refKey)).toEqual(['dev/3', 'dev/2', 'prod/1']);
  });

  it('exports more than 100 releases by default and accepts a limit above 100', async () => {
    const p = await configured();
    const base = await prepare(p, '0', { channel: 'prod', fromRoot: true });
    let previous = null;
    for (let index = 0; index < 105; index++) {
      const release = { ...base, version: String(index), previous, status: 'ready' as const, emptyReason: 'No user-visible changes.', contentHash: null as string | null };
      release.contentHash = await contentHash(p, release);
      await p.save(release);
      previous = { channel: 'prod', version: String(index) };
    }
    expect((await bundle(p, 'prod', 'all')).releases).toHaveLength(105);
    expect((await bundle(p, 'prod', 'limited', 101)).releases).toHaveLength(101);
  }, 60_000);

  it('threads channel identity through the editing and exporting CLI', async () => {
    const p = await configured();
    await create(p, { channel: 'prod', version: '1' }, false);
    const added = cli(p, ['note', 'add', '1', 'text', '--channel', 'prod', '--no-image']);
    expect(added.status, added.stderr).toBe(0);
    expect(JSON.parse(added.stdout)).toMatchObject({ version: '1', channel: 'prod' });
    const removed = cli(p, ['note', 'remove', '1', 'text', '--channel', 'prod']);
    expect(removed.status, removed.stderr).toBe(0);
    await fillNote(p, { channel: 'prod', version: '1' }, false);
    const finalized = cli(p, ['finalize', '1', '--channel', 'prod']);
    expect(finalized.status, finalized.stderr).toBe(0);
    const exported = cli(p, ['export', '--channel', 'stage', '--out', './cli-output']);
    expect(exported.status, exported.stderr).toBe(0);
    expect(JSON.parse(exported.stdout).releases).toBe(1);
  });
});

describe('whole-release moves', () => {
  it('previews without changes, moves multiple releases in place and preserves ready/draft content', async () => {
    const p = await configured();
    const first = await create(p, { channel: 'dev', version: '1' }, true, true);
    await create(p, { channel: 'prod', version: 'other' });
    const draft = await create(p, { channel: 'dev', version: '2' }, false);
    const before = await snapshot(p);
    await moveReleases(p, ['1', '2'], { fromChannel: 'dev', toChannel: 'stage', dryRun: true });
    expect(await snapshot(p)).toEqual(before);
    const result = await moveReleases(p, ['2', '1'], { fromChannel: 'dev', toChannel: 'stage' });
    expect(result.moved).toHaveLength(2);
    expect((await p.channelHistory()).map(refKey)).toEqual(['stage/2', 'prod/other', 'stage/1']);
    const moved = await p.release({ channel: 'stage', version: '1' });
    expect(moved).toMatchObject({ status: 'ready', releasedAt: first.releasedAt, source: first.source });
    expect((await validate(p, moved)).valid).toBe(true);
    expect((await p.release({ channel: 'stage', version: '2' })).status).toBe(draft.status);
    expect((await planImages(p, moved)).pendingAssets).toBe(0);
    const after = await snapshot(p);
    for (const [file, hash] of Object.entries(before)) {
      if (file.includes(`${path.sep}notes${path.sep}`) || file.includes(`${path.sep}assets${path.sep}`)) expect(after[file.replace(`releases${path.sep}dev${path.sep}`, `releases${path.sep}stage${path.sep}`)]).toBe(hash);
    }
  });

  it('splices a middle release out of the single history and supports insertion and return', async () => {
    const p = await configured();
    await create(p, { version: '1' });
    await create(p, { version: '2' });
    await create(p, { version: '3' });
    await create(p, { channel: 'prod', version: 'head' });
    await moveReleases(p, ['2'], { toChannel: 'dev', atStart: true });
    expect((await p.history('3')).map(refKey)).toEqual(['3', '1']);
    expect((await p.channelHistory()).map(refKey)).toEqual(['prod/head', 'dev/2']);
    expect((await validate(p, '3')).valid).toBe(true);
    await moveReleases(p, ['2'], { fromChannel: 'dev', toUnchanneled: true, after: '1' });
    expect((await p.history('3')).map(refKey)).toEqual(['3', '2', '1']);
    expect((await p.channelHistory()).map(refKey)).toEqual(['prod/head']);
    expect((await validate(p, '2')).valid).toBe(true);
  });

  it('can finalize a draft moved to single history without changing its independent Git range', async () => {
    const p = await configured();
    await create(p, { version: 'single' });
    const draft = await create(p, { channel: 'dev', version: 'draft' }, false);
    await fillNote(p, draft, false);
    await moveReleases(p, ['draft'], { fromChannel: 'dev', toUnchanneled: true });
    const moved = await p.release('draft');
    expect(moved.previous).toBe('single');
    expect(moved.source).toEqual(draft.source);
    expect((await finalize(p, 'draft')).valid).toBe(true);
  });

  it('updates referenced visual paths and hashes without invalidating accepted images', async () => {
    const p = await configured();
    const first = await create(p, { channel: 'dev', version: '1' }, true, true);
    const second = await create(p, { channel: 'prod', version: '2' }, false, true);
    const visual = await readVisual(p, second, 'queue');
    visual.scene.references = ['releasekit/releases/dev/1/notes/queue/en-US.md'];
    for (const theme of ['dark', 'light'] as const) visual.variants[theme]!.sceneHash = sceneHash(visual.scene, second.visuals, theme);
    await files.writeYaml(await p.releaseFile(second, 'visuals/queue.yaml'), visual);
    await finalize(p, second);
    await moveReleases(p, ['1'], { fromChannel: 'dev', toChannel: 'stage' });
    expect((await readVisual(p, second, 'queue')).scene.references).toEqual(['releasekit/releases/stage/1/notes/queue/en-US.md']);
    expect((await validate(p, second)).valid).toBe(true);
    expect((await validate(p, { ...first, channel: 'stage' })).valid).toBe(true);
  });

  it('preserves stale images and unfinished scene briefs when moving drafts', async () => {
    const p = await configured();
    const draft = await create(p, { channel: 'dev', version: '1' }, false, true);
    const visual = await readVisual(p, draft, 'queue');
    visual.scene.references = ['releasekit/releases/dev/1/notes/queue/en-US.md'];
    await files.writeYaml(await p.releaseFile(draft, 'visuals/queue.yaml'), visual);
    await addNote(p, draft, 'pending', 'feature', true);
    await moveReleases(p, ['1'], { fromChannel: 'dev', toChannel: 'stage' });
    const moved = { channel: 'stage', version: '1' };
    expect((await readVisual(p, moved, 'queue')).variants.dark!.sceneHash).toBe(visual.variants.dark!.sceneHash);
    expect((await validate(p, moved)).valid).toBe(false);
    expect(await files.exists(await p.releaseFile(moved, 'visuals/pending.yaml'))).toBe(true);
  });

  it('rejects conflicts and tampered ready content without partial moves', async () => {
    const p = await configured();
    const first = await create(p, { channel: 'dev', version: '1' });
    await create(p, { channel: 'prod', version: '1' });
    const before = await snapshot(p);
    await expect(moveReleases(p, ['1'], { fromChannel: 'dev', toChannel: 'prod' })).rejects.toThrow('Destination already exists');
    expect(await snapshot(p)).toEqual(before);
    const file = await p.releaseFile(first, 'notes/queue/en-US.md');
    await fs.appendFile(file, '\nUnreviewed edit.\n');
    const modified = await snapshot(p);
    await expect(moveReleases(p, ['1'], { fromChannel: 'dev', toChannel: 'stage' })).rejects.toThrow('Cannot move changed ready content');
    expect(await snapshot(p)).toEqual(modified);
  });

  it('rolls back directory and metadata changes after a write failure', async () => {
    const p = await configured();
    await create(p, { channel: 'dev', version: '1' });
    await create(p, { channel: 'prod', version: '2' });
    const before = await snapshot(p);
    const originalWrite = files.write;
    let count = 0;
    vi.spyOn(files, 'write').mockImplementation(async (...args) => {
      if (++count === 2) throw new Error('Injected write failure');
      return originalWrite(...args);
    });
    await expect(moveReleases(p, ['1'], { fromChannel: 'dev', toChannel: 'stage' })).rejects.toThrow('Injected write failure');
    expect(await snapshot(p)).toEqual(before);
    expect((await validate(p, { channel: 'dev', version: '1' })).valid).toBe(true);
  });

  it('keeps CRLF metadata and supports moving through the CLI', async () => {
    const p = await configured();
    const original = await create(p, { channel: 'dev', version: '1' });
    const file = await p.releaseFile(original, 'release.yaml');
    await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace(/\r?\n/g, '\r\n'));
    const before = await snapshot(p);
    const preview = cli(p, ['release', 'move', '1', '--from-channel', 'dev', '--to-channel', 'prod', '--dry-run']);
    expect(preview.status, preview.stderr).toBe(0);
    expect(await snapshot(p)).toEqual(before);
    const moved = cli(p, ['release', 'move', '1', '--from-channel', 'dev', '--to-channel', 'prod']);
    expect(moved.status, moved.stderr).toBe(0);
    const identity = { channel: 'prod', version: '1' };
    const contents = await fs.readFile(await p.releaseFile(identity, 'release.yaml'), 'utf8');
    expect(contents).toContain('\r\n');
    expect(contents.replaceAll('\r\n', '')).not.toContain('\n');
    expect((await validate(p, identity)).valid).toBe(true);
  });

  it('moves the saved baseline boundary and rejects an occupied target boundary', async () => {
    const p = await configured();
    await startProject(p, { at: 'HEAD', past: 'summary', version: 'intro' });
    const baseline = await prepare(p, 'intro', {});
    await fillNote(p, baseline, false);
    await finalize(p, baseline);
    await moveReleases(p, ['intro'], { toChannel: 'dev' });
    const config = await p.config();
    expect(config.history?.start).toBeUndefined();
    expect(config.channels && config.channels.dev!.history?.start).toMatchObject({ version: 'intro', past: 'summary' });
    expect((await validate(p, { channel: 'dev', version: 'intro' })).valid).toBe(true);
    await startProject(p, { channel: 'stage', at: 'HEAD', past: 'skip' });
    const before = await snapshot(p);
    await expect(moveReleases(p, ['intro'], { fromChannel: 'dev', toChannel: 'stage' })).rejects.toThrow('history start');
    expect(await snapshot(p)).toEqual(before);
  });
});
