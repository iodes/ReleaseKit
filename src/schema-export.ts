import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { configSchema, releaseSchema, visualSchema, noteTextSchema, bundleSchema } from './model.js';

const directory = fileURLToPath(new URL('../schemas/', import.meta.url));
await fs.mkdir(directory, { recursive: true });
const schemas = { config: configSchema, release: releaseSchema, visual: visualSchema, note: noteTextSchema, bundle: bundleSchema };
for (const [name, schema] of Object.entries(schemas)) {
  const json = { ...z.toJSONSchema(schema), $id: `urn:releasekit:${name}:1` };
  await fs.writeFile(`${directory}/${name}.schema.json`, JSON.stringify(json, null, 2) + '\n');
}
// Keep the generated directory aligned with the schemas the package exports.
const outputs = new Set(Object.keys(schemas).map(name => `${name}.schema.json`));
for (const file of await fs.readdir(directory)) {
  if (file.endsWith('.schema.json') && !outputs.has(file)) await fs.unlink(`${directory}/${file}`);
}
