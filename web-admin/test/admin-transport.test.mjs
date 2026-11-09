import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('backend errors never change data source or replay a write', async t => {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/admin/api.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent', plugins: [{
    name: 'fixture', setup(builder) {
      builder.onResolve({filter:/supabaseClient$/},()=>({path:'client',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const SUPABASE_URL='https://fixture.invalid'; export const getSupabaseHeaders=()=>({});",loader:'js'}));
    },
  }] });
  const original = { fetch: globalThis.fetch, window: globalThis.window, sessionStorage: globalThis.sessionStorage };
  globalThis.window = { location: { protocol: 'http:', hostname: '127.0.0.1', origin: 'http://127.0.0.1:5173' }, setTimeout, clearTimeout };
  globalThis.sessionStorage = { getItem: () => null };
  const { adminApi, adminCommand } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  try {
    await t.test('403/409/503 responses remain errors and the next read uses the backend', async () => {
      for (const status of [403, 409, 503]) {
        const calls = [];
        globalThis.fetch = async url => { calls.push(url); return new Response(JSON.stringify({success:false,message:'Server rejected operation'}), {status}); };
        await assert.rejects(adminApi('resources'), /Server rejected operation/);
        assert.equal(calls.length, 1);
        globalThis.fetch = async url => { calls.push(url); return new Response(JSON.stringify({success:true,data:['persisted']})); };
        assert.deepEqual(await adminApi('resources'), ['persisted']);
        assert.ok(calls.every(url => url.startsWith('http://127.0.0.1:3000/api/v1/admin/')));
      }
    });
    await t.test('an ambiguous write failure never issues another request', async () => {
      for (const request of [() => adminApi('users/update', {key:{id:'test'},values:{full_name:'Test'}}), () => adminCommand('cashier/collect', {kind:'TUITION'})]) {
        let calls = 0;
        globalThis.fetch = async () => { calls++; throw new TypeError('Connection lost after sending'); };
        await assert.rejects(request(), /Chưa xác minh/);
        assert.equal(calls, 1);
      }
    });
    await t.test('commands preserve a denied response without trying other URLs', async () => {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({success:false,message:'Forbidden'}), {status:403}); };
      await assert.rejects(adminCommand('cashier/collect', {}), /Forbidden/);
      assert.equal(calls, 1);
    });
    await t.test('simultaneous identical writes share one confirmed request', async () => {
      let calls = 0, finish;
      globalThis.fetch = async () => { calls++; return new Promise(resolve => { finish = resolve; }); };
      const body = { key: { id: 'same-user' }, values: { full_name: 'Persisted' } };
      const first = adminApi('users/update', body);
      const second = adminApi('users/update', body);
      finish(new Response(JSON.stringify({success:true,data:{saved:true}})));
      assert.deepEqual(await Promise.all([first,second]), [{saved:true},{saved:true}]);
      assert.equal(calls,1);
    });
  } finally { Object.assign(globalThis, original); }
});
