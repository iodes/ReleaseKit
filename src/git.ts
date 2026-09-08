import { spawnSync } from 'node:child_process';
import type { Release } from './model.js';

interface GitChanges {
  source: Release['source'];
  commits: Array<{ sha: string; subject: string }>;
  files: Array<{ status: string; path: string; oldPath?: string }>;
}

export function git(cwd: string, args: string[], input?: string): string {
  const result = spawnSync('git', args, {
    cwd, input, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
  });
  if (result.error) throw new Error(`Git could not complete the request: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`git ${args[0]}: ${result.stderr.trim() || 'command failed'}`);
  return result.stdout;
}
export function repoRoot(cwd: string): string {
  return git(cwd, ['rev-parse', '--show-toplevel']).trim();
}
export function resolveCommit(root: string, ref: string): string {
  if (!ref || ref.startsWith('-')) throw new Error('A Git reference must name a commit, branch, or tag.');
  return git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
}
export function isAncestor(root: string, base: string, head: string): boolean {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', base, head], { cwd: root, windowsHide: true, encoding: 'utf8' });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(`Cannot establish Git ancestry: ${result.stderr || result.error?.message}`);
}
export function resolveRange(root: string, from: string | null, to: string): Release['source'] {
  if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('Complete the shallow Git history before preparing a release; no fetch was performed.');
  }
  const toSha = resolveCommit(root, to);
  const fromSha = from === null ? null : resolveCommit(root, from);
  if (fromSha === toSha) throw new Error('The start and end resolve to the same commit; the range is empty.');
  if (fromSha && !isAncestor(root, fromSha, toSha)) {
    throw new Error('The start commit is not an ancestor of the end commit. Choose an explicit range on this release line.');
  }
  return { fromRef: from, fromSha, toRef: to, toSha };
}
export function collect(root: string, from: string | null, to: string): GitChanges {
  const source = resolveRange(root, from, to);
  const { fromSha, toSha } = source;
  const base = fromSha ?? git(root, ['hash-object', '-t', 'tree', '--stdin'], '').trim();
  const log = git(root, ['log', '--no-show-signature', '--format=%H%x00%s', fromSha ? `${fromSha}..${toSha}` : toSha, '--']);
  const commits = log.trimEnd() ? log.trimEnd().split('\n').map(line => {
    const separator = line.indexOf('\0');
    return { sha: line.slice(0, separator), subject: line.slice(separator + 1) };
  }) : [];
  const names = git(root, ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '--find-renames', base, toSha, '--']).split('\0');
  const files: GitChanges['files'] = [];
  for (let i = 0; i < names.length - 1;) {
    const status = names[i++]!;
    const first = names[i++]!;
    if (/^[RC]/.test(status)) files.push({ status, oldPath: first, path: names[i++]! });
    else files.push({ status, path: first });
  }
  return { source, commits, files };
}
export function collectSnapshot(root: string, to: string): GitChanges {
  const source = resolveRange(root, null, to);
  const subject = git(root, ['show', '--no-show-signature', '--no-patch', '--format=%s', source.toSha, '--']).trimEnd();
  const paths = git(root, ['ls-tree', '-r', '--name-only', '-z', source.toSha, '--']);
  return {
    source, commits: [{ sha: source.toSha, subject }],
    files: paths.split('\0').filter(Boolean).map(path => ({ status: 'A', path })),
  };
}
export function checkPrevious(root: string, previous: Release, source: Release['source']): void {
  const boundary = source.fromSha;
  if (!boundary || !isAncestor(root, previous.source.toSha, boundary)) {
    throw new Error('The previous release is not an ancestor of this comparison start. Choose the correct previous release.');
  }
}
