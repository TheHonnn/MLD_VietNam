const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seedTechnicians() {
  await client.connect();
  
  // 1. Users table
  await client.query(`
    INSERT INTO public.users (
      id, phone, full_name, purpose, role, membership_tier,
      reward_points, total_spent, referral_code, is_active,
      is_phone_verified, is_email_verified
    ) VALUES 
    (
      'cccccccc-0001-0001-0001-000000000001', '0901112233', 'Trần Lan Anh',
      'BOTH', 'TECHNICIAN', 'STANDARD', 0, 0, 'REF-TECH01', true, true, false
    ),
    (
      'cccccccc-0001-0001-0001-000000000002', '0902223344', 'Lê Quỳnh Nga',
      'BOTH', 'TECHNICIAN', 'STANDARD', 0, 0, 'REF-TECH02', true, true, false
    )
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
  `);
  console.log('✅ Users table updated with technicians');

  // 2. Technicians table
  await client.query(`
    INSERT INTO public.technicians (
      id, user_id, branch_id, full_name, title, avatar_url,
      experience_years, rating_avg, review_count, specialties, is_active
    ) VALUES
    (
      'cccccccc-0001-0001-0001-000000000001',
      'cccccccc-0001-0001-0001-000000000001',
      'aaaaaaaa-0001-0001-0001-000000000001',
      'Trần Lan Anh',
      'Chuyên viên Trị liệu MLD Cấp cao',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956',
      5, 5.0, 48, '["Dẫn lưu bạch huyết", "Chăm sóc sau phẫu thuật"]', true
    ),
    (
      'cccccccc-0001-0001-0001-000000000002',
      'cccccccc-0001-0001-0001-000000000002',
      'aaaaaaaa-0001-0001-0001-000000000001',
      'Lê Quỳnh Nga',
      'Chuyên viên Chăm sóc da & Dưỡng sinh',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      3, 4.9, 32, '["Massage bấm huyệt", "Dưỡng sinh cổ vai gáy"]', true
    )
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, branch_id = EXCLUDED.branch_id, is_active = true;
  `);
  console.log('✅ Technicians table updated successfully');

  await client.end();
}

seedTechnicians();
