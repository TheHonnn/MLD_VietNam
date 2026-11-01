// Business hours are interpreted in Vietnam, independently of the device timezone.
export function branchOpenNow(opening?:string|null,closing?:string|null,now=new Date()):boolean|null{
  const minutes=(value?:string|null)=>{const m=value?.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);return m&&Number(m[1])<24&&Number(m[2])<60?Number(m[1])*60+Number(m[2]):null;};
  const start=minutes(opening),end=minutes(closing);if(start===null||end===null||start===end||!Number.isFinite(now.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const current=Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);
  return start<end?current>=start&&current<end:current>=start||current<end;
}
