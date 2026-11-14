import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('App.tsx registers /settings and /cai-dat routes to W20_Settings workspace', () => {
  const appPath = new URL('../src/App.tsx', import.meta.url);
  assert.ok(existsSync(appPath), 'App.tsx must exist');

  const content = readFileSync(appPath, 'utf8');

  // Verify W20_Settings lazy import
  assert.match(content, /const W20_Settings = lazy\(\(\) => import\('\.\/pages\/W20_Settings'\)/);

  // Verify routes registration
  assert.match(content, /<Route path="settings" element=\{<W20_Settings \/>\} \/>/);
  assert.match(content, /<Route path="cai-dat" element=\{<Navigate to="\/settings" replace \/>\} \/>/);
  assert.match(content, /<Route path="manage\/system_settings" element=\{<Navigate to="\/settings" replace \/>\} \/>/);
});

test('Sidebar.tsx footer activates official NavLink to /settings instead of dummy toast', () => {
  const sidebarPath = new URL('../src/components/layout/Sidebar.tsx', import.meta.url);
  assert.ok(existsSync(sidebarPath), 'Sidebar.tsx must exist');

  const content = readFileSync(sidebarPath, 'utf8');

  // Must have NavLink to /settings
  assert.match(content, /<NavLink\s+to="\/settings"/);
  assert.match(content, /<span>Cài đặt<\/span>/);

  // Must not have dummy toast for Settings button
  assert.doesNotMatch(content, /onClick=\{[^{}]*toast\.info\([^{}]*Cấu hình quản trị/);
});
