import { createApp } from './server.js';
import { prisma } from './lib/prisma.js';
import { createStore, validateSharedSchema } from './store.js';
import {startReminderScheduler} from './reminders.js';

let startupStage = 'database-connection';

function redactStartupMessage(message: string): string {
  const secrets = Object.entries(process.env)
    .filter(([key]) => /SECRET|TOKEN|PASSWORD|KEY|DATABASE_URL|DIRECT_URL/i.test(key))
    .map(([, value]) => value ?? '');
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    try {
      const url = new URL(process.env[key] ?? '');
      secrets.push(url.username, url.password, decodeURIComponent(url.username), decodeURIComponent(url.password));
    } catch {
      // Malformed connection strings are still redacted by their exact value above.
    }
  }
  for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) {
    message = message.split(secret).join('[REDACTED]');
  }
  return message.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[REDACTED_URL]').slice(0, 3000);
}

async function main() {
  const store = createStore(prisma);
  await prisma.$queryRaw`SELECT 1`;
  startupStage = 'schema-validation';
  await validateSharedSchema(store);
  startupStage = 'app-initialization';
  const app = createApp(store,{
    trustedProxyHops: /^(0|1|2|3)$/.test(process.env.TRUST_PROXY_HOPS ?? '') ? Number(process.env.TRUST_PROXY_HOPS) : 0,
    jwtSecret: process.env.JWT_SECRET ?? '',
    zaloAppId: process.env.ZALO_APP_ID,
    zaloAppSecret: process.env.ZALO_APP_SECRET,
    zaloRelayUrl: process.env.ZALO_RELAY_URL,
    zaloRelaySecret: process.env.ZALO_RELAY_SECRET,
    zaloAllowSignup: process.env.ZALO_ALLOW_SIGNUP === 'true',
  });
  const server=app.listen(Number(process.env.PORT ?? 5000),'0.0.0.0',()=>console.log('Mini App API connected to the shared schema'));
  const stopReminders=startReminderScheduler(store);
  const shutdown=()=>{stopReminders();server.close(()=>void prisma.$disconnect());};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}

main().catch(async error=>{
  const message = error instanceof Error ? error.message : '';
  const code = String(error?.errorCode ?? error?.code ?? '');
  const safeCode = /^P\d{4}$/.test(code) ? code : message.match(/\bP\d{4}\b/)?.[0];
  console.error('Startup error (credentials redacted):', redactStartupMessage(message));
  console.error('Startup diagnostic:', JSON.stringify({
    stage: startupStage,
    errorType: error instanceof Error ? error.name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80) : 'Unknown',
    code: safeCode,
    sqlState: /^[0-9A-Z]{5}$/.test(String(error?.meta?.code ?? '')) ? error.meta.code : undefined,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
    connectionUnreachable: /Can't reach|timed out|ENET|ENOTFOUND/i.test(message),
    authenticationFailed: /authentication failed|password authentication|Tenant or user not found/i.test(message),
    invalidConnectionUrl: /invalid.*(url|connection)|invalid port|Error parsing connection/i.test(message),
    tlsError: /TLS|SSL|certificate/i.test(message),
    schemaMismatch: message.startsWith('Database does not match database/schema.sql:'),
    engineError: /query engine|libssl|openssl|shared librar|Prisma Client could not locate/i.test(message),
    poolerError: /pgbouncer|prepared statement|MaxClients|pool_size|circuit breaker/i.test(message),
    accessDenied: /permission denied|access denied|not permitted/i.test(message),
    saslError: /SASL|SCRAM/i.test(message),
  }));
  console.error(message.startsWith('Database does not match database/schema.sql:') || message === 'JWT_SECRET is required'
    ? message : 'Database startup failed. Check shared connection and identity configuration.');
  await prisma.$disconnect();
  process.exitCode = 1;
});
