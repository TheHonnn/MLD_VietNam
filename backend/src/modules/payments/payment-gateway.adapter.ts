import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PaymentGatewayPublicConfig {
  provider: string;
  configured: boolean;
  supportedModes: string[];
  bankBin: string;
  bankAccountNo: string;
  bankAccountName: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentGatewayCreateIntentParams {
  orderCode: number;
  amount: number;
  description: string;
  referenceCode?: string;
  providerOverride?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface PaymentGatewayCreateIntentResult {
  provider: string;
  gatewayConfigured: boolean;
  qrCode: string;
  checkoutUrl: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  gatewayTransactionId: string | null;
  message: string;
}

export interface PaymentGatewayStatusResult {
  configured: boolean;
  provider: string;
  isPaid: boolean;
  status: string;
  amountPaid: number;
  gatewayTransactionId: string | null;
  rawPayload?: Record<string, any>;
}

export interface VerifiedWebhookPayload {
  provider: string;
  orderCode?: number;
  referenceCode?: string;
  amount: number;
  gatewayTransactionId: string;
  status: string;
  rawPayload: Record<string, any>;
}

@Injectable()
export class PaymentGatewayAdapter {
  private readonly logger = new Logger(PaymentGatewayAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  private readEnv(key: string): string {
    return (this.configService.get<string>(key) || '').trim();
  }

  get provider(): string {
    const explicit = this.readEnv('PAYMENT_GATEWAY_PROVIDER').toUpperCase();
    if (explicit) return explicit;
    if (this.readEnv('PAYOS_CLIENT_ID') && this.readEnv('PAYOS_API_KEY') && this.readEnv('PAYOS_CHECKSUM_KEY')) {
      return 'PAYOS';
    }
    if (this.readEnv('SEPAY_API_KEY')) {
      return 'SEPAY';
    }
    return 'UNCONFIGURED';
  }

  get baseUrl(): string {
    return this.readEnv('PAYMENT_GATEWAY_BASE_URL');
  }

  get merchantId(): string {
    return this.readEnv('PAYMENT_GATEWAY_MERCHANT_ID');
  }

  get clientId(): string {
    return this.readEnv('PAYMENT_GATEWAY_CLIENT_ID') || this.readEnv('PAYOS_CLIENT_ID');
  }

  get apiKey(): string {
    return (
      this.readEnv('PAYMENT_GATEWAY_API_KEY') ||
      this.readEnv('PAYOS_API_KEY') ||
      this.readEnv('SEPAY_API_KEY')
    );
  }

  get secretKey(): string {
    return this.readEnv('PAYMENT_GATEWAY_SECRET_KEY') || this.readEnv('PAYOS_CHECKSUM_KEY');
  }

  get webhookSecret(): string {
    return (
      this.readEnv('PAYMENT_GATEWAY_WEBHOOK_SECRET') ||
      this.readEnv('BANK_WEBHOOK_SECRET') ||
      this.readEnv('SEPAY_API_KEY') ||
      this.readEnv('PAYMENT_GATEWAY_SECRET_KEY')
    );
  }

  get bankBin(): string {
    return this.readEnv('PAYMENT_BANK_BIN') || this.readEnv('PAYOS_BANK_BIN') || '970422';
  }

  get bankAccountNo(): string {
    return this.readEnv('PAYMENT_BANK_ACCOUNT_NO') || this.readEnv('PAYOS_BANK_ACCOUNT_NO') || '0394316963';
  }

  get bankAccountName(): string {
    return this.readEnv('PAYMENT_BANK_ACCOUNT_NAME') || this.readEnv('PAYOS_BANK_ACCOUNT_NAME') || 'BUI THE HOANG';
  }

  get returnUrl(): string {
    return this.readEnv('PAYMENT_GATEWAY_RETURN_URL');
  }

  get cancelUrl(): string {
    return this.readEnv('PAYMENT_GATEWAY_CANCEL_URL');
  }

  get isConfigured(): boolean {
    const p = this.provider;
    if (p === 'UNCONFIGURED') {
      return Boolean(this.baseUrl && this.apiKey);
    }
    if (p === 'PAYOS') {
      return Boolean(this.clientId && this.apiKey && this.secretKey);
    }
    if (p === 'SEPAY') {
      return Boolean(this.apiKey && this.bankAccountNo);
    }
    return Boolean((this.baseUrl && (this.apiKey || this.merchantId || this.secretKey)) || this.webhookSecret);
  }

  getPublicConfig(): PaymentGatewayPublicConfig {
    return {
      provider: this.provider,
      configured: this.isConfigured,
      supportedModes: this.isConfigured
        ? ['GATEWAY_CHECKOUT', 'VIETQR', 'BANK_TRANSFER']
        : ['UNCONFIGURED'],
      bankBin: this.bankBin,
      bankAccountNo: this.bankAccountNo,
      bankAccountName: this.bankAccountName,
      returnUrl: this.returnUrl,
      cancelUrl: this.cancelUrl,
    };
  }

  signPayload(rawJson: string): string {
    const key = this.secretKey;
    if (!key) return '';
    return crypto.createHmac('sha256', key).update(rawJson).digest('hex');
  }

  async createIntent(
    params: PaymentGatewayCreateIntentParams,
    payosClient?: any,
  ): Promise<PaymentGatewayCreateIntentResult> {
    const activeProvider = (params.providerOverride || this.provider).toUpperCase();

    if (activeProvider === 'PAYOS' && payosClient) {
      try {
        const res = await payosClient.paymentRequests.create({
          orderCode: params.orderCode,
          amount: Math.round(params.amount),
          description: params.description,
          cancelUrl: this.cancelUrl || 'https://mldvietnam.vn/payment/cancel',
          returnUrl: this.returnUrl || 'https://mldvietnam.vn/payment/success',
        });
        return {
          provider: 'PAYOS',
          gatewayConfigured: true,
          qrCode: String(res?.qrCode || ''),
          checkoutUrl: String(res?.checkoutUrl || ''),
          bankBin: String(res?.bin || this.bankBin),
          accountNumber: String(res?.accountNumber || this.bankAccountNo),
          accountName: String(res?.accountName || this.bankAccountName),
          gatewayTransactionId: String(res?.paymentLinkId || params.orderCode),
          message: 'Khởi tạo yêu cầu thanh toán PayOS thành công',
        };
      } catch (err: any) {
        this.logger.warn(`[GatewayAdapter:PAYOS] Create error: ${err?.message || err}`);
      }
    }

    if (this.baseUrl && (this.apiKey || this.merchantId || this.secretKey)) {
      try {
        const payload = {
          orderCode: params.orderCode,
          amount: Math.round(params.amount),
          description: params.description,
          referenceCode: params.referenceCode || '',
          customerName: params.customerName || '',
          customerPhone: params.customerPhone || '',
          returnUrl: this.returnUrl,
          cancelUrl: this.cancelUrl,
          merchantId: this.merchantId,
        };
        const rawBody = JSON.stringify(payload);
        const signature = this.signPayload(rawBody);
        const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/payment-intents`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey, Authorization: `Bearer ${this.apiKey}` } : {}),
            ...(this.merchantId ? { 'X-Merchant-Id': this.merchantId } : {}),
            ...(signature ? { 'X-Signature': signature } : {}),
          },
          body: rawBody,
        });
        if (response.ok) {
          const json: any = await response.json();
          const data = json?.data || json || {};
          return {
            provider: activeProvider === 'UNCONFIGURED' ? 'CUSTOM' : activeProvider,
            gatewayConfigured: true,
            qrCode: String(data.qrCode || data.qr_code || data.qrUrl || ''),
            checkoutUrl: String(data.checkoutUrl || data.checkout_url || data.payUrl || ''),
            bankBin: String(data.bankBin || this.bankBin),
            accountNumber: String(data.accountNumber || this.bankAccountNo),
            accountName: String(data.accountName || this.bankAccountName),
            gatewayTransactionId: String(data.transactionId || data.id || params.orderCode),
            message: 'Khởi tạo giao dịch cổng thanh toán thành công',
          };
        }
        this.logger.warn(`[GatewayAdapter] Remote gateway returned HTTP ${response.status}`);
      } catch (err: any) {
        this.logger.warn(`[GatewayAdapter] Remote intent error: ${err?.message || err}`);
      }
    }

    if (this.bankAccountNo && this.bankBin) {
      const vietQrUrl = `https://api.vietqr.io/image/${this.bankBin}-${this.bankAccountNo}-compact2.jpg?amount=${Math.round(params.amount)}&addInfo=${encodeURIComponent(params.description)}&accountName=${encodeURIComponent(this.bankAccountName)}`;
      return {
        provider: activeProvider === 'UNCONFIGURED' ? 'VIETQR' : activeProvider,
        gatewayConfigured: this.isConfigured,
        qrCode: vietQrUrl,
        checkoutUrl: '',
        bankBin: this.bankBin,
        accountNumber: this.bankAccountNo,
        accountName: this.bankAccountName,
        gatewayTransactionId: null,
        message: this.isConfigured
          ? 'Tạo mã QR chuyển khoản tự động thành công'
          : 'Đang chờ cấu hình khóa cổng thanh toán trung gian',
      };
    }

    return {
      provider: activeProvider,
      gatewayConfigured: false,
      qrCode: '',
      checkoutUrl: '',
      bankBin: this.bankBin,
      accountNumber: this.bankAccountNo,
      accountName: this.bankAccountName,
      gatewayTransactionId: null,
      message: 'Cổng thanh toán trung gian đang để trống cấu hình. Vui lòng bổ sung biến môi trường PAYMENT_GATEWAY_* để kích hoạt.',
    };
  }

  async queryStatus(
    orderCode: number,
    gatewayTransactionId?: string,
    payosClient?: any,
  ): Promise<PaymentGatewayStatusResult> {
    if (this.provider === 'PAYOS' && payosClient) {
      try {
        const payosInfo = await payosClient.paymentRequests.get(orderCode);
        const isPaid = String(payosInfo?.status || '').toUpperCase() === 'PAID';
        return {
          configured: true,
          provider: 'PAYOS',
          isPaid,
          status: isPaid ? 'PAID' : String(payosInfo?.status || 'PENDING').toUpperCase(),
          amountPaid: Number(payosInfo?.amountPaid || 0),
          gatewayTransactionId: String(orderCode),
          rawPayload: payosInfo,
        };
      } catch (err: any) {
        this.logger.warn(`[GatewayAdapter:PAYOS] Status query failed: ${err?.message || err}`);
      }
    }

    if (this.baseUrl && (this.apiKey || this.merchantId || this.secretKey)) {
      try {
        const lookupId = encodeURIComponent(gatewayTransactionId || String(orderCode));
        const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/payment-intents/${lookupId}`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey, Authorization: `Bearer ${this.apiKey}` } : {}),
            ...(this.merchantId ? { 'X-Merchant-Id': this.merchantId } : {}),
          },
        });
        if (response.ok) {
          const json: any = await response.json();
          const data = json?.data || json || {};
          const rawStatus = String(data.status || 'PENDING').toUpperCase();
          const isPaid = rawStatus === 'PAID' || rawStatus === 'SUCCESS' || data.isPaid === true;
          return {
            configured: true,
            provider: this.provider,
            isPaid,
            status: isPaid ? 'PAID' : rawStatus,
            amountPaid: Number(data.amountPaid || data.amount || 0),
            gatewayTransactionId: String(data.transactionId || gatewayTransactionId || orderCode),
            rawPayload: data,
          };
        }
      } catch (err: any) {
        this.logger.warn(`[GatewayAdapter] Remote status check failed: ${err?.message || err}`);
      }
    }

    return {
      configured: this.isConfigured,
      provider: this.provider,
      isPaid: false,
      status: 'PENDING',
      amountPaid: 0,
      gatewayTransactionId: gatewayTransactionId || null,
    };
  }

  verifyWebhookRequest(
    provider: string,
    body: Record<string, any>,
    headers?: Record<string, string>,
  ): VerifiedWebhookPayload {
    const secret = this.webhookSecret;
    const hmacKey = this.secretKey;

    if (!secret && !hmacKey) {
      throw new ServiceUnavailableException(
        'Cổng thanh toán trung gian chưa được cấu hình khóa xác thực Webhook.',
      );
    }

    const normalizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers || {})) {
      normalizedHeaders[k.toLowerCase()] = String(v || '').trim();
    }

    const signatureHeader = normalizedHeaders['x-signature'] || normalizedHeaders['x-hmac-signature'] || '';
    const tokenHeader = (
      normalizedHeaders['authorization'] ||
      normalizedHeaders['x-api-key'] ||
      normalizedHeaders['secure-token'] ||
      normalizedHeaders['apikey'] ||
      normalizedHeaders['x-webhook-secret'] ||
      ''
    )
      .replace(/^(Bearer|Apikey)\s+/i, '')
      .trim();

    let authenticated = false;

    if (hmacKey && signatureHeader) {
      const expected = crypto
        .createHmac('sha256', hmacKey)
        .update(JSON.stringify(body || {}))
        .digest('hex');
      const a = Buffer.from(signatureHeader.toLowerCase(), 'utf8');
      const b = Buffer.from(expected.toLowerCase(), 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        authenticated = true;
      }
    }

    if (!authenticated && secret && tokenHeader) {
      const a = Buffer.from(tokenHeader, 'utf8');
      const b = Buffer.from(secret, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      throw new BadRequestException('Chữ ký hoặc khóa xác thực Webhook thanh toán không hợp lệ.');
    }

    const data = body?.data && typeof body.data === 'object' ? body.data : body || {};
    const parsedOrderCode = Number(data.orderCode || body?.orderCode || 0);
    const amount = Number(data.transferAmount || data.amount || body?.transferAmount || body?.amount || 0);
    const referenceCode = String(
      data.referenceCode ||
        body?.referenceCode ||
        data.content ||
        body?.content ||
        data.description ||
        body?.description ||
        '',
    ).trim();
    const rawStatus = String(data.status || body?.status || body?.code || 'PAID').toUpperCase();
    const normalizedStatus =
      rawStatus === '00' || rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'PAID'
        ? 'PAID'
        : rawStatus;

    return {
      provider: (provider || this.provider).toUpperCase(),
      orderCode: parsedOrderCode > 0 ? parsedOrderCode : undefined,
      referenceCode: referenceCode || undefined,
      amount: Number.isFinite(amount) ? amount : 0,
      gatewayTransactionId: String(
        data.transactionId ||
          data.gatewayTransactionId ||
          data.id ||
          body?.id ||
          (parsedOrderCode > 0 ? parsedOrderCode : `GW-${Date.now()}`),
      ),
      status: normalizedStatus,
      rawPayload: body || {},
    };
  }
}
