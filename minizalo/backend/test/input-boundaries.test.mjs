import {test} from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {workflowFixture} from './fixtures/workflow.mjs';

test('profile and registration preserve explicit input types and complete dates',async t=>{
  const f=await workflowFixture();
  try{
    for(const [label,body] of [
      ['false avatar',{avatarUrl:false}],['zero avatar',{avatarUrl:0}],
      ['invalid HTTPS avatar',{avatarUrl:'https://'}],
      ['avatar URL with credentials',{avatarUrl:'https://user:password@example.test/avatar.jpg'}],
      ['invalid data URL',{avatarUrl:'data:image/png;base64,not_base64!'}],
      ['false date',{dateOfBirth:false}],['zero date',{dateOfBirth:0}],
      ['date with arbitrary suffix',{dateOfBirth:'2000-01-01garbage'}],
      ['timestamp instead of calendar date',{dateOfBirth:'2000-01-01T00:00:00Z'}],
      ['PostgreSQL has no year zero',{dateOfBirth:'0000-01-01'}],
      ['null name',{fullName:null}],
    ])await t.test(label,async()=>{
      const before=(await f.db.query('SELECT full_name,avatar_url,date_of_birth FROM users WHERE id=$1',[f.id(1)])).rows[0];
      const result=await f.request('/auth/profile',{method:'PUT',body});
      assert.equal(result.status,400,label);
      assert.deepEqual((await f.db.query('SELECT full_name,avatar_url,date_of_birth FROM users WHERE id=$1',[f.id(1)])).rows[0],before);
    });
    const registrationToken=jwt.sign({purpose:'zalo-registration',phone:'0900000909'},'isolated-workflow-audit-secret',{algorithm:'HS256',expiresIn:'5m',audience:'mld-zalo-registration',issuer:'mld-miniapp-api'});
    for(const [label,extra] of [['object email',{email:{}}],['false email',{email:false}],['false date',{dateOfBirth:false}],['zero date',{dateOfBirth:0}],['false avatar',{avatarUrl:false}]])await t.test('registration '+label,async()=>{
      const result=await f.request('/auth/zalo/register',{method:'POST',body:{registrationToken,fullName:'Explicit fixture customer',...extra},anonymous:true});
      assert.equal(result.status,400,label);
    });
    await t.test('valid date, optional clear and legitimate HTTPS avatar still work',async()=>{
      const saved=await f.request('/auth/profile',{method:'PUT',body:{dateOfBirth:'2000-01-01',avatarUrl:'https://example.test/avatar.jpg'}});
      assert.equal(saved.status,200);
      const cleared=await f.request('/auth/profile',{method:'PUT',body:{dateOfBirth:null,avatarUrl:null}});
      assert.equal(cleared.status,200);assert.equal(cleared.data.user.dateOfBirth,null);assert.equal(cleared.data.user.avatarUrl,null);
    });
  }finally{await f.close();}
});
