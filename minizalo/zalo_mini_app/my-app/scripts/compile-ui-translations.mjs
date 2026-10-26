import {readFile,writeFile} from 'node:fs/promises';
const text=await readFile(new URL('../src/i18n/interface-en.tsv',import.meta.url),'utf8');
const entries=text.trim().split('\n').map(line=>line.trimEnd().split('\t'));
if(entries.some(entry=>entry.length!==2||!entry[0]||!entry[1]))throw new Error('Invalid UI translation entry');
if(new Set(entries.map(([key])=>key)).size!==entries.length)throw new Error('Duplicate UI translation key');
await writeFile(new URL('../src/i18n/interface-en.json',import.meta.url),JSON.stringify(Object.fromEntries(entries),null,2)+'\n');
