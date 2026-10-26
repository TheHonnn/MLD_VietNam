const https = require('https');

const supabaseUrl = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

async function testTable(table) {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/' + table + '?select=*', supabaseUrl);
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ table, status: res.statusCode, count: Array.isArray(json) ? json.length : 'error', data: json });
        } catch (e) {
          resolve({ table, status: res.statusCode, error: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const tables = [
    'users',
    'branches',
    'branch_rooms',
    'services',
    'treatment_packages',
    'user_packages',
    'treatment_journal',
    'technician_shifts',
    'bookings',
    'booking_items',
    'invoices',
    'courses',
    'course_batches',
    'course_enrollments',
    'tuition_transactions'
  ];

  console.log('Testing Supabase Cloud REST API with anonKey:');
  for (const t of tables) {
    const res = await testTable(t);
    console.log(`- [${res.table}]: HTTP ${res.status} | Count: ${res.count}`);
  }
}

run();
