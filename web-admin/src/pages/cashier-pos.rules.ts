export type PosSource = 'WALK_IN' | 'BOOKING' | 'PACKAGE' | 'TUITION' | 'CART';
export const SYSTEM_GUEST_CUSTOMER_ID = 'bbbbbbbb-0001-0001-0001-000000000001';

type CartLine = {
  id: string;
  name: string;
  type: 'SERVICE' | 'PACKAGE' | 'PRODUCT';
  unitPrice: number;
  quantity: number;
  durationMinutes?: number;
  serviceId?: string;
  packageId?: string;
};

type BookingLike = {
  id: string;
  status?: string | null;
  sessionStatus?: string | null;
  session_status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  payment_method?: string | null;
  finalPrice?: number | null;
  final_price?: number | null;
  specialNotes?: string | null;
  special_notes?: string | null;
  items?: Array<{
    id?: string;
    price?: number;
    durationMinutes?: number;
    service?: { id?: string; name?: string; price?: number; durationMinutes?: number };
  }>;
};

type CashierShiftSnapshot = {
  id: string;
  systemCash?: number;
  openingCash: number;
};

export function hasCashierShiftSnapshotChanged(
  snapshot: CashierShiftSnapshot,
  latest: CashierShiftSnapshot,
): boolean {
  const snapshotExpected = Number(snapshot.systemCash ?? snapshot.openingCash);
  const latestExpected = Number(latest.systemCash ?? latest.openingCash);
  return snapshot.id !== latest.id || snapshotExpected !== latestExpected;
}

export function cartCompositionError(cart: CartLine[], nextType: CartLine['type']): string | null {
  const hasPackage = cart.some((line) => line.type === 'PACKAGE');
  if (nextType === 'PACKAGE' && cart.length > 0) return 'Gói liệu trình phải được thanh toán trong một phiếu riêng.';
  if (hasPackage) return 'Gói liệu trình phải được thanh toán trong một phiếu riêng.';
  return null;
}

export function isCompletedServiceBooking(booking: BookingLike): boolean {
  const session = booking.sessionStatus || booking.session_status;
  return booking.status === 'IN_SERVICE' && session === 'COMPLETED';
}

export function isBookingWaitingPayment(booking: BookingLike, paidBookingIds: ReadonlySet<string>): boolean {
  if (booking.paymentStatus === 'PAID' || paidBookingIds.has(booking.id)) return false;
  if (['CANCELLED', 'NO_SHOW'].includes(String(booking.status || ''))) return false;
  const method = String(booking.paymentMethod || booking.payment_method || '').toUpperCase();
  if (method === 'MEMBERSHIP_WALLET') return false;
  const finalAmount = booking.finalPrice ?? booking.final_price;
  const notes = String(booking.specialNotes || booking.special_notes || '');
  if (Number(finalAmount) === 0 && /user_package_id=/i.test(notes)) return false;
  return true;
}

export function bookingItemsToCart(booking: BookingLike): CartLine[] {
  return (booking.items || []).map((item, index) => {
    const service = item.service;
    const id = String(service?.id || item.id || `${booking.id}-${index}`);
    return {
      id,
      name: String(service?.name || `Dịch vụ ${index + 1}`),
      type: 'SERVICE',
      unitPrice: Number(item.price ?? service?.price ?? 0),
      quantity: 1,
      durationMinutes: Number(item.durationMinutes ?? service?.durationMinutes ?? 0),
      serviceId: service?.id,
    };
  });
}

export function classifyPosSource(bookingId: string | undefined, cart: CartLine[]): PosSource {
  if (bookingId) return 'BOOKING';
  if (cart.length === 1 && cart[0].type === 'PACKAGE' && cart[0].quantity === 1) return 'PACKAGE';
  if (cart.some((line) => line.type === 'SERVICE')) return 'WALK_IN';
  return 'CART';
}

export function findTuitionEnrollment<T extends { id: string; orderCode?: string | null }>(
  enrollments: T[],
  reference: string,
): T | undefined {
  const key = reference.trim().toLowerCase();
  if (!key) return undefined;
  const exactId = enrollments.find(enrollment => enrollment.id.toLowerCase() === key);
  if (exactId) return exactId;
  const matches = enrollments.filter(enrollment => enrollment.orderCode?.trim().toLowerCase() === key);
  return matches.length === 1 ? matches[0] : undefined;
}

