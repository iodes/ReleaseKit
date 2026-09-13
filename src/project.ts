import * as fs from 'node:fs/promises';
import path from 'node:path';
import { configSchema, historyStartSchema, releaseSchema, type HistoryStart, type ProjectConfig, type Release, type ReleaseId, type ReleaseRef } from './model.js';
import { exists, identifier, readYaml, within, writeYaml, parseYaml, KIT_DIR } from './files.js';
import { repoRoot, resolveCommit, resolveRange, checkPrevious } from './git.js';

import { ref, refKey, parseRef, previousRef, link } from './refs.js';

export function checkLimit(limit?: number): void {
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error('History limit must be a positive safe integer.');
}

// Newest first. Validate every member, not just the displayed window.
export function linearHistory(releases: Release[]): Release[] {
  if (!releases.length) return [];
  const items = new Map(releases.map(r => [refKey(r), r]));
  if (items.size !== releases.length) throw new Error('Duplicate release identity.');
  const successors = new Set<string>();
  for (const release of releases) {
    const previous = previousRef(release);
    if (!previous) continue;
    const key = refKey(previous);
    if (!items.has(key)) throw new Error(`Missing previous release: ${key}`);
    if (successors.has(key)) throw new Error(`Branch in release history at ${key}`);
    successors.add(key);
  }
  const heads = releases.filter(r => !successors.has(refKey(r)));
  if (heads.length !== 1) throw new Error('Release history must have one endpoint; disconnected history or cycle found.');
  const chain: Release[] = [];
  const visited = new Set<string>();
  let cursor: Release | undefined = heads[0];
  while (cursor) {
    const key = refKey(cursor);
    if (visited.has(key)) throw new Error(`Cycle in release history at ${key}`);
    visited.add(key); chain.push(cursor);
    const previous = previousRef(cursor);
    cursor = previous ? items.get(refKey(previous)) : undefined;
  }
  if (chain.length !== releases.length) throw new Error('Disconnected release history or cycle found.');
  return chain;
}

