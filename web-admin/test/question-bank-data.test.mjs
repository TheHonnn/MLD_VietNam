import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/admin/quizData.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'isolated-admin', setup(builder) {
    builder.onResolve({ filter: /^\.\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export const adminCommand=(...args)=>globalThis.questionBankRead(...args);', loader: 'js',
    }));
  } }],
});
const { loadQuestionRows } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('question lookup includes every page and keeps the selected quiz filter and abort signal', async () => {
  const controller = new AbortController();
  const calls = [];
  globalThis.questionBankRead = async (path, body, signal) => {
    calls.push({ path, signal });
    const page = Number(new URL(path, 'https://fixture.invalid').searchParams.get('page'));
    return { rows: page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: String(i) })) : [{ id: '100' }], total: 101 };
  };
  try {
    const rows = await loadQuestionRows('quiz_questions', { quiz_id: 'selected-quiz' }, controller.signal);
    assert.equal(rows.length, 101);
    assert.equal(calls.length, 2);
    for (const call of calls) {
      const query = new URL(call.path, 'https://fixture.invalid').searchParams;
      assert.deepEqual(JSON.parse(query.get('filter')), { quiz_id: 'selected-quiz' });
      assert.equal(query.get('sort'), 'question_number');
      assert.equal(call.signal, controller.signal);
    }
  } finally { delete globalThis.questionBankRead; }
});

test('an incomplete lookup fails instead of presenting a partial question bank as complete', async () => {
  let calls = 0;
  globalThis.questionBankRead = async () => {
    if (++calls === 2) throw new Error('Access denied');
    return { rows: [{ id: 'first' }], total: 2 };
  };
  try { await assert.rejects(loadQuestionRows('quiz_questions'), /Access denied/); }
  finally { delete globalThis.questionBankRead; }
});
