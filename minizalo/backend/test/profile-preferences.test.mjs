import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {statements} from '../migrations/017_profile_preferences.mjs';
test('optional profile preferences fail explicitly on the old schema and persist owner-only after additive migration',async()=>{
  const f=await workflowFixture(),{db,id,request}=f;
  try{
    const denied=await request('/auth/profile',{method:'PUT',body:{name:'Should roll back',occupation:'Actual profession'}});
    assert.equal(denied.status,409,JSON.stringify(denied));assert.equal(denied.code,'PROFILE_SCHEMA_REQUIRED');
    assert.equal((await db.query('SELECT full_name FROM users WHERE id=$1',[id(1)])).rows[0].full_name,'Workflow customer');
    await db.exec(statements.join(';'));await db.exec(statements.join(';'));
    const saved=await request('/auth/profile',{method:'PUT',body:{userId:id(2),occupation:'Actual therapist',emergencyContactName:'Actual contact',emergencyContactPhone:'0900000002'}});
    assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(saved.data.user.occupation,'Actual therapist');assert.equal(saved.data.user.profileExtended,true);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_customer_profiles WHERE user_id=$1',[id(2)])).rows[0].n,0);
    for(const body of [{theme:'UNKNOWN'},{courseNotify:'false'},{occupation:'x'.repeat(151)}])assert.equal((await request('/auth/settings',{method:'PUT',body})).status,400);
    const settings=await request('/auth/settings',{method:'PUT',body:{theme:'DARK',treatmentNotify:false,courseNotify:false}});assert.equal(settings.status,200,JSON.stringify(settings));assert.equal(settings.data.settings.theme,'DARK');assert.equal(settings.data.settings.courseNotify,false);
    const inbox=await request('/notifications');assert.equal(inbox.status,200);assert.equal(inbox.data.notifications.some(n=>['COURSE','TREATMENT'].includes(n.type)),false);
    assert.equal((await request('/auth/settings',{owner:2})).data.settings,null);
    assert.equal((await request('/course-enrollments')).data.enrollments.length,2);
  }finally{await f.close();}
});
