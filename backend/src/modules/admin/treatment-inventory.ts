import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import type { AdminActor } from './admin.service';
import { assertRowScope } from './admin.scope';

export async function recordMaterialCount(
  pool: Pool,
  actor: AdminActor,
  body: Record<string, unknown>,
) {
  if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
    throw new ForbiddenException('Chỉ quản lý được ghi nhận kiểm kê.');
  const branchId = String(body.branchId || ''),
    name = String(body.materialName || '').trim(),
    unit = String(body.unit || '').trim(),
    reason = String(body.reason || '').trim();
  const quantity = Number(body.quantity);
  if (
    body.quantity === null ||
    body.quantity === undefined ||
    String(body.quantity).trim() === '' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      branchId,
    ) ||
    !name ||
    !unit ||
    reason.length < 5 ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.00001
  )
    throw new BadRequestException(
      'Cần chi nhánh, vật tư, đơn vị, số lượng kiểm kê thực tế và lý do hợp lệ.',
    );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))",
    );
    await assertRowScope(
      client,
      'branch_material_stock',
      { branch_id: branchId },
      ['branch_id'],
      actor,
      'action',
    );
    const old = (
      await client.query(
        'SELECT * FROM branch_material_stock WHERE branch_id=$1 AND material_name=$2 AND unit=$3 FOR UPDATE',
        [branchId, name, unit],
      )
    ).rows[0];
    if (
      old
        ? body.expectedQuantity === null ||
          body.expectedQuantity === undefined ||
          Number(body.expectedQuantity) !== Number(old.quantity)
        : body.expectedQuantity !== null
    )
      throw new ConflictException(
        'Số dư đã thay đổi hoặc chưa được đối chiếu. Tải lại tồn kho trước khi lưu.',
      );
    const row = (
      await client.query(
        `INSERT INTO branch_material_stock(branch_id,material_name,unit,quantity) VALUES($1,$2,$3,$4)
      ON CONFLICT(branch_id,material_name,unit) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now() RETURNING *`,
        [branchId, name, unit, quantity],
      )
    ).rows[0];
    await client.query(
      'INSERT INTO treatment_stock_movements(stock_id,delta,reason,performed_by) VALUES($1,$2,$3,$4)',
      [row.id, quantity - Number(old?.quantity || 0), reason, actor.id],
    );
    await client.query('COMMIT');
    return row;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function syncInventoryItem(pool: Pool, id: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))",
    );
    const outbox = (
      await client.query(
        'SELECT * FROM treatment_inventory_outbox WHERE id=$1 FOR UPDATE SKIP LOCKED',
        [id],
      )
    ).rows[0];
    if (!outbox || outbox.sync_status === 'SYNCED') {
      await client.query('COMMIT');
      return { synced: Boolean(outbox), alreadyProcessed: true };
    }
    if (!outbox.branch_id) throw new Error('Buổi chưa xác định chi nhánh kho.');
    if (!outbox.treatment_journal_id)
      throw new Error(
        'Yêu cầu không còn liên kết nhật ký điều trị; cần đối chiếu thủ công.',
      );
    const duplicate = await client.query(
      "SELECT 1 FROM treatment_inventory_outbox WHERE treatment_journal_id=$1 AND operation_type=$2 AND id<>$3 AND sync_status='SYNCED' LIMIT 1",
      [outbox.treatment_journal_id, outbox.operation_type, id],
    );
    if (duplicate.rowCount)
      throw new Error(
        'Nghiệp vụ kho của buổi đã được ghi bởi yêu cầu khác; cần đối chiếu hàng đợi trùng.',
      );
    const movements: Array<{ stockId: string; delta: number }> = [];
    if (outbox.operation_type === 'DEDUCT') {
      if (!Array.isArray(outbox.items) || !outbox.items.length)
        throw new Error('Chưa có vật tư thực tế để xuất kho.');
      const grouped = new Map<
        string,
        { name: string; unit: string; quantity: number }
      >();
      for (const item of outbox.items) {
        const name = String(item.name || '').trim(),
          unit = String(item.unit || '').trim(),
          quantity = Number(item.quantity);
        if (
          !name ||
          !unit ||
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.00001
        )
          throw new Error(
            'Vật tư cần tên, đơn vị và số lượng dương, tối đa 3 chữ số thập phân.',
          );
        const key = JSON.stringify([name, unit]);
        const previous = grouped.get(key);
        grouped.set(key, {
          name,
          unit,
          quantity:
            Math.round((quantity + (previous?.quantity || 0)) * 1000) / 1000,
        });
      }
      for (const item of [...grouped.values()].sort((a, b) =>
        (a.name + a.unit).localeCompare(b.name + b.unit),
      )) {
        const stock = (
          await client.query(
            'SELECT * FROM branch_material_stock WHERE branch_id=$1 AND material_name=$2 AND unit=$3 FOR UPDATE',
            [outbox.branch_id, item.name, item.unit],
          )
        ).rows[0];
        if (!stock)
          throw new Error(`Chưa kiểm kê vật tư: ${item.name} (${item.unit}).`);
        if (Number(stock.quantity) < item.quantity)
          throw new Error(`Không đủ tồn kho: ${item.name}.`);
        movements.push({ stockId: stock.id, delta: -item.quantity });
      }
    } else if (outbox.operation_type === 'REVERSE_RESTORE') {
      const original = (
        await client.query(
          "SELECT id,sync_status FROM treatment_inventory_outbox WHERE treatment_journal_id=$1 AND operation_type='DEDUCT' ORDER BY CASE WHEN sync_status='SYNCED' THEN 0 ELSE 1 END,created_at,id LIMIT 1",
          [outbox.treatment_journal_id],
        )
      ).rows[0];
      if (!original || original.sync_status !== 'SYNCED')
        throw new Error('Chưa hoàn tất xuất kho gốc; không ghi hoàn kho giả.');
      const source = (
        await client.query(
          'SELECT stock_id,delta FROM treatment_stock_movements WHERE outbox_id=$1 ORDER BY stock_id',
          [original.id],
        )
      ).rows;
      if (!source.length) throw new Error('Không có bút toán xuất kho gốc.');
      for (const row of source)
        movements.push({ stockId: row.stock_id, delta: -Number(row.delta) });
    } else throw new Error('Loại nghiệp vụ kho không được hỗ trợ.');
    for (const move of movements) {
      const insert = await client.query(
        'INSERT INTO treatment_stock_movements(stock_id,outbox_id,delta,reason) VALUES($1,$2,$3,$4) ON CONFLICT(outbox_id,stock_id) DO NOTHING RETURNING id',
        [move.stockId, id, move.delta, outbox.notes || outbox.operation_type],
      );
      if (insert.rowCount) {
        const update = await client.query(
          'UPDATE branch_material_stock SET quantity=quantity+$2,updated_at=now() WHERE id=$1 AND quantity+$2>=0 RETURNING id',
          [move.stockId, move.delta],
        );
        if (!update.rowCount)
          throw new Error('Tồn kho đã thay đổi; chưa thể ghi bút toán.');
      }
    }
    await client.query(
      "UPDATE treatment_inventory_outbox SET sync_status='SYNCED',synced_at=now(),sync_error=NULL WHERE id=$1",
      [id],
    );
    await client.query('COMMIT');
    return { synced: true };
  } catch (error) {
    await client.query('ROLLBACK');
    const message =
      error instanceof Error ? error.message : 'Không đồng bộ được tồn kho.';
    await pool.query(
      "UPDATE treatment_inventory_outbox SET sync_status='FAILED',sync_error=$2 WHERE id=$1 AND sync_status<>'SYNCED'",
      [id, message.slice(0, 1000)],
    );
    return { synced: false, error: message };
  } finally {
    client.release();
  }
}
