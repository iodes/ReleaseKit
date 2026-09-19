import * as fs from 'node:fs/promises';
import { z } from 'zod';
import MarkdownIt from 'markdown-it';
import { Project } from './project.js';
import { canonical, digest, identifier, noteHash, parseYaml } from './files.js';
import { activeVariants, noteTextSchema, visualSchema, type AssetVariant, type NoteText, type ReleaseId, type ReleaseRef } from './model.js';
import { ref } from './refs.js';
import { inspectImage } from './images.js';
import { sceneHash } from './prompts.js';

export type TextState = 'current' | 'stale' | 'incomplete' | 'missing' | 'invalid';
export interface PreviewText {
  title: string; bodyHtml: string; alt: string; state: TextState;
}
export interface PreviewImage {
  state: 'current' | 'stale' | 'missing' | 'invalid';
  src?: string; width?: number; height?: number;
}
export interface PreviewNote {
  id: string; category: string; texts: Record<string, PreviewText>;
  image: null | {
    state: 'available' | 'pending' | 'invalid';
    variants: Partial<Record<AssetVariant, PreviewImage>>;
  };
}
export interface PreviewSnapshot {
  revision: string; product: string; release: ReleaseRef; releasedAt: string; status: 'draft' | 'ready';
  sourceLocale: string; locales: { code: string; state: 'current' | 'stale' | 'incomplete' }[];
  initialLocale: string; requestedLocale?: string; localeFallback: boolean;
  themes: 'both' | 'dark' | 'light'; emptyReason: string | null; notes: PreviewNote[];
}
export interface PreviewAsset { bytes: Buffer; type: string }
export interface LoadedPreview { snapshot: PreviewSnapshot; assets: Map<string, PreviewAsset> }

const draftTextSchema = noteTextSchema.extend({ title: z.string() });
const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
// Release images have a separate, registered asset route. Markdown cannot load arbitrary URLs.
markdown.disable('image');
markdown.validateLink = value => /^(?:https?:|mailto:)/i.test(value) || value.startsWith('#');
const linkOpen = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index]!.attrSet('rel', 'noreferrer noopener');
  tokens[index]!.attrSet('target', '_blank');
  return linkOpen ? linkOpen(tokens, index, options, env, renderer) : renderer.renderToken(tokens, index, options);
};

async function readDraftText(file: string): Promise<{ text: NoteText | null; state: TextState }> {
  try {
    const contents = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(contents);
    if (!match) return { text: null, state: 'invalid' };
    const metadata = draftTextSchema.parse(parseYaml(match[1]!));
    const text = { ...metadata, body: match[2]!.trim() };
    return { text, state: text.title.trim() && text.body ? 'current' : 'incomplete' };
  } catch (error) {
    return { text: null, state: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'invalid' };
  }
}

function isVisualScaffold(raw: unknown): boolean {
  const scaffold = z.object({ schemaVersion: z.literal(1), scene: z.object({ archetype: z.literal(''), source: z.literal('') }),
    variants: z.strictObject({}) });
  return scaffold.safeParse(raw).success;
}

