import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepare } from '../src/project.js';
import { git } from '../src/git.js';
import { validate, finalize } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { cleanup, commit, fixture, fillNote, release } from './helpers.js';

afterEach(cleanup);

describe('compact release evidence', () => {
  it('prepares and finalizes large ranges without storing patches or file indexes', async () => {
    const p = await fixture();
    const largeFile = path.join(p.root, 'dependencies.lock');
    // Exceeds the Git subprocess output limit if prepare still collects a full diff.
    const largeSize = 65 * 1024 * 1024;
    await fs.writeFile(largeFile, Buffer.alloc(largeSize, 'x'));
    git(p.root, ['add', '--', 'dependencies.lock']);
    await commit(p.root, 'initial\nmaintenance\n', 'Internal maintenance');

    for (const [version, options] of [
      ['range', { from: 'v0' }],
      ['root', { fromRoot: true }],
    ] as const) {
      const current = await prepare(p, version, options);
      expect(current.source.toSha).toBe(git(p.root, ['rev-parse', 'HEAD']).trim());
      expect(await fs.readdir(await p.releaseDir(version))).toEqual(['release.yaml']);
      const bytes = (await fs.stat(await p.releaseFile(version, 'release.yaml'))).size;
      expect(bytes).toBeLessThan(16 * 1024);
      current.emptyReason = 'Internal maintenance only.';
      await p.save(current);
      expect((await finalize(p, version)).valid).toBe(true);
      expect(await fs.readdir(await p.releaseDir(version))).toEqual(['release.yaml']);
    }
    expect((await fs.stat(largeFile)).size).toBe(largeSize);
  });

  it('finalizes without evidence files and verifies ready content without Git history', async () => {
    const p = await fixture();
    await commit(p.root, 'initial\nqueue\n', 'Add queue');
    await release(p, '1', 'v0');
    expect(await fs.readdir(await p.releaseDir('1'))).toEqual(['notes', 'release.yaml']);
    await finalize(p, '1');
    const gitDirectory = path.resolve(p.root, '.git');
    const unavailableDirectory = path.resolve(p.root, 'unavailable-git');
    expect(path.dirname(gitDirectory)).toBe(p.root);
    expect(path.dirname(unavailableDirectory)).toBe(p.root);
    await fs.rename(gitDirectory, unavailableDirectory);
    expect((await validate(p, '1')).valid).toBe(true);
    expect((await exportBundle(p, '1', { out: path.join(p.root, 'output') })).releases).toBe(1);

    const edited = await p.release('1');
    edited.notes[0]!.paths = ['not-in-range.txt'];
    await p.save(edited);
    expect((await validate(p, '1')).errors.join()).toContain('content changed');
  });

  it('validates note references against the pinned range even after tags move', async () => {
    const p = await fixture();
    const first = await commit(p.root, 'initial\nqueue\n', 'Add queue', 'v1');
    await prepare(p, '1', { from: 'v0', to: 'v1' });
    await fillNote(p, '1', false);
    await fs.writeFile(path.join(p.root, 'later.txt'), 'Later feature\n');
    git(p.root, ['add', '--', 'later.txt']);
    const later = await commit(p.root, 'initial\nqueue\nfuture\n', 'Later feature', 'v2');
    git(p.root, ['tag', '-f', 'v1', 'v2']);

    const draft = await p.release('1');
    draft.notes[0]!.commits = [later];
    await p.save(draft);
    expect((await validate(p, '1')).errors.join()).toContain('outside the prepared Git range');
    draft.notes[0]!.commits = [first];
    draft.notes[0]!.paths = ['later.txt'];
    await p.save(draft);
    expect((await validate(p, '1')).errors.join()).toContain('outside the prepared Git range');
    draft.notes[0]!.paths = ['app.txt'];
    await p.save(draft);
    expect((await finalize(p, '1')).valid).toBe(true);
  });
});
