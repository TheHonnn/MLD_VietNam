// Read model only: tuition remains in its own ledger, never copied into invoices.
export function projectTuitionReceipts(rows: Array<Record<string, any>>) {
  return rows.map(row => {
    const paid = row.payment_status === 'PAID';
    const refund = row.transaction_type === 'REFUND';
    const amount = Number(row.amount);
    return {
      ...row,
      receipt_source: 'TUITION',
      receipt_net_amount: paid ? (refund ? -amount : amount) : 0,
      invoice_code: row.transaction_code,
      customer_id: row.student_id,
      total_amount: amount,
      subtotal: amount,
      pre_tax_amount: amount,
      discount_amount: 0,
      vat_rate: 0,
      vat_amount: 0,
      payment_status: paid && refund ? 'REFUNDED' : row.payment_status,
      refund_amount: paid && refund ? amount : 0,
      items: [],
    };
  });
}
