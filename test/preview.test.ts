import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { get } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture, fillNote, cleanup, png, sampleScene } from './helpers.js';
import { prepare } from '../src/project.js';
import { addNote, markTranslation } from '../src/content.js';
import { readNote, readYaml, writeNote, writeYaml, digest } from '../src/files.js';
import { visualSchema } from '../src/model.js';
import { importImage } from '../src/images.js';
import { createPreviewLoader } from '../src/preview-content.js';
import { startPreview } from '../src/preview.js';

const servers: Awaited<ReturnType<typeof startPreview>>[] = [];
const children: ChildProcess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise<void>(resolve => { child.once('exit', () => resolve()); child.kill(); });
    }
  }
  await Promise.all(servers.splice(0).map(server => server.close()));
  await cleanup();
});

async function draft(image = false, policy: 'both' | 'dark' | 'light' = 'both') {
  const project = await fixture(policy);
  const config = await project.config();
  config.locales = ['en-US', 'ko-KR'];
  await writeYaml(await project.content('config.yaml'), config);
  await prepare(project, '1.0.0', { fromRoot: true });
  await fillNote(project, '1.0.0', image);
  return project;
}
async function tree(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const item of await fs.readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!item.isFile()) continue;
    const file = path.join(item.parentPath, item.name);
    result[path.relative(directory, file)] = digest(await fs.readFile(file));
  }
  return result;
}

