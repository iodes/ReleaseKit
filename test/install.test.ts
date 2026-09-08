import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installSkills } from '../src/install.js';
import { exists, parseYaml, writeYaml } from '../src/files.js';
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
