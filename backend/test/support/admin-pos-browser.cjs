const assert=require('node:assert/strict');
const path=require('node:path');
async function verifyPosPayment(page,pg,frontendUrl,output) {
  const guest='bbbbbbbb-0001-0001-0001-000000000001';
  await pg.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000000','Khách hàng Vãng lai (Guest)','CUSTOMER','POSGUEST')",[guest]);
  const category=(await pg.query("INSERT INTO service_categories(name,code,icon_url) VALUES('POS tests','POS-E2E','https://example.invalid/icon.png') RETURNING id")).rows[0];
  const service=(await pg.query("INSERT INTO services(category_id,name,slug,short_description,full_description,price,discount_price,image_url) VALUES($1,'Dịch vụ kiểm thử POS','pos-e2e','Test','Test',100000,80000,'https://example.invalid/service.png') RETURNING id",[category.id])).rows[0];
  await page.goto(frontendUrl+'/cashier-pos');
  await page.getByRole('heading',{name:'Dịch vụ kiểm thử POS',exact:true}).waitFor();
  await page.getByRole('button',{name:'Mở ca thu ngân mới',exact:true}).click();
  await page.getByRole('button',{name:'Xác nhận mở ca',exact:true}).click();
  await page.getByRole('button',{name:'Xác nhận mở ca',exact:true}).waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'Dịch vụ kiểm thử POS',exact:true}).locator('..').locator('..').getByRole('button',{name:'Chọn',exact:true}).click();
  await page.getByRole('button',{name:/Xác nhận thanh toán & In hóa đơn/}).click();
  await page.getByText('Thanh toán thành công!',{exact:true}).waitFor();
  const invoices=(await pg.query("SELECT * FROM invoices WHERE customer_id=$1 AND payment_status='PAID'",[guest])).rows;
  assert.equal(invoices.length,1);
  assert.equal(Number(invoices[0].subtotal),80000);
  assert.equal((await pg.query('SELECT count(*)::int n FROM invoice_items WHERE invoice_id=$1',[invoices[0].id])).rows[0].n,1);
  const shift=(await pg.query('SELECT * FROM cashier_shifts WHERE id=$1',[invoices[0].shift_id])).rows[0];
  assert.equal(Number(shift.total_sales),Number(invoices[0].total_amount));
  await page.screenshot({path:path.join(output,'pos-paid-desktop.png')});
  const batch=(await pg.query('SELECT id,course_id,branch_id FROM course_batches LIMIT 1')).rows[0];
  const enrollment=(await pg.query('INSERT INTO course_enrollments(student_id,course_id,batch_id,tuition_total,amount_paid) VALUES($1,$2,$3,1000000,150000) RETURNING id',[guest,batch.course_id,batch.id])).rows[0];
  for (const [code,type,status,amount] of [['POS-TUI-1','DEPOSIT','PAID',200000],['POS-TUI-2','REFUND','PAID',50000],['POS-TUI-3','REMAINING_BALANCE','PENDING',800000]]) {
    await pg.query("INSERT INTO tuition_transactions(transaction_code,enrollment_id,student_id,course_id,branch_id,transaction_type,amount,payment_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[code,enrollment.id,guest,batch.course_id,batch.branch_id,type,amount,status]);
  }
  await page.goto(frontendUrl+'/cashier-pos?tab=tuition');
  await page.getByTestId('tuition-net-total').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-testid="tuition-net-total"]')?.textContent.trim()==='150.000đ');
  await page.screenshot({path:path.join(output,'tuition-ledger-desktop.png')});
  await pg.query("INSERT INTO invoices(invoice_code,branch_id,customer_id,enrollment_id,subtotal,pre_tax_amount,total_amount,payment_status,paid_at) VALUES('LEGACY-TUI',$1,$2,$3,150000,150000,150000,'PAID',now())",[batch.branch_id,guest,enrollment.id]);
  await page.goto(frontendUrl+'/reports');
  await page.getByRole('heading',{name:'Báo cáo doanh thu',exact:true}).waitFor();
  await page.getByText('POS-TUI-1',{exact:true}).waitFor();
  await page.getByText('POS-TUI-2',{exact:true}).waitFor();
  assert.equal(await page.getByText('LEGACY-TUI',{exact:true}).count(),0,'Legacy enrollment invoice must not duplicate the tuition ledger');
  assert.equal(await page.locator('input[type="month"]').first().inputValue(),new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date()));
  const expectedNet = `${(Number(invoices[0].total_amount)+150000).toLocaleString('vi-VN')}đ`;
  await page.getByText(expectedNet,{exact:true}).first().waitFor();
  await page.screenshot({path:path.join(output,'financial-report-desktop.png')});
  return {cartToPersistedInvoice:'passed',shiftReconciliation:'passed',discountedPrice:'passed',tuitionHistoryNet:'passed',monthlyFinancialLedger:'passed'};
}
module.exports={verifyPosPayment};
