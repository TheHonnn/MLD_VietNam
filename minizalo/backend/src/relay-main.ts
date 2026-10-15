import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createZaloRelay } from './zalo-relay.js';

try {
  // Keep database/JWT configuration out of the Vietnam-only relay process.
  const loaded = config({ path: resolve(__dirname, '../.env.relay'), override: true });
  if (loaded.error) throw new Error('Private relay configuration is missing');
  const app = createZaloRelay({
    zaloAppId: process.env.ZALO_APP_ID,
    zaloAppSecret: process.env.ZALO_APP_SECRET,
    relaySecret: process.env.ZALO_RELAY_SECRET ?? '',
  });
  const port = Number(process.env.RELAY_PORT ?? 5100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid relay port');
  app.listen(port, '127.0.0.1', () => console.log(`Private Zalo relay listening on 127.0.0.1:${port}`))
    .on('error', () => { console.error('Relay listener failed'); process.exitCode = 1; });
} catch {
  console.error('Relay startup failed. Check ZALO_APP_ID, ZALO_APP_SECRET, ZALO_RELAY_SECRET and RELAY_PORT.');
  process.exitCode = 1;
}
