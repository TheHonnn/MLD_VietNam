import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workflowFixture } from './fixtures/workflow.mjs';
import { staffFixture } from './fixtures/staff.mjs';

test('Phase 1: HomeProduct 3-package grouping explicit and fallback', async () => {
  const f = await workflowFixture(), { db, id } = f;
  try {
    await db.exec(`ALTER TABLE home_products ADD COLUMN IF NOT EXISTS image_url text; ALTER TABLE home_products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true; ALTER TABLE home_products ADD COLUMN IF NOT EXISTS treatment_package_group text;`);
    await db.query(`INSERT INTO home_products(id,name,category,treatment_package_group,price_min,price_max,unit,details,sort_order,is_active) VALUES
      ($1,'Kem dưỡng da','Chăm sóc da','Chăm sóc toàn diện',400000,400000,'Tuýp',ARRAY['Chi tiết'],1,true),
      ($2,'Băng ép y khoa','Băng ép',NULL,350000,500000,'Cuộn',ARRAY['Chi tiết'],2,true),
      ($3,'Bóng tập','Dụng cụ tập luyện',NULL,200000,200000,'Chiếc',ARRAY['Chi tiết'],3,true),
      ($4,'Serum phục hồi','Chăm sóc da',NULL,500000,500000,'Chai',ARRAY['Chi tiết'],4,true)`,
      [id(801), id(802), id(803), id(804)]);
    const res = await f.request('/portal/products?limit=24', { anonymous: true });
    assert.equal(res.status, 200);
    const byId = Object.fromEntries(res.data.products.map(p => [p.id, p]));
    assert.equal(byId[id(801)].treatmentPackageGroup, 'Chăm sóc toàn diện');
    assert.equal(byId[id(802)].treatmentPackageGroup, 'Chăm sóc mở rộng');
    assert.equal(byId[id(803)].treatmentPackageGroup, 'Chăm sóc toàn diện');
    assert.equal(byId[id(804)].treatmentPackageGroup, 'Chăm sóc khu trú');
  } finally { await f.close(); }
});

test('Phase 4: Auto-payment gateway config, intent, status and account deletion', async () => {
  const f = await workflowFixture(), { db, id } = f;
  try {
    const cfg = await f.request('/payments/gateway/config', { token: f.customerToken });
    assert.equal(cfg.status, 200);
    assert.equal(cfg.data.provider, 'UNCONFIGURED');
    assert.equal(cfg.data.configured, false);

    const intent = await f.request('/payments/gateway/intent', {
      method: 'POST',
      token: f.customerToken,
      body: { amount: 650000, description: 'MLD BK112233', targetType: 'BOOKING', referenceCode: 'BK-112233' },
    });
    assert.equal(intent.status, 201);
    assert.equal(intent.data.amount, 650000);
    assert.equal(intent.data.gatewayConfigured, false);
    assert.equal(intent.data.isPaid, false);

    const st = await f.request(`/payments/gateway/status/${intent.data.orderCode}`, { token: f.customerToken });
    assert.equal(st.status, 200);
    assert.equal(st.data.isPaid, false);

    // IDOR guard: another user cannot query someone else's payment status
    const idor = await f.request(`/payments/gateway/status/${intent.data.orderCode}`, { owner: 2 });
    assert.equal(idor.status, 404);

    const del = await f.request('/auth/account', { method: 'DELETE', token: f.customerToken });
    assert.equal(del.status, 200);
    assert.equal(del.data.deleted, true);
    const after = await f.request('/membership', { token: f.customerToken });
    assert.equal(after.status, 401);
    const [u] = (await db.query('SELECT full_name, is_active FROM users WHERE id = $1', [id(1)])).rows;
    assert.equal(u.is_active, false);
    assert.equal(u.full_name, 'Tài khoản đã xóa');
  } finally { await f.close(); }
});

