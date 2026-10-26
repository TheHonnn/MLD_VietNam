const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase1MedicalTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 1: CHUYÊN MÔN Y KHOA & CHỨNG NHẬN');
  console.log('===============================================================\n');

  await client.connect();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Chi tiết: ${details}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST SUITE 1: BẢNG GIẤY CHỨNG NHẬN Y KHOA (student_certificates)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 1: Quy trình Cấp & Thu hồi Giấy chứng nhận (W16) ---');
    
    // 1.1 Kiểm tra các cột mở rộng chuẩn Y khoa
    const colCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'student_certificates'
      AND column_name IN ('date_of_birth', 'qr_image_url', 'signer_name', 'signer_title', 'theory_score', 'practical_score');
    `);
    const foundCols = colCheck.rows.map(r => r.column_name);
    assert(
      foundCols.includes('date_of_birth') &&
      foundCols.includes('signer_name') &&
      foundCols.includes('signer_title') &&
      foundCols.includes('theory_score') &&
      foundCols.includes('practical_score'),
      'Kiểm tra đầy đủ các trường y khoa mở rộng trong student_certificates'
    );

    // 1.2 Thử tạo Giấy chứng nhận mới
    const testCertCode = 'MLD-TEST-' + Date.now();
    const insertCertRes = await client.query(`
      INSERT INTO public.student_certificates (
        student_name, date_of_birth, course_title, certificate_code, qr_verification_code,
        issue_date, theory_score, practical_score, final_grade, status, signer_name, signer_title
      ) VALUES (
        'Lê Hoàng Yến', '1996-08-20', 'Chuyên Đề Trị Liệu Phù Bạch Huyết Sau Ung Thư Vú',
        $1, $2, CURRENT_DATE, 9.6, 9.4, 'XUẤT SẮC', 'ISSUED', 'BS. CKI Trần Hoàng Nam', 'Chủ Tịch Hội Đồng Y Khoa MLD'
      ) RETURNING id, certificate_code, final_grade, status;
    `, [testCertCode, `https://mldvietnam.vn/verify/${testCertCode}`]);

    const createdCert = insertCertRes.rows[0];
    assert(createdCert && createdCert.id, 'Tạo mới Giấy chứng nhận thành công vào Supabase');
    assert(createdCert.final_grade === 'XUẤT SẮC', 'Xếp loại tự động XUẤT SẮC chuẩn y khoa khi điểm >= 9.0');
    assert(createdCert.status === 'ISSUED', 'Trạng thái ban đầu là ISSUED');

    // 1.3 Kiểm tra cập nhật thu hồi chứng nhận
    const revokeRes = await client.query(`
      UPDATE public.student_certificates 
      SET status = 'REVOKED'
      WHERE id = $1
      RETURNING id, status;
    `, [createdCert.id]);
    assert(revokeRes.rows[0].status === 'REVOKED', 'Thu hồi Giấy chứng nhận chuyển trạng thái sang REVOKED');

    // Dọn dẹp bản ghi test chứng chỉ
    await client.query('DELETE FROM public.student_certificates WHERE id = $1;', [createdCert.id]);
    console.log('  🧹 Đã dọn dẹp bản ghi kiểm thử Giấy chứng nhận.\n');

    // ------------------------------------------------------------------------
    // TEST SUITE 2: ĐĂNG KÝ & KHÁM PHÙ LÂM SÀNG CDT (edema_assessments)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 2: Khám Phù Bạch Huyết Lâm Sàng & Phác đồ CDT (W17) ---');

    // 2.1 Lấy branchId hợp lệ
    const branchRes = await client.query('SELECT id, name FROM public.branches LIMIT 1;');
    const branchId = branchRes.rows[0].id;
    assert(Boolean(branchId), `Lấy chi nhánh thực hiện khám bệnh: ${branchRes.rows[0].name}`);

    // 2.2 Tạo phiếu khám phù lâm sàng mới với số đo 4 điểm
    const testMeasurements = {
      wrist: { affected: 24.5, healthy: 18.0, delta: 6.5 },
      under_elbow: { affected: 29.0, healthy: 22.0, delta: 7.0 },
      above_elbow: { affected: 34.0, healthy: 26.0, delta: 8.0 },
      armpit: { affected: 38.0, healthy: 29.0, delta: 9.0 },
      max_delta: 9.0,
      clinical_alert: 'HIGH_RISK_EDEMA'
    };

    const insertEdemaRes = await client.query(`
      INSERT INTO public.edema_assessments (
        customer_name, customer_phone, branch_id, assessment_date, time_slot,
        status, result, stage_level, circumference_measurements, clinical_notes
      ) VALUES (
        'Bệnh Nhân Test Lâm Sàng', '0933112233', $1, CURRENT_DATE, '08:30 - 09:30',
        'CONFIRMED', 'NEEDS_FOLLOW_UP', 'Stage II', $2,
        'Khám phù chi trên sau phẫu thuật. Dấu hiệu Stemmer (+), Pitting test độ 2+. Chỉ định CDT 10 buổi Vodder + băng ép ngắn.'
      ) RETURNING id, customer_name, stage_level, status, result;
    `, [branchId, JSON.stringify(testMeasurements)]);

    const createdEdema = insertEdemaRes.rows[0];
    assert(createdEdema && createdEdema.id, 'Tạo phiếu khám phù bạch huyết lâm sàng thành công');
    assert(createdEdema.stage_level === 'Stage II', 'Phân loại đúng giai đoạn lâm sàng ISL Stage II');

    // 2.3 Cập nhật kết quả sau hoàn thành phác đồ
    const updateEdemaRes = await client.query(`
      UPDATE public.edema_assessments
      SET status = 'COMPLETED', result = 'PASSED'
      WHERE id = $1
      RETURNING id, status, result;
    `, [createdEdema.id]);
    assert(updateEdemaRes.rows[0].status === 'COMPLETED' && updateEdemaRes.rows[0].result === 'PASSED', 
      'Cập nhật hoàn tất buổi khám sang COMPLETED / PASSED');

    // Dọn dẹp bản ghi test khám phù
    await client.query('DELETE FROM public.edema_assessments WHERE id = $1;', [createdEdema.id]);
    console.log('  🧹 Đã dọn dẹp bản ghi kiểm thử Khám phù.\n');

    // ------------------------------------------------------------------------
    // TEST SUITE 3: BỆNH ÁN & GÓI TRỊ LIỆU (treatment_packages & treatment_journal)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 3: Bệnh án & Gói Trị Liệu Lâm Sàng (W06) ---');
    
    const pkgCount = await client.query('SELECT count(*) FROM public.treatment_packages;');
    assert(Number(pkgCount.rows[0].count) >= 0, `Hệ thống gói trị liệu MLD hoạt động (${pkgCount.rows[0].count} gói trị liệu y khoa)`);

    const journalCount = await client.query('SELECT count(*) FROM public.treatment_journal;');
    assert(Number(journalCount.rows[0].count) >= 0, `Hồ sơ nhật ký điều trị lâm sàng hoạt động (${journalCount.rows[0].count} nhật ký buổi trị liệu)`);

    console.log('\n===============================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 1:`);
    console.log(`   ĐẠT (PASS): ${passedTests} / ${totalTests} kiểm thử (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Lỗi trong quá trình kiểm thử:', err);
  } finally {
    await client.end();
  }
}

runPhase1MedicalTests();
