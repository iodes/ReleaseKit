import * as fs from 'node:fs/promises';
import path from 'node:path';
import { configSchema, historyStartSchema, releaseSchema, type HistoryStart, type ProjectConfig, type Release } from './model.js';
import { exists, identifier, readYaml, within, writeYaml, KIT_DIR } from './files.js';
import { repoRoot, resolveCommit, resolveRange, checkPrevious } from './git.js';

export class Project {
  readonly root: string;
  constructor(root: string) { this.root = path.resolve(root); }
  static find(cwd: string): Project { return new Project(repoRoot(cwd)); }
  async content(relative: string): Promise<string> { return within(this.root, `${KIT_DIR}/${relative}`); }
  async config(): Promise<ProjectConfig> {
    const config = await readYaml(await this.content('config.yaml'), configSchema);
    if (!config.locales.includes(config.sourceLocale) || new Set(config.locales).size !== config.locales.length) {
      throw new Error('Project locales must be unique and include the source locale.');
    }
    return config;
  }
  async releaseDir(version: string): Promise<string> {
    return this.content(`releases/${identifier(version)}`);
  }
  async releaseFile(version: string, relative: string): Promise<string> {
    return within(await this.releaseDir(version), relative);
  }
  async release(version: string): Promise<Release> {
    const release = await readYaml(await this.releaseFile(version, 'release.yaml'), releaseSchema);
    if (release.version !== version) throw new Error(`Release directory and version disagree: ${version}`);
    return release;
  }
  async save(release: Release): Promise<void> {
    await writeYaml(await this.releaseFile(release.version, 'release.yaml'), releaseSchema.parse(release));
  }
  async versions(): Promise<string[]> {
    const folder = await this.content('releases');
    if (!(await exists(folder))) return [];
    const entries = await fs.readdir(folder, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  }
  async history(version: string, limit: number): Promise<Release[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('History limit must be an integer from 1 to 100.');
    const chain: Release[] = [];
    const visited = new Set<string>();
    let cursor: string | null = version;
    // Validate the entire linked lineage, including links beyond the requested display window.
    while (cursor !== null) {
      if (visited.has(cursor)) throw new Error(`Cycle in previous-release links at ${cursor}`);
      visited.add(cursor);
      const release: Release = await this.release(cursor);
      if (chain.length < limit) chain.push(release);
      cursor = release.previous;
    }
    return chain;
  }
}

export function editable(release: Release): void {
  if (release.status !== 'draft') throw new Error('This release is ready. Set status to draft and contentHash to null before editing it.');
}

export interface StartOptions { at: string; past: HistoryStart['past']; version?: string }
export async function startProject(project: Project, options: StartOptions): Promise<HistoryStart> {
  const config = await project.config();
  if (config.history.start) throw new Error('A history start is already configured. Reuse the saved choice; it was not overwritten.');
  if ((await project.versions()).length) throw new Error('History setup requires a project without releases. Continue an existing release line with --previous.');
  if (options.past === 'skip' && options.version !== undefined) throw new Error('--baseline-version is not used when --past is skip.');
  if (options.past !== 'skip' && !options.version) throw new Error('Specify --baseline-version for the baseline summary or history release.');
  if (options.version) identifier(options.version);
  const source = resolveRange(project.root, null, options.at);
  const start = historyStartSchema.parse({ ref: options.at, sha: source.toSha, past: options.past, version: options.version ?? null });
  config.history.start = start;
  await writeYaml(await project.content('config.yaml'), config);
  return start;
}

export interface PrepareOptions {
  from?: string; to?: string; previous?: string; fromRoot?: boolean; firstRelease?: boolean; date?: string;
}
export async function prepare(project: Project, version: string, options: PrepareOptions): Promise<Release> {
  identifier(version);
  const directory = await project.releaseDir(version);
  if (await exists(directory)) throw new Error(`Release ${version} already exists; edit it in place instead of overwriting it.`);
  const config = await project.config();
  if (options.fromRoot && (options.from || options.previous)) throw new Error('--from-root cannot be combined with --from or --previous.');
  if (options.firstRelease && options.previous) throw new Error('--first-release cannot be combined with --previous.');
  const versions = await project.versions();
  const start = config.history.start;
  let previous = options.previous ? await project.release(options.previous) : undefined;
  let from = options.fromRoot ? null : options.from ?? previous?.source.toSha;
  let to = options.to ?? 'HEAD';
  let initialContent: Release['initialContent'];
  let savedStart = false;
  if (start && start.past !== 'skip' && version === start.version) {
    if (options.from !== undefined || options.previous !== undefined) throw new Error('The configured baseline starts at the root and has no previous release.');
    if (options.to !== undefined && resolveCommit(project.root, options.to) !== start.sha) throw new Error('The requested end differs from the pinned history start.');
    from = null;
    to = start.sha;
    initialContent = start.past;
  } else if (start && from === undefined && !options.firstRelease) {
    if (start.past === 'skip' && !versions.length) {
      from = start.sha;
      savedStart = true;
    } else if (start.past !== 'skip' && versions.every(v => v === start.version)) {
      if (!versions.includes(start.version)) throw new Error(`Prepare the configured baseline ${start.version} first, then continue with --previous ${start.version}.`);
      previous = await project.release(start.version);
      if (previous.source.toSha !== start.sha || previous.initialContent !== start.past) throw new Error('The baseline release differs from the saved history start. Choose an explicit --previous release.');
      from = previous.source.toSha;
    }
  }
  if (from === undefined) throw new Error('Specify --from, --previous, or --from-root, or configure a first-use boundary with start.');
  const source = resolveRange(project.root, from, to);
  if (initialContent && start) source.toRef = start.ref;
  if (savedStart && start) source.fromRef = start.ref;
  if (!previous && !options.fromRoot && !options.firstRelease && !initialContent) {
    const existing = await Promise.all(versions.map(v => project.release(v)));
    const candidates = existing.filter(r => r.source.toSha === source.fromSha);
    if (candidates.length === 1) previous = candidates[0];
    else if (existing.length) throw new Error('Previous release is ambiguous. Specify --previous, or --first-release for an independent release line.');
  }
  if (previous) {
    checkPrevious(project.root, previous, source);
    await project.history(previous.version, 1);
  }
  const release = releaseSchema.parse({
    schemaVersion: 1, version, releasedAt: options.date ?? new Date().toISOString().slice(0, 10),
    previous: previous?.version ?? null, status: 'draft', source,
    ...(initialContent ? { initialContent } : {}),
    sourceLocale: config.sourceLocale, locales: config.locales, visuals: config.visuals,
    notes: [], emptyReason: null, contentHash: null,
  });
  await project.save(release);
  return release;
}
