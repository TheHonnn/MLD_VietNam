// Read-only extraction from the Flutter reference. Never modifies mobile sources.
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../../mobile/lib/',import.meta.url));
const dictionary={};
const unquote=s=>s.replace(/\\'/g,"'").replace(/\\n/g,'\n').replace(/\\"/g,'"');
const walk=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(file.endsWith('.dart')){
  const source=await readFile(file,'utf8');
  for(const match of source.matchAll(/(?:context\.tr|\.tr)\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g)){
    if(!match[1].includes('$')&&!match[2].includes('$'))dictionary[unquote(match[1])]=unquote(match[2]);
  }
}}};
await walk(root);
const mobile=await readFile(path.join(root,'core/localization/app_translation.dart'),'utf8');
for(const match of mobile.matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g))dictionary[unquote(match[1])]=unquote(match[2]);
const vi=JSON.parse(await readFile(path.join(root,'l10n/app_vi.arb'),'utf8')),en=JSON.parse(await readFile(path.join(root,'l10n/app_en.arb'),'utf8'));
for(const [key,value] of Object.entries(vi))if(!key.startsWith('@')&&typeof value==='string'&&typeof en[key]==='string')dictionary[value]=en[key];
const output=new URL('../src/i18n/mobile-en.json',import.meta.url);
await mkdir(new URL('../src/i18n/',import.meta.url),{recursive:true});
await writeFile(output,JSON.stringify(Object.fromEntries(Object.entries(dictionary).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
console.log(`Imported ${Object.keys(dictionary).length} reference translations without changing mobile.`);
