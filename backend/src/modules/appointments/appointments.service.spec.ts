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

  it('enforces zero payable amount, package service sync, and capacity limit for active MEMBERSHIP_WALLET bookings', async () => {
    const insertedPayloads: any[] = [];
    const insertedItems: any[] = [];
    const servicesById: Record<string, any> = {
      '11111111-1111-4111-8111-111111111111': { id: '11111111-1111-4111-8111-111111111111', name: 'Vodder 60', price: 900000, duration_minutes: 60 },
      '22222222-2222-4222-8222-222222222222': { id: '22222222-2222-4222-8222-222222222222', name: 'Khu tru 45', price: 650000, duration_minutes: 45 },
    };
    const pkgId = '33333333-3333-4333-8333-333333333333';
    const custId = '44444444-4444-4444-8444-444444444444';
    const branchUuid = '55555555-5555-4555-8555-555555555555';
    let requestedServiceId = '';
    let openBookingsData: any[] = [];

    const supabaseService: any = {
      adminClient: {
        from: vi.fn((table: string) => {
          if (table === 'services') {
            const q: any = {
              select: vi.fn(() => q),
              eq: vi.fn((col: string, val: string) => {
                if (col === 'id') requestedServiceId = val;
                return q;
              }),
              maybeSingle: vi.fn(async () => ({ data: servicesById[requestedServiceId] || null, error: null })),
            };
            return q;
          }
          if (table === 'user_packages') {
            const q: any = {
              select: vi.fn(() => q),
              eq: vi.fn(() => q),
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: pkgId,
                  customer_id: custId,
                  status: 'ACTIVE',
                  completed_sessions: 2,
                  total_sessions: 3,
                  expires_at: new Date(Date.now() + 86400000).toISOString(),
                  treatment_packages: {
                    id: '66666666-6666-4666-8666-666666666666',
                    name: 'Gói khu trú',
                    service_id: '22222222-2222-4222-8222-222222222222',
                  },
                },
                error: null,
              })),
            };
            return q;
          }
          if (table === 'bookings') {
            const q: any = {
              _isInsert: false,
              select: vi.fn(() => q),
              eq: vi.fn(() => q),
              in: vi.fn(() => {
                if (q._hasEqBranchOrStatus) return Promise.resolve({ data: [] });
                return Promise.resolve({ data: openBookingsData });
              }),
              insert: vi.fn((payload: any) => {
                insertedPayloads.push(payload);
                q._isInsert = true;
                return q;
              }),
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: '77777777-7777-4777-8777-777777777777',
                  booking_code: 'MLD-PKG-001',
                  status: 'CONFIRMED',
                  payment_status: 'PAID',
                  final_price: insertedPayloads[insertedPayloads.length - 1]?.final_price,
                },
                error: null,
              })),
              then: (resolve: any) => resolve({ data: openBookingsData }),
            };
            q.in = vi.fn((col: string) => {
              if (col === 'status') {
                return q._hasTechniciansOrBookingDate ? Promise.resolve({ data: [] }) : Promise.resolve({ data: openBookingsData });
              }
              return Promise.resolve({ data: [] });
            });
            const origEq = q.eq;
            q.eq = vi.fn((col: string) => {
              if (col === 'branch_id' || col === 'booking_date') q._hasTechniciansOrBookingDate = true;
              return origEq(col);
            });
            return q;
          }
          if (table === 'booking_items') {
            return {
              insert: vi.fn(async (payload: any) => {
                insertedItems.push(payload);
                return { error: null };
              }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
        rpc: vi.fn(async () => ({ data: [{ is_available: true }], error: null })),
      },
    };
    const redisService: any = { releaseLock: vi.fn(async () => true) };
    const service = new AppointmentsService(supabaseService, redisService);
    vi.spyOn(service, 'dispatchLeastBusyTechnician').mockResolvedValue(null);

    const walletDto: any = {
      branchId: branchUuid,
      serviceId: '11111111-1111-4111-8111-111111111111',
      bookingDate: '2026-11-20',
      startTime: '09:00',
      paymentMethod: 'MEMBERSHIP_WALLET',
      specialNotes: `[Gói liệu trình: Khu trú | user_package_id=${pkgId}]`,
    };

    const res = await service.createBooking(custId, walletDto);
    expect(res.data.status).toBe('CONFIRMED');
    expect(res.data.payment_status).toBe('PAID');
    expect(insertedPayloads[0].base_total).toBe(0);
    expect(insertedPayloads[0].final_price).toBe(0);
    expect(insertedItems[0].price).toBe(0);
    expect(insertedItems[0].service_id).toBe('22222222-2222-4222-8222-222222222222');

    openBookingsData = [
      { id: 'b-open-1', status: 'CONFIRMED', session_status: 'PENDING', special_notes: `[user_package_id=${pkgId}]` },
    ];
    await expect(service.createBooking(custId, walletDto)).rejects.toThrow(/đặt đủ số buổi còn lại/i);
  });
});
