const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('../backend/node_modules/@electric-sql/pglite');
test('Portal repair creates missing tables, preserves rows and enforces RLS',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE FUNCTION public.admin_is_super() RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.admin',true)='yes' $$;`);
 await assert.rejects(db.query('SELECT * FROM portal_contacts'),/does not exist/);
 const sql=fs.readFileSync(require('node:path').join(__dirname,'../database/migrations/039_portal_schema_repair.sql'),'utf8');
 await db.exec(sql);
 for(const table of ['portal_contacts','portal_taxonomies','support_faqs','legal_policies']) assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length,0);
 await db.exec(`INSERT INTO portal_contacts(id,hotline_support) VALUES('primary_mld_contacts','real contact');
 INSERT INTO legal_policies(slug,title,content_markdown) VALUES('private','Draft','Private content');`);
 await db.exec(sql);
 assert.equal((await db.query('SELECT hotline_support FROM portal_contacts')).rows[0].hotline_support,'real contact');
 await db.exec('SET ROLE anon');
 assert.equal((await db.query('SELECT * FROM legal_policies')).rows.length,0);
 await assert.rejects(db.exec("INSERT INTO portal_contacts(id) VALUES('forbidden')"));
 await db.exec('RESET ROLE; SET ROLE authenticated');
 await assert.rejects(db.exec("INSERT INTO portal_taxonomies(type,code,name) VALUES('TARGET_NEED','blocked','Blocked')"));
 await db.exec("SELECT set_config('test.admin','yes',false)");
 assert.equal((await db.query('SELECT * FROM legal_policies')).rows.length,1);
 await db.exec("INSERT INTO portal_taxonomies(type,code,name) VALUES('TARGET_NEED','real','Real need')");
 assert.equal((await db.query('SELECT * FROM portal_taxonomies')).rows.length,1);
 } finally {await db.close()}
});
