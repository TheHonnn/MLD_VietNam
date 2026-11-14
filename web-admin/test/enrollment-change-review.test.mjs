import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/admin/enrollment-change-review.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const { enrollmentReviewPayload, canReviewEnrollmentChange }=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('only reviewers can submit a pending request',()=>{
  for(const role of ['ADMIN','SUPER_ADMIN','BRANCH_MANAGER']) assert.equal(canReviewEnrollmentChange(role,'PENDING'),true);
  for(const role of [undefined,'CUSTOMER','INSTRUCTOR','RECEPTIONIST']) assert.throws(()=>enrollmentReviewPayload(role,'PENDING',true,'Đồng ý yêu cầu'));
});
test('processed requests cannot be approved or rejected again',()=>{
  for(const status of ['APPROVED','REJECTED','CANCELLED']) assert.throws(()=>enrollmentReviewPayload('ADMIN',status,false,'Đủ lý do từ chối'));
});
test('decisions preserve false and require a useful review note',()=>{
  assert.throws(()=>enrollmentReviewPayload('ADMIN','PENDING',true,'  '));
  assert.deepEqual(enrollmentReviewPayload('ADMIN','PENDING',false,'  Chưa đủ điều kiện  '),{approve:false,reviewNote:'Chưa đủ điều kiện'});
});
