import { channelRefSchema, type Release, type ReleaseId, type ReleaseRef } from './model.js';
import { identifier } from './files.js';

export function ref(value: ReleaseId): ReleaseRef {
  const result = typeof value === 'string' ? { version: value } : value;
  identifier(result.version);
  if (result.channel !== undefined) {
    channelRefSchema.parse({ channel: result.channel, version: result.version });
    identifier(result.channel);
  }
  return result.channel === undefined ? { version: result.version } : { channel: result.channel, version: result.version };
}
export function refKey(value: ReleaseId): string {
  const item = ref(value);
  return item.channel === undefined ? item.version : `${item.channel}/${item.version}`;
}
export function parseRef(value: string): ReleaseRef {
  const parts = value.split('/');
  if (parts.length === 1) return ref(value);
  if (parts.length !== 2) throw new Error(`Expected channel/version: ${value}`);
  return ref({ channel: parts[0]!, version: parts[1]! });
}
export function previousRef(release: Release): ReleaseRef | null {
  return release.previous === null ? null : ref(release.previous);
}
export function link(value: ReleaseRef | undefined): Release['previous'] {
  return value === undefined ? null : value.channel === undefined ? value.version : ref(value) as { channel: string; version: string };
}
