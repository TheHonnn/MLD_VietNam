import { it, expect } from 'vitest';
import { projectTuitionReceipts } from './admin.receipts';

it('counts only confirmed tuition and subtracts confirmed refunds without creating invoices', () => {
  const receipts = projectTuitionReceipts([
    { id: 'deposit', transaction_code: 'TT-1', student_id: 'student', amount: '200000', transaction_type: 'DEPOSIT', payment_status: 'PAID' },
    { id: 'balance', transaction_code: 'TT-2', student_id: 'student', amount: '800000', transaction_type: 'REMAINING_BALANCE', payment_status: 'PENDING' },
    { id: 'refund', transaction_code: 'TT-3', student_id: 'student', amount: '50000', transaction_type: 'REFUND', payment_status: 'PAID' },
    { id: 'pending-refund', transaction_code: 'TT-4', student_id: 'student', amount: '25000', transaction_type: 'REFUND', payment_status: 'PENDING' },
  ]);
  expect(receipts.reduce((sum, receipt) => sum + receipt.receipt_net_amount, 0)).toBe(150000);
  expect(receipts.map(receipt => receipt.id)).toEqual(['deposit', 'balance', 'refund', 'pending-refund']);
  expect(receipts[2].payment_status).toBe('REFUNDED');
  expect(receipts[3].payment_status).toBe('PENDING');
  expect(receipts.every(receipt => receipt.receipt_source === 'TUITION')).toBe(true);
});
