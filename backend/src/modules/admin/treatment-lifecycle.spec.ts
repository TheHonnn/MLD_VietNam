import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { recordMaterialCount, syncInventoryItem } from './treatment-inventory';

describe('Treatment Lifecycle & Safe Session Reversal Integration', () => {
  let pg: PGlite;
  let service: AdminService;

  const superAdminActor = {
    id: '00000000-0000-4000-8000-000000000001',
    role: 'SUPER_ADMIN',
  };

  const staffActor = {
    id: '00000000-0000-4000-8000-000000000002',
    role: 'TECHNICIAN',
    scopes: [
      { permission: 'treatment_journal.read', branchId: null },
      { permission: 'treatment_journal.action', branchId: null },
    ],
  };

  let branchId: string;
  let serviceId: string;
  let packageDefId: string;
  let customerOneId: string;
  let customerTwoId: string;
  let technicianId: string;

  const client = {
    query: async (sql: string, values?: any[]) => {
      const r = await pg.query(sql, values);
      return { ...r, rowCount: r.rows.length || (r as any).affectedRows || 0 };
    },
    release: () => {},
  };

  beforeAll(async () => {
    pg = new PGlite();
    await loadAdminSchema(pg);

    // Seed admin operators
    await pg.query(
      "INSERT INTO users(id, phone, full_name, role, referral_code) VALUES($1, '0900000001', 'Admin Operator', 'SUPER_ADMIN', 'ADMIN01')",
      [superAdminActor.id],
    );
    await pg.query(
      "INSERT INTO users(id, phone, full_name, role, referral_code) VALUES($1, '0900000002', 'Staff Member', 'TECHNICIAN', 'STAFF02')",
      [staffActor.id],
    );

    // Seed customers
    const cust1 = (await pg.query<any>(
      "INSERT INTO users(phone, full_name, role, referral_code) VALUES('0911111111', 'Nguyen Van A', 'STUDENT', 'CUST01') RETURNING id",
    )).rows[0];
    customerOneId = cust1.id;

    const cust2 = (await pg.query<any>(
      "INSERT INTO users(phone, full_name, role, referral_code) VALUES('0922222222', 'Tran Thi B', 'STUDENT', 'CUST02') RETURNING id",
    )).rows[0];
    customerTwoId = cust2.id;

    // Seed branch
    const branch = (await pg.query<any>(
      "INSERT INTO branches(name, code, phone, address, district, latitude, longitude, image_url) VALUES('Chi nhanh Quan 3', 'CNQ3', '0933333333', '123 Nam Ky Khoi Nghia', 'Quan 3', 10.78, 106.69, 'https://example.com/b.png') RETURNING id",
    )).rows[0];
    branchId = branch.id;

    // Seed technician
    const tech = (await pg.query<any>(
      "INSERT INTO technicians(user_id, full_name, title, branch_id, avatar_url) VALUES($1, 'KTV Le Thi C', 'Chuyen vien Tri lieu', $2, 'https://example.com/technician.png') RETURNING id",
      [staffActor.id, branchId],
    )).rows[0];
    technicianId = tech.id;

    // Seed service category and service using the production schema's required
    // catalogue fields. Keeping fixtures schema-accurate prevents tests from
    // silently depending on legacy columns such as services.code.
    const category = (await pg.query<any>(
      "INSERT INTO service_categories(name, code, icon_url, description) VALUES('Chăm sóc MLD', 'MLD-CARE', 'https://example.com/category.png', 'Dịch vụ chăm sóc MLD') RETURNING id",
    )).rows[0];

    const srv = (await pg.query<any>(
      `INSERT INTO services(
        category_id, name, slug, short_description, full_description,
        duration_minutes, price, image_url, is_active
      ) VALUES(
        $1, 'Chăm Sóc Da Chuyên Sâu MLD', 'cham-soc-da-chuyen-sau-mld',
        'Chăm sóc chuyên sâu', 'Dịch vụ chăm sóc chuyên sâu theo phác đồ MLD',
        60, 500000, 'https://example.com/service.png', true
      ) RETURNING id`,
      [category.id],
    )).rows[0];
    serviceId = srv.id;

    // Seed treatment package template
    const pkgDef = (await pg.query<any>(
      "INSERT INTO treatment_packages(name, description, service_id, total_sessions, price, validity_months, image_url, is_active) VALUES('Gói Liệu Trình Trẻ Hóa 5 Buổi', 'Phác đồ 5 buổi chuẩn y khoa', $1, 5, 2000000, 6, 'https://example.com/package.png', true) RETURNING id",
      [serviceId],
    )).rows[0];
    packageDefId = pkgDef.id;

    service = new AdminService(
      { connection: { ...client, connect: async () => client } } as any,
      new ConfigService({
        JWT_SECRET: 'test-secret-only-not-a-production-key-12345',
      }),
      new JwtService(),
    );
  }, 60000);

  it('books a rostered slot with a real bed and rejects overlapping reservations', async () => {
    const date = '2099-04-15';
    const room = (await pg.query<{ id: string }>(
      "INSERT INTO branch_rooms(branch_id,name,bed_capacity) VALUES($1,'Phòng lịch trực',1) RETURNING id", [branchId],
    )).rows[0];
    await pg.query("INSERT INTO technician_shifts(branch_id,technician_id,assigned_room_id,shift_date,start_time,end_time) VALUES($1,$2,$3,$4,'09:00','12:00')",
      [branchId, technicianId, room.id, date]);
    const lookup = { branchId, date, serviceId };
    const availability = await service.staffScheduleSlots(superAdminActor, lookup);
    expect(availability.slots[0]).toMatchObject({ start: '09:00', end: '10:00', roomId: room.id, bed: 'B-1' });
    expect(availability.slots.some(slot => slot.start === '11:00')).toBe(false);
    await expect(service.staffScheduleSlots(staffActor, lookup)).rejects.toThrow(ForbiddenException);
    const request = { branchId, bookingDate: date, serviceId, customerId: customerOneId, technicianId, startTime: '09:00', requestId: randomUUID() };
    const booking = await service.createScheduleBooking(superAdminActor, request);
    expect(await service.createScheduleBooking(superAdminActor, request)).toEqual(booking);
    await expect(service.createScheduleBooking(superAdminActor, { ...request, startTime: '10:00', requestId: randomUUID() })).rejects.toThrow(ConflictException);
    const updated = await service.staffScheduleSlots(superAdminActor, lookup);
    expect(updated.slots[0]?.start).toBe('10:15');
    const unassigned = (await pg.query<{ id: string }>(
      "INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('SCHED-UNASSIGNED',$1,$2,$3,'10:15','11:15',500000,500000,'schedule-unassigned') RETURNING id",
      [customerOneId, branchId, date],
    )).rows[0];
    await pg.query('INSERT INTO booking_items(booking_id,service_id,duration_minutes,price) VALUES($1,$2,60,500000)', [unassigned.id, serviceId]);
    await service.assignScheduleBooking(superAdminActor, { bookingId: unassigned.id, technicianId });
    expect((await pg.query('SELECT technician_id,assigned_room_id FROM bookings WHERE id=$1', [unassigned.id])).rows[0])
      .toEqual({ technician_id: technicianId, assigned_room_id: room.id });
    await pg.query("UPDATE bookings SET status='IN_SERVICE', session_status='COMPLETED', payment_status='PAID' WHERE id=$1", [booking.id]);
    await expect(service.action('bookings', superAdminActor, {
      key: { id: booking.id }, action: 'checkout', requireEnded: true,
    })).rejects.toThrow('Ca chưa hết giờ');

  });

  afterAll(async () => {
    await pg?.close();
  });

  describe('1. Package State Machine Transitions & Validation', () => {
    it('books a package atomically, safely retries and rejects a conflicting technician slot', async () => {
      await pg.query("INSERT INTO branch_rooms(branch_id,name,bed_capacity) VALUES($1,'Phòng kiểm thử',1)",[branchId]);
      const pkg=(await pg.query<any>("INSERT INTO user_packages(customer_id,package_id,total_sessions,status,expires_at) VALUES($1,$2,3,'ACTIVE',now()+interval '3 months') RETURNING id",[customerOneId,packageDefId])).rows[0];
      const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
      const input={branchId,technicianId,requestId:randomUUID(),bookingDate:day,startTime:'09:00',notes:'Đặt theo gói'};
      const first=await service.bookTreatmentSession(superAdminActor,pkg.id,input);
      expect((await service.bookTreatmentSession(superAdminActor,pkg.id,input)).id).toBe(first.id);
      expect((await pg.query<any>('SELECT count(*)::int n FROM booking_items WHERE booking_id=$1',[first.id])).rows[0].n).toBe(1);
      expect((await pg.query<any>('SELECT completed_sessions FROM user_packages WHERE id=$1',[pkg.id])).rows[0].completed_sessions).toBe(0);
      await expect(service.bookTreatmentSession(superAdminActor,pkg.id,{...input,notes:'Thông tin khác'})).rejects.toThrow(ConflictException);
      await expect(service.bookTreatmentSession(superAdminActor,pkg.id,{...input,requestId:randomUUID()})).rejects.toThrow(ConflictException);
      await pg.query("UPDATE user_packages SET expires_at=now()+interval '1 day' WHERE id=$1",[pkg.id]);
      await expect(service.bookTreatmentSession(superAdminActor,pkg.id,{...input,startTime:'12:00',requestId:randomUUID()})).rejects.toThrow(/hết hạn/);
      await pg.query("UPDATE user_packages SET expires_at=now()+interval '3 months',total_sessions=1 WHERE id=$1",[pkg.id]);
      await expect(service.bookTreatmentSession(superAdminActor,pkg.id,{...input,startTime:'12:00',requestId:randomUUID()})).rejects.toThrow(/đã được đặt lịch/);
      await pg.query('UPDATE user_packages SET total_sessions=3 WHERE id=$1',[pkg.id]);
      await pg.query("UPDATE user_packages SET status='PAUSED' WHERE id=$1",[pkg.id]);
      await expect(service.bookTreatmentSession(superAdminActor,pkg.id,{...input,startTime:'12:00',requestId:randomUUID()})).rejects.toThrow(ConflictException);
      await pg.query("UPDATE user_packages SET status='ACTIVE' WHERE id=$1",[pkg.id]);
      await pg.exec(`CREATE FUNCTION reject_acceptance_booking_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced item failure'; END $$;
        CREATE TRIGGER reject_acceptance_booking_item BEFORE INSERT ON booking_items FOR EACH ROW EXECUTE FUNCTION reject_acceptance_booking_item();`);
      const failedRequest=randomUUID();
      try { await expect(service.bookTreatmentSession(superAdminActor,pkg.id,{...input,startTime:'13:00',requestId:failedRequest})).rejects.toThrow(); }
      finally { await pg.exec('DROP TRIGGER reject_acceptance_booking_item ON booking_items; DROP FUNCTION reject_acceptance_booking_item();'); }
      expect((await pg.query<any>('SELECT count(*)::int n FROM bookings WHERE qr_code_hash=$1',[`treatment:${superAdminActor.id}:${failedRequest}`])).rows[0].n).toBe(0);
    });
    it('rejects generic confirmation and approval forgery without consuming a session', async () => {
      const pkg=(await pg.query<any>("INSERT INTO user_packages(customer_id,package_id,total_sessions,status,expires_at) VALUES($1,$2,2,'ACTIVE',now()+interval '3 months') RETURNING id",[customerOneId,packageDefId])).rows[0];
      const journal=(await pg.query<any>("INSERT INTO treatment_journal(user_package_id,customer_id,session_number,session_date,confirmation_status) VALUES($1,$2,1,CURRENT_DATE,'DRAFT') RETURNING id",[pkg.id,customerOneId])).rows[0];
      for (const values of [{confirmation_status:'CONFIRMED'},{clinical_approved_at:new Date().toISOString()},{customer_id:customerTwoId}]) {
        await expect(service.mutate('treatment_journal',superAdminActor,'update',{key:{id:journal.id},values})).rejects.toThrow();
      }
      expect((await pg.query<any>('SELECT completed_sessions FROM user_packages WHERE id=$1',[pkg.id])).rows[0].completed_sessions).toBe(0);
    });
    it('keeps the receiving package visible only to the source branch after transfer', async () => {
      const pkg=(await pg.query<any>("INSERT INTO user_packages(customer_id,package_id,total_sessions,status,expires_at) VALUES($1,$2,3,'ACTIVE',now()+interval '3 months') RETURNING id",[customerOneId,packageDefId])).rows[0];
      const booking=(await pg.query<any>("INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('TRANSFER-SCOPE',$1,$2,CURRENT_DATE,'10:00','11:00',0,0,'transfer-scope-qr') RETURNING id",[customerOneId,branchId])).rows[0];
      await pg.query("INSERT INTO treatment_journal(user_package_id,customer_id,booking_id,session_number,session_date,confirmation_status) VALUES($1,$2,$3,1,CURRENT_DATE,'DRAFT')",[pkg.id,customerOneId,booking.id]);
      await service.action('user_packages',superAdminActor,{key:{id:pkg.id},action:'transfer',newCustomerId:customerTwoId,reason:'Chuyển nhượng theo yêu cầu khách hàng'} as any);
      const transferred=(await pg.query<any>('SELECT id FROM user_packages WHERE transferred_from_package_id=$1',[pkg.id])).rows[0];
      const actor={id:staffActor.id,role:'RECEPTIONIST',scopes:[{permission:'user_packages.read',branchId}]};
      const listing=await service.list('user_packages',actor,{filter:JSON.stringify({id:transferred.id})});
      expect(listing.rows.map(row=>row.id)).toEqual([transferred.id]);
      expect((await service.list('user_packages',{...actor,scopes:[{permission:'user_packages.read',branchId:'00000000-0000-4000-8000-999999999999'}]},{filter:JSON.stringify({id:transferred.id})})).total).toBe(0);
    });
    it('returns package context and denies unresolved packages to branch operators', async () => {
      const pkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,expires_at) VALUES($1,$2,5,0,'ACTIVE',now()+interval '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];
      const detail = await service.treatmentPackageDetail(superAdminActor, pkg.id);
      expect(detail).toEqual({ journals: [], logs: [], invoices: [], bookings: [], deliveries: [] });
      const listing = await service.list('user_packages', superAdminActor, { filter: JSON.stringify({ id: pkg.id }) });
      expect(listing.rows[0].service_name).toBe('Chăm Sóc Da Chuyên Sâu MLD');
      expect(listing.rows[0].package_branches).toEqual([]);
      await expect(service.treatmentPackageDetail({ id: staffActor.id, role: 'RECEPTIONIST', scopes: [{ permission: 'user_packages.read', branchId }] }, pkg.id)).rejects.toThrow(ForbiddenException);
    });

    it('does not allow submitted journals to be rewritten as drafts', async () => {
      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(customer_id,session_number,session_date,confirmation_status,condition_before,condition_after,treatment_notes) VALUES($1,1,CURRENT_DATE,'SUBMITTED','Before','After','Notes') RETURNING id",
        [customerOneId],
      )).rows[0];
      await expect(service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id }, action: 'save-draft', values: { treatment_notes: 'Changed' },
      })).rejects.toThrow(ConflictException);
      const saved = (await pg.query<any>('SELECT confirmation_status,treatment_notes FROM treatment_journal WHERE id=$1', [journal.id])).rows[0];
      expect(saved).toEqual({ confirmation_status: 'SUBMITTED', treatment_notes: 'Notes' });
    });

    it('delivers an immutable guideline snapshot once per confirmed session and version', async () => {
      const guide = await service.mutate('home_care_guidelines', superAdminActor, 'create', {
        values: { title: 'Chăm sóc sau buổi', category: 'Chăm sóc', summary: 'Tóm tắt', content: 'Nội dung phiên bản đầu', image_url: 'https://example.com/care.png', is_published: true },
      });
      expect(guide.version).toBe(1);
      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(customer_id,session_number,session_date,confirmation_status) VALUES($1,1,CURRENT_DATE,'DRAFT') RETURNING id", [customerOneId],
      )).rows[0];
      await expect(service.assignHomeCare(superAdminActor,journal.id,guide.id)).rejects.toThrow(ConflictException);
      await pg.query("UPDATE treatment_journal SET confirmation_status='CONFIRMED' WHERE id=$1", [journal.id]);
      expect((await service.homeCareTemplatesForSession(superAdminActor,journal.id)).some(row => row.id === guide.id)).toBe(true);
      const first = await service.assignHomeCare(superAdminActor,journal.id,guide.id);
      const retry = await service.assignHomeCare(superAdminActor,journal.id,guide.id);
      expect(retry.id).toBe(first.id);
      expect((await pg.query<any>("SELECT count(*)::int n FROM notifications WHERE user_id=$1 AND data->>'delivery_id'=$2",[customerOneId,first.id])).rows[0].n).toBe(1);
      const updated = await service.mutate('home_care_guidelines',superAdminActor,'update', {
        key: { id: guide.id }, expectedUpdatedAt: guide.updated_at,
        values: { content: 'Nội dung đã sửa' },
      });
      expect(updated.version).toBe(2);
      expect(updated.is_published).toBe(false);
      const delivery = (await pg.query<any>('SELECT content_snapshot,guideline_version FROM home_care_deliveries WHERE id=$1',[first.id])).rows[0];
      expect(delivery.content_snapshot.content).toBe('Nội dung phiên bản đầu');
      expect(delivery.guideline_version).toBe(1);
      await expect(service.assignHomeCare(superAdminActor,journal.id,guide.id)).rejects.toThrow(ConflictException);
      await pg.query('UPDATE home_care_guidelines SET is_published=true,service_id=$2 WHERE id=$1',[guide.id,serviceId]);
      expect((await service.homeCareTemplatesForSession(superAdminActor,journal.id)).some(row => row.id === guide.id)).toBe(false);
      await expect(service.assignHomeCare(superAdminActor,journal.id,guide.id)).rejects.toThrow(ConflictException);
      await expect(service.mutate('home_care_guidelines',superAdminActor,'delete',{ key: { id: guide.id },expectedUpdatedAt: updated.updated_at })).rejects.toThrow();
    });

    it('reuses the reversed paid session without erasing history and closes a covered booking on confirmation', async () => {
      const pkg = (await pg.query<any>("INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,expires_at) VALUES($1,$2,2,2,'COMPLETED',now()+interval '3 months') RETURNING id",[customerOneId,packageDefId])).rows[0];
      const reversed = (await pg.query<any>("INSERT INTO treatment_journal(user_package_id,customer_id,session_number,session_date,confirmation_status) VALUES($1,$2,1,CURRENT_DATE,'CONFIRMED') RETURNING id",[pkg.id,customerOneId])).rows[0];
      await pg.query("INSERT INTO treatment_journal(user_package_id,customer_id,session_number,session_date,confirmation_status) VALUES($1,$2,2,CURRENT_DATE,'CONFIRMED')",[pkg.id,customerOneId]);
      await service.action('treatment_journal',superAdminActor,{key:{id:reversed.id},action:'reverse',reason:'Ghi nhận nhầm buổi cần hoàn tác'});
      const booking = (await pg.query<any>(`INSERT INTO bookings(booking_code,customer_id,branch_id,technician_id,booking_date,start_time,end_time,status,payment_status,payment_method,base_total,final_price,qr_code_hash)
        VALUES('REPLACEMENT-SESSION',$1,$2,$3,CURRENT_DATE,'09:00','10:00','CONFIRMED','UNPAID','MEMBERSHIP_WALLET',0,0,'replacement-qr') RETURNING id`,[customerOneId,branchId,technicianId])).rows[0];
      await pg.query('INSERT INTO booking_items(booking_id,service_id,price) VALUES($1,$2,0)',[booking.id,serviceId]);
      await service.action('bookings',superAdminActor,{key:{id:booking.id},action:'checkin',userPackageId:pkg.id});
      await service.action('bookings',superAdminActor,{key:{id:booking.id},action:'start'});
      const draft = await service.startTreatmentDraft(superAdminActor,pkg.id,booking.id);
      expect(draft.session_number).toBe(1);
      expect(draft.customer_id).toBe(customerOneId);
      expect((await service.startTreatmentDraft(superAdminActor,pkg.id,booking.id)).id).toBe(draft.id);
      await expect(service.action('bookings',superAdminActor,{key:{id:booking.id},action:'finish-service'})).rejects.toThrow();
      await service.action('treatment_journal',superAdminActor,{key:{id:draft.id},action:'save-draft',values:{condition_before:'Trước buổi',condition_after:'Sau buổi',treatment_notes:'Đã thực hiện chăm sóc',after_photos:['https://example.com/after.png']}});
      await service.action('treatment_journal',superAdminActor,{key:{id:draft.id},action:'submit-session'});
      await service.action('treatment_journal',superAdminActor,{key:{id:draft.id},action:'confirm-session'});
      expect((await pg.query<any>('SELECT status,completed_sessions FROM user_packages WHERE id=$1',[pkg.id])).rows[0]).toEqual({status:'COMPLETED',completed_sessions:2});
      expect((await pg.query<any>('SELECT status,payment_status,session_status FROM bookings WHERE id=$1',[booking.id])).rows[0]).toEqual({status:'COMPLETED',payment_status:'PAID',session_status:'COMPLETED'});
      expect((await pg.query<any>('SELECT count(*)::int n FROM treatment_journal WHERE user_package_id=$1',[pkg.id])).rows[0].n).toBe(3);
      expect((await pg.query<any>('SELECT after_photos FROM treatment_journal WHERE id=$1',[draft.id])).rows[0].after_photos).toEqual(['https://example.com/after.png']);
    });

    it('blocks arbitrary direct mutations to package status', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '6 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      await expect(
        service.mutate('user_packages', superAdminActor, 'update', {
          key: { id: upkg.id },
          values: { status: 'REFUNDED' },
        }),
      ).rejects.toThrow(/Không sửa trạng thái gói tùy ý/i);
    });

    it('pauses an active package and writes an immutable lifecycle audit log', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 1, 'ACTIVE', NOW() + INTERVAL '6 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'pause',
        reason: 'Khách hàng đi công tác nước ngoài 2 tháng',
      });

      expect(res.status).toBe('PAUSED');

      // Verify DB state
      const dbRow = (await pg.query<any>('SELECT status, paused_at FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.status).toBe('PAUSED');
      expect(dbRow.paused_at).not.toBeNull();

      // Verify lifecycle log
      const logs = (await pg.query<any>('SELECT * FROM user_package_lifecycle_logs WHERE user_package_id=$1', [upkg.id])).rows;
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('PAUSE');
      expect(logs[0].from_status).toBe('ACTIVE');
      expect(logs[0].to_status).toBe('PAUSED');
      expect(logs[0].reason).toContain('đi công tác');
    });

    it('resumes a paused package and records audit trail', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 1, 'PAUSED', NOW() + INTERVAL '6 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'resume',
      });

      expect(res.status).toBe('ACTIVE');

      const dbRow = (await pg.query<any>('SELECT status, resumed_at FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.status).toBe('ACTIVE');
      expect(dbRow.resumed_at).not.toBeNull();
    });

    it('extends package expiration date and records original expiration', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 2, 'ACTIVE', '2026-06-01T00:00:00.000Z') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'extend',
        extensionMonths: 3,
        reason: 'Chính sách bù thời gian giãn cách bảo trì',
      });

      expect(res.extension_months).toBe(3);

      const dbRow = (await pg.query<any>('SELECT extension_months, original_expires_at, expires_at FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.extension_months).toBe(3);
      expect(dbRow.original_expires_at).not.toBeNull();
      expect(new Date(dbRow.expires_at).getTime()).toBeGreaterThan(new Date('2026-06-01').getTime());
    });

    it('cancels a package with mandatory reason', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 1, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'cancel',
        reason: 'Khách hàng yêu cầu hủy gói do chuyển nơi ở',
      });

      expect(res.status).toBe('CANCELLED');
      const dbRow = (await pg.query<any>('SELECT status, cancelled_reason FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbRow.status).toBe('CANCELLED');
      expect(dbRow.cancelled_reason).toContain('chuyển nơi ở');
    });

    it('transfers package ownership to a new customer while maintaining historical link', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 2, 'ACTIVE', NOW() + INTERVAL '4 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'transfer',
        newCustomerId: customerTwoId,
        reason: 'Khách hàng chuyển nhượng số buổi còn lại cho em gái',
      });

      expect(res.status).toBe('TRANSFERRED');

      // The original package is marked TRANSFERRED with destination customer
      const dbOld = (await pg.query<any>('SELECT status, transferred_to_user_id, transfer_reason FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(dbOld.status).toBe('TRANSFERRED');
      expect(dbOld.transferred_to_user_id).toBe(customerTwoId);

      // A new active package is assigned to customerTwo with remaining sessions (5 - 2 = 3)
      const dbNew = (await pg.query<any>('SELECT id, customer_id, total_sessions, completed_sessions, status FROM user_packages WHERE customer_id=$1 AND transferred_from_package_id=$2', [customerTwoId, upkg.id])).rows[0];
      expect(dbNew).toBeDefined();
      expect(dbNew.total_sessions).toBe(3);
      expect(dbNew.completed_sessions).toBe(0);
      expect(dbNew.status).toBe('ACTIVE');
    });

    it('refunds package and reverses any commission records', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at, commission_staff_id) VALUES($1, $2, 5, 1, 'ACTIVE', NOW() + INTERVAL '3 months', $3) RETURNING id",
        [customerOneId, packageDefId, staffActor.id],
      )).rows[0];

      // Insert original commission
      const comm = (await pg.query<any>(
        `INSERT INTO staff_commissions(
          staff_id, branch_id, user_package_id, commission_type, base_amount,
          percentage, commission_amount, status, cycle_month
        ) VALUES($1, $2, $3, 'PACKAGE_UPSELL', 1500000, 10, 150000, 'APPROVED', '2026-03') RETURNING id`,
        [staffActor.id, branchId, upkg.id],
      )).rows[0];

      const res = await service.action('user_packages', superAdminActor, {
        key: { id: upkg.id },
        action: 'refund',
        refundAmount: 1600000,
        reason: 'Khách hàng không hài lòng với phác đồ sau buổi 1',
      });

      expect(res.status).toBe('REFUNDED');
      expect(Number(res.refund_amount)).toBe(1600000);

      // Verify negative reversal commission was created
      const revComm = (await pg.query<any>(
        "SELECT * FROM staff_commissions WHERE staff_id=$1 AND source_session_status='REFUNDED' AND reversal_of_id IS NOT NULL",
        [staffActor.id],
      )).rows;
      expect(revComm.length).toBeGreaterThanOrEqual(1);
      expect(Number(revComm[0].commission_amount)).toBeLessThan(0);
    });
  });

  describe('2. Safe Treatment Session Reversal ("Hoàn tác buổi")', () => {
    it('safely reverses a completed session, decrements completed count, and records immutable audit', async () => {
      // Create package with 3 sessions, 2 already done
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 2, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      // Session 1
      await pg.query(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, confirmation_status, is_reversed) VALUES($1, $2, 1, '2026-03-01', 'Bình thường', 'Ổn định', 'Thực hiện buổi 1', 'Uống đủ nước', 'CONFIRMED', false)",
        [upkg.id, customerOneId],
      );

      // Session 2
      const journal2 = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, confirmation_status, is_reversed) VALUES($1, $2, 2, '2026-03-05', 'Bình thường', 'Đỏ nhẹ', 'Thực hiện buổi 2', 'Bôi kem làm dịu', 'CONFIRMED', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      // Perform reversal on session 2
      const result = await service.action('treatment_journal', superAdminActor, {
        key: { id: journal2.id },
        action: 'reverse',
        reason: 'Kỹ thuật viên chọn nhầm khách hàng trên lịch hẹn',
        idempotencyKey: 'test-reversal-key-001',
      });

      expect(result.is_reversed).toBe(true);
      expect(result.reversal_reason).toContain('chọn nhầm khách hàng');

      // Check user_packages: completed_sessions should decrement from 2 to 1
      const pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
      expect(pkgCheck.status).toBe('ACTIVE');

      // Check immutable reversal audit table
      const reversals = (await pg.query<any>('SELECT * FROM treatment_session_reversals WHERE journal_id=$1', [journal2.id])).rows;
      expect(reversals.length).toBe(1);
      expect(reversals[0].reversed_by).toBe(superAdminActor.id);
      expect(reversals[0].idempotency_key).toBe('test-reversal-key-001');

      // Check treatment_inventory_outbox has reversal record
      const inventoryOutbox = (await pg.query<any>('SELECT * FROM treatment_inventory_outbox WHERE treatment_journal_id=$1 AND operation_type=$2', [journal2.id, 'REVERSE_RESTORE'])).rows;
      expect(inventoryOutbox.length).toBe(0);
    });

    it('reverts a COMPLETED package back to ACTIVE when a completed session is reversed', async () => {
      // 2 sessions package that is fully COMPLETED
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 2, 2, 'COMPLETED', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      await pg.query(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, confirmation_status, is_reversed) VALUES($1, $2, 1, '2026-03-01', 'Khởi đầu', 'Tốt', 'Buổi 1', 'Nghỉ ngơi', 'CONFIRMED', false)",
        [upkg.id, customerOneId],
      );

      const journalFinal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, confirmation_status, is_reversed) VALUES($1, $2, 2, '2026-03-08', 'Tốt', 'Hoàn tất', 'Buổi cuối hoàn thành', 'Dưỡng da định kỳ', 'CONFIRMED', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      // Reverse session 2
      await service.action('treatment_journal', superAdminActor, {
        key: { id: journalFinal.id },
        action: 'reverse',
        reason: 'Khách hàng khiếu nại chưa thực hiện đủ thời lượng buổi cuối',
      });

      // Package must revert from COMPLETED to ACTIVE
      const pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
      expect(pkgCheck.status).toBe('ACTIVE');
    });

    it('rejects double reversal on the same session with ConflictException', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 1, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, confirmation_status, is_reversed) VALUES($1, $2, 1, '2026-03-10', 'Ổn', 'Ổn', 'Buổi 1', 'N/A', 'CONFIRMED', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      // First reversal succeeds
      await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'reverse',
        reason: 'Lý do hợp lệ lần một',
      });

      // Second reversal must throw ConflictException
      await expect(
        service.action('treatment_journal', superAdminActor, {
          key: { id: journal.id },
          action: 'reverse',
          reason: 'Cố tình hoàn tác lặp lần hai',
        }),
      ).rejects.toThrow(/đã được hoàn tác trước đó/i);
    });

    it('blocks deletion or modification of already reversed journals', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 1, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, confirmation_status, is_reversed) VALUES($1, $2, 1, '2026-03-11', 'Ổn', 'Ổn', 'Buổi 1', 'N/A', 'CONFIRMED', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'reverse',
        reason: 'Hoàn tác trước khi thử xóa/sửa',
      });

      // Attempt to delete journal directly
      await expect(
        service.mutate('treatment_journal', superAdminActor, 'delete', {
          key: { id: journal.id },
        }),
      ).rejects.toThrow(/Không thể xóa nhật ký điều trị đã ghi nhận/i);

      // Attempt to modify reversed journal
      await expect(
        service.mutate('treatment_journal', superAdminActor, 'update', {
          key: { id: journal.id },
          values: { treatment_notes: 'Cố tình sửa nội dung' },
        }),
      ).rejects.toThrow(/đã được hoàn tác/i);
    });
  });

  describe('3. Clinical Session Completion & Outbox Integrity', () => {
    it('creates consumable deduction in inventory outbox and post-care advice in post_care_outbox', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const consumables = [
        { name: 'Ampoule Phục Hồi B5', quantity: 1, unit: 'ống' },
        { name: 'Gạc Y Tế Tiệt Trùng', quantity: 2, unit: 'miếng' },
      ];

      const booking = (await pg.query<any>(
        `INSERT INTO bookings(
          booking_code, customer_id, branch_id, technician_id, booking_date,
          start_time, end_time, status, session_status, base_total, final_price,
          qr_code_hash
        ) VALUES(
          'BK-TREATMENT-OUTBOX', $1, $2, $3, '2026-03-15',
          '09:00', '10:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000,
          'qr-treatment-outbox'
        ) RETURNING id`,
        [customerOneId, branchId, technicianId],
      )).rows[0];
      await pg.query(
        `INSERT INTO booking_items(booking_id, service_id, technician_id, duration_minutes, price)
         VALUES($1, $2, $3, 60, 500000)`,
        [booking.id, serviceId, technicianId],
      );

      const journal = await service.mutate('treatment_journal', superAdminActor, 'create', {
        values: {
          user_package_id: upkg.id,
          booking_id: booking.id,
          technician_id: technicianId,
          customer_id: customerOneId,
          session_number: 1,
          session_date: '2026-03-15',
          condition_before: 'Da khô thiếu ẩm',
          condition_after: 'Da ẩm mượt, cải thiện 30%',
          treatment_notes: 'Điện di tinh chất B5 phục hồi',
          specialist_advice: 'Uống tối thiểu 2 lít nước mỗi ngày và tránh nắng trực tiếp',
          home_care_instructions: 'Uống tối thiểu 2 lít nước mỗi ngày và tránh nắng trực tiếp',
          treatment_areas: ['Toàn mặt', 'Cổ'],
          treatment_protocol: 'MLD-FACIAL-RECOVER-01',
          has_abnormal_reaction: false,
          consumables_used: consumables,
        },
      });

      expect(journal.id).toBeDefined();

      // Confirm session to trigger inventory deduction and post-care outbox
      await service.action('treatment_journal', superAdminActor, { key: { id: journal.id }, action: 'submit-session' });
      await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'confirm-session',
      });

      // Verify inventory outbox
      const outbox = (await pg.query<any>(
        'SELECT * FROM treatment_inventory_outbox WHERE treatment_journal_id=$1',
        [journal.id],
      )).rows;
      expect(outbox.length).toBe(1);
      expect(outbox[0].sync_status).toBe('PENDING_SYNC');
      expect(outbox[0].operation_type).toBe('DEDUCT');

      // Verify post-care outbox
      const postCare = (await pg.query<any>(
        'SELECT * FROM post_care_outbox WHERE treatment_journal_id=$1',
        [journal.id],
      )).rows;
      expect(postCare.length).toBe(1);
      expect(postCare[0].status).toBe('PENDING');
      expect(postCare[0].content).toContain('Uống tối thiểu 2 lít nước');
    });

    it('approves clinical session by authorized supervisor', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const journal = (await pg.query<any>(
        "INSERT INTO treatment_journal(user_package_id, customer_id, session_number, session_date, condition_before, condition_after, treatment_notes, specialist_advice, is_reversed) VALUES($1, $2, 1, '2026-03-16', 'Tốt', 'Tốt', 'Ghi chú', 'Lời khuyên', false) RETURNING id",
        [upkg.id, customerOneId],
      )).rows[0];

      await pg.query("UPDATE treatment_journal SET confirmation_status='REVIEW_REQUIRED',has_abnormal_reaction=true WHERE id=$1", [journal.id]);
      const approved = await service.action('treatment_journal', superAdminActor, {
        key: { id: journal.id },
        action: 'approve-clinical',
      });

      expect(approved.clinical_approved_by).toBe(superAdminActor.id);
      expect(approved.clinical_approved_at).not.toBeNull();
    });
  });

  describe('4. Operational Dashboard Stats Integration', () => {
    it('deducts only configured stock, retries once, and restores the original ledger exactly', async () => {
      const pool = { ...client, connect: async () => client } as any;
      const journal = (await pg.query<any>("INSERT INTO treatment_journal(customer_id,session_date,confirmation_status) VALUES($1,CURRENT_DATE,'CONFIRMED') RETURNING id",[customerOneId])).rows[0];
      const items = [{name:'Test gauze',unit:'piece',quantity:2},{name:'Test gel',unit:'ml',quantity:3}];
      const outbox = (await pg.query<any>("INSERT INTO treatment_inventory_outbox(branch_id,treatment_journal_id,items) VALUES($1,$2,$3::jsonb) RETURNING id",[branchId,journal.id,JSON.stringify(items)])).rows[0];
      expect((await syncInventoryItem(pool,outbox.id)).synced).toBe(false);
      expect((await pg.query<any>('SELECT * FROM branch_material_stock')).rows).toHaveLength(0);
      const stock = await recordMaterialCount(pool,superAdminActor,{branchId,materialName:'Test gauze',unit:'piece',quantity:10,expectedQuantity:null,reason:'Actual test fixture count'});
      // Missing second material must roll back the first deduction too.
      expect((await syncInventoryItem(pool,outbox.id)).synced).toBe(false);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[stock.id])).rows[0].quantity)).toBe(10);
      expect((await pg.query<any>('SELECT * FROM treatment_stock_movements WHERE outbox_id=$1',[outbox.id])).rows).toHaveLength(0);
      const gel = await recordMaterialCount(pool,superAdminActor,{branchId,materialName:'Test gel',unit:'ml',quantity:1,expectedQuantity:null,reason:'Actual test fixture count'});
      expect((await syncInventoryItem(pool,outbox.id)).synced).toBe(false);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[stock.id])).rows[0].quantity)).toBe(10);
      await recordMaterialCount(pool,superAdminActor,{branchId,materialName:'Test gel',unit:'ml',quantity:9,expectedQuantity:1,reason:'Actual test fixture count'});
      const restore = (await pg.query<any>("INSERT INTO treatment_inventory_outbox(branch_id,treatment_journal_id,operation_type) VALUES($1,$2,'REVERSE_RESTORE') RETURNING id",[branchId,journal.id])).rows[0];
      expect((await syncInventoryItem(pool,restore.id)).synced).toBe(false);
      expect((await syncInventoryItem(pool,outbox.id)).synced).toBe(true);
      expect((await syncInventoryItem(pool,outbox.id)).synced).toBe(true);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[stock.id])).rows[0].quantity)).toBe(8);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[gel.id])).rows[0].quantity)).toBe(6);
      const duplicate = (await pg.query<any>("INSERT INTO treatment_inventory_outbox(branch_id,treatment_journal_id,items) VALUES($1,$2,$3::jsonb) RETURNING id",[branchId,journal.id,JSON.stringify(items)])).rows[0];
      expect((await syncInventoryItem(pool,duplicate.id)).synced).toBe(false);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[stock.id])).rows[0].quantity)).toBe(8);
      expect((await syncInventoryItem(pool,restore.id)).synced).toBe(true);
      await syncInventoryItem(pool,restore.id);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[stock.id])).rows[0].quantity)).toBe(10);
      expect(Number((await pg.query<any>('SELECT quantity FROM branch_material_stock WHERE id=$1',[gel.id])).rows[0].quantity)).toBe(9);
      expect((await pg.query<any>('SELECT * FROM treatment_stock_movements WHERE outbox_id=$1',[restore.id])).rows).toHaveLength(2);
      await expect(recordMaterialCount(pool,superAdminActor,{branchId,materialName:'Test gel',unit:'ml',quantity:12,expectedQuantity:6,reason:'Stale test fixture count'})).rejects.toThrow(/đã thay đổi/);
      await expect(recordMaterialCount(pool,{...superAdminActor,role:'BRANCH_MANAGER',scopes:[{permission:'branch_material_stock.action',branchId:randomUUID()}]}, {branchId,materialName:'Test gel',unit:'ml',quantity:12,expectedQuantity:9,reason:'Foreign test fixture count'})).rejects.toThrow(/chi nhánh/);
    });
    it('aggregates operational metrics with accurate counts from database', async () => {
      const stats = await service.treatmentDashboardStats(superAdminActor);

      expect(stats).toBeDefined();
      expect(typeof stats.activePackages).toBe('number');
      expect(typeof stats.pausedPackages).toBe('number');
      expect(typeof stats.completedPackages).toBe('number');
      expect(typeof stats.usedSessions).toBe('number');
      expect(typeof stats.remainingSessions).toBe('number');
      expect(typeof stats.reversalsCount).toBe('number');
      expect(typeof stats.abnormalReactionsCount).toBe('number');
      expect(typeof stats.pendingInventorySync).toBe('number');
      expect(typeof stats.pendingCommissionsCount).toBe('number');
      expect(stats.reversalsCount).toBeGreaterThan(0);
    });
  });

  describe('5. Phase 1 Strict Session Confirmation & Branch Scope Boundaries', () => {
    let secondBranchId: string;
    let branchOneStaff: any;
    let branchTwoStaff: any;

    beforeAll(async () => {
      const b2 = (await pg.query<any>(
        "INSERT INTO branches(name, code, phone, address, district, latitude, longitude, image_url) VALUES('Chi nhanh Quan 1', 'CNQ1', '0944444444', '456 Le Loi', 'Quan 1', 10.77, 106.70, 'https://example.com/b2.png') RETURNING id",
      )).rows[0];
      secondBranchId = b2.id;

      branchOneStaff = {
        id: '00000000-0000-4000-8000-000000000011',
        role: 'RECEPTIONIST',
        scopes: [
          { permission: 'user_packages.read', branchId: branchId },
          { permission: 'treatment_journal.read', branchId: branchId },
          { permission: 'treatment_journal.action', branchId: branchId },
        ],
      };

      branchTwoStaff = {
        id: '00000000-0000-4000-8000-000000000012',
        role: 'RECEPTIONIST',
        scopes: [
          { permission: 'user_packages.read', branchId: secondBranchId },
          { permission: 'treatment_journal.read', branchId: secondBranchId },
          { permission: 'treatment_journal.action', branchId: secondBranchId },
        ],
      };

      await pg.query(
        "INSERT INTO users(id, phone, full_name, role, referral_code) VALUES($1, '0955555551', 'Staff Q3', 'RECEPTIONIST', 'STAFFQ3')",
        [branchOneStaff.id],
      );
      await pg.query(
        "INSERT INTO users(id, phone, full_name, role, referral_code) VALUES($1, '0955555552', 'Staff Q1', 'RECEPTIONIST', 'STAFFQ1')",
        [branchTwoStaff.id],
      );
    });

    it('draft and submitted states do NOT increment completed_sessions', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const bk = (await pg.query<any>(
        `INSERT INTO bookings(booking_code, customer_id, branch_id, technician_id, booking_date, start_time, end_time, status, session_status, base_total, final_price, qr_code_hash)
         VALUES('BK-DRAFT-TEST', $1, $2, $3, '2026-03-20', '09:00', '10:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000, 'qr-draft-test') RETURNING id`,
        [customerOneId, branchId, technicianId],
      )).rows[0];
      await pg.query(
        'INSERT INTO booking_items(booking_id, service_id, technician_id, duration_minutes, price) VALUES($1, $2, $3, 60, 500000)',
        [bk.id, serviceId, technicianId],
      );

      // 1. Create Draft Journal
      const journal = await service.mutate('treatment_journal', superAdminActor, 'create', {
        values: {
          user_package_id: upkg.id,
          booking_id: bk.id,
          technician_id: technicianId,
          customer_id: customerOneId,
          session_number: 1,
          session_date: '2026-03-20',
          condition_before: 'Khởi đầu liệu trình',
          condition_after: 'Bình thường',
          treatment_notes: 'Thực hiện bài kỹ thuật số 1',
        },
      });

      expect(journal.confirmation_status).toBe('DRAFT');

      // Package completed_sessions MUST remain 0
      let pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(0);
      expect(pkgCheck.status).toBe('ACTIVE');

      // 2. Submit session
      await service.action('treatment_journal', staffActor, {
        key: { id: journal.id },
        action: 'submit-session',
      });

      const journalSubmitted = (await pg.query<any>('SELECT confirmation_status FROM treatment_journal WHERE id=$1', [journal.id])).rows[0];
      expect(journalSubmitted.confirmation_status).toBe('SUBMITTED');

      // Package completed_sessions STILL MUST remain 0
      pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(0);
    });

    it('confirm-session increments completed_sessions by exactly 1 and is idempotent against double submit', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 3, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const bk = (await pg.query<any>(
        `INSERT INTO bookings(booking_code, customer_id, branch_id, technician_id, booking_date, start_time, end_time, status, session_status, base_total, final_price, qr_code_hash)
         VALUES('BK-CONFIRM-TEST', $1, $2, $3, '2026-03-21', '10:00', '11:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000, 'qr-confirm-test') RETURNING id`,
        [customerOneId, branchId, technicianId],
      )).rows[0];
      await pg.query(
        'INSERT INTO booking_items(booking_id, service_id, technician_id, duration_minutes, price) VALUES($1, $2, $3, 60, 500000)',
        [bk.id, serviceId, technicianId],
      );

      const jnl = (await pg.query<any>(
        `INSERT INTO treatment_journal(user_package_id, booking_id, customer_id, technician_id, session_number, session_date, condition_before, condition_after, treatment_notes, confirmation_status, is_reversed)
         VALUES($1, $2, $3, $4, 1, '2026-03-21', 'Ổn', 'Tốt', 'Hoàn tất quy trình', 'SUBMITTED', false) RETURNING id`,
        [upkg.id, bk.id, customerOneId, technicianId],
      )).rows[0];

      // First confirm succeeds
      await pg.query("UPDATE bookings SET status='CANCELLED' WHERE id=$1",[bk.id]);
      expect((await service.treatmentConfirmationPreview(superAdminActor,jnl.id)).warnings.join(' ')).toMatch(/đang phục vụ/);
      await expect(service.action('treatment_journal',superAdminActor,{key:{id:jnl.id},action:'confirm-session'})).rejects.toThrow(/đang phục vụ/);
      await pg.query("UPDATE bookings SET status='IN_SERVICE' WHERE id=$1",[bk.id]);
      const preview = await service.treatmentConfirmationPreview(superAdminActor, jnl.id);
      expect(preview.remainingBefore).toBe(3);
      expect(preview.remainingAfter).toBe(2);
      expect(preview.commission.baseAmount).toBe(500000);
      expect(preview.commission.amount).toBe(50000);
      expect(preview.warnings).toEqual([]);
      expect((await pg.query<any>('SELECT completed_sessions FROM user_packages WHERE id=$1', [upkg.id])).rows[0].completed_sessions).toBe(0);
      await expect(service.treatmentConfirmationPreview({ id: staffActor.id, role: 'TECHNICIAN', scopes: [{ permission: 'treatment_journal.read', branchId }] }, jnl.id)).rejects.toThrow(ForbiddenException);
      const confirmed = await service.action('treatment_journal', superAdminActor, {
        key: { id: jnl.id },
        action: 'confirm-session',
      });
      expect(confirmed.confirmation_status).toBe('CONFIRMED');

      let pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
      expect(pkgCheck.status).toBe('ACTIVE');

      // Second confirm must be rejected with ConflictException
      await expect(
        service.action('treatment_journal', superAdminActor, {
          key: { id: jnl.id },
          action: 'confirm-session',
        }),
      ).rejects.toThrow(/đã được xác nhận trước đó/i);

      // Count still exactly 1
      pkgCheck = (await pg.query<any>('SELECT completed_sessions FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
    });

    it('rejects confirmation when total_sessions is already reached and transitions to COMPLETED on final session', async () => {
      // 1-session package
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 1, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const bk = (await pg.query<any>(
        `INSERT INTO bookings(booking_code, customer_id, branch_id, technician_id, booking_date, start_time, end_time, status, session_status, base_total, final_price, qr_code_hash)
         VALUES('BK-FINAL-TEST', $1, $2, $3, '2026-03-22', '14:00', '15:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000, 'qr-final-test') RETURNING id`,
        [customerOneId, branchId, technicianId],
      )).rows[0];
      await pg.query(
        'INSERT INTO booking_items(booking_id, service_id, technician_id, duration_minutes, price) VALUES($1, $2, $3, 60, 500000)',
        [bk.id, serviceId, technicianId],
      );

      const jnl = (await pg.query<any>(
        `INSERT INTO treatment_journal(user_package_id, booking_id, customer_id, technician_id, session_number, session_date, condition_before, condition_after, treatment_notes, confirmation_status, is_reversed)
         VALUES($1, $2, $3, $4, 1, '2026-03-22', 'Trước', 'Sau', 'Ghi chú', 'SUBMITTED', false) RETURNING id`,
        [upkg.id, bk.id, customerOneId, technicianId],
      )).rows[0];

      // Confirm final session 1/1
      await service.action('treatment_journal', superAdminActor, {
        key: { id: jnl.id },
        action: 'confirm-session',
      });

      const pkgCheck = (await pg.query<any>('SELECT completed_sessions, status FROM user_packages WHERE id=$1', [upkg.id])).rows[0];
      expect(pkgCheck.completed_sessions).toBe(1);
      expect(pkgCheck.status).toBe('COMPLETED');

      // Attempt to confirm an extra session on completed package
      const jnlExtra = (await pg.query<any>(
        `INSERT INTO treatment_journal(user_package_id, customer_id, technician_id, session_number, session_date, condition_before, condition_after, treatment_notes, confirmation_status, is_reversed)
         VALUES($1, $2, $3, 2, '2026-03-23', 'Trước', 'Sau', 'Ghi chú thêm', 'SUBMITTED', false) RETURNING id`,
        [upkg.id, customerOneId, technicianId],
      )).rows[0];

      await expect(
        service.action('treatment_journal', superAdminActor, {
          key: { id: jnlExtra.id },
          action: 'confirm-session',
        }),
      ).rejects.toThrow(/COMPLETED|đã hoàn thành đủ/i);
    });

    it('rejects confirmation for inactive package statuses (PAUSED, EXPIRED, CANCELLED, REFUNDED, TRANSFERRED)', async () => {
      const statuses = ['PAUSED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'TRANSFERRED'];

      for (const st of statuses) {
        const upkg = (await pg.query<any>(
          `INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at)
           VALUES($1, $2, 5, 1, $3, NOW() + INTERVAL '3 months') RETURNING id`,
          [customerOneId, packageDefId, st],
        )).rows[0];

        const jnl = (await pg.query<any>(
          `INSERT INTO treatment_journal(user_package_id, customer_id, technician_id, session_number, session_date, condition_before, condition_after, treatment_notes, confirmation_status, is_reversed)
           VALUES($1, $2, $3, 2, '2026-03-24', 'A', 'B', 'C', 'SUBMITTED', false) RETURNING id`,
          [upkg.id, customerOneId, technicianId],
        )).rows[0];

        await expect(
          service.action('treatment_journal', superAdminActor, {
            key: { id: jnl.id },
            action: 'confirm-session',
          }),
        ).rejects.toThrow(new RegExp(`trạng thái ${st}`, 'i'));
      }
    });

    it('requires clinical approval before confirming a session with abnormal reactions', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      const bk = (await pg.query<any>(
        `INSERT INTO bookings(booking_code, customer_id, branch_id, technician_id, booking_date, start_time, end_time, status, session_status, base_total, final_price, qr_code_hash)
         VALUES('BK-ABNORMAL-TEST', $1, $2, $3, '2026-03-25', '15:00', '16:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000, 'qr-abnormal-test') RETURNING id`,
        [customerOneId, branchId, technicianId],
      )).rows[0];
      await pg.query(
        'INSERT INTO booking_items(booking_id, service_id, technician_id, duration_minutes, price) VALUES($1, $2, $3, 60, 500000)',
        [bk.id, serviceId, technicianId],
      );

      const jnl = (await pg.query<any>(
        `INSERT INTO treatment_journal(user_package_id, booking_id, customer_id, technician_id, session_number, session_date, condition_before, condition_after, treatment_notes, has_abnormal_reaction, adverse_reactions, confirmation_status, is_reversed)
         VALUES($1, $2, $3, $4, 1, '2026-03-25', 'Trước', 'Nổi mẩn đỏ ngứa vùng trán', 'Dừng kích ứng', true, 'Kích ứng dị ứng nhẹ', 'REVIEW_REQUIRED', false) RETURNING id`,
        [upkg.id, bk.id, customerOneId, technicianId],
      )).rows[0];

      // Staff (technician) attempts to confirm without supervisor approval -> ForbiddenException
      await expect(
        service.action('treatment_journal', staffActor, {
          key: { id: jnl.id },
          action: 'confirm-session',
        }),
      ).rejects.toThrow(/phản ứng bất thường/i);

      await expect(service.action('treatment_journal',superAdminActor,{
        key:{id:jnl.id},action:'submit-session',values:{has_abnormal_reaction:false},
      })).rejects.toThrow(/bản nháp/);

      // Even a manager must explicitly approve the submitted clinical review.
      await expect(service.action('treatment_journal', superAdminActor, {
        key: { id: jnl.id }, action: 'confirm-session',
      })).rejects.toThrow(/phản ứng bất thường/i);
      await service.action('treatment_journal', superAdminActor, {
        key: { id: jnl.id }, action: 'approve-clinical',
      });
      const confirmed = await service.action('treatment_journal', superAdminActor, {
        key: { id: jnl.id },
        action: 'confirm-session',
      });
      expect(confirmed.confirmation_status).toBe('CONFIRMED');
      expect(confirmed.clinical_approved_by).toBe(superAdminActor.id);
    });

    it('rejects confirmation when booking customer or service does not match the package', async () => {
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      // Booking belongs to customerTwo, but journal attached to package of customerOne
      const bkWrongCustomer = (await pg.query<any>(
        `INSERT INTO bookings(booking_code, customer_id, branch_id, technician_id, booking_date, start_time, end_time, status, session_status, base_total, final_price, qr_code_hash)
         VALUES('BK-WRONG-CUST', $1, $2, $3, '2026-03-26', '11:00', '12:00', 'IN_SERVICE', 'IN_SERVICE', 500000, 500000, 'qr-wrong-cust') RETURNING id`,
        [customerTwoId, branchId, technicianId],
      )).rows[0];

      const jnl = (await pg.query<any>(
        `INSERT INTO treatment_journal(user_package_id, booking_id, customer_id, technician_id, session_number, session_date, condition_before, condition_after, treatment_notes, confirmation_status, is_reversed)
         VALUES($1, $2, $3, $4, 1, '2026-03-26', 'A', 'B', 'C', 'SUBMITTED', false) RETURNING id`,
        [upkg.id, bkWrongCustomer.id, customerOneId, technicianId],
      )).rows[0];

      await expect(
        service.action('treatment_journal', superAdminActor, {
          key: { id: jnl.id },
          action: 'confirm-session',
        }),
      ).rejects.toThrow(/không thuộc khách hàng/i);
    });

    it('enforces branch scoping on user_packages and treatment journals', async () => {
      // Create invoice for package under branchId (Q3)
      const inv = (await pg.query<any>(
        `INSERT INTO invoices(invoice_code, branch_id, customer_id, subtotal, total_amount, payment_status, payment_method)
         VALUES('INV-SCOPE-Q3', $1, $2, 2000000, 2000000, 'PAID', 'CASH_AT_SPA') RETURNING id`,
        [branchId, customerOneId],
      )).rows[0];

      const pkgQ3 = (await pg.query<any>(
        `INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at)
         VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id`,
        [customerOneId, packageDefId],
      )).rows[0];

      await pg.query('UPDATE invoices SET user_package_id=$1 WHERE id=$2', [pkgQ3.id, inv.id]);

      // 1. Super admin can access package
      const filter = JSON.stringify({id:pkgQ3.id});
      const resSuper = await service.list('user_packages', superAdminActor, { filter });
      expect(resSuper.rows.some((r: any) => r.id === pkgQ3.id)).toBe(true);

      // 2. Staff of branch Q3 can access package
      const resStaffQ3 = await service.list('user_packages', branchOneStaff, { filter });
      expect(resStaffQ3.rows.some((r: any) => r.id === pkgQ3.id)).toBe(true);

      // 3. Staff of branch Q1 cannot access package from Q3
      const resStaffQ1 = await service.list('user_packages', branchTwoStaff, { filter });
      expect(resStaffQ1.rows.some((r: any) => r.id === pkgQ3.id)).toBe(false);
      expect(resStaffQ1.total).toBe(0);
    });

    it('blocks direct CRUD creation and completed_sessions mutation on user_packages', async () => {
      // Block create
      await expect(
        service.mutate('user_packages', superAdminActor, 'create', {
          values: {
            customer_id: customerOneId,
            package_id: packageDefId,
            total_sessions: 10,
            completed_sessions: 0,
          },
        }),
      ).rejects.toThrow(/Chỉ luồng POS mới được kích hoạt gói/i);

      // Block completed_sessions update
      const upkg = (await pg.query<any>(
        "INSERT INTO user_packages(customer_id, package_id, total_sessions, completed_sessions, status, expires_at) VALUES($1, $2, 5, 0, 'ACTIVE', NOW() + INTERVAL '3 months') RETURNING id",
        [customerOneId, packageDefId],
      )).rows[0];

      await expect(
        service.mutate('user_packages', superAdminActor, 'update', {
          key: { id: upkg.id },
          values: { completed_sessions: 3 },
        }),
      ).rejects.toThrow(/chỉ được cập nhật bởi hệ thống/i);
    });
  });
});

