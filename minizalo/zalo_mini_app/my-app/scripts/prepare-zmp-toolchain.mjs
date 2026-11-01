import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../node_modules/vite/package.json',import.meta.url);
const pkg=JSON.parse(await readFile(file,'utf8'));
// ZMP CLI 4 reads exports['.'].import.default directly. Vite 6 shortened that
// equivalent export to a string; restore the object shape without changing code,
// the upstream version or the entry point that Node/Vite actually executes.
const entry=pkg.exports?.['.'];
if(!pkg.version.startsWith('6.'))throw new Error('Recheck ZMP/Vite compatibility before changing the Vite major.');
if(typeof entry?.import==='string'){
  entry.import={default:entry.import};
  await writeFile(file,JSON.stringify(pkg,null,2)+'\n');
}
if(typeof entry?.import?.default!=='string')throw new Error('Unexpected Vite package export.');
