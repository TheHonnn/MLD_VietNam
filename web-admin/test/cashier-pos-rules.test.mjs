import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/pages/cashier-pos.rules.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const rules = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('package sales cannot be mixed with another cart line', () => {
  const service = [{ id: 's', name: 'Service', type: 'SERVICE', unitPrice: 1, quantity: 1 }];
  const packageLine = [{ id: 'p', name: 'Package', type: 'PACKAGE', unitPrice: 1, quantity: 1 }];
  assert.match(rules.cartCompositionError(service, 'PACKAGE'), /phiếu riêng/);
  assert.match(rules.cartCompositionError(packageLine, 'PRODUCT'), /phiếu riêng/);
  assert.equal(rules.cartCompositionError([], 'PACKAGE'), null);
});

test('queue priority requires IN_SERVICE and COMPLETED together', () => {
  assert.equal(rules.isCompletedServiceBooking({ id: '1', status: 'IN_SERVICE', sessionStatus: 'COMPLETED' }), true);
  assert.equal(rules.isCompletedServiceBooking({ id: '2', status: 'CONFIRMED', sessionStatus: 'COMPLETED' }), false);
});

test('paid invoice removes a stale unpaid booking from the queue', () => {
  const booking = { id: 'booking-1', status: 'IN_SERVICE', paymentStatus: 'UNPAID' };
  assert.equal(rules.isBookingWaitingPayment(booking, new Set(['booking-1'])), false);
});

test('cashier cannot close from a stale reconciliation snapshot', () => {
  const shown = { id: 'shift-1', openingCash: 1000000, systemCash: 1000000 };
  assert.equal(rules.hasCashierShiftSnapshotChanged(shown, { ...shown }), false);
  assert.equal(rules.hasCashierShiftSnapshotChanged(shown, { ...shown, systemCash: 1900000 }), true);
  assert.equal(rules.hasCashierShiftSnapshotChanged(shown, { ...shown, id: 'shift-2' }), true);
});

test('cancelled and no-show bookings never appear as money to collect', () => {
  assert.equal(rules.isBookingWaitingPayment({ id: 'cancelled', status: 'CANCELLED', paymentStatus: 'UNPAID' }, new Set()), false);
  assert.equal(rules.isBookingWaitingPayment({ id: 'no-show', status: 'NO_SHOW', paymentStatus: 'UNPAID' }, new Set()), false);
  assert.equal(rules.isBookingWaitingPayment({ id: 'active', status: 'IN_SERVICE', paymentStatus: 'UNPAID' }, new Set()), true);
});

test('booking checkout preserves every item and never invents a fallback price', () => {
  const lines = rules.bookingItemsToCart({ id: 'booking-1', items: [
    { id: 'i1', price: 100, service: { id: 's1', name: 'One' } },
    { id: 'i2', price: 200, service: { id: 's2', name: 'Two' } },
  ] });
  assert.deepEqual(lines.map((line) => [line.name, line.unitPrice]), [['One', 100], ['Two', 200]]);
  assert.deepEqual(rules.bookingItemsToCart({ id: 'empty' }), []);
});

test('source classification is explicit and deterministic', () => {
  const service = [{ id: 's', name: 'Service', type: 'SERVICE', unitPrice: 1, quantity: 1 }];
  const product = [{ id: 'p', name: 'Product', type: 'PRODUCT', unitPrice: 1, quantity: 1 }];
  assert.equal(rules.classifyPosSource('booking', service), 'BOOKING');
  assert.equal(rules.classifyPosSource(undefined, service), 'WALK_IN');
  assert.equal(rules.classifyPosSource(undefined, product), 'CART');
});
