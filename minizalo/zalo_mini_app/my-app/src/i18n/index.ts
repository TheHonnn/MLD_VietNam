import {useSyncExternalStore} from 'react';

export type Locale='vi'|'en';
let locale:Locale='vi';
const listeners=new Set<()=>void>();
const subscribe=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback);};};
let english:typeof import('./english')|null=null;
let loading:Promise<typeof import('./english')>|null=null;
let revision=0;
export const getLocale=()=>locale;
export async function setLocale(value:unknown){
  const next=value==='en'?'en':'vi';
  const request=++revision;
  if(next==='en'&&!english){
    try{english=await(loading??=import('./english'));}
    catch{loading=null;return false;}
  }
  if(request!==revision)return false;
  if(next===locale)return true;
  locale=next;
  if(typeof document!=='undefined')document.documentElement.lang=next;
  for(const listener of listeners)listener();
  return true;
}
export function useLocale(){return useSyncExternalStore(subscribe,getLocale,()=> 'vi' as Locale);}
// Presentation only: IDs, form values, request payloads and stored content are untouched.
export function translate<T>(value:T):T|string{
  if(locale!=='en'||typeof value!=='string'||!value.trim())return value;
  return english?.translateEnglish(value)??value;
}
