import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('customer availability and booking reserve actual beds without granting staff privileges',async()=>{
  const f=await staffFixture(),{db,id,day}=f;
  const input={serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',people:1,expectedFinalPrice:100000,bookedForName:'Actual booking recipient',bookedForPhone:'0900000002',specialNotes:'Nhu cầu: Kiểm tra phù bạch huyết'};
  const slots=()=>f.request('/slots?'+new URLSearchParams({branchId:id(3),date:day,serviceId:id(5)}));
  try{
    await db.query('UPDATE branch_rooms SET is_available=false WHERE id=$1',[id(8)]);
    assert.equal((await slots()).data.slots.length,0);
    assert.equal((await f.request('/bookings',{method:'POST',body:input})).status,409);
    await db.query('UPDATE branch_rooms SET is_available=true WHERE id=$1',[id(8)]);
    assert.ok((await slots()).data.slots.length>0);
    const saved=await f.request('/bookings',{method:'POST',body:input});assert.equal(saved.status,201,JSON.stringify(saved));
    const bookingId=saved.data.booking.id;
    const [row]=(await db.query('SELECT b.customer_id,b.booked_for_name,b.special_notes,b.assigned_room_id,bb.bed_number FROM bookings b JOIN miniapp_booking_beds bb ON bb.booking_id=b.id WHERE b.id=$1',[bookingId])).rows;
    assert.equal(row.customer_id,id(1));assert.equal(row.booked_for_name,input.bookedForName);assert.equal(row.assigned_room_id,id(8));
    assert.equal(row.special_notes,input.specialNotes);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_staff_bookings WHERE booking_id=$1',[bookingId])).rows[0].n,0);
    assert.equal((await f.request('/staff/context')).status,403);
    assert.equal((await f.request('/bookings',{method:'POST',body:{...input,customerId:id(2)}})).status,403);
    assert.equal((await f.request('/bookings/'+bookingId+'/cancel',{owner:2,method:'PATCH',body:{}})).status,404);
    assert.equal((await f.request('/bookings/'+bookingId+'/cancel',{method:'PATCH',body:{}})).status,200);
    assert.ok((await slots()).data.slots.length>0);
  }finally{await f.close();}
});
