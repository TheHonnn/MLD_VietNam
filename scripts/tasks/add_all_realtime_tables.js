const { Client } = require('../../backend/node_modules/pg');
const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
});

async function run() {
  await client.connect();
  const tables = ['tuition_transactions', 'course_enrollments', 'user_packages', 'users'];
  for (const t of tables) {
    try {
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${t};`);
      await client.query(`ALTER TABLE public.${t} REPLICA IDENTITY FULL;`);
      console.log(`Added ${t} to supabase_realtime.`);
    } catch (e) {
      console.log(`Notice on ${t}: ${e.message}`);
    }
  }

  const pubRes = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log('All tables in supabase_realtime publication:');
  console.table(pubRes.rows);
  await client.end();
}
run().catch(console.error);
