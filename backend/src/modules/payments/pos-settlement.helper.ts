import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import type { PoolClient } from 'pg';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUEST_CUSTOMER_ID = 'bbbbbbbb-0001-0001-0001-000000000001';

export async function markUserVoucherUsed(
  client: PoolClient,
  userVoucherId: string | null | undefined,
  customerId: string,
  invoiceId: string,
): Promise<string | null> {
  if (!isUuidString(userVoucherId) || customerId === GUEST_CUSTOMER_ID) return null;
  const updated = (
    await client.query(
      `UPDATE user_vouchers
       SET status='USED', used_at=now(), used_in_invoice_id=$2
       WHERE id=$1 AND user_id=$3 AND status='AVAILABLE'
       RETURNING coupon_id`,
      [userVoucherId, invoiceId, customerId],
    )
  ).rows[0];
  return updated?.coupon_id || null;
}

export async function redeemInvoicePoints(
  client: PoolClient,
  invoiceId: string,
  customerId: string,
  redeemPoints: number,
  invoiceCode: string,
) {
  if (!Number.isInteger(redeemPoints) || redeemPoints <= 0 || customerId === GUEST_CUSTOMER_ID) return;
  const already = (
    await client.query(
      "SELECT 1 FROM point_transactions WHERE reference_id=$1 AND action_type='BOOKING_REDEEM' LIMIT 1",
      [invoiceId],
    )
  ).rowCount;
  if (already) return;
  const user = (
    await client.query('SELECT reward_points FROM users WHERE id=$1 FOR UPDATE', [customerId])
  ).rows[0];
  if (!user || Number(user.reward_points || 0) < redeemPoints) {
    throw new ConflictException('Số điểm thưởng hiện có của khách hàng không đủ để quy đổi.');
  }
  const updatedUser = (
    await client.query(
      'UPDATE users SET reward_points=COALESCE(reward_points,0)-$2 WHERE id=$1 RETURNING reward_points',
      [customerId, redeemPoints],
    )
  ).rows[0];
  await client.query(
    "INSERT INTO point_transactions(user_id,points_change,balance_after,action_type,description,reference_id) VALUES($1,$2,$3,'BOOKING_REDEEM',$4,$5)",
    [customerId, -redeemPoints, updatedUser.reward_points, `Quy đổi điểm hóa đơn ${invoiceCode}`, invoiceId],
  );
}

export async function awardInvoicePoints(
  client: PoolClient,
  invoiceId: string,
  customerId: string,
  totalAmount: number,
  invoiceCode: string,
  posConfig?: Record<string, any>,
) {
  if (customerId === GUEST_CUSTOMER_ID || !Number.isFinite(totalAmount) || totalAmount <= 0) return;
  let effectiveConfig = posConfig;
  if (!effectiveConfig) {
    const posRow = (await client.query("SELECT data FROM system_settings WHERE category='pos' LIMIT 1")).rows[0];
    effectiveConfig = posRow?.data && typeof posRow.data === 'object' ? posRow.data : {};
  }
  if (effectiveConfig.enable_loyalty_points === false) return;
  const already = (
    await client.query(
      "SELECT 1 FROM point_transactions WHERE reference_id=$1 AND action_type='BOOKING_EARN' LIMIT 1",
      [invoiceId],
    )
  ).rowCount;
  if (already) return;
  const rule = (
    await client.query(
      'SELECT earn_amount_per_point FROM loyalty_point_settings WHERE id=1 AND is_active=true LIMIT 1',
    )
  ).rows[0];
  const rate = Number(rule?.earn_amount_per_point || 0);
  if (!Number.isFinite(rate) || rate <= 0) return;
  const earned = Math.floor(totalAmount / rate);
  if (earned <= 0) return;
  const updatedUser = (
    await client.query(
      'UPDATE users SET reward_points=COALESCE(reward_points,0)+$2 WHERE id=$1 RETURNING reward_points',
      [customerId, earned],
    )
  ).rows[0];
  if (!updatedUser) return;
  await client.query(
    "INSERT INTO point_transactions(user_id,points_change,balance_after,action_type,description,reference_id) VALUES($1,$2,$3,'BOOKING_EARN',$4,$5)",
    [customerId, earned, updatedUser.reward_points, `Tích điểm hóa đơn ${invoiceCode}`, invoiceId],
  );
}

