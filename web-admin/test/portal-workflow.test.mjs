import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

async function loadModule(file) {
  const result = await build({ entryPoints: [fileURLToPath(new URL('../src/services/' + file, import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
    plugins: [{ name: 'isolated-portal-auth', setup(builder) {
      builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: "export const SUPABASE_URL='https://fixture.invalid'; export const getAdminAuthToken=()=> 'test-session'; export const getSupabaseHeaders=()=>({Authorization:'Bearer test-session'});", loader: 'js' }));
    } }],
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const { validatePortalPublication } = await loadModule('portalValidation.ts');
const { portalQuery } = await loadModule('portalQuery.ts');

test('drafts stay editable but publication requires valid content and safe links', () => {
  assert.doesNotThrow(() => validatePortalPublication({ kind: 'BANNER', status: 'DRAFT' }));
  assert.throws(() => validatePortalPublication({ kind: 'BANNER', status: 'PUBLISHED', title: 'Banner', imageUrl: 'javascript:alert(1)' }), /HTTPS/);
  assert.throws(() => validatePortalPublication({ kind: 'BANNER', status: 'PUBLISHED', title: 'Banner', imageUrl: 'https://fixture.invalid/image.png', targetLink: '//evil.invalid' }), /Liên kết/);
  assert.throws(() => validatePortalPublication({ kind: 'DOCUMENT', status: 'PUBLISHED', title: 'PDF', fileUrl: 'https://fixture.invalid/file.pdf' }), /phạm vi/);
  assert.throws(() => validatePortalPublication({ kind: 'COMMUNITY', status: 'PUBLISHED', title: 'Bài viết', contentText: ' ' }), /nội dung/);
  assert.doesNotThrow(() => validatePortalPublication({ kind: 'DOCUMENT', status: 'PUBLISHED', title: 'PDF', fileUrl: 'https://fixture.invalid/file.pdf', accessLevel: 'MEMBERS_ONLY' }));
});

test('denied or empty RLS writes fail without fallback and email logs remain immutable', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return new Response('[]', { status: 200 }); };
    await assert.rejects(portalQuery('miniapp_shared_content?id=eq.row', { method: 'PATCH', body: '{}' }), /Không xác nhận/);
    assert.equal(calls, 1);
    globalThis.fetch = async () => { calls++; return new Response('{"message":"Access denied"}', { status: 403 }); };
    await assert.rejects(portalQuery('miniapp_shared_content?id=eq.row', { method: 'DELETE' }), /Access denied/);
    assert.equal(calls, 2);
    await assert.rejects(portalQuery('email_logs?id=eq.row', { method: 'DELETE' }), /không sửa hoặc xóa/);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test('simultaneous saves share one persisted response', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (_url, options) => {
      calls++; assert.equal(options.headers['Content-Type'], 'application/json');
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Response('[{"id":"saved"}]', { status: 200 });
    };
    const options = { method: 'POST', body: '{"title":"draft"}' };
    const [first, second] = await Promise.all([portalQuery('miniapp_shared_content', options), portalQuery('miniapp_shared_content', options)]);
    assert.equal(calls, 1); assert.equal(first[0].id, 'saved'); assert.deepEqual(first, second);
  } finally { globalThis.fetch = original; }
});
