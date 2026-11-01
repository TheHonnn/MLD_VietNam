import {test} from 'node:test';
import assert from 'node:assert/strict';
import './prepare-zmp-toolchain.mjs';
import {createRequire} from 'node:module';
test('legacy source-map readers use the patched URI decoder through its original callable API',()=>{
  const decode=createRequire(import.meta.url)('decode-uri-component');
  assert.equal(typeof decode,'function');assert.equal(decode('a%20b'),'a b');assert.equal(decode('%E1%BB%87'),'ệ');
  assert.equal(typeof decode('%F0%80%80%80'.repeat(1000)),'string');
});
test('official ZMP loader finds the patched Vite and its actual build/dev APIs',async()=>{
  const {loadVite}=await import('../node_modules/zmp-cli-core/dist/esm/vite/index.js');
  const {vite,version}=await loadVite();
  assert.equal(version,'6.4.5');assert.equal(typeof vite.build,'function');assert.equal(typeof vite.createServer,'function');
});
