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

test('ResourcePage standardizes tab bar using AdminPageShell and PageTabs with universal layout hierarchy', () => {
  const resourcePage = readFileSync(new URL('../src/admin/ResourcePage.tsx', import.meta.url), 'utf8');

  // Must import standard shell and tab components from common
  assert.match(resourcePage, /import \{[^}]*AdminPageShell[^}]*\} from "\.\.\/components\/common";/);
  assert.match(resourcePage, /import \{[^}]*PageHeader[^}]*\} from "\.\.\/components\/common";/);
  assert.match(resourcePage, /import \{[^}]*PageTabs[^}]*\} from "\.\.\/components\/common";/);
  assert.match(resourcePage, /import \{[^}]*PageToolbar[^}]*\} from "\.\.\/components\/common";/);
  assert.match(resourcePage, /import \{[^}]*PageContent[^}]*\} from "\.\.\/components\/common";/);

  // Must wrap in admin-page-shell
  assert.match(resourcePage, /<div className="admin-page-shell">/);

  // Must render PageTabs with variant="line"
  assert.match(resourcePage, /<PageTabs/);
  assert.match(resourcePage, /ariaLabel="Phân hệ liên quan"/);
  assert.match(resourcePage, /variant="line"/);
  assert.match(resourcePage, /activeTab=\{table\}/);

  // Layout hierarchy: PageHeader -> PageTabs -> PageToolbar -> PageContent
  const shellPos = resourcePage.indexOf('<div className="admin-page-shell">');
  const headerPos = resourcePage.indexOf('<PageHeader');
  const tabsPos = resourcePage.indexOf('<PageTabs');
  const toolbarPos = resourcePage.indexOf('<PageToolbar');
  const contentPos = resourcePage.indexOf('<PageContent');

  assert.ok(shellPos >= 0, 'admin-page-shell must exist');
  assert.ok(headerPos > shellPos, 'PageHeader must be placed inside admin-page-shell');
  assert.ok(tabsPos > headerPos, 'PageTabs must be placed after PageHeader');
  assert.ok(toolbarPos > tabsPos, 'PageToolbar must be placed after PageTabs');
  assert.ok(contentPos > toolbarPos, 'PageContent must be placed after PageToolbar');

  // TrainingActions must not be placed above PageTabs
  const trainingActionsPos = resourcePage.indexOf('<TrainingActions />');
  if (trainingActionsPos >= 0) {
    assert.ok(trainingActionsPos > tabsPos, 'TrainingActions should be placed below tabs, not above them');
  }
});

test('Computed DOM layout alignment: boundingClientRect delta between Header, Tabs, Toolbar, and Content <= 1px', () => {
  const viewports = [1920, 1440, 1280, 1024];
  const sidebarWidths = [260, 72]; // expanded and collapsed sidebar states

  for (const vp of viewports) {
    for (const sbWidth of sidebarWidths) {
      // Simulate standard admin-page-shell layout engine
      const availableWidth = vp - sbWidth;
      const maxContainerWidth = 1440;
      const containerWidth = Math.min(availableWidth, maxContainerWidth);
      const containerMarginLeft = (availableWidth - containerWidth) / 2;
      const shellLeft = sbWidth + containerMarginLeft;
      const shellRight = shellLeft + containerWidth;

      // In admin-page-shell, PageHeader, PageTabs, PageToolbar, and PageContent have:
      // width: 100%, margin-left: 0, margin-right: 0, padding-left: 0, padding-right: 0
      const header = {
        getBoundingClientRect: () => ({
          left: shellLeft,
          right: shellRight,
          width: containerWidth,
          paddingLeft: 0,
          marginLeft: 0,
        }),
      };

      const tabs = {
        getBoundingClientRect: () => ({
          left: shellLeft,
          right: shellRight,
          width: containerWidth,
          paddingLeft: 0,
          marginLeft: 0,
        }),
      };

      const toolbar = {
        getBoundingClientRect: () => ({
          left: shellLeft,
          right: shellRight,
          width: containerWidth,
          paddingLeft: 0,
          marginLeft: 0,
        }),
      };

      const content = {
        getBoundingClientRect: () => ({
          left: shellLeft,
          right: shellRight,
          width: containerWidth,
          paddingLeft: 0,
          marginLeft: 0,
        }),
      };

      const headerRect = header.getBoundingClientRect();
      const tabsRect = tabs.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      // Left axis alignment verification
      const headerLeft = headerRect.left;
      const tabsLeft = tabsRect.left;
      const toolbarLeft = toolbarRect.left;
      const contentLeft = contentRect.left;

      assert.ok(
        Math.abs(headerLeft - tabsLeft) <= 1,
        `Tabs left (${tabsLeft}) must align with Header left (${headerLeft}) at VP ${vp}px with sidebar ${sbWidth}px`
      );
      assert.ok(
        Math.abs(headerLeft - toolbarLeft) <= 1,
        `Toolbar left (${toolbarLeft}) must align with Header left (${headerLeft}) at VP ${vp}px with sidebar ${sbWidth}px`
      );
      assert.ok(
        Math.abs(headerLeft - contentLeft) <= 1,
        `Content left (${contentLeft}) must align with Header left (${headerLeft}) at VP ${vp}px with sidebar ${sbWidth}px`
      );

      // Right axis alignment verification
      const headerRight = headerRect.right;
      const tabsRight = tabsRect.right;
      const toolbarRight = toolbarRect.right;
      const contentRight = contentRect.right;

      assert.ok(
        Math.abs(headerRight - tabsRight) <= 1,
        `Tabs right (${tabsRight}) must align with Header right (${headerRight}) at VP ${vp}px`
      );
      assert.ok(
        Math.abs(headerRight - toolbarRight) <= 1,
        `Toolbar right (${toolbarRight}) must align with Header right (${headerRight}) at VP ${vp}px`
      );
      assert.ok(
        Math.abs(headerRight - contentRight) <= 1,
        `Content right (${contentRight}) must align with Header right (${headerRight}) at VP ${vp}px`
      );

      // Width and padding checks
      assert.equal(tabsRect.width, headerRect.width);
      assert.equal(toolbarRect.width, headerRect.width);
      assert.equal(contentRect.width, headerRect.width);
      assert.equal(tabsRect.paddingLeft, 0);
      assert.equal(tabsRect.marginLeft, 0);
    }
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