export function isUuidString(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export async function resolveSellerUserId(client: PoolClient, rawId: unknown): Promise<string | null> {
  if (!isUuidString(rawId)) return null;
  const userRow = (
    await client.query(
      "SELECT id FROM users WHERE id=$1 AND is_active=true AND role::text NOT IN ('CUSTOMER','STUDENT','GUEST') LIMIT 1",
      [rawId],
    )
  ).rows[0];
  if (userRow?.id) return userRow.id;
  const techRow = (
    await client.query(
      "SELECT t.user_id FROM technicians t JOIN users u ON u.id=t.user_id WHERE t.id=$1 AND u.is_active=true AND u.role::text NOT IN ('CUSTOMER','STUDENT','GUEST') LIMIT 1",
      [rawId],
    )
  ).rows[0];
  return techRow?.user_id || null;
}

export async function getStaffCommissionRates(client: PoolClient, userId: string | null) {
  if (!userId) return { serviceRate: 0, packageRate: 0, productRate: 0 };
  const row = (
    await client.query(
      `SELECT commission_rate,
              COALESCE(package_commission_rate, 0) AS package_commission_rate,
              COALESCE(product_commission_rate, 0) AS product_commission_rate
       FROM staff_profiles WHERE user_id=$1 AND is_active=true LIMIT 1`,
      [userId],
    )
  ).rows[0];
  if (!row) return { serviceRate: 0, packageRate: 0, productRate: 0 };
  return {
    serviceRate: Number(row.commission_rate || 0),
    packageRate: Number(row.package_commission_rate || 0),
    productRate: Number(row.product_commission_rate || 0),
  };
}

export async function updateCashierShiftTotalsSql(
  client: PoolClient,
  shiftId: string,
  paymentMethod: string,
  amount: number,
) {
  await client.query(
    `UPDATE cashier_shifts SET total_sales=total_sales+$2,
     system_cash=system_cash+CASE WHEN $3='CASH_AT_SPA' THEN $2 ELSE 0 END,
     transfer_sales=transfer_sales+CASE WHEN $3='BANK_TRANSFER' THEN $2 ELSE 0 END,
     card_sales=COALESCE(card_sales,0)+CASE WHEN $3 IN ('VNPAY','MOMO') THEN $2 ELSE 0 END,
     updated_at=now() WHERE id=$1`,
    [shiftId, amount, paymentMethod],
  );
}

export async function createCartCommissions(
  client: PoolClient,
  params: {
    invoiceId: string;
    branchId: string;
    staffUserId: string | null;
    invoiceCode: string;
    lines: Array<{ type: string; price: number; quantity: number }>;
    discountAmount: number;
  },
) {
  if (!params.staffUserId) return;
  const rates = await getStaffCommissionRates(client, params.staffUserId);
  const serviceGross = params.lines
    .filter((line) => line.type === 'SERVICE')
    .reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0);
  const productGross = params.lines
    .filter((line) => line.type === 'PRODUCT')
    .reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0);
  const gross = serviceGross + productGross;
  if (gross <= 0) return;

  const net = Math.max(0, gross - Number(params.discountAmount || 0));
  const serviceBase = serviceGross > 0 ? Math.round((net * serviceGross) / gross) : 0;
  const productBase = Math.max(0, net - serviceBase);

  if (serviceBase > 0 && rates.serviceRate > 0 && rates.serviceRate <= 100) {
    const existing = (
      await client.query(
        "SELECT 1 FROM staff_commissions WHERE invoice_id=$1 AND commission_type='SERVICE_DIRECT' LIMIT 1",
        [params.invoiceId],
      )
    ).rowCount;
    if (!existing) {
      await client.query(
        `INSERT INTO staff_commissions(staff_id,branch_id,invoice_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
         VALUES($1,$2,$3,'SERVICE_DIRECT',$4,$5,round($4::numeric*$5::numeric/100),'PENDING',to_char(now(),'YYYY-MM'),$6)`,
        [
          params.staffUserId,
          params.branchId,
          params.invoiceId,
          serviceBase,
          rates.serviceRate,
          `Hoa hồng bán dịch vụ từ hóa đơn ${params.invoiceCode}`,
        ],
      );
    }
  }

  if (productBase > 0 && rates.productRate > 0 && rates.productRate <= 100) {
    const existing = (
      await client.query(
        "SELECT 1 FROM staff_commissions WHERE invoice_id=$1 AND commission_type='PRODUCT_SALE' LIMIT 1",
        [params.invoiceId],
      )
    ).rowCount;
    if (!existing) {
      await client.query(
        `INSERT INTO staff_commissions(staff_id,branch_id,invoice_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
         VALUES($1,$2,$3,'PRODUCT_SALE',$4,$5,round($4::numeric*$5::numeric/100),'PENDING',to_char(now(),'YYYY-MM'),$6)`,
        [
          params.staffUserId,
          params.branchId,
          params.invoiceId,
          productBase,
          rates.productRate,
          `Hoa hồng bán sản phẩm từ hóa đơn ${params.invoiceCode}`,
        ],
      );
    }
  }
}

