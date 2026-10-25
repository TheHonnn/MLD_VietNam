import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('account UPDATE policy permits real active admins and blocks staff, customers and anonymous users',async()=>{
  const db=new PGlite();
  const migration=await readFile(new URL('../../../database/migrations/007_admin_users_update.sql',import.meta.url),'utf8');
  const id=n=>`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
  try{
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
      CREATE TABLE public.users(id uuid PRIMARY KEY,role text,is_active boolean);
      INSERT INTO public.users VALUES('${id(1)}','SUPER_ADMIN',true),('${id(2)}','ADMIN',true),('${id(3)}','CUSTOMER',true),('${id(4)}','RECEPTIONIST',true),('${id(5)}','ADMIN',false);
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Public Read users" ON public.users FOR SELECT TO anon,authenticated USING(true);
      GRANT SELECT,UPDATE ON public.users TO anon,authenticated;`);
    await db.exec(migration);await db.exec(migration);
    const original=(await db.query('SELECT * FROM users ORDER BY id')).rows;
    for(const [role,owner,allowed] of [['anon',null,false],['authenticated',3,false],['authenticated',4,false],['authenticated',5,false],['authenticated',99,false],['authenticated',1,true],['authenticated',2,true]]){
      await db.exec('BEGIN');
      try{
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[owner?id(owner):'']);
        await db.exec(`SET LOCAL ROLE ${role}`);
        const updated=await db.query("UPDATE public.users SET role='RECEPTIONIST' WHERE id=$1 RETURNING id,role",[id(3)]);
        assert.equal(updated.rows.length,allowed?1:0,`${role}:${owner}`);
        const self=await db.query("UPDATE public.users SET role='SUPER_ADMIN' WHERE id=$1 RETURNING id",[id(owner||3)]);
        assert.equal(self.rows.length,allowed?1:0,`self escalation ${owner}`);
      }finally{await db.exec('ROLLBACK');}
    }
    assert.deepEqual((await db.query('SELECT * FROM users ORDER BY id')).rows,original);
    const policies=(await db.query("SELECT policyname FROM pg_policies WHERE tablename='users'")).rows;
    assert.equal(policies.length,2);
  }finally{await db.close();}
});
