import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installSkills, updateProject } from '../src/install.js';
import { digest, exists, parseYaml, writeYaml } from '../src/files.js';
import { fixture, cleanup } from './helpers.js';

const roots = ['.agents/skills', '.claude/skills'];
const names = ['releasekit-draft', 'releasekit-finalize', 'releasekit-image'];

async function projectWithTools() {
  const p = await fixture();
  const config = await p.config();
  config.tools = ['codex', 'claude', 'cursor'];
  await writeYaml(await p.content('config.yaml'), config);
  return p;
}

afterEach(cleanup);

describe('three-stage skill installation', () => {
  it.each(['\n', '\r\n'])('treats newline-only changes as current without rewriting skills (%j)', async eol => {
    const p = await projectWithTools();
    const installed = await installSkills(p);
    const before = new Map<string, Buffer>();
    for (const file of installed.written) {
      const target = path.join(p.root, file);
      const content = (await fs.readFile(target, 'utf8')).replace(/\r?\n/g, eol);
      await fs.writeFile(target, content);
      before.set(file, Buffer.from(content));
    }
    const result = await updateProject(p);
    expect(result.conflicts).toEqual([]);
    expect(result.written).toEqual([]);
    expect(result.unchanged).toEqual(installed.written);
    for (const [file, content] of before) expect(await fs.readFile(path.join(p.root, file))).toEqual(content);
  });

  it.each([
    { savedEol: '\n', localEol: '\r\n' },
    { savedEol: '\r\n', localEol: '\n' },
    { savedEol: '\r\n', localEol: '\r\n' },
  ])('updates a legacy managed file and preserves local newlines ($savedEol to $localEol)', async ({ savedEol, localEol }) => {
    const p = await projectWithTools();
    await installSkills(p);
    const relative = '.agents/skills/releasekit-draft/references/channels.md';
    const target = path.join(p.root, relative);
    const expected = (await fs.readFile(target, 'utf8')).replace(/\r?\n/g, localEol);
    const old = '# Previous package template\n\nOriginal content.\n';
    await fs.writeFile(target, old.replaceAll('\n', localEol));
    const marker = await p.content('managed-skills.json');
    const managed = JSON.parse(await fs.readFile(marker, 'utf8'));
    managed[relative] = digest(old.replaceAll('\n', savedEol));
    await fs.writeFile(marker, JSON.stringify(managed));
    const result = await updateProject(p);
    expect(result.conflicts).toEqual([]);
    expect(result.written).toEqual([relative]);
    expect(await fs.readFile(target, 'utf8')).toBe(expected);
    expect((await updateProject(p)).written).toEqual([]);
  });

  it('preserves real edits even when newlines have also changed', async () => {
    const p = await projectWithTools();
    await installSkills(p);
    const relative = '.agents/skills/releasekit-draft/references/channels.md';
    const target = path.join(p.root, relative);
    const edited = (await fs.readFile(target, 'utf8')).replace(/\r?\n/g, '\r\n') + 'User instruction.\r\n';
    await fs.writeFile(target, edited);
    const result = await updateProject(p);
    expect(result.conflicts).toEqual([relative]);
    expect(result.written).toEqual([]);
    expect(await fs.readFile(target, 'utf8')).toBe(edited);
  });

  it('installs only draft, image, and finalize with usable local references for every tool', async () => {
    const p = await projectWithTools();
    const result = await installSkills(p);
    expect(result.conflicts).toEqual([]);
    expect(await exists(path.join(p.root, '.cursor/skills'))).toBe(false);
    for (const root of roots) {
      expect((await fs.readdir(path.join(p.root, root))).sort()).toEqual(names);
      for (const name of names) {
        const directory = path.join(p.root, root, name);
        const text = (await fs.readFile(path.join(directory, 'SKILL.md'), 'utf8')).replaceAll('\r\n', '\n');
        const frontmatter = parseYaml(text.match(/^---\n([\s\S]*?)\n---/)![1]!) as { name: string; description: string };
        expect(frontmatter.name).toBe(name);
        expect(frontmatter.description.trim().length).toBeGreaterThan(0);
        for (const match of text.matchAll(/\]\((references\/[^)#]+)(?:#[^)]*)?\)/g)) {
          expect(await exists(path.join(directory, match[1]!)), match[1]).toBe(true);
        }
      }
    }
    expect(result.hints.codex.match(/\$releasekit-[a-z]+/g)).toEqual(['$releasekit-draft', '$releasekit-image', '$releasekit-finalize']);
    expect(result.hints.claude.match(/\/releasekit-[a-z]+/g)).toEqual(['/releasekit-draft', '/releasekit-image', '/releasekit-finalize']);
  });
});
