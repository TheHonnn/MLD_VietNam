const prefix='mld_booking_request:';
const pending=new Map<string,{fingerprint:string;key:string}>();
export async function bookingRequest(owner:string,payload:unknown) {
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  let previous=pending.get(owner);
  try{previous=JSON.parse(localStorage.getItem(prefix+owner)||'null')||previous;}catch{/* Memory also covers restricted storage. */}
  if(previous?.fingerprint===fingerprint&&/^[0-9a-f-]{36}$/i.test(previous.key))return previous.key;
  const bytesId=crypto.getRandomValues(new Uint8Array(16));bytesId[6]=(bytesId[6]&15)|64;bytesId[8]=(bytesId[8]&63)|128;
  const hex=Array.from(bytesId,b=>b.toString(16).padStart(2,'0')).join('');
  const key=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  const entry={fingerprint,key};pending.set(owner,entry);
  try{localStorage.setItem(prefix+owner,JSON.stringify(entry));}catch{/* Retry remains idempotent in this session. */}
  return key;
}
export function completeBookingRequest(owner:string,key:string){
  if(pending.get(owner)?.key===key)pending.delete(owner);
  try{if(JSON.parse(localStorage.getItem(prefix+owner)||'null')?.key===key)localStorage.removeItem(prefix+owner);}catch{/* No customer details are stored here. */}
}
