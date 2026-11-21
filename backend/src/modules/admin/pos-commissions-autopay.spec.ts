import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';
const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');

describe('POS 80mm, 3 commission rates, all-staff sellers, no tier auto-upgrade & auto-pay workflows', () => {
  let pg: PGlite;
  let adminService: AdminService;
  let paymentsService: PaymentsService;
  let actor: any;
  let sellerWithRates: any;
  let sellerNoProfile: any;
  let customer: any;
  let branch: any;
  let spaService: any;
  let spaPackage: any;
  let homeProduct: any;
  let course: any;
  let batch: any;

  const query = async (sql: string, values?: any[]) => {
    const result = await pg.query<any>(sql, values);
    return { ...result, rowCount: result.rows.length || result.affectedRows || 0 };
  };
  const client = { query, release: () => {} };

  beforeAll(async () => {
    pg = new PGlite();
    await loadAdminSchema(pg);
    actor = (
      await query(
        "INSERT INTO users(phone,full_name,role,referral_code,is_active) VALUES('0900700001','Super Admin Test','SUPER_ADMIN','SADM7',true) RETURNING *",
      )
    ).rows[0];
    sellerWithRates = (
      await query(
        "INSERT INTO users(phone,full_name,role,referral_code,is_active) VALUES('0900700002','Seller Multi Rate','RECEPTIONIST','SELL1',true) RETURNING *",
      )
    ).rows[0];
    sellerNoProfile = (
      await query(
        "INSERT INTO users(phone,full_name,role,referral_code,is_active) VALUES('0900700003','Seller No Profile','ADMIN','SELL2',true) RETURNING *",
      )
    ).rows[0];
    customer = (
      await query(
        "INSERT INTO users(phone,full_name,role,referral_code,membership_tier,is_active) VALUES('0900700004','Customer Seven','CUSTOMER','CUST7','STANDARD',true) RETURNING *",
      )
    ).rows[0];
    branch = (
      await query(
        "INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('MLD Branch Seven','SEV-1','0900700005','Test','Test',10,106,'https://example.invalid/img.png') RETURNING *",
      )
    ).rows[0];
    await query(
      `INSERT INTO staff_profiles(user_id,branch_id,employee_code,position,commission_rate,package_commission_rate,product_commission_rate,is_active)
       VALUES($1,$2,'EMP-77','Tư vấn viên',10,7,15,true)`,
      [sellerWithRates.id, branch.id],
    );
    const spaCategory = (
      await query(
        "INSERT INTO service_categories(name,code,icon_url) VALUES('Cat 7','CAT7','https://example.invalid/icon.png') RETURNING *",
      )
    ).rows[0];
    spaService = (
      await query(
        "INSERT INTO services(category_id,name,slug,short_description,full_description,price,image_url) VALUES($1,'Service 7','service-7','Test','Test',1000000,'https://example.invalid/img.png') RETURNING *",
        [spaCategory.id],
      )
    ).rows[0];
    spaPackage = (
      await query(
        "INSERT INTO treatment_packages(name,service_id,total_sessions,price,validity_months,description,image_url) VALUES('Package 7',$1,10,5000000,6,'Test','https://example.invalid/img.png') RETURNING *",
        [spaService.id],
      )
    ).rows[0];
    homeProduct = (
      await query(
        "INSERT INTO home_products(name,category,price_min,price_max,unit,is_active) VALUES('Oil 7','CARE',200000,200000,'Chai',true) RETURNING *",
      )
    ).rows[0];
    const courseCat = (
      await query(
        "INSERT INTO course_categories(name,code,icon_url) VALUES('Edu 7','EDU7','https://example.invalid/icon.png') RETURNING *",
      )
    ).rows[0];
    course = (
      await query(
        "INSERT INTO courses(category_id,title,code,short_description,full_description,image_url) VALUES($1,'Course 7','CRS7','Test','Test','https://example.invalid/img.png') RETURNING *",
        [courseCat.id],
      )
    ).rows[0];
    batch = (
      await query(
        "INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text) VALUES($1,$2,'B7','2026-11-01','2026-12-01','Test') RETURNING *",
        [course.id, branch.id],
      )
    ).rows[0];

    const dbMock = { connection: { query, connect: async () => client } } as any;
    adminService = new AdminService(
      dbMock,
      new ConfigService({ JWT_SECRET: 'isolated-flow-secret-at-least-32-characters' }),
      new JwtService(),
    );
    const mockSupabase = { adminClient: { from: vi.fn() } } as any;
    const mockRedis = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK') } as any;
    paymentsService = new PaymentsService(
      new ConfigService({ BANK_WEBHOOK_SECRET: 'sec-7' }),
      mockSupabase,
      mockRedis,
      undefined,
      dbMock,
    );
  }, 60000);

  afterAll(async () => {
    await pg?.close();
  });

  it('lists all active internal users including staff without staff_profiles and exposes all 3 commission rates', async () => {
    const ws = await adminService.cashierWorkspace(actor, branch.id);
    const ids = new Set(ws.staff.map((s: any) => s.id));
    expect(ids.has(sellerWithRates.id)).toBe(true);
    expect(ids.has(sellerNoProfile.id)).toBe(true);
    const multiRateRow = ws.staff.find((s: any) => s.id === sellerWithRates.id);
    expect(multiRateRow.staff_profile.commission_rate).toBe(10);
    expect(multiRateRow.staff_profile.package_commission_rate).toBe(7);
    expect(multiRateRow.staff_profile.product_commission_rate).toBe(15);
    const noProfileRow = ws.staff.find((s: any) => s.id === sellerNoProfile.id);
    expect(noProfileRow.staff_profile).toBeTruthy();
    expect(noProfileRow.staff_profile.package_commission_rate).toBe(0);
  });

  it('credits distinct service (10%), product (15%) and package (7%) commissions without upgrading customer membership_tier', async () => {
    const shift = await adminService.openCashierShift(actor, { branchId: branch.id, openingCash: 0 });
    try {
      const cartResult = await adminService.collectCashierPayment(actor, {
        kind: 'CART',
        shiftId: shift.id,
        customerId: customer.id,
        commissionStaffId: sellerWithRates.id,
        paymentMethod: 'VNPAY',
        vatRate: 0,
        items: [
          { type: 'SERVICE', id: spaService.id, quantity: 1 },
          { type: 'PRODUCT', id: homeProduct.id, quantity: 2 },
        ],
        expectedTotal: 1400000,
        requestId: randomUUID(),
      });
      expect(cartResult.invoice.payment_method).toBe('VNPAY');
      const cartComms = (
        await query('SELECT commission_type, percentage, commission_amount FROM staff_commissions WHERE invoice_id=$1 ORDER BY commission_type', [
          cartResult.invoice.id,
        ])
      ).rows;
      expect(cartComms).toEqual([
        { commission_type: 'PRODUCT_SALE', percentage: '15.00', commission_amount: '60000.00' },
        { commission_type: 'SERVICE_DIRECT', percentage: '10.00', commission_amount: '100000.00' },
      ]);

      const pkgResult = await adminService.collectCashierPayment(actor, {
        kind: 'PACKAGE',
        shiftId: shift.id,
        branchId: branch.id,
        customerId: customer.id,
        packageId: spaPackage.id,
        commissionStaffId: sellerWithRates.id,
        paymentMethod: 'BANK_TRANSFER',
        vatRate: 0,
        expectedTotal: 5000000,
        requestId: randomUUID(),
      });
      expect(pkgResult.userPackage.totalSessions).toBe(10);
      expect(pkgResult.userPackage.completedSessions).toBe(0);
      expect(pkgResult.userPackage.remainingSessions).toBe(10);
      const pkgComms = (
        await query('SELECT commission_type, percentage, commission_amount FROM staff_commissions WHERE invoice_id=$1', [
          pkgResult.invoice.id,
        ])
      ).rows;
      expect(pkgComms).toEqual([
        { commission_type: 'TREATMENT_PATHWAY', percentage: '7.00', commission_amount: '350000.00' },
      ]);

      const custRow = (await query('SELECT membership_tier, total_spent FROM users WHERE id=$1', [customer.id])).rows[0];
      expect(custRow.membership_tier).toBe('STANDARD');
      expect(Number(custRow.total_spent)).toBeGreaterThanOrEqual(6400000);
    } finally {
      await adminService.closeCashierShift(actor, shift.id, { closingCash: 0 });
    }
  });

  it('settles HD-POS pending QR and HV- student transfer webhooks atomically and idempotently', async () => {
    const shift = await adminService.openCashierShift(actor, { branchId: branch.id, openingCash: 0 });
    const pendingQr = await adminService.createPendingCashierQr(actor, {
      kind: 'PACKAGE',
      shiftId: shift.id,
      branchId: branch.id,
      customerId: customer.id,
      packageId: spaPackage.id,
      commissionStaffId: sellerWithRates.id,
      vatRate: 0,
      expectedTotal: 5000000,
      requestId: randomUUID(),
    });
    expect(pendingQr.invoiceCode).toMatch(/^HD-POS-/);
    expect(pendingQr.transferContent).toBe(`MLD ${pendingQr.invoiceCode}`);

    const webhookHeaders = { authorization: 'Bearer sec-7' };
    const webhookRes = await paymentsService.handleBankTransferWebhook(
      {
        transferAmount: 5000000,
        content: pendingQr.transferContent,
        referenceCode: 'MB-SEPAY-POS-777',
        transferType: 'in',
      },
      webhookHeaders,
    );
    expect(webhookRes.data[0].matchedType).toBe('INVOICE');
    expect(webhookRes.data[0].matchedCode).toBe(pendingQr.invoiceCode);

    const statusCheck = await adminService.getPendingCashierQrStatus(actor, pendingQr.invoiceId);
    expect(statusCheck.isPaid).toBe(true);
    expect(statusCheck.userPackage.totalSessions).toBe(10);
    expect(statusCheck.userPackage.remainingSessions).toBe(10);

    await paymentsService.handleBankTransferWebhook(
      {
        transferAmount: 5000000,
        content: pendingQr.transferContent,
        referenceCode: 'MB-SEPAY-POS-777-DUP',
        transferType: 'in',
      },
      webhookHeaders,
    );
    const commRows = (await query('SELECT id FROM staff_commissions WHERE invoice_id=$1', [pendingQr.invoiceId])).rows;
    expect(commRows).toHaveLength(1);

    const enrollment = await adminService.mutate('course_enrollments', actor, 'create', {
      values: {
        student_id: customer.id,
        course_id: course.id,
        batch_id: batch.id,
        tuition_total: 2000000,
        order_code: 'HV-20261118-009',
        assigned_staff_id: sellerWithRates.id,
      },
    });
    await query("UPDATE course_enrollments SET consultation_status='CONFIRMED' WHERE id=$1", [enrollment.id]);
    const hvWebhook = await paymentsService.handleBankTransferWebhook(
      {
        transferAmount: 2000000,
        content: 'MLD HV-20261118-009',
        referenceCode: 'MB-HV-999',
        transferType: 'in',
      },
      webhookHeaders,
    );
    expect(hvWebhook.data[0].matchedType).toBe('ENROLLMENT');
    const enrRow = (
      await query('SELECT amount_paid, payment_status, approval_status FROM course_enrollments WHERE id=$1', [enrollment.id])
    ).rows[0];
    expect(Number(enrRow.amount_paid)).toBe(2000000);
    expect(enrRow.payment_status).toBe('PAID');
    expect(enrRow.approval_status).toBe('PENDING_APPROVAL');

    const student2 = (
      await query(
        "INSERT INTO users(phone,full_name,email,role,referral_code) VALUES('0911111222','Hoc Vien Thu Hai','hv2@mld.local','STUDENT','HV-20261118-010') RETURNING id",
      )
    ).rows[0];
    const posEnrollment = await adminService.mutate('course_enrollments', actor, 'create', {
      values: {
        student_id: student2.id,
        course_id: course.id,
        batch_id: batch.id,
        tuition_total: 3000000,
        order_code: 'HV-20261118-010',
        assigned_staff_id: sellerNoProfile.id,
      },
    });
    await query("UPDATE course_enrollments SET consultation_status='CONFIRMED' WHERE id=$1", [posEnrollment.id]);
    const tuitionQr = await adminService.createPendingCashierQr(actor, {
      kind: 'TUITION',
      enrollmentId: posEnrollment.id,
      amount: 1500000,
      shiftId: shift.id,
      branchId: branch.id,
      commissionStaffId: sellerWithRates.id,
    });
    expect(tuitionQr.transferContent).toBe('MLD HV-20261118-010');
    const shiftBeforeTuition = Number(
      (await query('SELECT transfer_sales FROM cashier_shifts WHERE id=$1', [shift.id])).rows[0].transfer_sales,
    );
    await paymentsService.handleBankTransferWebhook(
      {
        transferAmount: 1500000,
        content: 'MLD HV20261118010',
        referenceCode: 'MB-HV-POS-010',
        transferType: 'in',
      },
      webhookHeaders,
    );
    const shiftAfterTuition = Number(
      (await query('SELECT transfer_sales FROM cashier_shifts WHERE id=$1', [shift.id])).rows[0].transfer_sales,
    );
    expect(shiftAfterTuition - shiftBeforeTuition).toBe(1500000);
    const txRow = (
      await query('SELECT id, shift_id, cashier_id FROM tuition_transactions WHERE enrollment_id=$1', [posEnrollment.id])
    ).rows[0];
    expect(txRow.shift_id).toBe(shift.id);
    expect(txRow.cashier_id).toBe(actor.id);
    const txComm = (
      await query('SELECT staff_id, commission_amount FROM staff_commissions WHERE tuition_transaction_id=$1', [txRow.id])
    ).rows[0];
    expect(txComm.staff_id).toBe(sellerWithRates.id);
    expect(Number(txComm.commission_amount)).toBe(150000);
    const clearedQr = (await query('SELECT pending_pos_qr FROM course_enrollments WHERE id=$1', [posEnrollment.id])).rows[0];
    expect(clearedQr.pending_pos_qr).toBeNull();
    await adminService.closeCashierShift(actor, shift.id, { closingCash: 0 });
  });

  it('loads customer benefits, redeems points and user vouchers across cash and pending QR settlement, and reverses cleanly on refund', async () => {
    await query('UPDATE users SET reward_points=4000 WHERE id=$1', [customer.id]);
    await query(
      "INSERT INTO loyalty_point_settings(id,earn_amount_per_point,redeem_value_per_point,max_redeem_percent_per_order,point_expiry_months,is_active) VALUES(1,10000,100,30,12,true) ON CONFLICT (id) DO UPDATE SET earn_amount_per_point=10000, redeem_value_per_point=100, max_redeem_percent_per_order=30, is_active=true",
    );
    const coupon = (
      await query(
        "INSERT INTO coupons(code,title,discount_percent,min_order_amount,usage_limit,used_count,valid_from,valid_to,is_active) VALUES('VIP20','VIP 20%',20,0,50,0,now()-interval '1 day',now()+interval '30 days',true) RETURNING *",
      )
    ).rows[0];
    const uv = (
      await query(
        "INSERT INTO user_vouchers(user_id,coupon_id,status,expires_at) VALUES($1,$2,'AVAILABLE',now()+interval '7 days') RETURNING *",
        [customer.id, coupon.id],
      )
    ).rows[0];

    const benefits = await adminService.getCashierCustomerBenefits(actor, customer.id);
    expect(benefits.rewardPoints).toBe(4000);
    expect(benefits.userVouchers.some((v) => v.id === uv.id)).toBe(true);
    expect(benefits.publicCoupons.some((c) => c.code === 'VIP20')).toBe(true);

    const shift = await adminService.openCashierShift(actor, { branchId: branch.id, openingCash: 0 });
    await expect(
      adminService.collectCashierPayment(actor, {
        kind: 'CART',
        branchId: branch.id,
        shiftId: shift.id,
        customerId: customer.id,
        paymentMethod: 'CASH_AT_SPA',
        vatRate: 0,
        userVoucherId: uv.id,
        redeemPoints: 3000,
        expectedTotal: 500000,
        items: [{ id: spaService.id, type: 'SERVICE', serviceId: spaService.id, quantity: 1 }],
        requestId: randomUUID(),
      }),
    ).rejects.toThrow(/vượt mức tối đa/i);

    const paidDirect = await adminService.collectCashierPayment(actor, {
      kind: 'CART',
      branchId: branch.id,
      shiftId: shift.id,
      customerId: customer.id,
      paymentMethod: 'CASH_AT_SPA',
      vatRate: 0,
      userVoucherId: uv.id,
      redeemPoints: 2000,
      expectedTotal: 600000,
      items: [{ id: spaService.id, type: 'SERVICE', serviceId: spaService.id, quantity: 1 }],
      requestId: randomUUID(),
    });
    expect(Number(paidDirect.invoice.discount_amount)).toBe(200000);
    expect(Number(paidDirect.invoice.points_redeemed_amount)).toBe(200000);
    expect(Number(paidDirect.invoice.total_amount)).toBe(600000);

    const uvUsed = (await query('SELECT status, used_in_invoice_id FROM user_vouchers WHERE id=$1', [uv.id])).rows[0];
    expect(uvUsed.status).toBe('USED');
    expect(uvUsed.used_in_invoice_id).toBe(paidDirect.invoice.id);
    const ptsAfterDirect = Number((await query('SELECT reward_points FROM users WHERE id=$1', [customer.id])).rows[0].reward_points);
    expect(ptsAfterDirect).toBe(2060);

    await adminService.action('invoices', actor, {
      key: { id: paidDirect.invoice.id },
      action: 'refund',
      reason: 'Khach doi lich khac',
    });
    const uvRestored = (await query('SELECT status, used_in_invoice_id FROM user_vouchers WHERE id=$1', [uv.id])).rows[0];
    expect(uvRestored.status).toBe('AVAILABLE');
    expect(uvRestored.used_in_invoice_id).toBeNull();
    const ptsAfterRefund = Number((await query('SELECT reward_points FROM users WHERE id=$1', [customer.id])).rows[0].reward_points);
    expect(ptsAfterRefund).toBe(4000);

    const qrCart = await adminService.createPendingCashierQr(actor, {
      kind: 'CART',
      shiftId: shift.id,
      branchId: branch.id,
      customerId: customer.id,
      userVoucherId: uv.id,
      redeemPoints: 1000,
      vatRate: 0,
      expectedTotal: 700000,
      items: [{ id: spaService.id, type: 'SERVICE', serviceId: spaService.id, quantity: 1 }],
      requestId: randomUUID(),
    });
    await paymentsService.handleBankTransferWebhook(
      {
        transferAmount: 700000,
        content: qrCart.transferContent,
        referenceCode: 'MB-LOYALTY-QR-01',
        transferType: 'in',
      },
      { authorization: 'Bearer sec-7' },
    );
    const ptsAfterQr = Number((await query('SELECT reward_points FROM users WHERE id=$1', [customer.id])).rows[0].reward_points);
    expect(ptsAfterQr).toBe(3070);
    const uvUsedByQr = (await query('SELECT status, used_in_invoice_id FROM user_vouchers WHERE id=$1', [uv.id])).rows[0];
    expect(uvUsedByQr.status).toBe('USED');
    expect(uvUsedByQr.used_in_invoice_id).toBe(qrCart.invoiceId);
    await adminService.closeCashierShift(actor, shift.id, { closingCash: 0 });
  });
});
