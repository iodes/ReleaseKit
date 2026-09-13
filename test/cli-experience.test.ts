import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture, cleanup } from './helpers.js';
import { projectStatus } from '../src/status.js';
import { prepare } from '../src/project.js';
import { finalize } from '../src/validate.js';
import { writeYaml } from '../src/files.js';

afterEach(cleanup);

function cli(root: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', root, ...args], {
    encoding: 'utf8', timeout: 20_000, windowsHide: true,
  });
}

describe('guided CLI', () => {
  it('supports the original init command with default product and languages', async () => {
    const p = await fixture();
    await fs.unlink(await p.content('config.yaml'));
    const result = cli(p.root, 'init', '--tools', 'codex,claude,cursor', '--themes', 'both');
    expect(result.status, result.stderr).toBe(0);
    expect(await p.config()).toMatchObject({ product: path.basename(p.root), tools: ['codex', 'claude', 'cursor'], sourceLocale: 'en-US', locales: ['en-US'], visuals: { themes: 'both' } });
  });

  it('initializes a directory without prompts and persists language defaults', async () => {
    const p = await fixture();
    await fs.unlink(await p.content('config.yaml'));
    const result = cli(p.root, '--json', 'init', '.', '--no-interactive', '--tools', 'none', '--source-locale', 'ko-KR', '--locales', 'ko-KR,en-US');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).tools).toEqual([]);
    expect(await p.config()).toMatchObject({ sourceLocale: 'ko-KR', locales: ['ko-KR', 'en-US'], visuals: { themes: 'both' } });
    const draft = await prepare(p, '1', { fromRoot: true });
    expect(draft.locales).toEqual(['ko-KR', 'en-US']);
    const before = await fs.readFile(await p.content('config.yaml'), 'utf8');
    const again = cli(p.root, 'init', '--product', 'Replacement');
    expect(again.status).toBe(1);
    expect(await fs.readFile(await p.content('config.yaml'), 'utf8')).toBe(before);
  });

  it('rejects inconsistent language options before writing configuration', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await fs.unlink(file);
    const result = cli(p.root, 'init', '--json', '--source-locale', 'ko-KR', '--locales', 'en-US');
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).error).toContain('include the source locale');
    expect(result.stdout).toBe('');
    await expect(fs.access(file)).rejects.toThrow();
  });

  it('shows setup guidance before initialization and progress through draft and ready', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    const saved = await fs.readFile(file);
    await fs.unlink(file);
    expect(await projectStatus(p)).toMatchObject({ initialized: false, next: ['releasekit init'] });
    await fs.writeFile(file, saved);
    expect((await projectStatus(p)).releases).toEqual([]);
    const draft = await prepare(p, '1', { fromRoot: true });
    expect((await projectStatus(p)).releases[0]).toMatchObject({ status: 'draft', valid: false });
    draft.emptyReason = 'No user-visible changes.';
    await p.save(draft);
    expect((await projectStatus(p)).releases[0]).toMatchObject({ valid: true, next: 'releasekit finalize 1' });
    await finalize(p, '1');
    expect((await projectStatus(p)).releases[0]).toMatchObject({ status: 'ready', valid: true, next: 'releasekit export --current 1 --out <new-directory>' });
    const result = cli(p.root, 'status', '1');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('releasekit export');
    expect(result.stdout).not.toContain('"releases"');
    const json = cli(p.root, 'status', '1', '--json');
    expect(json.status, json.stderr).toBe(0);
    expect(JSON.parse(json.stdout).releases[0].valid).toBe(true);
  });

  it('lists and filters channel identities without conflating equal version names', async () => {
    const p = await fixture();
    const config = await p.config();
    config.channels = { stable: { include: ['stable'] } };
    await writeYaml(await p.content('config.yaml'), config);
    await prepare(p, '1', { fromRoot: true });
    await prepare(p, '1', { fromRoot: true, channel: 'stable' });
    const all = cli(p.root, '--json', 'list');
    expect(all.status, all.stderr).toBe(0);
    expect(JSON.parse(all.stdout)).toHaveLength(2);
    const filtered = cli(p.root, 'list', '--channel', 'stable', '--json');
    expect(JSON.parse(filtered.stdout)).toEqual([expect.objectContaining({ version: '1', channel: 'stable' })]);
    const status = cli(p.root, '--json', 'status', '--channel', 'stable');
    expect(JSON.parse(status.stdout).releases).toEqual([expect.objectContaining({ version: '1', channel: 'stable', valid: false })]);
    const unknown = cli(p.root, '--json', 'list', '--channel', 'missing');
    expect(unknown.status).toBe(1);
    expect(JSON.parse(unknown.stderr).error).toContain('Unknown channel');
  });

  it('returns clean JSON for parser errors and successful help', async () => {
    const p = await fixture();
    for (const args of [['--json', 'unknown'], ['prepare', '--json'], ['init', '--themes', 'invalid', '--json']]) {
      const result = cli(p.root, ...args);
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stderr).error).toBeTruthy();
      expect(result.stdout).toBe('');
    }
    const help = cli(p.root, '--help');
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('status');
    expect(help.stderr).toBe('');
  });

  it('updates every supported tool without prompts and preserves project settings', async () => {
    const p = await fixture('light');
    const configBytes = await fs.readFile(await p.content('config.yaml'), 'utf8');
    const first = cli(p.root, 'update', '--json');
    expect(first.status, first.stderr).toBe(0);
    const installed = JSON.parse(first.stdout);
    expect(installed.tools).toEqual(['codex', 'claude', 'cursor']);
    expect(installed.written.length).toBeGreaterThan(0);
    for (const directory of ['.agents/skills', '.claude/skills']) {
      await expect(fs.access(path.join(p.root, directory, 'releasekit-draft/SKILL.md'))).resolves.toBeUndefined();
    }
    expect(await fs.readFile(await p.content('config.yaml'), 'utf8')).toBe(configBytes);
    const second = cli(p.root, 'update', '--json');
    expect(second.status, second.stderr).toBe(0);
    const result = JSON.parse(second.stdout);
    expect(result.written).toEqual([]);
    expect(result.unchanged).toEqual(installed.written);
    const human = cli(p.root, 'update');
    expect(human.status).toBe(0);
    expect(human.stdout).toContain('Example Workspace');
    expect(human.stdout).toContain('Already current:');
    expect(human.stdout).toContain('$releasekit-draft');
    expect(human.stdout).toContain('/releasekit-draft');
    expect(await fs.readFile(await p.content('config.yaml'), 'utf8')).toBe(configBytes);
  });

  it('preserves modified skills during update and reports conflicts', async () => {
    const p = await fixture();
    const config = await p.config();
    config.tools = ['codex'];
    await writeYaml(await p.content('config.yaml'), config);
    expect(cli(p.root, 'update').status).toBe(0);
    const skill = path.join(p.root, '.agents/skills/releasekit-draft/SKILL.md');
    await fs.appendFile(skill, '\nCustom instruction.\n');
    const before = await fs.readFile(skill, 'utf8');
    const result = cli(p.root, 'update', '--json');
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).conflicts).toContain('.agents/skills/releasekit-draft/SKILL.md');
    expect(await fs.readFile(skill, 'utf8')).toBe(before);
  });
});
