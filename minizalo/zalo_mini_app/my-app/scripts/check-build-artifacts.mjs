import {access,readFile,readdir} from 'node:fs/promises';
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
  // Check lazy chunks as well as manifest entries. A development bundle can
  // open a Vite socket on the phone even when the API itself works normally.
  let checkedScripts=0;
  const scan=async(folder)=>{
    for(const entry of await readdir(folder,{withFileTypes:true})){
      const file=path.join(folder,entry.name);
      if(entry.isDirectory()){await scan(file);continue;}
      if(!/\.(?:js|mjs|html)$/.test(entry.name))continue;
      const contents=await readFile(file,'utf8');checkedScripts++;
      if(/\/@vite\/client|\/@react-refresh|vite-hmr|__vite_ping/.test(contents))throw new Error('Development client found in production assets. Rebuild before deploying.');
    }
  };
  await scan(directory);
  console.log(JSON.stringify({buildDirectory:'www',referencedAssets:files.length,checkedScripts,manifestVerified:true,noDevelopmentClient:true}));
}catch(error){console.error(`Build verification failed: ${error.message}`);process.exitCode=1;}
