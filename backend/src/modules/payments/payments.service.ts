import {
  Injectable,
  Optional,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service';
import { RedisService } from '../../database/redis.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { EmailService } from '../auth/services/email.service';
import { AdminDatabase } from '../admin/admin.database';
import { createHash } from 'node:crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayOS } = require('@payos/node');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private payos: any;

  // Cấu hình tài khoản ngân hàng thụ hưởng mặc định MLD
  private readonly bankBin: string;
  private readonly bankAccountNo: string;
  private readonly bankAccountName: string;

  // In-memory cache dự phòng mapping orderCode -> bookingId
  private readonly orderMappings = new Map<number, {
    bookingId?: string;
    bookingCode?: string;
    enrollmentId?: string;
    amount: number;
    description: string;
    customerName?: string;
    customerPhone?: string;
    status: string;
    createdAt: Date;
  }>();

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
    private redisService: RedisService,
    @Optional() private emailService?: EmailService,
    @Optional() private readonly adminDatabase?: AdminDatabase,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    this.bankBin = this.configService.get<string>('PAYOS_BANK_BIN', '970422');
    this.bankAccountNo = this.configService.get<string>('PAYOS_BANK_ACCOUNT_NO', '');
    this.bankAccountName = this.configService.get<string>('PAYOS_BANK_ACCOUNT_NAME', 'MLD VIETNAM');

    if (clientId && apiKey && checksumKey) {
      try {
        this.payos = new PayOS({ clientId, apiKey, checksumKey });
        this.logger.log('✅ PayOS VietQR Payment Client initialized successfully');
      } catch (e) {
        this.logger.error('Failed to initialize PayOS Client: ' + e);
        this.payos = null;
      }
    } else {
      this.payos = null;
      this.logger.warn(
        '⚠️ PayOS credentials (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY) chưa được cấu hình. VietQR PayOS sẽ hoạt động ở chế độ hiển thị VietQR tĩnh hoặc chuyển khoản thủ công.',
      );
    }
  }

  /**
   * 1. TẠO MÃ THANH TOÁN VIETQR PAYOS
   */
  async createPaymentLink(dto: CreatePaymentLinkDto) {
    const orderCode = dto.orderCode && dto.orderCode > 0
      ? dto.orderCode
      : Number(String(Date.now()).slice(-6));

    // PayOS description: tối đa 25 ký tự, chỉ chứa chữ cái, số, không có ký tự đặc biệt
    let cleanDesc = dto.description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim();
    if (cleanDesc.length > 25) {
      cleanDesc = cleanDesc.substring(0, 25);
    }
    if (!cleanDesc) {
      cleanDesc = `MLD ${orderCode}`;
    }

    const cancelUrl = 'https://mldvietnam.vn/payment/cancel';
    const returnUrl = 'https://mldvietnam.vn/payment/success';

    let payosRes: any = null;
    try {
      payosRes = await this.payos.paymentRequests.create({
        orderCode,
        amount: Math.round(dto.amount),
        description: cleanDesc,
        cancelUrl,
        returnUrl,
      });
      this.logger.log(`[PayOS] Created payment link for orderCode: ${orderCode}, amount: ${dto.amount}đ`);
    } catch (err: any) {
      this.logger.warn(`[PayOS API Warning]: ${err?.message || err}. Generating resilient VietQR payload.`);
    }

    // Lưu mapping để đối soát
    const mappingData = {
      bookingId: dto.bookingId,
      bookingCode: dto.bookingCode,
      enrollmentId: dto.enrollmentId,
      amount: dto.amount,
      description: cleanDesc,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.orderMappings.set(orderCode, mappingData);

    // Lưu vào Redis nếu có
    try {
      await this.redisService.set(`payos:order:${orderCode}`, JSON.stringify(mappingData), 86400);
    } catch (_) {}

    // Chuẩn hóa dữ liệu trả về cho Mobile App
    const qrCode = payosRes?.qrCode || this.generateStandardVietQR(dto.amount, cleanDesc);
    const checkoutUrl = payosRes?.checkoutUrl || `https://pay.payos.vn/web/${orderCode}`;
    const accountNumber = payosRes?.accountNumber || this.bankAccountNo;
    const accountName = payosRes?.accountName || this.bankAccountName;
    const bin = payosRes?.bin || this.bankBin;

    return {
      orderCode,
      amount: dto.amount,
      description: cleanDesc,
      bin,
      bankName: 'MB Bank (Ngân hàng Quân Đội)',
      accountNumber,
      accountName,
      qrCode,
      checkoutUrl,
      status: 'PENDING',
      isPaid: false,
    };
  }

  /**
   * 2. KIỂM TRA TRẠNG THÁI THANH TOÁN VỚI NGÂN HÀNG (LIVE BANK CHECK)
   * QUY TẮC BẮT BUỘC: "CHƯA NHẬN TIỀN CHƯA HOÀN TẤT"
   * Chỉ khi PayOS xác nhận status === 'PAID' mới xác nhận đơn.
   */
  async checkPaymentStatus(orderCode: number) {
    let mapping = this.orderMappings.get(orderCode);
    if (!mapping) {
      try {
        const raw = await this.redisService.get(`payos:order:${orderCode}`);
        if (raw) mapping = JSON.parse(raw);
      } catch (_) {}
    }

    if (!mapping) {
      try {
        const { data: bkg } = await this.supabaseService.adminClient
          .from('bookings')
          .select('id, booking_code, branch_id, customer_id, final_price, payment_status')
          .or(`booking_code.eq.MLD-${orderCode},booking_code.ilike.%${orderCode}%`)
          .limit(1)
          .maybeSingle();

        if (bkg) {
          mapping = {
            bookingId: bkg.id,
            bookingCode: bkg.booking_code,
            amount: Number(bkg.final_price) || 0,
            description: `MLD ${orderCode}`,
            status: bkg.payment_status || 'PENDING',
            createdAt: new Date(),
          };
          this.orderMappings.set(orderCode, mapping);
        }
      } catch (err) {
        this.logger.warn(`Fallback query booking for orderCode ${orderCode} failed: ${err}`);
      }
    }

    try {
      // 1. Gọi trực tiếp API PayOS để lấy thông tin trạng thái mới nhất từ ngân hàng
      const payosInfo = await this.payos.paymentRequests.get(orderCode);
      const isPaid = payosInfo.status === 'PAID';

      this.logger.log(`[PayOS Check] orderCode: ${orderCode} -> status: ${payosInfo.status}, amountPaid: ${payosInfo.amountPaid}đ`);

      if (isPaid) {
        // CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG TRÊN DATABASE
        await this.handlePaymentSuccess(orderCode, mapping, payosInfo);

        return {
          orderCode,
          isPaid: true,
          status: 'PAID',
          amountPaid: payosInfo.amountPaid,
          message: 'Thanh toán thành công! Hệ thống đã ghi nhận tiền cọc.',
          bookingId: mapping?.bookingId,
        };
      }

      // CHƯA NHẬN ĐƯỢC TIỀN TỪ NGÂN HÀNG
      return {
        orderCode,
        isPaid: false,
        status: payosInfo.status || 'PENDING',
        amountPaid: payosInfo.amountPaid || 0,
        amountRemaining: payosInfo.amountRemaining || (mapping?.amount || 0),
        message: 'Hệ thống chưa nhận được tiền từ ngân hàng. Vui lòng chuyển khoản đúng số tiền và nội dung, hoặc chờ trong giây lát.',
      };
    } catch (err: any) {
      this.logger.error(`[PayOS Check Error] orderCode ${orderCode}: ${err?.message || err}`);
      return {
        orderCode,
        isPaid: false,
        status: 'PENDING',
        message: 'Hệ thống đang kiểm tra với ngân hàng. Chưa ghi nhận giao dịch thành công.',
      };
    }
  }

  /**
   * 3. XỬ LÝ WEBHOOK TỰ ĐỘNG TỪ PAYOS KHI CÓ TIỀN VÀO TÀI KHOẢN
   */
  async handleWebhook(webhookBody: any) {
    if (!this.payos) {
      this.logger.error('[PayOS Webhook Error] PayOS is not configured on this server');
      throw new ServiceUnavailableException('Cổng thanh toán PayOS chưa được cấu hình biến môi trường.');
    }
    try {
      // 1. Xác thực chữ ký điện tử an toàn từ PayOS (HMAC-SHA256)
      const verifiedData = await this.payos.webhooks.verify(webhookBody);
      this.logger.log(`[PayOS Webhook] Verified signature successfully for orderCode: ${verifiedData.orderCode}`);

      const orderCode = verifiedData.orderCode;
      let mapping = this.orderMappings.get(orderCode);
      if (!mapping) {
        try {
          const raw = await this.redisService.get(`payos:order:${orderCode}`);
          if (raw) mapping = JSON.parse(raw);
        } catch (_) {}
      }

      if (!mapping) {
        try {
          const { data: bkg } = await this.supabaseService.adminClient
            .from('bookings')
            .select('id, booking_code, branch_id, customer_id, final_price, payment_status')
            .or(`booking_code.eq.MLD-${orderCode},booking_code.ilike.%${orderCode}%`)
            .limit(1)
            .maybeSingle();

          if (bkg) {
            mapping = {
              bookingId: bkg.id,
              bookingCode: bkg.booking_code,
              amount: Number(bkg.final_price) || 0,
              description: `MLD ${orderCode}`,
              status: bkg.payment_status || 'PENDING',
              createdAt: new Date(),
            };
            this.orderMappings.set(orderCode, mapping);
          }
        } catch (err) {
          this.logger.warn(`Webhook fallback query booking for orderCode ${orderCode} failed: ${err}`);
        }
      }

      if (webhookBody.code === '00') {
        await this.handlePaymentSuccess(orderCode, mapping, verifiedData);
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (err: any) {
      this.logger.error(`[PayOS Webhook Error] Invalid signature or payload: ${err?.message || err}`);
      throw new BadRequestException('Chữ ký Webhook không hợp lệ!');
    }
  }

  /**
   * 4. HÀM CẬP NHẬT KHI ĐÃ NHẬN TIỀN THỰC TẾ VÀO TÀI KHOẢN NGÂN HÀNG
   */
  private async handlePaymentSuccess(orderCode: number, mapping: any, paymentData: any) {
    try {
      const { data: existingInv } = await this.supabaseService.adminClient
        .from('invoices')
        .select('id, payment_status')
        .eq('gateway_transaction_id', String(orderCode))
        .maybeSingle();

      if (existingInv && existingInv.payment_status === 'PAID') {
        this.logger.log(`[PayOS Idempotent] orderCode ${orderCode} already processed into invoice ${existingInv.id}. Skipping duplicate.`);
        return;
      }
    } catch (e) {
      this.logger.warn(`[PayOS Idempotency Check Error]: ${e}`);
    }

    if (mapping) {
      mapping.status = 'PAID';
      this.orderMappings.set(orderCode, mapping);
      try {
        await this.redisService.set(`payos:order:${orderCode}`, JSON.stringify(mapping), 86400);
      } catch (_) {}
    }

    const bookingId = mapping?.bookingId;
    let bkgData: any = null;

    if (bookingId) {
      try {
        const { data } = await this.supabaseService.adminClient
          .from('bookings')
          .select('id, branch_id, customer_id, final_price, booking_code')
          .eq('id', bookingId)
          .maybeSingle();
        bkgData = data;
      } catch (e) {
        this.logger.warn(`Could not load booking details for ${bookingId}: ${e}`);
      }
    } else if (mapping?.bookingCode) {
      try {
        const { data } = await this.supabaseService.adminClient
          .from('bookings')
          .select('id, branch_id, customer_id, final_price, booking_code')
          .eq('booking_code', mapping.bookingCode)
          .maybeSingle();
        bkgData = data;
      } catch (e) {
        this.logger.warn(`Could not load booking details by code ${mapping.bookingCode}: ${e}`);
      }
    }

    const targetBookingId = bkgData?.id || bookingId;
    const amountPaid = Number(paymentData?.amount || mapping?.amount || 0);

    if (targetBookingId) {
      try {
        const finalPrice = Number(bkgData?.final_price || 0);
        const newPaymentStatus = (finalPrice > 0 && amountPaid < finalPrice) ? 'PARTIAL' : 'PAID';

        await this.supabaseService.adminClient
          .from('bookings')
          .update({
            status: 'CONFIRMED',
            payment_status: newPaymentStatus,
            special_notes: `[PayOS] Đã nhận thanh toán ${amountPaid}đ qua VietQR MBBank. Trạng thái: ${newPaymentStatus}`,
          })
          .eq('id', targetBookingId);
        this.logger.log(`[Database Sync] Booking ${targetBookingId} updated to CONFIRMED / ${newPaymentStatus} via PayOS payment.`);
      } catch (e) {
        this.logger.error(`[Database Sync Error] for booking ${targetBookingId}: ${e}`);
      }
    }

    // Ghi nhận hóa đơn/giao dịch thanh toán vào Supabase (bảng invoices)
    if (bkgData?.customer_id && bkgData?.branch_id) {
      try {
        const invoiceCode = `INV-${orderCode}-${Date.now().toString().slice(-4)}`;
        const { error: invErr } = await this.supabaseService.adminClient
          .from('invoices')
          .insert({
            invoice_code: invoiceCode,
            booking_id: targetBookingId || null,
            customer_id: bkgData.customer_id,
            branch_id: bkgData.branch_id,
            subtotal: amountPaid,
            total_amount: amountPaid,
            payment_method: 'BANK_TRANSFER',
            payment_status: 'PAID',
            gateway_transaction_id: String(orderCode),
            paid_at: new Date().toISOString(),
          });
        if (invErr) {
          this.logger.warn(`[Invoice Insert Warning]: ${invErr.message}`);
        } else {
          this.logger.log(`[Invoice Created] ${invoiceCode} for booking ${targetBookingId}`);

        if (this.emailService && bkgData?.customer_id) {
          (async () => {
            try {
              const { data: cust } = await this.supabaseService.adminClient
                .from('users')
                .select('email, full_name, membership_tier, loyalty_points')
                .eq('id', bkgData.customer_id)
                .maybeSingle();
              if (cust?.email && cust.email.includes('@')) {
                await this.emailService.sendPaymentReceiptEmail({
                  to: cust.email,
                  customerName: cust.full_name || mapping?.customerName || 'Quý khách',
                  invoiceCode: invoiceCode,
                  amount: amountPaid,
                  paymentMethod: 'VietQR MBBank (PayOS)',
                  paidAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                  description: mapping?.description || `Thanh toán thành công ${mapping?.bookingCode || ''}`,
                  tierName: cust.membership_tier || 'MLD Member',
                  pointsEarned: Math.round(amountPaid / 100000),
                  metadata: {
                    invoice_code: invoiceCode,
                    booking_id: targetBookingId,
                    source: 'PAYOS_PAYMENT_SUCCESS',
                  },
                });
                this.logger.log(`📧 [Auto-Email] Đã gửi biên lai thanh toán ${invoiceCode} tới ${cust.email}`);
              }
            } catch (err: any) {
              this.logger.warn(`Lỗi dispatch email biên lai PayOS: ${err.message}`);
            }
          })().catch(() => {});
        }

        }
      } catch (invErr) {
        this.logger.warn(`[Invoice Insert Catch]: ${invErr}`);
      }
    }

    // Tự động kiểm tra đối soát với Học viên / Khóa học theo mã khách hàng
    try {
      const orderDesc = String(paymentData?.description || mapping?.description || '').toUpperCase();
      let targetEnrollmentId = mapping?.enrollmentId;

      if (!targetEnrollmentId) {
        const { data: pendingEnrs } = await this.supabaseService.adminClient
          .from('course_enrollments')
          .select('id, student_id, approval_notes, student_phone, users:student_id(referral_code, phone)')
          .or('approval_status.eq.PENDING_APPROVAL,status.eq.CONSULTING')
          .limit(30);

        if (pendingEnrs && pendingEnrs.length > 0) {
          for (const enr of pendingEnrs) {
            const userCode = String((enr.users as any)?.referral_code || '').toUpperCase();
            const notesCode = String(enr.approval_notes || '').toUpperCase();
            const phone = String(enr.student_phone || (enr.users as any)?.phone || '').replace(/\D/g, '');

            if (userCode && orderDesc.includes(userCode)) {
              targetEnrollmentId = enr.id;
              break;
            }
            if (notesCode.includes(orderDesc) || (orderDesc.length >= 4 && notesCode.includes(orderDesc))) {
              targetEnrollmentId = enr.id;
              break;
            }
            if (phone.length >= 7 && orderDesc.includes(phone.slice(-7))) {
              targetEnrollmentId = enr.id;
              break;
            }
          }
        }
      }

      if (targetEnrollmentId) {
        await this.supabaseService.adminClient
          .from('course_enrollments')
          .update({
            status: 'ENROLLED',
            approval_status: 'APPROVED',
            amount_paid: amountPaid,
            approved_by: 'PAYOS_AUTO_RECONCILIATION',
            approved_at: new Date().toISOString(),
            approval_notes: `[Tự động duyệt] Đã nhận thanh toán ${amountPaid.toLocaleString('vi-VN')}đ qua chuyển khoản VietQR MBBank.`,
          })
          .eq('id', targetEnrollmentId);

        await this.ensureEnrollmentPayment(
          targetEnrollmentId,
          amountPaid,
          `TX-PAYOS-${orderCode}`,
          undefined,
          `Đối soát PayOS cho mã ${orderCode}`,
        );

        this.logger.log(`[Auto-Approve] Enrollment ${targetEnrollmentId} đã được tự động duyệt vào khóa học thành công!`);
      }
    } catch (enrErr) {
      this.logger.warn(`[Auto-Approve Warning]: ${enrErr}`);
    }
  }

  private async ensureEnrollmentPayment(
    enrollmentId: string,
    amount: number,
    transactionCode: string,
    preferredBranchId?: string,
    notes?: string,
  ) {
    const client = this.supabaseService.adminClient;
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('student_id, course_id, batch_id, assigned_staff_id')
      .eq('id', enrollmentId)
      .maybeSingle();
    if (enrollmentError || !enrollment) return;

    let branchId = preferredBranchId;
    if (!branchId && enrollment.batch_id) {
      const { data: batch } = await client
        .from('course_batches')
        .select('branch_id')
        .eq('id', enrollment.batch_id)
        .maybeSingle();
      branchId = batch?.branch_id;
    }
    branchId ||= 'aaaaaaaa-0001-0001-0001-000000000001';

    let { data: transaction } = await client
      .from('tuition_transactions')
      .select('id')
      .eq('transaction_code', transactionCode)
      .maybeSingle();
    if (!transaction) {
      const { data, error } = await client
        .from('tuition_transactions')
        .insert({
          transaction_code: transactionCode,
          enrollment_id: enrollmentId,
          student_id: enrollment.student_id,
          course_id: enrollment.course_id,
          branch_id: branchId,
          transaction_type: 'FULL_PAYMENT',
          amount,
          payment_method: 'BANK_TRANSFER',
          payment_status: 'PAID',
          notes: notes || 'Thanh toán học phí đã được xác nhận',
          paid_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();
      if (error) {
        this.logger.warn(`[Tuition Transaction] ${error.message}`);
        return;
      }
      transaction = data;
    }

    if (!enrollment.assigned_staff_id || !transaction?.id) return;
    const { data: profile } = await client
      .from('staff_profiles')
      .select('commission_rate')
      .eq('user_id', enrollment.assigned_staff_id)
      .eq('is_active', true)
      .maybeSingle();
    const percentage = Number(profile?.commission_rate || 0);
    if (percentage <= 0 || percentage > 100) return;

    const { error: commissionError } = await client.from('staff_commissions').insert({
      staff_id: enrollment.assigned_staff_id,
      branch_id: branchId,
      tuition_transaction_id: transaction.id,
      commission_type: 'COURSE_ENROLLMENT',
      base_amount: amount,
      percentage,
      commission_amount: Math.round((amount * percentage) / 100),
      status: 'PENDING',
      cycle_month: new Date().toISOString().slice(0, 7),
      notes: notes || 'Hoa hồng tư vấn khóa học sau khi thanh toán thành công',
    });
    if (commissionError && commissionError.code !== '23505') {
      this.logger.warn(`[Course Commission] ${commissionError.message}`);
    }
  }

  private async recordTuitionTransfer(orderCode: string, amount: number, reference: string, gateway: string) {
    if (!this.adminDatabase || !reference.trim()) {
      throw new BadRequestException('Giao dịch học phí cần mã giao dịch ngân hàng.');
    }
    const client = await this.adminDatabase.connection.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT e.*, coalesce(cb.branch_id, b.id) AS receipt_branch_id
         FROM course_enrollments e
         LEFT JOIN course_batches cb ON cb.id=e.batch_id
         LEFT JOIN LATERAL (SELECT id FROM branches WHERE name=e.selected_branch LIMIT 1) b ON true
         WHERE e.order_code=$1 FOR UPDATE OF e`,
        [orderCode],
      );
      if (rows.length !== 1) throw new BadRequestException('Không xác định duy nhất hồ sơ học phí.');
      const enrollment = rows[0];
      const code = 'BANK-EDU-' + createHash('sha256').update(JSON.stringify([gateway, reference.trim()])).digest('hex').slice(0, 36);
      const prior = (await client.query(
        'SELECT enrollment_id,amount FROM tuition_transactions WHERE transaction_code=$1', [code],
      )).rows[0];
      if (prior) {
        if (prior.enrollment_id !== enrollment.id || Number(prior.amount) !== amount)
          throw new BadRequestException('Mã giao dịch đã được ghi nhận với thông tin khác.');
      } else {
        const paid = Number(enrollment.amount_paid);
        const tuition = Number(enrollment.tuition_total);
        const nextPaid = paid + amount;
        if (!Number.isSafeInteger(amount) || amount <= 0 || nextPaid > tuition ||
            enrollment.consultation_status !== 'CONFIRMED' || !enrollment.receipt_branch_id) {
          throw new BadRequestException('Giao dịch học phí cần đối chiếu thủ công.');
        }
        const type = nextPaid === tuition ? (paid ? 'REMAINING_BALANCE' : 'FULL_PAYMENT') : (paid ? 'INSTALLMENT_1' : 'DEPOSIT');
        await client.query(
          `INSERT INTO tuition_transactions(transaction_code,enrollment_id,student_id,course_id,branch_id,transaction_type,amount,payment_method,payment_status,receipt_number,notes)
           VALUES($1,$2,$3,$4,$5,$6,$7,'BANK_TRANSFER','PAID',$1,$8)`,
          [code,enrollment.id,enrollment.student_id,enrollment.course_id,enrollment.receipt_branch_id,type,amount,`Webhook ngân hàng: ${reference.trim()}`],
        );
        await client.query(
          `UPDATE course_enrollments SET amount_paid=$2,
           payment_status=CASE WHEN $2>=tuition_total THEN 'PAID' ELSE 'PARTIALLY_PAID' END WHERE id=$1`,
          [enrollment.id,nextPaid],
        );
      }
      await client.query('COMMIT');
      return enrollment.id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private bankTransactionCode(referenceCode: string, fallbackCode: string) {
    const suffix = String(referenceCode || fallbackCode || Date.now())
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(-40);
    return `TX-BANK-${suffix || Date.now()}`;
  }

  /**
   * Helper tạo chuỗi VietQR chuẩn Napas 247 cho MBBank 0394316963
   */
  private generateStandardVietQR(amount: number, description: string): string {
    const amountStr = Math.round(amount).toString();
    const desc = encodeURIComponent(description);
    return `https://api.vietqr.io/image/${this.bankBin}-${this.bankAccountNo}-compact2.jpg?amount=${amountStr}&addInfo=${desc}&accountName=${encodeURIComponent(this.bankAccountName)}`;
  }

  /**
   * 5. XỬ LÝ WEBHOOK TỰ ĐỘNG CHO CÁC CỔNG BIẾN ĐỘNG SỐ DƯ NGÂN HÀNG (SEPAY, CASSO, MBBANK)
   */
  async handleBankTransferWebhook(body: any, headers?: any) {
    this.logger.log(`[Bank Transfer Webhook] Received webhook payload`);

    const configuredSecret =
      this.configService.get<string>('BANK_WEBHOOK_SECRET') ||
      this.configService.get<string>('SEPAY_API_KEY') ||
      this.configService.get<string>('CASSO_SECURE_TOKEN');

    if (configuredSecret) {
      const authHeader = String(
        headers?.authorization ||
        headers?.Authorization ||
        headers?.['x-api-key'] ||
        headers?.['secure-token'] ||
        headers?.apikey ||
        '',
      ).trim();
      const token = authHeader.replace(/^(Bearer|Apikey)\s+/i, '').trim();
      if (!token || token !== configuredSecret) {
        this.logger.warn('[Bank Transfer Webhook] Unauthorized request: secret token mismatch');
        throw new BadRequestException('Mã bí mật xác thực webhook không hợp lệ.');
      }
    } else if (
      this.configService.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production'
    ) {
      this.logger.warn('[Bank Transfer Webhook] BANK_WEBHOOK_SECRET is not configured in production. Webhook call rejected.');
      throw new BadRequestException('Cổng webhook ngân hàng chưa được kích hoạt khóa bí mật production.');
    }

    let transactions: any[] = [];
    if (body && (body.transferAmount !== undefined || body.content !== undefined)) {
      if (body.transferType && String(body.transferType).toLowerCase() !== 'in') {
        return { success: true, message: 'Bỏ qua giao dịch tiền đi.', data: [] };
      }
      // Dạng SePay đơn lẻ
      transactions.push({
        amount: Number(body.transferAmount || body.amount || 0),
        content: String(body.content || body.description || ''),
        referenceCode: String(body.referenceCode || body.code || body.id || ''),
        gateway: body.gateway || 'SEPAY',
        accountNumber: body.accountNumber || '',
      });
    } else if (body && Array.isArray(body.data)) {
      // Dạng Casso danh sách
      transactions = body.data.map((tx: any) => ({
        amount: Number(tx.amount || 0),
        content: String(tx.description || tx.content || ''),
        referenceCode: String(tx.tid || tx.id || ''),
        gateway: 'CASSO',
        accountNumber: '',
      }));
    } else if (Array.isArray(body)) {
      transactions = body.map((tx: any) => ({
        amount: Number(tx.amount || tx.transferAmount || 0),
        content: String(tx.content || tx.description || ''),
        referenceCode: String(tx.referenceCode || tx.id || ''),
        gateway: tx.gateway || 'BANK',
        accountNumber: tx.accountNumber || '',
      }));
    } else if (body) {
      transactions.push({
        amount: Number(body.amount || 0),
        content: String(body.content || body.description || ''),
        referenceCode: String(body.referenceCode || body.id || ''),
        gateway: 'UNIVERSAL',
        accountNumber: '',
      });
    }

    const results: any[] = [];

    for (const tx of transactions) {
      const { amount, content, referenceCode } = tx;
      if (!amount || amount <= 0) continue;

      const upperContent = content.toUpperCase();
      this.logger.log(`[Reconcile Check] Analyzing transfer content for amount ${amount}đ`);

      let matchedType: 'INVOICE' | 'ENROLLMENT' | 'BOOKING' | 'UNKNOWN' = 'UNKNOWN';
      let matchedId: string | null = null;
      let matchedCode: string | null = null;

      const tuitionCode = upperContent.match(/(?:^|[^A-Z0-9_-])(?:MLD\s+)?(KH-\d{8}-\d{3,})(?![A-Z0-9_-])/);
      if (tuitionCode) {
        matchedCode = tuitionCode[1];
        matchedId = await this.recordTuitionTransfer(matchedCode, amount, referenceCode, tx.gateway);
        results.push({ amount, referenceCode, matchedType: 'ENROLLMENT', matchedCode, matchedId, success: true });
        continue;
      }

      // 1. Kiểm tra đối soát với Hóa đơn (invoices): HD-SPA-..., HD-HP-..., INV-...
      const invMatch = upperContent.match(/(HD-SPA-[A-Z0-9_-]+|HD-HP-[A-Z0-9_-]+|INV-[A-Z0-9_-]+)/i);
      if (invMatch) {
        matchedCode = invMatch[1].toUpperCase();
        const { data: inv } = await this.supabaseService.adminClient
          .from('invoices')
          .select('id, invoice_code, total_amount, payment_status, enrollment_id, booking_id, customer_id, branch_id')
          .eq('invoice_code', matchedCode)
          .maybeSingle();

        if (inv) {
          if (inv.payment_status === 'PAID') {
            this.logger.log(`[Bank Transfer Webhook Idempotency] Invoice ${inv.invoice_code} is already PAID. Skipping duplicate processing.`);
            results.push({ matchedCode, status: 'ALREADY_PAID', skipped: true });
            continue;
          }
          if (amount < inv.total_amount) {
            this.logger.warn(`[Bank Transfer Partial] Transfer amount ${amount} is less than invoice total ${inv.total_amount}. Marking PARTIAL.`);
            await this.supabaseService.adminClient
              .from('invoices')
              .update({
                payment_status: 'PARTIAL',
                paid_at: new Date().toISOString(),
                gateway_transaction_id: referenceCode || 'BANK_TRANSFER_WEBHOOK',
              })
              .eq('id', inv.id);

          if (this.emailService && inv.customer_id) {
            (async () => {
              try {
                const { data: cust } = await this.supabaseService.adminClient
                  .from('users')
                  .select('email, full_name, membership_tier, loyalty_points')
                  .eq('id', inv.customer_id)
                  .maybeSingle();
                if (cust?.email && cust.email.includes('@')) {
                  await this.emailService.sendPaymentReceiptEmail({
                    to: cust.email,
                    customerName: cust.full_name || 'Quý khách',
                    invoiceCode: inv.invoice_code,
                    amount: amount,
                    paymentMethod: 'Chuyển khoản Ngân hàng (VietQR)',
                    paidAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                    description: `Thanh toán thành công hóa đơn ${inv.invoice_code}`,
                    tierName: cust.membership_tier || 'MLD Member',
                    pointsEarned: Math.round(amount / 100000),
                    metadata: {
                      invoice_id: inv.id,
                      invoice_code: inv.invoice_code,
                      source: 'BANK_TRANSFER_WEBHOOK',
                    },
                  });
                  this.logger.log(`📧 [Auto-Email] Đã gửi biên lai hóa đơn ${inv.invoice_code} tới ${cust.email}`);
                }
              } catch (err: any) {
                this.logger.warn(`Lỗi dispatch email hóa đơn: ${err.message}`);
              }
            })().catch(() => {});
          }

            results.push({ matchedCode, status: 'PARTIAL', amountPaid: amount, required: inv.total_amount });
            continue;
          }

          matchedType = 'INVOICE';
          matchedId = inv.id;

          await this.supabaseService.adminClient
            .from('invoices')
            .update({
              payment_status: 'PAID',
              paid_at: new Date().toISOString(),
              gateway_transaction_id: referenceCode || 'BANK_TRANSFER_WEBHOOK',
            })
            .eq('id', inv.id);

          if (inv.enrollment_id) {
            await this.supabaseService.adminClient
              .from('course_enrollments')
              .update({
                payment_status: 'PAID',
                student_status: 'APPROVED',
                approval_status: 'APPROVED',
                status: 'ENROLLED',
                amount_paid: amount,
                approved_at: new Date().toISOString(),
                approved_by: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
                approval_notes: `[Tự động đối soát Webhook Ngân hàng] Nhận ${amount.toLocaleString('vi-VN')}đ khớp ${matchedCode}`,
              })
              .eq('id', inv.enrollment_id);
            await this.ensureEnrollmentPayment(
              inv.enrollment_id,
              amount,
              this.bankTransactionCode(referenceCode, matchedCode),
              inv.branch_id,
              `Đối soát Webhook ngân hàng cho hóa đơn ${matchedCode}`,
            );
          }

          if (inv.booking_id) {
            await this.supabaseService.adminClient
              .from('bookings')
              .update({
                payment_status: 'PAID',
                status: 'COMPLETED',
                checked_out_at: new Date().toISOString(),
                special_notes: `[Tự động đối soát Webhook Ngân hàng] Đã thanh toán ${amount.toLocaleString('vi-VN')}đ`,
              })
              .eq('id', inv.booking_id);
          }
        }
      }

      // 2. Kiểm tra đối soát với Học viên / Khóa học: UAT-EDU-..., SEC-ENR-..., HV-...
      if (matchedType === 'UNKNOWN') {
        const enrMatch = upperContent.match(/(UAT-EDU-[A-Z0-9_-]+|SEC-ENR-[A-Z0-9_-]+|HV-[A-Z0-9_-]+)/i);
        if (enrMatch) {
          matchedCode = enrMatch[1].toUpperCase();
          const { data: enr } = await this.supabaseService.adminClient
            .from('course_enrollments')
            .select('id, order_code, course_id, student_id, selected_branch, assigned_staff_id, final_tuition, tuition_total')
            .or(`order_code.eq.${matchedCode},approval_notes.ilike.%${matchedCode}%`)
            .maybeSingle();

          if (enr) {
            matchedType = 'ENROLLMENT';
            matchedId = enr.id;

            await this.supabaseService.adminClient
              .from('course_enrollments')
              .update({
                payment_status: 'PAID',
                student_status: 'APPROVED',
                approval_status: 'APPROVED',
                status: 'ENROLLED',
                amount_paid: amount,
                approved_at: new Date().toISOString(),
                approved_by: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
                approval_notes: `[Tự động đối soát Webhook Ngân hàng] Đã nhận thanh toán ${amount.toLocaleString('vi-VN')}đ khớp mã ${matchedCode}`,
              })
              .eq('id', enr.id);

            if (this.emailService && enr.student_id) {
              (async () => {
                try {
                  const { data: student } = await this.supabaseService.adminClient
                    .from('users')
                    .select('email, full_name')
                    .eq('id', enr.student_id)
                    .maybeSingle();
                  const { data: crs } = await this.supabaseService.adminClient
                    .from('courses')
                    .select('title')
                    .eq('id', enr.course_id)
                    .maybeSingle();
                  const studentEmail = (enr as any).student_email || student?.email;
                  if (studentEmail && studentEmail.includes('@')) {
                    await this.emailService.sendEnrollmentConfirmationEmail({
                      to: studentEmail,
                      studentName: student?.full_name || (enr as any).student_name || 'Học viên',
                      studentCode: enr.order_code || `HV-${enr.id.slice(0, 6)}`,
                      courseName: crs?.title || 'Khóa đào tạo chuyên sâu MLD',
                      branchAddress: (enr as any).selected_branch || 'Trụ sở MLD Việt Nam - 260/271 Bùi Xương Trạch, Hà Nội',
                      paidAmount: amount,
                      metadata: {
                        enrollment_id: enr.id,
                        order_code: enr.order_code,
                        source: 'BANK_TRANSFER_ENROLLMENT_PAID',
                      },
                    });
                    this.logger.log(`📧 [Auto-Email] Đã gửi xác nhận học phí cho học viên ${studentEmail}`);
                  }
                } catch (err: any) {
                  this.logger.warn(`Lỗi dispatch email học viên: ${err.message}`);
                }
              })().catch(() => {});
            }


            await this.ensureEnrollmentPayment(
              enr.id,
              amount,
              this.bankTransactionCode(referenceCode, matchedCode),
              undefined,
              `Đối soát tự động qua Webhook ngân hàng khớp ${matchedCode}`,
            );
          }
        }
      }

      // 3. Kiểm tra đối soát với Lịch hẹn Spa: UAT-SPA-..., BK-..., MLD-...
      if (matchedType === 'UNKNOWN') {
        const bkgMatch = upperContent.match(/(UAT-SPA-[A-Z0-9_-]+|BK-[A-Z0-9_-]+|MLD-[A-Z0-9_-]+)/i);
        if (bkgMatch) {
          matchedCode = bkgMatch[1].toUpperCase();
          const { data: bkg } = await this.supabaseService.adminClient
            .from('bookings')
            .select('id, booking_code, technician_id, branch_id, customer_id, final_price, status')
            .eq('booking_code', matchedCode)
            .maybeSingle();

          if (bkg) {
            matchedType = 'BOOKING';
            matchedId = bkg.id;

            await this.supabaseService.adminClient
              .from('bookings')
              .update({
                payment_status: 'PAID',
                payment_method: 'BANK_TRANSFER',
                status: bkg.status === 'IN_SERVICE' ? 'COMPLETED' : 'CONFIRMED',
                special_notes: `[Tự động đối soát Webhook Ngân hàng] Đã thanh toán ${amount.toLocaleString('vi-VN')}đ khớp mã ${matchedCode}`,
              })
              .eq('id', bkg.id);

            const invoiceCode = `HD-BANK-${Date.now().toString().slice(-6)}`;
            const { data: createdInv } = await this.supabaseService.adminClient
              .from('invoices')
              .insert({
                invoice_code: invoiceCode,
                booking_id: bkg.id,
                customer_id: bkg.customer_id,
                branch_id: bkg.branch_id,
                subtotal: amount,
                total_amount: amount,
                payment_method: 'BANK_TRANSFER',
                payment_status: 'PAID',
                gateway_transaction_id: referenceCode || 'BANK_TRANSFER_WEBHOOK',
                paid_at: new Date().toISOString(),
              })
              .select('id')
              .maybeSingle();

            if (bkg.technician_id) {
              const techCommissionAmt = Math.round((amount * 10.0) / 100);
              await this.supabaseService.adminClient
                .from('staff_commissions')
                .insert({
                  staff_id: bkg.technician_id,
                  branch_id: bkg.branch_id,
                  booking_id: bkg.id,
                  invoice_id: createdInv?.id || null,
                  commission_type: 'SERVICE_DIRECT',
                  base_amount: amount,
                  percentage: 10.0,
                  commission_amount: techCommissionAmt,
                  status: 'APPROVED',
                  cycle_month: new Date().toISOString().slice(0, 7),
                  notes: `Hoa hồng ca trực 10% tự động trích qua Webhook khớp ${matchedCode}`,
                });
            }
          }
        }
      }

      results.push({
        content,
        amount,
        referenceCode,
        matchedType,
        matchedCode,
        matchedId,
        success: matchedType !== 'UNKNOWN',
      });
    }

    return {
      success: true,
      message: `Đã xử lý ${results.length} giao dịch qua Webhook Ngân hàng tự động.`,
      data: results,
    };
  }

  /**
   * 6. CƠ CHẾ TỰ ĐỘNG REFRESH ZALO ACCESS TOKEN (ZALO OAUTH V4)
   */
  async refreshZaloAccessToken(customConfig?: { appId?: string; appSecret?: string; refreshToken?: string }) {
    let appId = customConfig?.appId;
    let appSecret = customConfig?.appSecret;
    let refreshToken = customConfig?.refreshToken;

    if (!appId || !appSecret || !refreshToken) {
      try {
        const { data: cfg } = await this.supabaseService.adminClient
          .from('zns_config')
          .select('app_id, app_secret, refresh_token, access_token')
          .eq('id', 'default')
          .maybeSingle();

        if (cfg) {
          appId = appId || cfg.app_id;
          appSecret = appSecret || cfg.app_secret;
          refreshToken = refreshToken || cfg.refresh_token;
        }
      } catch (err) {
        this.logger.warn(`Could not read zns_config: ${err}`);
      }
    }

    if (!appId || !appSecret || !refreshToken) {
      return {
        success: false,
        message: 'Thiếu thông tin cấu hình Zalo OAuth (App ID, App Secret hoặc Refresh Token). Vui lòng cập nhật trên trang W14.',
      };
    }

    try {
      this.logger.log(`[Zalo OAuth v4] Refreshing access token for App ID: ${appId}...`);
      const bodyParams = new URLSearchParams({
        refresh_token: refreshToken.trim(),
        app_id: appId.trim(),
        grant_type: 'refresh_token',
      });

      const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'secret_key': appSecret.trim(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await response.json();

      if (data.access_token) {
        const expiresInSeconds = Number(data.expires_in) || 90000;
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

        await this.supabaseService.adminClient
          .from('zns_config')
          .upsert({
            id: 'default',
            app_id: appId,
            app_secret: appSecret,
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          });

        this.logger.log(`[Zalo OAuth v4] Refresh token success! New access token valid until ${expiresAt}`);

        return {
          success: true,
          message: 'Làm mới Zalo Access Token thành công!',
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          expiresIn: expiresInSeconds,
          expiresAt,
        };
      } else {
        this.logger.error(`[Zalo OAuth v4 Error]: ${JSON.stringify(data)}`);
        return {
          success: false,
          message: `Zalo trả về lỗi mã ${data.error || 'ERROR'}: ${data.message || 'Không thể làm mới token'}`,
          details: data,
        };
      }
    } catch (err: any) {
      this.logger.error(`[Zalo OAuth Exception]: ${err.message}`);
      return {
        success: false,
        message: `Lỗi kết nối tới máy chủ Zalo OAuth: ${err.message}`,
      };
    }
  }
}
