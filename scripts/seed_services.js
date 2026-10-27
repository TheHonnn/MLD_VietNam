const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  // 1. Thêm categories
  const categoriesSql = `
    INSERT INTO service_categories (id, name, code, icon_url, description, display_order)
    VALUES 
      (
        'dddddddd-0001-0001-0001-000000000001',
        'Chăm sóc da & Trị liệu',
        'SKINCARE',
        'https://cdn-icons-png.flaticon.com/512/3163/3163195.png',
        'Liệu trình chăm sóc chuyên sâu phục hồi, căng bóng và làm sáng da',
        1
      ),
      (
        'dddddddd-0001-0001-0001-000000000002',
        'Gội đầu Dưỡng sinh',
        'HEAD_SPA',
        'https://cdn-icons-png.flaticon.com/512/2622/2622075.png',
        'Gội đầu thảo dược kết hợp ấn huyệt đả thông kinh lạc vùng đầu, cổ vai gáy',
        2
      ),
      (
        'dddddddd-0001-0001-0001-000000000003',
        'Massage Body & Thư giãn',
        'BODY_MASSAGE',
        'https://cdn-icons-png.flaticon.com/512/2865/2865620.png',
        'Massage thư giãn toàn thân bằng tinh dầu thiên nhiên và đá muối khoáng',
        3
      ),
      (
        'dddddddd-0001-0001-0001-000000000004',
        'Thẩm mỹ Công nghệ cao',
        'HI_TECH_BEAUTY',
        'https://cdn-icons-png.flaticon.com/512/4371/4371510.png',
        'Nâng cơ trẻ hóa, cấy vi chất phục hồi và công nghệ làm đẹp tiên tiến',
        4
      )
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
  `;
  await client.query(categoriesSql);
  console.log('✅ Categories upserted successfully!');

  // 2. Thêm services
  const servicesSql = `
    INSERT INTO services (id, category_id, name, slug, short_description, full_description, duration_minutes, price, discount_price, image_url, steps, benefits, is_featured)
    VALUES 
      (
        'eeeeeeee-0001-0001-0001-000000000001',
        'dddddddd-0001-0001-0001-000000000001',
        'Chăm sóc Da Mặt Chuyên Sâu Hydro-Care',
        'cham-soc-da-mat-hydro-care',
        'Làm sạch sâu đa tầng, cấp ẩm tầng sâu và phục hồi hàng rào bảo vệ da căng bóng.',
        'Quy trình phục hồi làn da dịu nhẹ chuẩn y khoa kết hợp máy đẩy tinh chất sóng siêu âm, giúp cải thiện tức thì làn da khô ráp, xỉn màu và thiếu sức sống.',
        75,
        650000.00,
        490000.00,
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881',
        '["Soi da phân tích 3D", "Tẩy trang thảo mộc", "Xông hơi & hút dầu thừa", "Điện di tinh chất HA", "Đắp mặt nạ sinh học Collagen", "Chiếu ánh sáng sinh học", "Massage đầu cổ thư giãn"]'::jsonb,
        '["Da ẩm mượt tức thì", "Mờ thâm sạm và sáng đều màu", "Thu nhỏ lỗ chân lông", "Tăng độ đàn hồi tự nhiên"]'::jsonb,
        TRUE
      ),
      (
        'eeeeeeee-0001-0001-0001-000000000002',
        'dddddddd-0001-0001-0001-000000000002',
        'Gội Đầu Dưỡng Sinh Thảo Dược Cổ Vai Gáy',
        'goi-dau-duong-sinh-thao-duoc',
        'Nấu thảo mộc tươi tự nhiên, bấm huyệt lưu thông khí huyết và giải tỏa áp lực.',
        'Kết hợp nước thảo mộc đun nấu từ bồ kết, sả, hà thủ ô cùng kỹ thuật day ấn 14 đường kinh lạc vùng đầu, giúp ngủ sâu giấc và giảm đau đầu nhanh chóng.',
        60,
        390000.00,
        299000.00,
        'https://images.unsplash.com/photo-1519823551278-64ac92734fb1',
        '["Khai mở huyệt đạo", "Gội nước thảo mộc lần 1", "Massage ấn huyệt vùng đầu", "Gội nước thảo dược lần 2", "Ủ xả dưỡng mượt tóc", "Trị liệu cổ vai gáy", "Sấy tạo kiểu & thưởng trà"]'::jsonb,
        '["Giảm đau đầu, mất ngủ", "Lưu thông khí huyết", "Tóc chắc khỏe óng mượt", "Thư giãn tinh thần tuyệt đối"]'::jsonb,
        TRUE
      ),
      (
        'eeeeeeee-0001-0001-0001-000000000003',
        'dddddddd-0001-0001-0001-000000000003',
        'Massage Trị Liệu Dưỡng Sinh Đông Y',
        'massage-tri-lieu-duong-sinh-dong-y',
        'Giải phóng co cơ, bấm huyệt sâu kinh lạc và phục hồi năng lượng thể chất.',
        'Sử dụng tinh dầu gừng ấm kết hợp đá nóng bazan tự nhiên chườm ấm dọc cột sống, đặc trị hội chứng mỏi vai gáy văn phòng và nhức mỏi lưng eo.',
        90,
        850000.00,
        680000.00,
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
        '["Ngâm chân thảo dược", "Khởi động làm ấm cơ thể", "Massage lưng với tinh dầu ấm", "Chườm đá nóng bazan", "Trị liệu chuyên sâu vai gáy", "Massage tay chân", "Thư giãn vùng đầu"]'::jsonb,
        '["Tan biến co cứng cơ", "Tăng cường tuần hoàn máu", "Giấc ngủ trọn vẹn", "Phục hồi thể lực nhanh chóng"]'::jsonb,
        TRUE
      )
    ON CONFLICT (slug) DO UPDATE SET 
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      duration_minutes = EXCLUDED.duration_minutes,
      short_description = EXCLUDED.short_description;
  `;
  await client.query(servicesSql);
  console.log('✅ Services upserted successfully!');

  // Cập nhật dịch vụ Lưu phù bạch huyết để có slug & description đầy đủ
  await client.query(`
    UPDATE services 
    SET 
      slug = 'luu-phu-bach-huyet',
      short_description = COALESCE(short_description, 'Điều trị dẫn lưu phù bạch huyết chuyên sâu chuẩn Vodder y khoa Quốc tế'),
      full_description = COALESCE(full_description, 'Kỹ thuật kích hoạt dẫn lưu dòng chảy dịch bạch huyết, giảm sưng nề sau phẫu thuật và thải độc sâu cơ thể.')
    WHERE id = '235166f2-66c9-4231-bbe1-af91b48fc67c' AND (slug IS NULL OR slug = '');
  `);

  const allSrv = await client.query('SELECT id, name, price, duration_minutes FROM services ORDER BY created_at ASC');
  console.log('--- ALL SERVICES IN DB ---');
  console.table(allSrv.rows);

  await client.end();
}

seed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
