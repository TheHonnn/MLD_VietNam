import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');

describe('academy scheduling, cross-branch changes and holds', () => {
  let pg: PGlite;
  let admin: string, student: string, manager: string, branch: string, otherBranch: string, course: string, enrollment: string;
  const one = async (sql: string, params: unknown[] = []) => (await pg.query<any>(sql,params)).rows[0];
  const batch = async (code: string, branchId=branch, start='09:00', end='10:00', withSession=true) => {
    const b=await one("INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text,max_students) VALUES($1,$2,$3,CURRENT_DATE,CURRENT_DATE+30,'Free text is not authoritative',10) RETURNING id",[course,branchId,code]);
    if(withSession) await pg.query("INSERT INTO batch_schedules(batch_id,session_date,start_time,end_time,topic) VALUES($1,CURRENT_DATE+1,$2,$3,'Session')",[b.id,start,end]);
    return b.id;
  };
  const assign = (id: string, b: string, actor=admin, reason: string|null=null) => pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3,$4)',[id,b,actor,reason]);
  const request = async (type: string) => (await one("INSERT INTO enrollment_change_requests(enrollment_id,request_type,reason,requested_by) VALUES($1,$2,'Acceptance reason',$3) RETURNING id",[enrollment,type,admin])).id;
  beforeAll(async()=>{pg=new PGlite(); await loadAdminSchema(pg);},60000);
  afterAll(async()=>pg?.close());
  beforeEach(async()=>{
    await pg.query('BEGIN');
    admin=(await one("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900111001','Admin','SUPER_ADMIN','SCHEDADMIN') RETURNING id")).id;
    student=(await one("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900111002','Student','STUDENT','SCHEDSTUDENT') RETURNING id")).id;
    manager=(await one("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900111003','Manager','BRANCH_MANAGER','SCHEDMANAGER') RETURNING id")).id;
    branch=(await one("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('A','SCHEDA','0900','Test','Test',10,106,'https://invalid') RETURNING id")).id;
    otherBranch=(await one("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('B','SCHEDB','0900','Test','Test',10,106,'https://invalid') RETURNING id")).id;
    await pg.query("INSERT INTO staff_profiles(user_id,branch_id,employee_code,position) VALUES($1,$2,'SCHEDM','Manager')",[manager,branch]);
    const cat=(await one("INSERT INTO course_categories(name,code,icon_url) VALUES('Scheduling','SCHEDCAT','https://invalid') RETURNING id")).id;
    course=(await one("INSERT INTO courses(category_id,title,code,short_description,full_description,image_url) VALUES($1,'Course','SCHEDCOURSE','Test','Test','https://invalid') RETURNING id",[cat])).id;
    enrollment=(await one("INSERT INTO course_enrollments(student_id,course_id,consultation_status,student_status,approval_status,tuition_total,required_deposit,amount_paid) VALUES($1,$2,'CONFIRMED','APPROVED','APPROVED',1000000,200000,200000) RETURNING id",[student,course])).id;
  });
  afterEach(async()=>{await pg.query('ROLLBACK');});
  // A rejected statement aborts its transaction, so expected failures use savepoints.
  const reject = async (operation:()=>Promise<any>, pattern:RegExp) => {
    await pg.query('SAVEPOINT expected_failure');
    try {await expect(operation()).rejects.toThrow(pattern);} finally {await pg.query('ROLLBACK TO SAVEPOINT expected_failure');}
  };
  it('requires structured sessions and rejects overlapping student assignments while allowing adjacent sessions',async()=>{
    const a=await batch('A'); await assign(enrollment,a);
    course=(await one("INSERT INTO courses(category_id,title,code,short_description,full_description,image_url) SELECT category_id,'Second course','SCHEDSECOND','Test','Test','https://invalid' FROM courses WHERE id=$1 RETURNING id",[course])).id;
    const second=(await one("INSERT INTO course_enrollments(student_id,course_id,student_status,approval_status) VALUES($1,$2,'APPROVED','APPROVED') RETURNING id",[student,course])).id;
    const empty=await batch('EMPTY',branch,'10:00','11:00',false);
    await reject(()=>assign(second,empty),/thời khóa biểu/);
    const overlap=await batch('OVERLAP',otherBranch,'09:30','10:30');
    await reject(()=>assign(second,overlap),/Trùng lịch/);
    const adjacent=await batch('ADJACENT',otherBranch,'10:00','11:00'); await assign(second,adjacent);
    await reject(()=>pg.query("UPDATE batch_schedules SET start_time='09:30' WHERE batch_id=$1",[adjacent]),/Trùng lịch/);
  });
  it('requires transfer reason and global authority across branches, preserves expiry and attendance',async()=>{
    const a=await batch('A');const b=await batch('B',otherBranch,'11:00','12:00');await assign(enrollment,a);
    const expiry=(await one('SELECT valid_until FROM course_enrollments WHERE id=$1',[enrollment])).valid_until;
    await pg.query("INSERT INTO student_attendance(schedule_id,enrollment_id,status) SELECT id,$1,'PRESENT' FROM batch_schedules WHERE batch_id=$2",[enrollment,a]);
    await reject(()=>assign(enrollment,b,admin),/lý do/);
    await reject(()=>assign(enrollment,b,manager,'Transfer branch'),/chi nhánh/);
    await assign(enrollment,b,admin,'Student requested another branch');
    expect((await one('SELECT valid_until,selected_branch FROM course_enrollments WHERE id=$1',[enrollment]))).toMatchObject({valid_until:expiry,selected_branch:'B'});
    expect(Number((await one('SELECT count(*) n FROM student_attendance WHERE enrollment_id=$1',[enrollment])).n)).toBe(1);
    expect(Number((await one('SELECT enrolled_count FROM course_batches WHERE id=$1',[a])).enrolled_count)).toBe(0);
    expect(Number((await one('SELECT enrolled_count FROM course_batches WHERE id=$1',[b])).enrolled_count)).toBe(1);
    expect((await one("SELECT reason FROM enrollment_status_history WHERE enrollment_id=$1 AND event='BATCH_TRANSFERRED'",[enrollment])).reason).toBe('Student requested another branch');
  });
  it('holds and resumes through reviewed requests, rechecks schedule and prevents repeated processing',async()=>{
    const a=await batch('A');await assign(enrollment,a); const hold=await request('HOLD');
    await pg.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Approved hold')",[hold,admin]);
    expect((await one('SELECT access_status FROM course_enrollments WHERE id=$1',[enrollment])).access_status).toBe('SUSPENDED');
    await reject(()=>pg.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Duplicate')",[hold,admin]),/được xử lý/);
    const resume=await request('RESUME');await pg.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Resume approved')",[resume,admin]);
    expect((await one('SELECT access_status FROM course_enrollments WHERE id=$1',[enrollment])).access_status).toBe('ACTIVE');
  });
  it('keeps an upcoming class enrolled rather than starting study immediately',async()=>{
    const b=await one("INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text) VALUES($1,$2,'FUTURE',CURRENT_DATE+5,CURRENT_DATE+30,'Upcoming') RETURNING id",[course,branch]);
    await pg.query("INSERT INTO batch_schedules(batch_id,session_date,start_time,end_time,topic) VALUES($1,CURRENT_DATE+5,'09:00','10:00','Future session')",[b.id]);
    await assign(enrollment,b.id);
    expect((await one('SELECT status FROM course_enrollments WHERE id=$1',[enrollment])).status).toBe('ENROLLED');
  });
  it('refund approval records authorization without pretending money has been refunded',async()=>{
    const a=await batch('A');await assign(enrollment,a);const refund=await request('REFUND');
    await pg.query("SELECT fn_resolve_enrollment_change_request($1,$2,true,'Cashier must handle actual refund')",[refund,admin]);
    expect(Number((await one('SELECT amount_paid FROM course_enrollments WHERE id=$1',[enrollment])).amount_paid)).toBe(200000);
    expect((await one('SELECT status FROM enrollment_change_requests WHERE id=$1',[refund])).status).toBe('APPROVED');
    expect(Number((await one('SELECT count(*) n FROM tuition_transactions WHERE enrollment_id=$1',[enrollment])).n)).toBe(0);
  });
});
