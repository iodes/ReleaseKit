import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { Project, prepare } from '../src/project.js';
import { initProject } from '../src/install.js';
import { addNote, markTranslation } from '../src/content.js';
import { git } from '../src/git.js';
import { writeNote, writeYaml, write } from '../src/files.js';
import { importImage } from '../src/images.js';
import { themes, type Scene } from '../src/model.js';

const created: string[] = [];
export const sampleScene: Scene = {
  archetype: 'ui-detail', subject: 'A saved-item list with an exposed queue action',
  message: 'A saved item can be added to the queue with one swipe.',
  focus: 'The action revealed behind the middle row',
  composition: 'Three horizontal rows; the middle row moves right and reveals one action. Crop supporting rows at the right edge.',
  context: 'An illustrative task-list interface. No performance claim.',
  elements: ['Three list rows', 'One queue action'], preserve: ['Row geometry', 'Selected middle row'],
  avoid: ['Device frame', 'Extra toolbar'], text: [], references: [],
};

export async function fixture(policy: 'both' | 'dark' | 'light' = 'both') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'releasekit-test-'));
  created.push(root);
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Fixture Author']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'core.autocrlf', 'false']);
  await commit(root, 'initial\n', 'Initial version', 'v0');
  const project = new Project(root);
  await initProject(project, { product: 'Example Workspace', themes: policy, tools: [] });
  return project;
}
export async function commit(root: string, text: string, message: string, tag?: string) {
  await fs.writeFile(path.join(root, 'app.txt'), text);
  git(root, ['add', '--', 'app.txt']);
  git(root, ['commit', '-m', message]);
  if (tag) git(root, ['tag', tag]);
  return git(root, ['rev-parse', 'HEAD']).trim();
}
export async function png(color: string, width = 128, height = 80) {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}
export async function fillNote(project: Project, version: string, image = true) {
  await addNote(project, version, 'queue', 'feature', image);
  const release = await project.release(version);
  release.notes[0]!.paths = ['app.txt'];
  await project.save(release);
  await writeNote(await project.releaseFile(version, 'notes/queue/ko-KR.md'), {
    title: `대기열 ${version}`, body: '저장한 항목을 오른쪽으로 스와이프해 대기열에 추가할 수 있습니다.',
    alt: image ? '가운데 행에서 드러난 대기열 버튼' : '', sourceHash: null,
  });
  await writeNote(await project.releaseFile(version, 'notes/queue/en-US.md'), {
    title: `Queue ${version}`, body: 'Swipe a saved item to the right to add it to the queue.',
    alt: image ? 'A queue action revealed behind the middle row' : '', sourceHash: null,
  });
  await markTranslation(project, version, 'queue', 'en-US');
  if (image) {
    await writeYaml(await project.releaseFile(version, 'visuals/queue.yaml'), { schemaVersion: 1, scene: sampleScene, variants: {} });
    for (const variant of themes(release.visuals)) {
      const file = path.join(project.root, `${variant}.png`);
      await write(file, await png(variant === 'dark' ? '#242527' : '#f7f8fa'));
      await importImage(project, version, 'queue', variant, file);
    }
  }
}
export async function release(project: Project, version: string, from: string, previous?: string, image = false) {
  await prepare(project, version, { from, to: 'HEAD', previous, date: '2026-09-08' });
  await fillNote(project, version, image);
}
export async function cleanup() {
  const parent = await fs.realpath(os.tmpdir());
  for (const root of created.splice(0)) {
    const resolved = await fs.realpath(root);
    if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('releasekit-test-')) {
      throw new Error('Refusing cleanup outside the allocated fixture directory.');
    }
    await fs.rm(resolved, { recursive: true, force: true });
  }
}
