import { createApp } from './server.js';
import { prisma } from './lib/prisma.js';
import { createStore, validateSharedSchema } from './store.js';

async function main() {
  const store = createStore(prisma);
  await validateSharedSchema(store);
  const app = createApp(store,{ jwtSecret:process.env.JWT_SECRET ?? '',zaloAuthUrl:process.env.ZALO_AUTH_URL,zaloAppSecret:process.env.ZALO_APP_SECRET });
  app.listen(Number(process.env.PORT ?? 5000),'0.0.0.0',()=>console.log('Mini App API connected to the shared schema'));
}

main().catch(async error=>{
  const message = error instanceof Error ? error.message : '';
  console.error(message.startsWith('Database does not match database/schema.sql:') || message === 'JWT_SECRET must match the shared identity backend'
    ? message : 'Database startup failed. Check shared connection and identity configuration.');
  await prisma.$disconnect();
  process.exitCode = 1;
});
