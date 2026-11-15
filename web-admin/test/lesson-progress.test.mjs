import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const viewBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/admin/LessonProgressView.tsx', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  jsx: 'transform',
});
const { getStudentDisplayName, formatDuration, calculateProgress, formatProgressDate } = await import(
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
const { labels } = await import(
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
const { ADMIN_NAVIGATION_GROUPS } = await import(
  'data:text/javascript;base64,' + Buffer.from(navBundle.outputFiles[0].text).toString('base64')
);

test('getStudentDisplayName prioritizes enrollment student_name over user full_name', () => {
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

test('formatDuration formats seconds to human-readable Vietnamese time strings', () => {
  assert.equal(formatDuration(0), '0 giây');
  assert.equal(formatDuration('0'), '0 giây');
  assert.equal(formatDuration(45), '45 giây');
  assert.equal(formatDuration(60), '1 phút');
  assert.equal(formatDuration(120), '2 phút');
  assert.equal(formatDuration(750), '12 phút 30 giây');
  assert.equal(formatDuration('750'), '12 phút 30 giây');
  assert.equal(formatDuration(3605), '60 phút 5 giây');

  // Missing or invalid data
  assert.equal(formatDuration(null), 'Chưa có dữ liệu');
  assert.equal(formatDuration(undefined), 'Chưa có dữ liệu');
  assert.equal(formatDuration(NaN), 'Chưa có dữ liệu');
});

test('calculateProgress computes % correctly, caps at 100%, and detects anomalies', () => {
  // Case 1: Normal progress (12m30s = 750s / 20m = 1200s -> 62.5% -> 63%)
  const normal = calculateProgress(750, 20);
  assert.equal(normal.percent, 63);
  assert.equal(normal.percentLabel, '63%');
  assert.equal(normal.isAnomaly, false);

  // Case 2: 100% complete
  const complete = calculateProgress(1200, 20);
  assert.equal(complete.percent, 100);
  assert.equal(complete.percentLabel, '100%');
  assert.equal(complete.isAnomaly, false);

  // Case 3: Anomaly: watched_seconds > duration (e.g. 1500s > 1200s)
  // Display is capped at 100%, anomaly flag is true, raw % is preserved for details
  const anomaly = calculateProgress(1500, 20);
  assert.equal(anomaly.percent, 100);
  assert.equal(anomaly.percentLabel, '100%');
  assert.equal(anomaly.isAnomaly, true);
  assert.equal(anomaly.rawPercent, 125);

  // Case 4: Missing duration -> "Chưa có thời lượng", NOT 0%
  const missingDuration = calculateProgress(750, null);
  assert.equal(missingDuration.percent, null);
  assert.equal(missingDuration.percentLabel, 'Chưa có thời lượng');
  assert.equal(missingDuration.isAnomaly, false);

  const zeroDuration = calculateProgress(750, 0);
  assert.equal(zeroDuration.percent, null);
  assert.equal(zeroDuration.percentLabel, 'Chưa có thời lượng');
  assert.equal(zeroDuration.isAnomaly, false);
});

test('labels.ts has correct Vietnamese label for watched_seconds without calling it total learning time', () => {
  assert.equal(labels.watched_seconds, 'Vị trí video đã ghi nhận');
  assert.notEqual(labels.watched_seconds, 'Tổng thời gian học');
});

test('Navigation preserves the exact 6-tab order for training program', () => {
  const trainingGroup = ADMIN_NAVIGATION_GROUPS.find(g => g.label === 'Chương trình đào tạo');
  assert.ok(trainingGroup, 'Chương trình đào tạo group must exist');

  const tabNames = trainingGroup.items.map(item => item.label);
  const expectedOrder = [
    'Khóa đào tạo',
    'Nội dung chương/bài',
    'Đề thi',
    'Câu hỏi',
    'Bài đã nộp',
    'Tiến độ',
  ];
  assert.deepEqual(tabNames, expectedOrder);

  const tabKeys = trainingGroup.items.map(item => item.id);
  assert.deepEqual(tabKeys, [
    'courses',
    'course_chapters',
    'course_quizzes',
    'quiz_questions',
    'quiz_submissions',
    'user_lesson_progress',
  ]);
});
