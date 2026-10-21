import {ApiError} from './errors.js';

export function profileAvatar(value:unknown):string|null {
  if(value===undefined||value===null||value==='')return null;
  if(typeof value!=='string'||value.length>750000)throw new ApiError(400,'Invalid profile image');
  const data=value.match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(data&&data[1].length%4===0)return value;
  try{
    const url=new URL(value);
    if(url.protocol==='https:'&&!url.username&&!url.password&&!/[\x00-\x20\x7f]/.test(value))return url.href;
  }catch{/* Only an absolute HTTPS URL or bounded image data is accepted. */}
  throw new ApiError(400,'Invalid profile image');
}

export function profileBirthDate(value:unknown,today:string):string|null {
  if(value===undefined||value===null||value==='')return null;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<1
    ||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value>today)throw new ApiError(400,'Invalid date of birth');
  return value;
}
