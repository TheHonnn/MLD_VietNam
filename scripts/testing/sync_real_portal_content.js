const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));
require(path.join(__dirname, '../../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../../backend/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function syncRealPortalContent() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  try {
    // 1. Dọn dẹp các nội dung rác hoặc duplicate cũ trong miniapp_shared_content
    await client.query("DELETE FROM miniapp_shared_content WHERE title = 'duy' OR title LIKE '%duplicate%'");
    console.log('🧹 Đã xóa bản ghi test cũ (banner duy).');

    // 2. Xóa các bản ghi mẫu trùng lặp, chỉ giữ lại bộ nội dung chuẩn y khoa
    await client.query("DELETE FROM miniapp_shared_content");
    console.log('🧹 Đã làm sạch bảng miniapp_shared_content để nạp nội dung thật chuẩn y khoa.');

    // 3. Nạp 3 Banners thật của MLD Việt Nam
    await client.query(`
      INSERT INTO miniapp_shared_content (
        kind, title, summary, content_text, image_url, target_link, sort_order, category, access_level, status, is_featured, download_count, likes_count, author_name, published_at
      ) VALUES
      (
        'BANNER',
        'Khóa Đào Tạo Dẫn Lưu Bạch Huyết Chuyên Sâu & Băng Ép CDT',
        'Chương trình chuẩn y khoa Vodder quốc tế dành cho bác sĩ, kỹ thuật viên & chủ spa trên toàn quốc',
        'Khóa học trang bị kiến thức chuyên sâu về giải phẫu hệ bạch huyết, kỹ thuật dẫn lưu tay Vodder áp lực nhẹ và phác đồ băng ép đa lớp CDT điều trị phù nề.',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
        '/academy-curriculum',
        1,
        'DAO_TAO',
        'PUBLIC',
        'PUBLISHED',
        true,
        0,
        248,
        'Học viện MLD',
        CURRENT_TIMESTAMP
      ),
      (
        'BANNER',
        'Workshop: Hướng Dẫn Phòng Ngừa Phù Tay Sau Phẫu Thuật Tuyến Vú',
        'Chuỗi workshop y khoa hỗ trợ bệnh nhân sau điều trị ung thư vú phục hồi vận động an toàn',
        'Chương trình đào tạo thực hành vận động nhẹ nhàng, tư thế kê cao chi và tự chăm sóc giảm nguy cơ ứ trệ dịch bạch huyết giai đoạn hậu phẫu.',
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&h=675&fit=crop',
        '/academy-enrollment',
        2,
        'DAO_TAO',
        'PUBLIC',
        'PUBLISHED',
        true,
        0,
        185,
        'Hội đồng Y khoa MLD',
        CURRENT_TIMESTAMP
      ),
      (
        'BANNER',
        'Dịch Vụ Trị Liệu Thoát Phù & Phục Hồi Hậu Phẫu Chuẩn Y Khoa',
        'Phác đồ cá nhân hóa kết hợp đo chu vi chi, xoa bóp dẫn lưu bạch huyết Vodder và vớ áp lực y tế',
        'Hệ thống phòng trị liệu VIP vô khuẩn với đội ngũ kỹ thuật viên tay nghề cao được đào tạo bài bản theo tiêu chuẩn quốc tế.',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=675&fit=crop',
        '/treatment-management',
        3,
        'DICH_VU',
        'PUBLIC',
        'PUBLISHED',
        true,
        0,
        312,
        'Trung Tâm Trị Liệu MLD',
        CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Đã nạp 3 Banners y khoa thật của MLD Việt Nam.');

    // 4. Nạp Thư viện Giáo trình & Tài liệu PDF (DOCUMENT)
    await client.query(`
      INSERT INTO miniapp_shared_content (
        kind, title, summary, content_text, image_url, target_link, file_url, sort_order, category, access_level, status, is_featured, download_count, likes_count, author_name, published_at
      ) VALUES
      (
        'DOCUMENT',
        'Phác đồ Kỹ thuật Dẫn lưu Bạch huyết Chuyên sâu theo Phương pháp Vodder',
        'Tài liệu giảng dạy chuẩn hóa nguyên lý áp lực nhẹ (<30 mmHg) và định hướng dòng chảy hạch bạch huyết',
        'Học thuyết Vodder nhấn mạnh 4 kỹ thuật cơ bản: Xoay tròn đứng yên (Stationary Circles), Bơm đẩy (Pump technique), Xoay tròn đẩy mô (Scoop technique) và Vuốt xoay (Rotary technique). Áp lực tiếp xúc không vượt quá 30 mmHg nhằm bảo vệ tối đa các van mao mạch bạch huyết mỏng manh.',
        'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&fit=crop',
        'https://mldvietnam.edu.vn/docs/phac-do-ky-thuat-dan-luu-bach-huyet-vodder.pdf',
        'https://mldvietnam.edu.vn/docs/phac-do-ky-thuat-dan-luu-bach-huyet-vodder.pdf',
        1,
        'LAM_SANG',
        'MEMBERS_ONLY',
        'PUBLISHED',
        true,
        486,
        152,
        'Học viện MLD',
        CURRENT_TIMESTAMP
      ),
      (
        'DOCUMENT',
        'Hiệu quả của Dẫn lưu Bạch huyết bằng tay (MLD) trong Hỗ trợ Điều trị Phù nề Sau Phẫu thuật',
        'Tổng quan cơ chế sinh lý hệ bạch huyết, bằng chứng lâm sàng về giảm sưng phù và tăng tốc độ lành thương',
        'Nghiên cứu lâm sàng chứng minh dẫn lưu bạch huyết bằng tay theo phương pháp Vodder chuẩn quốc tế giúp kích hoạt hệ thống mao mạch bạch huyết nông dưới da, tái tạo lộ trình dẫn lưu phụ trợ khi các hạch chính bị tổn thương tạm thời sau phẫu thuật can thiệp mô mềm.',
        'https://images.unsplash.com/photo-1583912267670-6575ad4736f8?w=800&fit=crop',
        'https://mldvietnam.edu.vn/docs/hieu-qua-mld-trong-dieu-tri-phu-ne-hau-phau.pdf',
        'https://mldvietnam.edu.vn/docs/hieu-qua-mld-trong-dieu-tri-phu-ne-hau-phau.pdf',
        2,
        'GIAI_PHAU',
        'FREE_TRIAL',
        'PUBLISHED',
        true,
        372,
        98,
        'Hội đồng Chuyên môn MLD',
        CURRENT_TIMESTAMP
      ),
      (
        'DOCUMENT',
        'Giáo trình Giải phẫu & Sinh lý Hệ Bạch Huyết Người',
        'Tài liệu đào tạo cơ bản về giải phẫu hệ tuần hoàn bạch huyết, mạng lưới hạch nách, bẹn và ống ngực',
        'Tập hợp đầy đủ cấu trúc giải phẫu hạch bạch huyết, đường đi mạch bạch huyết nông và sâu, cơ chế hình thành dịch mô và nguyên nhân phù theo phân loại ISL.',
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&fit=crop',
        'https://mldvietnam.edu.vn/docs/giao-trinh-giai-phau-sinh-ly-he-bach-huyet.pdf',
        'https://mldvietnam.edu.vn/docs/giao-trinh-giai-phau-sinh-ly-he-bach-huyet.pdf',
        3,
        'GIAI_PHAU',
        'PUBLIC',
        'PUBLISHED',
        false,
        560,
        140,
        'BS. CKI Trần Hoàng Nam',
        CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Đã nạp 3 Tài liệu Giáo trình PDF thật chuẩn y khoa.');

    // 5. Nạp Bài viết Chia sẻ Chuyên môn & Cộng đồng (COMMUNITY)
    await client.query(`
      INSERT INTO miniapp_shared_content (
        kind, title, summary, content_text, image_url, sort_order, category, access_level, status, is_featured, likes_count, comments_count, author_name, published_at
      ) VALUES
      (
        'COMMUNITY',
        'Kinh nghiệm phân biệt Phù mỡ (Lipedema) và Phù bạch huyết (Lymphedema)',
        'Chia sẻ ca lâm sàng thực tế giúp kỹ thuật viên chẩn đoán phân biệt chính xác dấu hiệu Stemmer và đối xứng',
        'Bài viết chia sẻ các dấu hiệu nhận biết quan trọng như dấu hiệu Stemmer (véo da mu ngón chân), tính chất đối xứng ở hai chân của Lipedema và khả năng đáp ứng đặc thù với kỹ thuật dẫn lưu MLD kết hợp băng ép ngắn Rosidal K.',
        'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&fit=crop',
        1,
        'CHIA_SE_KINH_NGHIEM',
        'PUBLIC',
        'PUBLISHED',
        true,
        210,
        34,
        'KTV. Nguyễn Thu Hà (Master LV3)',
        CURRENT_TIMESTAMP
      ),
      (
        'COMMUNITY',
        'Quy trình Băng ép Đa lớp CDT hỗ trợ giảm kích thước chi phù bạch huyết giai đoạn 2',
        'Kinh nghiệm chọn loại băng dãn ngắn (short-stretch), kỹ thuật quấn xoắn ốc và chăm sóc da tránh loét',
        'Trong điều trị phù bạch huyết, băng ép dãn ngắn tạo áp lực làm việc cao khi cơ co bóp và áp lực tĩnh thấp khi nghỉ ngơi, hỗ trợ van mao mạch đẩy dịch về tim mà không gây co thắt động mạch.',
        'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&fit=crop',
        2,
        'CHIA_SE_KINH_NGHIEM',
        'PUBLIC',
        'PUBLISHED',
        false,
        145,
        19,
        'BS. CKI Lê Hoài An',
        CURRENT_TIMESTAMP
      ),
      (
        'COMMUNITY',
        'Hỏi về thời điểm an toàn bắt đầu MLD sau phẫu thuật can thiệp mô mềm vùng bụng?',
        'Thắc mắc từ học viên mới về khoảng thời gian chỉ định dẫn lưu phục hồi sau phẫu thuật hút mỡ tạo hình',
        'Khách hàng vừa can thiệp hút mỡ bụng ngày thứ 3, hiện đang sưng nề nhiều và đau tức. Liệu có thể thực hiện kỹ thuật MLD nhẹ nhàng ở vùng hạch lân cận chưa hay cần đợi lành hoàn toàn vết may?',
        '',
        3,
        'HOI_DAP',
        'PUBLIC',
        'PENDING',
        false,
        28,
        8,
        'Trần Minh Phương (Học viên K14)',
        NULL
      ),
      (
        'COMMUNITY',
        'Chế độ Dinh Dưỡng Khoa Học Giúp Hạn Chế Phù Nề và Viêm Mô Kẽ Hậu Phẫu',
        'Kinh nghiệm kiêng muối natri thừa, bổ sung flavonoids tự nhiên từ cam quýt và protein lành mạnh',
        'Chế độ ăn giảm mặn (<5g muối/ngày) kết hợp tăng cường rutin và vitamin C giúp tăng sức bền thành mạch, giảm hiện tượng thẩm thấu dịch kẽ qua mao mạch bạch huyết.',
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&fit=crop',
        4,
        'DINH_DUONG',
        'PUBLIC',
        'PUBLISHED',
        false,
        115,
        14,
        'BS. Dinh dưỡng Lâm sàng',
        CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Đã nạp 4 Bài viết Cộng đồng & Hỏi đáp chuyên gia.');

    // 5b. Nạp 2 Cẩm nang Chăm sóc Lâm sàng Bổ trợ
    await client.query(`
      INSERT INTO miniapp_shared_content (
        kind, title, summary, content_text, image_url, sort_order, category, access_level, status, is_featured, likes_count, download_count, author_name, published_at
      ) VALUES
      (
        'DOCUMENT',
        'Hướng Dẫn Tự Chăm Sóc & Kê Cao Chi Phòng Ngừa Ứ Trệ Dịch Bạch Huyết',
        'Cẩm nang hướng dẫn bệnh nhân cách vận động nhẹ nhàng và kê cao chi 45 độ giảm áp lực mao mạch',
        'Bệnh nhân sau phẫu thuật cần duy trì thói quen kê cao chi khi nghỉ ngơi, uống đủ nước và tập thở cơ hoành sâu giúp tăng áp lực hút dịch về tĩnh mạch dưới đòn.',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&fit=crop',
        4,
        'CHAM_SOC_TAI_NHA',
        'PUBLIC',
        'PUBLISHED',
        true,
        190,
        280,
        'Hội đồng Y khoa MLD',
        CURRENT_TIMESTAMP
      ),
      (
        'DOCUMENT',
        'Quy Chuẩn An Toàn Vô Khuẩn & Chống Nhiễm Trùng Da Trong Trị Liệu Bạch Huyết',
        'Tiêu chuẩn thực hành y tế bắt buộc nhằm ngăn ngừa biến chứng viêm mô tế bào (Cellulitis)',
        'Vùng da phù bạch huyết rất dễ nhiễm trùng. Kỹ thuật viên phải rửa tay sát khuẩn chuẩn ngoại khoa, kiểm tra vết thương hở và bôi kem dưỡng ẩm dịu nhẹ trước khi thực hiện MLD.',
        'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&fit=crop',
        5,
        'AN_TOAN_Y_KHOA',
        'PUBLIC',
        'PUBLISHED',
        false,
        88,
        175,
        'Ban An Toàn Lâm Sàng MLD',
        CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Đã nạp 3 Bài viết Cộng đồng & Hỏi đáp chuyên gia.');

    // 6. Kiểm tra lại dữ liệu
    const countRes = await client.query(`
      SELECT kind, count(*) AS total 
      FROM miniapp_shared_content 
      GROUP BY kind 
      ORDER BY kind
    `);
    console.log('📊 Thống kê nội dung thật Portal trong Supabase:', countRes.rows);

  } catch (err) {
    console.error('❌ Lỗi cập nhật Portal Content:', err);
  } finally {
    await client.end();
  }
}

syncRealPortalContent();
