import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseDocument, stringify } from 'yaml';
import type { ZodType } from 'zod';
import { noteTextSchema, segment, type NoteText } from './model.js';

export const KIT_DIR = 'releasekit';
export function digest(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
export function identifier(value: string): string {
  segment.parse(value);
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value) || value.endsWith('.')) {
    throw new Error(`Unsupported filesystem identifier: ${value}`);
  }
  return value;
}
export async function exists(file: string): Promise<boolean> {
  try { await fs.stat(file); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
function contained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export async function within(root: string, relative: string): Promise<string> {
  if (!relative || path.isAbsolute(relative) || /^[A-Za-z]:/.test(relative) || relative.includes('\\') || relative.split('/').includes('..')) {
    throw new Error(`Expected a contained relative path: ${relative}`);
  }
  const absoluteRoot = path.resolve(root);
  const result = path.resolve(absoluteRoot, relative);
  if (!contained(absoluteRoot, result)) throw new Error(`Path escapes its content directory: ${relative}`);
  let ancestor = result;
  while (!(await exists(ancestor))) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error(`Cannot resolve path: ${relative}`);
    ancestor = parent;
  }
  let rootAncestor = absoluteRoot;
  while (!(await exists(rootAncestor))) rootAncestor = path.dirname(rootAncestor);
  const realRoot = path.resolve(await fs.realpath(rootAncestor), path.relative(rootAncestor, absoluteRoot));
  if (!contained(realRoot, path.resolve(await fs.realpath(ancestor), path.relative(ancestor, result)))) {
    throw new Error(`Symbolic link escapes its content directory: ${relative}`);
  }
  return result;
}
export async function write(file: string, content: string | Uint8Array): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, { flag: 'wx' });
  try { await fs.rename(temporary, file); } catch (error) {
    await fs.unlink(temporary).catch(() => undefined);
    throw error;
  }
}
export async function writeYaml(file: string, value: unknown): Promise<void> {
  await write(file, stringify(value, { lineWidth: 100 }));
}
export function parseYaml(text: string): unknown {
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length || document.warnings.length) {
    throw new Error([...document.errors, ...document.warnings].map(e => e.message).join('\n'));
  }
  return document.toJS({ maxAliasCount: 50 });
}
export async function readYaml<T>(file: string, schema: ZodType<T>): Promise<T> {
  try { return schema.parse(parseYaml(await fs.readFile(file, 'utf8'))); }
  catch (error) { throw new Error(`${file}: ${error instanceof Error ? error.message : error}`); }
}
export async function readNote(file: string): Promise<NoteText> {
  const contents = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(contents);
  if (!match) throw new Error(`Missing Markdown frontmatter: ${file}`);
  const metadata = noteTextSchema.parse(parseYaml(match[1]!));
  return { ...metadata, body: match[2]!.trim() };
}
export function noteHash(note: NoteText): string {
  return digest(canonical({ title: note.title, alt: note.alt, body: note.body }));
}
export async function writeNote(file: string, note: NoteText): Promise<void> {
  const { body, ...metadata } = note;
  await write(file, `---\n${stringify(metadata)}---\n\n${body.trim()}\n`);
}
