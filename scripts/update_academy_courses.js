const { Client } = require('../backend/node_modules/pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const CAT_BEGINNER = '20202020-0001-0001-0001-000000000001';
const CAT_PRO = '20202020-0001-0001-0001-000000000002';
const INSTRUCTOR_ID = '10101010-0001-0001-0001-000000000001';

const courses = [
  // 1. Dẫn lưu bạch huyết nền tảng Level 0 - 599.000
  {
    id: '30303030-0001-0001-0001-000000000001',
    category_id: CAT_BEGINNER,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-LV0',
    title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0',
    short_description: 'Lý thuyết nền tảng Master Lymphatic Therapy Level 0. Hiểu sâu về dòng chảy hệ bạch huyết.',
    full_description: 'Lý thuyết nền tảng Master Lymphatic Therapy Level 0. Hiểu sâu về dòng chảy hệ bạch huyết, cấu trúc mao mạch và nguyên lý kích hoạt tự chữa lành của cơ thể.',
    level: 'BEGINNER',
    total_hours: 24,
    theory_hours: 12,
    practice_hours: 12,
    total_lessons: 6,
    tuition_fee: 599000,
    deposit_amount: 200000,
    certificate_title: 'Chứng nhận MLD Nền Tảng - Level 0',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg',
    learning_outcomes: {
      sessions: 6,
      target_need: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      course_group: 'Người mới bắt đầu',
      original_price: 6000000,
      target_audience: 'Người mới bắt đầu học nghề'
    },
    is_featured: true,
    is_active: true
  },

  // 2. Workshop phòng ngừa phù tay sau phẫu thuật ung thư vú - 350.000
  {
    id: '30303030-0001-0001-0001-000000000003',
    category_id: CAT_BEGINNER,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'WS-PHU-TAY',
    title: 'Workshop: HƯỚNG DẪN PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT UNG THƯ VÚ',
    short_description: 'Hướng dẫn thực hành các kỹ thuật tự dẫn lưu nhẹ nhàng và tư thế sinh hoạt tránh ứ trệ dịch sau phẫu thuật.',
    full_description: 'Chuyên đề lâm sàng trang bị kiến thức tự bảo vệ và phòng ngừa biến chứng phù tay (lymphoedema) cho bệnh nhân và người chăm sóc sau điều trị hoặc phẫu thuật vú.',
    level: 'BEGINNER',
    total_hours: 8,
    theory_hours: 4,
    practice_hours: 4,
    total_lessons: 2,
    tuition_fee: 350000,
    deposit_amount: 100000,
    certificate_title: 'Giấy chứng nhận Tham gia Workshop MLD',
    image_url: 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú 350.000.jpg',
    learning_outcomes: {
      sessions: 2,
      target_need: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      course_group: 'Người mới bắt đầu',
      original_price: 350000,
      target_audience: 'Người mới bắt đầu học nghề'
    },
    is_featured: false,
    is_active: true
  },

  // 3. Workshop dinh dưỡng bảo vệ tuyến vú - 350.000
  {
    id: '30303030-0001-0001-0001-000000000004',
    category_id: CAT_BEGINNER,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'WS-CHE-DO-AN',
    title: 'Workshop: HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ',
    short_description: 'Nguyên lý tương tác dinh dưỡng kháng viêm và dòng chảy tuần hoàn bạch huyết.',
    full_description: 'Workshop dinh dưỡng trị liệu: Nguyên lý tương tác giữa dinh dưỡng kháng viêm và dòng chảy hệ tuần hoàn bạch huyết, chế độ ăn lành mạnh bảo vệ tuyến vú.',
    level: 'BEGINNER',
    total_hours: 8,
    theory_hours: 4,
    practice_hours: 4,
    total_lessons: 2,
    tuition_fee: 350000,
    deposit_amount: 100000,
    certificate_title: 'Giấy chứng nhận Tham gia Workshop MLD Dinh Dưỡng',
    image_url: 'assets/images/DaoTao/HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ 350.000.jpg',
    learning_outcomes: {
      sessions: 2,
      target_need: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      course_group: 'Người mới bắt đầu',
      original_price: 350000,
      target_audience: 'Người mới bắt đầu học nghề'
    },
    is_featured: false,
    is_active: true
  },

  // 4. Workshop vận động phòng ngừa phù tay sau phẫu thuật tuyến vú - 350.000
  {
    id: '30303030-0001-0001-0001-000000000005',
    category_id: CAT_BEGINNER,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'WS-VAN-DONG',
    title: 'Workshop: HƯỚNG DẪN VẬN ĐỘNG PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT TUYẾN VÚ',
    short_description: 'Bài tập vận động nhẹ nhàng kích hoạt bơm cơ mao mạch vùng ngực và cánh tay.',
    full_description: 'Bài tập vận động nhẹ nhàng kích hoạt bơm cơ mao mạch vùng ngực và cánh tay, duy trì tầm vận động khớp và chống phù nề sau mổ.',
    level: 'BEGINNER',
    total_hours: 8,
    theory_hours: 4,
    practice_hours: 4,
    total_lessons: 2,
    tuition_fee: 350000,
    deposit_amount: 100000,
    certificate_title: 'Giấy chứng nhận Tham gia Workshop Vận Động MLD',
    image_url: 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú 350.000.jpg',
    learning_outcomes: {
      sessions: 2,
      target_need: 'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
      course_group: 'Người mới bắt đầu',
      original_price: 350000,
      target_audience: 'Người mới bắt đầu học nghề'
    },
    is_featured: false,
    is_active: true
  },

  // 5. Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH - 10.000.000
  {
    id: '30303030-0001-0001-0001-000000000009',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-PRO-POSTPARTUM',
    title: 'Khoá học Chuyên đề: CHĂM SÓC MẸ SAU SINH',
    short_description: 'Kỹ thuật dẫn lưu bạch huyết chuyên sâu dành riêng cho mẹ sau sinh, hỗ trợ hồi phục nhanh chóng.',
    full_description: 'Kỹ thuật dẫn lưu bạch huyết chuyên sâu dành riêng cho mẹ sau sinh: hỗ trợ hồi phục cơ thể nhanh chóng, giảm phù nề chi dưới, thông tắc tia sữa và săn chắc phục hồi vóc dáng an toàn.',
    level: 'INTERMEDIATE',
    total_hours: 48,
    theory_hours: 16,
    practice_hours: 32,
    total_lessons: 8,
    tuition_fee: 10000000,
    deposit_amount: 2000000,
    certificate_title: 'Chứng nhận Chuyên đề MLD Chăm Sóc Mẹ Sau Sinh',
    image_url: 'assets/images/DaoTao/Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH 10.000.000.jpg',
    learning_outcomes: {
      sessions: 8,
      target_need: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      course_group: 'Người đang làm nghề',
      original_price: 15000000,
      target_audience: 'Kỹ thuật viên XBBH/PHCN/Mẹ & Bé'
    },
    is_featured: true,
    is_active: true
  },

  // 6. Dẫn lưu bạch huyết cơ bản cho người làm nghề Level 1 - 15.000.000
  {
    id: '30303030-0001-0001-0001-000000000002',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-PRO-BAS',
    title: 'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ - Level 1',
    short_description: 'Chuẩn hóa kỹ thuật dẫn lưu bạch huyết thủ công Vodder quốc tế với áp lực 30-40 mmHg.',
    full_description: 'Chuẩn hóa kỹ thuật dẫn lưu bạch huyết thủ công Vodder quốc tế với áp lực 30-40 mmHg. Đào tạo cầm tay chỉ việc, ứng dụng ngay vào cơ sở chăm sóc sức khỏe.',
    level: 'INTERMEDIATE',
    total_hours: 72,
    theory_hours: 24,
    practice_hours: 48,
    total_lessons: 12,
    tuition_fee: 15000000,
    deposit_amount: 3000000,
    certificate_title: 'Chứng chỉ Hành nghề Dẫn lưu Bạch huyết - Level 1',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết cơ bản cho người làm nghề 15.000.000.jpg',
    learning_outcomes: {
      sessions: 12,
      target_need: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      course_group: 'Người đang làm nghề',
      original_price: 30000000,
      target_audience: 'Kỹ thuật viên XBBH/PHCN/VLTL'
    },
    is_featured: true,
    is_active: true
  },

  // 7. Dẫn lưu bạch huyết nâng cao cho người làm nghề Level 2 - 25.000.000
  {
    id: '30303030-0001-0001-0001-000000000006',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-PRO-ADV',
    title: 'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ - Level 2',
    short_description: 'Kỹ thuật can thiệp sâu các trường hợp phù bạch huyết phức tạp, điều trị phục hồi sau phẫu thuật.',
    full_description: 'Kỹ thuật can thiệp sâu các trường hợp phù bạch huyết phức tạp, điều trị phục hồi sau phẫu thuật thẩm mỹ và tạo hình, nạo vét hạch hoặc xạ trị.',
    level: 'ADVANCED',
    total_hours: 96,
    theory_hours: 32,
    practice_hours: 64,
    total_lessons: 16,
    tuition_fee: 25000000,
    deposit_amount: 5000000,
    certificate_title: 'Chứng chỉ MLD Nâng cao - Level 2',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết nâng cao cho người làm nghề 25.000.000.jpg',
    learning_outcomes: {
      sessions: 16,
      target_need: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      course_group: 'Người đang làm nghề',
      original_price: 30000000,
      target_audience: 'Kỹ thuật viên XBBH/PHCN/VLTL'
    },
    is_featured: false,
    is_active: true
  },

  // 8. Dẫn lưu bạch huyết chuyên sâu cho người làm nghề Level 3 - 35.000.000
  {
    id: '30303030-0001-0001-0001-000000000010',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-PRO-INTENSIVE',
    title: 'DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU CHO NGƯỜI LÀM NGHỀ - Level 3',
    short_description: 'Kỹ thuật can thiệp lâm sàng chuyên sâu, xử lý các ca phù bạch huyết nguyên phát và thứ phát mức độ nặng.',
    full_description: 'Kỹ thuật can thiệp lâm sàng chuyên sâu, xử lý các ca phù bạch huyết nguyên phát và thứ phát mức độ nặng, xây dựng phác đồ cá nhân hóa chuẩn quốc tế.',
    level: 'ADVANCED',
    total_hours: 120,
    theory_hours: 40,
    practice_hours: 80,
    total_lessons: 20,
    tuition_fee: 35000000,
    deposit_amount: 7000000,
    certificate_title: 'Chứng chỉ Chuyên gia MLD Lâm Sàng - Level 3',
    image_url: 'assets/images/DaoTao/Dẫn lưu bạch huyết chuyên sâu cho người làm nghề.jpg',
    learning_outcomes: {
      sessions: 20,
      target_need: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      course_group: 'Người đang làm nghề',
      original_price: 40000000,
      target_audience: 'Kỹ thuật viên XBBH/PHCN/VLTL & Y bác sĩ'
    },
    is_featured: true,
    is_active: true
  },

  // 9. Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT - 30.000.000
  {
    id: '30303030-0001-0001-0001-000000000007',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-CDT-SPEC',
    title: 'GIẢM PHÙ BẰNG DẪN LƯU BẠCH HUYẾT VÀ BĂNG ÉP CDT',
    short_description: 'Liệu pháp phức hợp giảm ứ trệ dịch (CDT): phối hợp kỹ thuật xoa bóp dẫn lưu Vodder và băng ép nhiều lớp.',
    full_description: 'Liệu pháp phức hợp giảm ứ trệ dịch (CDT): phối hợp kỹ thuật xoa bóp dẫn lưu Vodder và nghệ thuật băng ép nhiều lớp phân tầng áp lực chuẩn y học.',
    level: 'ADVANCED',
    total_hours: 120,
    theory_hours: 40,
    practice_hours: 80,
    total_lessons: 20,
    tuition_fee: 30000000,
    deposit_amount: 6000000,
    certificate_title: 'Chứng chỉ Chuyên gia Băng ép Phức hợp CDT',
    image_url: 'assets/images/DaoTao/Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT 30.000.000.webp',
    learning_outcomes: {
      sessions: 20,
      target_need: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      course_group: 'Người đang làm nghề',
      original_price: 35000000,
      target_audience: 'Nhân viên y tế/Bác sĩ/KTV PHCN'
    },
    is_featured: false,
    is_active: true
  },

  // 10. Chương trình phát triển giảng viên và học thuật - 35.000.000
  {
    id: '30303030-0001-0001-0001-000000000011',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-TRAIN-THE-TRAINER',
    title: 'Chương trình: PHÁT TRIỂN GIẢNG VIÊN VÀ HỌC THUẬT',
    short_description: 'Bồi dưỡng năng lực sư phạm, phương pháp biên soạn giáo trình và chuẩn hóa kỹ năng giảng dạy lâm sàng.',
    full_description: 'Chương trình bồi dưỡng năng lực sư phạm, phương pháp biên soạn giáo trình và chuẩn hóa kỹ năng sư phạm lâm sàng dành cho các chuyên gia MLD hướng tới vai trò giảng viên.',
    level: 'MASTER',
    total_hours: 140,
    theory_hours: 50,
    practice_hours: 90,
    total_lessons: 24,
    tuition_fee: 35000000,
    deposit_amount: 7000000,
    certificate_title: 'Chứng nhận Giảng viên Đào tạo MLD Quốc Tế',
    image_url: 'assets/images/DaoTao/Chương trình phát triển giảng viên và học thuật 35.000.000.jpg',
    learning_outcomes: {
      sessions: 24,
      target_need: 'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
      course_group: 'Người đang làm nghề',
      original_price: 45000000,
      target_audience: 'Giảng viên & Kỹ thuật viên Trưởng'
    },
    is_featured: false,
    is_active: true
  },

  // 11. LYMPHATIC WELLNESS SIGNATURE PROGRAM - 350.000.000
  {
    id: '30303030-0001-0001-0001-000000000008',
    category_id: CAT_PRO,
    primary_instructor_id: INSTRUCTOR_ID,
    code: 'MLD-SIGNATURE',
    title: 'LYMPHATIC WELLNESS SIGNATURE PROGRAM',
    short_description: 'Chuyển giao độc quyền mô hình Lymphatic Wellness chuẩn quốc tế cho chủ Spa & Clinic.',
    full_description: 'Chương trình chuyển giao công nghệ cao cấp nhất của MLD Việt Nam: thiết lập quy trình vận hành Spa trị liệu chuyên nghiệp, đào tạo toàn bộ nhân sự và chứng nhận nhượng quyền thương hiệu.',
    level: 'MASTER',
    total_hours: 200,
    theory_hours: 60,
    practice_hours: 140,
    total_lessons: 30,
    tuition_fee: 350000000,
    deposit_amount: 50000000,
    certificate_title: 'Chứng nhận Chuyển giao Thương hiệu Lymphatic Signature',
    image_url: 'assets/images/DaoTao/LYMPHATIC WELLNESS SIGNATURE PROGRAM 350.000.000.jpg',
    learning_outcomes: {
      sessions: 30,
      target_need: 'Học nghề để mở cơ sở chăm sóc',
      course_group: 'Người đang làm nghề',
      original_price: 350000000,
      target_audience: 'Spa & Wellness Chủ cơ sở'
    },
    is_featured: true,
    is_active: true
  }
];

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    const instRes = await client.query('SELECT id FROM public.instructors LIMIT 1;');
    const validInstructorId = instRes.rows[0]?.id || null;
    console.log('Using instructor ID:', validInstructorId);

    for (const c of courses) {
      const query = `
        INSERT INTO public.courses (
          id, category_id, primary_instructor_id, code, title, 
          short_description, full_description, level, total_hours, 
          theory_hours, practice_hours, total_lessons, tuition_fee, 
          deposit_amount, certificate_title, image_url, learning_outcomes, 
          is_featured, is_active, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 
          $6, $7, $8, $9, 
          $10, $11, $12, $13, 
          $14, $15, $16, $17, 
          $18, $19, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          primary_instructor_id = EXCLUDED.primary_instructor_id,
          code = EXCLUDED.code,
          title = EXCLUDED.title,
          short_description = EXCLUDED.short_description,
          full_description = EXCLUDED.full_description,
          level = EXCLUDED.level,
          total_hours = EXCLUDED.total_hours,
          theory_hours = EXCLUDED.theory_hours,
          practice_hours = EXCLUDED.practice_hours,
          total_lessons = EXCLUDED.total_lessons,
          tuition_fee = EXCLUDED.tuition_fee,
          deposit_amount = EXCLUDED.deposit_amount,
          certificate_title = EXCLUDED.certificate_title,
          image_url = EXCLUDED.image_url,
          learning_outcomes = EXCLUDED.learning_outcomes,
          is_featured = EXCLUDED.is_featured,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
      `;

      await client.query(query, [
        c.id, c.category_id, validInstructorId, c.code, c.title,
        c.short_description, c.full_description, c.level, c.total_hours,
        c.theory_hours, c.practice_hours, c.total_lessons, c.tuition_fee,
        c.deposit_amount, c.certificate_title, c.image_url, JSON.stringify(c.learning_outcomes),
        c.is_featured, c.is_active
      ]);
      console.log(`[OK] Upserted: [${c.code}] ${c.title} -> ${c.tuition_fee.toLocaleString('vi-VN')} VND | ${c.image_url}`);
    }

    // Verify all courses in DB
    const res = await client.query(`
      SELECT c.code, c.title, c.tuition_fee, c.image_url, cat.name as category
      FROM public.courses c
      LEFT JOIN public.course_categories cat ON c.category_id = cat.id
      ORDER BY c.tuition_fee ASC;
    `);

    console.log('\n--- VERIFIED COURSES IN DATABASE ---');
    console.table(res.rows);

  } catch (err) {
    console.error('Error during database upsert:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

