import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

test('customer form does not report success after a rejected database write',async()=>{
  const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/services/customer.service.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',plugins:[{
    name:'isolated-customer-write',setup(builder){
      builder.onResolve({filter:/supabaseService$/},()=>({path:'service',namespace:'fixture'}));
      builder.onResolve({filter:/adminAdapter$/},()=>({path:'adapter',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='service'
        ?`export const supabaseService={updateUser:async()=>false,getUsers:async()=>{throw new Error('must not reread after failure');}};`
        :`export const legacyRead=async()=>[];`,loader:'js'}));
    },
  }]});
  const {customerService}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const original=console.error;console.error=()=>{};
  try{
    const result=await customerService.updateCustomer('10000000-0000-0000-0000-000000000001',{fullName:'Test only'});
    assert.equal(result.success,false);assert.equal(result.statusCode,500);
  }finally{console.error=original;}
});
