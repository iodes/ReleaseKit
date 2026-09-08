import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { Project, prepare } from '../src/project.js';
import { exportBundle } from '../src/export.js';
import { finalize } from '../src/validate.js';
import { bundleSchema } from '../src/model.js';
import { exists, readNote, writeNote, writeYaml } from '../src/files.js';
import { cleanup, commit, fillNote, fixture } from './helpers.js';

afterEach(cleanup);

async function ready(project: Project, version: string, previous?: string, locales = ['en-US', 'ko-KR'], image = false, date = '2026-09-08') {
  await commit(project.root, `Change ${version}\n`, `Change ${version}`);
  const release = await prepare(project, version, previous ? { previous, date } : { fromRoot: true, date });
  release.locales = locales;
  await project.save(release);
  await fillNote(project, version, image);
  await finalize(project, version);
}

function cli(project: Project, args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', project.root, '--json', 'export', ...args], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
  });
}

async function readBundle(file: string) {
  return bundleSchema.parse(JSON.parse(await fs.readFile(file, 'utf8')));
}

describe('export defaults', () => {
  it('exports the linked latest three versions in every saved locale with only --out, sharing images', async () => {
    const p = await fixture();
    const versions = ['9.0.0', '10.0.0', 'z-preview', 'a-final'];
    for (const [index, version] of versions.entries()) {
      await ready(p, version, versions[index - 1], undefined, index === 3, `2026-09-0${8 - index}`);
    }
    // Project defaults may change after a release saves its own language selection.
    const config = await p.config();
    config.sourceLocale = 'ja-JP'; config.locales = ['ja-JP'];
    await writeYaml(await p.content('config.yaml'), config);
    const command = cli(p, ['--out', './output with spaces']);
    expect(command.status, command.stderr).toBe(0);
    expect(command.stderr).toBe('');
    const out = path.join(p.root, 'output with spaces');
    const result = JSON.parse(command.stdout) as Awaited<ReturnType<typeof exportBundle>>;
    expect(result).toEqual({
      files: ['en-US', 'ko-KR'].map(language => path.join(out, `release-notes.${language}.json`)),
      releases: 3, assets: 2,
    });
    expect((await fs.readdir(out)).sort()).toEqual(['assets', 'release-notes.en-US.json', 'release-notes.ko-KR.json']);
    const bundles = await Promise.all(result.files.map((file: string) => readBundle(file)));
    expect(bundles.map(bundle => bundle.locale)).toEqual(['en-US', 'ko-KR']);
    for (const bundle of bundles) {
      expect(bundle.currentVersion).toBe('a-final');
      expect(bundle.releases.map(release => release.version)).toEqual(['a-final', 'z-preview', '10.0.0']);
      expect(bundle.releases.map(release => release.previous)).toEqual(['z-preview', '10.0.0', '9.0.0']);
      for (const release of bundle.releases) {
        const source = await readNote(await p.releaseFile(release.version, `notes/queue/${bundle.locale}.md`));
        expect(release.notes).toHaveLength(1);
        expect(release.notes[0]).toMatchObject({ id: 'queue', title: source.title, bodyMarkdown: source.body });
        if (release.notes[0]!.image) expect(release.notes[0]!.image.alt).toBe(source.alt);
      }
    }
    const picture = bundles[0]!.releases[0]!.notes[0]!.image!;
    expect(bundles[1]!.releases[0]!.notes[0]!.image!.variants).toEqual(picture.variants);
    expect(await fs.readdir(path.join(out, 'assets'))).toEqual(['a-final']);
    expect(await fs.readdir(path.join(out, 'assets', 'a-final'))).toHaveLength(2);
    for (const asset of Object.values(picture.variants)) {
      expect(await fs.readFile(path.join(out, asset.src))).toEqual(await fs.readFile(await p.releaseFile('a-final', `assets/${path.posix.basename(asset.src)}`)));
    }
  });

  it('honors configured history limits and explicit current, limit, and locale overrides through the CLI', async () => {
    const p = await fixture();
    await ready(p, 'first'); await ready(p, 'middle', 'first'); await ready(p, 'last', 'middle');
    const config = await p.config(); config.history.limit = 1;
    await writeYaml(await p.content('config.yaml'), config);
    const limited = cli(p, ['--locale', 'ko-KR', '--out', './limited']);
    expect(limited.status, limited.stderr).toBe(0);
    const limitedResult = JSON.parse(limited.stdout);
    expect(limitedResult.releases).toBe(1);
    expect(await fs.readdir(path.join(p.root, 'limited'))).toEqual(['release-notes.ko-KR.json']);
    expect((await readBundle(limitedResult.files[0])).releases.map(release => release.version)).toEqual(['last']);
    const explicit = cli(p, ['--current', 'middle', '--limit', '2', '--locale', 'en-US', '--out', './explicit']);
    expect(explicit.status, explicit.stderr).toBe(0);
    const bundle = await readBundle(JSON.parse(explicit.stdout).files[0]);
    expect(bundle.currentVersion).toBe('middle');
    expect(bundle.locale).toBe('en-US');
    expect(bundle.releases.map(release => release.version)).toEqual(['middle', 'first']);
    expect(await fs.readdir(path.join(p.root, 'explicit'))).toEqual(['release-notes.en-US.json']);
  });

  it('requires --out and reports an empty release collection without creating output', async () => {
    const p = await fixture();
    const missingOut = cli(p, []);
    expect(missingOut.status).toBe(1);
    expect(missingOut.stderr).toContain('--out');
    const empty = cli(p, ['--out', './empty']);
    expect(empty.status).toBe(1);
    expect(JSON.parse(empty.stderr).error).toContain('No releases');
    expect(await exists(path.join(p.root, 'empty'))).toBe(false);
  });

  it.each([true, false])('requires an explicit version when multiple release endpoints exist (shared predecessor: %s)', async shared => {
    const p = await fixture();
    await ready(p, 'base'); await ready(p, 'main', 'base');
    await ready(p, 'side', shared ? 'base' : undefined);
    const out = path.join(p.root, 'ambiguous');
    await expect(exportBundle(p, undefined, { out })).rejects.toThrow(/main, side.*--current/);
    expect(await exists(out)).toBe(false);
    const selected = await exportBundle(p, 'main', { out });
    expect((await readBundle(selected.files[0]!)).releases.map(release => release.version)).toEqual(['main', 'base']);
  });

  it('selects a draft endpoint and requires finalization instead of exporting an older ready version', async () => {
    const p = await fixture(); await ready(p, 'ready');
    await commit(p.root, 'Next change\n', 'Next change');
    await prepare(p, 'draft', { previous: 'ready' });
    const out = path.join(p.root, 'draft-output');
    await expect(exportBundle(p, undefined, { out })).rejects.toThrow('Release draft is still a draft');
    expect(await exists(out)).toBe(false);
    const selected = await exportBundle(p, 'ready', { out });
    expect((await readBundle(selected.files[0]!)).currentVersion).toBe('ready');
  });

  it('rejects cyclic links when no endpoint exists and broken predecessors beyond the selected limit', async () => {
    const p = await fixture(); await ready(p, 'first'); await ready(p, 'last', 'first');
    const first = await p.release('first'); first.previous = 'last'; await p.save(first);
    const out = path.join(p.root, 'invalid-history');
    await expect(exportBundle(p, undefined, { out, limit: 1 })).rejects.toThrow('cycle');
    expect(await exists(out)).toBe(false);
    first.previous = 'missing'; await p.save(first);
    await expect(exportBundle(p, undefined, { out, limit: 1 })).rejects.toThrow('missing');
    expect(await exists(out)).toBe(false);
  });

  it('fails the entire export when a predecessor lacks a requested locale, while allowing explicit narrower selections', async () => {
    const p = await fixture(); await ready(p, 'first', undefined, ['en-US']); await ready(p, 'last', 'first');
    const out = path.join(p.root, 'missing-translation');
    await expect(exportBundle(p, undefined, { out })).rejects.toThrow('Release first has no ko-KR locale');
    expect(await exists(out)).toBe(false);
    const recent = await exportBundle(p, undefined, { out, limit: 1 });
    expect(recent.files).toHaveLength(2);
    expect(recent.releases).toBe(1);
    const english = await exportBundle(p, undefined, { out: path.join(p.root, 'english'), locale: 'en-US' });
    expect(english.files).toHaveLength(1);
    expect(english.releases).toBe(2);
  });

  it('creates no locale files or assets when a translation is stale', async () => {
    const p = await fixture(); await ready(p, 'first', undefined, undefined, true);
    const file = await p.releaseFile('first', 'notes/queue/ko-KR.md');
    await writeNote(file, { ...await readNote(file), sourceHash: 'outdated' });
    const out = path.join(p.root, 'stale');
    await expect(exportBundle(p, undefined, { out })).rejects.toThrow('stale');
    expect(await exists(out)).toBe(false);
  });

  it.each(['0', '1.5', '101', 'invalid'])('rejects invalid CLI history limit %s before creating output', async limit => {
    const p = await fixture(); await ready(p, 'first');
    const result = cli(p, ['--limit', limit, '--out', './invalid']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).error).toContain('History limit');
    expect(await exists(path.join(p.root, 'invalid'))).toBe(false);
  });

  it('preserves an existing destination during multilingual export', async () => {
    const p = await fixture(); await ready(p, 'first');
    const out = path.join(p.root, 'existing'); await fs.mkdir(out);
    const file = path.join(out, 'release-notes.en-US.json'); await fs.writeFile(file, 'Existing output\n');
    await expect(exportBundle(p, undefined, { out })).rejects.toThrow('already exists');
    expect(await fs.readFile(file, 'utf8')).toBe('Existing output\n');
    expect(await fs.readdir(out)).toEqual(['release-notes.en-US.json']);
  });
});
