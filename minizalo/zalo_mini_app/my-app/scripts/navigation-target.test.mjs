import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/utils/portal-target.ts'],bundle:true,write:false,format:'esm'});
const {portalTarget}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Admin banners reach actual Mini App screens including profile and academy children',()=>{
  const targets={'/home/search':'search','/notifications':'notifications','/specialists':'specialists','/academy/attendance':'schedule','/academy/results':'results','/profile/edit':'profile-edit','/profile/settings':'profile-settings','/profile/support':'support','/treatment/home-care':'care_guide','/treatment/consultation':'consultation','/treatment/review':'review','/treatment/lymph-examination':'examination'};
  for(const [path,screen]of Object.entries(targets)){assert.equal(portalTarget(path).screen,screen);assert.equal(portalTarget(path+'/?source=banner').screen,screen);}
});
test('banner links never run scripts or expose credentials and unknown links remain readable details',()=>{
  for(const value of ['javascript:alert(1)','http://example.test','https://user:secret@example.test','/missing'])assert.equal(portalTarget(value),null);
  assert.equal(portalTarget('https://example.test/article').external,'https://example.test/article');
});
