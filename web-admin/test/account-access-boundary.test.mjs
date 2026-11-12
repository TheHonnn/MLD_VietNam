import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('customer CRM and login account administration are separate modules', async () => {
  const [resources, sidebar, page, backendResources] = await Promise.all([
    read('../src/admin/defaultResources.ts'),
    read('../src/components/layout/Sidebar.tsx'),
    read('../src/admin/ResourcePage.tsx'),
    read('../../backend/src/modules/admin/admin.resources.ts'),
  ]);

  assert.match(resources, /name: 'users', title: 'Tài khoản & Quyền truy cập', group: 'Phân quyền & Bảo mật'/);
  assert.doesNotMatch(resources, /name: 'users', title: 'Hồ sơ khách hàng'/);
  assert.match(sidebar, /Tài khoản & Quyền truy cập', path: '\/manage\/users'/);
  assert.match(backendResources, /users:\s*\{[\s\S]*?title: 'Tài khoản & Quyền truy cập',[\s\S]*?group: 'Phân quyền'/);
  assert.match(page, /Danh tính đăng nhập, không phải hồ sơ CRM/);
  assert.match(page, /table === "users"[\s\S]*?"full_name",[\s\S]*?"role",[\s\S]*?"is_active"/);
});

test('account list excludes CRM loyalty and spending columns', async () => {
  const page = await read('../src/admin/ResourcePage.tsx');
  const usersColumns = page.match(/users:\s*\[([\s\S]*?)\],\s*consultation_surveys:/)?.[1] || '';

  assert.ok(usersColumns, 'users column configuration must exist');
  assert.doesNotMatch(usersColumns, /membership_tier|reward_points|total_spent/);
  assert.match(page, /table === "users"\s*\? "Thêm tài khoản"/);
});
