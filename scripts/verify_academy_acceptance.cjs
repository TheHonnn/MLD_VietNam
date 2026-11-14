// Production-safe acceptance probe: fixture writes are ALWAYS rolled back.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('../backend/node_modules/pg');
async function main() {
  const url = new URL(process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL || '');
  if (!url.hostname.endsWith('.pooler.supabase.com')) throw Error('Expected authorized Supabase pooler');
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  const client = new Client({ connectionString:url.toString(),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000 });
  const one = async (sql, params=[]) => (await client.query(sql,params)).rows[0];
  let started=false;
  try {
    await client.connect();
    const before=await one('SELECT count(*)::int n FROM course_enrollments');
    const actor=await one("SELECT id FROM users WHERE is_active AND role::text='SUPER_ADMIN' ORDER BY created_at LIMIT 1");
    if(!actor)throw Error('No existing active SUPER_ADMIN for acceptance');
    await client.query('BEGIN');started=true;
    await client.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
    const reject=async(operation,pattern)=>{
      await client.query('SAVEPOINT expected_failure');
      try {await assert.rejects(operation,pattern);} finally {await client.query('ROLLBACK TO SAVEPOINT expected_failure');}
    };
    const suffix=randomUUID().slice(0,8);
    const branches=(await client.query('SELECT id FROM branches ORDER BY created_at LIMIT 2')).rows;
    if(!branches.length)throw Error('No branch');
    if(branches.length===1)branches.push(await one("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('Rollback acceptance branch',$1,'0','Acceptance','Acceptance',0,0,'https://example.invalid') RETURNING id",['UAT'+suffix]));
    const course=await one('SELECT id FROM courses ORDER BY created_at LIMIT 1');if(!course)throw Error('No course');
    const student=await one("INSERT INTO users(phone,full_name,role,referral_code) VALUES($1,'Rollback acceptance only','STUDENT',$2) RETURNING id",['UAT'+suffix,'UAT'+suffix]);
    const enrollment=await one("INSERT INTO course_enrollments(student_id,course_id,consultation_status,student_status,approval_status,tuition_total,required_deposit,amount_paid) VALUES($1,$2,'CONFIRMED','APPROVED','APPROVED',1000000,200000,200000) RETURNING id",[student.id,course.id]);
    const createBatch=async(branch,code,time)=>{
      const b=await one("INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text) VALUES($1,$2,$3,CURRENT_DATE,CURRENT_DATE+30,'Rollback fixture') RETURNING id",[course.id,branch,'UAT'+suffix+code]);
      await client.query("INSERT INTO batch_schedules(batch_id,session_date,start_time,end_time,topic) VALUES($1,CURRENT_DATE+1,$2,($2::time+INTERVAL '1 hour')::time,'Rollback session')",[b.id,time]);return b.id;
    };
    const a=await createBatch(branches[0].id,'A','09:00');const b=await createBatch(branches[1].id,'B','11:00');
    await client.query('SELECT fn_assign_enrollment_batch($1,$2,$3,$4)',[enrollment.id,a,actor.id,null]);
    const expiry=(await one('SELECT valid_until FROM course_enrollments WHERE id=$1',[enrollment.id])).valid_until;
    await client.query("INSERT INTO student_attendance(schedule_id,enrollment_id,status) SELECT id,$1,'PRESENT' FROM batch_schedules WHERE batch_id=$2",[enrollment.id,a]);
    await reject(()=>client.query('SELECT fn_assign_enrollment_batch($1,$2,$3,$4)',[enrollment.id,b,actor.id,null]),/lý do/);
    await client.query('SELECT fn_assign_enrollment_batch($1,$2,$3,$4)',[enrollment.id,b,actor.id,'Rollback cross-branch acceptance']);
    assert.deepEqual((await one('SELECT valid_until FROM course_enrollments WHERE id=$1',[enrollment.id])).valid_until,expiry);
    assert.equal(Number((await one('SELECT count(*) n FROM student_attendance WHERE enrollment_id=$1',[enrollment.id])).n),1);
    const request=async(type)=>(await one("INSERT INTO enrollment_change_requests(enrollment_id,request_type,reason,requested_by) VALUES($1,$2,'Rollback acceptance',$3) RETURNING id",[enrollment.id,type,actor.id])).id;
    const hold=await request('HOLD');await client.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Rollback hold')",[hold,actor.id]);
    assert.equal((await one('SELECT access_status FROM course_enrollments WHERE id=$1',[enrollment.id])).access_status,'SUSPENDED');
    const resume=await request('RESUME');await client.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Rollback resume')",[resume,actor.id]);
    assert.equal((await one('SELECT access_status FROM course_enrollments WHERE id=$1',[enrollment.id])).access_status,'ACTIVE');
    const refund=await request('REFUND');await client.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Approval only; no money movement')",[refund,actor.id]);
    assert.equal(Number((await one('SELECT amount_paid FROM course_enrollments WHERE id=$1',[enrollment.id])).amount_paid),200000);
    assert.equal(Number((await one('SELECT count(*) n FROM tuition_transactions WHERE enrollment_id=$1',[enrollment.id])).n),0);
    await client.query('ROLLBACK');started=false;
    assert.equal((await one('SELECT count(*)::int n FROM course_enrollments')).n,before.n);
    assert.equal(Number((await one('SELECT count(*) n FROM users WHERE id=$1',[student.id])).n),0);
    console.log('PASS: production SQL cross-branch transfer, reason, expiry, attendance, HOLD, RESUME, refund authorization; all fixture writes rolled back. Existing admin actor; no browser/JWT submission and no actual refund executed.');
  } finally {
    if(started)await client.query('ROLLBACK').catch(()=>{});
    await client.end();
  }
}
main().catch(error=>{console.error(error.code||'ACCEPTANCE_ERROR',error.message);process.exitCode=1;});
