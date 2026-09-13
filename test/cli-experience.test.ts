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
  it('reconfigures tools with init and uses the new selection for subsequent updates', async () => {
    const p = await fixture('light');
    const initial = await p.config();
    const first = cli(p.root, 'init', '--tools', 'codex,claude', '--json');
    expect(first.status, first.stderr).toBe(0);
    expect(JSON.parse(first.stdout)).toMatchObject({ reconfigured: true, tools: ['codex', 'claude'] });
    const claudeFile = path.join(p.root, '.claude/skills/releasekit-draft/SKILL.md');
    const claudeBefore = await fs.readFile(claudeFile);
    const next = cli(p.root, 'init', '.', '--tools', 'codex', '--json');
    expect(next.status, next.stderr).toBe(0);
    expect(JSON.parse(next.stdout).tools).toEqual(['codex']);
    expect(await p.config()).toEqual({ ...initial, tools: ['codex'] });
    expect(await fs.readFile(claudeFile)).toEqual(claudeBefore);
    const update = cli(p.root, 'update', '--json');
    expect(update.status, update.stderr).toBe(0);
    expect(JSON.parse(update.stdout).tools).toEqual(['codex']);
    const file = await p.content('config.yaml');
    const before = await fs.readFile(file);
    const again = cli(p.root, 'init', '--no-interactive', '--json');
    expect(again.status, again.stderr).toBe(0);
    expect(JSON.parse(again.stdout)).toMatchObject({ tools: ['codex'], written: [] });
    expect(await fs.readFile(file)).toEqual(before);
    const none = cli(p.root, 'init', '--tools', 'none', '--json');
    expect(none.status, none.stderr).toBe(0);
    expect(JSON.parse(none.stdout)).toMatchObject({ tools: [], written: [] });
    expect((await p.config()).tools).toEqual([]);
    expect(await fs.readFile(claudeFile)).toEqual(claudeBefore);
  });

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

  it('updates all tools when configured without prompts and preserves project settings', async () => {
    const p = await fixture('light');
    const config = await p.config();
    config.tools = ['codex', 'claude', 'cursor'];
    await writeYaml(await p.content('config.yaml'), config);
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

  it('keeps a Codex-only init selection in update files and output', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await fs.unlink(file);
    const init = cli(p.root, 'init', '--tools', 'codex', '--no-interactive');
    expect(init.status, init.stderr).toBe(0);
    const before = await fs.readFile(file, 'utf8');
    const skill = path.join(p.root, '.agents/skills/releasekit-draft/SKILL.md');
    await fs.unlink(skill);
    const update = cli(p.root, 'update', '--json');
    expect(update.status, update.stderr).toBe(0);
    expect(JSON.parse(update.stdout)).toMatchObject({
      tools: ['codex'], written: ['.agents/skills/releasekit-draft/SKILL.md'], conflicts: [],
    });
    await expect(fs.access(skill)).resolves.toBeUndefined();
    await expect(fs.access(path.join(p.root, '.claude'))).rejects.toThrow();
    await expect(fs.access(path.join(p.root, '.cursor'))).rejects.toThrow();
    const human = cli(p.root, 'update');
    expect(human.status, human.stderr).toBe(0);
    expect(human.stdout).toContain('Tools: codex\n');
    expect(human.stdout).toContain('$releasekit-draft');
    expect(human.stdout).not.toMatch(/claude|cursor/);
    expect(await fs.readFile(file, 'utf8')).toBe(before);
  });

  it('reports no selected tools without installing skills', async () => {
    const p = await fixture();
    const result = cli(p.root, 'update');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Tools: none');
    expect(result.stdout).not.toMatch(/codex|claude|cursor/);
    await expect(fs.access(path.join(p.root, '.agents'))).rejects.toThrow();
    await expect(fs.access(path.join(p.root, '.claude'))).rejects.toThrow();
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
    const human = cli(p.root, 'update');
    expect(human.status, human.stderr).toBe(1);
    expect(human.stdout).toContain('! Update needs attention');
    expect(human.stdout).toContain('.agents/skills/releasekit-draft/SKILL.md');
    expect(human.stdout).not.toContain('✓');
    expect(human.stdout).not.toContain('Next: releasekit status');
    expect(await fs.readFile(skill, 'utf8')).toBe(before);
  });

  it('shows actionable update failures on stderr and preserves JSON errors', async () => {
    const p = await fixture();
    await fs.unlink(await p.content('config.yaml'));
    const human = cli(p.root, 'update');
    expect(human.status).toBe(1);
    expect(human.stdout).toBe('');
    expect(human.stderr).toContain('✕ Update failed');
    expect(human.stderr).toContain(p.root);
    expect(human.stderr).toContain('releasekit init');
    const json = cli(p.root, 'update', '--json');
    expect(json.status).toBe(1);
    expect(json.stdout).toBe('');
    expect(JSON.parse(json.stderr).error).toContain('releasekit init');
    expect(json.stderr).not.toContain('✕');
  });

  it('supports terminal colors and NO_COLOR while keeping JSON undecorated', async () => {
    const p = await fixture();
    const file = await p.content('config.yaml');
    await writeYaml(file, { ...await p.config(), tools: ['codex'] });
    for (const mode of ['color', 'plain', 'json']) {
      const env = { ...process.env };
      delete env.NO_COLOR;
      delete env.NODE_DISABLE_COLORS;
      delete env.FORCE_COLOR;
      if (mode === 'plain') env.NO_COLOR = '1';
      else env.FORCE_COLOR = '1';
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', p.root, 'update',
        ...(mode === 'json' ? ['--json'] : [])], { encoding: 'utf8', timeout: 20_000, windowsHide: true, env });
      expect(result.status, result.stderr).toBe(0);
      if (mode === 'color') expect(result.stdout).toContain('\u001b[');
      else expect(result.stdout).not.toContain('\u001b[');
      if (mode === 'json') expect(JSON.parse(result.stdout).tools).toEqual(['codex']);
      else expect(result.stdout).toContain('✓');
    }
  });
});
