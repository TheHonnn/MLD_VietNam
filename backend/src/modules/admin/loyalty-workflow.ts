import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { AdminActor } from './admin.service';

export const loyaltyTables = ['coupons', 'voucher_distribution_rules', 'user_vouchers', 'membership_tier_rules', 'loyalty_point_settings'];

export async function validateLoyaltyWrite(
  client: PoolClient, table: string, data: Record<string, any>, previous: Record<string, any> | null,
  operation: string, actor: AdminActor,
) {
  if (!loyaltyTables.includes(table)) return;
  if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new ForbiddenException('Quản trị viên quản lý cấu hình ưu đãi và cấp voucher.');
  if (operation === 'delete') throw new ConflictException('Giữ lịch sử ưu đãi. Hãy ngừng hoạt động hoặc chờ hết hạn.');
  const defaults = table === 'coupons' ? { min_order_amount: 0, usage_limit: 1000 } :
    table === 'voucher_distribution_rules' ? { valid_days_after_claim: 30 } : {};
  const next: Record<string, any> = { ...defaults, ...previous, ...data };
  const invalid = (message: string): never => { throw new BadRequestException(message); };
  const positive = (field: string, zero = false) => {
    if (!Number.isFinite(Number(next[field])) || (zero ? Number(next[field]) < 0 : Number(next[field]) <= 0))
      invalid('Giá trị không hợp lệ cho ' + field + '.');
  };

  if (table === 'coupons') {
    if ('used_count' in data) invalid('Lượt sử dụng do hệ thống ghi nhận.');
    const percent = Number(next.discount_percent || 0);
    const amount = Number(next.discount_amount || 0);
    if ((percent > 0) === (amount > 0) || percent > 100 || percent < 0 || amount < 0)
      invalid('Chọn một mức giảm theo phần trăm hoặc số tiền.');
    if (!Number.isFinite(Date.parse(next.valid_from)) || !Number.isFinite(Date.parse(next.valid_to)) ||
      Date.parse(next.valid_to) <= Date.parse(next.valid_from)) invalid('Thời gian hết hạn phải sau thời gian bắt đầu.');
    positive('min_order_amount', true);
    positive('usage_limit');
    if (!Number.isSafeInteger(Number(next.usage_limit)) || Number(next.usage_limit) < Number(previous?.used_count || 0))
      invalid('Giới hạn sử dụng phải là số nguyên và không thấp hơn số lượt đã dùng.');
    if (next.max_discount != null && !(Number(next.max_discount) > 0)) invalid('Mức giảm tối đa phải lớn hơn 0.');
    if (data.code !== undefined) {
      data.code = String(data.code).trim().toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(data.code)) invalid('Mã chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.');
    }
    if (previous) {
      const issued = await client.query('SELECT 1 FROM user_vouchers WHERE coupon_id=$1 LIMIT 1', [previous.id]);
      const protectedFields = ['code','discount_percent','discount_amount','min_order_amount','max_discount','valid_from','valid_to'];
      if ((Number(previous.used_count) > 0 || issued.rowCount) &&
        protectedFields.some(field => field in data && String(data[field] ?? '') !== String(previous[field] ?? '')))
        throw new ConflictException('Ưu đãi đã phát hành. Tạo mã mới để đổi điều kiện, hoặc ngừng hoạt động mã hiện tại.');
    }
  }

  if (table === 'voucher_distribution_rules') {
    positive('valid_days_after_claim');
    if (!Number.isSafeInteger(Number(next.valid_days_after_claim))) invalid('Số ngày hiệu lực phải là số nguyên.');
    const coupon = (await client.query('SELECT is_active,valid_to FROM coupons WHERE id=$1', [next.coupon_id])).rows[0];
    if (next.is_active !== false && (!coupon?.is_active || new Date(coupon.valid_to) <= new Date()))
      throw new ConflictException('Quy tắc cần một mã giảm giá đang hoạt động và chưa hết hạn.');
  }

  if (table === 'user_vouchers') {
    if (operation !== 'create') throw new ConflictException('Ví voucher được cập nhật khi khách sử dụng. Không sửa trạng thái thủ công.');
    if (['status','used_at','used_in_booking_id','used_in_invoice_id','claimed_at','source_trigger'].some(field => field in data))
      invalid('Trạng thái và nguồn cấp voucher được hệ thống ghi nhận.');
    const customer = (await client.query('SELECT role FROM users WHERE id=$1 AND is_active', [next.user_id])).rows[0];
    if (!customer || !['CUSTOMER','STUDENT'].includes(customer.role)) throw new ConflictException('Chọn khách hàng hoặc học viên đang hoạt động.');
    const coupon = (await client.query('SELECT * FROM coupons WHERE id=$1 FOR UPDATE', [next.coupon_id])).rows[0];
    if (!coupon?.is_active || new Date(coupon.valid_from) > new Date() || new Date(coupon.valid_to) <= new Date() ||
      Number(coupon.used_count) >= Number(coupon.usage_limit)) throw new ConflictException('Mã giảm giá chưa sẵn sàng cấp cho khách.');
    if (!Number.isFinite(Date.parse(next.expires_at)) || Date.parse(next.expires_at) <= Date.now() ||
      Date.parse(next.expires_at) > new Date(coupon.valid_to).getTime()) invalid('Hạn voucher phải ở tương lai và trong hạn của mã giảm giá.');
    if ((await client.query("SELECT 1 FROM user_vouchers WHERE user_id=$1 AND coupon_id=$2 AND status='AVAILABLE' AND expires_at>now() LIMIT 1", [next.user_id,next.coupon_id])).rowCount)
      throw new ConflictException('Khách đã có voucher này còn hiệu lực.');
    data.status = 'AVAILABLE';
    data.source_trigger = 'MANUAL_BY_ADMIN';
    data.claimed_at = new Date().toISOString();
  }

  if (table === 'membership_tier_rules') {
    if (operation === 'create') throw new ConflictException('Chỉnh sửa quyền lợi của các hạng có sẵn.');
    if (previous && next.tier !== previous.tier) invalid('Giữ nguyên tên hạng đã cấu hình.');
    positive('min_accumulated_spent', true);
    if (next.tier === 'STANDARD' && Number(next.min_accumulated_spent) !== 0) invalid('Hạng tiêu chuẩn phải bắt đầu từ 0 đồng.');
    for (const field of ['point_earning_rate','discount_service_percent']) {
      positive(field, true);
      if (Number(next[field]) > 100) invalid('Tỷ lệ phải từ 0 đến 100.');
    }
    positive('free_head_spa_sessions', true);
    if (!Number.isSafeInteger(Number(next.free_head_spa_sessions))) invalid('Số buổi tặng phải là số nguyên.');
    const order = ['STANDARD','SILVER','GOLD','PLATINUM','DIAMOND'];
    const rules = (await client.query('SELECT tier,min_accumulated_spent FROM membership_tier_rules')).rows;
    const actualOrder = rules.map(rule => rule.tier).sort((a,b) => order.indexOf(a)-order.indexOf(b));
    // Compare only adjacent configured tiers, preserving installations with fewer tiers.
    const values = actualOrder.map(tier => Number(tier === next.tier ? next.min_accumulated_spent : rules.find(rule => rule.tier === tier).min_accumulated_spent));
    if (values.some((value,index) => index > 0 && value <= values[index-1])) invalid('Mốc chi tiêu phải tăng dần theo hạng.');
  }

  if (table === 'loyalty_point_settings') {
    if (operation !== 'update' || Number(next.id) !== 1) throw new ConflictException('Chỉ cập nhật cấu hình điểm hiện hành.');
    positive('earn_amount_per_point');
    positive('redeem_value_per_point');
    positive('max_redeem_percent_per_order', true);
    if (Number(next.max_redeem_percent_per_order) > 100) invalid('Giới hạn dùng điểm phải từ 0 đến 100%.');
    positive('point_expiry_months');
    if (!Number.isSafeInteger(Number(next.point_expiry_months))) invalid('Hạn điểm phải là số tháng nguyên.');
  }
}
