import express from 'express';
import { randomBytes } from 'node:crypto';
import { createApp } from '../dist/server.js';
import { prisma } from '../dist/lib/prisma.js';
import { createStore, validateSharedSchema } from '../dist/store.js';

// Local catalog preview only. Do not use this process as the production API.
try {
  const store = createStore(prisma);
  await validateSharedSchema(store);
  const app = express();
  app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return res.status(403).json({ error: 'Read-only preview' });
    next();
  });
  app.use(createApp(store, { jwtSecret: randomBytes(32).toString('hex') }));
  const server = app.listen(Number(process.env.PREVIEW_PORT || 5107), '127.0.0.1', () => console.log('Read-only Mini App preview ready'));
  const close = () => server.close(() => { void prisma.$disconnect(); });
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
} catch {
  console.error('Read-only preview could not connect to the shared database.');
  await prisma.$disconnect();
  process.exitCode = 1;
}
