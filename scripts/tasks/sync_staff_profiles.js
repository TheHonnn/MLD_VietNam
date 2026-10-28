const { Client } = require('../../backend/node_modules/pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase Cloud PostgreSQL.');

  const res = await client.query(`
    INSERT INTO public.staff_profiles (id, user_id, branch_id, employee_code, position)
    SELECT 
      t.user_id, 
      t.user_id, 
      t.branch_id, 
      'KTV-' || LPAD(ROW_NUMBER() OVER (ORDER BY t.id)::TEXT, 4, '0'), 
      t.title
    FROM public.technicians t
    WHERE t.user_id IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE SET branch_id = EXCLUDED.branch_id
    RETURNING id, employee_code, position;
  `);

  console.log('Staff profiles inserted/updated:', res.rows);
  await client.end();
}

main().catch(console.error);
