import {access,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const directory=fileURLToPath(new URL('../www/',import.meta.url));
try{
  const source=JSON.parse(await readFile(new URL('../app-config.json',import.meta.url),'utf8'));
  const built=JSON.parse(await readFile(path.join(directory,'app-config.json'),'utf8'));
  if(JSON.stringify(source.app)!==JSON.stringify(built.app))throw new Error('App configuration differs from the source.');
  const files=[...built.listCSS,...built.listSyncJS,...built.listAsyncJS];
  if(!built.listSyncJS.length)throw new Error('No entry script in build manifest.');
  for(const name of files){
    const resolved=path.resolve(directory,name);
    if(!resolved.startsWith(directory))throw new Error('Build asset outside www.');
    await access(resolved);
  }
  console.log(JSON.stringify({buildDirectory:'www',referencedAssets:files.length,manifestVerified:true}));
}catch(error){console.error(`Build verification failed: ${error.message}`);process.exitCode=1;}
