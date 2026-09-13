import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { configSchema, defaultConfig } from './model.js';
import type { InitOptions } from './install.js';

export const commaList = (value: string): string[] => value.split(',').map(s => s.trim()).filter(Boolean);
export function parseTools(value: string) {
  if (value === 'none') return [];
  const values = commaList(value);
  if (!values.length) throw new Error('Choose codex, claude, cursor, or none.');
  return configSchema.shape.tools.parse(values);
}

type Ask = (question: string) => Promise<string>;

// Collect and validate everything before initProject writes any files.
export async function collectSetup(root: string, options: InitOptions, ask: Ask, report: (message: string) => void): Promise<InitOptions> {
  const defaults = defaultConfig(path.basename(root));
  async function field<T>(label: string, fallback: string, parse: (value: string) => T): Promise<T> {
    for (;;) {
      const answer = (await ask(`${label} [${fallback}]: `)).trim() || fallback;
      try { return parse(answer); }
      catch (error) { report(error instanceof Error ? error.message : String(error)); }
    }
  }
  const product = options.product ?? await field('Product name', defaults.product, value => configSchema.shape.product.parse(value));
  const tools = options.tools ?? await field('Agent tools (codex, claude, cursor; comma-separated, or none)', defaults.tools.join(','), parseTools);
  const sourceLocale = options.sourceLocale ?? await field('Original language (locale code)', defaults.sourceLocale, value => configSchema.shape.sourceLocale.parse(value));
  const locales = options.locales ?? await field('All languages, including the original (comma-separated locale codes)', sourceLocale, value => {
    const values = configSchema.shape.locales.parse(commaList(value));
    if (!values.includes(sourceLocale) || new Set(values).size !== values.length) throw new Error(`Languages must be unique and include ${sourceLocale}.`);
    return values;
  });
  const themes = options.themes ?? await field('Image themes (both, dark, light)', defaults.visuals.themes, value => configSchema.shape.visuals.shape.themes.parse(value));
  return { product, tools, sourceLocale, locales, themes };
}

export function interactiveSetup(root: string, options: InitOptions): Promise<InitOptions> {
  return withTerminal((ask, report) => collectSetup(root, options, ask, report), 'Setup cancelled. No configuration was written.');
}

async function withTerminal<T>(collect: (ask: Ask, report: (message: string) => void) => Promise<T>, cancelled: string): Promise<T> {
  const terminal = createInterface({ input: stdin, output: stdout });
  const abort = new AbortController();
  const cancel = () => abort.abort();
  terminal.on('SIGINT', cancel);
  terminal.on('close', cancel);
  try {
    return await collect(question => {
      if (abort.signal.aborted) throw new Error(cancelled);
      return terminal.question(question, { signal: abort.signal });
    }, message => stdout.write(`${message}\n`));
  } catch (error) {
    if (abort.signal.aborted) throw new Error(cancelled);
    throw error;
  } finally { terminal.close(); }
}
