import { z } from 'zod';

export const segment = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,95}$/);
export const sha = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
export const locale = z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/);
export const theme = z.enum(['dark', 'light']);
export type Theme = z.infer<typeof theme>;
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const paletteSchema = z.strictObject({
  canvas: color, surface: color, raised: color, primary: color, secondary: color, divider: color,
});
export const visualPolicySchema = z.strictObject({
  themes: z.enum(['both', 'dark', 'light']),
  preset: z.literal('quiet-product'),
  width: z.number().int().min(256).max(4096),
  height: z.number().int().min(256).max(4096),
  accent: color,
  dark: paletteSchema,
  light: paletteSchema,
});
export type VisualPolicy = z.infer<typeof visualPolicySchema>;
export const configSchema = z.strictObject({
  schemaVersion: z.literal(1), product: z.string().min(1),
  sourceLocale: locale, locales: z.array(locale).min(1),
  history: z.strictObject({ limit: z.number().int().min(1).max(100) }),
  visuals: visualPolicySchema,
  tools: z.array(z.enum(['codex', 'claude', 'cursor'])),
});
export type ProjectConfig = z.infer<typeof configSchema>;
export const sourceSchema = z.strictObject({
  fromRef: z.string().nullable(), fromSha: sha.nullable(), toRef: z.string(), toSha: sha,
});
export const noteMetaSchema = z.strictObject({
  id: segment,
  category: z.enum(['feature', 'improvement', 'fix', 'security']),
  commits: z.array(sha), paths: z.array(z.string()), image: z.boolean(),
});
export type NoteMeta = z.infer<typeof noteMetaSchema>;
export const releaseSchema = z.strictObject({
  schemaVersion: z.literal(1), version: segment, releasedAt: z.iso.date(),
  previous: segment.nullable(), status: z.enum(['draft', 'ready']),
  source: sourceSchema, sourceLocale: locale, locales: z.array(locale).min(1),
  visuals: visualPolicySchema, notes: z.array(noteMetaSchema),
  emptyReason: z.string().nullable(), contentHash: z.string().nullable(),
});
export type Release = z.infer<typeof releaseSchema>;
export const noteTextSchema = z.strictObject({
  title: z.string().min(1), alt: z.string(), sourceHash: z.string().nullable(),
});
export type NoteText = z.infer<typeof noteTextSchema> & { body: string };
export const archetypeSchema = z.enum([
  'icon-tile', 'symbol-pair', 'ui-detail', 'device-view', 'object-detail',
  'spatial-view', 'data-view', 'editorial-scene',
]);
export const sceneSchema = z.strictObject({
  archetype: archetypeSchema,
  subject: z.string().min(1), message: z.string().min(1),
  focus: z.string().min(1), composition: z.string().min(1),
  context: z.string(), elements: z.array(z.string()),
  preserve: z.array(z.string()), avoid: z.array(z.string()),
  text: z.array(z.string()), references: z.array(z.string()),
});
export type Scene = z.infer<typeof sceneSchema>;
export const assetSchema = z.strictObject({
  file: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sceneHash: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().positive(), height: z.number().int().positive(),
});
export const visualSchema = z.strictObject({
  schemaVersion: z.literal(1), scene: sceneSchema,
  variants: z.strictObject({ dark: assetSchema.optional(), light: assetSchema.optional() }),
});
export type Visual = z.infer<typeof visualSchema>;
export const evidenceSchema = z.strictObject({
  schemaVersion: z.literal(1), source: sourceSchema,
  commits: z.array(z.strictObject({ sha, subject: z.string() })),
  files: z.array(z.strictObject({ status: z.string(), path: z.string(), oldPath: z.string().optional() })),
});
export type Evidence = z.infer<typeof evidenceSchema>;
const exportedImage = z.strictObject({
  src: z.string(), width: z.number().int().positive(), height: z.number().int().positive(),
});
export const bundleSchema = z.strictObject({
  schemaVersion: z.literal(1), currentVersion: segment, locale,
  releases: z.array(z.strictObject({
    version: segment, releasedAt: z.iso.date(), previous: segment.nullable(),
    notes: z.array(z.strictObject({
      id: segment, category: noteMetaSchema.shape.category, title: z.string(), bodyMarkdown: z.string(),
      image: z.strictObject({
        alt: z.string(), fallbackTheme: theme,
        variants: z.strictObject({ dark: exportedImage.optional(), light: exportedImage.optional() }),
      }).nullable(),
    })),
  })),
});
export type Bundle = z.infer<typeof bundleSchema>;

export function themes(policy: VisualPolicy): Theme[] {
  return policy.themes === 'both' ? ['dark', 'light'] : [policy.themes];
}

export function defaultConfig(product: string): ProjectConfig {
  return {
    schemaVersion: 1, product, sourceLocale: 'ko-KR', locales: ['ko-KR', 'en-US'],
    history: { limit: 3 }, tools: ['codex', 'claude', 'cursor'],
    visuals: {
      themes: 'both', preset: 'quiet-product', width: 1280, height: 800, accent: '#4678ED',
      dark: { canvas: '#242527', surface: '#18191B', raised: '#343638', primary: '#B9BBBE', secondary: '#777B80', divider: '#46494D' },
      light: { canvas: '#F7F8FA', surface: '#FFFFFF', raised: '#ECEEF1', primary: '#494D52', secondary: '#969BA2', divider: '#DDE0E5' },
    },
  };
}
