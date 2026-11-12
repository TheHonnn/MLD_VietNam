import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/pages/W06_ServicesCatalog.tsx', import.meta.url), 'utf8');

test('pricing catalog exposes the complete package lifecycle', () => {
  assert.match(source, /Quy trình bán và kích hoạt liệu trình/);
  assert.match(source, /Chuẩn hóa bảng giá/);
  assert.match(source, /Tư vấn chọn gói/);
  assert.match(source, /Thu tiền tại POS/);
  assert.match(source, /Kích hoạt & xếp buổi/);
});

test('catalog sends only valid active packages to POS with identity preserved', () => {
  assert.match(source, /if \(!pkg\.is_active\)/);
  assert.match(source, /!pkg\.service_id \|\| Number\(pkg\.price\) <= 0 \|\| Number\(pkg\.total_sessions\) <= 0/);
  assert.match(source, /packageId: pkg\.id/);
  assert.match(source, /packageName: pkg\.name/);
  assert.match(source, /navigate\(`\/cashier-pos\?\$\{query\.toString\(\)\}`\)/);
});

test('catalog writes through the authenticated admin API and shares live prices', () => {
  assert.match(source, /adminApi\('services\/update'/);
  assert.match(source, /adminApi\('treatment_packages\/update'/);
  assert.doesNotMatch(source, /\.from\('services'\)\s*\.update/);
  assert.doesNotMatch(source, /\.from\('treatment_packages'\)\s*\.update/);
  assert.match(source, /activeServices\.map/);
  assert.match(source, /activePackages/);
});
