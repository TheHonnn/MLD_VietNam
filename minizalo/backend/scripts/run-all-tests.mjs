import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, '../test');

const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.mjs'))
  .sort();

console.log(`================================================================================`);
console.log(`  MINIZALO BACKEND SEQUENTIAL TEST RUNNER (Node 24 Windows Safe Mode)`);
console.log(`  Found ${files.length} test files to execute.`);
console.log(`================================================================================\n`);

let totalPassedFiles = 0;
let totalFailedFiles = 0;
let totalTestsPassed = 0;
let totalTestsFailed = 0;
const failures = [];

const startTime = Date.now();

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = path.join(testDir, file);
  process.stdout.write(`[${i + 1}/${files.length}] Running ${file}... `);

  const res = spawnSync(process.execPath, ['--import', 'tsx', '--test', filePath], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
  });

  const output = (res.stdout || '') + (res.stderr || '');
  
  // Extract test counts from node --test summary
  // Example: ℹ pass 7, ℹ fail 0
  const passMatch = output.match(/ℹ pass (\d+)/);
  const failMatch = output.match(/ℹ fail (\d+)/);
  const passedCount = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failedCount = failMatch ? parseInt(failMatch[1], 10) : 0;

  totalTestsPassed += passedCount;
  totalTestsFailed += failedCount;

  if (res.status === 0 && failedCount === 0) {
    totalPassedFiles++;
    console.log(`PASS (${passedCount} tests)`);
  } else {
    totalFailedFiles++;
    console.log(`FAIL (${failedCount} failed, ${passedCount} passed)`);
    failures.push({ file, output });
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n================================================================================`);
console.log(`  MINIZALO BACKEND TEST RESULTS SUMMARY`);
console.log(`================================================================================`);
console.log(`Total Files:   ${files.length} (${totalPassedFiles} passed, ${totalFailedFiles} failed)`);
console.log(`Total Tests:   ${totalTestsPassed + totalTestsFailed} (${totalTestsPassed} passed, ${totalTestsFailed} failed)`);
console.log(`Duration:      ${elapsedSec}s\n`);

if (failures.length > 0) {
  console.log(`Failed files:`);
  for (const f of failures) {
    console.log(`- ${f.file}`);
    console.log(f.output.slice(-500));
  }
  process.exit(1);
} else {
  console.log(`🎉 ALL ${files.length} TEST FILES AND ALL ${totalTestsPassed} ASSERTIONS PASSED!`);
  process.exit(0);
}
