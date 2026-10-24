import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('staff receive real booked-customer events and reminders without another branch or customer inbox leaking',async t=>{
  const f=await staffFixture(),{db,id,day}=f;
  const inbox=()=>f.request('/notifications',{owner:90});
  let saved,noticeId;
  try{
    saved=await f.request('/staff/bookings',{owner:90,method:'POST',body:{serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',customerId:id(1),customerPhone:'0900000001',expectedFinalPrice:100000}});
    assert.equal(saved.status,201,JSON.stringify(saved));
    await t.test('actual customer booking events are mirrored once to the employee creator',async()=>{
      const first=await inbox();assert.equal(first.status,200,JSON.stringify(first));
      const mirrored=first.data.notifications.filter(n=>n.data.sourceKey?.startsWith('staff-booking-event:'));
      assert.ok(mirrored.length>0);assert.ok(mirrored.every(n=>n.data.target.screen==='booking'&&n.data.target.entityId===saved.data.booking.id));
      noticeId=mirrored[0].id;
      const repeated=await inbox();assert.equal(repeated.data.notifications.length,first.data.notifications.length);
      assert.equal((await f.request('/notifications',{owner:91})).data.notifications.length,0);
      assert.equal((await f.request('/notifications/'+noticeId+'/read',{method:'PATCH',owner:1})).status,404);
      const read=await f.request('/notifications/'+noticeId+'/read',{method:'PATCH',owner:90});assert.equal(read.status,200);assert.equal(read.data.notification.isRead,true);
    });
    await t.test('Admin booking changes and near-term reminders target the same real appointment',async()=>{
      await db.query("UPDATE bookings SET booking_date=(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+1,start_time='00:00',end_time='01:00' WHERE id=$1",[saved.data.booking.id]);
      const result=await inbox();assert.ok(result.data.notifications.some(n=>n.data.channel==='reminder'&&n.data.target.entityId===saved.data.booking.id));
      const before=result.data.notifications.length;
      await db.query('INSERT INTO user_settings(user_id,appointment_reminder) VALUES($1,false) ON CONFLICT(user_id) DO UPDATE SET appointment_reminder=false',[id(90)]);
      const muted=await inbox();assert.equal(muted.data.notifications.filter(n=>n.data.channel==='reminder').length,0);assert.ok(muted.data.notifications.length<before);
    });
    await t.test('transfer, demotion and revocation remove access without deleting historical events',async()=>{
      await db.query('UPDATE staff_profiles SET branch_id=$1 WHERE user_id=$2',[id(104),id(90)]);
      const moved=await inbox();assert.equal(moved.status,200);assert.equal(moved.data.notifications.length,0);
      assert.equal((await f.request('/notifications/'+noticeId+'/read',{method:'PATCH',owner:90})).status,404);
      assert.ok((await db.query('SELECT count(*)::int AS n FROM notifications WHERE user_id=$1',[id(90)])).rows[0].n>0);
      await db.query("UPDATE users SET role='CUSTOMER' WHERE id=$1",[id(90)]);
      assert.equal((await inbox()).data.notifications.length,0);
      await db.query("UPDATE users SET role='RECEPTIONIST' WHERE id=$1",[id(90)]);
      await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
      assert.equal((await inbox()).status,403);
    });
  }finally{await f.close();}
});
