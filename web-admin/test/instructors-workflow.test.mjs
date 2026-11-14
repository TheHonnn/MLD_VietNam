import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('legacy instructor resource URL uses the operational instructor workspace', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const dedicated = app.indexOf('path="manage/instructors"');
  const generic = app.indexOf('path="manage/:table"');
  assert.ok(dedicated >= 0 && dedicated < generic);
  assert.match(app.slice(dedicated, generic), /<W09_Instructors \/>/);
});

test('instructor workspace supports profile lifecycle and class assignment', () => {
  const page = readFileSync(new URL('../src/pages/W09_Instructors.tsx', import.meta.url), 'utf8');
  assert.match(page, /Thêm giảng viên/);
  assert.match(page, /Sửa hồ sơ giảng viên/);
  assert.match(page, /Phân công lớp/);
  assert.match(page, /'instructors\/update' : 'instructors\/create'/);
  assert.match(page, /expectedInstructorId: target.instructor_id/);
  assert.match(page, /loadRows\('batch_schedules', controller.signal, week\)/);
  assert.doesNotMatch(page, /Hủy lịch dạy/);
});
