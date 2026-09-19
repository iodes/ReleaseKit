import * as fs from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { Project } from './project.js';
import { locale, type ReleaseId } from './model.js';
import { ref } from './refs.js';
import { createPreviewLoader } from './preview-content.js';

export interface PreviewOptions { locale?: string; port?: number }

export async function startPreview(project: Project, identity: ReleaseId, options: PreviewOptions = {}) {
  ref(identity);
  if (options.locale !== undefined) locale.parse(options.locale);
  if (options.port !== undefined && (!Number.isSafeInteger(options.port) || options.port < 0 || options.port > 65535)) {
    throw new Error('Preview port must be an integer from 0 to 65535. Use 0 to choose an available port.');
  }
  const load = createPreviewLoader(project, identity, options.locale);
  await load(); // Fail before listening for unknown or unreadable release metadata.
  const files = new Map<string, { bytes: Buffer; type: string }>();
  for (const [route, name, type] of [
    ['/', 'index.html', 'text/html; charset=utf-8'],
    ['/app.js', 'app.js', 'text/javascript; charset=utf-8'],
    ['/style.css', 'style.css', 'text/css; charset=utf-8'],
  ]) files.set(route!, { bytes: await fs.readFile(new URL(`../kit/preview/${name}`, import.meta.url)), type: type! });

  let origin = '';
  // Serialize snapshots so slow reads cannot arrive after newer snapshots.
  let pending: ReturnType<typeof load> | undefined;
  const snapshot = () => pending ??= load().finally(() => { pending = undefined; });
  const server = createServer((request, response) => {
    const send = (status: number, type: string, body: string | Buffer) => {
      response.writeHead(status, { 'Content-Type': type });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    void (async () => {
      if (request.headers.host !== new URL(origin).host || (request.headers.origin !== undefined && request.headers.origin !== origin)) {
        send(403, 'text/plain', 'This preview only accepts same-origin local requests.'); return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        send(405, 'text/plain', 'Preview is read-only.'); return;
      }
      const pathname = new URL(request.url ?? '/', origin).pathname;
      if (pathname !== '/' && request.headers['sec-fetch-site'] === 'cross-site') {
        send(403, 'text/plain', 'Cross-site resource requests are not allowed.'); return;
      }
      const file = files.get(pathname);
      if (file) { send(200, file.type, file.bytes); return; }
      if (pathname === '/api/preview') {
        const loaded = await snapshot();
        send(200, 'application/json; charset=utf-8', JSON.stringify(loaded.snapshot)); return;
      }
      if (/^\/assets\/[^/]+\/(?:dark|light|shared)\/[a-f0-9]{64}$/.test(pathname)) {
        const loaded = await snapshot();
        const asset = loaded.assets.get(pathname);
        if (asset) { send(200, asset.type, asset.bytes); return; }
      }
      send(404, 'text/plain', 'Preview resource not found.');
    })().catch(() => send(503, 'application/json', JSON.stringify({ error: 'The saved release cannot be read right now. Retrying automatically.' })));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Preview did not receive a local port.');
  origin = `http://127.0.0.1:${address.port}`;
  return {
    url: `${origin}/`, project: project.root, ...ref(identity),
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

export async function openPreview(url: string): Promise<void> {
  // Only open the URL produced by our loopback server; never interpolate shell input.
  if (!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(url)) throw new Error('Expected a local preview URL.');
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Browser opener exited with code ${code}.`)));
  });
}
