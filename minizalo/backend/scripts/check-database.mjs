import { prisma } from '../dist/lib/prisma.js';
import { createStore, validateSharedSchema } from '../dist/store.js';

try {
  await validateSharedSchema(createStore(prisma));
  console.log('Shared database schema check passed (read-only).');
} catch (error) {
  // Only report schema diagnostics; connection errors can contain credentials.
  const message = error instanceof Error ? error.message : '';
  const schemaMismatch = /^Database does not match database\/schema\.sql: [a-z0-9_., ]+$/i;
  console.error(schemaMismatch.test(message)
    ? message
    : 'Shared database check failed. Verify DATABASE_URL, connectivity, and canonical schema access.');
  process.exitCode = 1;
} finally {
  try {
    await prisma.$disconnect();
  } catch {
    console.error('Could not disconnect the database client cleanly.');
    process.exitCode = 1;
  }
}