export async function loadUserPackageSummary(client: PoolClient, userPackageId: string | null | undefined) {
  if (!isUuidString(userPackageId)) return null;
  const row = (
    await client.query(
      `SELECT up.*, tp.name AS package_name
       FROM user_packages up
       LEFT JOIN treatment_packages tp ON tp.id=up.package_id
       WHERE up.id=$1`,
      [userPackageId],
    )
  ).rows[0];
  if (!row) return null;
  const totalSessions = Number(row.total_sessions || 0);
  const completedSessions = Number(row.completed_sessions || 0);
  return {
    ...row,
    packageName: row.package_name || null,
    totalSessions,
    completedSessions,
    remainingSessions: Math.max(0, totalSessions - completedSessions),
    expiresAt: row.expires_at || null,
  };
}

export async function settlePendingPosInvoice(
  client: PoolClient,
  lockedInvoice: Record<string, any>,
  options: { gatewayTransactionId?: string; actorId?: string | null; paymentMethod?: string } = {},
) {
  if (lockedInvoice.payment_status === 'PAID') {
    const existingPkg = await loadUserPackageSummary(client, lockedInvoice.user_package_id);
    return {
      alreadyPaid: true,
      invoice: lockedInvoice,
      userPackage: existingPkg,
    };
  }

  const meta = (lockedInvoice.pending_meta && typeof lockedInvoice.pending_meta === 'object')
    ? lockedInvoice.pending_meta
    : {};
  const effectiveMethod = options.paymentMethod || lockedInvoice.payment_method || 'BANK_TRANSFER';
  const sellerUserId = await resolveSellerUserId(
    client,
    lockedInvoice.commission_staff_id || meta.commissionStaffId,
  );

  let paidInvoice = (
    await client.query(
      `UPDATE invoices
       SET payment_status='PAID',
           payment_method=$2::payment_method,
           commission_staff_id=COALESCE(commission_staff_id,$3),
           gateway_transaction_id=COALESCE($4,gateway_transaction_id),
           paid_at=COALESCE(paid_at,now())
       WHERE id=$1
       RETURNING *`,
      [
        lockedInvoice.id,
        effectiveMethod,
        sellerUserId,
        options.gatewayTransactionId || null,
      ],
    )
  ).rows[0];

  if (paidInvoice.coupon_id) {
    await client.query('UPDATE coupons SET used_count=COALESCE(used_count,0)+1 WHERE id=$1', [paidInvoice.coupon_id]);
  }
  if (isUuidString(meta.userVoucherId)) {
    await markUserVoucherUsed(client, meta.userVoucherId, paidInvoice.customer_id, paidInvoice.id);
  }
  if (Number(meta.redeemPoints || 0) > 0) {
    await redeemInvoicePoints(
      client,
      paidInvoice.id,
      paidInvoice.customer_id,
      Number(meta.redeemPoints),
      paidInvoice.invoice_code,
    );
  }

  let activatedPackage: any = null;
  const subtotal = Number(paidInvoice.subtotal || paidInvoice.pre_tax_amount || paidInvoice.total_amount || 0);
  const discountAmount = Number(paidInvoice.discount_amount || 0);

  if (meta.kind === 'PACKAGE' && !paidInvoice.user_package_id && isUuidString(meta.packageId)) {
    const treatmentPackage = (
      await client.query(
        'SELECT * FROM treatment_packages WHERE id=$1 AND is_active=true FOR UPDATE',
        [meta.packageId],
      )
    ).rows[0];
    if (!treatmentPackage) throw new NotFoundException('Gói liệu trình không còn mở bán.');
    if (paidInvoice.customer_id === GUEST_CUSTOMER_ID) {
      throw new BadRequestException('Không cho phép khách vãng lai đăng ký gói liệu trình.');
    }
    const createdPkg = (
      await client.query(
        `INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,purchased_at,expires_at,commission_staff_id)
         VALUES($1,$2,$3,0,'ACTIVE',now(),now()+($4::int * interval '1 month'),$5) RETURNING *`,
        [
          paidInvoice.customer_id,
          treatmentPackage.id,
          treatmentPackage.total_sessions,
          treatmentPackage.validity_months || 6,
          sellerUserId || null,
        ],
      )
    ).rows[0];
    paidInvoice = (
      await client.query(
        'UPDATE invoices SET user_package_id=$2 WHERE id=$1 RETURNING *',
        [paidInvoice.id, createdPkg.id],
      )
    ).rows[0];
    activatedPackage = await loadUserPackageSummary(client, createdPkg.id);
    if (sellerUserId) {
      const { packageRate } = await getStaffCommissionRates(client, sellerUserId);
      if (packageRate > 0 && packageRate <= 100) {
        const preTax = Number(paidInvoice.pre_tax_amount ?? subtotal);
        await client.query(
          `INSERT INTO staff_commissions(staff_id,branch_id,invoice_id,user_package_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
           VALUES($1,$2,$3,$4,'TREATMENT_PATHWAY',$5,$6,round($5::numeric*$6::numeric/100),'PENDING',to_char(now(),'YYYY-MM'),$7)
           ON CONFLICT (user_package_id) WHERE user_package_id IS NOT NULL DO NOTHING`,
          [
            sellerUserId,
            paidInvoice.branch_id,
            paidInvoice.id,
            createdPkg.id,
            preTax,
            packageRate,
            `Hoa hồng bán lộ trình ${treatmentPackage.name} từ hóa đơn ${paidInvoice.invoice_code}`,
          ],
        );
      }
    }
  } else if (paidInvoice.booking_id) {
    const booking = (
      await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [paidInvoice.booking_id])
    ).rows[0];
    if (booking) {
      const catalogPackageId = String(booking.special_notes || '').match(/package_id=([0-9a-f-]{36})/i)?.[1];
      const existingUserPkgId = String(booking.special_notes || '').match(/user_package_id=([0-9a-f-]{36})/i)?.[1];
      if (catalogPackageId && !existingUserPkgId && !paidInvoice.user_package_id) {
        if (booking.customer_id === GUEST_CUSTOMER_ID) {
          throw new BadRequestException('Không cho phép khách vãng lai kích hoạt gói liệu trình.');
        }
        const pkgDef = (
          await client.query('SELECT * FROM treatment_packages WHERE id=$1 AND is_active=true FOR UPDATE', [catalogPackageId])
        ).rows[0];
        if (pkgDef) {
          const createdPkg = (
            await client.query(
              `INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,purchased_at,expires_at,commission_staff_id)
               VALUES($1,$2,$3,0,'ACTIVE',now(),now()+($4::int * interval '1 month'),$5) RETURNING *`,
              [booking.customer_id, pkgDef.id, pkgDef.total_sessions, pkgDef.validity_months || 6, sellerUserId || null],
            )
          ).rows[0];
          paidInvoice = (
            await client.query('UPDATE invoices SET user_package_id=$2 WHERE id=$1 RETURNING *', [
              paidInvoice.id,
              createdPkg.id,
            ])
          ).rows[0];
          activatedPackage = await loadUserPackageSummary(client, createdPkg.id);
        }
      } else if (existingUserPkgId) {
        activatedPackage = await loadUserPackageSummary(client, existingUserPkgId);
      }

      const bookingUpdate = await client.query(
        `UPDATE bookings SET payment_status='PAID',
         payment_method=$2::payment_method,
         updated_at=now(),
         special_notes=CASE WHEN $4::text IS NOT NULL AND COALESCE(special_notes,'') NOT ILIKE ('%user_package_id=' || $4::text || '%')
           THEN TRIM(COALESCE(special_notes,'') || ' [user_package_id=' || $4::text || ']') ELSE special_notes END,
         status=CASE WHEN session_status='COMPLETED' THEN 'COMPLETED'::booking_status ELSE status END,
         checked_out_at=CASE WHEN session_status='COMPLETED' THEN COALESCE(checked_out_at,now()) ELSE checked_out_at END,
         checked_out_by_id=CASE WHEN session_status='COMPLETED' THEN COALESCE(checked_out_by_id,$3) ELSE checked_out_by_id END
         WHERE id=$1 RETURNING *`,
        [booking.id, effectiveMethod, options.actorId || paidInvoice.cashier_id || null, activatedPackage?.id || null],
      );
      if (bookingUpdate.rows[0]?.status === 'COMPLETED' && activatedPackage) {
        activatedPackage = await loadUserPackageSummary(client, activatedPackage.id);
      }
    }

    if (sellerUserId) {
      const rates = await getStaffCommissionRates(client, sellerUserId);
      const preTax = Number(paidInvoice.pre_tax_amount ?? subtotal);
      if (activatedPackage && paidInvoice.user_package_id && rates.packageRate > 0 && rates.packageRate <= 100) {
        await client.query(
          `INSERT INTO staff_commissions(staff_id,branch_id,invoice_id,user_package_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
           VALUES($1,$2,$3,$4,'TREATMENT_PATHWAY',$5,$6,round($5::numeric*$6::numeric/100),'PENDING',to_char(now(),'YYYY-MM'),$7)
           ON CONFLICT (user_package_id) WHERE user_package_id IS NOT NULL DO NOTHING`,
          [
            sellerUserId,
            paidInvoice.branch_id,
            paidInvoice.id,
            paidInvoice.user_package_id,
            preTax,
            rates.packageRate,
            `Hoa hồng bán lộ trình từ hóa đơn ${paidInvoice.invoice_code}`,
          ],
        );
      } else if (!activatedPackage && rates.serviceRate > 0 && rates.serviceRate <= 100) {
        const techUser = booking?.technician_id
          ? (await client.query('SELECT user_id FROM technicians WHERE id=$1', [booking.technician_id])).rows[0]?.user_id
          : null;
        if (sellerUserId !== techUser) {
          const existing = (
            await client.query('SELECT 1 FROM staff_commissions WHERE invoice_id=$1 LIMIT 1', [paidInvoice.id])
          ).rowCount;
          if (!existing) {
            await client.query(
              `INSERT INTO staff_commissions(staff_id,branch_id,invoice_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
               VALUES($1,$2,$3,'SERVICE_DIRECT',$4,$5,round($4::numeric*$5::numeric/100),'PENDING',to_char(now(),'YYYY-MM'),$6)`,
              [
                sellerUserId,
                paidInvoice.branch_id,
                paidInvoice.id,
                preTax,
                rates.serviceRate,
                `Hoa hồng thu tiền dịch vụ từ hóa đơn ${paidInvoice.invoice_code}`,
              ],
            );
          }
        }
      }
    }
  } else {
    const itemRows = (
      await client.query('SELECT item_type AS type, unit_price AS price, quantity FROM invoice_items WHERE invoice_id=$1', [
        paidInvoice.id,
      ])
    ).rows;
    await createCartCommissions(client, {
      invoiceId: paidInvoice.id,
      branchId: paidInvoice.branch_id,
      staffUserId: sellerUserId,
      invoiceCode: paidInvoice.invoice_code,
      lines: itemRows.map((row) => ({
        type: String(row.type || 'SERVICE'),
        price: Number(row.price || 0),
        quantity: Number(row.quantity || 1),
      })),
      discountAmount,
    });
  }

  if (meta.kind === 'CART') {
    await awardInvoicePoints(
      client,
      paidInvoice.id,
      paidInvoice.customer_id,
      Number(paidInvoice.total_amount || 0),
      paidInvoice.invoice_code,
    );
  }

  if (paidInvoice.user_package_id && !activatedPackage) {
    activatedPackage = await loadUserPackageSummary(client, paidInvoice.user_package_id);
  }

  if (paidInvoice.shift_id) {
    const shiftRow = (
      await client.query("SELECT id, status FROM cashier_shifts WHERE id=$1 FOR UPDATE", [paidInvoice.shift_id])
    ).rows[0];
    if (shiftRow) {
      await updateCashierShiftTotalsSql(client, shiftRow.id, effectiveMethod, Number(paidInvoice.total_amount || 0));
    }
  }

  return {
    alreadyPaid: false,
    invoice: paidInvoice,
    userPackage: activatedPackage,
  };
}
