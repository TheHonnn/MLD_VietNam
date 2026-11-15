import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('App.tsx registers /help, /support and /tro-giup routes to W21_HelpSupport workspace', () => {
  const appPath = new URL('../src/App.tsx', import.meta.url);
  assert.ok(existsSync(appPath), 'App.tsx must exist');

  const content = readFileSync(appPath, 'utf8');

  // Verify W21_HelpSupport lazy import
  assert.match(content, /const W21_HelpSupport = lazy\(\(\) => import\('\.\/pages\/W21_HelpSupport'\)/);

  // Verify routes registration
  assert.match(content, /<Route path="help" element=\{<W21_HelpSupport \/>\} \/>/);
  assert.match(content, /<Route path="support" element=\{<Navigate to="\/help" replace \/>\} \/>/);
  assert.match(content, /<Route path="tro-giup" element=\{<Navigate to="\/help" replace \/>\} \/>/);
});

test('Sidebar.tsx footer activates official NavLink to /help instead of temporary toast', () => {
  const sidebarPath = new URL('../src/components/layout/Sidebar.tsx', import.meta.url);
  assert.ok(existsSync(sidebarPath), 'Sidebar.tsx must exist');

  const content = readFileSync(sidebarPath, 'utf8');

  // Must have NavLink to /help
  assert.match(content, /<NavLink\s+to="\/help"/);
  assert.match(content, /<span>Cần hỗ trợ\?<\/span>/);

  // Must not have dummy toast for Help button
  assert.doesNotMatch(content, /toast\.info\(\s*'Trung tâm hỗ trợ MLD'/);
});

test('W21_HelpSupport.tsx implements all 4 primary tabs and live support features', () => {
  const helpPath = new URL('../src/pages/W21_HelpSupport.tsx', import.meta.url);
  assert.ok(existsSync(helpPath), 'W21_HelpSupport.tsx must exist');

  const content = readFileSync(helpPath, 'utf8');

  // 4 Tabs: contacts, guides, tickets, diagnostics
  assert.match(content, /id:\s*'contacts'/);
  assert.match(content, /id:\s*'guides'/);
  assert.match(content, /id:\s*'tickets'/);
  assert.match(content, /id:\s*'diagnostics'/);

  // Contacts: Hotline and remote
  assert.match(content, /1900 8888/);
  assert.match(content, /UltraViewer/);
  assert.match(content, /support@mldvietnam\.vn/);

  // Diagnostics: live latency and status
  assert.match(content, /Cơ sở Dữ liệu/);
  assert.match(content, /Máy chủ Backend/);
});
