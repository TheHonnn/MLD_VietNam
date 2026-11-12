import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
const resources = readFileSync(new URL('../src/admin/defaultResources.ts', import.meta.url), 'utf8');

test('pricing catalog has one canonical sidebar entry', () => {
  const sidebarCatalogLinks = sidebar.match(/path:\s*['"]\/services-catalog(?:\?[^'"]*)?['"]/g) ?? [];

  assert.equal(sidebarCatalogLinks.length, 2, 'expected one parent route and one child route for the same menu group');
  assert.doesNotMatch(sidebar, /Bảng giá niêm yết MLD/);
  assert.equal((sidebar.match(/name:\s*['"]Bảng giá & Gói liệu trình['"]/g) ?? []).length, 1);
  assert.doesNotMatch(sidebar, /\/services-catalog\?tab=packages/);
});

test('package definitions belong to service catalog while purchased packages remain in treatment operations', () => {
  assert.match(
    resources,
    /name:\s*['"]treatment_packages['"][^\n]+group:\s*['"]Dịch vụ & Định mức['"]/
  );
  assert.match(
    resources,
    /name:\s*['"]user_packages['"][^\n]+group:\s*['"]Quản lý Liệu trình['"]/
  );
});
