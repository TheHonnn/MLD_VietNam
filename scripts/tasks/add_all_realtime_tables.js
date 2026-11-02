const { Client } = require('../../backend/node_modules/pg');
const client = new Client({
  connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL),
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
