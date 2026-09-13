import * as fs from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { Project, linearHistory } from './project.js';
import { type Release, type ReleaseRef, type ProjectConfig, type Visual, visualSchema } from './model.js';
import { ref, refKey, parseRef, link } from './refs.js';
import { canonical, digest, exists, parseYaml, readNote, within, write } from './files.js';
import { validate } from './validate.js';
import { imagePrompt, sceneHash } from './prompts.js';

export interface MoveOptions {
  fromChannel?: string; toChannel?: string; toUnchanneled?: boolean;
  after?: string; atStart?: boolean; dryRun?: boolean;
}
type Entry = { before: Release; after: Release };
type Relocation = { from: string; realFrom: string; to: string; identity: ReleaseRef; destination: ReleaseRef };
const inside = (root: string, file: string) => {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
function yamlBytes(value: unknown, original: Buffer): Buffer {
  const text = stringify(value, { lineWidth: 100 });
  return Buffer.from(original.includes(Buffer.from('\r\n')) ? text.replace(/\n/g, '\r\n') : text);
}
function historySettings(config: ProjectConfig, channel?: string) {
  if (channel === undefined) return config.history ??= {};
  if (!config.channels || !config.channels[channel]) throw new Error(`Unknown channel: ${channel}`);
  return config.channels[channel].history ??= {};
}

export async function moveReleases(project: Project, versions: string[], options: MoveOptions) {
  if ((options.toChannel !== undefined) === !!options.toUnchanneled) throw new Error('Specify exactly one of --to-channel or --to-unchanneled.');
  if (!versions.length || new Set(versions).size !== versions.length) throw new Error('Choose one or more unique release versions.');
  if (options.after !== undefined && options.atStart) throw new Error('--after and --at-start cannot be combined.');
  if (options.fromChannel !== undefined) await project.requireChannel(options.fromChannel);
  if (options.toChannel !== undefined) await project.requireChannel(options.toChannel);
  const destinationChannel = options.toChannel;
  if (options.fromChannel === destinationChannel) throw new Error('The source and destination are the same.');
  const crossing = (options.fromChannel === undefined) !== (destinationChannel === undefined);
  if (!crossing && (options.after !== undefined || options.atStart)) throw new Error('Channel-to-channel moves preserve position; insertion options only apply when crossing histories.');
  const config = await project.config();
  const updatedConfig = structuredClone(config);
  const all = await Promise.all((await project.allRefs()).map(r => project.release(r)));
  const entries: Entry[] = all.map(r => ({ before: r, after: structuredClone(r) }));
  const byOldKey = new Map(entries.map(e => [refKey(e.before), e]));
  const selected = versions.map(version => {
    const identity = ref({ channel: options.fromChannel, version });
    const entry = byOldKey.get(refKey(identity));
    if (!entry) throw new Error(`Missing release: ${refKey(identity)}`);
    return entry;
  });
  const selectedKeys = new Set(selected.map(e => refKey(e.before)));
  const channelChain = linearHistory(all.filter(r => r.channel !== undefined));
  // Existing unchanneled projects may have multiple lines; a crossing move requires one unambiguous line.
  const singleChain = crossing ? linearHistory(all.filter(r => r.channel === undefined)) : [];
  const sourceChain = options.fromChannel === undefined ? singleChain : channelChain;
  const ordered = sourceChain.filter(r => selectedKeys.has(refKey(r))).reverse();
  const relocations: Relocation[] = [];
  for (const entry of selected) {
    const destination = ref({ version: entry.before.version, channel: destinationChannel });
    const from = await project.releaseDir(entry.before);
    const to = await project.releaseDir(destination);
    if (entries.some(e => refKey(e.before).toLowerCase() === refKey(destination).toLowerCase())) throw new Error(`Destination already exists: ${refKey(destination)}`);
    if (await exists(to)) throw new Error(`Destination already exists: ${refKey(destination)}`);
    for (const other of entries) {
      if (other === entry) continue;
      const directory = await project.releaseDir(other.before);
      if (inside(from, directory) || inside(directory, from) || inside(to, directory) || inside(directory, to)) {
        throw new Error('Release directories overlap; resolve the directory collision before moving.');
      }
    }
    for (const prior of relocations) if (inside(prior.to, to) || inside(to, prior.to)) throw new Error('Move destinations overlap.');
    delete entry.after.channel;
    Object.assign(entry.after, destination);
    relocations.push({ from, realFrom: await fs.realpath(from), to, identity: ref(entry.before), destination });
  }

  const relink = (chain: Release[]) => {
    // chain is oldest first and refers to original identities.
    for (const [index, old] of chain.entries()) {
      byOldKey.get(refKey(old))!.after.previous = link(index ? byOldKey.get(refKey(chain[index - 1]!))!.after : undefined);
    }
  };
  if (!crossing) {
    relink([...channelChain].reverse());
  } else {
    const targetChain = [...(destinationChannel === undefined ? singleChain : channelChain)].reverse();
    let insertion = targetChain.length;
    if (options.atStart) insertion = 0;
    if (options.after !== undefined) {
      const after = parseRef(options.after);
      const index = targetChain.findIndex(r => refKey(r) === refKey(after));
      if (index < 0) throw new Error(`Insertion point is not in the target history: ${options.after}`);
      insertion = index + 1;
    }
    targetChain.splice(insertion, 0, ...ordered);
    relink([...sourceChain].reverse().filter(r => !selectedKeys.has(refKey(r))));
    relink(targetChain);
  }
  linearHistory(entries.filter(e => e.after.channel !== undefined).map(e => e.after));
  if (crossing) linearHistory(entries.filter(e => e.after.channel === undefined).map(e => e.after));

  const sourceSettings = options.fromChannel === undefined ? config.history : (config.channels ? config.channels[options.fromChannel]?.history : undefined);
  if (sourceSettings?.start && sourceSettings.start.past !== 'skip' && versions.includes(sourceSettings.start.version)) {
    const targetSettings = historySettings(updatedConfig, destinationChannel);
    if (targetSettings.start) throw new Error('The destination already has a history start; resolve the settings conflict first.');
    targetSettings.start = structuredClone(sourceSettings.start);
    delete historySettings(updatedConfig, options.fromChannel).start;
  }

  const relocated = (file: string) => {
    const relocation = relocations.find(r => inside(r.from, file));
    return relocation ? path.join(relocation.to, path.relative(relocation.from, file)) : file;
  };
  const originals = new Map<string, Buffer>();
  const writes = new Map<string, Buffer>();
  const setWrite = async (file: string, contents: Buffer) => {
    const original = await fs.readFile(file);
    if (!original.equals(contents)) { originals.set(file, original); writes.set(file, contents); }
  };
  const visuals = new Map<string, unknown>();
  const affected = new Set<Entry>(entries.filter(e => canonical(e.before) !== canonical(e.after)));
  for (const entry of entries) {
    const directory = await project.releaseFile(entry.before, 'visuals');
    if (!(await exists(directory))) continue;
    for (const fileName of await fs.readdir(directory)) {
      if (!fileName.endsWith('.yaml')) continue;
      const file = await project.releaseFile(entry.before, `visuals/${fileName}`);
      const original = await fs.readFile(file);
      const raw = parseYaml(original.toString()) as { scene?: { references?: unknown }; variants?: Visual['variants'] };
      const references = raw?.scene?.references;
      if (!Array.isArray(references) || !references.every(r => typeof r === 'string')) throw new Error(`Invalid visual references: ${file}`);
      const replacements: string[] = [];
      for (const reference of references) {
        const absolute = await within(project.root, reference);
        const real = await exists(absolute) ? await fs.realpath(absolute) : absolute;
        const relocation = relocations.find(r => inside(r.realFrom, real));
        const next = relocation ? path.join(relocation.to, path.relative(relocation.realFrom, real)) : relocated(absolute);
        replacements.push(next === absolute ? reference : path.relative(project.root, next).split(path.sep).join('/'));
      }
      if (canonical(references) === canonical(replacements)) continue;
      const oldVisual = visualSchema.safeParse(raw);
      raw.scene!.references = replacements;
      const parsed = visualSchema.safeParse(raw);
      if (oldVisual.success && parsed.success) {
        for (const variant of ['dark', 'light', 'shared'] as const) {
          const asset = raw.variants?.[variant];
          if (asset && asset.sceneHash === sceneHash(oldVisual.data.scene, entry.before.visuals, variant)) {
            asset.sceneHash = sceneHash(parsed.data.scene, entry.after.visuals, variant);
          }
        }
        for (const theme of ['dark', 'light'] as const) {
          const prompt = await project.releaseFile(entry.before, `prompts/${fileName.slice(0, -5)}.${theme}.md`);
          if (await exists(prompt) && parsed.data.scene.source !== 'provided' && !['object-detail', 'editorial-scene'].includes(parsed.data.scene.archetype)) {
            const bytes = await fs.readFile(prompt);
            let generated = imagePrompt(parsed.data.scene, entry.after.visuals, theme);
            if (bytes.includes(Buffer.from('\r\n'))) generated = generated.replace(/\n/g, '\r\n');
            await setWrite(prompt, Buffer.from(generated));
          }
        }
      }
      visuals.set(file, raw);
      await setWrite(file, yamlBytes(raw, original));
      affected.add(entry);
    }
  }

  for (const entry of affected) {
    if (entry.before.status === 'ready') {
      const checked = await validate(project, entry.before);
      if (!checked.valid) throw new Error(`Cannot move changed ready content ${refKey(entry.before)}: ${checked.errors.join('\n')}`);
      const { status: _status, contentHash: _hash, ...metadata } = entry.after;
      const parts: unknown[] = [metadata];
      for (const note of entry.after.notes) {
        for (const locale of entry.after.locales) parts.push(await readNote(await project.releaseFile(entry.before, `notes/${note.id}/${locale}.md`)));
        if (note.image) {
          const file = await project.releaseFile(entry.before, `visuals/${note.id}.yaml`);
          parts.push(visualSchema.parse(visuals.get(file) ?? parseYaml(await fs.readFile(file, 'utf8'))));
        }
      }
      entry.after.contentHash = digest(canonical(parts));
    } else {
      entry.after.contentHash = null;
    }
    const file = await project.releaseFile(entry.before, 'release.yaml');
    await setWrite(file, yamlBytes(entry.after, await fs.readFile(file)));
  }
  if (canonical(config) !== canonical(updatedConfig)) {
    const file = await project.content('config.yaml');
    await setWrite(file, yamlBytes(updatedConfig, await fs.readFile(file)));
  }
  const result = {
    dryRun: !!options.dryRun,
    moved: selected.map(e => ({ from: ref(e.before), to: ref(e.after), status: e.after.status })),
    updatedReleases: [...affected].map(e => ref(e.after)),
    updatedFiles: [...writes.keys()].map(file => path.relative(project.root, relocated(file)).split(path.sep).join('/')),
    paths: relocations.map(r => ({ from: r.from, to: r.to })),
  };
  if (options.dryRun) return result;
  // Detect edits made during preflight before any mutation.
  for (const [file, original] of originals) if (!(await fs.readFile(file)).equals(original)) throw new Error(`File changed during move preparation: ${file}`);

  const holding = await fs.mkdtemp(await project.content('.move-'));
  const locations = relocations.map(r => r.from);
  const written: string[] = [];
  const createdParents: string[] = [];
  const recoveryFiles: string[] = [];
  const clearHolding = async () => {
    for (const file of recoveryFiles) await fs.rm(file, { force: true });
    await fs.rmdir(holding);
  };
  try {
    // Durable originals and path mapping remain available if rollback itself fails.
    const backups: { from: string; to: string; backup: string }[] = [];
    for (const [file, original] of originals) {
      const backup = path.join(holding, `original-${backups.length}`);
      recoveryFiles.push(backup);
      await fs.writeFile(backup, original, { flag: 'wx' });
      backups.push({ from: file, to: relocated(file), backup });
    }
    const manifest = path.join(holding, 'recovery.json');
    recoveryFiles.push(manifest);
    await fs.writeFile(manifest, JSON.stringify({ backups, relocations: relocations.map((r, index) => ({ from: r.from, to: r.to, holding: path.join(holding, String(index)) })) }, null, 2), { flag: 'wx' });
    for (const [index, relocation] of relocations.entries()) {
      const temporary = path.join(holding, String(index));
      await fs.rename(relocation.from, temporary); locations[index] = temporary;
    }
    for (const [index, relocation] of relocations.entries()) {
      const parent = path.dirname(relocation.to);
      if (!(await exists(parent))) { await fs.mkdir(parent, { recursive: true }); createdParents.push(parent); }
      if (await exists(relocation.to)) throw new Error(`Destination appeared during move: ${relocation.to}`);
      await fs.rename(locations[index]!, relocation.to); locations[index] = relocation.to;
    }
    for (const [file, contents] of writes) {
      // Include the attempted file so even an error after replacement is recoverable.
      written.push(file);
      await write(relocated(file), contents);
    }
  } catch (error) {
    try {
      for (const file of written.reverse()) await fs.writeFile(relocated(file), originals.get(file)!);
      for (let index = relocations.length - 1; index >= 0; index--) {
        if (locations[index] !== relocations[index]!.from) await fs.rename(locations[index]!, relocations[index]!.from);
      }
      for (const directory of createdParents.reverse()) await fs.rmdir(directory);
      await clearHolding();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], `Move failed and rollback needs recovery. Preserved holding directory: ${holding}`);
    }
    throw error;
  }
  await clearHolding();
  // Only remove now-empty channel containers. Never recursively remove a source path.
  for (const directory of new Set(relocations.filter(r => r.identity.channel !== undefined).map(r => path.dirname(r.from)))) {
    if (await exists(directory) && !(await fs.readdir(directory)).length) await fs.rmdir(directory);
  }
  return result;
}
