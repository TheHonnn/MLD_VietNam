export function contactPhone(value: unknown): string | null {
  if(typeof value!=='string'||value.length>100)return null;
  const phone=value.replace(/[\s().-]/g,'').replace(/^\+?84/,'0');
  return /^0[1-9]\d{8,9}$/.test(phone)?phone:null;
}
