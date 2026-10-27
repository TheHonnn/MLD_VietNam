const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const coursesData = [
  {
    code: 'DAO_TAO_01',
    title: 'Chương trình phát triển giảng viên và học thuật',
    tuition_fee: 35000000,
    deposit_amount: 5000000,
    level: 'ADVANCED',
    display_level: 'Chuyên gia & Giảng viên',
    total_hours: 120,
    theory_hours: 40,
    practice_hours: 80,
    total_lessons: 10,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/Chương trình phát triển giảng viên và học thuật 35.000.000.jpg',
    short_description: 'Đào tạo và chuẩn hóa đội ngũ giảng viên, chuyên gia học thuật chuyển giao phương pháp dẫn lưu bạch huyết chuẩn y khoa quốc tế.',
    full_description: 'Chương trình đỉnh cao dành riêng cho các chuyên gia, bác sĩ và chủ viện thẩm mỹ có định hướng trở thành Giảng viên đào tạo chuyển giao công nghệ MLD Vodder tiêu chuẩn Châu Âu.'
  },
  {
    code: 'DAO_TAO_02',
    title: 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề',
    tuition_fee: 20000000,
    deposit_amount: 3000000,
    level: 'ADVANCED',
    display_level: 'Chuyên sâu',
    total_hours: 90,
    theory_hours: 30,
    practice_hours: 60,
    total_lessons: 8,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết chuyên sâu cho người làm nghề.jpg',
    short_description: 'Chương trình chuyên sâu đào tạo kỹ thuật định tuyến dòng chảy bạch huyết, can thiệp xử lý phù nề sau phẫu thuật và chăm sóc bệnh lý mô mềm.',
    full_description: 'Đào tạo kỹ thuật viên làm nghề nâng cao tay nghề, thành thạo phác đồ xử lý phù nề phức tạp, tăng doanh thu và vị thế chuyên môn trong ngành spa y tế.'
  },
  {
    code: 'DAO_TAO_03',
    title: 'Dẫn lưu bạch huyết cơ bản cho người làm nghề',
    tuition_fee: 15000000,
    deposit_amount: 2000000,
    level: 'INTERMEDIATE',
    display_level: 'Cơ bản nghề',
    total_hours: 60,
    theory_hours: 24,
    practice_hours: 36,
    total_lessons: 6,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết cơ bản cho người làm nghề 15.000.000.jpg',
    short_description: 'Nắm vững giải phẫu hệ tuần hoàn bạch huyết nông, lực miết lông vũ 30-40 mmHg và các thao tác dẫn lưu toàn thân cơ bản.',
    full_description: 'Khóa học bắt buộc dành cho kỹ thuật viên spa, điều dưỡng muốn trang bị kỹ năng dẫn lưu chuẩn Vodder để tích hợp vào các dịch vụ trị liệu cao cấp.'
  },
  {
    code: 'DAO_TAO_04',
    title: 'Dẫn lưu bạch huyết nâng cao cho người làm nghề',
    tuition_fee: 25000000,
    deposit_amount: 3000000,
    level: 'ADVANCED',
    display_level: 'Nâng cao',
    total_hours: 100,
    theory_hours: 35,
    practice_hours: 65,
    total_lessons: 8,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết nâng cao cho người làm nghề 25.000.000.jpg',
    short_description: 'Kỹ thuật khai mở chuỗi hạch bạch huyết sâu, xử lý xơ hóa mô sẹo, phối hợp vật lý trị liệu phục hồi chức năng sau mổ.',
    full_description: 'Khóa nâng cao giúp kỹ thuật viên làm chủ hoàn toàn các ca lâm sàng khó, phù nề mạn tính, ứ trệ dịch chi dưới và phục hồi sau phẫu thuật thẩm mỹ lớn.'
  },
  {
    code: 'DAO_TAO_05',
    title: 'Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu',
    tuition_fee: 599000,
    deposit_amount: 200000,
    level: 'BEGINNER',
    display_level: 'Nền tảng',
    total_hours: 20,
    theory_hours: 12,
    practice_hours: 8,
    total_lessons: 5,
    category_id: '20202020-0001-0001-0001-000000000001',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg',
    short_description: 'Khóa học nhập môn chi phí hợp lý giúp người mới hiểu đúng cơ chế giải độc, tăng miễn dịch tự nhiên và kỹ thuật tự dẫn lưu cơ bản.',
    full_description: 'Dành cho bất kỳ ai quan tâm đến sức khỏe hệ tuần hoàn, muốn tự chăm sóc bản thân và gia đình hoặc tìm hiểu trước khi bước vào nghề trị liệu chuyên nghiệp.'
  },
  {
    code: 'DAO_TAO_06',
    title: 'Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT',
    tuition_fee: 30000000,
    deposit_amount: 5000000,
    level: 'ADVANCED',
    display_level: 'Chuyên sâu CDT',
    total_hours: 110,
    theory_hours: 40,
    practice_hours: 70,
    total_lessons: 9,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT 30.000.000.webp',
    short_description: 'Liệu pháp giảm phù toàn diện CDT (Complex Decongestive Therapy) kết hợp kỹ thuật dẫn lưu MLD và băng ép đa lớp short-stretch chuyên dụng.',
    full_description: 'Tiêu chuẩn vàng quốc tế trong điều trị phù bạch huyết giai đoạn 2 và 3, giúp giảm số đo chu vi chi, ngăn ngừa biến chứng loét da và xơ cứng mô mềm.'
  },
  {
    code: 'DAO_TAO_07',
    title: 'Hướng dẫn xây dựng chế độ ăn phòng ngừa bệnh lý tuyến vú',
    tuition_fee: 350000,
    deposit_amount: 100000,
    level: 'BEGINNER',
    display_level: 'Chăm sóc sức khỏe',
    total_hours: 15,
    theory_hours: 12,
    practice_hours: 3,
    total_lessons: 4,
    category_id: '20202020-0001-0001-0001-000000000001',
    image_url: 'assets/images/DaoTao/HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ 350.000.jpg',
    short_description: 'Dinh dưỡng y khoa phòng chống viêm, giảm ứ trệ estrogen thừa, bảo vệ tuyến vú và hệ bạch huyết vùng nách cho phụ nữ hiện đại.',
    full_description: 'Khóa học cung cấp thực đơn khoa học, bổ sung chất chống oxy hóa tự nhiên và lối sống sinh hoạt lành mạnh giúp phòng ngừa các u nang lành tính và bảo vệ tuyến vú.'
  },
  {
    code: 'DAO_TAO_08',
    title: 'Khoá học Chuyên đề Chăm sóc mẹ sau sinh',
    tuition_fee: 10000000,
    deposit_amount: 2000000,
    level: 'INTERMEDIATE',
    display_level: 'Chuyên đề Mẹ & Bé',
    total_hours: 45,
    theory_hours: 15,
    practice_hours: 30,
    total_lessons: 6,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH 10.000.000.jpg',
    short_description: 'Kỹ thuật thông tắc tia sữa nhẹ nhàng, tiêu phù nề chân tay và co hồi tử cung tự nhiên cho sản phụ bằng dẫn lưu bạch huyết.',
    full_description: 'Ứng dụng dẫn lưu bạch huyết Vodder chuẩn mực vào quy trình chăm sóc sản phụ sau sinh, giải quyết triệt để cương sữa và ứ trệ dịch hậu sản mà không gây đau đớn.'
  },
  {
    code: 'DAO_TAO_09',
    title: 'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú',
    tuition_fee: 350000,
    deposit_amount: 100000,
    level: 'BEGINNER',
    display_level: 'Phục hồi chức năng',
    total_hours: 16,
    theory_hours: 10,
    practice_hours: 6,
    total_lessons: 4,
    category_id: '20202020-0001-0001-0001-000000000001',
    image_url: 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú 350.000.jpg',
    short_description: 'Cẩm nang bài tập vận động, tư thế kê cao chi và kỹ thuật tự xoa vuốt dẫn lưu tại nhà tránh phù tay sau can thiệp mổ tuyến vú.',
    full_description: 'Khóa học đồng hành cùng bệnh nhân sau can thiệp tuyến vú, trang bị đầy đủ kiến thức để phát hiện sớm các dấu hiệu ứ dịch và duy trì cánh tay khỏe mạnh, linh hoạt.'
  },
  {
    code: 'DAO_TAO_10',
    title: 'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú',
    tuition_fee: 350000,
    deposit_amount: 100000,
    level: 'BEGINNER',
    display_level: 'Phục hồi sau ung thư',
    total_hours: 16,
    theory_hours: 10,
    practice_hours: 6,
    total_lessons: 4,
    category_id: '20202020-0001-0001-0001-000000000001',
    image_url: 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú 350.000.jpg',
    short_description: 'Quy trình phòng ngừa phù bạch huyết cánh tay thứ phát sau phẫu thuật nạo vét hạch nách và xạ trị điều trị ung thư vú.',
    full_description: 'Hướng dẫn chi tiết cách bảo vệ da, chăm sóc phòng nhiễm trùng da (erysipelas), bài tập bơm cơ và kỹ thuật dẫn lưu MLD tự chăm sóc dành riêng cho bệnh nhân sau phẫu thuật ung thư vú.'
  },
  {
    code: 'DAO_TAO_11',
    title: 'Lymphatic Wellness Signature Program',
    tuition_fee: 350000000,
    deposit_amount: 50000000,
    level: 'MASTER',
    display_level: 'Master VIP Signature',
    total_hours: 300,
    theory_hours: 100,
    practice_hours: 200,
    total_lessons: 15,
    category_id: '20202020-0001-0001-0001-000000000002',
    image_url: 'assets/images/DaoTao/LYMPHATIC WELLNESS SIGNATURE PROGRAM 350.000.000.jpg',
    short_description: 'Chương trình huấn luyện tinh hoa Master toàn diện: Đào tạo cá nhân 1-1, chuyển giao toàn bộ phác đồ độc quyền và hỗ trợ setup trung tâm trị liệu chuẩn quốc tế.',
    full_description: 'Chương trình Signature độc quyền cao cấp nhất của MLD Việt Nam, đồng hành trọn đời cùng chủ doanh nghiệp kiến tạo chuỗi trung tâm trị liệu bạch huyết chuẩn y khoa hàng đầu.'
  }
];

