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
  status?: string;
  sessionStatus?: string;
  session_status?: string;
  paymentStatus?: string;
  items?: Array<{
    id?: string;
    price?: number;
    durationMinutes?: number;
    service?: { id?: string; name?: string; price?: number; durationMinutes?: number };
  }>;
};

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
  return !['CANCELLED', 'NO_SHOW'].includes(String(booking.status || ''));
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

