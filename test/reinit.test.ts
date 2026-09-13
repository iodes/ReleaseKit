import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initProject } from '../src/install.js';
import { parseYaml, writeYaml } from '../src/files.js';
import { prepare } from '../src/project.js';
import { cleanup, fixture } from './helpers.js';

afterEach(cleanup);

describe('existing project setup', () => {
  it.each(['\n', '\r\n'])('changes only tool settings while retaining comments, releases, and newlines (%j)', async eol => {
    const p = await fixture('light');
    const file = await p.content('config.yaml');
    const config = await p.config();
    config.sourceLocale = 'ko-KR';
    config.locales = ['ko-KR', 'en-US'];
    config.visuals.accent = '#123456';
    await writeYaml(file, config);
    await prepare(p, '1', { fromRoot: true });
    const releaseFile = await p.releaseFile('1', 'release.yaml');
    const releaseBefore = await fs.readFile(releaseFile);
    // Obsolete or unknown content settings should not prevent tool setup.
    await writeYaml(file, { ...config, history: { limit: 3 }, custom: { keep: true } });
    const original = ('# Keep project guidance\n' + await fs.readFile(file, 'utf8'))
      .replace('tools: []', 'tools: [] # Selected agents').replace(/\r?\n/g, eol);
    await fs.writeFile(file, original);
    const result = await initProject(p, { tools: ['codex', 'claude', 'codex'] });
    expect(result).toMatchObject({ reconfigured: true, tools: ['codex', 'claude'], conflicts: [] });
    expect(result.written.length).toBeGreaterThan(0);
    const after = await fs.readFile(file, 'utf8');
    expect(parseYaml(after)).toEqual({ ...parseYaml(original) as object, tools: ['codex', 'claude'] });
    expect(after).toContain('# Keep project guidance');
    expect(after).toContain('# Selected agents');
    expect(eol === '\r\n' ? /(?<!\r)\n/.test(after) : after.includes('\r')).toBe(false);
    expect(await fs.readFile(releaseFile)).toEqual(releaseBefore);
    const repeated = await initProject(p, {});
    expect(repeated).toMatchObject({ tools: ['codex', 'claude'], written: [], conflicts: [] });
    expect(await fs.readFile(file, 'utf8')).toBe(after);
  });

  it('preserves modified installed skills when adding a tool', async () => {
    const p = await fixture();
    await initProject(p, { tools: ['codex'] });
    const relative = '.agents/skills/releasekit-draft/SKILL.md';
    const file = path.join(p.root, relative);
    await fs.appendFile(file, '\nCustom project guidance.\n');
    const before = await fs.readFile(file);
    const result = await initProject(p, { tools: ['codex', 'claude'] });
    expect(result.conflicts).toEqual([relative]);
    expect(result.written.every(file => file.startsWith('.claude/skills/'))).toBe(true);
    expect(result.written.length).toBeGreaterThan(0);
    expect(await fs.readFile(file)).toEqual(before);
    expect((await p.config()).tools).toEqual(['codex', 'claude']);
  });

  it.each([
    { product: 'Replacement' }, { themes: 'both' as const }, { sourceLocale: 'ko-KR' }, { locales: ['ko-KR'] },
  ])('rejects first-use settings before changing an existing project (%j)', async options => {
    const p = await fixture('light');
    const file = await p.content('config.yaml');
    const before = await fs.readFile(file);
    const marker = await p.content('managed-skills.json');
    const managedBefore = await fs.readFile(marker);
    await expect(initProject(p, { ...options, tools: ['claude'] })).rejects.toThrow('edit releasekit/config.yaml');
    expect(await fs.readFile(file)).toEqual(before);
    expect(await fs.readFile(marker)).toEqual(managedBefore);
  });
});
