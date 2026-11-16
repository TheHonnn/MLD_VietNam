import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notificationDestination } from '../src/services/notification-destination.mjs';

test('opens the exact booking by ID, date and branch when available', () => {
  const href = notificationDestination({
    type: 'BOOKING',
    title: 'Khách đặt lịch hẹn mới: LT-original',
    link: '/staff-schedule?booking=LT-legacy',
    data: { booking_id: 'booking-id', booking_date: '2026-11-17', branch_id: 'branch-id' },
  });
  assert.equal(href, '/staff-schedule?appId=booking-id&date=2026-11-17&branchId=branch-id');
});

test('recovers booking codes used by older notifications, including package bookings', () => {
  for (const code of ['LT-4064c44c86494509b6ab5dbb', 'LH-987abc', 'BK-123']) {
    assert.equal(notificationDestination({ type: 'BOOKING', message: `${code} · 2026-11-17 · 09:00:00` }),
      `/staff-schedule?booking=${code}&date=2026-11-17`);
  }
});

test('opens paid receipts and keeps tuition notifications in the academy', () => {
  assert.equal(notificationDestination({ type: 'PAYMENT', message: 'Hóa đơn #POS-1794322995736-96105D74 đã thanh toán.' }),
    '/cashier-pos?tab=receipts&invoice=POS-1794322995736-96105D74&receipt=true');
  assert.equal(notificationDestination({
    type: 'ACADEMY', title: 'Học phí đã thanh toán',
    link: '/academy-enrollment', data: { enrollment_id: 'target-enrollment' },
  }), '/academy-enrollment?enrollmentId=target-enrollment');
});

test('keeps supported internal routes and rejects unsafe or unknown destinations', () => {
  assert.equal(notificationDestination({ type: 'SYSTEM', link: '/customer-detail?id=c1' }), '/customer-detail?id=c1');
  assert.equal(notificationDestination({ type: 'SYSTEM', link: '/attendance?batch_id=b1' }), '/attendance?batch_id=b1');
  for (const link of ['https://example.org/', '//example.org', '/\\example.org', 'javascript:alert(1)', '/unknown', '/manage/users%2Fdetail']) {
    assert.equal(notificationDestination({ type: 'SYSTEM', link }), null);
  }
  assert.equal(notificationDestination({ type: 'SYSTEM', title: 'Lịch bảo trì hệ thống' }), null);
});
