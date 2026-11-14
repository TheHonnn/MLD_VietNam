import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle = await build({entryPoints:[fileURLToPath(new URL('../src/admin/tuition-balance.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const { tuitionBalance } = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('missing or invalid tuition cannot become a default collection amount',()=>{
  for(const [total,paid] of [[null,0],[9000000,undefined],['',0],[NaN,0],[100,-1],[0,0],[100,Infinity]]) assert.equal(tuitionBalance(total,paid),null);
});
test('remaining tuition uses confirmed numbers and never becomes negative',()=>{
  assert.equal(tuitionBalance('35000000','2000000'),33000000);
  assert.equal(tuitionBalance(100,100),0);
  assert.equal(tuitionBalance(100,120),0);
});
