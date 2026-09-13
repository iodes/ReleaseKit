import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture, cleanup } from './helpers.js';
import { updateProject, formatUpdate } from '../src/install.js';
import { exists, writeYaml } from '../src/files.js';
import { startProject, prepare } from '../src/project.js';

afterEach(cleanup);

describe('skill updates preserve configuration', () => {
  it.each(['\n', '\r\n'])('refreshes skills with legacy history.limit without changing settings or content (%j)', async eol => {
    const p = await fixture('light');
    await startProject(p, { at: 'HEAD', past: 'skip' });
    await prepare(p, '1', { fromRoot: true });
    const releaseFile = await p.releaseFile('1', 'release.yaml');
    const releaseBefore = await fs.readFile(releaseFile, 'utf8');
    const expected = await p.config();
    expected.tools = ['codex'];
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
    expect(result).not.toHaveProperty('migrations');
    expect(result).not.toHaveProperty('backup');
    expect(result.product).toBe(expected.product);
    expect(await exists(await p.content('config.yaml.before-update'))).toBe(false);
    expect(await fs.readFile(file, 'utf8')).toBe(original);
    await expect(p.config()).rejects.toThrow('Remove history.limit');
    expect(await fs.readFile(releaseFile, 'utf8')).toBe(releaseBefore);
    expect(result.tools).toEqual(['codex']);
    expect(await exists(path.join(p.root, '.agents/skills/releasekit-draft/SKILL.md'))).toBe(true);
    expect(await exists(path.join(p.root, '.claude'))).toBe(false);
    const second = await updateProject(p);
    expect(second.written).toEqual([]);
    expect(formatUpdate(second)).not.toMatch(/Removed history|Configuration:|Original configuration:/);
    expect(await fs.readFile(file, 'utf8')).toBe(original);
    expect(await exists(await p.content('config.yaml.before-update'))).toBe(false);
  });

  it('refreshes skills while leaving invalid release settings intact', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...await p.config(), tools: ['codex'], locales: ['ko-KR'] });
    const before = await fs.readFile(file, 'utf8');
    expect((await updateProject(p)).written.length).toBeGreaterThan(0);
    await expect(p.config()).rejects.toThrow('include the source locale');
    expect(await fs.readFile(file, 'utf8')).toBe(before);
    expect(await exists(await p.content('config.yaml.before-update'))).toBe(false);
    expect(await exists(path.join(p.root, '.agents/skills/releasekit-draft/SKILL.md'))).toBe(true);
  });

  it('never overwrites an existing different backup', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...await p.config(), history: { limit: 3 } });
    const original = await fs.readFile(file, 'utf8');
    const backup = await p.content('config.yaml.before-update');
    await fs.writeFile(backup, 'Earlier backup');
    expect((await updateProject(p)).conflicts).toEqual([]);
    expect(await fs.readFile(backup, 'utf8')).toBe('Earlier backup');
    expect(await fs.readFile(file, 'utf8')).toBe(original);
  });

  it.each([
    { tools: ['claude'], root: '.claude', absent: '.agents' },
    { tools: ['cursor'], root: '.agents', absent: '.claude' },
  ])('updates only the configured $tools skills', async ({ tools, root, absent }) => {
    const p = await fixture();
    await writeYaml(await p.content('config.yaml'), { ...await p.config(), tools });
    const result = await updateProject(p);
    expect(result.tools).toEqual(tools);
    expect(result.written.length).toBeGreaterThan(0);
    expect(result.written.every(file => file.startsWith(root + '/skills/'))).toBe(true);
    expect(await exists(path.join(p.root, root, 'skills/releasekit-draft/SKILL.md'))).toBe(true);
    expect(await exists(path.join(p.root, absent))).toBe(false);
  });

  it.each([undefined, null, 'codex', ['unknown']])('rejects an invalid tool selection before installing skills (%j)', async tools => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...await p.config(), tools });
    const before = await fs.readFile(file, 'utf8');
    const marker = await p.content('managed-skills.json');
    const managedBefore = await fs.readFile(marker, 'utf8');
    await expect(updateProject(p)).rejects.toThrow();
    expect(await fs.readFile(file, 'utf8')).toBe(before);
    expect(await fs.readFile(marker, 'utf8')).toBe(managedBefore);
    expect(await exists(path.join(p.root, '.agents'))).toBe(false);
    expect(await exists(path.join(p.root, '.claude'))).toBe(false);
  });

  it.each(['product: [invalid]\n', 'product: [\n'])('rejects an unreadable product label before installing skills (%j)', async config => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await fs.writeFile(file, config);
    await expect(updateProject(p)).rejects.toThrow();
    expect(await fs.readFile(file, 'utf8')).toBe(config);
    expect(await exists(path.join(p.root, '.agents'))).toBe(false);
    expect(await exists(await p.content('config.yaml.before-update'))).toBe(false);
  });
});
