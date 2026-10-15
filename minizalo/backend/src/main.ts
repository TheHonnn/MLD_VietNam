import { createApp } from './server.js';
import { prisma } from './lib/prisma.js';
import { createStore, validateSharedSchema } from './store.js';

async function main() {
  const store = createStore(prisma);
  await validateSharedSchema(store);
  const app = createApp(store,{ jwtSecret:process.env.JWT_SECRET ?? '',zaloAuthUrl:process.env.ZALO_AUTH_URL });
  app.listen(Number(process.env.PORT ?? 5000),'0.0.0.0',()=>console.log('Mini App API connected to the shared schema'));
}

main().catch(async error=>{
  const message = error instanceof Error ? error.message : '';
  const code = String(error?.errorCode ?? error?.code ?? '');
  const safeCode = /^P\d{4}$/.test(code) ? code : message.match(/\bP\d{4}\b/)?.[0];
  console.error('Startup diagnostic:', JSON.stringify({
    code: safeCode,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
    connectionUnreachable: /Can't reach|timed out|ENET|ENOTFOUND/i.test(message),
    authenticationFailed: /authentication failed|password authentication|Tenant or user not found/i.test(message),
    invalidConnectionUrl: /invalid.*(url|connection)|invalid port|Error parsing connection/i.test(message),
    tlsError: /TLS|SSL|certificate/i.test(message),
    schemaMismatch: message.startsWith('Database does not match database/schema.sql:'),
  }));
  console.error(message.startsWith('Database does not match database/schema.sql:') || message === 'JWT_SECRET must match the shared identity backend'
    ? message : 'Database startup failed. Check shared connection and identity configuration.');
  await prisma.$disconnect();
  process.exitCode = 1;
});
