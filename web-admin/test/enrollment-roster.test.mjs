import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle = await build({entryPoints:[fileURLToPath(new URL('../src/admin/enrollment-roster.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const { enrollmentSummary } = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('assigned classes never imply tuition has been paid', () => {
  const result = enrollmentSummary({batch_id:'class-1', status:'STUDYING', tuition_total:'35000000', amount_paid:'2000000'});
  assert.equal(result.remaining,33000000);
  assert.equal(result.label,'Đang học');
});
test('missing financial data remains unknown rather than a zero balance', () => {
  assert.equal(enrollmentSummary({tuition_total:35000000}).remaining,null);
  assert.equal(enrollmentSummary({amount_paid:0}).total,null);
  assert.equal(enrollmentSummary({tuition_total:'invalid',amount_paid:-1}).paid,null);
});
test('admission approval enables class assignment without pretending full payment', () => {
  const result=enrollmentSummary({student_status:'APPROVED',tuition_total:100,amount_paid:20});
  assert.equal(result.action,'Xếp lớp');
  assert.equal(result.remaining,80);
  assert.equal(enrollmentSummary({status:'CONSULTING'}).action,'Xử lý tuyển sinh');
});
test('suspension and completion take precedence over an existing class', () => {
  assert.equal(enrollmentSummary({batch_id:'class-1',status:'STUDYING',access_status:'SUSPENDED'}).label,'Đang bảo lưu');
  assert.equal(enrollmentSummary({status:'GRADUATED',batch_id:'class-1'}).action,'Xem hồ sơ');
  assert.equal(enrollmentSummary({status:'DROPPED'}).label,'Đã dừng học');
});
