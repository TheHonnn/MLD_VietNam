// ==============================================================================
// MLD VIỆT NAM - SUPABASE EDGE FUNCTION: VIETQR PAYMENT GENERATOR
// Chuẩn Napas 247 / VietQR quốc gia cho hệ thống Thẩm mỹ viện & Đào tạo MLD
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';

// Danh sách mã định danh ngân hàng phổ biến (BIN Code - Napas 247)
const BANK_BINS: Record<string, string> = {
  MBBANK: '970422',
  VIETCOMBANK: '970436',
  TECHCOMBANK: '970407',
  VIETINBANK: '970415',
  BIDV: '970418',
  ACB: '970416',
  TPBANK: '970423',
  VPBANK: '970432',
};

// Cấu hình tài khoản thụ hưởng mặc định của Hệ thống Thẩm mỹ MLD
const DEFAULT_CONFIG = {
  BANK_CODE: 'MBBANK',
  BANK_BIN: '970422', // MBBank
  ACCOUNT_NO: '0388886688', // Số tài khoản thụ hưởng MLD
  ACCOUNT_NAME: 'CONG TY TNHH MLD VIET NAM',
  TEMPLATE: 'compact2', // compact, compact2, qr_only, print
};

interface PaymentRequest {
  invoice_id?: string;
  booking_id?: string;
  amount?: number;
  description?: string;
  bank_bin?: string;
  account_no?: string;
  account_name?: string;
  template?: string;
}

Deno.serve(async (req: Request) => {
  // Xử lý Preflight CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Phương thức không được hỗ trợ. Vui lòng dùng POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = getAdminClient();
    const body: PaymentRequest = await req.json().catch(() => ({}));

    let amount = body.amount ?? 0;
    let description = body.description ?? '';
    let invoiceData: any = null;

    // 1. Nếu có invoice_id, lấy thông tin trực tiếp từ cơ sở dữ liệu
    if (body.invoice_id) {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_code, total_amount, payment_status, customer_id, branch_id,
          users:customer_id (full_name, phone),
          branches:branch_id (name, code)
        `)
        .eq('id', body.invoice_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, message: 'Không tìm thấy hóa đơn chỉ định trong hệ thống.', error }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invoiceData = data;
      amount = Number(data.total_amount);
      description = `MLD ${data.invoice_code}`;
    } else if (body.booking_id) {
      // 2. Nếu có booking_id, tìm hóa đơn hoặc dịch vụ của booking
      const { data: booking, error: bError } = await supabase
        .from('bookings')
        .select(`
          id, booking_code, total_amount, status,
          users:customer_id (full_name, phone)
        `)
        .eq('id', body.booking_id)
        .single();

      if (bError || !booking) {
        return new Response(
          JSON.stringify({ success: false, message: 'Không tìm thấy lịch hẹn chỉ định.', error: bError }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      amount = Number(booking.total_amount);
      description = `MLD ${booking.booking_code || booking.id.slice(0, 8).toUpperCase()}`;
    }

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Số tiền thanh toán không hợp lệ (phải lớn hơn 0 đ).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Làm sạch và chuẩn hóa nội dung chuyển khoản (không dấu, không ký tự đặc biệt)
    const cleanDescription = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .substring(0, 50);

    const bankBin = body.bank_bin || DEFAULT_CONFIG.BANK_BIN;
    const accountNo = body.account_no || DEFAULT_CONFIG.ACCOUNT_NO;
    const accountName = body.account_name || DEFAULT_CONFIG.ACCOUNT_NAME;
    const template = body.template || DEFAULT_CONFIG.TEMPLATE;

    // 3. Khởi tạo URL ảnh VietQR chuẩn Napas 247
    // Định dạng: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<MEMO>&accountName=<NAME>
    const encodedDesc = encodeURIComponent(cleanDescription);
    const encodedName = encodeURIComponent(accountName);
    const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`;

    // Deep link chuẩn App ngân hàng (Napas Open Banking)
    const napasDeepLink = `https://api.vietqr.io/v2/lookup`;

    // 4. Nếu có invoice, lưu lại mã giao dịch dự kiến để đối soát
    if (invoiceData) {
      await supabase
        .from('invoices')
        .update({
          payment_method: 'BANK_TRANSFER',
          gateway_transaction_id: `VQR_${Date.now()}_${cleanDescription.replace(/\s+/g, '_')}`,
        })
        .eq('id', invoiceData.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          qr_image_url: qrImageUrl,
          amount,
          transfer_memo: cleanDescription,
          bank_info: {
            bank_bin: bankBin,
            account_number: accountNo,
            account_holder: accountName,
          },
          invoice: invoiceData
            ? {
                id: invoiceData.id,
                invoice_code: invoiceData.invoice_code,
                payment_status: invoiceData.payment_status,
              }
            : null,
          deeplink: qrImageUrl,
          note: 'Quét mã VietQR bằng bất kỳ App ngân hàng hoặc Ví điện tử (MoMo, ZaloPay, ViettelMoney) nào tại Việt Nam.',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi máy chủ khi tạo mã VietQR', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

