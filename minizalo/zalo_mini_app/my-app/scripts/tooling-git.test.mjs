import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
test('ZMP legacy Git factory delegates to the patched upstream safety implementation',async()=>{
  const git=require('simple-git'),secure=require('simple-git-secure');
  assert.equal(typeof git,'function');assert.equal(git,secure.simpleGit);
  const root=fileURLToPath(new URL('../node_modules/.cache/',import.meta.url));
  await mkdir(root,{recursive:true});
  const folder=await mkdtemp(root+'git-smoke-');
  try{
    await git(folder).init();assert.equal(await git(folder).checkIsRepo(),true);
    await assert.rejects(git(folder).raw(['-c','trailer.test.command=echo unsafe','status']),/unsafe|configuration|config/i);
  }finally{if(!folder.startsWith(root+'git-smoke-'))throw new Error('Unexpected test path');await rm(folder,{recursive:true,force:true});}
});
