import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AdminService } from './admin.service';
import { inspectAdminSchema } from './admin.schema';
const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');

describe('Admin business workflows on the complete migrated schema', () => {
  let pg: PGlite, service: AdminService, actor: any, customer: any, branch: any, otherBranch: any, course: any, batch: any, spaService: any, spaPackage: any;
  const query = async (sql: string, values?: any[]) => { const result = await pg.query<any>(sql, values); return {...result,rowCount:result.rows.length || result.affectedRows || 0}; };
  const client = {query,release:()=>{}};
  beforeAll(async () => {
    pg = new PGlite(); await loadAdminSchema(pg);
    actor = {...(await query("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900100001','Cashier test','SUPER_ADMIN','FLOWADMIN') RETURNING *")).rows[0]};
    customer = (await query("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900100002','Student test','STUDENT','FLOWSTUDENT') RETURNING *")).rows[0];
    for (const code of ['FLOW-A','FLOW-B']) {
      const row = (await query("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES($1,$1,'0900100003','Test','Test',10,106,'https://example.invalid/img.png') RETURNING *",[code])).rows[0];
      if (!branch) branch=row; else otherBranch=row;
    }
    const category = (await query("INSERT INTO course_categories(name,code,icon_url) VALUES('Flow courses','FLOW','https://example.invalid/icon.png') RETURNING *")).rows[0];
    course=(await query("INSERT INTO courses(category_id,title,code,short_description,full_description,image_url) VALUES($1,'Flow course','FLOW','Test','Test','https://example.invalid/img.png') RETURNING *",[category.id])).rows[0];
    batch=(await query("INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text) VALUES($1,$2,'FLOW','2026-11-01','2026-12-01','Test') RETURNING *",[course.id,branch.id])).rows[0];
    const spaCategory=(await query("INSERT INTO service_categories(name,code,icon_url) VALUES('Flow services','FLOW','https://example.invalid/icon.png') RETURNING *")).rows[0];
    spaService=(await query("INSERT INTO services(category_id,name,slug,short_description,full_description,price,image_url) VALUES($1,'Flow service','flow','Test','Test',100000,'https://example.invalid/img.png') RETURNING *",[spaCategory.id])).rows[0];
    spaPackage=(await query("INSERT INTO treatment_packages(name,service_id,total_sessions,price,description,image_url) VALUES('Flow package',$1,5,500000,'Test','https://example.invalid/img.png') RETURNING *",[spaService.id])).rows[0];
    service=new AdminService({connection:{query,connect:async()=>client}} as any,new ConfigService({JWT_SECRET:'isolated-flow-secret-at-least-32-characters'}),new JwtService());
  },60000);
  afterAll(async()=>{await pg?.close();});

  it('preflights the migrated schema and identifies missing columns precisely', async()=>{
    expect((await inspectAdminSchema({query})).ready).toBe(true);
    await query('BEGIN');
    try {
      await query('ALTER TABLE admin_payment_requests RENAME COLUMN result TO result_missing');
      expect((await inspectAdminSchema({query})).missing).toContain('admin_payment_requests.result');
    } finally { await query('ROLLBACK'); }
  });

  it('loads Portal and Email schemas without sample business content', async () => {
    for (const table of ['miniapp_shared_content', 'email_templates', 'email_logs']) {
      expect((await query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count).toBe(0);
    }
    const columns = await query("SELECT column_name FROM information_schema.columns WHERE table_name='miniapp_shared_content'");
    expect(columns.rows.map(row => row.column_name)).toEqual(expect.arrayContaining(['target_link', 'access_level', 'file_url']));
  });

  it('rejects a schema that is missing treatment lifecycle columns', async()=>{
    await query('BEGIN');
    try {
      await query('ALTER TABLE user_packages RENAME COLUMN paused_at TO paused_at_missing');
      const status = await inspectAdminSchema({query});
      expect(status.ready).toBe(false);
      expect(status.missing).toContain('user_packages.paused_at');
    } finally { await query('ROLLBACK'); }
  });

  it('receives, serves, collects and checks out a booking, recording one receipt across retries',async()=>{
    const booking=(await query("INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,status,base_total,final_price,qr_code_hash) VALUES('FLOWBOOK',$1,$2,'2026-11-08','10:00','11:00','CONFIRMED',100000,100000,'flowqr') RETURNING *",[customer.id,branch.id])).rows[0];
    await query('INSERT INTO booking_items(booking_id,service_id,price) VALUES($1,$2,100000)',[booking.id,spaService.id]);
    await service.action('bookings',actor,{key:{id:booking.id},action:'checkin'});
    await service.action('bookings',actor,{key:{id:booking.id},action:'start'});
    await expect(service.action('bookings',actor,{key:{id:booking.id},action:'checkout'})).rejects.toThrow(/chuyên môn/);
    await service.action('bookings',actor,{key:{id:booking.id},action:'finish-service'});
    expect((await query('SELECT count(*)::int n FROM treatment_journal WHERE booking_id=$1',[booking.id])).rows[0].n).toBe(0);
    expect((await query('SELECT status,session_status FROM bookings WHERE id=$1',[booking.id])).rows[0]).toMatchObject({status:'IN_SERVICE',session_status:'COMPLETED'});
    const shift=await service.openCashierShift(actor,{branchId:branch.id,openingCash:50000});
    const body={kind:'BOOKING',bookingId:booking.id,shiftId:shift.id,paymentMethod:'CASH_AT_SPA',vatRate:8,expectedTotal:108000,requestId:randomUUID()};
    const receipt=await service.collectCashierPayment(actor,body);
    expect((await service.collectCashierPayment(actor,body)).invoice.id).toBe(receipt.invoice.id);
    expect((await query('SELECT count(*)::int n FROM invoices WHERE booking_id=$1',[booking.id])).rows[0].n).toBe(1);
    expect((await service.activeCashierShift(actor,branch.id))?.systemCash).toBe(158000);
    await expect(service.collectCashierPayment(actor,{...body,expectedTotal:100000})).rejects.toThrow(/nội dung khác/);
    expect((await query('SELECT status FROM bookings WHERE id=$1',[booking.id])).rows[0].status).toBe('COMPLETED');
    await expect(service.closeCashierShift(actor,shift.id,{closingCash:150000})).rejects.toThrow(/lý do giải trình/);
    await service.closeCashierShift(actor,shift.id,{closingCash:158000});
    expect((await service.collectCashierPayment(actor,body)).invoice.id).toBe(receipt.invoice.id);
    await expect(service.collectCashierPayment(actor,{...body,requestId:randomUUID()})).rejects.toThrow(/mở ca/);

    const inServiceBk=(await query("INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,status,session_status,base_total,final_price,qr_code_hash) VALUES('INSERVICE-PAY',$1,$2,'2026-11-08','14:00','15:00','IN_SERVICE','IN_SERVICE',100000,100000,'in-service-qr') RETURNING *",[customer.id,branch.id])).rows[0];
    await query('INSERT INTO booking_items(booking_id,service_id,price) VALUES($1,$2,100000)',[inServiceBk.id,spaService.id]);
    const shift2=await service.openCashierShift(actor,{branchId:branch.id,openingCash:0});
    await service.collectCashierPayment(actor,{kind:'BOOKING',bookingId:inServiceBk.id,shiftId:shift2.id,paymentMethod:'CASH_AT_SPA',vatRate:0,expectedTotal:100000,requestId:randomUUID()});
    const checkedBk=(await query('SELECT status,session_status,payment_status FROM bookings WHERE id=$1',[inServiceBk.id])).rows[0];
    expect(checkedBk.payment_status).toBe('PAID');
    expect(checkedBk.status).toBe('IN_SERVICE');
    await service.closeCashierShift(actor,shift2.id,{closingCash:100000});
  });

  it('verifies a prepaid package on check-in without consuming a session early',async()=>{
    const owner=(await query("INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,expires_at) VALUES($1,$2,5,0,'ACTIVE',now()+interval '3 months') RETURNING *",[customer.id,spaPackage.id])).rows[0];
    const booking=(await query("INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,status,payment_status,payment_method,base_total,final_price,qr_code_hash) VALUES('PACKAGE-CHECKIN',$1,$2,'2026-11-08','12:00','13:00','CONFIRMED','UNPAID','MEMBERSHIP_WALLET',0,0,'package-checkin-qr') RETURNING *",[customer.id,branch.id])).rows[0];
    await query('INSERT INTO booking_items(booking_id,service_id,price) VALUES($1,$2,0)',[booking.id,spaService.id]);
    await expect(service.action('bookings',actor,{key:{id:booking.id},action:'checkin'})).rejects.toThrow(/chọn gói/);
    await service.action('bookings',actor,{key:{id:booking.id},action:'checkin',userPackageId:owner.id});
    expect((await query('SELECT status,payment_status FROM bookings WHERE id=$1',[booking.id])).rows[0]).toMatchObject({status:'CHECKED_IN',payment_status:'PAID'});
    expect((await query('SELECT completed_sessions FROM user_packages WHERE id=$1',[owner.id])).rows[0].completed_sessions).toBe(0);
  });

  it('keeps package sales out of generic carts and activates a package only with its paid invoice',async()=>{
    const shift=await service.openCashierShift(actor,{branchId:branch.id,openingCash:0});
    const mixedCart={kind:'CART',shiftId:shift.id,customerId:customer.id,paymentMethod:'BANK_TRANSFER',requestId:randomUUID(),items:[{type:'SERVICE',id:spaService.id,quantity:2},{type:'PACKAGE',id:spaPackage.id,quantity:1}],expectedTotal:700000};
    const before=(await query('SELECT count(*)::int n FROM invoices')).rows[0].n;
    const packagesBefore=(await query('SELECT count(*)::int n FROM user_packages WHERE customer_id=$1',[customer.id])).rows[0].n;
    await expect(service.collectCashierPayment(actor,mixedCart)).rejects.toThrow(/phiếu riêng/);
    expect((await query('SELECT count(*)::int n FROM invoices')).rows[0].n).toBe(before);
    expect((await query('SELECT count(*)::int n FROM user_packages WHERE customer_id=$1',[customer.id])).rows[0].n).toBe(packagesBefore);
    const body={...mixedCart,requestId:randomUUID(),items:[{type:'SERVICE',id:spaService.id,quantity:2}],expectedTotal:200000};
    await expect(service.collectCashierPayment(actor,{...body,expectedTotal:1})).rejects.toThrow(/Giá hoặc tổng tiền/);
    const paid=await service.collectCashierPayment(actor,body);
    expect(paid.amount).toBe(200000);
    await service.collectCashierPayment(actor,body);
    expect((await query('SELECT count(*)::int n FROM user_packages WHERE customer_id=$1',[customer.id])).rows[0].n).toBe(packagesBefore);
    expect((await query('SELECT count(*)::int n FROM invoice_items WHERE invoice_id=$1',[paid.invoice.id])).rows[0].n).toBe(1);
    await expect(service.collectCashierPayment(actor,{kind:'PACKAGE',shiftId:shift.id,branchId:branch.id,customerId:'bbbbbbbb-0001-0001-0001-000000000001',packageId:spaPackage.id,paymentMethod:'BANK_TRANSFER',vatRate:8,requestId:randomUUID()})).rejects.toThrow(/khách vãng lai/);
    const registration=await service.collectCashierPayment(actor,{kind:'PACKAGE',shiftId:shift.id,branchId:branch.id,customerId:customer.id,packageId:spaPackage.id,paymentMethod:'BANK_TRANSFER',vatRate:8,requestId:randomUUID()});
    expect(registration.userPackage.id).toBeTruthy();
    expect(registration.invoice.user_package_id).toBe(registration.userPackage.id);
    expect((await query('SELECT payment_status FROM invoices WHERE id=$1',[registration.invoice.id])).rows[0].payment_status).toBe('PAID');
    await service.closeCashierShift(actor,shift.id,{closingCash:0});
  });

  it('enrolls, collects deposit/balance, marks attendance, grades and issues/revokes a certificate',async()=>{
    const enrollment=await service.mutate('course_enrollments',actor,'create',{values:{student_id:customer.id,course_id:course.id,batch_id:batch.id,tuition_total:1000000}});
    const shift=await service.openCashierShift(actor,{branchId:branch.id,openingCash:0});
    const deposit={kind:'TUITION',enrollmentId:enrollment.id,shiftId:shift.id,amount:200000,paymentMethod:'CASH_AT_SPA',requestId:randomUUID()};
    await service.collectCashierPayment(actor,deposit); await service.collectCashierPayment(actor,deposit);
    expect(Number((await query('SELECT amount_paid FROM course_enrollments WHERE id=$1',[enrollment.id])).rows[0].amount_paid)).toBe(200000);
    await expect(service.collectCashierPayment(actor,{...deposit,requestId:randomUUID(),amount:900000})).rejects.toThrow(/vượt quá/);
    await service.collectCashierPayment(actor,{...deposit,requestId:randomUUID(),amount:800000});
    expect((await query('SELECT approval_status,student_status FROM course_enrollments WHERE id=$1',[enrollment.id])).rows[0]).toMatchObject({approval_status:'PENDING_APPROVAL',student_status:'NOT_APPROVED'});
    const schedule=await service.mutate('batch_schedules',actor,'create',{values:{batch_id:batch.id,session_date:'2026-11-08',start_time:'08:00',end_time:'10:00',topic:'Flow'}});
    const record=await service.mutate('student_academic_records',actor,'create',{values:{enrollment_id:enrollment.id,theory_score:8,practical_score:8,is_graduated:false,total_batch_sessions:1}});
    await service.mutate('student_attendance',actor,'create',{values:{enrollment_id:enrollment.id,schedule_id:schedule.id,status:'PRESENT'}});
    const latest=(await query('SELECT * FROM student_academic_records WHERE id=$1',[record.id])).rows[0];
    expect(Number(latest.attendance_rate)).toBe(100);
    await service.mutate('student_academic_records',actor,'update',{key:{id:record.id},expectedUpdatedAt:latest.updated_at,values:{is_graduated:true},reason:'Verified completion'});
    const certificate=await service.mutate('student_certificates',actor,'create',{values:{enrollment_id:enrollment.id,student_id:customer.id,course_id:course.id,certificate_code:'FLOWCERT',student_name:customer.full_name,course_title:course.title,theory_score:8,practical_score:8,final_grade:'PASS'}});
    await service.action('student_certificates',actor,{key:{id:certificate.id},action:'issue'});
    expect((await query('SELECT status FROM student_certificates WHERE id=$1',[certificate.id])).rows[0].status).toBe('ISSUED');
    await service.action('student_certificates',actor,{key:{id:certificate.id},action:'revoke',reason:'Test correction'});
    expect((await query('SELECT status FROM student_certificates WHERE id=$1',[certificate.id])).rows[0].status).toBe('REVOKED');
    await service.closeCashierShift(actor,shift.id,{closingCash:1000000});
  });

  it('limits branch roles at reads, writes, actions and cashier operations',async()=>{
    const scoped={...actor,role:'BRANCH_MANAGER',scopes:['branches.read','branches.update','cashier.shifts','cashier.collect'].map(permission=>({permission,branchId:branch.id}))};
    const branches=await service.list('branches',scoped,{});
    expect(branches.rows.map(row=>row.id)).toEqual([branch.id]);
    await expect(service.mutate('branches',scoped,'update',{key:{id:otherBranch.id},expectedUpdatedAt:otherBranch.updated_at,values:{name:'Denied'}})).rejects.toThrow(/chi nhánh/);
    await expect(service.openCashierShift(scoped,{branchId:otherBranch.id,openingCash:0})).rejects.toThrow(/chi nhánh/);
    const wrongRole={...scoped,role:'RECEPTIONIST'};
    await expect(service.openCashierShift(wrongRole,{branchId:branch.id,openingCash:0})).rejects.toThrow(/Vai trò/);
    await expect(service.list('roles',scoped,{})).rejects.toThrow(/SUPER_ADMIN/);
  });
  it('still closes a shift when a deployed legacy audit table lacks the expected action column',async()=>{
    const shift=await service.openCashierShift(actor,{branchId:branch.id,openingCash:123000});
    await query('ALTER TABLE audit_logs RENAME COLUMN action TO legacy_action');
    try {
      const closed=await service.closeCashierShift(actor,shift.id,{closingCash:123000});
      expect(closed.status).toBe('CLOSED');
      const persisted=(await query('SELECT status,closing_cash FROM cashier_shifts WHERE id=$1',[shift.id])).rows[0];
      expect(persisted.status).toBe('CLOSED');
      expect(Number(persisted.closing_cash)).toBe(123000);
    } finally {
      await query('ALTER TABLE audit_logs RENAME COLUMN legacy_action TO action');
    }
  });
  it('shows reference names, searches them and clamps pages after data removal',async()=>{
    await query("INSERT INTO staff_profiles(user_id,branch_id,employee_code,position) VALUES($1,$2,'FLOWEMP','Test')",[actor.id,branch.id]);
    const staff=await service.list('staff_profiles',actor,{search:branch.name});
    expect(staff.rows).toHaveLength(1);
    expect(staff.rows[0].full_name).toBe(actor.full_name);
    expect(staff.rows[0].branch_name).toBe(branch.name);
    const page=await service.list('branches',actor,{page:'999',limit:'1'});
    expect(page.page).toBe(2);
    expect(page.rows).toHaveLength(1);
  });
  it('returns only permitted POS data without account secrets',async()=>{
    const scoped={...actor,role:'CASHIER',scopes:[{permission:'cashier.collect',branchId:branch.id}]};
    const workspace=await service.cashierWorkspace(scoped);
    expect(workspace.branches.map(row=>row.id)).toEqual([branch.id]);
    expect(workspace.invoices.every(row=>row.branch_id===branch.id)).toBe(true);
    expect(workspace.customers.every(row=>row.password_hash===undefined)).toBe(true);
    expect(workspace.staff.every(row=>row.staff_profile.base_salary===undefined && row.staff_profile.bank_account_number===undefined)).toBe(true);
    await expect(service.cashierWorkspace(scoped,otherBranch.id)).rejects.toThrow(/Chi nhánh/);
  });

});
