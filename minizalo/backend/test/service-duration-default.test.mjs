import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {statements} from '../migrations/016_service_duration_default.mjs';

test('60-minute default applies only to new unspecified service durations',async()=>{
  const f=await workflowFixture(),{db,id}=f;
  try{
    const before=(await db.query('SELECT id,duration_minutes FROM services ORDER BY id')).rows;
    await db.exec(statements.join(';\n'));await db.exec(statements.join(';\n'));
    assert.deepEqual((await db.query('SELECT id,duration_minutes FROM services ORDER BY id')).rows,before);
    await db.query("INSERT INTO services(id,category_id,name,slug,short_description,full_description,price,image_url,steps,benefits) VALUES($1,$2,'Actual new test service','default-duration-test','Description','Description',100000,'','[]','[]')",[id(501),id(4)]);
    assert.equal((await db.query('SELECT duration_minutes FROM services WHERE id=$1',[id(501)])).rows[0].duration_minutes,60);
    await db.query('UPDATE services SET duration_minutes=75 WHERE id=$1',[id(501)]);await db.exec(statements.join(';\n'));
    assert.equal((await db.query('SELECT duration_minutes FROM services WHERE id=$1',[id(501)])).rows[0].duration_minutes,75);
    await db.exec('ALTER TABLE services ALTER COLUMN duration_minutes SET DEFAULT 45');
    await assert.rejects(db.exec(statements.join(';\n')),/operator review/);
    assert.equal((await db.query("SELECT column_default FROM information_schema.columns WHERE table_name='services' AND column_name='duration_minutes'")).rows[0].column_default,'45');
  }finally{await f.close();}
});
