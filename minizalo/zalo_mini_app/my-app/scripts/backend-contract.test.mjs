import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkBackendContract,requiredFeatures} from './backend-contract.mjs';

test('release rejects the old production login contract even when health is green',()=>{
  const missing=checkBackendContract({success:true,data:{status:'ok',authFlow:'zalo-phone-registration',contentContract:'shared-admin-v1',features:['staff-booking-v1']}});
  assert.deepEqual(missing,requiredFeatures);
});
test('release requires successful health and all matching capabilities',()=>{
  assert.deepEqual(checkBackendContract({success:true,data:{status:'ok',authFlow:'zalo-phone-registration',contentContract:'shared-admin-v1',features:requiredFeatures}}),[]);
  for(const value of [null,{}, {success:false,data:{status:'ok',features:requiredFeatures}}])assert.ok(checkBackendContract(value).length);
});
