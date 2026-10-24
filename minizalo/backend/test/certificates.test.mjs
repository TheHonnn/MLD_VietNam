import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('certificate records remain owner-private and available independently of lesson access',async t=>{
  const f=await workflowFixture(),{db,id}=f;
  const read=(path='/certificates',owner=1)=>f.request(path,{owner});
  try{
    await db.query("UPDATE users SET date_of_birth='1998-05-15' WHERE id=$1",[id(1)]);
    await db.query("INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES($1,$2,$3,$4,'STUDYING')",[id(102),id(2),id(22),id(30)]);
    for(const [number,owner,enrollment,status] of [[100,1,29,'ISSUED'],[101,1,29,'DRAFT'],[103,1,29,'REVOKED'],[104,1,102,'ISSUED'],[105,2,102,'ISSUED']]){
      await db.query("INSERT INTO student_certificates(id,enrollment_id,student_id,course_id,certificate_code,qr_verification_code,student_name,course_title,issue_date,theory_score,practical_score,status,certificate_pdf_url,revocation_reason) VALUES($1,$2,$3,$4,$5,$6,'Actual fixture student','Actual fixture course','2026-10-24',8,9,$7::certificate_status,'https://example.test/issued.pdf',$8)",[id(number),id(enrollment),id(owner),id(22),'CERT-'+number,'VERIFY-'+number,status,status==='REVOKED'?'Actual fixture revocation':null]);
    }
    await t.test('anonymous requests, another owner, drafts and inconsistent enrollment ownership cannot leak records',async()=>{
      assert.equal((await f.request('/certificates',{anonymous:true})).status,401);
      assert.equal((await f.request('/certificates/'+id(100),{anonymous:true})).status,401);
      for(const number of [101,104,105,999])assert.equal((await read('/certificates/'+id(number))).status,404);
      assert.equal((await read('/certificates/'+id(100),2)).status,404);
      assert.deepEqual((await read('/certificates',2)).data.certificates.map(record=>record.id),[id(105)]);
    });
    await t.test('issued metadata is real, whitelisted and retains profile DOB plus issue date',async()=>{
      const result=await read('/certificates/'+id(100));
      assert.equal(result.status,200);assert.equal(result.data.certificate.studentDateOfBirth,'1998-05-15');
      assert.equal(result.data.certificate.issueDate,'2026-10-24');assert.equal(result.data.certificate.certificateCode,'CERT-100');
      assert.equal(result.data.certificate.qrVerificationCode,'VERIFY-100');assert.equal(result.data.certificate.certificatePdfUrl,'https://example.test/issued.pdf');
      for(const field of ['studentId','templateId','theoryScore','practicalScore','videoUrl','attachments'])assert.equal(Object.hasOwn(result.data.certificate,field),false);
    });
    await t.test('expiry, suspension, dropped enrollment and retired courses do not erase a previously issued record',async()=>{
      await db.query("INSERT INTO miniapp_course_access(enrollment_id,expires_at,is_suspended,reason) VALUES($1,'2020-01-01',true,'Actual fixture expiry')",[id(29)]);
      assert.equal((await read('/courses/'+id(22)+'/learning?enrollmentId='+id(29))).status,403);
      await db.query("UPDATE course_enrollments SET status='DROPPED' WHERE id=$1",[id(29)]);
      await db.query('UPDATE courses SET is_active=false WHERE id=$1',[id(22)]);
      assert.equal((await read('/certificates/'+id(100))).status,200);
      assert.equal((await read()).data.certificates.length,2);
    });
    await t.test('revoked records preserve the reason but never expose a valid PDF or QR',async()=>{
      const result=(await read('/certificates/'+id(103))).data.certificate;
      assert.equal(result.status,'REVOKED');assert.equal(result.revocationReason,'Actual fixture revocation');
      assert.equal(result.certificatePdfUrl,null);assert.equal(result.qrVerificationCode,null);
      await db.query("UPDATE student_certificates SET status='REVOKED' WHERE id=$1",[id(100)]);
      assert.equal((await read('/certificates/'+id(100))).data.certificate.certificatePdfUrl,null);
    });
    await t.test('stable pagination has no duplicates or omitted issued/revoked records',async()=>{
      let cursor=null;const ids=[];
      do{
        const response=await read('/certificates?'+new URLSearchParams({limit:'1',...(cursor?{cursor}:{})}));
        assert.equal(response.status,200);ids.push(...response.data.certificates.map(record=>record.id));cursor=response.data.nextCursor;
      }while(cursor);
      assert.equal(ids.length,2);assert.equal(new Set(ids).size,2);
      assert.deepEqual(ids.sort(),[id(100),id(103)]);
      assert.equal((await read('/certificates?cursor=bad')).status,400);
    });
  }finally{await f.close();}
});
