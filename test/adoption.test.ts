import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { Project, prepare, startProject, type StartOptions } from '../src/project.js';
import { collect, collectSnapshot, git } from '../src/git.js';
import { validate, finalize } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { exists, writeNote } from '../src/files.js';
import { addNote, markTranslation } from '../src/content.js';
import { cleanup, commit, fixture } from './helpers.js';

afterEach(cleanup);

async function fillTextNote(project: Project, version: string) {
  await addNote(project, version, 'queue', 'feature', false);
  const release = await project.release(version);
  release.notes[0]!.paths = ['app.txt'];
  await project.save(release);
  for (const language of release.locales) {
    await writeNote(await project.releaseFile(version, `notes/queue/${language}.md`), {
      title: 'Queue', body: 'Add a saved item to the queue.', alt: '', sourceHash: null,
    });
    if (language !== release.sourceLocale) await markTranslation(project, version, 'queue', language);
  }
}

describe('adopting ReleaseKit in an existing project', () => {
  it('saves a skipped past before the next commit exists and retains the pinned boundary after a tag moves', async () => {
    const p = await fixture('light');
    const base = git(p.root, ['rev-parse', 'HEAD']).trim();
    git(p.root, ['tag', '-a', 'adoption', '-m', 'Adoption boundary']);
    const start = await startProject(p, { at: 'adoption', past: 'skip' });
    expect(start).toEqual({ ref: 'adoption', sha: base, past: 'skip', version: null });
    expect((await p.config()).history.start).toEqual(start);
    expect((await p.config()).visuals.themes).toBe('light');
    expect(await p.versions()).toEqual([]);
    await expect(prepare(p, 'next', {})).rejects.toThrow('same commit');
    expect(await exists(await p.releaseDir('next'))).toBe(false);

    const next = await commit(p.root, 'initial\nqueue\n', 'Add queue');
    git(p.root, ['tag', '-f', 'adoption', next]);
    const draft = await prepare(p, 'next', {});
    expect(draft.source).toEqual({ fromRef: 'adoption', fromSha: base, toRef: 'HEAD', toSha: next });
    expect(draft.previous).toBeNull();
    expect(draft.initialContent).toBeUndefined();
    expect(collect(p.root, draft.source.fromSha, draft.source.toSha).commits.map(c => c.sha)).toEqual([next]);
    await fillTextNote(p, 'next');
    await finalize(p, 'next');
    const output = await exportBundle(p, 'next', { out: path.join(p.root, 'output') });
    expect(output.releases).toBe(1);
    await commit(p.root, 'initial\nqueue\nlater\n', 'Later change');
    await expect(prepare(p, 'later', {})).rejects.toThrow('Specify --from');
    expect((await prepare(p, 'later', { previous: 'next' })).source.fromSha).toBe(next);
  });

  it('grounds a summary in its snapshot and links future releases without including the past twice', async () => {
    const p = await fixture();
    const rootCommit = git(p.root, ['rev-parse', 'HEAD']).trim();
    await fs.writeFile(path.join(p.root, 'removed.txt'), 'An abandoned capability\n');
    git(p.root, ['add', '--', 'removed.txt']);
    const obsolete = await commit(p.root, 'initial\nprototype\n', 'Prototype');
    await fs.unlink(path.join(p.root, 'removed.txt'));
    git(p.root, ['add', '--', 'removed.txt']);
    const base = await commit(p.root, 'initial\nqueue\n', 'Product at adoption', 'adoption');
    await startProject(p, { at: 'adoption', past: 'summary', version: 'baseline' });
    await fs.writeFile(path.join(p.root, 'later.txt'), 'A future feature\n');
    git(p.root, ['add', '--', 'later.txt']);
    const next = await commit(p.root, 'initial\nqueue\nfuture\n', 'Future feature');
    git(p.root, ['tag', '-f', 'adoption', next]);
    await fs.writeFile(path.join(p.root, 'app.txt'), 'Uncommitted state\n');

    await expect(prepare(p, 'next', {})).rejects.toThrow('Prepare the configured baseline');
    await expect(prepare(p, 'baseline', { to: 'adoption' })).rejects.toThrow('pinned history start');
    expect(await p.versions()).toEqual([]);
    const baseline = await prepare(p, 'baseline', { date: '2026-01-02' });
    expect(baseline.source).toEqual({ fromRef: null, fromSha: null, toRef: 'adoption', toSha: base });
    expect(baseline.initialContent).toBe('summary');
    expect(baseline.releasedAt).toBe('2026-01-02');
    expect(await fs.readdir(await p.releaseDir('baseline'))).toEqual(['release.yaml']);
    const snapshot = collectSnapshot(p.root, baseline.source.toSha);
    expect(snapshot.commits.map(c => c.sha)).toEqual([base]);
    expect(snapshot.files.map(f => f.path)).toEqual(['app.txt']);
    expect(git(p.root, ['show', base + ':app.txt'])).not.toContain('future');

    await fillTextNote(p, 'baseline');
    const edited = await p.release('baseline');
    for (const outside of [rootCommit, obsolete, next]) {
      edited.notes[0]!.commits = [outside];
      await p.save(edited);
      expect((await validate(p, 'baseline')).errors.join()).toContain('outside the baseline snapshot');
    }
    edited.notes[0]!.commits = [base];
    for (const outside of ['removed.txt', 'later.txt']) {
      edited.notes[0]!.paths = [outside];
      await p.save(edited);
      expect((await validate(p, 'baseline')).errors.join()).toContain('outside the baseline snapshot');
    }
    edited.notes[0]!.paths = ['app.txt'];
    await p.save(edited);
    expect((await finalize(p, 'baseline')).valid).toBe(true);

    const following = await prepare(p, 'next', {});
    expect(following.previous).toBe('baseline');
    expect(following.source.fromSha).toBe(base);
    expect(following.initialContent).toBeUndefined();
    expect(collect(p.root, following.source.fromSha, following.source.toSha).commits.map(c => c.sha)).toEqual([next]);
    await fillTextNote(p, 'next');
    await finalize(p, 'next');
    const gitDirectory = path.resolve(p.root, '.git');
    const unavailableDirectory = path.resolve(p.root, 'unavailable-git');
    expect(path.dirname(gitDirectory)).toBe(p.root);
    expect(path.dirname(unavailableDirectory)).toBe(p.root);
    await fs.rename(gitDirectory, unavailableDirectory);
    const output = await exportBundle(p, 'next', { out: path.join(p.root, 'output') });
    const bundle = JSON.parse(await fs.readFile(output.file, 'utf8'));
    expect(bundle.releases.map((r: { version: string }) => r.version)).toEqual(['next', 'baseline']);
    expect(bundle.releases.every((r: object) => !('source' in r) && !('initialContent' in r))).toBe(true);
    const tampered = await p.release('baseline');
    tampered.initialContent = 'history';
    await p.save(tampered);
    expect((await validate(p, 'baseline')).errors.join()).toContain('content changed');
  });

  it('retains full commit evidence when the author selects historical analysis', async () => {
    const p = await fixture();
    const rootCommit = git(p.root, ['rev-parse', 'HEAD']).trim();
    const base = await commit(p.root, 'initial\nqueue\n', 'Add queue', 'adoption');
    await startProject(p, { at: base, past: 'history', version: 'past' });
    await commit(p.root, 'initial\nqueue\nfuture\n', 'Future feature');
    const draft = await prepare(p, 'past', { fromRoot: true });
    expect(draft.initialContent).toBe('history');
    expect(draft.source.toSha).toBe(base);
    expect(collect(p.root, draft.source.fromSha, draft.source.toSha).commits.map(c => c.sha)).toEqual([base, rootCommit]);
    await fillTextNote(p, 'past');
    const edited = await p.release('past');
    edited.notes[0]!.commits = [rootCommit];
    await p.save(edited);
    expect((await finalize(p, 'past')).valid).toBe(true);
    expect((await prepare(p, 'next', { previous: 'past' })).source.fromSha).toBe(base);
  });

  it('rejects invalid or repeated setup without changing settings or creating release content', async () => {
    const p = await fixture();
    const configFile = await p.content('config.yaml');
    const before = await fs.readFile(configFile, 'utf8');
    const invalid: StartOptions[] = [
      { at: 'v0', past: 'summary' },
      { at: 'v0', past: 'history' },
      { at: 'v0', past: 'skip', version: 'unused' },
      { at: 'missing-tag', past: 'skip' },
      { at: 'v0', past: 'summary', version: '../escape' },
      { at: 'v0', past: 'summary', version: 'CON' },
    ];
    for (const options of invalid) {
      await expect(startProject(p, options)).rejects.toThrow();
      expect(await fs.readFile(configFile, 'utf8')).toBe(before);
      expect(await p.versions()).toEqual([]);
    }
    await startProject(p, { at: 'v0', past: 'summary', version: 'baseline' });
    const configured = await fs.readFile(configFile, 'utf8');
    await expect(startProject(p, { at: 'HEAD', past: 'skip' })).rejects.toThrow('already configured');
    expect(await fs.readFile(configFile, 'utf8')).toBe(configured);
    await expect(prepare(p, 'baseline', { from: 'v0' })).rejects.toThrow('configured baseline');
    expect(await p.versions()).toEqual([]);
    const baseline = await prepare(p, 'baseline', {});
    baseline.source.fromSha = baseline.source.toSha;
    baseline.source.fromRef = 'v0';
    baseline.emptyReason = 'No entry selected.';
    await p.save(baseline);
    expect((await validate(p, 'baseline')).errors.join()).toContain('root baseline');
  });

  it('preserves the existing explicit-range workflow and rejects setup over existing releases', async () => {
    const p = await fixture();
    expect((await p.config()).history.start).toBeUndefined();
    await commit(p.root, 'initial\nqueue\n', 'Add queue');
    const draft = await prepare(p, 'existing', { from: 'v0' });
    expect(draft.initialContent).toBeUndefined();
    await expect(startProject(p, { at: 'HEAD', past: 'skip' })).rejects.toThrow('without releases');
    await fillTextNote(p, 'existing');
    expect((await finalize(p, 'existing')).valid).toBe(true);
    expect((await validate(p, 'existing')).valid).toBe(true);
  });

  it('supports first-use choices through the CLI and requires an explicit past mode', async () => {
    const p = await fixture();
    const nested = path.join(p.root, 'directory with spaces');
    await fs.mkdir(nested);
    const packageRoot = fileURLToPath(new URL('../', import.meta.url));
    const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', nested, '--json', ...args], {
      cwd: packageRoot, encoding: 'utf8', windowsHide: true,
    });
    expect(run('start', '--at', 'v0').status).toBe(1);
    expect(run('start', '--at', 'v0', '--past', 'unknown').status).toBe(1);
    expect((await p.config()).history.start).toBeUndefined();
    const started = run('start', '--at', 'v0', '--past', 'summary', '--baseline-version', 'baseline');
    expect(started.stderr).toBe('');
    expect(started.status).toBe(0);
    const choice = JSON.parse(started.stdout);
    await commit(p.root, 'initial\nqueue\n', 'Add queue');
    const prepared = run('prepare', 'baseline');
    expect(prepared.stderr).toBe('');
    expect(prepared.status).toBe(0);
    expect(JSON.parse(prepared.stdout)).toMatchObject({ initialContent: 'summary', source: { toSha: choice.sha } });
    expect(run('prepare', 'next', '--previous', 'baseline').status).toBe(0);
  });
});
