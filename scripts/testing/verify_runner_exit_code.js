/**
 * Regression test for scripts/testing/run_all_tests.js
 * Verifies that:
 * 1. Runner exits with 0 when all sub-scripts succeed.
 * 2. Runner exits with 1 when at least one sub-script fails.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const tempDir = path.join(__dirname, '__temp_runner_test__');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const dummyPassScript = path.join(tempDir, 'dummy_pass.js');
const dummyFailScript = path.join(tempDir, 'dummy_fail.js');

fs.writeFileSync(dummyPassScript, 'console.log("PASS OK"); process.exit(0);');
fs.writeFileSync(dummyFailScript, 'console.error("FAIL ERROR"); process.exit(1);');

const runnerPath = path.join(__dirname, 'run_all_tests.js');

try {
  console.log('--- Test Case 1: All sub-scripts pass -> Runner must exit 0 ---');
  const passOverride = JSON.stringify([
    { name: 'Mock Step 1 (Pass)', file: path.relative(__dirname, dummyPassScript) },
    { name: 'Mock Step 2 (Pass)', file: path.relative(__dirname, dummyPassScript) },
  ]);

  const resPass = spawnSync(process.execPath, [runnerPath], {
    env: { ...process.env, TEST_SCRIPTS_OVERRIDE: passOverride },
    encoding: 'utf-8',
  });

  console.log(`Exit code: ${resPass.status}`);
  assert.strictEqual(resPass.status, 0, `Expected runner to exit with 0, but got ${resPass.status}`);
  assert(resPass.stdout.includes('TOÀN BỘ 15 GIAI ĐOẠN KIỂM THỬ TRÊN NHÁNH DEVELOP ĐỀU ĐẠT CHUẨN 100%') || resPass.stdout.includes('ĐỀU ĐẠT CHUẨN'), 'Should log success message');
  console.log('✅ Test Case 1 Passed!\n');

  console.log('--- Test Case 2: One sub-script fails -> Runner must exit 1 (No false-green) ---');
  const failOverride = JSON.stringify([
    { name: 'Mock Step 1 (Pass)', file: path.relative(__dirname, dummyPassScript) },
    { name: 'Mock Step 2 (Fail)', file: path.relative(__dirname, dummyFailScript) },
  ]);

  const resFail = spawnSync(process.execPath, [runnerPath], {
    env: { ...process.env, TEST_SCRIPTS_OVERRIDE: failOverride },
    encoding: 'utf-8',
  });

  console.log(`Exit code: ${resFail.status}`);
  assert.strictEqual(resFail.status, 1, `Expected runner to exit with 1 on failure, but got ${resFail.status}`);
  assert(resFail.stderr.includes('CÓ GIAI ĐOẠN CHƯA ĐẠT CHUẨN') || resFail.stdout.includes('CÓ GIAI ĐOẠN CHƯA ĐẠT CHUẨN'), 'Should log failure message');
  console.log('✅ Test Case 2 Passed!\n');

  console.log('🎉 REGRESSION TEST FOR RUNNER EXIT CODE: ALL CHECKS PASSED 100%!');
} finally {
  // Clean up temp files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}
