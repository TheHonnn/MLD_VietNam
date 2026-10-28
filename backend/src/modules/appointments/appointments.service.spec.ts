import { AppointmentsService } from './appointments.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('AppointmentsService.createBooking', () => {
  const booking = {
    id: 'booking-uuid',
    booking_code: 'MLD-TEST-1',
    status: 'PENDING',
    payment_status: 'UNPAID',
  };

  function createService(bookingInsertResult: { data: unknown; error: unknown }) {
    const bookingsQuery: any = {
      select: vi.fn(() => bookingsQuery),
      eq: vi.fn(() => bookingsQuery),
      in: vi.fn(async () => ({ data: [] })),
      insert: vi.fn(() => bookingsQuery),
      maybeSingle: vi.fn(async () => bookingInsertResult),
    };
    const servicesQuery: any = {
      select: vi.fn(() => servicesQuery),
      eq: vi.fn(() => servicesQuery),
      maybeSingle: vi.fn(async () => ({
        data: { id: 'service-uuid', name: 'Treatment', price: 100000, duration_minutes: 60 },
        error: null,
      })),
    };
    const supabaseService: any = {
      adminClient: {
        from: vi.fn((table: string) => {
          if (table === 'services') return servicesQuery;
          if (table === 'bookings') return bookingsQuery;
          if (table === 'booking_items') {
            return { insert: vi.fn(async () => ({ error: null })) };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
        rpc: vi.fn(async () => ({ data: [{ is_available: true }], error: null })),
      },
    };
    const redisService: any = { releaseLock: vi.fn(async () => true) };
    const service = new AppointmentsService(supabaseService, redisService);
    vi.spyOn(service, 'dispatchLeastBusyTechnician').mockResolvedValue(null);
    return { service, supabaseService, bookingsQuery };
  }

  const dto: any = {
    branchId: 'branch-uuid',
    serviceId: 'service-uuid',
    bookingDate: '2026-11-01',
    startTime: '09:00',
    endTime: '10:00',
    paymentMethod: 'CASH_AT_SPA',
  };

  it('does not report success when the booking row was not persisted', async () => {
    const { service } = createService({ data: null, error: { message: 'database unavailable' } });

    await expect(service.createBooking('customer-uuid', dto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('returns the persisted pending booking only after saving its service item', async () => {
    const { service, supabaseService } = createService({ data: booking, error: null });

    const result = await service.createBooking('customer-uuid', dto);

    expect(result.data).toEqual(booking);
    expect(supabaseService.adminClient.from).toHaveBeenCalledWith('booking_items');
    expect(result.data.status).toBe('PENDING');
    expect(result.data.payment_status).toBe('UNPAID');
  });
});
