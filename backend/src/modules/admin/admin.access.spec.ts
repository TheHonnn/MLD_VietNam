import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'crypto';

const { loadAdminSchema } = require('../../../../database/testing/admin-schema.cjs');

describe('admin branch policy in the migrated schema', () => {
  it('allows a cashier only in the assigned branch and rejects unsigned customer scope', async () => {
    const db = new PGlite();
    try {
      await loadAdminSchema(db);
      const branchA = randomUUID(), branchB = randomUUID(), cashier = randomUUID(), customer = randomUUID();
      for (const [id, code] of [[branchA, 'POLICY-A'], [branchB, 'POLICY-B']]) {
        await db.query("INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES($1,$2,$2,'0900000000','Test','Test',10,106,'https://example.invalid')", [id, code]);
      }
      await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000001','Cashier','CASHIER','POLICYCASH')", [cashier]);
      await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000002','Customer','CUSTOMER','POLICYCUST')", [customer]);
      const role = (await db.query("INSERT INTO roles(code,name) VALUES('POLICY-CASHIER','Cashier') RETURNING id")).rows[0] as { id: string };
      await db.query('INSERT INTO user_roles(user_id,role_id,branch_id) VALUES($1,$2,$3)', [cashier, role.id, branchA]);
      const otherBooking = (await db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('POLICY-OTHER-BOOKING',$1,$2,CURRENT_DATE,'09:00','10:00',100,100,'POLICY-OTHER-QR') RETURNING id", [customer, branchB])).rows[0] as { id: string };
      await db.query('SET ROLE authenticated');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [cashier]);
      expect((await db.query('SELECT public.admin_can_access_branch($1::uuid) AS allowed', [branchA])).rows[0].allowed).toBe(true);
      expect((await db.query('SELECT public.admin_can_access_branch($1::uuid) AS allowed', [branchB])).rows[0].allowed).toBe(false);
      await expect(db.query('SELECT public.fn_send_home_care_guideline($1::uuid,$2::uuid)', [customer, randomUUID()]))
        .rejects.toThrow(/lịch hẹn hoặc buổi trị liệu/);
      await expect(db.query('SELECT public.fn_send_home_care_guideline($1::uuid,$2::uuid,$3::uuid)', [customer, randomUUID(), otherBooking.id]))
        .rejects.toThrow(/chi nhánh/);
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [customer]);
      expect((await db.query('SELECT public.admin_can_access_branch($1::uuid) AS allowed', [branchA])).rows[0].allowed).toBe(false);
      expect((await db.query('SELECT public.admin_is_super() AS allowed')).rows[0].allowed).toBe(false);
    } finally {
      await db.close();
    }
  }, 60000);

  it('rejects receipt edits for another branch through the privileged RPC', async () => {
    const db = new PGlite();
    try {
      await loadAdminSchema(db);
      const ownBranch = randomUUID(), otherBranch = randomUUID(), cashier = randomUUID(), customer = randomUUID();
      for (const [id, code] of [[ownBranch, 'RPC-OWN'], [otherBranch, 'RPC-OTHER']])
        await db.query("INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES($1,$2,$2,'0900000000','Test','Test',10,106,'https://example.invalid')", [id, code]);
      await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000011','Cashier','CASHIER','RPCCASH')", [cashier]);
      await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000012','Customer','CUSTOMER','RPCCUST')", [customer]);
      const role = (await db.query("INSERT INTO roles(code,name) VALUES('RPC-CASHIER','Cashier') RETURNING id")).rows[0] as { id: string };
      await db.query('INSERT INTO user_roles(user_id,role_id,branch_id) VALUES($1,$2,$3)', [cashier, role.id, ownBranch]);
      const invoice = (await db.query("INSERT INTO invoices(invoice_code,branch_id,customer_id,subtotal,pre_tax_amount,total_amount) VALUES('RPC-OTHER-INV',$1,$2,100,100,100) RETURNING id", [otherBranch, customer])).rows[0] as { id: string };
      await db.query('SET ROLE authenticated');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [cashier]);
      await expect(db.query('SELECT public.fn_edit_invoice_receipt_complete($1::uuid,$2,$3,$4,$5,$6::jsonb)',
        [invoice.id, 'Customer', 'Description', 'Notes', 'Verified reason', '[]'])).rejects.toThrow(/chi nhánh/);
    } finally { await db.close(); }
  }, 60000);

  it('hides finance rows from anonymous users and other branches', async () => {
    const db = new PGlite();
    try {
      await loadAdminSchema(db);
      const ownBranch = randomUUID(), otherBranch = randomUUID(), cashier = randomUUID(), customer = randomUUID();
      for (const [id, code] of [[ownBranch, 'FIN-OWN'], [otherBranch, 'FIN-OTHER']])
        await db.query("INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES($1,$2,$2,'0900000000','Test','Test',10,106,'https://example.invalid')", [id, code]);
      await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000021','Cashier','CASHIER','FINCASH')", [cashier]);
      await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000022','Customer','CUSTOMER','FINCUST')", [customer]);
      const role = (await db.query("INSERT INTO roles(code,name) VALUES('FIN-CASHIER','Cashier') RETURNING id")).rows[0] as { id: string };
      await db.query('INSERT INTO user_roles(user_id,role_id,branch_id) VALUES($1,$2,$3)', [cashier, role.id, ownBranch]);
      await db.query("INSERT INTO invoices(invoice_code,branch_id,customer_id,subtotal,pre_tax_amount,total_amount) VALUES('FIN-OWN-INV',$1,$2,100,100,100)", [ownBranch, customer]);
      await db.query("INSERT INTO invoices(invoice_code,branch_id,customer_id,subtotal,pre_tax_amount,total_amount) VALUES('FIN-OTHER-INV',$1,$2,100,100,100)", [otherBranch, customer]);
      await db.query('SET ROLE anon');
      await expect(db.query('SELECT * FROM invoices')).rejects.toThrow(/permission denied/);
      await db.query('RESET ROLE');
      await db.query('SET ROLE authenticated');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [cashier]);
      const ownInvoices = (await db.query('SELECT invoice_code FROM invoices ORDER BY invoice_code')).rows;
      expect(ownInvoices).toEqual([{ invoice_code: 'FIN-OWN-INV' }]);
      await expect(db.query("INSERT INTO invoices(invoice_code,branch_id,customer_id,subtotal,pre_tax_amount,total_amount) VALUES('FIN-FORGED',$1,$2,100,100,100)", [otherBranch, customer])).rejects.toThrow(/permission denied/);
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [customer]);
      expect((await db.query('SELECT invoice_code FROM invoices ORDER BY invoice_code')).rows).toHaveLength(2);
      await expect(db.query("INSERT INTO invoices(invoice_code,branch_id,customer_id,subtotal,pre_tax_amount,total_amount) VALUES('FIN-CUSTOMER-FORGED',$1,$2,100,100,100)", [ownBranch, customer])).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  }, 60000);
});