describe('draft preview content', () => {
  it('reads actual saved copy and ordered notes without changing source files or marking translations', async () => {
    const project = await draft();
    await addNote(project, '1.0.0', 'second', 'fix', true);
    const before = await tree(await project.content('releases'));
    const { snapshot } = await createPreviewLoader(project, '1.0.0', 'ko')();
    expect(snapshot.notes.map(note => note.id)).toEqual(['queue', 'second']);
    expect(snapshot.notes[0]!.texts['ko-KR']).toMatchObject({ title: '대기열 1.0.0', state: 'current' });
    expect(snapshot.notes[0]!.texts['ko-KR']!.bodyHtml).toContain('스와이프');
    expect(snapshot.notes[1]!.texts['en-US']!.state).toBe('incomplete');
    expect(snapshot.notes[1]!.image).toEqual({ state: 'pending', variants: {} });
    expect(snapshot.initialLocale).toBe('en-US');
    expect(snapshot.localeFallback).toBe(true);
    expect(await tree(await project.content('releases'))).toEqual(before);
  });

  it('selects a complete preferred locale, detects source and alt changes, and recovers after translation review', async () => {
    const project = await draft();
    const load = createPreviewLoader(project, '1.0.0', 'ko');
    const first = (await load()).snapshot;
    expect(first.initialLocale).toBe('ko-KR');
    expect(first.localeFallback).toBe(false);
    const file = await project.releaseFile('1.0.0', 'notes/queue/en-US.md');
    await writeNote(file, { ...await readNote(file), alt: 'Updated accessible image description' });
    const changed = (await load()).snapshot;
    expect(changed.revision).not.toBe(first.revision);
    expect(changed.locales).toContainEqual({ code: 'ko-KR', state: 'stale' });
    expect(changed.initialLocale).toBe('en-US');
    expect(changed.notes[0]!.texts['ko-KR']!.title).toBe(first.notes[0]!.texts['ko-KR']!.title);
    await markTranslation(project, '1.0.0', 'queue', 'ko-KR');
    expect((await load()).snapshot.initialLocale).toBe('ko-KR');
    expect((await createPreviewLoader(project, '1.0.0', 'ja')()).snapshot.initialLocale).toBe('en-US');
  });

  it('shows missing, incomplete, and invalid files independently and recovers after atomic updates', async () => {
    const project = await draft();
    const file = await project.releaseFile('1.0.0', 'notes/queue/ko-KR.md');
    const saved = await readNote(file);
    const load = createPreviewLoader(project, '1.0.0');
    await fs.unlink(file);
    expect((await load()).snapshot.notes[0]!.texts['ko-KR']!.state).toBe('missing');
    await writeNote(file, { ...saved, title: '', body: 'A body without a title' });
    let value = (await load()).snapshot.notes[0]!;
    expect(value.texts['ko-KR']).toMatchObject({ state: 'incomplete', title: '' });
    expect(value.texts['ko-KR']!.bodyHtml).toContain('A body without a title');
    await fs.writeFile(file, '---\ntitle: [unterminated');
    value = (await load()).snapshot.notes[0]!;
    expect(value.texts['ko-KR']!.state).toBe('invalid');
    expect(value.texts['en-US']!.state).toBe('current');
    await writeNote(file, saved);
    expect((await load()).snapshot.notes[0]!.texts['ko-KR']!.state).toBe('current');
  });

  it('supports empty and source-only releases and does not confuse channels with the same version', async () => {
    const project = await fixture();
    await prepare(project, '1.0.0', { fromRoot: true });
    const release = await project.release('1.0.0');
    release.emptyReason = 'No user-visible changes in this interval.';
    await project.save(release);
    await project.save({ ...release, channel: 'stable', emptyReason: 'A different release.' });
    const plain = (await createPreviewLoader(project, '1.0.0')()).snapshot;
    const channel = (await createPreviewLoader(project, { channel: 'stable', version: '1.0.0' })()).snapshot;
    expect(plain.notes).toEqual([]);
    expect(plain.locales).toEqual([{ code: 'en-US', state: 'current' }]);
    expect(plain.emptyReason).toBe(release.emptyReason);
    expect(channel.release).toEqual({ channel: 'stable', version: '1.0.0' });
    expect(channel.emptyReason).not.toBe(plain.emptyReason);
  });

  it('renders lists, code, and safe links while escaping HTML and blocking active or arbitrary image URLs', async () => {
    const project = await draft();
    const file = await project.releaseFile('1.0.0', 'notes/queue/en-US.md');
    await writeNote(file, { ...await readNote(file), body: '- First\n- Second\n\n`a < b`\n\n[Docs](https://example.com)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![remote](https://example.com/track.png)\n\n[local](file:///private)' });
    const html = (await createPreviewLoader(project, '1.0.0')()).snapshot.notes[0]!.texts['en-US']!.bodyHtml;
    expect(html).toContain('<ul>');
    expect(html).toContain('<code>a &lt; b</code>');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).not.toMatch(/<script|<img|href="(?:javascript|file):/);
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('preview images', () => {
  it('loads real theme variants, detects replacements, pending counterparts, stale scenes, and deleted images', async () => {
    const project = await draft(true);
    const load = createPreviewLoader(project, '1.0.0');
    const first = await load();
    expect(first.assets.size).toBe(2);
    expect(first.snapshot.notes[0]!.image!.variants.dark!.state).toBe('current');
    const visualFile = await project.releaseFile('1.0.0', 'visuals/queue.yaml');
    const visual = await readYaml(visualFile, visualSchema);
    delete visual.variants.light;
    await writeYaml(visualFile, visual);
    const partial = await load();
    expect(partial.snapshot.notes[0]!.image!.variants.light!.state).toBe('missing');
    expect(partial.assets.size).toBe(1);
    const source = path.join(project.root, 'replacement.png');
    await fs.writeFile(source, await png('#4678ED'));
    await importImage(project, '1.0.0', 'queue', 'dark', source);
    const replaced = await load();
    expect(replaced.snapshot.revision).not.toBe(first.snapshot.revision);
    expect(replaced.snapshot.notes[0]!.image!.variants.dark!.src).not.toBe(first.snapshot.notes[0]!.image!.variants.dark!.src);
    const updated = await readYaml(visualFile, visualSchema);
    updated.scene.focus = 'A different supported focus';
    await writeYaml(visualFile, updated);
    expect((await load()).snapshot.notes[0]!.image!.variants.dark!.state).toBe('stale');
    await fs.unlink(await project.releaseFile('1.0.0', updated.variants.dark!.file));
    expect((await load()).snapshot.notes[0]!.image!.variants.dark!.state).toBe('missing');
  });

  it('serves supplied shared images once and retains a single-theme policy without manufacturing variants', async () => {
    const project = await draft(true, 'dark');
    const load = createPreviewLoader(project, '1.0.0');
    const single = await load();
    expect(single.snapshot.themes).toBe('dark');
    expect(Object.keys(single.snapshot.notes[0]!.image!.variants)).toEqual(['dark']);
    const source = path.join(project.root, 'supplied.png');
    const bytes = await png('#ececec');
    await fs.writeFile(source, bytes);
    await importImage(project, '1.0.0', 'queue', 'shared', source, { source: 'provided' });
    const shared = await load();
    expect(Object.keys(shared.snapshot.notes[0]!.image!.variants)).toEqual(['shared']);
    expect([...shared.assets.values()][0]!.bytes).toEqual(bytes);
  });

  it('never serves changed, non-image, or escaping asset paths', async () => {
    const project = await draft(true);
    const file = await project.releaseFile('1.0.0', 'visuals/queue.yaml');
    const visual = await readYaml(file, visualSchema);
    const original = await project.releaseFile('1.0.0', visual.variants.dark!.file);
    await fs.writeFile(original, 'not an image');
    const load = createPreviewLoader(project, '1.0.0');
    expect((await load()).snapshot.notes[0]!.image!.variants.dark!.state).toBe('invalid');
    visual.variants.dark!.file = '../../config.yaml';
    await writeYaml(file, visual);
    expect((await load()).snapshot.notes[0]!.image!.variants.dark!.src).toBeUndefined();
    visual.variants.dark!.file = 'release.yaml';
    visual.variants.dark!.sha256 = digest(await fs.readFile(await project.releaseFile('1.0.0', 'release.yaml')));
    await writeYaml(file, visual);
    expect((await load()).snapshot.notes[0]!.image!.variants.dark!.state).toBe('invalid');
    await writeYaml(file, { schemaVersion: 1, scene: { ...sampleScene, archetype: 'invalid' }, variants: {} });
    expect((await load()).snapshot.notes[0]!.image!.state).toBe('invalid');
  });
});

describe('local preview HTTP and CLI', () => {
  it('serves packaged UI and registered assets, rejects writes and foreign origins, and reflects disk changes', async () => {
    const project = await draft(true);
    const before = await tree(project.root);
    const server = await startPreview(project, '1.0.0', { locale: 'ko' });
    servers.push(server);
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    for (const resource of ['', 'app.js', 'style.css']) expect((await fetch(server.url + resource)).status).toBe(200);
    const response = await fetch(server.url + 'api/preview');
    expect(response.headers.get('content-security-policy')).toContain("form-action 'none'");
    const data = await response.json();
    const image = await fetch(new URL(data.notes[0].image.variants.dark.src, server.url));
    expect(image.headers.get('content-type')).toBe('image/png');
    expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(0);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect((await fetch(server.url + 'api/preview', { method })).status).toBe(405);
    expect((await fetch(server.url + 'api/preview', { headers: { Origin: 'https://example.com' } })).status).toBe(403);
    const foreignHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      get(server.url + 'api/preview', { headers: { Host: 'example.com' } }, incoming => {
        incoming.resume(); resolve(incoming.statusCode);
      }).once('error', reject);
    });
    expect(foreignHostStatus).toBe(403);
    expect((await fetch(server.url + 'release.yaml')).status).toBe(404);
    expect((await fetch(server.url + 'assets/..%2f..%2fconfig.yaml')).status).toBe(404);
    expect(await tree(project.root)).toEqual(before);
    const file = await project.releaseFile('1.0.0', 'notes/queue/en-US.md');
    await writeNote(file, { ...await readNote(file), title: 'Updated from the conversation' });
    const changed = await (await fetch(server.url + 'api/preview')).json();
    expect(changed.notes[0].texts['en-US'].title).toBe('Updated from the conversation');
    expect(changed.revision).not.toBe(data.revision);
    const releaseFile = await project.releaseFile('1.0.0', 'release.yaml');
    const saved = await fs.readFile(releaseFile);
    await fs.writeFile(releaseFile, 'invalid: [');
    expect((await fetch(server.url + 'api/preview')).status).toBe(503);
    await fs.writeFile(releaseFile, saved);
    expect((await fetch(server.url + 'api/preview')).status).toBe(200);
  });

  it('rejects invalid ports and unknown releases before starting a server', async () => {
    const project = await draft();
    for (const port of [-1, 65536, 1.5, NaN]) await expect(startPreview(project, '1.0.0', { port })).rejects.toThrow('port');
    await expect(startPreview(project, 'missing')).rejects.toThrow();
    await expect(startPreview(project, '../outside')).rejects.toThrow();
    await expect(startPreview(project, '1.0.0', { locale: '../outside' })).rejects.toThrow();
  });

  it('emits one JSON startup record and keeps the CLI alive until terminated', async () => {
    const project = await draft();
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--cwd', project.root, '--json', 'preview', '1.0.0', '--locale', 'ko'],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    let stdout = '', stderr = '';
    child.stderr!.on('data', data => { stderr += String(data); });
    const result = await new Promise<{ url: string; version: string; project: string }>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => reject(new Error(`CLI exited early (${code}): ${stderr}`)));
      child.stdout!.on('data', chunk => {
        stdout += String(chunk);
        try { resolve(JSON.parse(stdout)); } catch { /* Wait for the complete JSON record. */ }
      });
    });
    expect(result).toMatchObject({ version: '1.0.0', project: project.root });
    expect((await fetch(result.url + 'api/preview')).status).toBe(200);
    expect(child.exitCode).toBeNull();
    expect(JSON.parse(stdout)).toEqual(result);
    expect(stderr).toBe('');
  });
});
