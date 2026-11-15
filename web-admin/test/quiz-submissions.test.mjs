import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const viewBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/admin/QuizSubmissionsView.tsx', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  jsx: 'transform',
});
const { getStudentDisplayName, formatScore, formatCorrectCount } = await import(
  'data:text/javascript;base64,' + Buffer.from(viewBundle.outputFiles[0].text).toString('base64')
);

const labelsBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/admin/labels.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { labels, label } = await import(
  'data:text/javascript;base64,' + Buffer.from(labelsBundle.outputFiles[0].text).toString('base64')
);

const navBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/admin/navigation.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { ADMIN_NAVIGATION_GROUPS, getResourceNavigation } = await import(
  'data:text/javascript;base64,' + Buffer.from(navBundle.outputFiles[0].text).toString('base64')
);

test('getStudentDisplayName prioritizes enrollment student_name over user account full_name', () => {
  // Case 1: Proxy registration - student name is different from account name
  const proxyRow = {
    student_name: 'Trần Thị Thu Thảo',
    user_full_name: 'Nguyễn Văn Ba (Chủ tài khoản)',
    course_enrollments: { student_name: 'Trần Thị Thu Thảo' },
  };
  assert.equal(getStudentDisplayName(proxyRow), 'Trần Thị Thu Thảo');

  // Case 2: Only course_enrollments.student_name is present
  const enrollmentOnly = {
    student_name: null,
    course_enrollments: { student_name: 'Lê Văn An' },
  };
  assert.equal(getStudentDisplayName(enrollmentOnly), 'Lê Văn An');

  // Case 3: Enrollment student_name is empty string, fallback to user full_name
  const fallbackRow = {
    student_name: '   ',
    course_enrollments: { student_name: '' },
    user_full_name: 'Hoàng Đức Chính',
  };
  assert.equal(getStudentDisplayName(fallbackRow), 'Hoàng Đức Chính');

  // Case 4: Both missing
  const missingRow = {
    student_name: null,
    user_full_name: null,
    course_enrollments: null,
  };
  assert.equal(getStudentDisplayName(missingRow), 'Chưa có dữ liệu');
});

test('formatScore correctly displays score 0 and preserves missing data as "Chưa có dữ liệu"', () => {
  // Score 0 must display as 0 or 0.00
  assert.equal(formatScore(0), '0.00');
  assert.equal(formatScore('0'), '0.00');
  assert.equal(formatScore('0.00'), '0.00');

  // Non-zero scores
  assert.equal(formatScore(9), '9.00');
  assert.equal(formatScore('8.5'), '8.50');
  assert.equal(formatScore(9.75), '9.75');

  // Missing data MUST NOT be converted to 0
  assert.equal(formatScore(null), 'Chưa có dữ liệu');
  assert.equal(formatScore(undefined), 'Chưa có dữ liệu');
  assert.equal(formatScore(''), 'Chưa có dữ liệu');
});

test('formatCorrectCount formats x/y when total is reliable, or x when total is missing', () => {
  // Reliable total
  assert.equal(formatCorrectCount(9, 10), '9/10 câu');
  assert.equal(formatCorrectCount(0, 5), '0/5 câu');
  assert.equal(formatCorrectCount('5', '5'), '5/5 câu');

  // Missing or invalid total questions
  assert.equal(formatCorrectCount(8, null), '8 câu');
  assert.equal(formatCorrectCount(8, 0), '8 câu');
  assert.equal(formatCorrectCount(8, undefined), '8 câu');

  // Missing correct count
  assert.equal(formatCorrectCount(null, 5), 'Chưa có dữ liệu');
  assert.equal(formatCorrectCount(undefined, 5), 'Chưa có dữ liệu');
});

test('labels has Vietnamese translation for score', () => {
  assert.ok(labels.score, 'score label must be defined');
  assert.ok(labels.score.includes('Điểm'), 'score label must be translated in Vietnamese');
  assert.ok(labels.correct_count, 'correct_count label must be defined');
  assert.ok(labels.passed, 'passed label must be defined');
  assert.equal(label('score', 'quiz_submissions'), 'Điểm bài thi');
});

test('curriculum tabs preserve strict canonical 6-tab order ending in progress', () => {
  const all = ADMIN_NAVIGATION_GROUPS.flatMap(group => group.tables).map(name => ({
    name,
    title: name,
    group: 'Chương trình đào tạo',
    actions: [],
  }));
  const tabs = getResourceNavigation('quiz_submissions', all, 'SUPER_ADMIN');
  const ids = tabs.map(t => t.id);
  assert.deepEqual(ids, [
    'courses',
    'course_chapters',
    'course_quizzes',
    'quiz_questions',
    'quiz_submissions',
    'user_lesson_progress',
  ]);
  const currentTab = tabs.find(t => t.id === 'quiz_submissions');
  assert.equal(currentTab.label, 'Bài đã nộp');
});
