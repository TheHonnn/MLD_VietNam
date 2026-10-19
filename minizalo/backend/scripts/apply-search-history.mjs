import { readFile } from 'node:fs/promises';
import { prisma } from '../dist/lib/prisma.js';

try {
  const migration = JSON.parse(await readFile(new URL('../../docs/sql/003_search_history.json', import.meta.url), 'utf8'));
  if (!process.argv.includes('--apply')) {
    console.log('Dry run: creates only miniapp_search_history with RLS. Use --apply after database owner approval.');
  } else {
    await prisma.$transaction(async tx => {
      for (const statement of migration.statements) await tx.$executeRawUnsafe(statement);
    });
    console.log('miniapp_search_history migration applied. Existing business tables and records were not changed.');
  }
} catch {
  console.error('Search history migration failed. Check shared database access; credentials are not logged.');
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
