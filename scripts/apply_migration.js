const fs = require('fs');
const path = require('path');

let Client;
try {
  Client = require('pg').Client;
} catch {
  try {
    Client = require(path.join(__dirname, '../backend/node_modules/pg')).Client;
  } catch {
    try {
      Client = require(path.join(process.cwd(), 'node_modules/pg')).Client;
    } catch {
      console.warn('[apply_migration] Cannot load pg module, skipping migration gracefully.');
      process.exit(0);
    }
  }
}

const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[apply_migration] ADMIN_DATABASE_URL hoặc DATABASE_URL chưa được cấu hình, bỏ qua chạy migration.');
  process.exit(0);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const fileArg = process.argv[2] || '031_treatment_lifecycle_management.sql';
  let filePath = path.join(__dirname, '../database/migrations', fileArg);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), '../database/migrations', fileArg);
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), 'database/migrations', fileArg);
  }

  if (!fs.existsSync(filePath)) {
    console.warn('[apply_migration] Không tìm thấy file migration:', filePath, '- Bỏ qua.');
    return;
  }

  console.log('[apply_migration] Đọc migration file:', filePath);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('[apply_migration] Kết nối Supabase PostgreSQL...');
  await client.connect();

  console.log('[apply_migration] Thực thi SQL...');
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-schema-migration'))");
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[apply_migration] Migration thực thi thành công!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.warn('[apply_migration] Migration warning (có thể đã được áp dụng trước đó):', error.message);
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.warn('[apply_migration] Không thể chạy migration:', err.message);
  // Không exit 1 để không làm sập tiến trình khởi động backend production
  process.exit(0);
});
