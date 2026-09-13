import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture, cleanup } from './helpers.js';
import { updateProject } from '../src/install.js';
import { exists, writeYaml } from '../src/files.js';
import { startProject, prepare } from '../src/project.js';

afterEach(cleanup);

describe('update from legacy configuration', () => {
  it.each(['\n', '\r\n'])('migrates history.limit before CLI validation and preserves settings and content (%j)', async eol => {
    const p = await fixture('light');
    await startProject(p, { at: 'HEAD', past: 'skip' });
    await prepare(p, '1', { fromRoot: true });
    const releaseFile = await p.releaseFile('1', 'release.yaml');
    const releaseBefore = await fs.readFile(releaseFile, 'utf8');
    const expected = await p.config();
    expected.channels = false;
    expected.locales = ['en-US', 'ko-KR'];
    expected.visuals.accent = '#123456';
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...expected, history: { ...expected.history, limit: 3 } });
    const original = ('# Keep my project settings\n' + await fs.readFile(file, 'utf8')).replace(/\r?\n/g, eol);
    await fs.writeFile(file, original);

    const run = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', p.root, 'update', '--json'], {
      encoding: 'utf8', windowsHide: true, timeout: 20_000,
    });
    expect(run.status, run.stderr).toBe(0);
    const result = JSON.parse(run.stdout);
    expect(result.migrations).toHaveLength(1);
    expect(await fs.readFile(result.backup, 'utf8')).toBe(original);
    expect(await p.config()).toEqual(expected);
    const migrated = await fs.readFile(file, 'utf8');
    expect(migrated).toContain('# Keep my project settings');
    expect(migrated.includes('\r\n')).toBe(eol === '\r\n');
    expect(await fs.readFile(releaseFile, 'utf8')).toBe(releaseBefore);
    for (const root of ['.agents', '.claude']) {
      expect(await exists(path.join(p.root, root, 'skills/releasekit-draft/SKILL.md'))).toBe(true);
    }
    const second = await updateProject(p);
    expect(second.migrations).toEqual([]);
    expect(second.backup).toBeNull();
    expect(second.written).toEqual([]);
    expect(await fs.readFile(file, 'utf8')).toBe(migrated);
    expect(await fs.readFile(result.backup, 'utf8')).toBe(original);
  });

  it('leaves unrelated invalid settings intact without creating a backup or skills', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...await p.config(), history: { limit: 3 }, locales: ['ko-KR'] });
    const before = await fs.readFile(file, 'utf8');
    await expect(updateProject(p)).rejects.toThrow('include the source locale');
    expect(await fs.readFile(file, 'utf8')).toBe(before);
    expect(await exists(await p.content('config.yaml.before-update'))).toBe(false);
    expect(await exists(path.join(p.root, '.agents'))).toBe(false);
  });

  it('never overwrites an existing different backup', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...await p.config(), history: { limit: 3 } });
    const original = await fs.readFile(file, 'utf8');
    const backup = await p.content('config.yaml.before-update');
    await fs.writeFile(backup, 'Earlier backup');
    await expect(updateProject(p)).rejects.toThrow('different configuration backup');
    expect(await fs.readFile(backup, 'utf8')).toBe('Earlier backup');
    expect(await fs.readFile(file, 'utf8')).toBe(original);
  });
});
