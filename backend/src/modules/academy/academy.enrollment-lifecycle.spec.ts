import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');

describe('academy enrollment lifecycle database contract', () => {
  let pg: PGlite;
  let adminId: string;
  let enrollmentId: string;
  let batchId: string;

  const one = async (sql: string, params: unknown[] = []) => (await pg.query<any>(sql, params)).rows[0];

  beforeAll(async () => {
    pg = new PGlite();
    await loadAdminSchema(pg);
    adminId = (await one("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900999001','Academy Admin','SUPER_ADMIN','ACADEMYADMIN') RETURNING id")).id;
    const studentId = (await one("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900999002','Academy Student','STUDENT','ACADEMYSTUDENT') RETURNING id")).id;
    const branchId = (await one("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('Academy','ACADEMY','0900','Test','Test',10,106,'https://invalid') RETURNING id")).id;
    const categoryId = (await one("INSERT INTO course_categories(name,code,icon_url) VALUES('Academy lifecycle','ACADEMY-LIFE','https://invalid') RETURNING id")).id;
    const courseId = (await one("INSERT INTO courses(category_id,title,code,short_description,full_description,image_url,total_lessons,tuition_fee,deposit_amount) VALUES($1,'Lifecycle course','LIFECYCLE','Test','Test','https://invalid',1,1000000,200000) RETURNING id", [categoryId])).id;
    batchId = (await one("INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text,max_students) VALUES($1,$2,'LIFE-01',CURRENT_DATE,CURRENT_DATE+30,'Test',1) RETURNING id", [courseId, branchId])).id;
    enrollmentId = (await one("INSERT INTO course_enrollments(student_id,course_id,student_name,student_phone,tuition_total,required_deposit) VALUES($1,$2,'Academy Student','0900999002',1000000,200000) RETURNING id", [studentId, courseId])).id;
  }, 60_000);

  afterAll(async () => pg?.close());

  it('requires consultation before payment and approval', async () => {
    await expect(pg.query('SELECT fn_reconcile_enrollment_payment($1,$2,200000)', [enrollmentId, adminId]))
      .rejects.toThrow(/chốt tư vấn/);
    await pg.query("SELECT fn_finalize_enrollment_consultation($1,$2,1000000,'Academy','Đã xác nhận')", [enrollmentId, adminId]);
    await expect(pg.query("SELECT fn_approve_enrollment($1,$2,1000000,'Client claimed payment')", [enrollmentId, adminId])).rejects.toThrow(/cọc/);
    await pg.query('SELECT fn_reconcile_enrollment_payment($1,$2,200000)', [enrollmentId, adminId]);
    const before = await one('SELECT consultation_status,payment_status,student_status FROM course_enrollments WHERE id=$1', [enrollmentId]);
    expect(before).toMatchObject({ consultation_status: 'CONFIRMED', payment_status: 'PARTIALLY_PAID', student_status: 'NOT_APPROVED' });
    await pg.query("SELECT fn_approve_enrollment($1,$2,200000,'Đủ cọc')", [enrollmentId, adminId]);
    expect(await one('SELECT status,student_status FROM course_enrollments WHERE id=$1', [enrollmentId]))
      .toMatchObject({ status: 'DEPOSITED', student_status: 'APPROVED' });
  });

  it('assigns a batch atomically and starts study only when the batch has started', async () => {
    const student = await one('SELECT student_id FROM course_enrollments WHERE id=$1', [enrollmentId]);
    await expect(pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3)', [enrollmentId, batchId, student.student_id])).rejects.toThrow(/quyền/);
    await pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3)', [enrollmentId, batchId, adminId]);
    await pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3)', [enrollmentId, batchId, adminId]);
    expect(await one('SELECT batch_id,status,student_status FROM course_enrollments WHERE id=$1', [enrollmentId]))
      .toMatchObject({ batch_id: batchId, status: 'STUDYING', student_status: 'ENROLLED' });
    expect(Number((await one('SELECT enrolled_count FROM course_batches WHERE id=$1', [batchId])).enrolled_count)).toBe(1);
  });

  it('rejects reassignment while access is suspended or expired without changing capacity', async () => {
    await pg.query("UPDATE course_enrollments SET access_status='SUSPENDED' WHERE id=$1", [enrollmentId]);
    await expect(pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3)', [enrollmentId,batchId,adminId])).rejects.toThrow(/bảo lưu/);
    await pg.query("UPDATE course_enrollments SET access_status='ACTIVE',valid_until=NOW()-INTERVAL '1 day' WHERE id=$1", [enrollmentId]);
    await expect(pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3)', [enrollmentId,batchId,adminId])).rejects.toThrow(/hết quyền/);
    await pg.query("UPDATE course_enrollments SET valid_until=NOW()+INTERVAL '365 days' WHERE id=$1", [enrollmentId]);
    expect(Number((await one('SELECT enrolled_count FROM course_batches WHERE id=$1',[batchId])).enrolled_count)).toBe(1);
  });

  it('rejects graduation until every configurable requirement is met, then issues one certificate', async () => {
    await pg.query('INSERT INTO student_academic_records(enrollment_id,theory_score,practical_score,attendance_rate) VALUES($1,8,8,80)', [enrollmentId]);
    await expect(pg.query('SELECT fn_graduate_enrollment($1,$2)', [enrollmentId, adminId])).rejects.toThrow(/công nợ/);
    await pg.query("UPDATE course_enrollments SET amount_paid=1000000,payment_status='PAID',progress_percent=100,completed_lessons_count=1 WHERE id=$1", [enrollmentId]);
    await pg.query('SELECT fn_graduate_enrollment($1,$2)', [enrollmentId, adminId]);
    expect((await one('SELECT status,student_status FROM course_enrollments WHERE id=$1', [enrollmentId])))
      .toMatchObject({ status: 'GRADUATED', student_status: 'GRADUATED' });
    await expect(pg.query('SELECT fn_assign_enrollment_batch($1,$2,$3)', [enrollmentId, batchId, adminId])).rejects.toThrow(/kết thúc/);
    expect(Number((await one("SELECT count(*) n FROM student_certificates WHERE enrollment_id=$1 AND status='ISSUED'", [enrollmentId])).n)).toBe(1);
    expect(Number((await one('SELECT count(*) n FROM enrollment_status_history WHERE enrollment_id=$1', [enrollmentId])).n)).toBeGreaterThanOrEqual(5);
  });
});
