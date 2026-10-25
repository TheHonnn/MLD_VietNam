import {Prisma} from '@prisma/client';

// Admin stores the phone as entered. Ignore presentation separators only;
// never strip letters/extensions or guess an identity from the last digits.
export function localPhone(value: unknown): string | null {
  if(typeof value!=='string'||value.length>100)return null;
  const phone=value.replace(/[\s().-]/g,'').replace(/^\+?84/,'0');
  return /^0[1-9]\d{8,9}$/.test(phone)?phone:null;
}

export function phoneIdentity(column: Prisma.Sql, phone: string): Prisma.Sql {
  const international='84'+phone.slice(1);
  return Prisma.sql`regexp_replace(${column}, '[[:space:]().-]', '', 'g') IN (${phone},${international},${'+'+international})`;
}
