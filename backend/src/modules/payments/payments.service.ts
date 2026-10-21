import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service';
import { RedisService } from '../../database/redis.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

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
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID') || 'bc4b5481-da88-4f8f-bacd-4226e4ce959a';
    const apiKey = this.configService.get<string>('PAYOS_API_KEY') || '3fc4338f-0940-40df-bd37-30cf6e8ad734';
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY') || '46edada6e9e516bfca357fc1db04bddb529ce2f1185be31e6a3b9e9de7aad436';

    this.bankBin = this.configService.get<string>('PAYOS_BANK_BIN') || '970422';
    this.bankAccountNo = this.configService.get<string>('PAYOS_BANK_ACCOUNT_NO') || '0394316963';
    this.bankAccountName = this.configService.get<string>('PAYOS_BANK_ACCOUNT_NAME') || 'BUI THE HOANG';

    try {
      this.payos = new PayOS({ clientId, apiKey, checksumKey });
      this.logger.log(' PayOS VietQR Payment Client initialized successfully for MBBank 0394316963 (BUI THE HOANG)');
    } catch (e) {
      this.logger.error('Failed to initialize PayOS Client: ' + e);
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
    if (mapping) {
      mapping.status = 'PAID';
      this.orderMappings.set(orderCode, mapping);
      try {
        await this.redisService.set(`payos:order:${orderCode}`, JSON.stringify(mapping), 86400);
      } catch (_) {}
    }

    const bookingId = mapping?.bookingId;
    if (bookingId) {
      try {
        // Cập nhật trạng thái Booking sang CONFIRMED
        await this.supabaseService.adminClient
          .from('bookings')
          .update({
            status: 'CONFIRMED',
            special_notes: `[PayOS] Đã thanh toán cọc ${paymentData.amount || mapping?.amount || 0}đ qua VietQR MBBank.`,
          })
          .eq('id', bookingId);
        this.logger.log(`[Database Sync] Booking ${bookingId} has been confirmed via PayOS payment.`);
      } catch (e) {
        this.logger.error(`[Database Sync Error] for booking ${bookingId}: ${e}`);
      }
    }

    // Ghi nhận hóa đơn/giao dịch thanh toán vào Supabase (nếu có bảng invoices)
    try {
      const invoiceCode = `INV-${orderCode}`;
      await this.supabaseService.adminClient
        .from('invoices')
        .insert({
          invoice_code: invoiceCode,
          subtotal: paymentData.amount || mapping?.amount || 150000,
          total_amount: paymentData.amount || mapping?.amount || 150000,
          payment_method: 'BANK_TRANSFER',
          payment_status: 'PAID',
          gateway_transaction_id: String(orderCode),
          paid_at: new Date().toISOString(),
        });
    } catch (_) {
      // Bỏ qua nếu bảng invoices yêu cầu khóa ngoại khác
    }
  }

  /**
   * Helper tạo chuỗi VietQR chuẩn Napas 247 cho MBBank 0394316963
   */
  private generateStandardVietQR(amount: number, description: string): string {
    const amountStr = Math.round(amount).toString();
    const desc = encodeURIComponent(description);
    return `https://api.vietqr.io/image/${this.bankBin}-${this.bankAccountNo}-compact2.jpg?amount=${amountStr}&addInfo=${desc}&accountName=${encodeURIComponent(this.bankAccountName)}`;
  }
}
