import {test} from 'node:test';
import assert from 'node:assert/strict';
import './prepare-zmp-toolchain.mjs';
test('official ZMP loader finds the patched Vite and its actual build/dev APIs',async()=>{
  const {loadVite}=await import('../node_modules/zmp-cli-core/dist/esm/vite/index.js');
  const {vite,version}=await loadVite();
  assert.equal(version,'6.4.5');assert.equal(typeof vite.build,'function');assert.equal(typeof vite.createServer,'function');
});
