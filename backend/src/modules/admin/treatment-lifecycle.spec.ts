import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('Treatment Lifecycle & Safe Session Reversal Integration', () => {
  let pg: PGlite;
  let service: AdminService;

  const superAdminActor = {
    id: '00000000-0000-4000-8000-000000000001',
    role: 'SUPER_ADMIN',
  };

  const staffActor = {
    id: '00000000-0000-4000-8000-000000000002',
    role: 'TECHNICIAN',
  };

  let branchId: string;
  let serviceId: string;
  let packageDefId: string;
  let customerOneId: string;
  let customerTwoId: string;
  let technicianId: string;

  const client = {
    query: async (sql: string, values?: any[]) => {
      const r = await pg.query(sql, values);
      return { ...r, rowCount: r.rows.length || (r as any).affectedRows || 0 };
    },
    release: () => {},
  };

  beforeAll(async () => {
    pg = new PGlite();
    await loadAdminSchema(pg);

    // Seed admin operators
    await pg.query(
      "INSERT INTO users(id, phone, full_name, role, referral_code) VALUES($1, '0900000001', 'Admin Operator', 'SUPER_ADMIN', 'ADMIN01')",
      [superAdminActor.id],
    );
    await pg.query(
      "INSERT INTO users(id, phone, full_name, role, referral_code) VALUES($1, '0900000002', 'Staff Member', 'TECHNICIAN', 'STAFF02')",
      [staffActor.id],
    );

    // Seed customers
    const cust1 = (await pg.query<any>(
      "INSERT INTO users(phone, full_name, role, referral_code) VALUES('0911111111', 'Nguyen Van A', 'STUDENT', 'CUST01') RETURNING id",
    )).rows[0];
    customerOneId = cust1.id;

    const cust2 = (await pg.query<any>(
      "INSERT INTO users(phone, full_name, role, referral_code) VALUES('0922222222', 'Tran Thi B', 'STUDENT', 'CUST02') RETURNING id",
    )).rows[0];
    customerTwoId = cust2.id;

    // Seed branch
    const branch = (await pg.query<any>(
      "INSERT INTO branches(name, code, phone, address, district, latitude, longitude, image_url) VALUES('Chi nhanh Quan 3', 'CNQ3', '0933333333', '123 Nam Ky Khoi Nghia', 'Quan 3', 10.78, 106.69, 'https://example.com/b.png') RETURNING id",
    )).rows[0];
    branchId = branch.id;

    // Seed technician
    const tech = (await pg.query<any>(
      "INSERT INTO technicians(full_name, title, branch_id, avatar_url) VALUES('KTV Le Thi C', 'Chuyen vien Tri lieu', $1, 'https://example.com/technician.png') RETURNING id",
      [branchId],
    )).rows[0];
    technicianId = tech.id;

    // Seed service category and service using the production schema's required
    // catalogue fields. Keeping fixtures schema-accurate prevents tests from
    // silently depending on legacy columns such as services.code.
    const category = (await pg.query<any>(
      "INSERT INTO service_categories(name, code, icon_url, description) VALUES('Chăm sóc MLD', 'MLD-CARE', 'https://example.com/category.png', 'Dịch vụ chăm sóc MLD') RETURNING id",
    )).rows[0];

    const srv = (await pg.query<any>(
      `INSERT INTO services(
        category_id, name, slug, short_description, full_description,
        duration_minutes, price, image_url, is_active
      ) VALUES(
        $1, 'Chăm Sóc Da Chuyên Sâu MLD', 'cham-soc-da-chuyen-sau-mld',
        'Chăm sóc chuyên sâu', 'Dịch vụ chăm sóc chuyên sâu theo phác đồ MLD',
        60, 500000, 'https://example.com/service.png', true
      ) RETURNING id`,
      [category.id],
    )).rows[0];
    serviceId = srv.id;

    // Seed treatment package template
    const pkgDef = (await pg.query<any>(
      "INSERT INTO treatment_packages(name, description, service_id, total_sessions, price, validity_months, image_url, is_active) VALUES('Gói Liệu Trình Trẻ Hóa 5 Buổi', 'Phác đồ 5 buổi chuẩn y khoa', $1, 5, 2000000, 6, 'https://example.com/package.png', true) RETURNING id",
      [serviceId],
    )).rows[0];
    packageDefId = pkgDef.id;

    service = new AdminService(
      { connection: { ...client, connect: async () => client } } as any,
      new ConfigService({
        JWT_SECRET: 'test-secret-only-not-a-production-key-12345',
      }),
      new JwtService(),
    );
  }, 60000);

  afterAll(async () => {
    await pg?.close();
  });

  describe('1. Package State Machine Transitions & Validation', () => {
    it('blocks arbitrary direct mutations to package status', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '6 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      await expect(
        service.mutate('user_packages', superAdminActor, 'update', {
          key: { id: upkg.id },
          values: { status: 'REFUNDED' },
        }),
      ).rejects.toThrow(/Không sửa trạng thái gói tùy ý/i);
    });

    it('pauses an active package and writes an immutable lifecycle audit log', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 1, 'ACTIVE', NOW() + INTERVAL '6 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'pause',
        reason: 'Khách hàng đi công tác nước ngoài 2 tháng',
      });

      expect(res.status).toBe('PAUSED');

      // Verify DB state
      const dbRow = (await pg.query<any>('SELECT status, paused_at FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.status).toBe('PAUSED');
      expect(dbRow.paused_at).not.toBeNull();

      // Verify lifecycle log
      const logs = (await pg.query<any>('SELECT * FROM user_package_lifecycle_logs WHERE user_package_id=$1', [upkg.id])).rows;
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('PAUSE');
      expect(logs[0].from_status).toBe('ACTIVE');
      expect(logs[0].to_status).toBe('PAUSED');
      expect(logs[0].reason).toContain('đi công tác');
    });

    it('resumes a paused package and records audit trail', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 1, 'PAUSED', NOW() + INTERVAL '6 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'resume',
      });

      expect(res.status).toBe('ACTIVE');

      const dbRow = (await pg.query<any>('SELECT status, resumed_at FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.status).toBe('ACTIVE');
      expect(dbRow.resumed_at).not.toBeNull();
    });

    it('extends package expiration date and records original expiration', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 2, 'ACTIVE', '2026-06-01T00:00:00.000Z') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'extend',
        extensionMonths: 3,
        reason: 'Chính sách bù thời gian giãn cách bảo trì',
      });

      expect(res.extension_months).toBe(3);

      const dbRow = (await pg.query<any>('SELECT extension_months, original_expires_at, expires_at FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.extension_months).toBe(3);
      expect(dbRow.original_expires_at).not.toBeNull();
      expect(new Date(dbRow.expires_at).getTime()).toBeGreaterThan(new Date('2026-06-01').getTime());
    });

    it('cancels a package with mandatory reason', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 1, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'cancel',
        reason: 'Khách hàng yêu cầu hủy gói do chuyển nơi ở',
      });

      expect(res.status).toBe('CANCELLED');
      const dbRow = (await pg.query<any>('SELECT status, cancelled_reason FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.status).toBe('CANCELLED');
      expect(dbRow.cancelled_reason).toContain('chuyển nơi ở');
    });

    it('transfers package ownership to a new customer while maintaining historical link', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 2, 'ACTIVE', NOW() + INTERVAL '4 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'transfer',
        newCustomerId: customerTwoId,
        reason: 'Khách hàng chuyển nhượng số buổi còn lại cho em gái',
      });

      expect(res.status).toBe('TRANSFERRED');

      // The original package is marked TRANSFERRED with destination customer
      const dbOld = (await pg.query<any>('SELECT status, transferred_to_user_id, transfer_reason FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbOld.status).toBe('TRANSFERRED');
      expect(dbOld.transferred_to_user_id).toBe(customerTwoId);

      // A new active package is assigned to customerTwo with remaining sessions (5 - 2 = 3)
      const dbNew = (await pg.query<any>('SELECT id, customer_id, total_sessions, completed_sessions, status FROM user_packages WHERE customer_id=$1 AND transferred_from_package_id=$2', [customerTwoId, upkg.id])).rows[0];
      expect(dbNew).toBeDefined();
      expect(dbNew.total_sessions).toBe(3);
      expect(dbNew.completed_sessions).toBe(0);
      expect(dbNew.status).toBe('ACTIVE');
    });

    it('refunds package and reverses any commission records', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at, commission_staff_id) VALUES($1, $2, 5, 1, 'ACTIVE', NOW() + INTERVAL '3 months', $3) RETURNING id",
        [customerOneId, packageDefId, staffActor.id],
      )).rows[0];

      // Insert original commission
      const comm = (await pg.query<any>(
        `INSERT INTO staff_commissions(
          staff_id, branch_id, user_package_id, commission_type, base_amount,
          percentage, commission_amount, status, cycle_month
        ) VALUES($1, $2, $3, 'PACKAGE_UPSELL', 1500000, 10, 150000, 'APPROVED', '2026-03') RETURNING id`,
        [staffActor.id, branchId, upkg.id],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'refund',
        refundAmount: 1600000,
        reason: 'Khách hàng không hài lòng với phác đồ sau buổi 1',
      });

      expect(res.status).toBe('REFUNDED');
      expect(Number(res.refund_amount)).toBe(1600000);

      // Verify negative reversal commission was created
      const revComm = (await pg.query<any>(
        "SELECT * FROM staff_commissions WHERE staff_id=$1 AND source_session_status='REFUNDED' AND reversal_of_id IS NOT NULL",
        [staffActor.id],
      )).rows;
      expect(revComm.length).toBeGreaterThanOrEqual(1);
      expect(Number(revComm[0].commission_amount)).toBeLessThan(0);
    });
  });

  describe('2. Safe Treatment Session Reversal ("Hoàn tác buổi")', () => {
    it('safely reverses a completed session, decrements completed count, and records immutable audit', async () => {
      // Create package with 3 sessions, 2 already done
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 2, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      // Session 1
      await pg.query(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 1, '2026-03-01', 'Bình thường', 'Ổn định', 'Thực hiện buổi 1', 'Uống đủ nước', false)",
        [upkg.id, customerOneId],
      );

      // Session 2
      const journal2 = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 2, '2026-03-05', 'Bình thường', 'Đỏ nhẹ', 'Thực hiện buổi 2', 'Bôi kem làm dịu', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      // Perform reversal on session 2
      const result = await service.action('treatment_journal', superAdminActor, {
        key: { id: journal2.id },
        action: 'reverse',
        reason: 'Kỹ thuật viên chọn nhầm khách hàng trên lịch hẹn',
        idempotencyKey: 'test-reversal-key-001',
      });

      expect(result.is_reversed).toBe(true);
      expect(result.reversal_reason).toContain('chọn nhầm khách hàng');

      // Check user_packages: completed_sessions should decrement from 2 to 1
      const pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
      expect(pkgCheck.status).toBe('ACTIVE');

      // Check immutable reversal audit table
      const reversals = (await pg.query<any>('SELECT * FROM treatment_session_reversals WHERE journal_id=$1', [journal2.id])).rows;
      expect(reversals.length).toBe(1);
      expect(reversals[0].reversed_by).toBe(superAdminActor.id);
      expect(reversals[0].idempotency_key).toBe('test-reversal-key-001');

      // Check treatment_inventory_outbox has reversal record
      const inventoryOutbox = (await pg.query<any>('SELECT * FROM treatment_inventory_outbox WHERE treatment_journal_id=$1 AND operation_type=$2', [journal2.id, 'REVERSE_RESTORE'])).rows;
      expect(inventoryOutbox.length).toBe(0);
    });

    it('reverts a COMPLETED package back to ACTIVE when a completed session is reversed', async () => {
      // 2 sessions package that is fully COMPLETED
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 2, 2, 'COMPLETED', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      await pg.query(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 1, '2026-03-01', 'Khởi đầu', 'Tốt', 'Buổi 1', 'Nghỉ ngơi', false)",
        [upkg.id, customerOneId],
      );

      const journalFinal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 2, '2026-03-08', 'Tốt', 'Hoàn tất', 'Buổi cuối hoàn thành', 'Dưỡng da định kỳ', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      // Reverse session 2
      await service.action('treatment_journal', superAdminActor, {
        key: { id: journalFinal.id },
        action: 'reverse',
        reason: 'Khách hàng khiếu nại chưa thực hiện đủ thời lượng buổi cuối',
      });

      // Package must revert from COMPLETED to ACTIVE
      const pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
      expect(pkgCheck.status).toBe('ACTIVE');
    });

    it('rejects double reversal on the same session with ConflictException', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 1, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 1, '2026-03-10', 'Ổn', 'Ổn', 'Buổi 1', 'N/A', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      // First reversal succeeds
      await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'reverse',
        reason: 'Lý do hợp lệ lần một',
      });

      // Second reversal must throw ConflictException
      await expect(
        service.action('treatment_journal', superAdminActor, {
          key: { id: journal.id },
          action: 'reverse',
          reason: 'Cố tình hoàn tác lặp lần hai',
        }),
      ).rejects.toThrow(/đã được hoàn tác trước đó/i);
    });

    it('blocks deletion or modification of already reversed journals', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 1, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 1, '2026-03-11', 'Ổn', 'Ổn', 'Buổi 1', 'N/A', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'reverse',
        reason: 'Hoàn tác trước khi thử xóa/sửa',
      });

      // Attempt to delete journal directly
      await expect(
        service.mutate('treatment_journal', superAdminActor, 'delete', {
          key: { id: journal.id },
        }),
      ).rejects.toThrow(/Không thể xóa nhật ký điều trị đã ghi nhận/i);

      // Attempt to modify reversed journal
      await expect(
        service.mutate('treatment_journal', superAdminActor, 'update', {
          key: { id: journal.id },
          values: { treatment_notes: 'Cố tình sửa nội dung' },
        }),
      ).rejects.toThrow(/đã được hoàn tác/i);
    });
  });

  describe('3. Clinical Session Completion & Outbox Integrity', () => {
    it('creates consumable deduction in inventory outbox and post-care advice in post_care_outbox', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const consumables = [
        { name: 'Ampoule Phục Hồi B5', quantity: 1, unit: 'ống' },
        { name: 'Gạc Y Tế Tiệt Trùng', quantity: 2, unit: 'miếng' },
      ];

      const booking = (await pg.query<any>(
        `INSERT INTO bookings(
          booking_code, customer_id, branch_id, technician_id, booking_date,
          start_time, end_time, status, session_status, base_total, final_price,
          qr_code_hash
        ) VALUES(
          'BK-TREATMENT-OUTBOX', $1, $2, $3, '2026-03-15',
          '09:00', '10:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000,
          'qr-treatment-outbox'
        ) RETURNING id`,
        [customerOneId, branchId, technicianId],
      )).rows[0];
      await pg.query(
        `INSERT INTO booking_items(booking_id, service_id, technician_id, duration_minutes, price)
         VALUES($1, $2, $3, 60, 500000)`,
        [booking.id, serviceId, technicianId],
      );

      const journal = await service.mutate('treatment_journal', superAdminActor, 'create', {
        values: {
          user_package_id: upkg.id,
          booking_id: booking.id,
          technician_id: technicianId,
          customer_id: customerOneId,
          session_number: 1,
          session_date: '2026-03-15',
          condition_before: 'Da khô thiếu ẩm',
          condition_after: 'Da ẩm mượt, cải thiện 30%',
          treatment_notes: 'Điện di tinh chất B5 phục hồi',
          specialist_advice: 'Uống tối thiểu 2 lít nước mỗi ngày và tránh nắng trực tiếp',
          home_care_instructions: 'Uống tối thiểu 2 lít nước mỗi ngày và tránh nắng trực tiếp',
          treatment_areas: ['Toàn mặt', 'Cổ'],
          treatment_protocol: 'MLD-FACIAL-RECOVER-01',
          has_abnormal_reaction: false,
          consumables_used: consumables,
        },
      });

      expect(journal.id).toBeDefined();

      // Verify inventory outbox
      const outbox = (await pg.query<any>(
        'SELECT * FROM treatment_inventory_outbox WHERE treatment_journal_id=$1',
        [journal.id],
      )).rows;
      expect(outbox.length).toBe(1);
      expect(outbox[0].sync_status).toBe('PENDING_SYNC');
      expect(outbox[0].operation_type).toBe('DEDUCT');

      // Verify post-care outbox
      const postCare = (await pg.query<any>(
        'SELECT * FROM post_care_outbox WHERE treatment_journal_id=$1',
        [journal.id],
      )).rows;
      expect(postCare.length).toBe(1);
      expect(postCare[0].status).toBe('PENDING');
      expect(postCare[0].content).toContain('Uống tối thiểu 2 lít nước');
    });

    it('approves clinical session by authorized supervisor', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 1, '2026-03-16', 'Tốt', 'Tốt', 'Ghi chú', 'Lời khuyên', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      const approved = await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'approve-clinical',
      });

      expect(approved.confirmation_status).toBe('CONFIRMED');
      expect(approved.clinical_approved_by).toBe(superAdminActor.id);
      expect(approved.clinical_approved_at).not.toBeNull();
    });
  });

  describe('4. Operational Dashboard Stats Integration', () => {
    it('aggregates operational metrics with accurate counts from database', async () => {
      const stats = await service.treatmentDashboardStats(superAdminActor);

      expect(stats).toBeDefined();
      expect(typeof stats.activePackages).toBe('number');
      expect(typeof stats.pausedPackages).toBe('number');
      expect(typeof stats.expiredPackages).toBe('number');
      expect(typeof stats.completedPackages).toBe('number');
      expect(typeof stats.usedSessions).toBe('number');
      expect(typeof stats.remainingSessions).toBe('number');
      expect(typeof stats.reversalsCount).toBe('number');
      expect(typeof stats.abnormalReactionsCount).toBe('number');
      expect(typeof stats.pendingInventorySync).toBe('number');
      expect(typeof stats.pendingCommissionsCount).toBe('number');
      expect(stats.reversalsCount).toBeGreaterThan(0);
    });
  });
});

