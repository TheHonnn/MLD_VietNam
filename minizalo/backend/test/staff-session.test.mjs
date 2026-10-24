import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('staff session transitions persist real notes and consume a package exactly once',async t=>{
  const f=await staffFixture(),{db,id}=f;
  const update=(status,extra={},owner=90)=>f.request('/staff/bookings/'+id(96)+'/status',{method:'PATCH',owner,body:{status,...extra}});
  try{
    await db.query("INSERT INTO bookings(id,booking_code,customer_id,branch_id,technician_id,assigned_room_id,booking_date,start_time,end_time,status,base_total,final_price,qr_code_hash) VALUES($1,'SESSION-FIXTURE',$2,$3,$4,$5,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'00:00','01:00','CONFIRMED',0,0,'SESSION-QR')",[id(96),id(1),id(3),id(7),id(8)]);
    await db.query('INSERT INTO miniapp_package_baselines(user_package_id,legacy_sessions) VALUES($1,0)',[id(10)]);
    await db.query('INSERT INTO miniapp_booking_packages(booking_id,user_package_id) VALUES($1,$2)',[id(96),id(10)]);
    await t.test('customer and another branch cannot change the session',async()=>{
      assert.equal((await update('CHECKED_IN',{},1)).status,403);
      assert.equal((await update('CHECKED_IN',{},91)).status,404);
      assert.equal((await update('COMPLETED',{treatmentNotes:'Cannot skip start'})).status,409);
    });
    await t.test('arrival and start follow ordered, replay-safe transitions',async()=>{
      assert.equal((await update('CHECKED_IN')).data.booking.status,'CHECKED_IN');
      assert.equal((await update('CHECKED_IN')).status,200);
      assert.equal((await update('IN_SERVICE')).data.booking.status,'IN_SERVICE');
      assert.equal((await update('COMPLETED')).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM treatment_journal WHERE booking_id=$1',[id(96)])).rows[0].total,0);
    });
    await t.test('completion records the employee action and actual care notes without a payment',async()=>{
      const done=await update('COMPLETED',{treatmentNotes:'Actual fixture care notes',conditionAfter:'Actual fixture observation'});
      assert.equal(done.status,200,JSON.stringify(done));assert.equal(done.data.booking.status,'COMPLETED');
      assert.equal(done.data.booking.packageReservationState,'CONSUMED');
      const journal=(await db.query('SELECT * FROM treatment_journal WHERE booking_id=$1',[id(96)])).rows[0];
      assert.equal(journal.customer_id,id(1));assert.equal(journal.treatment_notes,'Actual fixture care notes');assert.equal(journal.condition_after,'Actual fixture observation');
      const count=(await db.query('SELECT completed_sessions FROM user_packages WHERE id=$1',[id(10)])).rows[0].completed_sessions;
      assert.equal((await update('COMPLETED',{treatmentNotes:'Retry must not overwrite care notes'})).status,200);
      assert.equal((await db.query('SELECT completed_sessions FROM user_packages WHERE id=$1',[id(10)])).rows[0].completed_sessions,count);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM treatment_journal WHERE booking_id=$1',[id(96)])).rows[0].total,1);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM audit_logs WHERE record_id=$1 AND actor_id=$2 AND action='MINIAPP_SESSION_STATUS'",[id(96),id(90)])).rows[0].total,3);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM invoices WHERE booking_id=$1',[id(96)])).rows[0].total,0);
    });
  }finally{await f.close();}
});
