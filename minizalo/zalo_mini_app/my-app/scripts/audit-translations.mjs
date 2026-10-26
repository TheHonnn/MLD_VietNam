import {parse} from '@babel/parser';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const dictionary={...JSON.parse(await readFile('src/i18n/mobile-en.json','utf8')),...JSON.parse(await readFile('src/i18n/miniapp-en.json','utf8')),...Object.fromEntries((await readFile('src/i18n/interface-en.tsv','utf8')).trim().split('\n').map(line=>line.trimEnd().split('\t')))};
const missing=new Set(),templates=new Set();let total=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='i18n')await walk(file);continue;}if(!/\.tsx?$/.test(file))continue;
  const source=parse(await readFile(file,'utf8'),{sourceType:'module',plugins:['typescript','jsx']});
  function visit(node){if(!node||typeof node!=='object')return;if(node.type==='TemplateLiteral'){const pattern=node.quasis.map((part,index)=>part.value.cooked+(index<node.expressions.length?`{${index}}`:'')).join('');if(/[À-ỹĐđ]/.test(pattern))templates.add(pattern);}if(node.type==='JSXText'||node.type==='StringLiteral'){const text=node.value.replace(/\s+/g,' ').trim();if(/[À-ỹĐđ]/.test(text)){total++;if(!dictionary[text])missing.add(text);}}for(const [key,value] of Object.entries(node)){if(['loc','start','end','extra'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}visit(source);
}}
await walk('src');await mkdir('node_modules/.cache',{recursive:true});await writeFile('node_modules/.cache/missing-translations.json',JSON.stringify([...missing].sort(),null,2));
await writeFile('node_modules/.cache/template-translations.json',JSON.stringify([...templates].sort(),null,2));
const templateDictionary=JSON.parse(await readFile('src/i18n/templates-en.json','utf8'));
const missingTemplates=[...templates].filter(pattern=>!templateDictionary[pattern]);
console.log(JSON.stringify({total,missing:missing.size,missingTemplates,report:'node_modules/.cache/missing-translations.json'}));
if(process.argv.includes('--check')&&(missing.size||missingTemplates.length))process.exitCode=1;
