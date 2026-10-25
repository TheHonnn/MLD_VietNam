import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {certificateVerification} from '../dist/certificates.js';

test('signed certificate lookup is public but never exposes private student records',async t=>{
  const f=await workflowFixture(),{db,id}=f;
  let path,token;
  const lookup=()=>f.request('/certificate-verification/'+token,{anonymous:true});
  try{
    await db.query("UPDATE users SET date_of_birth='1998-05-15',email='private-student@example.test' WHERE id=$1",[id(1)]);
    for(const [number,status,date] of [[100,'ISSUED','2026-10-24'],[101,'DRAFT','2026-10-24'],[102,'REVOKED','2026-10-24'],[103,'ISSUED','2099-01-01']])await db.query("INSERT INTO student_certificates(id,enrollment_id,student_id,course_id,certificate_code,qr_verification_code,student_name,course_title,issue_date,theory_score,practical_score,status,certificate_pdf_url,revocation_reason) VALUES($1,$2,$3,$4,$5,$6,$7,'Actual course',$8::date,8,9,$9::certificate_status,'https://example.test/private.pdf','Private operator reason')",[id(number),id(29),id(1),id(22),'ISSUED-'+number,'PRIVATE-QR-'+number,'Actual <script>alert(1)</script> student',date,status]);
    await t.test('only an authenticated owner receives a verification link; raw codes are not usable links',async()=>{
      const result=await f.request('/certificates/'+id(100));
      assert.equal(result.status,200);path=result.data.certificate.verificationPath;token=path.split('/').at(-1);
      assert.match(path,/^\/verify\/certificates\/[0-9a-f-]+\.[A-Za-z0-9_-]{43}$/);
      assert.equal(path.includes('PRIVATE-QR'),false);
      assert.equal((await f.request('/certificates/'+id(100),{owner:2})).status,404);
      assert.equal((await f.request('/certificates/'+id(100),{anonymous:true})).status,401);
      assert.equal((await f.request('/certificates/'+id(102))).data.certificate.verificationPath,null);
      assert.equal((await f.request('/certificate-verification/PRIVATE-QR-100',{anonymous:true})).status,404);
    });
    await t.test('anonymous lookup returns only issued verification fields, not DOB, phone, marks, PDF or internal IDs',async()=>{
      const result=await lookup();assert.equal(result.status,200,JSON.stringify(result));
      assert.deepEqual(Object.keys(result.data.certificate).sort(),['certificateCode','courseTitle','issueDate','status','studentName']);
      assert.equal(result.data.certificate.certificateCode,'ISSUED-100');
      const body=JSON.stringify(result.data);
      for(const value of ['1998-05-15','0900000001','private-student@example.test','private.pdf','PRIVATE-QR','Private operator reason'])assert.equal(body.includes(value),false);
    });
    await t.test('the scanned page is escaped, mobile-sized, non-indexable and has no external assets or private media',async()=>{
      const response=await fetch(f.base+path);assert.equal(response.status,200);
      assert.match(response.headers.get('content-type'),/text\/html/);
      assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
      assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
      const html=await response.text();assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);assert.equal(html.includes('private.pdf'),false);
      assert.ok(html.includes('viewport-fit=cover'));
    });
    await t.test('tampering, a different record, draft issuance and a future issue date cannot be verified',async()=>{
      for(const invalid of [token.slice(0,-1)+(token.endsWith('A')?'B':'A'),id(101)+'.'+token.split('.')[1],id(999)+'.'+token.split('.')[1],'ISSUED-100'])assert.equal((await f.request('/certificate-verification/'+invalid,{anonymous:true})).status,404);
      assert.equal((await f.request('/certificates/'+id(103))).data.certificate.verificationPath,null);
      const future=certificateVerification({id:id(103),status:'ISSUED',issue_date:'2026-10-24',qr_verification_code:'PRIVATE-QR-103'},'isolated-workflow-audit-secret').verification_path.split('/').at(-1);
      assert.equal((await f.request('/certificate-verification/'+future,{anonymous:true})).status,404);
      const missing=await fetch(f.base+'/verify/certificates/bad');assert.equal(missing.status,404);assert.equal((await missing.text()).includes('Actual course'),false);
    });
    await t.test('an old QR reflects revocation immediately and code rotation invalidates old links without changing history',async()=>{
      await db.query("UPDATE student_certificates SET status='REVOKED' WHERE id=$1",[id(100)]);
      assert.equal((await lookup()).data.certificate.status,'REVOKED');
      await db.query("UPDATE student_certificates SET status='DRAFT' WHERE id=$1",[id(100)]);assert.equal((await lookup()).status,404);
      await db.query("UPDATE student_certificates SET status='ISSUED',qr_verification_code='ROTATED-PRIVATE-QR' WHERE id=$1",[id(100)]);assert.equal((await lookup()).status,404);
      const fresh=(await f.request('/certificates/'+id(100))).data.certificate.verificationPath;
      assert.notEqual(fresh,path);
      await db.query("UPDATE course_enrollments SET status='DROPPED' WHERE id=$1",[id(29)]);await db.query('UPDATE courses SET is_active=false WHERE id=$1',[id(22)]);
      assert.equal((await f.request('/certificate-verification/'+fresh.split('/').at(-1),{anonymous:true})).status,200);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM student_certificates')).rows[0].n,4);
    });
    await t.test('public verification is rate limited rather than providing an enumerable certificate directory',async()=>{
      let response;for(let i=0;i<21;i++)response=await fetch(f.base+'/api/certificate-verification/invalid');
      assert.equal(response.status,429);assert.ok(Number(response.headers.get('retry-after'))>0);
    });
  }finally{await f.close();}
});