export class Project {
  readonly root: string;
  constructor(root: string) { this.root = path.resolve(root); }
  static find(cwd: string): Project { return new Project(repoRoot(cwd)); }
  async content(relative: string): Promise<string> { return within(this.root, `${KIT_DIR}/${relative}`); }
  async config(): Promise<ProjectConfig> {
    const raw = parseYaml(await fs.readFile(await this.content('config.yaml'), 'utf8'));
    if (raw && typeof raw === 'object' && 'history' in raw && raw.history && typeof raw.history === 'object' && 'limit' in raw.history) {
      throw new Error('Remove history.limit from config.yaml; use export --limit instead. Omit --limit to export all releases.');
    }
    const config = configSchema.parse(raw);
    if (!config.locales.includes(config.sourceLocale) || new Set(config.locales).size !== config.locales.length) {
      throw new Error('Project locales must be unique and include the source locale.');
    }
    return config;
  }
  async requireChannel(channel: string): Promise<void> {
    ref({ channel, version: 'check' });
    const config = await this.config();
    if (!config.channels || !Object.hasOwn(config.channels, channel)) throw new Error(`Unknown channel: ${channel}. Configure it in config.yaml first.`);
  }
  async releaseDir(value: ReleaseId): Promise<string> {
    return this.content(`releases/${refKey(value)}`);
  }
  async releaseFile(value: ReleaseId, relative: string): Promise<string> {
    return within(await this.releaseDir(value), relative);
  }
  async release(value: ReleaseId): Promise<Release> {
    const release = await readYaml(await this.releaseFile(value, 'release.yaml'), releaseSchema);
    if (refKey(release) !== refKey(value)) throw new Error(`Release directory and identity disagree: ${refKey(value)}`);
    return release;
  }
  async save(release: Release): Promise<void> {
    await writeYaml(await this.releaseFile(release, 'release.yaml'), releaseSchema.parse(release));
  }
  async allRefs(): Promise<ReleaseRef[]> {
    const folder = await this.content('releases');
    if (!(await exists(folder))) return [];
    const result: ReleaseRef[] = [];
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = await this.content(`releases/${identifier(entry.name)}`);
      if (await exists(path.join(directory, 'release.yaml'))) result.push(ref(entry.name));
      // An unchanneled version may also happen to be a channel name.
      for (const child of await fs.readdir(directory, { withFileTypes: true })) {
        if (child.isDirectory() && await exists(path.join(directory, child.name, 'release.yaml'))) {
          result.push(ref({ channel: entry.name, version: child.name }));
        }
      }
    }
    const keys = result.map(r => refKey(r).toLowerCase());
    if (new Set(keys).size !== keys.length) throw new Error('Release identities collide on a case-insensitive filesystem.');
    return result.sort((a, b) => refKey(a) < refKey(b) ? -1 : 1);
  }
  async versions(): Promise<string[]> {
    return (await this.allRefs()).filter(r => r.channel === undefined).map(r => r.version);
  }
  async channelHistory(): Promise<Release[]> {
    const refs = (await this.allRefs()).filter(r => r.channel !== undefined);
    const config = await this.config();
    for (const value of refs) if (!config.channels || !Object.hasOwn(config.channels, value.channel!)) throw new Error(`Unknown channel: ${value.channel}`);
    return linearHistory(await Promise.all(refs.map(r => this.release(r))));
  }
  async latestVersion(): Promise<string> {
    const versions = await this.versions();
    if (!versions.length) throw new Error('No releases to export. Prepare and finalize a release first.');
    const releases = await Promise.all(versions.map(version => this.release(version)));
    const predecessors = new Set(releases.map(release => release.previous));
    const latest = releases.filter(release => !predecessors.has(release.version));
    if (!latest.length) throw new Error('No latest release found: previous-release links contain a cycle.');
    if (latest.length > 1) throw new Error(`Multiple latest releases found: ${latest.map(release => release.version).join(', ')}. Specify --current <version>.`);
    return latest[0]!.version;
  }
  async history(value: ReleaseId, limit?: number): Promise<Release[]> {
    checkLimit(limit);
    if (ref(value).channel !== undefined) {
      const chain = await this.channelHistory();
      const index = chain.findIndex(r => refKey(r) === refKey(value));
      if (index < 0) throw new Error(`Missing release: ${refKey(value)}`);
      return chain.slice(index, limit === undefined ? undefined : index + limit);
    }
    const chain: Release[] = [];
    const visited = new Set<string>();
    let cursor: ReleaseRef | null = ref(value);
    while (cursor !== null) {
      const key = refKey(cursor);
      if (visited.has(key)) throw new Error(`Cycle in previous-release links at ${key}`);
      visited.add(key);
      const release: Release = await this.release(cursor);
      if (limit === undefined || chain.length < limit) chain.push(release);
      cursor = previousRef(release);
    }
    return chain;
  }

}

export function editable(release: Release): void {
  if (release.status !== 'draft') throw new Error('This release is ready. Set status to draft and contentHash to null before editing it.');
}

export interface StartOptions { at: string; past: HistoryStart['past']; version?: string; channel?: string }
export async function startProject(project: Project, options: StartOptions): Promise<HistoryStart> {
  const config = await project.config();
  if (options.channel !== undefined) await project.requireChannel(options.channel);
  const settings = options.channel === undefined ? (config.history ??= {}) : ((config.channels as Exclude<ProjectConfig['channels'], false | undefined>)[options.channel]!.history ??= {});
  if (settings.start) throw new Error('A history start is already configured. Reuse the saved choice; it was not overwritten.');
  if ((await project.allRefs()).some(r => r.channel === options.channel)) throw new Error('History setup requires a project without releases. Continue an existing release line with --previous.');
  if (options.past === 'skip' && options.version !== undefined) throw new Error('--baseline-version is not used when --past is skip.');
  if (options.past !== 'skip' && !options.version) throw new Error('Specify --baseline-version for the baseline summary or history release.');
  if (options.version) identifier(options.version);
  const source = resolveRange(project.root, null, options.at);
  const start = historyStartSchema.parse({ ref: options.at, sha: source.toSha, past: options.past, version: options.version ?? null });
  settings.start = start;
  await writeYaml(await project.content('config.yaml'), config);
  return start;
}

