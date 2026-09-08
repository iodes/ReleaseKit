import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Project } from './project.js';
import { configSchema, defaultConfig, type ProjectConfig } from './model.js';
import { exists, within, write, writeYaml, digest } from './files.js';

const resources = fileURLToPath(new URL('../kit/', import.meta.url));
const names = ['releasekit-draft', 'releasekit-image', 'releasekit-finalize'];
const managedSchema = z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/));

export async function installSkills(project: Project) {
  const config = await project.config();
  const marker = await project.content('managed-skills.json');
  const managed = await exists(marker) ? managedSchema.parse(JSON.parse(await fs.readFile(marker, 'utf8'))) : {};
  const roots = new Set(config.tools.map(tool => tool === 'claude' ? '.claude/skills' : '.agents/skills'));
  const references = (await fs.readdir(path.join(resources, 'references'))).filter(file => file.endsWith('.md')).sort();
  const written: string[] = [], conflicts: string[] = [];
  for (const root of roots) {
    for (const name of names) {
      const sourceFiles = [
        { source: path.join(resources, 'skills', name, 'SKILL.md'), destination: `${root}/${name}/SKILL.md` },
        ...references.map(file => ({ source: path.join(resources, 'references', file), destination: `${root}/${name}/references/${file}` })),
      ];
      for (const item of sourceFiles) {
        const content = await fs.readFile(item.source);
        const expected = digest(content);
        const destination = await within(project.root, item.destination);
        if (await exists(destination)) {
          const actual = digest(await fs.readFile(destination));
          if (actual === expected) { managed[item.destination] = expected; continue; }
          if (actual !== managed[item.destination]) { conflicts.push(item.destination); continue; }
        }
        await write(destination, content);
        managed[item.destination] = expected;
        written.push(item.destination);
      }
    }
  }
  await write(marker, JSON.stringify(managed, null, 2) + '\n');
  return { tools: config.tools, written, conflicts, hints: {
    codex: 'Use $releasekit-draft, $releasekit-image, or $releasekit-finalize.',
    claude: 'Use /releasekit-draft, /releasekit-image, or /releasekit-finalize.',
    cursor: 'Use the installed releasekit-* skills from the agent skill picker or name them in your request.',
  } };
}

export async function initProject(project: Project, options: { product?: string; tools?: ProjectConfig['tools']; themes?: ProjectConfig['visuals']['themes'] }) {
  const file = await project.content('config.yaml');
  if (await exists(file)) throw new Error('ReleaseKit is already initialized. Edit config.yaml for project settings or run update for skills.');
  const config = defaultConfig(options.product ?? path.basename(project.root));
  if (options.tools) config.tools = [...new Set(options.tools)];
  if (options.themes) config.visuals.themes = options.themes;
  await writeYaml(file, configSchema.parse(config));
  return { config: file, ...await installSkills(project) };
}
