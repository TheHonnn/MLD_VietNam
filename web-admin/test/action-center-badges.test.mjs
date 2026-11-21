import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/pages/action-center.rules.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { formatBadgeCount, mapActionCountsToSidebarBadges } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

test('formatBadgeCount formats zero/negative as empty and caps values above 99 as 99+', () => {
  assert.equal(formatBadgeCount(0), '');
  assert.equal(formatBadgeCount(-2), '');
  assert.equal(formatBadgeCount(undefined), '');
  assert.equal(formatBadgeCount(7), '7');
  assert.equal(formatBadgeCount(99), '99');
  assert.equal(formatBadgeCount(120), '99+');
});

test('mapActionCountsToSidebarBadges maps all 5 action queues cleanly to sidebar destinations', () => {
  const badges = mapActionCountsToSidebarBadges({
    overdueBookings: 2,
    pendingTickets: 3,
    failedInventoryOutbox: 1,
    pendingEnrollmentApprovals: 4,
    draftCertificates: 5,
  });

  assert.equal(badges['/'], 15);
  assert.equal(badges['/staff-schedule'], 2);
  assert.equal(badges['/customers'], 3);
  assert.equal(badges['/help'], 3);
  assert.equal(badges['/help?tab=customer-tickets'], 3);
  assert.equal(badges['/treatment-inventory'], 1);
  assert.equal(badges['/medical-records'], 1);
  assert.equal(badges['/academy-enrollment'], 4);
  assert.equal(badges['/certificates'], 5);
});
