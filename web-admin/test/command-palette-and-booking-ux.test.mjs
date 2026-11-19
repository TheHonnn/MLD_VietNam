import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const navBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/admin/navigation.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { ADMIN_NAVIGATION_GROUPS, getCommandNavigationEntries } = await import(
  'data:text/javascript;base64,' + Buffer.from(navBundle.outputFiles[0].text).toString('base64')
);

const bookingUxBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/pages/booking-ux.rules.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { findCustomerConsultationSurvey, buildTechnicianBookingOptions } = await import(
  'data:text/javascript;base64,' + Buffer.from(bookingUxBundle.outputFiles[0].text).toString('base64')
);

const allResources = [
  ...new Set(ADMIN_NAVIGATION_GROUPS.flatMap((g) => g.tables)),
].map((name) => ({ name, title: name, group: 'General', actions: [] }));

test('getCommandNavigationEntries hides /settings and /zalo-zns for non-admin roles while preserving allowed modules and /help', () => {
  const superEntries = getCommandNavigationEntries('SUPER_ADMIN', allResources);
  assert.ok(superEntries.some((e) => e.href === '/settings'));
  assert.ok(superEntries.some((e) => e.href === '/zalo-zns'));
  assert.ok(superEntries.some((e) => e.href === '/cashier-pos'));

  const managerEntries = getCommandNavigationEntries('BRANCH_MANAGER', allResources);
  assert.ok(!managerEntries.some((e) => e.href === '/settings'));
  assert.ok(!managerEntries.some((e) => e.href === '/zalo-zns'));
  assert.ok(managerEntries.some((e) => e.href === '/help'));

  const cashierOnly = allResources.filter((r) => ['bookings', 'invoices'].includes(r.name));
  const cashierEntries = getCommandNavigationEntries('CASHIER', cashierOnly);
  assert.ok(cashierEntries.some((e) => e.href === '/cashier-pos'));
  assert.ok(cashierEntries.some((e) => e.href === '/manage/bookings'));
  assert.ok(!cashierEntries.some((e) => e.href === '/manage/courses'));
});

test('findCustomerConsultationSurvey matches by bookingId, customerId, normalized phone, or customerName', () => {
  const surveys = [
    {
      id: 's1',
      booking_id: 'b-1',
      customer_id: 'c-1',
      customer_name: 'Nguyen Van A',
      customer_phone: '0909 111 222',
      has_oil_allergy: true,
    },
  ];
  assert.equal(findCustomerConsultationSurvey(surveys, { bookingId: 'b-1' })?.id, 's1');
  assert.equal(findCustomerConsultationSurvey(surveys, { customerId: 'c-1' })?.id, 's1');
  assert.equal(findCustomerConsultationSurvey(surveys, { customerPhone: '0909111222' })?.id, 's1');
  assert.equal(findCustomerConsultationSurvey(surveys, { customerName: 'nguyen van a' })?.id, 's1');
  assert.equal(findCustomerConsultationSurvey(surveys, { customerId: 'unknown', customerName: 'Someone Else' }), null);
});

test('buildTechnicianBookingOptions sorts available technicians first and marks approved-leave or busy staff', () => {
  const techs = [
    { id: 't-leave', fullName: 'Binh KTV', title: 'Chuyen vien' },
    { id: 't-busy', fullName: 'An KTV', title: 'Chuyen vien' },
    { id: 't-free', fullName: 'Chi KTV', title: 'Chuyen vien' },
  ];
  const capacity = {
    start: '09:00',
    end: '10:00',
    totalBeds: 3,
    freeBeds: 2,
    freeStaff: 1,
    remainingCapacity: 1,
    availableTechnicianIds: ['t-free'],
  };
  const onLeave = [{ technicianId: 't-leave', fullName: 'Binh KTV', reason: 'Annual' }];
  const options = buildTechnicianBookingOptions(techs, capacity, onLeave);

  assert.deepEqual(
    options.map((o) => ({ id: o.technician.id, avail: o.isAvailable, leave: o.isOnLeave })),
    [
      { id: 't-free', avail: true, leave: false },
      { id: 't-busy', avail: false, leave: false },
      { id: 't-leave', avail: false, leave: true },
    ],
  );
});
