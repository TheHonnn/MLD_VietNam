import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readSrc = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

test('MLDInvoiceDocument supports 80mm POS thermal printing and package session balances', () => {
  const doc = readSrc('../src/components/invoices/MLDInvoiceDocument.tsx');
  assert.match(doc, /mode\?: 'a5' \| 'thermal80'/);
  assert.match(doc, /@page \{ size: 80mm auto; margin: 2mm; \}/);
  assert.match(doc, /width: 76mm !important;/);
  assert.match(doc, /Tổng số buổi:/);
  assert.match(doc, /Đã sử dụng:/);
  assert.match(doc, /Còn lại:/);
});

test('Membership tier navigation and UI controls are hidden across admin menus and CRM', () => {
  const sidebar = readSrc('../src/components/layout/Sidebar.tsx');
  const navigation = readSrc('../src/admin/navigation.ts');
  const customers = readSrc('../src/pages/W03_Customers.tsx');
  const customerDetail = readSrc('../src/pages/W04_CustomerDetail.tsx');
  assert.doesNotMatch(sidebar, /membership_tier_rules/);
  assert.doesNotMatch(navigation, /membership_tier_rules/);
  assert.doesNotMatch(customers, /Hạng hội viên/);
  assert.doesNotMatch(customerDetail, /Thẻ Hội Viên VIP/);
});

test('Enrollment uses standardized HV- student code without Mã khách hàng label', () => {
  const enrollment = readSrc('../src/pages/W08_Enrollment.tsx');
  const billModal = readSrc('../src/components/enrollment/EnrollmentBillModal.tsx');
  const apiTs = readSrc('../src/admin/api.ts');
  assert.match(enrollment, /`HV-\$\{todayStr\}-/);
  assert.doesNotMatch(enrollment, /`KH-\$\{todayStr\}-/);
  assert.match(billModal, /Mã học viên:/);
  assert.doesNotMatch(billModal, /Mã khách hàng:/);
  assert.match(apiTs, /`HV-\$\{new Date\(\)\.toISOString\(\)/);
});

test('Staff profile editor and W13 support all 3 commission rates and PRODUCT_SALE', () => {
  const sheet = readSrc('../src/admin/StaffProfileEditorSheet.tsx');
  const w13 = readSrc('../src/pages/W13_StaffCommissions.tsx');
  assert.match(sheet, /package_commission_rate/);
  assert.match(sheet, /product_commission_rate/);
  assert.match(w13, /PRODUCT_SALE/);
});

test('Settings unwrap, Tab 3 tuition method isolation, HV labels and Dashboard search tier removal hold', () => {
  const settingsSvc = readSrc('../src/services/settings.service.ts');
  const posPage = readSrc('../src/pages/W07_CashierPOS.tsx');
  const billModal = readSrc('../src/components/enrollment/EnrollmentBillModal.tsx');
  const assignModal = readSrc('../src/components/enrollment/AssignBatchModal.tsx');
  const w08 = readSrc('../src/pages/W08_Enrollment.tsx');
  const dash = readSrc('../src/pages/W01_Dashboard.tsx');
  assert.match(settingsSvc, /res && typeof res === 'object' && 'data' in res/);
  assert.match(posPage, /const \[tuitionMethod, setTuitionMethod\]/);
  assert.match(posPage, /academyService\.getEnrollments\(\{ fresh: true \}\)/);
  assert.doesNotMatch(posPage, /Khớp tiền tự động/);
  assert.doesNotMatch(billModal, /Mã Khách Hàng/);
  assert.doesNotMatch(assignModal, /Mã KH:/);
  assert.doesNotMatch(w08, /Mã KH:/);
  assert.doesNotMatch(dash, /c\.membershipTier/);
});
