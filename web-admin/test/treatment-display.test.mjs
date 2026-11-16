import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumedSessions, belongsToPackage, availableTreatmentSessions } from '../src/services/treatment-display.mjs';
test('drafts and submitted journals cannot inflate the confirmed server counter',()=>{
  assert.equal(consumedSessions(0),0);
  assert.equal(consumedSessions('2'),2);
  assert.equal(consumedSessions(undefined),0);
});
test('a same-service booking without a package link is not attributed to a package',()=>{
  const id='00000000-0000-4000-8000-000000000001';
  assert.equal(belongsToPackage({customerId:'a',specialNotes:'same service'},'a',id),false);
  assert.equal(belongsToPackage({customerId:'a',specialNotes:`[user_package_id=${id}]`},'a',id),true);
  assert.equal(belongsToPackage({customerId:'b',specialNotes:`[user_package_id=${id}]`},'a',id),false);
  assert.equal(belongsToPackage({customerId:'a',specialNotes:`[user_package_id=${id}]`},'a','00000000-0000-4000-8000-000000000002'),false);
});

test('only active unexpired packages have usable sessions', () => {
  assert.equal(availableTreatmentSessions('ACTIVE', '20', '4', false), 16);
  assert.equal(availableTreatmentSessions('ACTIVE', 20, 20, false), 0);
  assert.equal(availableTreatmentSessions('ACTIVE', 20, 0, true), 0);
  for (const status of ['PAUSED', 'CANCELLED', 'REFUNDED', 'TRANSFERRED', 'PENDING_PAYMENT']) {
    assert.equal(availableTreatmentSessions(status, 20, 0, false), 0);
  }
});
