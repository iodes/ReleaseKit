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

export async function installSkills(project: Project, tools?: ProjectConfig['tools']) {
  const config = await project.config();
  const selected = tools ?? config.tools;
  const marker = await project.content('managed-skills.json');
  const managed = await exists(marker) ? managedSchema.parse(JSON.parse(await fs.readFile(marker, 'utf8'))) : {};
  const roots = new Set(selected.map(tool => tool === 'claude' ? '.claude/skills' : '.agents/skills'));
  const references = (await fs.readdir(path.join(resources, 'references'))).filter(file => file.endsWith('.md')).sort();
  const written: string[] = [], conflicts: string[] = [], unchanged: string[] = [];
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
          if (actual === expected) { managed[item.destination] = expected; unchanged.push(item.destination); continue; }
          if (actual !== managed[item.destination]) { conflicts.push(item.destination); continue; }
        }
        await write(destination, content);
        managed[item.destination] = expected;
        written.push(item.destination);
      }
    }
  }
  await write(marker, JSON.stringify(managed, null, 2) + '\n');
  return { tools: selected, written, conflicts, unchanged, hints: {
    codex: 'Use $releasekit-draft, $releasekit-image, or $releasekit-finalize.',
    claude: 'Use /releasekit-draft, /releasekit-image, or /releasekit-finalize.',
    cursor: 'Use the installed releasekit-* skills from the agent skill picker or name them in your request.',
  } };
}

export async function updateProject(project: Project) {
  return installSkills(project, ['codex', 'claude', 'cursor']);
}

export function formatUpdate(result: Awaited<ReturnType<typeof installSkills>>): string {
  const lines = [result.conflicts.length ? 'Update needs attention.' : result.tools.length ? 'Skills are up to date.' : 'No agent tools selected.',
    `  Updated: ${result.written.length} files`, `  Already current: ${result.unchanged.length} files`, `  Modified files preserved: ${result.conflicts.length}`];
  if (result.conflicts.length) {
    lines.push('', ...result.conflicts.map(file => `  ! ${file}`),
      'Compare these files with the installed package templates and merge the changes you want to keep.');
  }
  if (result.tools.length) lines.push('', ...result.tools.map(tool => `  ${tool}: ${result.hints[tool]}`));
  lines.push('', 'Next: releasekit status');
  return lines.join('\n');
}

export interface InitOptions {
  product?: string;
  tools?: ProjectConfig['tools'];
  themes?: ProjectConfig['visuals']['themes'];
  sourceLocale?: string;
  locales?: string[];
}

export async function initProject(project: Project, options: InitOptions) {
  const file = await project.content('config.yaml');
  if (await exists(file)) throw new Error('ReleaseKit is already initialized. Edit config.yaml for project settings or run update for skills.');
  const config = defaultConfig(options.product ?? path.basename(project.root));
  if (options.tools) config.tools = [...new Set(options.tools)];
  if (options.themes) config.visuals.themes = options.themes;
  if (options.sourceLocale !== undefined) config.sourceLocale = options.sourceLocale;
  config.locales = options.locales ?? [config.sourceLocale];
  configSchema.parse(config);
  if (!config.locales.includes(config.sourceLocale) || new Set(config.locales).size !== config.locales.length) {
    throw new Error('Project locales must be unique and include the source locale.');
  }
  await writeYaml(file, config);
  return { config: file, ...await installSkills(project) };
}
