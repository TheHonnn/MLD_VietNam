/**
 * BỘ KIỂM THỬ XÁC MINH AN TOÀN BẢO MẬT RLS BƯỚC 1 (SECURITY VERIFICATION TEST)
 * Mô phỏng kẻ tấn công từ bên ngoài sử dụng Anon Key công khai để truy cập PostgREST API
 */

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';
const supabaseUrl = 'https://wstvwushpwcdsmhpunvh.supabase.co';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [THẤT BẠI] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`   ✅ [ĐẠT] ${message}`);
}

async function runSecurityTests() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        MLD VIỆT NAM - KIỂM THỬ XÁC MINH BẢO MẬT RLS BƯỚC 1 (POSTGREST AUDIT)       ║');
  console.log('║         MÔ PHỎNG TRUY CẬP TRÁI PHÉP BẰNG ANON KEY TỪ INTERNET VÀO SUPABASE         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let total = 0;

  async function checkTest(label, fn) {
    total++;
    try {
      await fn();
      passed++;
    } catch (e) {
      console.error(`Lỗi tại [${label}]:`, e.message);
      throw e;
    }
  }

  // Helper check for blocked read
  async function assertReadBlocked(endpoint, label) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}

    const isBlocked = !res.ok || (Array.isArray(data) && data.length === 0) || text.includes('permission denied');
    assert(isBlocked, `${label}: Đã chặn hoàn toàn (HTTP ${res.status} | Output: ${text.slice(0, 60)}...)`);
  }

  // 1. Kiểm tra đọc zns_config bằng Anon Key
  console.log('[Test 1] Thử đọc cấu hình Zalo OA bí mật (zns_config) bằng anonKey:');
  await checkTest('T1: Chặn anon đọc zns_config', async () => {
    await assertReadBlocked('zns_config?select=*', 'zns_config');
  });

  // 2. Kiểm tra đọc Bệnh án phù nề y khoa (edema_assessments) bằng Anon Key
  console.log('\n[Test 2] Thử đọc Hồ sơ Bệnh án Phù nề Y khoa (edema_assessments) bằng anonKey:');
  await checkTest('T2: Chặn anon đọc edema_assessments', async () => {
    await assertReadBlocked('edema_assessments?select=*', 'edema_assessments');
  });

  // 3. Kiểm tra đọc Nhật ký điều trị y khoa (treatment_journal) bằng Anon Key
  console.log('\n[Test 3] Thử đọc Nhật ký Trị liệu & Ảnh lâm sàng (treatment_journal) bằng anonKey:');
  await checkTest('T3: Chặn anon đọc treatment_journal', async () => {
    await assertReadBlocked('treatment_journal?select=*', 'treatment_journal');
  });

  // 4. Kiểm tra đọc Hóa đơn tài chính (invoices) bằng Anon Key
  console.log('\n[Test 4] Thử đọc Hóa đơn thu tiền POS (invoices) bằng anonKey:');
  await checkTest('T4: Chặn anon đọc invoices', async () => {
    await assertReadBlocked('invoices?select=*', 'invoices');
  });

  // 5. Kiểm tra đọc Doanh thu học phí (tuition_transactions) bằng Anon Key
  console.log('\n[Test 5] Thử đọc Sổ thu học phí tuyển sinh (tuition_transactions) bằng anonKey:');
  await checkTest('T5: Chặn anon đọc tuition_transactions', async () => {
    await assertReadBlocked('tuition_transactions?select=*', 'tuition_transactions');
  });

  // 6. Kiểm tra đọc Hoa hồng nhân viên (staff_commissions) bằng Anon Key
  console.log('\n[Test 6] Thử đọc Bảng kê hoa hồng KTV / Nhân sự (staff_commissions) bằng anonKey:');
  await checkTest('T6: Chặn anon đọc staff_commissions', async () => {
    await assertReadBlocked('staff_commissions?select=*', 'staff_commissions');
  });

  // 7. Thử ghi chèn (INSERT) trái phép vào bảng invoices bằng Anon Key
  console.log('\n[Test 7] Thử chèn (INSERT) hóa đơn giả mạo vào bảng invoices bằng anonKey:');
  await checkTest('T7: Chặn anon INSERT vào invoices', async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        invoice_code: 'HACK-INV-999',
        subtotal: 999999999,
        total_amount: 999999999
      })
    });
    const text = await res.text();
    assert(!res.ok, `Chặn thành công yêu cầu chèn hóa đơn giả (HTTP ${res.status}: ${text.slice(0, 60)}...)`);
  });

  // 8. Thử sửa đổi (UPDATE) trái phép vào bảng users bằng Anon Key
  console.log('\n[Test 8] Thử sửa đổi (UPDATE) quyền tài khoản admin trên bảng users bằng anonKey:');
  await checkTest('T8: Chặn anon UPDATE vào users', async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?role=eq.CUSTOMER`, {
      method: 'PATCH',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'SUPER_ADMIN'
      })
    });
    const text = await res.text();
    const isBlocked = !res.ok || text.includes('new row violates') || text.includes('permission denied') || text === '[]';
    assert(isBlocked, `Chặn thành công hành vi nâng quyền trái phép (Status ${res.status}: ${text.slice(0, 60)}...)`);
  });

  // 9. Thử chèn (INSERT) trái phép vào bảng edema_assessments bằng Anon Key
  console.log('\n[Test 9] Thử chèn (INSERT) bệnh án giả mạo vào edema_assessments bằng anonKey:');
  await checkTest('T9: Chặn anon INSERT vào edema_assessments', async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/edema_assessments`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'Fake Patient',
        customer_phone: '0999999999',
        result: 'FAKE_RECORD'
      })
    });
    const text = await res.text();
    assert(!res.ok, `Chặn thành công yêu cầu chèn bệnh án y khoa trái phép (HTTP ${res.status}: ${text.slice(0, 60)}...)`);
  });

  // 10. Thử chèn (INSERT) trái phép vào bảng student_certificates bằng Anon Key
  console.log('\n[Test 10] Thử chèn (INSERT) chứng chỉ giả mạo vào student_certificates bằng anonKey:');
  await checkTest('T10: Chặn anon INSERT vào student_certificates', async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/student_certificates`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        certificate_code: 'FAKE-CERT-999',
        student_name: 'Fake Graduate',
        final_grade: 'XUẤT SẮC'
      })
    });
    const text = await res.text();
    assert(!res.ok, `Chặn thành công yêu cầu tạo văn bằng chứng chỉ giả (HTTP ${res.status}: ${text.slice(0, 60)}...)`);
  });

  console.log('\n================================================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ BẢO MẬT RLS BƯỚC 1:`);
  console.log(`   TỔNG SỐ TIÊU CHÍ BẢO MẬT : ${total}`);
  console.log(`   SỐ TIÊU CHÍ ĐẠT (PASS)    : ${passed} / ${total} (100%)`);
  console.log(`   ĐÁNH GIÁ AN TOÀN          : BẢO VỆ TUYỆT ĐỐI - TOÀN BỘ CỬA HẬU ANON ĐÃ ĐƯỢC ĐÓNG CHẶT`);
  console.log('================================================================================\n');
}

runSecurityTests().catch(err => {
  console.error('Lỗi kiểm thử an toàn RLS:', err);
  process.exit(1);
});
