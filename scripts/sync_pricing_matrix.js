const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const client = new Client({
  connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false }
});

async function sync() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  await client.query('BEGIN');

  try {
    // 1. Cập nhật Category chính
    const catId = '2a781221-1358-443d-a267-0ad1590f5d68';
    await client.query(`
      INSERT INTO service_categories (id, name, code, icon_url, description, display_order, is_active)
      VALUES (
        $1,
        '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        'MLD_CARE_PROGRAMS',
        'https://cdn-icons-png.flaticon.com/512/3163/3163195.png',
        'Bao gồm chăm sóc cả hệ bạch huyết sâu và hệ bạch huyết nông theo tiêu chuẩn Vodder y khoa Quốc tế.',
        1,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        icon_url = EXCLUDED.icon_url,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active;
    `, [catId]);
    console.log('✅ Service category synced.');

    // 2. Đồng bộ 3 Dịch vụ cốt lõi
    const srv1Id = '11111111-2222-3333-4444-000000000001';
    const srv2Id = '235166f2-66c9-4231-bbe1-af91b48fc67c'; // row đã có sẵn
    const srv3Id = '11111111-2222-3333-4444-000000000003';

    // Srv 1: Chăm sóc khu trú (45') - 500k
    await client.query(`
      INSERT INTO services (
        id, category_id, name, slug, short_description, full_description, 
        duration_minutes, price, discount_price, image_url, gallery_urls, 
        steps, benefits, is_featured, is_active
      ) VALUES (
        $1, $2,
        'Chăm sóc khu trú (45'')',
        'cham-soc-khu-tru-45',
        'Chăm sóc khu trú 45 phút tập trung vào vùng chỉ định, giải tỏa ứ trệ và kích hoạt hệ bạch huyết nông & sâu.',
        'Chương trình chăm sóc khu trú 45 phút áp dụng kỹ thuật dẫn lưu bạch huyết Vodder chuẩn y khoa quốc tế. Phù hợp cho khách hàng cần can thiệp tập trung tại một vùng cơ thể (mặt, cổ vai gáy, hoặc chi dưới) nhằm giải tỏa ứ trệ, giảm sưng nề và phục hồi lưu thông dịch bạch huyết nông và sâu. Giá dịch vụ đã bao gồm thuế VAT 8% theo quy định áp dụng.',
        45,
        500000.00,
        500000.00,
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
        '["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '["Đánh giá chuyên môn & khám sàng lọc vùng can thiệp", "Khai mở các trạm hạch bạch huyết trung tâm", "Thực hiện thao tác Vodder khu trú theo hướng dẫn chuyên môn", "Kích thích hệ bạch huyết sâu và nông tại vùng chỉ định", "Đánh giá lại tình trạng sưng nề và tư vấn chăm sóc tại nhà"]'::jsonb,
        '["Giảm sưng phù nề nhanh chóng tại vùng điều trị", "Kích hoạt lưu thông dịch bạch huyết nông và sâu", "Giảm cảm giác căng tức, nặng nề tại vị trí tổn thương", "Hỗ trợ hồi phục nhanh chóng sau phẫu thuật hoặc chấn thương", "An toàn tuyệt đối, nhẹ nhàng êm dịu chuẩn Vodder"]'::jsonb,
        true,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        category_id = EXCLUDED.category_id,
        short_description = EXCLUDED.short_description,
        full_description = EXCLUDED.full_description,
        duration_minutes = EXCLUDED.duration_minutes,
        price = EXCLUDED.price,
        discount_price = EXCLUDED.discount_price,
        image_url = EXCLUDED.image_url,
        steps = EXCLUDED.steps,
        benefits = EXCLUDED.benefits,
        is_featured = EXCLUDED.is_featured,
        is_active = EXCLUDED.is_active;
    `, [srv1Id, catId]);

    // Srv 2: Chăm sóc mở rộng (60') - 900k
    await client.query(`
      INSERT INTO services (
        id, category_id, name, slug, short_description, full_description, 
        duration_minutes, price, discount_price, image_url, gallery_urls, 
        steps, benefits, is_featured, is_active
      ) VALUES (
        $1, $2,
        'Chăm sóc mở rộng (60'')',
        'cham-soc-mo-rong-60',
        'Chăm sóc mở rộng 60 phút tăng cường phạm vi dẫn lưu nhiều vùng liên kết, tối ưu hóa hệ miễn dịch và tiêu sưng.',
        'Chương trình chăm sóc mở rộng 60 phút bao quát phạm vi liên kết rộng hơn trên cơ thể. Giúp kích hoạt đồng bộ cả hệ bạch huyết sâu và nông, tăng cường vận tốc hồi lưu dịch ngoại bào, đào thải độc tố tế bào và củng cố hàng rào miễn dịch tự nhiên. Thích hợp cho khách hàng sau can thiệp thẩm mỹ vừa, phù nề toàn vùng hoặc mệt mỏi thể chất kéo dài. Giá dịch vụ đã bao gồm thuế VAT 8% theo quy định áp dụng.',
        60,
        900000.00,
        900000.00,
        'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80',
        '["https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '["Thăm khám toàn diện & đo chu vi/độ căng vùng phù nề", "Khai thông trạm hạch trung tâm vùng cổ và ngực", "Dẫn lưu hệ bạch huyết nông & sâu mở rộng liên vùng", "Kỹ thuật bơm hút xoay tròn Vodder nhịp nhàng", "Ủ ấm thư giãn & cân bằng áp lực mao mạch", "Tư vấn lộ trình và hướng dẫn vận động phục hồi"]'::jsonb,
        '["Tối ưu hóa khả năng tiêu sưng nề và bầm tím diện rộng", "Đả thông dòng chảy bạch huyết đa tầng sâu - nông", "Tăng cường đào thải dịch thừa và độc tố mô kẽ", "Cải thiện giấc ngủ và trạng thái thư giãn sâu của hệ thần kinh", "Nâng cao sức đề kháng tự nhiên của cơ thể"]'::jsonb,
        true,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        category_id = EXCLUDED.category_id,
        short_description = EXCLUDED.short_description,
        full_description = EXCLUDED.full_description,
        duration_minutes = EXCLUDED.duration_minutes,
        price = EXCLUDED.price,
        discount_price = EXCLUDED.discount_price,
        image_url = EXCLUDED.image_url,
        steps = EXCLUDED.steps,
        benefits = EXCLUDED.benefits,
        is_featured = EXCLUDED.is_featured,
        is_active = EXCLUDED.is_active;
    `, [srv2Id, catId]);

    // Srv 3: Chăm sóc toàn diện (90') - 1.700k
    await client.query(`
      INSERT INTO services (
        id, category_id, name, slug, short_description, full_description, 
        duration_minutes, price, discount_price, image_url, gallery_urls, 
        steps, benefits, is_featured, is_active
      ) VALUES (
        $1, $2,
        'Chăm sóc toàn diện (90'')',
        'cham-soc-toan-dien-90',
        'Chăm sóc toàn diện 90 phút toàn thân cao cấp, dẫn lưu triệt để toàn bộ hệ bạch huyết sâu và nông từ gốc đến ngọn.',
        'Chương trình chăm sóc toàn diện 90 phút là phác đồ đỉnh cao của MLD Vietnam. Kỹ thuật viên cao cấp thực hiện dẫn lưu tuần tự trên toàn bộ hệ thống mạch bạch huyết và trạm hạch toàn thân (đầu cổ, ngực, bụng, lưng, hai tay và hai chân), kết nối sâu sắc giữa tuần hoàn nông dưới da và mạng lưới bạch huyết nội tạng sâu. Đem lại hiệu quả hồi sinh năng lượng, nhẹ nhõm toàn thân và phục hồi thể trạng tối đa. Giá dịch vụ đã bao gồm thuế VAT 8% theo quy định áp dụng.',
        90,
        1700000.00,
        1700000.00,
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
        '["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '["Đánh giá tình trạng ứ trệ hệ bạch huyết toàn thân", "Khởi động và khai thông toàn bộ trạm hạch chính (cổ, nách, bụng, bẹn)", "Dẫn lưu bạch huyết vùng ngực, bụng và nội tạng sâu", "Kỹ thuật Vodder trị liệu hai chi dưới và mu chân", "Dẫn lưu hai chi trên, lưng và vai gáy", "Dẫn lưu mặt, tai và vùng chẩm thư giãn sâu", "Đo lường chỉ số thuyên giảm & hoàn thiện phác đồ cá nhân"]'::jsonb,
        '["Phục hồi toàn diện và triệt để toàn bộ hệ thống bạch huyết cơ thể", "Loại bỏ hoàn toàn ứ trệ dịch, cảm giác nặng nề toàn thân", "Hỗ trợ thải độc tế bào cấp độ sâu nhất", "Kích thích tái tạo tế bào và trẻ hóa làn da tự nhiên", "Cân bằng hệ thần kinh thực vật, tái tạo năng lượng sống"]'::jsonb,
        true,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        category_id = EXCLUDED.category_id,
        short_description = EXCLUDED.short_description,
        full_description = EXCLUDED.full_description,
        duration_minutes = EXCLUDED.duration_minutes,
        price = EXCLUDED.price,
        discount_price = EXCLUDED.discount_price,
        image_url = EXCLUDED.image_url,
        steps = EXCLUDED.steps,
        benefits = EXCLUDED.benefits,
        is_featured = EXCLUDED.is_featured,
        is_active = EXCLUDED.is_active;
    `, [srv3Id, catId]);
    console.log('✅ 3 Core Services synced.');

    // 3. Đồng bộ 9 Gói Liệu Trình (10, 20, 30 buổi)
    const packages = [
      // 1. Chăm sóc khu trú
      {
        id: '22222222-0001-0001-0001-000000000001',
        name: 'Gói Chăm sóc khu trú (10 buổi)',
        service_id: srv1Id,
        total_sessions: 10,
        price: 4800000.00,
        discount_price: 4800000.00,
        validity_months: 3,
        description: `Liệu trình 10 buổi Chăm sóc khu trú (45'/buổi). Đơn giá 480.000đ/buổi (Tiết kiệm 200.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: '22222222-0001-0001-0001-000000000002',
        name: 'Gói Chăm sóc khu trú (20 buổi)',
        service_id: srv1Id,
        total_sessions: 20,
        price: 9200000.00,
        discount_price: 9200000.00,
        validity_months: 6,
        description: `Liệu trình 20 buổi Chăm sóc khu trú (45'/buổi). Đơn giá 460.000đ/buổi (Tiết kiệm 800.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: '22222222-0001-0001-0001-000000000003',
        name: 'Gói Chăm sóc khu trú (30 buổi)',
        service_id: srv1Id,
        total_sessions: 30,
        price: 13200000.00,
        discount_price: 13200000.00,
        validity_months: 12,
        description: `Liệu trình 30 buổi Chăm sóc khu trú (45'/buổi). Đơn giá 440.000đ/buổi (Tiết kiệm 1.800.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80'
      },

      // 2. Chăm sóc mở rộng
      {
        id: '22222222-0002-0001-0001-000000000001',
        name: 'Gói Chăm sóc mở rộng (10 buổi)',
        service_id: srv2Id,
        total_sessions: 10,
        price: 8600000.00,
        discount_price: 8600000.00,
        validity_months: 3,
        description: `Liệu trình 10 buổi Chăm sóc mở rộng (60'/buổi). Đơn giá 860.000đ/buổi (Tiết kiệm 400.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: '22222222-0002-0001-0001-000000000002',
        name: 'Gói Chăm sóc mở rộng (20 buổi)',
        service_id: srv2Id,
        total_sessions: 20,
        price: 16400000.00,
        discount_price: 16400000.00,
        validity_months: 6,
        description: `Liệu trình 20 buổi Chăm sóc mở rộng (60'/buổi). Đơn giá 820.000đ/buổi (Tiết kiệm 1.600.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: '22222222-0002-0001-0001-000000000003',
        name: 'Gói Chăm sóc mở rộng (30 buổi)',
        service_id: srv2Id,
        total_sessions: 30,
        price: 23400000.00,
        discount_price: 23400000.00,
        validity_months: 12,
        description: `Liệu trình 30 buổi Chăm sóc mở rộng (60'/buổi). Đơn giá 780.000đ/buổi (Tiết kiệm 3.600.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80'
      },

      // 3. Chăm sóc toàn diện
      {
        id: '22222222-0003-0001-0001-000000000001',
        name: 'Gói Chăm sóc toàn diện (10 buổi)',
        service_id: srv3Id,
        total_sessions: 10,
        price: 16200000.00,
        discount_price: 16200000.00,
        validity_months: 3,
        description: `Liệu trình 10 buổi Chăm sóc toàn diện (90'/buổi). Đơn giá 1.620.000đ/buổi (Tiết kiệm 800.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: '22222222-0003-0001-0001-000000000002',
        name: 'Gói Chăm sóc toàn diện (20 buổi)',
        service_id: srv3Id,
        total_sessions: 20,
        price: 30800000.00,
        discount_price: 30800000.00,
        validity_months: 6,
        description: `Liệu trình 20 buổi Chăm sóc toàn diện (90'/buổi). Đơn giá 1.540.000đ/buổi (Tiết kiệm 3.200.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: '22222222-0003-0001-0001-000000000003',
        name: 'Gói Chăm sóc toàn diện (30 buổi)',
        service_id: srv3Id,
        total_sessions: 30,
        price: 43800000.00,
        discount_price: 43800000.00,
        validity_months: 12,
        description: `Liệu trình 30 buổi Chăm sóc toàn diện (90'/buổi). Đơn giá 1.460.000đ/buổi (Tiết kiệm 7.200.000đ so với giá lẻ). Giá đã bao gồm thuế VAT 8%.`,
        image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80'
      }
    ];

    for (const pkg of packages) {
      await client.query(`
        INSERT INTO treatment_packages (
          id, name, service_id, total_sessions, price, discount_price, 
          validity_months, description, image_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          service_id = EXCLUDED.service_id,
          total_sessions = EXCLUDED.total_sessions,
          price = EXCLUDED.price,
          discount_price = EXCLUDED.discount_price,
          validity_months = EXCLUDED.validity_months,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          is_active = EXCLUDED.is_active;
      `, [
        pkg.id, pkg.name, pkg.service_id, pkg.total_sessions, pkg.price,
        pkg.discount_price, pkg.validity_months, pkg.description, pkg.image_url
      ]);
    }
    console.log(`✅ ${packages.length} Treatment packages synced successfully.`);

    await client.query('COMMIT');
    console.log('🎉 TRANSACTION COMMITTED SUCCESSFULLY!');

    // In lại bảng dữ liệu
    const srvCheck = await client.query('SELECT id, name, duration_minutes, price FROM services ORDER BY duration_minutes ASC');
    console.table(srvCheck.rows);

    const pkgCheck = await client.query('SELECT name, total_sessions, price, validity_months FROM treatment_packages ORDER BY total_sessions ASC, price ASC');
    console.table(pkgCheck.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during sync:', err);
    throw err;
  } finally {
    await client.end();
  }
}

sync().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
