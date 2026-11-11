import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('service API client strips a health-check suffix before academy writes', async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/services/apiClient.ts', import.meta.url))],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    logLevel: 'silent',
    plugins: [{
      name: 'auth-fixture',
      setup(builder) {
        builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'client', namespace: 'fixture' }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: 'export const getAdminAuthToken = () => null;',
          loader: 'js',
        }));
      },
    }],
  });

  const { ApiClient } = await import(
    'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
  );
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ success: true, data: { assigned: true } }));
  };

  try {
    const client = new ApiClient('https://backend.example/api/v1/health/');
    await client.post('/academy/enrollments/enrollment-1/assign-batch', { batchId: 'batch-1' });
    assert.equal(
      requestedUrl,
      'https://backend.example/api/v1/academy/enrollments/enrollment-1/assign-batch',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
