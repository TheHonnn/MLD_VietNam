import mobile from './mobile-en.json';
import extra from './miniapp-en.json';
import interfaceText from './interface-en.json';
import templates from './templates-en.json';

const dictionary:Record<string,string>={...mobile,...extra,...interfaceText};
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(templates).sort(([a],[b])=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(([source,target])=>({source,target:target.trim(),regex:new RegExp('^'+source.trim().split(/\{\d+\}/g).map(escape).join('(.{0,1000}?)')+'$','u')}));
export function translateEnglish(value:string){
  const text=value.trim(),translated=dictionary[text];
  if(typeof translated==='string')return value.replace(text,()=>translated);
  if(!/[À-ỹĐđ]/.test(text))return value;
  if(text.length<=4000)for(const pattern of patterns){
    if(pattern.source==='{0}đ'&&!/^[\d\s.,]+đ$/.test(text))continue;
    const match=text.match(pattern.regex);
    if(match)return value.replace(text,()=>pattern.target.replace(/\{(\d+)\}/g,(_key,index)=>match[Number(index)+1]??''));
  }
  return value;
}
