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
  const [historyTable] = await store.query(Prisma.sql`SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='miniapp_search_history'`);
  if (historyTable) {
    const [history] = await store.query(Prisma.sql`SELECT count(*)::int AS count FROM miniapp_search_history`);
    counts.miniapp_search_history = history.count;
    counts.search_history_rls_enabled = historyTable.relrowsecurity;
  }
  console.log(JSON.stringify({ readOnly: true, counts }, null, 2));
  if (process.argv.includes('--compare-deployed')) {
    const checks = {};
    const catalogs = [
      { field:'services',query:Prisma.sql`SELECT s.id,s.name,s.price::text AS price,s.discount_price::text AS "discountPrice",s.image_url AS "imageUrl",s.full_description AS "fullDescription" FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active`, numeric:['price','discountPrice'] },
      { field:'branches',query:Prisma.sql`SELECT id,name,address,phone,image_url AS "imageUrl",to_char(opening_time,'HH24:MI') AS "openingTime",to_char(closing_time,'HH24:MI') AS "closingTime" FROM branches WHERE is_active`, numeric:[] },
      { field:'doctors',query:Prisma.sql`SELECT t.id,t.full_name AS "fullName",t.avatar_url AS "avatarUrl",t.bio,t.specialties FROM technicians t JOIN branches b ON b.id=t.branch_id WHERE t.is_active AND b.is_active`, numeric:[] },
      { field:'courses',query:Prisma.sql`SELECT c.id,c.title,c.tuition_fee::text AS "tuitionFee",c.deposit_amount::text AS "depositAmount",c.image_url AS "imageUrl",c.full_description AS "fullDescription" FROM courses c JOIN course_categories cat ON cat.id=c.category_id WHERE c.is_active AND cat.is_active`, numeric:['tuitionFee','depositAmount'] },
    ];
    for (const {field,query,numeric} of catalogs) {
      const local = await store.query(query);
      const response = await fetch(`https://mld-miniapp-api.onrender.com/api/${field}`, { signal: AbortSignal.timeout(60000) });
      const envelope = await response.json();
      const remote = envelope?.data?.[field];
      if (!response.ok || !Array.isArray(remote)) throw new Error('Cannot compare deployed catalog');
      const matchingIds = JSON.stringify(local.map(item=>item.id).sort())===JSON.stringify(remote.map(item=>item.id).sort());
      const byId = new Map(remote.map(item=>[item.id,item]));
      const matchingContent = matchingIds && local.every(item=>Object.entries(item).every(([key,value])=>{
        const actual=byId.get(item.id)?.[key];
        if(value==null||actual==null) return value===actual;
        return numeric.includes(key) ? Number(value)===Number(actual) : JSON.stringify(value)===JSON.stringify(actual);
      }));
      checks[field] = { sharedCount: local.length, deployedCount: remote.length, matchingIds, matchingContent };
      if (!matchingContent) process.exitCode=1;
    }
    console.log(JSON.stringify({ readOnly: true, deployedCatalogComparison: checks }, null, 2));
  }
} catch {
  console.error('Cannot inspect shared content. Check database connectivity and schema permissions.');
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
