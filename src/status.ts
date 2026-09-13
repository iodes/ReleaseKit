import { Project } from './project.js';
import { exists } from './files.js';
import type { ReleaseRef } from './model.js';
import { refKey } from './refs.js';
import { validate } from './validate.js';

export async function listReleases(project: Project, channel?: string) {
  await project.config();
  if (channel !== undefined) await project.requireChannel(channel);
  const refs = (await project.allRefs()).filter(value => channel === undefined || value.channel === channel);
  return Promise.all(refs.map(async value => {
    const release = await project.release(value);
    return { ...value, status: release.status, releasedAt: release.releasedAt, notes: release.notes.length, locales: release.locales };
  }));
}

export async function projectStatus(project: Project, selected?: ReleaseRef, channel?: string) {
  if (!(await exists(await project.content('config.yaml')))) {
    return { initialized: false, releases: [], next: ['releasekit init'] };
  }
  const config = await project.config();
  const releases = selected ? [await project.release(selected)] : await listReleases(project, channel);
  const results = await Promise.all(releases.map(async release => {
    const validation = await validate(project, release);
    const identity = refKey(release);
    const args = `${release.version}${release.channel === undefined ? '' : ` --channel ${release.channel}`}`;
    let next: string;
    if (!validation.valid) next = `Use releasekit-draft or releasekit-image for ${identity} to resolve the reported issues, then run releasekit validate ${args}.`;
    else if (release.status === 'ready') next = `releasekit export --current ${args} --out <new-directory>`;
    else {
      const predecessors = (await project.history(release)).slice(1).filter(item => item.status !== 'ready');
      next = release.channel === undefined && predecessors.length
        ? `Finalize earlier releases first: ${predecessors.reverse().map(refKey).join(', ')}.`
        : `releasekit finalize ${args}`;
    }
    return { version: release.version, ...(release.channel === undefined ? {} : { channel: release.channel }), status: release.status,
      notes: typeof release.notes === 'number' ? release.notes : release.notes.length,
      valid: validation.valid, errors: validation.errors, warnings: validation.warnings, next };
  }));
  return { initialized: true, product: config.product, releases: results,
    next: results.length ? [] : ['Use releasekit-draft with a version to select the Git range and write the first draft.'] };
}

export function formatStatus(result: Awaited<ReturnType<typeof projectStatus>>): string {
  const lines = [result.initialized ? `${result.product} — release status` : 'ReleaseKit is not initialized.'];
  for (const release of result.releases) {
    lines.push(`\n${refKey(release)}  ${release.status}  ${release.notes} notes  ${release.valid ? 'validation passed' : 'needs attention'}`);
    lines.push(...release.errors.map(error => `  - ${error}`), ...release.warnings.map(warning => `  Warning: ${warning}`));
    lines.push(`  Next: ${release.next}`);
  }
  lines.push(...result.next.map(next => `Next: ${next}`));
  return lines.join('\n');
}