test('Phase 5: Staff academy student-code, consultation note auto-archive, and monthly shifts', async () => {
  const f = await staffFixture(), { db, id } = f;
  try {
    await db.exec(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code text;
      ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS consultation_history jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS consultation_status text;
    `);
    await db.query(`UPDATE course_enrollments SET status='CONSULTING', approval_status='PENDING_APPROVAL' WHERE id=$1`, [id(29)]);

    // 1. Update student code (receptionist/staff owner 90)
    const codeRes = await f.request(`/staff/academy/candidates/${id(29)}/student-code`, {
      owner: 90,
      method: 'PATCH',
      body: { studentCode: 'HV2026-009' },
    });
    assert.equal(codeRes.status, 200, JSON.stringify(codeRes));
    assert.equal(codeRes.data.studentCode, 'HV2026-009');

    // 2. Consultation notes (1..3 -> PENDING_CONSULTATION, 4th -> ARCHIVED)
    for (let i = 1; i <= 3; i++) {
      const c = await f.request(`/staff/academy/candidates/${id(29)}/consult`, {
        owner: 90,
        method: 'POST',
        body: { note: `Tư vấn lần ${i}` },
      });
      assert.equal(c.status, 200, JSON.stringify(c));
      assert.equal(c.data.consultationCount, i);
      assert.equal(c.data.status, 'PENDING_CONSULTATION');
    }
    const c4 = await f.request(`/staff/academy/candidates/${id(29)}/consult`, {
      owner: 90,
      method: 'POST',
      body: { note: 'Tư vấn lần 4 - lưu trữ' },
    });
    assert.equal(c4.status, 200, JSON.stringify(c4));
    assert.equal(c4.data.consultationCount, 4);
    assert.equal(c4.data.status, 'ARCHIVED');

    // 3. Monthly shifts
    await db.query(`INSERT INTO technician_shifts(technician_id, branch_id, shift_date, start_time, end_time, is_cancelled) VALUES($1, $2, '2099-05-10', '08:30', '12:00', false)`, [id(7), id(3)]);
    const shiftsRes = await f.request('/staff/shifts?month=2099-05', { owner: 90 });
    assert.equal(shiftsRes.status, 200, JSON.stringify(shiftsRes));
    assert.equal(shiftsRes.data.month, '2099-05');
    assert.ok(shiftsRes.data.shifts.some(s => s.shiftDate === '2099-05-10' && s.shiftSlot === 'morning'));

    // 4. Portal settings (Admin-configured contacts, taxonomies, FAQs)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS portal_contacts (
        id text PRIMARY KEY,
        hotline_support text,
        hotline_training text,
        zalo_oa_url text,
        messenger_url text,
        fanpage_url text,
        tiktok_url text,
        working_hours text
      );
      CREATE TABLE IF NOT EXISTS portal_taxonomies (
        id uuid PRIMARY KEY,
        type text NOT NULL,
        code text,
        name text NOT NULL,
        description text,
        icon_name text,
        sort_order int DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS support_faqs (
        id uuid PRIMARY KEY,
        category text,
        question text NOT NULL,
        answer text NOT NULL,
        display_order int DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      );
    `);
    await db.query(`INSERT INTO portal_contacts(id, hotline_support, working_hours) VALUES('primary_mld_contacts', '096.7786.399', '09:00 - 20:00') ON CONFLICT (id) DO NOTHING`);
    await db.query(`INSERT INTO portal_taxonomies(id, type, code, name, description, icon_name, sort_order, is_active) VALUES($1, 'CONTACT_CHANNEL', 'ZALO', 'Zalo OA', 'https://zalo.me/mld', 'zalo', 1, true) ON CONFLICT (id) DO NOTHING`, [id(610)]);
    await db.query(`INSERT INTO portal_taxonomies(id, type, code, name, sort_order, is_active) VALUES($1, 'TARGET_AUDIENCE', 'BEGINNER', 'Người mới bắt đầu', 1, true) ON CONFLICT (id) DO NOTHING`, [id(611)]);
    await db.query(`INSERT INTO support_faqs(id, category, question, answer, display_order, is_active) VALUES($1, 'DICH_VU', 'MLD là gì?', 'Dẫn lưu bạch huyết chuẩn Vodder.', 1, true) ON CONFLICT (id) DO NOTHING`, [id(612)]);
    const portalRes = await f.request('/portal/settings', { anonymous: true });
    assert.equal(portalRes.status, 200, JSON.stringify(portalRes));
    assert.equal(portalRes.data.contacts.hotlineSupport, '096.7786.399');
    assert.equal(portalRes.data.contactChannels.length, 1);
    assert.equal(portalRes.data.targetAudiences[0].name, 'Người mới bắt đầu');
    assert.equal(portalRes.data.faqs[0].question, 'MLD là gì?');
  } finally { await f.close(); }
});