export function findTargetBookingForPos<T extends { id: string; bookingCode?: string | null }>(
  bookings: T[],
  bookingId?: string | null,
  bookingCode?: string | null,
): T | undefined {
  const cleanId = String(bookingId || '').trim().toLowerCase();
  if (cleanId) {
    const byId = bookings.find((b) => String(b.id || '').trim().toLowerCase() === cleanId);
    if (byId) return byId;
  }
  const cleanCode = String(bookingCode || '').trim().toLowerCase();
  if (cleanCode) {
    const byCode = bookings.find(
      (b) =>
        String(b.bookingCode || '').trim().toLowerCase() === cleanCode ||
        String(b.id || '').trim().toLowerCase() === cleanCode,
    );
    if (byCode) return byCode;
  }
  return undefined;
}

export function buildBookingPosPath(params: {
  bookingId?: unknown;
  bookingCode?: unknown;
  customerId?: unknown;
  branchId?: unknown;
  tab?: 'pos' | 'queue' | 'receipts';
}): string {
  const query = new URLSearchParams();
  query.set('tab', params.tab || 'pos');
  const bookingId = String(params.bookingId || '').trim();
  const bookingCode = String(params.bookingCode || '').trim();
  const customerId = String(params.customerId || '').trim();
  const branchId = String(params.branchId || '').trim();
  if (bookingId) query.set('bookingId', bookingId);
  if (bookingCode) query.set('booking', bookingCode);
  if (customerId) query.set('customerId', customerId);
  if (branchId && branchId !== 'ALL') query.set('branchId', branchId);
  return `/cashier-pos?${query.toString()}`;
}

export function findMatchingCommissionStaffId(
  staffList: Array<{ id: string; technicianId?: string | null }>,
  booking?: { technicianId?: string | null; technician?: { userId?: string | null } | null } | null,
): string {
  if (!booking) return '';
  const targetTechUserId = String(booking.technician?.userId || '').trim();
  const targetTechId = String(booking.technicianId || '').trim();
  if (!targetTechUserId && !targetTechId) return '';
  const matched = staffList.find(
    (s) =>
      (targetTechUserId && s.id === targetTechUserId) ||
      (targetTechId && (s.id === targetTechId || s.technicianId === targetTechId)),
  );
  return matched?.id || '';
}

export function getBookingEffectiveDiscount(booking?: {
  baseTotal?: number;
  finalPrice?: number;
  discountAmount?: number;
  discount_amount?: number;
  pointsDiscount?: number;
  points_discount?: number;
} | null): number {
  if (!booking) return 0;
  const recorded = Math.max(
    0,
    Number(booking.discountAmount ?? booking.discount_amount ?? 0) +
      Number(booking.pointsDiscount ?? booking.points_discount ?? 0),
  );
  if (
    recorded === 0 &&
    Number(booking.baseTotal) > Number(booking.finalPrice) &&
    Number(booking.finalPrice) > 0
  ) {
    return Math.max(0, Number(booking.baseTotal) - Number(booking.finalPrice));
  }
  return recorded;
}

export function calculatePosTotals(subtotal: number, discount: number, vatRate: number, pointsDiscount = 0) {
  const preTax = Math.max(0, subtotal - discount - pointsDiscount);
  const vat = Math.round(preTax * (vatRate / 100));
  const total = preTax + vat;
  return { preTax, vat, total };
}

export function maxRedeemablePoints(
  remainingAfterDiscount: number,
  availablePoints: number,
  redeemValuePerPoint: number,
  maxRedeemPercent: number,
) {
  if (remainingAfterDiscount <= 1000 || availablePoints <= 0 || redeemValuePerPoint <= 0 || maxRedeemPercent <= 0) {
    return 0;
  }
  const maxByPercent = Math.floor((remainingAfterDiscount * maxRedeemPercent) / 100);
  const maxBeforeZero = Math.max(0, remainingAfterDiscount - 1000);
  const maxAllowedValue = Math.min(maxByPercent, maxBeforeZero);
  const maxByValue = Math.floor(maxAllowedValue / redeemValuePerPoint);
  return Math.max(0, Math.min(availablePoints, maxByValue));
}

