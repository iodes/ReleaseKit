import * as fs from 'node:fs/promises';
import path from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { git } from '../src/git.js';
import { fixture, commit, cleanup } from './helpers.js';

interface Step { name?: string; run?: string; env?: Record<string, string> }
interface Workflow {
  name: string;
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<string, { steps: Step[] }>;
}
interface Registry { versions?: string[]; status?: number; body?: unknown; disconnect?: boolean }

const publish = parse(await fs.readFile(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8')) as Workflow;
const steps = publish.jobs.publish!.steps;
const versionStep = steps.find(step => step.name === 'Validate release branch and calculate version')!;
const script = versionStep.run!.match(/^node --input-type=module <<'NODE'\n([\s\S]+)\nNODE\s*$/)![1]!;

async function packageFixture() {
  const p = await fixture();
  const name = '@example/package';
  const version = '0.0.0';
  await fs.writeFile(path.join(p.root, 'package.json'), JSON.stringify({ name, version, type: 'module' }));
  await fs.writeFile(path.join(p.root, 'package-lock.json'), JSON.stringify({
    name, version, lockfileVersion: 3, packages: { '': { name, version } },
  }));
  return p;
}

async function calculate(root: string, registry: Registry = {}, env: NodeJS.ProcessEnv = {}) {
  const output = path.join(root, 'workflow-output');
  const summary = path.join(root, 'workflow-summary');
  await fs.writeFile(output, '');
  await fs.writeFile(summary, '');
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url!);
    if (registry.disconnect) { request.socket.destroy(); return; }
    response.writeHead(registry.status ?? 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(registry.body ?? { versions: Object.fromEntries((registry.versions ?? []).map(version => [version, {}])) }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test registry port');
    const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], {
      cwd: root, windowsHide: true,
      env: { ...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_TYPE: 'branch',
        GITHUB_REF_NAME: 'release/0.1.0', GITHUB_SHA: git(root, ['rev-parse', 'HEAD']).trim(),
        GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary, ...env,
        NPM_CONFIG_REGISTRY: `http://127.0.0.1:${address.port}/` },
    }).then(result => ({ ...result, status: 0 }), error => ({ stdout: error.stdout, stderr: error.stderr, status: error.code }));
    return { ...result, requests, output: await fs.readFile(output, 'utf8'), summary: await fs.readFile(summary, 'utf8') };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

function expectVersion(result: Awaited<ReturnType<typeof calculate>>, version: string) {
  expect(result.status, result.stderr).toBe(0);
  expect(result.output).toBe(`version=${version}\ntag=v${version}\n`);
  expect(result.summary).toBe('');
}
function expectFailure(result: Awaited<ReturnType<typeof calculate>>) {
  expect(result.status).not.toBe(0);
  expect(result.output).toBe('');
  expect(result.summary.length).toBeGreaterThan(0);
}

afterEach(cleanup);

describe('automatic release versions', () => {
  it('starts an unpublished package at the branch version', async () => {
    const p = await packageFixture();
    expectVersion(await calculate(p.root, { status: 404 }), '0.1.0');
  });

  it('advances to 0.1.1 when 0.1.0 exists only on npm', async () => {
    const p = await packageFixture();
    const result = await calculate(p.root, { versions: ['0.1.0'] });
    expectVersion(result, '0.1.1');
    expect(result.requests).toEqual(['/%40example%2Fpackage']);
  });

  it.each(['v0.1.0', '0.1.0'])('advances from Git tag %s even if npm has no releases', async tag => {
    const p = await packageFixture();
    git(p.root, ['tag', tag]);
    expectVersion(await calculate(p.root, { status: 404 }), '0.1.1');
  });

  it('uses the highest patch from both sources in numeric order', async () => {
    const p = await packageFixture();
    for (const tag of ['v0.1.9', 'v0.1.2', 'v0.0.99', 'v99.0.0.0', 'v99.0.0-beta.1', 'v01.0.0']) git(p.root, ['tag', tag]);
    expectVersion(await calculate(p.root, { versions: ['0.1.10', '0.1.3', '2.0.0-beta.1'] }), '0.1.11');
  });

  it('advances again on the same branch and commit after a tag is created', async () => {
    const p = await packageFixture();
    const head = git(p.root, ['rev-parse', 'HEAD']);
    for (const version of ['0.1.1', '0.1.2']) {
      expectVersion(await calculate(p.root, { versions: ['0.1.0'] }), version);
      git(p.root, ['tag', '-a', 'v' + version, '-m', 'Release fixture']);
    }
    expect(git(p.root, ['rev-parse', 'HEAD'])).toBe(head);
  });

  it('respects a nonzero starting patch', async () => {
    const p = await packageFixture();
    const env = { GITHUB_REF_NAME: 'release/0.1.5' };
    expectVersion(await calculate(p.root, { versions: ['0.1.3'] }, env), '0.1.5');
    expectVersion(await calculate(p.root, { versions: ['0.1.7'] }, env), '0.1.8');
  });

  it('starts a newer minor line and compares minor numbers numerically', async () => {
    const p = await packageFixture();
    git(p.root, ['tag', 'v1.9.99']);
    expectVersion(await calculate(p.root, { versions: ['1.2.0'] }, { GITHUB_REF_NAME: 'release/1.10.0' }), '1.10.0');
  });

  it.each(['git', 'npm'])('blocks an older line when %s has a newer major or minor', async source => {
    const p = await packageFixture();
    for (const version of ['0.2.0', '1.0.0']) {
      if (source === 'git') git(p.root, ['tag', 'v' + version]);
      expectFailure(await calculate(p.root, { versions: source === 'npm' ? [version] : [] }));
    }
  });
});

describe('release failures', () => {
  it.each(['main', 'feature/0.1.0', 'release/01.1.0', 'release/0.1', 'release/0.1.0.1', 'release/0.1.0-beta.1'])
    ('rejects invalid branch %s before querying npm', async branch => {
      const p = await packageFixture();
      const result = await calculate(p.root, {}, { GITHUB_REF_NAME: branch });
      expectFailure(result);
      expect(result.requests).toEqual([]);
    });

  it('rejects tag dispatch, branch push, and a checkout different from the selected commit', async () => {
    const p = await packageFixture();
    const previous = git(p.root, ['rev-parse', 'HEAD']);
    await commit(p.root, 'later\n', 'Later fixture commit');
    for (const env of [{ GITHUB_REF_TYPE: 'tag' }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_SHA: previous }]) {
      const result = await calculate(p.root, {}, env);
      expectFailure(result);
      expect(result.requests).toEqual([]);
    }
  });

  it.each([401, 403, 500, 503])('stops on registry HTTP %s instead of choosing an unused-looking version', async status => {
    const p = await packageFixture();
    expectFailure(await calculate(p.root, { status }));
  });

  it.each([{}, { versions: [] }, { versions: 'invalid' }])('rejects malformed registry metadata %j', async body => {
    const p = await packageFixture();
    expectFailure(await calculate(p.root, { body }));
  });

  it('stops when the registry connection fails', async () => {
    const p = await packageFixture();
    expectFailure(await calculate(p.root, { disconnect: true }));
  });
});

describe('combined publishing', () => {
  it('calculates and applies the version before building, tagging, and publishing', () => {
    expect(publish.name).toBe('Publish');
    expect(Object.keys(publish.on)).toEqual(['workflow_dispatch']);
    expect(publish.permissions).toEqual({ contents: 'write', 'id-token': 'write' });
    const calculation = steps.indexOf(versionStep);
    const apply = steps.findIndex(step => step.name === 'Apply release version');
    const tag = steps.findIndex(step => step.name === 'Create release tag');
    const publication = steps.findIndex(step => step.name === 'Publish package');
    expect(calculation).toBeGreaterThanOrEqual(0);
    expect(apply).toBeGreaterThan(calculation);
    for (const command of ['npm run check', 'npm test', 'npm run build', 'npm pack --dry-run']) {
      const check = steps.findIndex(step => step.run === command);
      expect(check).toBeGreaterThan(apply);
      expect(check).toBeLessThan(tag);
    }
    expect(tag).toBeLessThan(publication);
  });

  it('applies the calculated version to package metadata and CLI output without a commit or tag', async () => {
    const p = await packageFixture();
    const result = await calculate(p.root, { versions: ['0.1.0'] });
    expectVersion(result, '0.1.1');
    const version = result.output.match(/^version=(.+)$/m)![1]!;
    const head = git(p.root, ['rev-parse', 'HEAD']);
    const tags = git(p.root, ['tag', '--list']);
    const apply = steps.find(step => step.name === 'Apply release version')!;
    expect(apply.env?.RELEASE_VERSION).toBe('${{ steps.version.outputs.version }}');
    const command = apply.run!.replace('"$RELEASE_VERSION"', version).split(' ');
    expect(command.shift()).toBe('npm');
    if (!process.env.npm_execpath) throw new Error('Run these tests through npm test');
    const stamped = spawnSync(process.execPath, [process.env.npm_execpath, ...command], {
      cwd: p.root, encoding: 'utf8', windowsHide: true,
    });
    expect(stamped.status, stamped.stderr).toBe(0);
    const manifest = JSON.parse(await fs.readFile(path.join(p.root, 'package.json'), 'utf8'));
    const lock = JSON.parse(await fs.readFile(path.join(p.root, 'package-lock.json'), 'utf8'));
    expect([manifest.version, lock.version, lock.packages[''].version]).toEqual([version, version, version]);
    expect(git(p.root, ['rev-parse', 'HEAD'])).toBe(head);
    expect(git(p.root, ['tag', '--list'])).toBe(tags);

    await fs.cp(new URL('../src/', import.meta.url), path.join(p.root, 'src'), { recursive: true });
    await fs.symlink(fileURLToPath(new URL('../node_modules/', import.meta.url)), path.join(p.root, 'node_modules'), 'junction');
    const cli = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--version'], {
      cwd: p.root, encoding: 'utf8', windowsHide: true,
    });
    expect(cli.status, cli.stderr).toBe(0);
    expect(cli.stdout.trim()).toBe(version);
  });
});
