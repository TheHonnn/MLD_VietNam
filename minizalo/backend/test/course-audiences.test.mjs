import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {configureWorkflows} from '../dist/configure-workflows.js';
import {statements} from '../migrations/012_course_audiences.mjs';

test('course audiences follow canonical levels and explicit overrides without relabeling real categories',async t=>{
  const f=await workflowFixture(),{db,id}=f;
  const store={query:async q=>(await db.query(q.text,q.values)).rows};
  const read=audience=>f.request('/courses'+(audience?'?audience='+audience:''),{anonymous:true});
  try{
    await db.query("INSERT INTO courses(id,category_id,title,code,short_description,full_description,image_url,level) VALUES($1,$2,'Practitioner fixture course','PRACTITIONER-FIXTURE','Fixture summary','Fixture description','','ADVANCED')",[id(50),id(20)]);
    const config={courseAudiences:[{courseId:id(22),audience:'BEGINNER',reason:'Actual fixture classification'},{courseId:id(50),audience:'PRACTITIONER',reason:'Actual fixture classification'}]};
    await t.test('canonical levels classify groups without inserting any mapping or changing courses',async()=>{
      assert.equal((await read()).data.courses.length,2);
      assert.deepEqual((await read('BEGINNER')).data.courses.map(course=>course.id),[id(22)]);
      assert.deepEqual((await read('PRACTITIONER')).data.courses.map(course=>course.id),[id(50)]);
      for(const level of ['BEGINNER','INTERMEDIATE','ADVANCED','MASTER']){
        await db.query('UPDATE courses SET level=$1::course_level WHERE id=$2',[level,id(50)]);
        assert.equal((await f.request('/courses/'+id(50),{anonymous:true})).data.course.trainingAudience,level==='BEGINNER'?'BEGINNER':'PRACTITIONER');
      }
      await configureWorkflows(store,config,false);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_course_audiences')).rows[0].total,0);
    });
    await t.test('the two configured groups filter the canonical catalog and preserve categories',async()=>{
      await configureWorkflows(store,config,true);
      assert.deepEqual((await read('BEGINNER')).data.courses.map(course=>course.id),[id(22)]);
      assert.deepEqual((await read('PRACTITIONER')).data.courses.map(course=>course.id),[id(50)]);
      assert.equal((await read('BEGINNER')).data.courses[0].categoryName,'Workflow academy');
      assert.equal((await f.request('/courses/'+id(22),{anonymous:true})).data.course.trainingAudience,'BEGINNER');
      await db.query('UPDATE courses SET is_active=false WHERE id=$1',[id(50)]);
      assert.deepEqual((await read('PRACTITIONER')).data.courses,[]);
    });
    await t.test('invalid filters, unknown courses and unaudited classification are rejected',async()=>{
      for(const value of ['FAKE','beginner','BEGINNER&audience=PRACTITIONER'])assert.equal((await read(value)).status,400);
      for(const patch of [{audience:'FAKE'},{reason:''},{courseId:id(999)}]){
        await assert.rejects(configureWorkflows(store,{courseAudiences:[{...config.courseAudiences[0],...patch}]},true),error=>error.status===400);
      }
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_course_audiences')).rows[0].total,2);
    });
    await t.test('audience changes are additive, repeatable and private to database operators',async()=>{
      await configureWorkflows(store,{courseAudiences:[{...config.courseAudiences[0],audience:'PRACTITIONER'}]},true);
      await db.exec(statements.join(';\n'));
      assert.deepEqual((await read('BEGINNER')).data.courses,[]);
      assert.deepEqual((await read('PRACTITIONER')).data.courses.map(course=>course.id),[id(22)]);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM information_schema.table_privileges WHERE table_name='miniapp_course_audiences' AND grantee IN ('PUBLIC','anon','authenticated')")).rows[0].total,0);
    });
  }finally{await f.close();}
});
