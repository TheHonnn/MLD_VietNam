import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/server.js';

test('search history persists in the shared schema, isolates customers and never invents popular terms', async t => {
  const db = new PGlite();
  const schema = await readFile(new URL('../../../database/schema.sql',import.meta.url),'utf8');
  await db.exec(schema.split(/\r?\n/).filter(line=>!line.startsWith('CREATE EXTENSION')&&!line.includes('gin_trgm_ops')).join('\n'));
  const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
  await db.exec(`INSERT INTO users(id,phone,full_name,referral_code) VALUES('${id(1)}','0900000001','Test one','SEARCH1'),('${id(2)}','0900000002','Test two','SEARCH2');
    INSERT INTO service_categories(id,name,code,icon_url) VALUES('${id(3)}','Actual category','SEARCH','/category.png');
    INSERT INTO services(id,category_id,name,slug,short_description,full_description,image_url,price) VALUES('${id(4)}','${id(3)}','Chăm sóc da','actual-service','Actual summary','Actual description','/service.jpg',123000);`);
  const store = client => ({query:async query=>(await client.query(query.text,query.values.map(value=>Prisma.Decimal.isDecimal(value)?value.toString():value))).rows,
    transaction:run=>client.transaction(tx=>run(store(tx)))});
  const secret='isolated-search-history-tests';
  const server=createApp(store(db),{jwtSecret:secret}).listen(0,'127.0.0.1');
  await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const call=async(path,{method='GET',body,owner=1}={})=>{
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(owner?{Authorization:`Bearer ${jwt.sign({sub:id(owner)},secret)}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  try {
    await t.test('no migration is reported as unavailable, not a fake successful save', async()=>{
      assert.equal((await call('/search/history')).status,503);
      assert.equal((await call('/search/history',{method:'POST',body:{query:'test'}})).status,503);
      assert.deepEqual((await call('/search/popular',{owner:0})).data.popularSearches,[]);
      const migration=JSON.parse(await readFile(new URL('../../docs/sql/003_search_history.json',import.meta.url),'utf8'));
      for(const statement of migration.statements) await db.exec(statement+';');
      assert.deepEqual((await call('/search/history')).data.history,[]);
      assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname='miniapp_search_history'")).rows[0].relrowsecurity,true);
    });
    await t.test('authentication, input validation and server-owned user identity are enforced',async()=>{
      for(const method of ['GET','POST','DELETE']) assert.equal((await call('/search/history',{owner:0,method})).status,401);
      for(const query of ['', ' ', null, ['term'], 'x'.repeat(161), 'bad\u0000value']) {
        assert.equal((await call('/search/history',{method:'POST',body:{query}})).status,400);
      }
      const saved=await call('/search/history',{method:'POST',body:{query:'  Chăm   sóc da  ',userId:id(2)}});
      assert.equal(saved.status,200,JSON.stringify(saved));
      assert.equal(saved.data.entry.query,'Chăm sóc da');
      const history=(await call('/search/history')).data.history;
      assert.equal(history.length,1);
      assert.equal((await call('/search/history',{owner:2})).data.history.length,0);
      const duplicate=await call('/search/history',{method:'POST',body:{query:'CHĂM SÓC DA'}});
      assert.equal(duplicate.data.entry.id,history[0].id);
      assert.equal((await call('/search/history')).data.history.length,1);
      assert.equal((await call(`/search/history/${history[0].id}`,{method:'DELETE',owner:2})).status,404);
      assert.equal((await call('/search/history')).data.history.length,1);
    });
    await t.test('popular terms require real searches and may only reveal active catalog names',async()=>{
      await call('/search/history',{method:'POST',owner:2,body:{query:'private phone 0901234567'}});
      const response=await call('/search/popular',{owner:0});
      assert.deepEqual(response.data.popularSearches,[{query:'Chăm sóc da'}]);
      assert.equal(JSON.stringify(response).includes('0901234567'),false);
      await db.exec(`UPDATE services SET is_active=false WHERE id='${id(4)}'`);
      assert.deepEqual((await call('/search/popular',{owner:0})).data.popularSearches,[]);
      await db.exec(`UPDATE services SET is_active=true WHERE id='${id(4)}'`);
    });
    await t.test('individual and complete deletion persist and never affect another customer',async()=>{
      const [entry]=(await call('/search/history')).data.history;
      assert.equal((await call(`/search/history/${entry.id}`,{method:'DELETE'})).data.deleted,true);
      assert.deepEqual((await call('/search/history')).data.history,[]);
      assert.equal((await call('/search/history',{owner:2})).data.history.length,1);
      await call('/search/history',{method:'POST',body:{query:'Actual term'}});
      assert.equal((await call('/search/history',{method:'DELETE'})).data.deleted,true);
      assert.deepEqual((await call('/search/history')).data.history,[]);
      assert.equal((await call('/search/history',{owner:2})).data.history.length,1);
    });
    await t.test('recent history is bounded and remains readable by a fresh application instance',async()=>{
      for(let n=0;n<23;n++) {
        await call('/search/history',{method:'POST',body:{query:`Term ${n}`}});
        await db.query('UPDATE miniapp_search_history SET last_searched_at=$1 WHERE user_id=$2 AND query=$3',[new Date(Date.now()-100000+n*1000).toISOString(),id(1),`Term ${n}`]);
      }
      const history=(await call('/search/history')).data.history;
      assert.equal(history.length,20);
      assert.equal(history[0].query,'Term 22');
      const rows=(await db.query('SELECT count(*)::int AS count FROM miniapp_search_history WHERE user_id=$1',[id(1)])).rows;
      assert.equal(rows[0].count,20);
      const restarted=createApp(store(db),{jwtSecret:secret}).listen(0,'127.0.0.1');
      await once(restarted,'listening');
      try {
        const response=await fetch(`http://127.0.0.1:${restarted.address().port}/api/search/history`,{headers:{Authorization:`Bearer ${jwt.sign({sub:id(1)},secret)}`}});
        assert.deepEqual((await response.json()).data.history,history);
      } finally {await new Promise(resolve=>restarted.close(resolve));}
    });
  } finally {await new Promise(resolve=>server.close(resolve));await db.close();}
});
