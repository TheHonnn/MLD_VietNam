import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('AdminTabs component exists and conforms to MLD architecture guidelines', () => {
  const componentPath = new URL('../src/components/common/AdminTabs.tsx', import.meta.url);
  assert.ok(existsSync(componentPath), 'AdminTabs.tsx must exist');

  const content = readFileSync(componentPath, 'utf8');

  // Must support both line and pill variants
  assert.match(content, /variant\s*=\s*'line'/);
  assert.match(content, /variant === 'line'/);
  assert.match(content, /variant === 'pill'/);

  // Must support WAI-ARIA and semantic elements
  assert.match(content, /role:\s*'tablist'/);
  assert.match(content, /role="tab"/);
  assert.match(content, /aria-selected/);
  assert.match(content, /aria-current/);

  // Must support keyboard navigation
  assert.match(content, /handleKeyDown/);
  assert.match(content, /ArrowRight/);
  assert.match(content, /ArrowLeft/);

  // Must support auto-scroll into view for active tab
  assert.match(content, /scrollIntoView/);

  // Must use MLD brand color (#985018 / #8A4F23)
  assert.match(content, /#985018/);
  assert.match(content, /#8A4F23/);

  // Exported in common index.ts
  const indexPath = new URL('../src/components/common/index.ts', import.meta.url);
  const indexContent = readFileSync(indexPath, 'utf8');
  assert.match(indexContent, /export \* from '\.\/AdminTabs';/);
});

test('ResourcePage standardizes tab bar using AdminTabs and follows universal layout hierarchy', () => {
  const resourcePage = readFileSync(new URL('../src/admin/ResourcePage.tsx', import.meta.url), 'utf8');

  // Must import AdminTabs
  assert.match(resourcePage, /import \{[^}]*AdminTabs[^}]*\} from "\.\.\/components\/common";/);

  // Must render AdminTabs with variant="line"
  assert.match(resourcePage, /<AdminTabs/);
  assert.match(resourcePage, /ariaLabel="Phân hệ liên quan"/);
  assert.match(resourcePage, /variant="line"/);
  assert.match(resourcePage, /activeTab=\{table\}/);

  // Layout hierarchy: AdminTabs must appear after admin-page-heading and before admin-toolbar
  const headingPos = resourcePage.indexOf('className="admin-page-heading"');
  const tabsPos = resourcePage.indexOf('<AdminTabs');
  const toolbarPos = resourcePage.indexOf('className="admin-toolbar"');

  assert.ok(headingPos >= 0, 'admin-page-heading must exist');
  assert.ok(tabsPos > headingPos, 'AdminTabs must be placed after page heading');
  assert.ok(toolbarPos > tabsPos, 'admin-toolbar must be placed after AdminTabs');

  // TrainingActions must not be placed above AdminTabs
  const trainingActionsPos = resourcePage.indexOf('<TrainingActions />');
  if (trainingActionsPos >= 0) {
    assert.ok(trainingActionsPos > tabsPos, 'TrainingActions should be placed below tabs, not above them');
  }
});

test('admin.css eliminates negative margins on .admin-related-tabs and ensures smooth scrollbar-free tabs', () => {
  const css = readFileSync(new URL('../src/admin/admin.css', import.meta.url), 'utf8');

  // Must not have negative margin on tabs
  assert.doesNotMatch(css, /\.admin-related-tabs\s*\{[^}]*margin:\s*-[0-9]/, 'Negative margin must not be used on tabs');

  // Must have scrollbar-width none and touch scrolling
  assert.match(css, /\.admin-related-tabs\s*\{[^}]*scrollbar-width:\s*none/);
  assert.match(css, /\.admin-related-tabs\s*\{[^}]*scroll-behavior:\s*smooth/);
});

test('Key admin workstations and management pages adopt unified AdminTabs', () => {
  // W07_CashierPOS
  const cashier = readFileSync(new URL('../src/pages/W07_CashierPOS.tsx', import.meta.url), 'utf8');
  assert.match(cashier, /<AdminTabs/);
  assert.match(cashier, /variant="pill"/);
  assert.match(cashier, /ariaLabel="Nguồn giao dịch và chế độ POS"/);

  // W06_ServicesCatalog
  const catalog = readFileSync(new URL('../src/pages/W06_ServicesCatalog.tsx', import.meta.url), 'utf8');
  assert.match(catalog, /<AdminTabs/);
  assert.match(catalog, /variant="pill"/);
  assert.match(catalog, /ariaLabel="Chế độ xem bảng giá"/);

  // W02_Branches
  const branches = readFileSync(new URL('../src/pages/W02_Branches.tsx', import.meta.url), 'utf8');
  assert.match(branches, /<AdminTabs/);
  assert.match(branches, /variant="line"/);
  assert.match(branches, /ariaLabel="Chuyển đổi Chi nhánh và Phòng dịch vụ"/);

  // W08_Enrollment
  const enrollment = readFileSync(new URL('../src/pages/W08_Enrollment.tsx', import.meta.url), 'utf8');
  assert.match(enrollment, /<AdminTabs/);
  assert.match(enrollment, /variant="line"/);
  assert.match(enrollment, /ariaLabel="Lọc hồ sơ theo bước xử lý"/);

  // W10_Attendance
  const attendance = readFileSync(new URL('../src/pages/W10_Attendance.tsx', import.meta.url), 'utf8');
  assert.match(attendance, /<AdminTabs/);
  assert.match(attendance, /variant="line"/);
  assert.match(attendance, /ariaLabel="Chế độ xem chuyên cần"/);

  // W14_ZaloZNS
  const zns = readFileSync(new URL('../src/pages/W14_ZaloZNS.tsx', import.meta.url), 'utf8');
  assert.match(zns, /<AdminTabs/);
  assert.match(zns, /variant="line"/);

  // W15_InventoryBOM
  const bom = readFileSync(new URL('../src/pages/W15_InventoryBOM.tsx', import.meta.url), 'utf8');
  assert.match(bom, /<AdminTabs/);
  assert.match(bom, /variant="line"/);

  // W16_Certificates
  const certs = readFileSync(new URL('../src/pages/W16_Certificates.tsx', import.meta.url), 'utf8');
  assert.match(certs, /<AdminTabs/);
  assert.match(certs, /variant="line"/);

  // W18_PortalContent
  const portal = readFileSync(new URL('../src/pages/W18_PortalContent.tsx', import.meta.url), 'utf8');
  assert.match(portal, /<AdminTabs/);
  assert.match(portal, /variant="pill"/);
});