export interface PrepareOptions {
  from?: string; to?: string; previous?: string; fromRoot?: boolean; firstRelease?: boolean; date?: string; channel?: string;
}
export async function prepare(project: Project, version: string, options: PrepareOptions): Promise<Release> {
  identifier(version);
  if (options.channel !== undefined) return prepareChannel(project, version, options);
  const directory = await project.releaseDir(version);
  if (await exists(directory)) throw new Error(`Release ${version} already exists; edit it in place instead of overwriting it.`);
  const config = await project.config();
  if (options.fromRoot && (options.from || options.previous)) throw new Error('--from-root cannot be combined with --from or --previous.');
  if (options.firstRelease && options.previous) throw new Error('--first-release cannot be combined with --previous.');
  const versions = await project.versions();
  if (versions.some(v => v.toLowerCase() === version.toLowerCase())) throw new Error(`Release ${version} already exists on a case-insensitive filesystem.`);
  const start = config.history?.start;
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
    schemaVersion: 1, version, releasedAt: options.date ?? new Date().toISOString(),
    previous: previous?.version ?? null, status: 'draft', source,
    ...(initialContent ? { initialContent } : {}),
    sourceLocale: config.sourceLocale, locales: config.locales, visuals: config.visuals,
    notes: [], emptyReason: null, contentHash: null,
  });
  await project.save(release);
  return release;
}

async function prepareChannel(project: Project, version: string, options: PrepareOptions): Promise<Release> {
  const channel = options.channel!;
  await project.requireChannel(channel);
  const identity = ref({ channel, version });
  if (await exists(await project.releaseDir(identity))) throw new Error(`Release ${refKey(identity)} already exists; edit it in place.`);
  const config = await project.config();
  const chain = await project.channelHistory();
  if (chain.some(r => refKey(r).toLowerCase() === refKey(identity).toLowerCase())) throw new Error(`Release ${refKey(identity)} already exists on a case-insensitive filesystem.`);
  const head = chain[0];
  const sameChannel = chain.filter(r => r.channel === channel);
  if (options.previous !== undefined && (!head || refKey(parseRef(options.previous)) !== refKey(head))) throw new Error('--previous must identify the latest release in the whole channel history.');
  if (options.firstRelease && head) throw new Error('Channel history already exists; a second independent history is not allowed.');
  if (options.fromRoot && options.from !== undefined) throw new Error('--from-root cannot be combined with --from.');
  const start = config.channels && config.channels[channel]!.history?.start;
  let from = options.fromRoot ? null : options.from ?? sameChannel[0]?.source.toSha;
  let to = options.to ?? 'HEAD';
  let initialContent: Release['initialContent'];
  let savedStart = false;
  if (start && start.past !== 'skip' && version === start.version) {
    if (sameChannel.length || options.from !== undefined) throw new Error('Prepare the configured baseline before other releases in its channel.');
    if (options.to !== undefined && resolveCommit(project.root, options.to) !== start.sha) throw new Error('The requested end differs from the pinned history start.');
    from = null; to = start.sha; initialContent = start.past;
  } else if (start && from === undefined) {
    if (start.past !== 'skip' && !sameChannel.length) throw new Error(`Prepare the configured baseline ${channel}/${start.version} first.`);
    from = start.sha; savedStart = true;
  }
  if (from === undefined) throw new Error(`Specify --from or --from-root, or configure a history start for ${channel}.`);
  const source = resolveRange(project.root, from, to);
  if (initialContent && start) source.toRef = start.ref;
  if (savedStart && start) source.fromRef = start.ref;
  const release = releaseSchema.parse({
    schemaVersion: 1, ...identity, previous: link(head), status: 'draft', source,
    releasedAt: options.date ?? new Date().toISOString(),
    ...(initialContent ? { initialContent } : {}),
    sourceLocale: config.sourceLocale, locales: config.locales, visuals: config.visuals,
    notes: [], emptyReason: null, contentHash: null,
  });
  await project.save(release);
  return release;
}
