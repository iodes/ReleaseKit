import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import { z } from 'zod';
import { isNode, parseDocument } from 'yaml';
import { Project } from './project.js';
import { configSchema, defaultConfig, type ProjectConfig } from './model.js';
import { exists, within, write, writeYaml, readYaml, digest } from './files.js';

const resources = fileURLToPath(new URL('../kit/', import.meta.url));
const names = ['releasekit-draft', 'releasekit-image', 'releasekit-finalize'];
const managedSchema = z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/));
const normalizeSkillText = (text: string) => text.replaceAll('\r\n', '\n');

export async function installSkills(project: Project, tools?: ProjectConfig['tools']) {
  const selected = tools ?? (await project.config()).tools;
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
        let content = await fs.readFile(item.source, 'utf8');
        const normalized = normalizeSkillText(content);
        const expected = digest(normalized);
        const destination = await within(project.root, item.destination);
        if (await exists(destination)) {
          const current = await fs.readFile(destination, 'utf8');
          const currentNormalized = normalizeSkillText(current);
          const actual = digest(currentNormalized);
          if (actual === expected) { managed[item.destination] = expected; unchanged.push(item.destination); continue; }
          // Older markers hashed raw bytes; accept either saved newline convention.
          const previousHashes = [actual, digest(current), digest(currentNormalized.replaceAll('\n', '\r\n'))];
          if (!previousHashes.includes(managed[item.destination] ?? '')) { conflicts.push(item.destination); continue; }
          content = current.includes('\r\n') ? normalized.replaceAll('\n', '\r\n') : normalized;
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
  const file = await project.content('config.yaml');
  if (!(await exists(file))) throw new Error('ReleaseKit is not initialized. Run releasekit init first.');
  // Validate only the settings needed for skill updates, not release or export settings.
  const { product, tools } = await readYaml(file, configSchema.pick({ product: true, tools: true }).strip());
  return { ...await installSkills(project, tools), product };
}

interface UpdateOutputOptions {
  projectRoot?: string;
  stream?: NodeJS.WriteStream;
}

function updateStyle(options: UpdateOutputOptions) {
  return (format: Parameters<typeof styleText>[0], text: string) =>
    options.stream ? styleText(format, text, { stream: options.stream }) : text;
}

export function formatUpdate(result: Awaited<ReturnType<typeof updateProject>>, options: UpdateOutputOptions = {}): string {
  const paint = updateStyle(options);
  const status = result.conflicts.length
    ? paint(['yellow', 'bold'], '! Update needs attention')
    : !result.tools.length
      ? paint('bold', '− Update skipped')
      : paint(['green', 'bold'], result.written.length ? '✓ Update complete' : '✓ Already up to date');
  const detail = result.conflicts.length
    ? 'Some files need a manual merge. Your edits have been preserved.'
    : !result.tools.length
      ? 'No agent tools selected. No skills were installed.'
      : result.written.length ? 'Selected agent skills have been refreshed.' : 'Selected agent skills already match the installed package.';
  const lines = ['', `  ${paint('bold', 'ReleaseKit')} ${paint('dim', '· Skill update')}`, '',
    `  ${status}`, `  ${detail}`, '', `  ${paint('dim', 'Product:')} ${result.product}`];
  if (options.projectRoot) lines.push(`  ${paint('dim', 'Project:')} ${options.projectRoot}`);
  lines.push(`  ${paint('dim', 'Tools:')} ${result.tools.join(', ') || 'none'}`);
  if (result.tools.length) {
    const counts = [
      ['Updated:', result.written.length], ['Already current:', result.unchanged.length], ['Preserved edits:', result.conflicts.length],
    ] as const;
    lines.push('', ...counts.map(([label, count]) =>
      `  ${paint('dim', label.padEnd(18))}${paint('bold', String(count))} ${count === 1 ? 'file' : 'files'}`));
  }
  if (result.conflicts.length) {
    lines.push('', `  ${paint('bold', 'Files to review')}`, ...result.conflicts.map(file => `    ${paint('yellow', '!')} ${file}`),
      '', '  Merge these files with the installed package templates, then rerun releasekit update.');
  } else if (!result.tools.length) {
    lines.push('', '  Select tools in releasekit/config.yaml, then run releasekit update.');
  } else {
    lines.push('', `  ${paint('bold', 'Agent commands')}`, ...result.tools.map(tool => `    ${tool}: ${result.hints[tool]}`),
      '', `  ${paint('dim', 'Next:')} releasekit status`);
  }
  lines.push('');
  return lines.join('\n');
}

export function formatUpdateFailure(message: string, options: UpdateOutputOptions = {}): string {
  const paint = updateStyle(options);
  const lines = ['', `  ${paint('bold', 'ReleaseKit')} ${paint('dim', '· Skill update')}`, '',
    `  ${paint(['red', 'bold'], '✕ Update failed')}`];
  if (options.projectRoot) lines.push(`  ${paint('dim', 'Project:')} ${options.projectRoot}`);
  lines.push('', ...message.split(/\r?\n/).map(line => `  ${line}`), '',
    '  Resolve the error above, then run releasekit update again.', '');
  return lines.join('\n');
}

export interface InitOptions {
  product?: string;
  tools?: ProjectConfig['tools'];
  themes?: ProjectConfig['visuals']['themes'];
  sourceLocale?: string;
  locales?: string[];
}

export async function readExistingSetup(project: Project, options: InitOptions) {
  const file = await project.content('config.yaml');
  if (!(await exists(file))) return undefined;
  if (options.product !== undefined || options.themes !== undefined || options.sourceLocale !== undefined || options.locales !== undefined) {
    throw new Error('This project is already initialized. Use init --tools to change agent tools; edit releasekit/config.yaml for other settings.');
  }
  return readYaml(file, configSchema.pick({ product: true, tools: true }).strip());
}

export async function initProject(project: Project, options: InitOptions) {
  const file = await project.content('config.yaml');
  const existing = await readExistingSetup(project, options);
  if (existing) {
    const tools = configSchema.shape.tools.parse([...new Set(options.tools ?? existing.tools)]);
    if (JSON.stringify(tools) !== JSON.stringify(existing.tools)) {
      const original = await fs.readFile(file, 'utf8');
      const document = parseDocument(original);
      const previous = document.get('tools', true);
      const selected = document.createNode(tools);
      if (isNode(previous)) {
        selected.commentBefore = previous.commentBefore;
        selected.comment = previous.comment;
      }
      document.set('tools', selected);
      const text = document.toString({ lineWidth: 0 });
      await write(file, original.includes('\r\n') ? text.replace(/\r?\n/g, '\r\n') : text);
    }
    return { config: file, product: existing.product, reconfigured: true, ...await installSkills(project, tools) };
  }
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
  return { config: file, product: config.product, reconfigured: false, ...await installSkills(project) };
}
