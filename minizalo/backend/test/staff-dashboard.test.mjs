import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('employee workspace uses real branch work rather than personal loyalty records',async t=>{
  const f=await staffFixture(),{db,id}=f;
  const read=(path,owner=90)=>f.request(path,{owner});
  try{
    await t.test('public users and customers cannot obtain staff summaries or directories',async()=>{
      for(const path of ['/staff/dashboard','/staff/customers/directory']){
        assert.equal((await f.request(path,{anonymous:true})).status,401);
        assert.equal((await read(path,1)).status,403);
      }
    });
    await t.test('profile and counters describe assigned branch work, not the staff user as a customer',async()=>{
      const own=(await read('/staff/dashboard')).data;
      assert.equal(own.profile.employeeCode,'STAFF90');assert.equal(own.scope.branchId,id(3));
      assert.equal(own.summary.upcomingBookings,1);assert.equal(own.summary.customers,1);assert.equal(own.summary.activePackages,1);
      assert.equal(own.summary.todayBookings,0);
      const other=(await read('/staff/dashboard',91)).data;
      assert.equal(other.summary.customers,0);assert.equal(other.summary.upcomingBookings,0);assert.equal(other.summary.activePackages,0);
      const admin=(await read('/staff/dashboard',92)).data;assert.equal(admin.scope.branchId,null);assert.equal(admin.summary.customers,2);
      assert.equal(own.profile.baseSalary,undefined);assert.equal(own.profile.bankAccountNumber,undefined);
    });
    await t.test('directory opens immediately, scopes every query and follows canonical Admin changes',async()=>{
      const own=(await read('/staff/customers/directory')).data;
      assert.deepEqual(own.customers.map(x=>x.id),[id(1)]);
      assert.equal(own.customers[0].email,undefined);assert.equal(own.customers[0].dateOfBirth,undefined);
      assert.deepEqual((await read('/staff/customers/directory',91)).data.customers,[]);
      assert.deepEqual((await read('/staff/customers/directory?search=0900000002')).data.customers,[]);
      await db.query("UPDATE users SET full_name='Changed by Admin',phone='0900 000 001' WHERE id=$1",[id(1)]);
      const found=(await read('/staff/customers/directory?search='+encodeURIComponent('+84 900 000 001'))).data;
      assert.equal(found.customers[0].fullName,'Changed by Admin');assert.equal(found.customers[0].id,id(1));
      assert.deepEqual((await read('/staff/customers/directory?search=%25')).data.customers,[]);
    });
    await t.test('all-branch directories paginate and invalid input fails explicitly',async()=>{
      const first=(await read('/staff/customers/directory?limit=1',92)).data;assert.ok(first.nextCursor);
      const next=(await read('/staff/customers/directory?limit=1&cursor='+encodeURIComponent(first.nextCursor),92)).data;
      assert.equal(next.customers.length,1);assert.notEqual(first.customers[0].id,next.customers[0].id);
      assert.equal((await read('/staff/customers/directory?search[]=x')).status,400);
      assert.equal((await read('/staff/customers/directory?cursor=invalid')).status,400);
    });
    await t.test('revoking the actual staff profile immediately removes access to both endpoints',async()=>{
      await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
      assert.equal((await read('/staff/dashboard')).status,403);
      assert.equal((await read('/staff/customers/directory')).status,403);
    });
  }finally{await f.close();}
});
