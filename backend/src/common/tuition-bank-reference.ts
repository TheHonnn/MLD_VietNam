import { createHash } from 'node:crypto';

export function tuitionBankCode(reference: string): string {
  return 'BANK-EDU-' + createHash('sha256').update(reference.trim().toUpperCase()).digest('hex').slice(0, 36);
}
