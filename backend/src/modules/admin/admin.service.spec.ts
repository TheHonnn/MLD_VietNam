import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { ADMIN_RESOURCES } from './admin.resources';
import { AdminGuard } from './admin.guard';

// Isolated PostgreSQL fixtures only. Never read .env or connect to the shared DB.
describe('Admin shared-schema integration', () => {
  let pg: PGlite, service: AdminService;
  const actor = {
    id: '00000000-0000-4000-8000-000000000001',
    role: 'SUPER_ADMIN',
  };
  const client = {
    query: async (sql: string, values?: any[]) => {
      const r = await pg.query(sql, values);
      return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
    },
    release: () => {},
  };
  beforeAll(async () => {
    pg = new PGlite();
    const schema = readFileSync(
      resolve(__dirname, '../../../../database/schema.sql'),
      'utf8',
    )
      .replace(/^CREATE EXTENSION[^\n]*$/gm, '')
      .replace(/^CREATE INDEX[^\n]*gin_trgm_ops[^\n]*$/gm, '');
    await pg.exec(schema);
    await pg.query(
      "INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000001','Test operator','SUPER_ADMIN','TESTADMIN')",
      [actor.id],
    );
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
  it('loads all allowlisted resources against the canonical schema', async () => {
    for (const table of Object.keys(ADMIN_RESOURCES)) {
      const result = await service.list(table, actor, {});
      expect(
        result.columns.some((c) => c.primary),
        table,
      ).toBe(true);
      expect(
        result.columns.some((c) =>
          ['password_hash', 'fcm_device_token', 'qr_code_hash'].includes(
            c.name,
          ),
        ),
        table,
      ).toBe(false);
    }
  });
  it('rejects arbitrary tables, privilege module access and unknown fields', async () => {
    expect(() => service.resource('users; DROP TABLE users', actor)).toThrow();
    expect(() =>
      service.resource('roles', { ...actor, role: 'ADMIN' }),
    ).toThrow();
    await expect(
      service.mutate('users', actor, 'create', {
        values: { full_name: 'x', password_hash: 'x' },
      }),
    ).rejects.toThrow();
    await expect(
      service.mutate('point_transactions', actor, 'create', { values: {} }),
    ).rejects.toThrow();
  });
  it('performs actual CRUD, detects stale changes and protects relationships', async () => {
    const created = await service.mutate(
      'service_categories',
      actor,
      'create',
      {
        values: {
          name: 'Test only',
          code: 'TESTCAT',
          icon_url: 'https://example.invalid/icon.png',
        },
      },
    );
    const updated = await service.mutate(
      'service_categories',
      actor,
      'update',
      { key: { id: created.id }, values: { name: 'Updated' } },
    );
    expect(updated.name).toBe('Updated');
    const row = await service.mutate('services', actor, 'create', {
      values: {
        category_id: created.id,
        name: 'Test service',
        slug: 'test-service',
        short_description: 'Test',
        full_description: 'Test',
        price: 100000,
        image_url: 'https://example.invalid/service.png',
      },
    });
    await expect(
      service.mutate('service_categories', actor, 'delete', {
        key: { id: created.id },
      }),
    ).rejects.toThrow(/sử dụng/);
    await expect(
      service.mutate('services', actor, 'update', {
        key: { id: row.id },
        values: { name: 'Stale' },
      }),
    ).rejects.toThrow(/thay đổi/);
    await service.mutate('services', actor, 'delete', {
      key: { id: row.id },
      expectedUpdatedAt: row.updated_at as string,
    });
    await service.mutate('service_categories', actor, 'delete', {
      key: { id: created.id },
    });
    const list = await service.list('service_categories', actor, {
      filter: JSON.stringify({ id: created.id }),
    });
    expect(list.total).toBe(0);
  });
  it('keeps package activation and session counts tied to checkout and ordered journals', async () => {
    const customer = await service.mutate('users', actor, 'create', {
      values: {
        phone: '0900000011',
        full_name: 'Treatment package customer',
        role: 'CUSTOMER',
      },
    });
    const category = await service.mutate('service_categories', actor, 'create', {
      values: {
        name: 'Treatment package tests',
        code: 'TREATPKGTEST',
        icon_url: 'https://example.invalid/category.png',
      },
    });
    const treatment = await service.mutate('services', actor, 'create', {
      values: {
        category_id: category.id,
        name: 'Treatment package service',
        slug: 'treatment-package-service',
        short_description: 'Test',
        full_description: 'Test',
        price: 100000,
        duration_minutes: 60,
        image_url: 'https://example.invalid/service.png',
      },
    });
    await expect(service.mutate('treatment_packages', actor, 'create', {
      values: {
        name: 'Invalid package', total_sessions: 1, price: 100000,
        validity_months: 6, description: 'Test', image_url: 'https://example.invalid/package.png',
        service_id: treatment.id,
      },
    })).rejects.toThrow(/ít nhất 2 buổi/);
    const treatmentPackage = await service.mutate('treatment_packages', actor, 'create', {
      values: {
        name: 'Two session package', service_id: treatment.id,
        total_sessions: 2, price: 180000, discount_price: 160000,
        validity_months: 3, description: 'Test', image_url: 'https://example.invalid/package.png',
      },
    });

    await expect(service.mutate('user_packages', actor, 'create', {
      values: { customer_id: customer.id, package_id: treatmentPackage.id, total_sessions: 2 },
    })).rejects.toThrow(/POS/);

    const owner = (await pg.query<any>(
      `INSERT INTO user_packages(customer_id,package_id,total_sessions,expires_at)
       VALUES($1,$2,2,now()+interval '3 months') RETURNING id`,
      [customer.id, treatmentPackage.id],
    )).rows[0];
    const session = (sessionNumber: number) => service.mutate('treatment_journal', actor, 'create', {
      values: {
        user_package_id: owner.id, customer_id: customer.id,
        session_number: sessionNumber, session_date: new Date().toISOString().slice(0, 10),
      },
    });
    await expect(session(2)).rejects.toThrow(/buổi 1/);
    await session(1);
    await session(2);
    const completed = (await pg.query<any>(
      'SELECT completed_sessions,status FROM user_packages WHERE id=$1', [owner.id],
    )).rows[0];
    expect(completed.completed_sessions).toBe(2);
    expect(completed.status).toBe('COMPLETED');
    await expect(session(3)).rejects.toThrow();
    await expect(service.mutate('user_packages', actor, 'update', {
      key: { id: owner.id }, values: { completed_sessions: 1 },
    })).rejects.toThrow(/nhật ký điều trị/);
  });
  it('creates real users with generated referral and hashed optional password, and never returns hashes', async () => {
    const user = await service.mutate('users', actor, 'create', {
      values: {
        phone: '0900000002',
        full_name: 'Test student',
        role: 'STUDENT',
        password: 'Testing-password-123',
      },
    });
    expect(user.id).toBeTruthy();
    expect(user.password_hash).toBeUndefined();
    expect(user.referral_code).toMatch(/^MLD/);
    const stored = await pg.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id=$1',
      [user.id],
    );
    expect(stored.rows[0].password_hash).toMatch(/^\$2/);
    const login = await service
      .login({ identifier: '0900000001', password: 'invalid' }, 'test')
      .catch(() => null);
    expect(login).toBeNull();
  });
  it('supports composite keys without creating artificial IDs', async () => {
    const role = await service.mutate('roles', actor, 'create', {
      values: { code: 'TESTROLE', name: 'Test role' },
    });
    const permission = await service.mutate('permissions', actor, 'create', {
      values: {
        code: 'services.read',
        module: 'services',
        name: 'Read services',
      },
    });
    const link = await service.mutate('role_permissions', actor, 'create', {
      values: { role_id: role.id, permission_id: permission.id },
    });
    await service.mutate('role_permissions', actor, 'delete', {
      key: { role_id: link.role_id, permission_id: link.permission_id },
    });
    await expect(
      service.mutate('role_permissions', actor, 'delete', {
        key: { id: role.id },
      }),
    ).rejects.toThrow();
  });
  it('does not pretend payment, checkout or certificate issuance succeeded', async () => {
    await expect(
      service.action('bookings', actor, {
        key: { id: actor.id },
        action: 'checkout',
      }),
    ).rejects.toThrow();
    const columns = await service.columns('tuition_transactions', actor);
    expect(columns.find((c) => c.name === 'amount_paid')).toBeUndefined();
    await expect(
      service.mutate('tuition_transactions', actor, 'create', {
        values: { payment_status: 'PAID' },
      }),
    ).rejects.toThrow();
    await expect(
      service.mutate('users', actor, 'update', {
        key: { id: actor.id },
        values: { is_active: false },
      }),
    ).rejects.toThrow();
  });
  it('sanitizes filters, rejects invalid types and reports real zero metrics', async () => {
    await expect(
      service.list('users', actor, { filter: '{"password_hash":"x"}' }),
    ).rejects.toThrow();
    await expect(
      service.list('users', actor, { filter: 'null' }),
    ).rejects.toThrow();
    const columns = await service.columns('service_categories', actor);
    expect(() =>
      service.validate(columns, { is_active: 'true' }, false),
    ).toThrow();
    expect(() =>
      service.validate(columns, { display_order: 1.5 }, false),
    ).toThrow();
    const result = await service.summary('2026-01-01', '2026-12-31');
    expect(result.invoiceRevenue).toBe('0');
    expect(result.tuitionRevenue).toBe('0');
  });
  it('records tuition once, rolls back overpayment and forbids editing posted transactions', async () => {
    const student = (
      await pg.query<any>("SELECT id FROM users WHERE role='STUDENT' LIMIT 1")
    ).rows[0];
    const branch = (
      await pg.query<any>(
        "INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('Test branch','TESTBR','0900000003','Test','Test',10,106,'https://example.invalid/branch.png') RETURNING id",
      )
    ).rows[0];
    const cat = (
      await pg.query<any>(
        "INSERT INTO course_categories(name,code,icon_url) VALUES('Test courses','TESTCOURSE','https://example.invalid/icon.png') RETURNING id",
      )
    ).rows[0];
    const course = (
      await pg.query<any>(
        "INSERT INTO courses(category_id,title,code,short_description,full_description,image_url) VALUES($1,'Test course','TESTC','Test','Test','https://example.invalid/course.png') RETURNING id",
        [cat.id],
      )
    ).rows[0];
    const batch = (
      await pg.query<any>(
        "INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text,max_students) VALUES($1,$2,'TESTBATCH','2026-01-01','2026-12-31','Test',1) RETURNING id",
        [course.id, branch.id],
      )
    ).rows[0];
    const enrollment = await service.mutate(
      'course_enrollments',
      actor,
      'create',
      {
        values: {
          student_id: student.id,
          course_id: course.id,
          batch_id: batch.id,
          tuition_total: 100000,
        },
      },
    );
    expect(
      (
        await pg.query<any>(
          'SELECT enrolled_count FROM course_batches WHERE id=$1',
          [batch.id],
        )
      ).rows[0].enrolled_count,
    ).toBe(1);
    const invoice = await service.mutate(
      'tuition_transactions',
      actor,
      'create',
      {
        values: {
          transaction_code: 'TESTPAY',
          enrollment_id: enrollment.id,
          student_id: student.id,
          course_id: course.id,
          branch_id: branch.id,
          amount: 60000,
          payment_method: 'CASH_AT_SPA',
        },
      },
    );
    await service.action('tuition_transactions', actor, {
      key: { id: invoice.id },
      action: 'confirm-payment',
    });
    await expect(
      service.action('tuition_transactions', actor, {
        key: { id: invoice.id },
        action: 'confirm-payment',
      }),
    ).rejects.toThrow();
    expect(
      Number(
        (
          await pg.query<any>(
            'SELECT amount_paid FROM course_enrollments WHERE id=$1',
            [enrollment.id],
          )
        ).rows[0].amount_paid,
      ),
    ).toBe(60000);
    await expect(
      service.mutate('tuition_transactions', actor, 'delete', {
        key: { id: invoice.id },
      }),
    ).rejects.toThrow();
    const tooMuch = await service.mutate(
      'tuition_transactions',
      actor,
      'create',
      {
        values: {
          transaction_code: 'TESTOVERPAY',
          enrollment_id: enrollment.id,
          student_id: student.id,
          course_id: course.id,
          branch_id: branch.id,
          amount: 60000,
          payment_method: 'CASH_AT_SPA',
        },
      },
    );
    await expect(
      service.action('tuition_transactions', actor, {
        key: { id: tooMuch.id },
        action: 'confirm-payment',
      }),
    ).rejects.toThrow();
    expect(
      (
        await pg.query<any>(
          'SELECT payment_status FROM tuition_transactions WHERE id=$1',
          [tooMuch.id],
        )
      ).rows[0].payment_status,
    ).toBe('PENDING');
  });
  it('validates attendance belongs to the right batch and synchronizes attendance totals', async () => {
    const enrollment = (
      await pg.query<any>('SELECT * FROM course_enrollments LIMIT 1')
    ).rows[0];
    const schedule = await service.mutate('batch_schedules', actor, 'create', {
      values: {
        batch_id: enrollment.batch_id,
        session_date: '2026-01-05',
        start_time: '08:00',
        end_time: '10:00',
        topic: 'Test session',
      },
    });
    await service.mutate('student_academic_records', actor, 'create', {
      values: {
        enrollment_id: enrollment.id,
        theory_score: 8,
        practical_score: 8,
        attended_sessions: 0,
        total_batch_sessions: 1,
        attendance_rate: 0,
      },
    });
    const attendance = await service.mutate(
      'student_attendance',
      actor,
      'create',
      {
        values: {
          enrollment_id: enrollment.id,
          schedule_id: schedule.id,
          status: 'PRESENT',
        },
      },
    );
    const stats = (
      await pg.query<any>(
        'SELECT * FROM student_academic_records WHERE enrollment_id=$1',
        [enrollment.id],
      )
    ).rows[0];
    expect(Number(stats.attendance_rate)).toBe(100);
    await expect(
      service.mutate('student_attendance', actor, 'create', {
        values: {
          enrollment_id: enrollment.id,
          schedule_id: schedule.id,
          status: 'PRESENT',
        },
      }),
    ).rejects.toThrow();
    await service.mutate('student_attendance', actor, 'update', {
      key: { id: attendance.id },
      values: { status: 'ABSENT' },
    });
    expect(
      Number(
        (
          await pg.query<any>(
            'SELECT attendance_rate FROM student_academic_records WHERE enrollment_id=$1',
            [enrollment.id],
          )
        ).rows[0].attendance_rate,
      ),
    ).toBe(0);
  });
  it('requires graduation and tuition before issuing a real certificate and preserves revocation', async () => {
    const e = (await pg.query<any>('SELECT * FROM course_enrollments LIMIT 1'))
      .rows[0];
    const cert = await service.mutate('student_certificates', actor, 'create', {
      values: {
        enrollment_id: e.id,
        student_id: e.student_id,
        course_id: e.course_id,
        certificate_code: 'TESTCERT',
        student_name: 'Test student',
        course_title: 'Test course',
        theory_score: 8,
        practical_score: 8,
        final_grade: 'Test grade',
      },
    });
    expect(cert.status).toBe('DRAFT');
    expect(cert.qr_verification_code).toBeTruthy();
    await expect(
      service.action('student_certificates', actor, {
        key: { id: cert.id },
        action: 'issue',
      }),
    ).rejects.toThrow();
    await pg.query(
      'UPDATE course_enrollments SET amount_paid=tuition_total WHERE id=$1',
      [e.id],
    );
    await pg.query(
      'UPDATE student_academic_records SET is_graduated=true,attendance_rate=100 WHERE enrollment_id=$1',
      [e.id],
    );
    await service.action('student_certificates', actor, {
      key: { id: cert.id },
      action: 'issue',
    });
    await expect(
      service.mutate('student_certificates', actor, 'delete', {
        key: { id: cert.id },
      }),
    ).rejects.toThrow();
    await service.action('student_certificates', actor, {
      key: { id: cert.id },
      action: 'revoke',
      reason: 'Test revocation',
    });
    expect(
      (
        await pg.query<any>(
          'SELECT status FROM student_certificates WHERE id=$1',
          [cert.id],
        )
      ).rows[0].status,
    ).toBe('REVOKED');
  });
  it('records real invoice payment, enforces booking transitions and reverses refunds once', async () => {
    const branch = (await pg.query<any>('SELECT id FROM branches LIMIT 1'))
      .rows[0];
    const customer = (
      await pg.query<any>("SELECT id FROM users WHERE role='STUDENT' LIMIT 1")
    ).rows[0];
    const booking = await service.mutate('bookings', actor, 'create', {
      values: {
        booking_code: 'TESTBOOKING',
        customer_id: customer.id,
        branch_id: branch.id,
        booking_date: '2026-10-16',
        start_time: '10:00',
        end_time: '11:00',
        status: 'CONFIRMED',
        base_total: 100000,
        final_price: 100000,
      },
    });
    await expect(
      service.action('bookings', actor, {
        key: { id: booking.id },
        action: 'checkout',
      }),
    ).rejects.toThrow();
    await service.action('bookings', actor, {
      key: { id: booking.id },
      action: 'checkin',
    });
    await service.action('bookings', actor, {
      key: { id: booking.id },
      action: 'start',
    });
    await expect(
      service.action('bookings', actor, {
        key: { id: booking.id },
        action: 'checkout',
      }),
    ).rejects.toThrow(/thanh toán/);
    const invoice = await service.mutate('invoices', actor, 'create', {
      values: {
        invoice_code: 'TESTINVOICE',
        branch_id: branch.id,
        customer_id: customer.id,
        booking_id: booking.id,
        subtotal: 100000,
        total_amount: 100000,
        payment_method: 'CASH_AT_SPA',
      },
    });
    await expect(
      service.action('invoices', actor, {
        key: { id: invoice.id },
        action: 'confirm-payment',
      }),
    ).rejects.toThrow(/Chi tiết/);
    await service.mutate('invoice_items', actor, 'create', {
      values: {
        invoice_id: invoice.id,
        item_name: 'Test service',
        quantity: 1,
        unit_price: 100000,
        amount: 100000,
      },
    });
    await service.action('invoices', actor, {
      key: { id: invoice.id },
      action: 'confirm-payment',
    });
    await service.action('bookings', actor, {
      key: { id: booking.id },
      action: 'checkout',
    });
    expect(
      (
        await pg.query<any>('SELECT status FROM bookings WHERE id=$1', [
          booking.id,
        ])
      ).rows[0].status,
    ).toBe('COMPLETED');
    await expect(
      service.action('invoices', actor, {
        key: { id: invoice.id },
        action: 'confirm-payment',
      }),
    ).rejects.toThrow();
    await expect(
      service.action('invoices', actor, {
        key: { id: invoice.id },
        action: 'refund',
      }),
    ).rejects.toThrow();
    await service.action('invoices', actor, {
      key: { id: invoice.id },
      action: 'refund',
      reason: 'Test refund',
    });
    await expect(
      service.action('invoices', actor, {
        key: { id: invoice.id },
        action: 'refund',
        reason: 'Duplicate',
      }),
    ).rejects.toThrow();
    const user = (
      await pg.query<any>(
        'SELECT total_spent,reward_points FROM users WHERE id=$1',
        [customer.id],
      )
    ).rows[0];
    expect(Number(user.total_spent)).toBe(0);
    expect(user.reward_points).toBe(0);
  });
  it('refunds tuition through a separate real ledger entry with idempotency', async () => {
    const e = (await pg.query<any>('SELECT * FROM course_enrollments LIMIT 1'))
        .rows[0],
      branch = (await pg.query<any>('SELECT id FROM branches LIMIT 1')).rows[0];
    const refund = await service.mutate(
      'tuition_transactions',
      actor,
      'create',
      {
        values: {
          transaction_code: 'TESTREFUND',
          enrollment_id: e.id,
          student_id: e.student_id,
          course_id: e.course_id,
          branch_id: branch.id,
          amount: 10000,
          transaction_type: 'REFUND',
          payment_method: 'BANK_TRANSFER',
        },
      },
    );
    await expect(
      service.action('tuition_transactions', actor, {
        key: { id: refund.id },
        action: 'confirm-payment',
      }),
    ).rejects.toThrow();
    await service.action('tuition_transactions', actor, {
      key: { id: refund.id },
      action: 'confirm-refund',
      reason: 'Test refund',
    });
    expect(
      Number(
        (
          await pg.query<any>(
            'SELECT amount_paid FROM course_enrollments WHERE id=$1',
            [e.id],
          )
        ).rows[0].amount_paid,
      ),
    ).toBe(Number(e.amount_paid) - 10000);
    await expect(
      service.action('tuition_transactions', actor, {
        key: { id: refund.id },
        action: 'confirm-refund',
        reason: 'Duplicate',
      }),
    ).rejects.toThrow();
  });
  it('compares actual stored timestamps correctly when editing campaigns', async () => {
    const coupon = await service.mutate('coupons', actor, 'create', {
      values: {
        code: 'TESTTIME',
        title: 'Time test',
        valid_from: '2026-01-01T00:00:00Z',
        valid_to: '2026-02-28T23:59:00Z',
      },
    });
    const updated = await service.mutate('coupons', actor, 'update', {
      key: { id: coupon.id },
      values: { title: 'Changed title' },
    });
    expect(updated.title).toBe('Changed title');
    await expect(
      service.mutate('coupons', actor, 'update', {
        key: { id: coupon.id },
        values: { valid_to: '2025-01-01T00:00:00Z' },
      }),
    ).rejects.toThrow();
  });
  it('lists and searches the current linked employee name without copying it into staff_profiles', async () => {
    const branch = (await pg.query<any>('SELECT id FROM branches LIMIT 1'))
      .rows[0];
    await service.mutate('staff_profiles', actor, 'create', {
      values: {
        user_id: actor.id,
        branch_id: branch.id,
        employee_code: 'TESTSTAFF',
        position: 'Test position',
      },
    });
    const list = await service.list('staff_profiles', actor, {
      search: 'Test operator',
      sort: 'full_name',
      direction: 'asc',
    });
    expect(list.total).toBe(1);
    expect(list.rows[0].full_name).toBe('Test operator');
    expect(list.columns.find((c) => c.name === 'full_name')?.writable).toBe(
      false,
    );
    await expect(
      service.mutate('staff_profiles', actor, 'update', {
        key: { id: list.rows[0].id },
        expectedUpdatedAt: list.rows[0].updated_at,
        values: { full_name: 'Copied name' },
      }),
    ).rejects.toThrow();
  });
  it('stores video lessons and quiz answers with correct question counts', async () => {
    const course = (await pg.query<any>('SELECT id FROM courses LIMIT 1'))
      .rows[0];
    const chapter = await service.mutate('course_chapters', actor, 'create', {
      values: { course_id: course.id, title: 'Test chapter' },
    });
    await expect(
      service.mutate('course_lessons', actor, 'create', {
        values: {
          chapter_id: chapter.id,
          title: 'Missing video',
          lesson_type: 'VIDEO',
        },
      }),
    ).rejects.toThrow();
    const lesson = await service.mutate('course_lessons', actor, 'create', {
      values: {
        chapter_id: chapter.id,
        title: 'Test video',
        lesson_type: 'VIDEO',
        video_url: 'https://example.invalid/video.mp4',
      },
    });
    expect(lesson.video_url).toBe('https://example.invalid/video.mp4');
    const quiz = await service.mutate('course_quizzes', actor, 'create', {
      values: { course_id: course.id, title: 'Test quiz' },
    });
    expect(quiz.total_questions).toBe(0);
    await expect(
      service.mutate('quiz_questions', actor, 'create', {
        values: {
          quiz_id: quiz.id,
          question_number: 1,
          question_text: 'Question',
          options: { A: 'One', B: 'Two' },
          correct_option: 'Z',
        },
      }),
    ).rejects.toThrow();
    await service.mutate('quiz_questions', actor, 'create', {
      values: {
        quiz_id: quiz.id,
        question_number: 1,
        question_text: 'Question',
        options: { A: 'One', B: 'Two' },
        correct_option: 'B',
      },
    });
    expect(
      (
        await pg.query<any>(
          'SELECT total_questions FROM course_quizzes WHERE id=$1',
          [quiz.id],
        )
      ).rows[0].total_questions,
    ).toBe(1);
  });
  it('allows temporary local access only on loopback and never in production', async () => {
    const config = new ConfigService({
      ADMIN_LOCAL_NO_AUTH: 'true',
      NODE_ENV: 'development',
    });
    const guard = new AdminGuard(
      new JwtService(),
      { connection: client } as any,
      config,
    );
    const request = {
      headers: {
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:5173',
        'x-mld-local-admin': '1',
      },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const context = (req: any) =>
      ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
    expect(await guard.canActivate(context(request))).toBe(true);
    expect((request as any).admin.id).toBe(actor.id);
    await expect(
      guard.canActivate(
        context({ ...request, socket: { remoteAddress: '192.168.1.10' } }),
      ),
    ).rejects.toThrow();
    await expect(
      guard.canActivate(
        context({
          ...request,
          headers: { ...request.headers, origin: 'https://example.com' },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      guard.canActivate(
        context({
          ...request,
          headers: { ...request.headers, host: 'example.com' },
        }),
      ),
    ).rejects.toThrow();
    config.set('NODE_ENV', 'production');
    await expect(guard.canActivate(context(request))).rejects.toThrow();
  });
  it('enforces JWT audience, current account state and explicit permissions', async () => {
    const secret = 'test-secret-only-not-a-production-key-12345';
    const jwt = new JwtService();
    const guard = new AdminGuard(
      jwt,
      { connection: client } as any,
      new ConfigService({ JWT_SECRET: secret }),
    );
    const context = (
      token: string,
      table = 'services',
      method = 'GET',
      path = 'admin/:table',
    ) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer ' + token },
            params: { table },
            method,
            route: { path },
          }),
        }),
      }) as any;
    await expect(
      guard.canActivate(context(jwt.sign({ sub: actor.id }, { secret }))),
    ).rejects.toThrow();
    expect(
      await guard.canActivate(
        context(jwt.sign({ sub: actor.id }, { secret, audience: 'mld-admin' })),
      ),
    ).toBe(true);
    const student = (
      await pg.query<any>("SELECT id FROM users WHERE role='STUDENT' LIMIT 1")
    ).rows[0];
    const token = jwt.sign(
      { sub: student.id },
      { secret, audience: 'mld-admin' },
    );
    await expect(guard.canActivate(context(token))).rejects.toThrow();
    const role = (
      await pg.query<any>("SELECT id FROM roles WHERE code='TESTROLE'")
    ).rows[0];
    const permission = (
      await pg.query<any>(
        "SELECT id FROM permissions WHERE code='services.read'",
      )
    ).rows[0];
    await pg.query(
      'INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)',
      [role.id, permission.id],
    );
    await pg.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [
      student.id,
      role.id,
    ]);
    expect(await guard.canActivate(context(token))).toBe(true);
    await expect(
      guard.canActivate(
        context(token, 'services', 'POST', 'admin/:table/create'),
      ),
    ).rejects.toThrow();
    await pg.query('UPDATE users SET is_active=false WHERE id=$1', [
      student.id,
    ]);
    await expect(guard.canActivate(context(token))).rejects.toThrow();
  });

  it('validates Supabase GoTrue Auth JWTs when SUPABASE_JWT_SECRET is configured', async () => {
    const supabaseSecret = 'supabase-test-jwt-secret-key-32-chars-long!';
    const jwt = new JwtService();
    const guard = new AdminGuard(
      jwt,
      { connection: client } as any,
      new ConfigService({ SUPABASE_JWT_SECRET: supabaseSecret }),
    );
    const context = (token?: string, table = 'services') =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: token ? { authorization: 'Bearer ' + token } : {},
            params: { table },
            method: 'GET',
            route: { path: 'admin/:table' },
          }),
        }),
      }) as any;

    // 1. Valid Supabase GoTrue token
    const validToken = jwt.sign(
      { sub: actor.id, role: 'authenticated' },
      { secret: supabaseSecret, audience: 'authenticated', expiresIn: '1h' },
    );
    expect(await guard.canActivate(context(validToken))).toBe(true);

    // 2. Expired token
    const expiredToken = jwt.sign(
      { sub: actor.id, role: 'authenticated' },
      { secret: supabaseSecret, audience: 'authenticated', expiresIn: '-1s' },
    );
    await expect(guard.canActivate(context(expiredToken))).rejects.toThrow();

    // 3. Wrong audience
    const wrongAudToken = jwt.sign(
      { sub: actor.id, role: 'authenticated' },
      { secret: supabaseSecret, audience: 'wrong-audience', expiresIn: '1h' },
    );
    await expect(guard.canActivate(context(wrongAudToken))).rejects.toThrow();

    // 4. Tampered signature
    const tamperedToken = jwt.sign(
      { sub: actor.id, role: 'authenticated' },
      { secret: 'wrong-fake-secret-that-does-not-match!!', audience: 'authenticated', expiresIn: '1h' },
    );
    await expect(guard.canActivate(context(tamperedToken))).rejects.toThrow();

    // 5. Missing token
    await expect(guard.canActivate(context())).rejects.toThrow();
  });
});