const videoPool = [
  'https://www.youtube.com/watch?v=1F2b2Uf0a88',
  'https://www.youtube.com/watch?v=e_s9dI7j81w',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ'
];

async function seed() {
  await client.connect();
  console.log('--- Seeding 11 DaoTao Courses into Supabase ---');

  // Clear existing courses (cascades to chapters, lessons, quizzes)
  await client.query('DELETE FROM public.courses;');

  const instRes = await client.query('SELECT id FROM public.instructors LIMIT 1;');
  let instructorId = instRes.rows[0]?.id;
  if (!instructorId) {
    const newInst = await client.query(`
      INSERT INTO public.instructors (id, full_name, title, avatar_url, experience_years, is_active, created_at)
      VALUES ('10101010-0001-0001-0001-000000000001', 'Master Vodder MLD', 'Giảng viên Chuyên môn Quốc tế', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2', 8, true, NOW())
      RETURNING id;
    `);
    instructorId = newInst.rows[0].id;
  }

  for (let i = 0; i < coursesData.length; i++) {
    const c = coursesData[i];
    const outcomesJson = JSON.stringify({
      course_group: c.display_level,
      target_audience: 'Kỹ thuật viên, Y bác sĩ & Người quan tâm đến sức khỏe',
      target_need: 'Nâng cao tay nghề và chăm sóc hệ bạch huyết chuyên sâu'
    });

    const courseInsert = await client.query(`
      INSERT INTO public.courses (
        category_id, primary_instructor_id, title, code, short_description, full_description,
        level, total_hours, theory_hours, practice_hours, total_lessons, tuition_fee, deposit_amount,
        learning_outcomes, certificate_title, image_url, is_featured, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      ) RETURNING id;
    `, [
      c.category_id, instructorId, c.title, c.code, c.short_description, c.full_description,
      c.level, c.total_hours, c.theory_hours, c.practice_hours, c.total_lessons, c.tuition_fee, c.deposit_amount,
      outcomesJson, `Chứng chỉ ${c.title}`, c.image_url, i < 3, true
    ]);

    const courseId = courseInsert.rows[0].id;

    // 1. Tạo Chương 1
    const ch1 = await client.query(`
      INSERT INTO public.course_chapters (course_id, chapter_order, title, description, created_at)
      VALUES ($1, 1, 'Chương 1: Kiến thức nền tảng & Giải phẫu hệ bạch huyết', 'Tổng quan về sinh lý, mao mạch và cung hạch bạch huyết', NOW())
      RETURNING id;
    `, [courseId]);
    const ch1Id = ch1.rows[0].id;

    // Bài 1 (Clip 1) - Mở khóa đầu tiên
    await client.query(`
      INSERT INTO public.course_lessons (chapter_id, lesson_order, title, lesson_type, duration_minutes, video_url, content_text, is_free_preview, created_at)
      VALUES ($1, 1, 'Bài 1: Tổng quan và nguyên lý áp lực lông vũ Vodder', 'VIDEO', 15, $2, 'Tìm hiểu mạng lưới mao mạch bạch huyết nông và kỹ thuật tiếp xúc 30-40 mmHg.', true, NOW());
    `, [ch1Id, videoPool[0]]);

    // Bài 2 (Clip 2) - Cần xem hết Clip 1 mới mở khóa
    await client.query(`
      INSERT INTO public.course_lessons (chapter_id, lesson_order, title, lesson_type, duration_minutes, video_url, content_text, is_free_preview, created_at)
      VALUES ($1, 2, 'Bài 2: Hướng dòng chảy và kỹ thuật xoay vòng (Stationary Circles)', 'VIDEO', 20, $2, 'Hướng dẫn thao tác tay xoay vòng chậm rãi định hướng dịch về trạm hạch.', false, NOW());
    `, [ch1Id, videoPool[1]]);

    // 2. Tạo Chương 2
    const ch2 = await client.query(`
      INSERT INTO public.course_chapters (course_id, chapter_order, title, description, created_at)
      VALUES ($1, 2, 'Chương 2: Thực hành lâm sàng & Phác đồ trị liệu', 'Các bước thực hành kỹ thuật trên từng vùng giải phẫu', NOW())
      RETURNING id;
    `, [courseId]);
    const ch2Id = ch2.rows[0].id;

    // Bài 3 (Clip 3)
    await client.query(`
      INSERT INTO public.course_lessons (chapter_id, lesson_order, title, lesson_type, duration_minutes, video_url, content_text, is_free_preview, created_at)
      VALUES ($1, 3, 'Bài 3: Thực hành dẫn lưu vùng cổ gáy và hạch nách', 'VIDEO', 25, $2, 'Quy trình giải phóng trạm hạch trung tâm trước khi can thiệp vùng ngoại vi.', false, NOW());
    `, [ch2Id, videoPool[2]]);

    // Bài 4 (Clip 4)
    await client.query(`
      INSERT INTO public.course_lessons (chapter_id, lesson_order, title, lesson_type, duration_minutes, video_url, content_text, is_free_preview, created_at)
      VALUES ($1, 4, 'Bài 4: Kỹ thuật bơm (Pump technique) và miết đẩy (Scoop technique)', 'VIDEO', 30, $2, 'Các kỹ thuật cổ điển Vodder dùng cho chi trên và chi dưới.', false, NOW());
    `, [ch2Id, videoPool[3]]);

    // 3. Tạo Bài kiểm tra đánh giá khóa học (Admin quản lý trong DB)
    await client.query(`
      INSERT INTO public.course_quizzes (course_id, title, total_questions, time_limit_minutes, passing_score, created_at)
      VALUES ($1, $2, 10, 15, 80, NOW());
    `, [courseId, `Bài kiểm tra đánh giá: ${c.title}`]);

    console.log(`[+] Seeded course ${i + 1}/${coursesData.length}: ${c.title}`);
  }

  console.log('--- Seeding Completed Successfully! ---');
  await client.end();
}

seed().catch(console.error);

