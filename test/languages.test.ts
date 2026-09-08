import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepare } from '../src/project.js';
import { addNote, markTranslation } from '../src/content.js';
import { readNote, writeNote, noteHash } from '../src/files.js';
import { validate, finalize } from '../src/validate.js';
import { exportBundle } from '../src/export.js';
import { fixture, fillNote, cleanup } from './helpers.js';

afterEach(cleanup);

describe('release language selection', () => {
  it('initializes, scaffolds, and exports English originals without requiring a translation', async () => {
    const p = await fixture();
    expect(await p.config()).toMatchObject({ sourceLocale: 'en-US', locales: ['en-US'] });
    const release = await prepare(p, '1', { fromRoot: true });
    expect(release).toMatchObject({ sourceLocale: 'en-US', locales: ['en-US'] });
    await fillNote(p, '1', false);
    expect(await fs.readdir(await p.releaseFile('1', 'notes/queue'))).toEqual(['en-US.md']);
    const source = await readNote(await p.releaseFile('1', 'notes/queue/en-US.md'));
    expect(source.sourceHash).toBeNull();
    await expect(markTranslation(p, '1', 'queue', 'en-US')).rejects.toThrow('source locale');
    await expect(markTranslation(p, '1', 'queue', 'ko-KR')).rejects.toThrow('configured translation');
    expect((await finalize(p, '1')).valid).toBe(true);
    const output = await exportBundle(p, '1', { out: path.join(p.root, 'output') });
    const bundle = JSON.parse(await fs.readFile(output.file, 'utf8'));
    expect(bundle.locale).toBe('en-US');
    expect(bundle.releases[0].notes[0].bodyMarkdown).toBe(source.body);
  });

  it('saves additional translation languages per release and fingerprints each against the English source', async () => {
    const p = await fixture();
    const release = await prepare(p, '1', { fromRoot: true });
    release.locales.push('ko-KR', 'ja-JP', 'de-DE');
    await p.save(release);
    await addNote(p, '1', 'queue', 'feature', false);
    const current = await p.release('1');
    current.notes[0]!.paths = ['app.txt'];
    await p.save(current);
    expect(await fs.readdir(await p.releaseFile('1', 'notes/queue'))).toEqual(['de-DE.md', 'en-US.md', 'ja-JP.md', 'ko-KR.md']);
    const copy = {
      'en-US': { title: 'Queue', body: 'Add a saved item to the queue.' },
      'ko-KR': { title: '대기열', body: '저장한 항목을 대기열에 추가할 수 있습니다.' },
      'ja-JP': { title: 'キュー', body: '保存した項目をキューに追加できます。' },
      'de-DE': { title: 'Warteschlange', body: 'Füge einen gespeicherten Eintrag zur Warteschlange hinzu.' },
    };
    for (const [language, text] of Object.entries(copy)) {
      await writeNote(await p.releaseFile('1', `notes/queue/${language}.md`), { ...text, alt: '', sourceHash: null });
    }
    expect((await validate(p, '1')).valid).toBe(false);
    const source = await readNote(await p.releaseFile('1', 'notes/queue/en-US.md'));
    for (const language of release.locales.filter(language => language !== release.sourceLocale)) {
      expect(await markTranslation(p, '1', 'queue', language)).toBe(noteHash(source));
    }
    expect((await finalize(p, '1')).valid).toBe(true);
    for (const [language, text] of Object.entries(copy)) {
      const output = await exportBundle(p, '1', { locale: language, out: path.join(p.root, `output-${language}`) });
      const bundle = JSON.parse(await fs.readFile(output.file, 'utf8'));
      expect(bundle.locale).toBe(language);
      expect(bundle.releases[0].notes[0].bodyMarkdown).toBe(text.body);
    }
    expect(await p.config()).toMatchObject({ sourceLocale: 'en-US', locales: ['en-US'] });
    expect((await p.release('1')).sourceLocale).toBe('en-US');
    const next = await prepare(p, 'independent', { fromRoot: true });
    expect(next).toMatchObject({ sourceLocale: 'en-US', locales: ['en-US'] });
  });
});
