import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const exportBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/utils/reportExport.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { escapeCsvCell, buildCsvContent, buildPrintableHtml } = await import(
  'data:text/javascript;base64,' + Buffer.from(exportBundle.outputFiles[0].text).toString('base64')
);

const presetsBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/utils/savedFilterPresets.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const {
  buildPresetStorageKey,
  filtersEqual,
  readSavedPresets,
  saveFilterPreset,
  deleteSavedPreset,
} = await import(
  'data:text/javascript;base64,' + Buffer.from(presetsBundle.outputFiles[0].text).toString('base64')
);

test('escapeCsvCell and buildCsvContent protect against formula injection and include UTF-8 BOM', () => {
  assert.equal(escapeCsvCell('=1+1'), `"'=1+1"`);
  assert.equal(escapeCsvCell('  @SUM(A1)'), `"'  @SUM(A1)"`);
  assert.equal(escapeCsvCell('Nguyễn "Văn" A'), '"Nguyễn ""Văn"" A"');

  const csv = buildCsvContent(['Mã', 'Tên học viên'], [['HV-01', 'Trần Thị Bích']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Mã","Tên học viên"\r\n"HV-01","Trần Thị Bích"'));
});

test('buildPrintableHtml escapes HTML injection and formats summary and table cleanly', () => {
  const html = buildPrintableHtml({
    title: 'Báo cáo <script>alert(1)</script>',
    subtitle: 'Tháng 11/2026',
    summaryItems: [{ label: 'Thực thu', value: '5.000.000đ' }],
    headers: ['Mã', 'Ghi chú'],
    rows: [['HD-01', '<img src=x onerror=alert(1)>']],
  });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('5.000.000đ'));
});

test('savedFilterPresets saves, deduplicates, reads, deletes, and handles corrupt storage', () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
  };
  const key = buildPresetStorageKey('w08_enrollment', 'user-1');
  assert.equal(key, 'mld_saved_presets:w08_enrollment:user-1');

  const list1 = saveFilterPreset(key, '  Công nợ học phí  ', { debtFilter: 'has_debt', branchFilter: 'all' }, storage);
  assert.equal(list1.length, 1);
  assert.equal(list1[0].name, 'Công nợ học phí');

  const list2 = saveFilterPreset(key, 'công nợ học phí', { debtFilter: 'paid_full', branchFilter: 'all' }, storage);
  assert.equal(list2.length, 1);
  assert.equal(list2[0].filters.debtFilter, 'paid_full');

  const loaded = readSavedPresets(key, storage);
  assert.equal(loaded.length, 1);
  assert.equal(filtersEqual(loaded[0].filters, { debtFilter: 'paid_full', branchFilter: 'all' }), true);
  assert.equal(filtersEqual(loaded[0].filters, { debtFilter: 'has_debt', branchFilter: 'all' }), false);

  const afterDel = deleteSavedPreset(key, loaded[0].id, storage);
  assert.equal(afterDel.length, 0);

  storage.setItem(key, '{bad-json');
  assert.deepEqual(readSavedPresets(key, storage), []);
});
