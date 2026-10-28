const { Client } = require('../../backend/node_modules/pg');
const DATABASE_URL = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function auditPermissions() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const query = await client.query(`
    SELECT 
      t.table_name,
      COALESCE(bool_or(tp.grantee = 'anon' AND tp.privilege_type = 'SELECT'), false) as anon_can_select,
      COALESCE(bool_or(tp.grantee = 'anon' AND tp.privilege_type IN ('INSERT', 'UPDATE')), false) as anon_can_write,
      COALESCE(bool_or(tp.grantee = 'authenticated' AND tp.privilege_type = 'SELECT'), false) as auth_can_select,
      COALESCE(bool_or(tp.grantee = 'authenticated' AND tp.privilege_type IN ('INSERT', 'UPDATE')), false) as auth_can_write
    FROM information_schema.tables t
    LEFT JOIN information_schema.table_privileges tp 
      ON tp.table_name = t.table_name AND tp.table_schema = 'public'
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `);

  console.log('=== TABLE PRIVILEGES FOR ANON & AUTHENTICATED ===');
  const noSelectForAnon = query.rows.filter(r => !r.anon_can_select);
  console.log(`Tables where 'anon' CANNOT SELECT (${noSelectForAnon.length}):`);
  noSelectForAnon.forEach(r => {
    console.log(`  - ${r.table_name.padEnd(32)} | Auth select: ${r.auth_can_select} | Auth write: ${r.auth_can_write}`);
  });

  await client.end();
}

auditPermissions().catch(console.error);