export function createPreviewLoader(project: Project, identity: ReleaseId, requestedLocale?: string) {
  // Cache decoded image metadata by actual bytes, not by a filename that an agent may replace.
  const inspected = new Map<string, Awaited<ReturnType<typeof inspectImage>>>();
  return async (): Promise<LoadedPreview> => {
    const release = await project.release(identity);
    const config = await project.config();
    if (!release.locales.includes(release.sourceLocale) || new Set(release.locales).size !== release.locales.length ||
        new Set(release.notes.map(note => note.id)).size !== release.notes.length) {
      throw new Error('The release must have unique note IDs and locales, including its source locale.');
    }
    const assets = new Map<string, PreviewAsset>();
    const notes: PreviewNote[] = [];
    for (const note of release.notes) {
      identifier(note.id);
      const saved = new Map<string, Awaited<ReturnType<typeof readDraftText>>>();
      for (const language of release.locales) {
        try { saved.set(language, await readDraftText(await project.releaseFile(identity, `notes/${note.id}/${language}.md`))); }
        catch { saved.set(language, { text: null, state: 'invalid' }); }
      }
      const source = saved.get(release.sourceLocale)!;
      const texts: Record<string, PreviewText> = Object.create(null) as Record<string, PreviewText>;
      for (const [language, value] of saved) {
        let state = value.state;
        if (language !== release.sourceLocale && state === 'current' &&
            (source.state !== 'current' || value.text!.sourceHash !== noteHash(source.text!))) state = 'stale';
        texts[language] = { title: value.text?.title ?? '', bodyHtml: markdown.render(value.text?.body ?? ''),
          alt: value.text?.alt ?? '', state };
      }
      const entry: PreviewNote = { id: note.id, category: note.category, texts, image: note.image ? { state: 'pending', variants: {} } : null };
      notes.push(entry);
      if (!entry.image) continue;
      try {
        const raw = parseYaml(await fs.readFile(await project.releaseFile(identity, `visuals/${note.id}.yaml`), 'utf8'));
        if (isVisualScaffold(raw)) continue;
        const visual = visualSchema.parse(raw);
        const variants = activeVariants(visual, release.visuals);
        const invalidPair = release.visuals.themes === 'both' && visual.variants.dark && visual.variants.light &&
          (visual.variants.dark.sha256 === visual.variants.light.sha256 || visual.variants.dark.width !== visual.variants.light.width ||
           visual.variants.dark.height !== visual.variants.light.height);
        for (const variant of variants) {
          const asset = visual.variants[variant];
          if (!asset) { entry.image.variants[variant] = { state: 'missing' }; continue; }
          try {
            const bytes = await fs.readFile(await project.releaseFile(identity, asset.file));
            const hash = digest(bytes);
            if (hash !== asset.sha256) throw new Error('Asset changed after import.');
            let info = inspected.get(hash);
            if (!info) {
              info = await inspectImage(bytes);
              if (inspected.size >= 64) inspected.delete(inspected.keys().next().value!);
              inspected.set(hash, info);
            }
            if (info.width !== asset.width || info.height !== asset.height) throw new Error('Asset dimensions changed.');
            const src = `/assets/${encodeURIComponent(note.id)}/${variant}/${hash}`;
            assets.set(src, { bytes, type: `image/${info.extension === 'jpg' ? 'jpeg' : info.extension}` });
            entry.image.variants[variant] = { state: asset.sceneHash === sceneHash(visual.scene, release.visuals, variant) && !invalidPair ? 'current' : 'stale',
              src, width: info.width, height: info.height };
          } catch (error) {
            entry.image.variants[variant] = { state: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'invalid' };
          }
        }
        entry.image.state = Object.values(entry.image.variants).some(image => image.src) ? 'available' :
          Object.values(entry.image.variants).some(image => image.state === 'invalid') ? 'invalid' : 'pending';
      } catch (error) {
        entry.image.state = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'pending' : 'invalid';
      }
    }
    const locales: PreviewSnapshot['locales'] = release.locales.map(code => {
      const states = notes.map(note => note.texts[code]!.state);
      return { code, state: states.some(state => !['current', 'stale'].includes(state)) ? 'incomplete' :
        states.includes('stale') ? 'stale' : 'current' };
    });
    const exact = requestedLocale && locales.find(item => item.code.toLowerCase() === requestedLocale.toLowerCase());
    const matches = requestedLocale && !requestedLocale.includes('-') ? locales.filter(item => item.code.split('-')[0] === requestedLocale.toLowerCase()) : [];
    const preferred = exact || (matches.length === 1 ? matches[0] : undefined);
    const initialLocale = preferred?.state === 'current' ? preferred.code : release.sourceLocale;
    const value: Omit<PreviewSnapshot, 'revision'> = {
      product: config.product, release: ref(release), releasedAt: release.releasedAt, status: release.status,
      sourceLocale: release.sourceLocale, locales, initialLocale, ...(requestedLocale ? { requestedLocale } : {}),
      localeFallback: !!requestedLocale && (preferred?.code !== initialLocale || preferred?.state !== 'current'),
      themes: release.visuals.themes, emptyReason: release.emptyReason, notes,
    };
    return { snapshot: { revision: digest(canonical(value)), ...value }, assets };
  };
}
