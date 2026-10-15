import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = new URL('../.relay-local/', import.meta.url);
const binary = new URL('cloudflared.exe', local);
const command = process.argv[2];
const children = new Set();
let stopping = false;
let stopWatcher;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearInterval(stopWatcher);
  for (const child of children) child.kill();
  process.exitCode = code;
}

async function install() {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('This portable installer supports Windows x64 only.');
  }
  const metadata = await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest', {
    headers: { 'User-Agent': 'MLD-private-relay-setup', Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!metadata.ok) throw new Error('Cannot read official Cloudflare release metadata.');
  const release = await metadata.json();
  const asset = release.assets?.find(item => item.name === 'cloudflared-windows-amd64.exe');
  if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? '')
    || !asset.browser_download_url.startsWith('https://github.com/cloudflare/cloudflared/releases/download/')) {
    throw new Error('Official release has no verifiable Windows executable.');
  }
  const response = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error('Cloudflare executable download failed.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (`sha256:${createHash('sha256').update(bytes).digest('hex')}` !== asset.digest) {
    throw new Error('Executable checksum mismatch; nothing installed.');
  }
  await mkdir(local, { recursive: true });
  const temporary = new URL('cloudflared.download', local);
  await writeFile(temporary, bytes);
  await rename(temporary, binary);
  await writeFile(new URL('release.json', local), JSON.stringify({ version: release.tag_name, digest: asset.digest }));
  console.log(`Verified official cloudflared ${release.tag_name}; installed inside .relay-local only.`);
}

function launch(executable, args) {
  const child = spawn(executable, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child);
  child.on('error', () => { console.error('Local relay child could not start.'); stop(1); });
  child.on('exit', () => { children.delete(child); if (!stopping) stop(1); });
  return child;
}

async function start() {
  const env = parse(await readFile(new URL('../.env.relay', import.meta.url)));
  if (!/^\d{1,64}$/.test(env.ZALO_APP_ID ?? '') || !env.ZALO_APP_SECRET?.trim()
    || (env.ZALO_RELAY_SECRET?.length ?? 0) < 32) {
    throw new Error('Fill ZALO_APP_ID, ZALO_APP_SECRET and ZALO_RELAY_SECRET in backend/.env.relay first.');
  }
  const port = Number(env.RELAY_PORT ?? 5100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid RELAY_PORT.');
  await readFile(binary);
  await readFile(new URL('../dist/relay-main.js', import.meta.url));
  // Refuse an occupied port rather than exposing an unrelated local service.
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('Relay port is occupied; stop the existing process first.')));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  await rm(new URL('stop.signal', local), { force: true });
  stopWatcher = setInterval(() => {
    readFile(new URL('stop.signal', local)).then(() => stop()).catch(error => {
      if (error.code !== 'ENOENT') { console.error('Cannot check local stop signal.'); stop(1); }
    });
  }, 1000);
  const relay = launch(process.execPath, ['dist/relay-main.js']);
  relay.stdout.on('data', chunk => process.stdout.write(chunk));
  relay.stderr.on('data', chunk => process.stderr.write(chunk));
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
    try {
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1000) });
      ready = response.ok && (await response.json()).status === 'ok';
      if (ready) break;
    } catch { /* Wait for the local listener, not an external API. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready || stopping) throw new Error('Local relay did not become healthy.');
  await rm(new URL('url.txt', local), { force: true });
  const tunnel = launch(fileURLToPath(binary), [
    'tunnel', '--no-autoupdate', '--protocol', 'http2', '--loglevel', 'info',
    '--metrics', '127.0.0.1:0', '--url', origin,
  ]);
  let tail = '';
  let published = false;
  const inspect = chunk => {
    tail = (tail + chunk.toString()).slice(-8192);
    const url = tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)?.[0];
    if (!url || published) return;
    published = true;
    writeFile(new URL('url.txt', local), `${url}\n`).catch(() => { console.error('Cannot save tunnel URL.'); stop(1); });
    console.log(`\nRender ZALO_RELAY_URL=${url}`);
    console.log('Copy ZALO_RELAY_SECRET privately from .env.relay to Render. Never share it in chat.');
    console.log('Keep this process and PC running. Press Ctrl+C to stop both relay and tunnel.');
  };
  tunnel.stdout.on('data', inspect);
  tunnel.stderr.on('data', inspect);
  const timeout = setTimeout(() => {
    if (!published) { console.error('Tunnel did not provide a URL; check the network.'); stop(1); }
  }, 60000);
  timeout.unref();
}

try {
  if (command === 'install') await install();
  else if (command === 'start') await start();
  else if (command === 'stop') {
    await mkdir(local, { recursive: true });
    await writeFile(new URL('stop.signal', local), 'stop\n');
    console.log('Stop requested for the local relay and tunnel.');
  } else throw new Error('Use: node scripts/local-relay.mjs install|start|stop');
} catch (error) {
  console.error(error?.code === 'ENOENT'
    ? 'Missing private config, build or cloudflared. Fill .env.relay, then run npm.cmd run relay:install and npm.cmd run relay:local.'
    : error instanceof Error ? error.message : 'Local relay setup failed.');
  stop(1);
}
