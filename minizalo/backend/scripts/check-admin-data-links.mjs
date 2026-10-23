import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parse} from 'dotenv';
import {Prisma} from '@prisma/client';
import ts from 'typescript';
import {prisma} from '../dist/lib/prisma.js';
import {createStore,validateSharedSchema} from '../dist/store.js';

// No customer rows or credentials are emitted. Every database query is read-only.
const root=fileURLToPath(new URL('../../../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const ref='origin/feature/admin-web';
let phase='admin-contract';
try{
  const revision=git('rev-parse',ref).trim();
  const source=ts.createSourceFile('resources.ts',git('show',`${ref}:backend/src/modules/admin/admin.resources.ts`),ts.ScriptTarget.Latest,true);
  let adminTables=[];
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='ADMIN_RESOURCES'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer)){
      adminTables=node.initializer.properties.filter(ts.isPropertyAssignment).map(property=>property.name.text);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
  if(!adminTables.length||adminTables.some(name=>!/^[a-z_]+$/.test(name)))throw new Error('Invalid admin resource contract');
  const config=parse(await readFile(new URL('../../zalo_mini_app/my-app/.env.production',import.meta.url)));
  const base=new URL(config.VITE_API_BASE_URL);
  if(base.protocol!=='https:')throw new Error('HTTPS API required');
  const snapshot=await prisma.$transaction(async tx=>{
    phase='read-only-transaction';
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const store=createStore(tx);phase='shared-schema';await validateSharedSchema(store);
    const tableCounts={};
    for(const table of adminTables){
      phase='admin-table:'+table;
      const [row]=await store.query(Prisma.sql`SELECT count(*)::int AS count FROM ${Prisma.raw('"'+table+'"')}`);
      tableCounts[table]=row.count;
    }
    phase='catalog-snapshot';
    const catalogs={
      services:await store.query(Prisma.sql`SELECT s.id,s.name,s.price,s.discount_price,s.duration_minutes,s.category_id FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active`),
      branches:await store.query(Prisma.sql`SELECT id,name,address FROM branches WHERE is_active`),
      doctors:await store.query(Prisma.sql`SELECT t.id,t.full_name,t.branch_id FROM technicians t JOIN branches b ON b.id=t.branch_id WHERE t.is_active AND b.is_active`),
      courses:await store.query(Prisma.sql`SELECT c.id,c.title,c.tuition_fee FROM courses c JOIN course_categories cat ON cat.id=c.category_id WHERE c.is_active AND cat.is_active`),
      'care-guidelines':await store.query(Prisma.sql`SELECT id,title,content FROM home_care_guidelines WHERE is_published`),
      'support-faqs':await store.query(Prisma.sql`SELECT id,question,answer FROM support_faqs WHERE is_active`),
    };
    return {tableCounts,catalogs};
  },{timeout:60000});
  const keys={'care-guidelines':'guidelines','support-faqs':'faqs'};
  const results=[];
  for(const [path,expected] of Object.entries(snapshot.catalogs)){
    const response=await fetch(base.href.replace(/\/$/,'')+'/'+path,{headers:{Origin:'https://h5.zdn.vn'},signal:AbortSignal.timeout(45000)});
    const body=await response.json(),rows=body.data?.[keys[path]||path];
    const failures=[];
    if(!response.ok||body.success!==true||!Array.isArray(rows))failures.push('Invalid public API response');
    else{
      const actual=new Map(rows.map(row=>[row.id,row]));
      if(actual.size!==rows.length)failures.push('Duplicate API identifiers');
      if(rows.length!==expected.length)failures.push('Active/published row count differs from shared database');
      for(const row of expected){
        const remote=actual.get(row.id);
        if(!remote){failures.push('Missing canonical identifier');continue;}
        for(const [column,value] of Object.entries(row)){
          const field=column.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase());
          const numeric=['price','discount_price','duration_minutes','tuition_fee'].includes(column);
          if(value==null?remote[field]!=null:numeric?Number(value)!==Number(remote[field]):String(value)!==String(remote[field]))failures.push('Canonical field mismatch: '+field);
        }
      }
    }
    results.push({path,status:response.status,databaseCount:expected.length,apiCount:Array.isArray(rows)?rows.length:null,pass:!failures.length,failures:[...new Set(failures)]});
  }
  console.log(JSON.stringify({readOnly:true,adminRevision:revision,apiOrigin:base.origin,adminTableCounts:snapshot.tableCounts,results,adminCannotConfigure:['miniapp_technician_services','miniapp_lesson_quizzes','miniapp_course_delivery'].filter(table=>!adminTables.includes(table))},null,2));
  if(results.some(result=>!result.pass))process.exitCode=1;
}catch(error){
  console.error(JSON.stringify({pass:false,phase,error:error instanceof Error?error.name:'Error',code:typeof error?.code==='string'?error.code:undefined,sqlState:typeof error?.meta?.code==='string'?error.meta.code:undefined}));
  process.exitCode=1;
}finally{await prisma.$disconnect();}
