import { Prisma } from '@prisma/client';
import type { Store, Row } from './store.js';
import { ApiError } from './errors.js';

const intentStore = new Map<number, Row>();

export function getPaymentGatewayConfig() {
  const provider = (process.env.PAYMENT_GATEWAY_PROVIDER || '').trim().toUpperCase();
  const bankBin = (process.env.PAYMENT_BANK_BIN || '').trim();
  const bankAccountNo = (process.env.PAYMENT_BANK_ACCOUNT_NO || '').trim();
  const bankAccountName = (process.env.PAYMENT_BANK_ACCOUNT_NAME || '').trim();
  const hasPayos = Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
  const hasSepay = Boolean(process.env.SEPAY_API_KEY || (bankBin && bankAccountNo));
  const configured = (provider === 'PAYOS' && hasPayos) || (provider === 'SEPAY' && hasSepay) || (Boolean(provider && provider !== 'UNCONFIGURED') && (hasPayos || hasSepay));

  return {
    provider: configured ? provider || (hasPayos ? 'PAYOS' : 'SEPAY') : 'UNCONFIGURED',
    configured,
    supportedModes: configured ? ['VIETQR', 'BANK_TRANSFER'] : ['UNCONFIGURED'],
    bankBin,
    bankAccountNo,
    bankAccountName,
    returnUrl: process.env.PAYMENT_RETURN_URL || '',
    cancelUrl: process.env.PAYMENT_CANCEL_URL || '',
  };
}

export async function createPaymentGatewayIntent(store: Store, userId: string, body: Row) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Payment amount must be a positive number');
  }
  const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim().slice(0, 250) : 'MLD VIETNAM';
  const targetType = typeof body.targetType === 'string' && body.targetType.trim() ? body.targetType.trim().toUpperCase() : 'BOOKING';
  const targetId = typeof body.targetId === 'string' && body.targetId.trim() ? body.targetId.trim() : null;
  const referenceCode = typeof body.referenceCode === 'string' && body.referenceCode.trim() ? body.referenceCode.trim() : null;
  const config = getPaymentGatewayConfig();
  const orderCode = Number(String(Date.now()).slice(-7)) || 100001;

  let isPaid = false;
  if (targetType === 'BOOKING' && targetId) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(targetId)) {
      throw new ApiError(400, 'Invalid booking targetId');
    }
    const [b] = await store.query(Prisma.sql`SELECT customer_id, payment_status FROM bookings WHERE id = ${targetId}::uuid`);
    if (!b || b.customer_id !== userId) {
      throw new ApiError(404, 'Booking not found');
    }
    if (b.payment_status === 'PAID') isPaid = true;
  }

  const intent: Row = {
    user_id: userId,
    order_code: orderCode,
    provider: config.provider,
    gateway_configured: config.configured,
    target_type: targetType,
    target_id: targetId,
    reference_code: referenceCode || `MLD-${orderCode}`,
    amount: Math.round(amount),
    description,
    bank_bin: config.bankBin,
    account_number: config.bankAccountNo,
    account_name: config.bankAccountName,
    qr_code: config.configured && config.bankAccountNo ? `VIETQR|${config.bankBin}|${config.bankAccountNo}|${Math.round(amount)}|${description}` : '',
    checkout_url: '',
    status: isPaid ? 'PAID' : 'PENDING',
    is_paid: isPaid,
    message: config.configured ? 'Vui lòng quét mã QR hoặc chuyển khoản theo thông tin bên dưới.' : 'Cổng thanh toán trung gian đang chờ cấu hình.',
  };
  intentStore.set(orderCode, intent);
  const { user_id: _owner, ...publicIntent } = intent;
  return publicIntent;
}

export async function checkPaymentGatewayStatus(store: Store, userId: string, orderCodeRaw: unknown) {
  const orderCode = Number(orderCodeRaw);
  if (!Number.isInteger(orderCode) || orderCode <= 0) {
    throw new ApiError(400, 'Invalid orderCode');
  }
  const saved = intentStore.get(orderCode);
  if (!saved || saved.user_id !== userId) {
    throw new ApiError(404, 'Payment intent not found');
  }
  const config = getPaymentGatewayConfig();
  let isPaid = Boolean(saved.is_paid);
  if (saved.target_type === 'BOOKING' && typeof saved.target_id === 'string' && /^[0-9a-f]{8}-/i.test(saved.target_id)) {
    const [b] = await store.query(Prisma.sql`SELECT payment_status FROM bookings WHERE id = ${saved.target_id}::uuid AND customer_id = ${userId}::uuid`);
    if (b?.payment_status === 'PAID') {
      isPaid = true;
      saved.is_paid = true;
      saved.status = 'PAID';
    }
  }
  return {
    order_code: orderCode,
    provider: config.provider,
    configured: config.configured,
    is_paid: isPaid,
    status: isPaid ? 'PAID' : 'PENDING',
    amount_paid: isPaid ? Number(saved.amount || 0) : 0,
    amount_remaining: isPaid ? 0 : Number(saved.amount || 0),
    paid_at: isPaid ? new Date().toISOString() : null,
    message: isPaid ? 'Thanh toán thành công.' : 'Chưa ghi nhận giao dịch thành công.',
  };
}
