export function certificateVerificationUrl(path:unknown,apiBase:string){
  if(typeof path!=='string'||!/^\/verify\/certificates\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/i.test(path))return undefined;
  try{
    const base=new URL(apiBase);
    if(base.username||base.password||!(base.protocol==='https:'||(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname))))return undefined;
    return new URL(path,base.origin).href;
  }catch{return undefined;}
}
