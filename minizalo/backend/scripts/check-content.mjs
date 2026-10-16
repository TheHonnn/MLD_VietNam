import { Prisma } from '@prisma/client';
import { prisma } from '../dist/lib/prisma.js';
import { createStore, validateSharedSchema } from '../dist/store.js';

// Aggregate diagnostics only: never print credentials or customer records.
try {
  const store = createStore(prisma);
  await validateSharedSchema(store);
  const counts = {};
  for (const table of ['services','service_categories','branches','technicians','courses','course_categories','instructors','course_batches','course_lessons','batch_schedules','quiz_questions','technician_slots','home_care_guidelines','support_faqs','membership_tier_rules','loyalty_point_settings']) {
    const [row] = await store.query(Prisma.sql`SELECT count(*)::int AS count FROM ${Prisma.raw(`"${table}"`)}`);
    counts[table] = row.count;
  }
  const [available] = await store.query(Prisma.sql`SELECT count(*)::int AS count FROM technician_slots WHERE status='AVAILABLE' AND (slot_date+start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' > CURRENT_TIMESTAMP`);
  counts.future_available_slots = available.count;
  console.log(JSON.stringify({ readOnly: true, counts }, null, 2));
  if (process.argv.includes('--compare-deployed')) {
    const checks = {};
    for (const [table, field] of [['services','services'],['branches','branches'],['technicians','doctors'],['courses','courses']]) {
      const local = await store.query(Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE is_active ORDER BY id`);
      const response = await fetch(`https://mld-miniapp-api.onrender.com/api/${field}`, { signal: AbortSignal.timeout(60000) });
      const envelope = await response.json();
      const remote = envelope?.data?.[field];
      if (!response.ok || !Array.isArray(remote)) throw new Error('Cannot compare deployed catalog');
      checks[field] = { sharedCount: local.length, deployedCount: remote.length,
        matchingIds: JSON.stringify(local.map(item=>item.id).sort())===JSON.stringify(remote.map(item=>item.id).sort()) };
    }
    console.log(JSON.stringify({ readOnly: true, deployedCatalogComparison: checks }, null, 2));
  }
} catch {
  console.error('Cannot inspect shared content. Check database connectivity and schema permissions.');
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
