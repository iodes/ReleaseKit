import * as fs from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { Project, parseProjectConfig } from './project.js';
import { canonical, exists, parseYaml, write } from './files.js';

export async function migrateConfig(project: Project) {
  const file = await project.content('config.yaml');
  if (!(await exists(file))) throw new Error('ReleaseKit is not initialized. Run releasekit init first.');
  const original = await fs.readFile(file, 'utf8');
  const raw = parseYaml(original);
  const migrations: string[] = [];
  if (raw && typeof raw === 'object' && 'history' in raw && raw.history && typeof raw.history === 'object' && 'limit' in raw.history) {
    delete raw.history.limit;
    migrations.push('Removed history.limit; use export --limit to limit exported releases. Omit --limit to export all releases.');
  }
  // Validate the complete proposed configuration before touching any files.
  const config = parseProjectConfig(raw);
  if (!migrations.length) return { product: config.product, migrations, backup: null };

  const document = parseDocument(original);
  document.deleteIn(['history', 'limit']);
  let migrated = document.toString();
  if (original.includes('\r\n')) migrated = migrated.replace(/\r?\n/g, '\r\n');
  if (original.startsWith('\uFEFF') && !migrated.startsWith('\uFEFF')) migrated = '\uFEFF' + migrated;
  if (canonical(parseYaml(migrated)) !== canonical(raw)) throw new Error('Configuration migration would change unrelated settings. No files were changed.');

  const backup = await project.content('config.yaml.before-update');
  try { await fs.writeFile(backup, original, { flag: 'wx' }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (await fs.readFile(backup, 'utf8') !== original) {
      throw new Error(`A different configuration backup already exists at ${backup}. Move it aside before running update again; no files were overwritten.`);
    }
  }
  if (await fs.readFile(file, 'utf8') !== original) throw new Error('Configuration changed during update. Run update again; the configuration was not overwritten.');
  await write(file, migrated);
  return { product: config.product, migrations, backup };
}
