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
  assert.equal(rules.isBookingWaitingPayment({ id: 'wallet-pkg', status: 'CONFIRMED', paymentStatus: 'UNPAID', paymentMethod: 'MEMBERSHIP_WALLET', finalPrice: 0 }, new Set()), false);
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
test('tuition deep link selects only an exact and unique enrollment', () => {
  const rows = [{ id: 'row-a', orderCode: 'KH-001' }, { id: 'row-b', orderCode: 'KH-0010' }];
  assert.equal(rules.findTuitionEnrollment(rows, ' kh-001 '), rows[0]);
  assert.equal(rules.findTuitionEnrollment(rows, 'row-b'), rows[1]);
  assert.equal(rules.findTuitionEnrollment(rows, 'KH'), undefined);
  assert.equal(rules.findTuitionEnrollment([...rows, { id: 'row-c', orderCode: 'KH-001' }], 'KH-001'), undefined);
});

test('getBookingEffectiveDiscount extracts discount correctly', () => {
  // Direct camelCase discountAmount
  assert.equal(
    rules.getBookingEffectiveDiscount({
      baseTotal: 900000,
      discountAmount: 100000,
      pointsDiscount: 0,
      finalPrice: 800000,
    }),
    100000
  );

  // snake_case discount_amount + points_discount
  assert.equal(
    rules.getBookingEffectiveDiscount({
      base_total: 900000,
      discount_amount: 50000,
      points_discount: 20000,
      final_price: 830000,
    }),
    70000
  );

  // Fallback to baseTotal - finalPrice when recorded discount is 0
  assert.equal(
    rules.getBookingEffectiveDiscount({
      baseTotal: 900000,
      discountAmount: 0,
      pointsDiscount: 0,
      finalPrice: 750000,
    }),
    150000
  );

  // No discount
  assert.equal(
    rules.getBookingEffectiveDiscount({
      baseTotal: 900000,
      finalPrice: 900000,
    }),
    0
  );

  // Null / undefined booking
  assert.equal(rules.getBookingEffectiveDiscount(null), 0);
  assert.equal(rules.getBookingEffectiveDiscount(undefined), 0);
});

test('calculatePosTotals computes totals matching backend expectedTotal exactly', () => {
  // Scenario #MLD-DL-065155: 900k service, 100k discount, 8% VAT
  const { preTax, vat, total } = rules.calculatePosTotals(900000, 100000, 8);
  assert.equal(preTax, 800000);
  assert.equal(vat, 64000);
  assert.equal(total, 864000);

  // Zero discount, 10% VAT
  const standard = rules.calculatePosTotals(500000, 0, 10);
  assert.equal(standard.preTax, 500000);
  assert.equal(standard.vat, 50000);
  assert.equal(standard.total, 550000);

  // Discount exceeding subtotal
  const fullDiscount = rules.calculatePosTotals(500000, 600000, 8);
  assert.equal(fullDiscount.preTax, 0);
  assert.equal(fullDiscount.vat, 0);
  assert.equal(fullDiscount.total, 0);

  const withPoints = rules.calculatePosTotals(1000000, 100000, 8, 200000);
  assert.equal(withPoints.preTax, 700000);
  assert.equal(withPoints.vat, 56000);
  assert.equal(withPoints.total, 756000);
});

test('maxRedeemablePoints caps points by balance, order percentage limit, and minimum payable amount', () => {
  assert.equal(rules.maxRedeemablePoints(1000000, 5000, 100, 30), 3000);
  assert.equal(rules.maxRedeemablePoints(1000000, 1200, 100, 30), 1200);
  assert.equal(rules.maxRedeemablePoints(5000, 500, 100, 100), 40);
  assert.equal(rules.maxRedeemablePoints(1000, 500, 100, 30), 0);
});

