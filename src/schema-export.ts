import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { configSchema, releaseSchema, visualSchema, noteTextSchema, evidenceSchema, bundleSchema } from './model.js';

const directory = fileURLToPath(new URL('../schemas/', import.meta.url));
await fs.mkdir(directory, { recursive: true });
for (const [name, schema] of Object.entries({ config: configSchema, release: releaseSchema, visual: visualSchema, note: noteTextSchema, evidence: evidenceSchema, bundle: bundleSchema })) {
  const json = { ...z.toJSONSchema(schema), $id: `urn:releasekit:${name}:1` };
  await fs.writeFile(`${directory}/${name}.schema.json`, JSON.stringify(json, null, 2) + '\n');
}
