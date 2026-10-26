const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));
require(path.join(__dirname, '../../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../../backend/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function checkPortal() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('=== CHECKING miniapp_shared_content ===');
  const shared = await client.query('SELECT id, kind, title, category, status, is_featured, image_url, target_link, file_url, author_name FROM miniapp_shared_content ORDER BY kind, sort_order');
  console.log(`Found ${shared.rows.length} rows in miniapp_shared_content:`);
  shared.rows.forEach((r, i) => {
    console.log(`[${i+1}] [${r.kind}] [${r.category}] status=${r.status} feat=${r.is_featured} : "${r.title}" (img: ${r.image_url ? r.image_url.substring(0, 40) + '...' : 'none'}, link: ${r.target_link || r.file_url || 'none'})`);
  });

  console.log('\n=== CHECKING OTHER CONTENT TABLES ===');
  // check home_care_guidelines
  const guides = await client.query('SELECT id, title, category, image_url, is_published FROM home_care_guidelines LIMIT 5');
  console.log(`home_care_guidelines (${guides.rows.length}):`, guides.rows);

  // check email_templates
  const templates = await client.query('SELECT id, template_code, title, subject, is_active FROM email_templates');
  console.log(`email_templates (${templates.rows.length}):`, templates.rows);

  // check email_logs
  const logs = await client.query('SELECT count(*) FROM email_logs');
  console.log(`email_logs count:`, logs.rows[0].count);

  await client.end();
}

checkPortal().catch(console.error);
