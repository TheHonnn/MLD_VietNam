import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { assertRowScope } from './admin.scope';
import type { AdminActor } from './admin.service';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (value: number) => [Math.floor(value / 60), value % 60].map(part => String(part).padStart(2, '0')).join(':');
const buffer = 15;

export async function scheduleAvailability(client: PoolClient, actor: AdminActor, branchId: string, day: string, serviceId: string, operation: 'read' | 'create' | 'update' = 'read', excludedBookingId?: string) {
  if (!uuid.test(branchId) || !uuid.test(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)
    throw new BadRequestException('Cần chọn chi nhánh, ngày và dịch vụ hợp lệ.');
  await assertRowScope(client, 'bookings', {branch_id: branchId}, ['branch_id'], actor, operation);
  const branch = (await client.query('SELECT opening_time,closing_time FROM branches WHERE id=$1 AND is_active', [branchId])).rows[0];
  const service = (await client.query('SELECT duration_minutes,price,discount_price FROM services WHERE id=$1 AND is_active', [serviceId])).rows[0];
  if (!branch || !service || !(Number(service.duration_minutes) > 0))
    throw new ConflictException('Chi nhánh hoặc dịch vụ chưa sẵn sàng nhận lịch.');
  const shifts = (await client.query(
    'SELECT s.*,t.full_name FROM technician_shifts s JOIN technicians t ON t.id=s.technician_id WHERE s.branch_id=$1 AND s.shift_date=$2 AND NOT s.is_cancelled AND t.is_active AND t.branch_id=s.branch_id AND (t.staff_profile_id IS NULL OR EXISTS (SELECT 1 FROM staff_profiles p WHERE p.id=t.staff_profile_id AND p.is_active AND p.branch_id=s.branch_id)) AND NOT EXISTS (SELECT 1 FROM staff_leaves l WHERE l.staff_id=t.staff_profile_id AND l.status=\'APPROVED\' AND s.shift_date BETWEEN l.start_date AND l.end_date) ORDER BY s.start_time,s.id',
    [branchId, day],
  )).rows;
  const blocks = (await client.query(
    "SELECT technician_id,start_time,end_time FROM technician_slots WHERE slot_date=$1 AND (status IN ('BLOCKED','BOOKED') OR (status='HOLD' AND hold_expires_at>now()))",
    [day],
  )).rows;
  const rooms = (await client.query(
    'SELECT id,name,bed_capacity FROM branch_rooms WHERE branch_id=$1 AND is_available ORDER BY name,id', [branchId],
  )).rows;
  const hasBeds = (await client.query("SELECT to_regclass('public.branch_beds') IS NOT NULL AS present")).rows[0].present;
  const beds = hasBeds ? (await client.query(
    'SELECT id,room_id,bed_code,name,is_active,status FROM branch_beds WHERE branch_id=$1 ORDER BY bed_code,id', [branchId],
  )).rows : [];
  const bookings = (await client.query(
    "SELECT technician_id,branch_id,assigned_room_id,assigned_bed_number,start_time,end_time,to_jsonb(bookings)->>'bed_id' AS bed_id FROM bookings WHERE booking_date=$1 AND ($2::uuid IS NULL OR id<>$2) AND (branch_id=$3 OR technician_id IN (SELECT technician_id FROM technician_shifts WHERE branch_id=$3 AND shift_date=$1)) AND status NOT IN ('CANCELLED','NO_SHOW')",
    [day, excludedBookingId ?? null, branchId],
  )).rows;
  const now = (await client.query("SELECT to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD HH24:MI') AS local")).rows[0].local as string;
  const duration = Number(service.duration_minutes);
  const slots: { technicianId: string; technicianName: string; start: string; end: string; roomId: string; roomName: string; bed: string; bedId?: string }[] = [];
  for (let start = Math.ceil(minute(branch.opening_time) / 15) * 15; start + duration + buffer <= minute(branch.closing_time); start += 15) {
    const end = start + duration;
    if (day + ' ' + clock(start) <= now) continue;
    const overlaps = (row: {start_time:string;end_time:string}, extra = 0) =>
      minute(row.start_time) < end + buffer && minute(row.end_time) + extra > start;
    const occupied = bookings.filter(row => overlaps(row, buffer));
    // Legacy bookings without an identified room consume capacity too. Avoid promising a specific bed in that interval.
    if (occupied.some(row => row.branch_id === branchId && !row.assigned_room_id)) continue;
    const assigned = new Set<string>();
    for (const shift of shifts) {
      const technicianId = shift.technician_id;
      if (assigned.has(technicianId) || minute(shift.start_time) > start || minute(shift.end_time) < end + buffer ||
        occupied.some(row => row.technician_id === technicianId) ||
        blocks.some(row => row.technician_id === technicianId && overlaps(row))) continue;
      for (const room of rooms) {
        if (shift.assigned_room_id && shift.assigned_room_id !== room.id) continue;
        const used = occupied.filter(row => row.assigned_room_id === room.id);
        const physicalBeds = beds.filter(bed => bed.room_id === room.id);
        let bedId: string | undefined;
        let bed: string;
        if (physicalBeds.length) {
          if (used.length >= room.bed_capacity || used.some(row => !physicalBeds.some(item =>
            item.id === row.bed_id || item.bed_code === row.assigned_bed_number || item.name === row.assigned_bed_number))) continue;
          const availableBed = physicalBeds.find(item => item.is_active && item.status !== 'MAINTENANCE' &&
            (day !== now.slice(0, 10) || item.status === 'AVAILABLE') && !used.some(row =>
              item.id === row.bed_id || item.bed_code === row.assigned_bed_number || item.name === row.assigned_bed_number));
          if (!availableBed) continue;
          bedId = availableBed.id;
          bed = availableBed.bed_code;
        } else {
          const indexes = used.map(row => Number(String(row.assigned_bed_number || '').match(/^(?:B-)?(\d+)$/i)?.[1]));
          if (indexes.some(index => !Number.isInteger(index) || index < 1 || index > room.bed_capacity)) continue;
          const availableBed = Array.from({length: room.bed_capacity}, (_, index) => index + 1).find(index => !indexes.includes(index));
          if (availableBed === undefined) continue;
          bed = 'B-' + availableBed;
        }
        slots.push({technicianId, technicianName: shift.full_name, start: clock(start), end: clock(end), roomId: room.id, roomName: room.name, bed, bedId});
        assigned.add(technicianId);
        break;
      }
    }
  }
  return {slots, service, shifts};
}

export async function createStaffBooking(pool: Pool, actor: AdminActor, body: Record<string, unknown>) {
  const {branchId, bookingDate, serviceId, customerId, technicianId, startTime, requestId} = Object.fromEntries(
    ['branchId','bookingDate','serviceId','customerId','technicianId','startTime','requestId'].map(key => [key,String(body[key] || '')]),
  );
  if (![customerId, technicianId, requestId, branchId, serviceId].every(value => uuid.test(value)) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime))
    throw new BadRequestException('Chọn khách, dịch vụ, kỹ thuật viên và giờ hẹn hợp lệ.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))");
    await client.query('LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE');
    await assertRowScope(client, 'bookings', {branch_id:branchId}, ['branch_id'], actor, 'create');
    const code = 'LH-' + requestId.replace(/-/g, '').slice(0, 27);
    const status = body.status === 'PENDING' ? 'PENDING' : 'CONFIRMED';
    const notes = String(body.notes || '').trim().slice(0, 1500) || null;
    const existing = (await client.query(
      'SELECT b.*,i.service_id,b.booking_date::text AS day FROM bookings b JOIN booking_items i ON i.booking_id=b.id WHERE b.booking_code=$1', [code],
    )).rows[0];
    if (existing) {
      if (existing.customer_id !== customerId || existing.technician_id !== technicianId || existing.branch_id !== branchId ||
        existing.service_id !== serviceId || existing.day !== bookingDate || existing.start_time.slice(0,5) !== startTime ||
        existing.special_notes !== notes)
        throw new ConflictException('Yêu cầu đã được dùng cho lịch khác.');
      await client.query('COMMIT');
      return {id:existing.id,bookingCode:code};
    }
    const {slots,service} = await scheduleAvailability(client, actor, branchId, bookingDate, serviceId, 'create');
    const slot = slots.find(item => item.technicianId === technicianId && item.start === startTime);
    if (!slot) throw new ConflictException('Khung giờ không còn phù hợp. Hãy tải lại và chọn giờ khác.');
    const customer = (await client.query('SELECT full_name,phone FROM users WHERE id=$1 AND is_active', [customerId])).rows[0];
    if (!customer) throw new ConflictException('Hồ sơ khách hàng không hoạt động.');
    const price = Number(service.price);
    const finalPrice = Number(service.discount_price) > 0 ? Math.min(price, Number(service.discount_price)) : price;
    const booking = (await client.query(
      'INSERT INTO bookings(booking_code,customer_id,branch_id,assigned_room_id,assigned_bed_number,technician_id,booking_date,start_time,end_time,status,payment_status,payment_method,base_total,discount_amount,final_price,booked_for_name,booked_for_phone,special_notes,qr_code_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,\'UNPAID\',\'CASH_AT_SPA\',$11,$12,$13,$14,$15,$16,$17) RETURNING id',
      [code,customerId,branchId,slot.roomId,slot.bed,technicianId,bookingDate,slot.start,slot.end,status,price,price-finalPrice,finalPrice,customer.full_name,customer.phone,notes,randomUUID()],
    )).rows[0];
    if (slot.bedId) await client.query('UPDATE bookings SET bed_id=$2 WHERE id=$1', [booking.id, slot.bedId]);
    await client.query('INSERT INTO booking_items(booking_id,service_id,technician_id,duration_minutes,price) VALUES($1,$2,$3,$4,$5)', [booking.id,serviceId,technicianId,service.duration_minutes,finalPrice]);
    await client.query("INSERT INTO audit_logs(actor_id,table_name,action,record_id) VALUES($1,'bookings','CREATE_STAFF_BOOKING',$2)", [actor.id,booking.id]);
    await client.query('COMMIT');
    return {id:booking.id,bookingCode:code};
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}


export async function assignStaffBooking(pool: Pool, actor: AdminActor, bookingId: string, technicianId: string) {
  if (!uuid.test(bookingId) || !uuid.test(technicianId)) {
    throw new BadRequestException('Chọn lịch hẹn và kỹ thuật viên hợp lệ.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))");
    await client.query('LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE');
    const booking = (await client.query(
      'SELECT *, booking_date::text AS day FROM bookings WHERE id=$1 FOR UPDATE', [bookingId],
    )).rows[0];
    if (!booking) throw new ConflictException('Không tìm thấy lịch hẹn.');
    await assertRowScope(client, 'bookings', booking, Object.keys(booking), actor, 'update');
    if (booking.technician_id || !['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new ConflictException('Chỉ phân công lịch đang chờ và chưa có kỹ thuật viên.');
    }
    const items = (await client.query('SELECT service_id FROM booking_items WHERE booking_id=$1', [bookingId])).rows;
    if (items.length !== 1) throw new ConflictException('Cần kiểm tra lịch có duy nhất một dịch vụ trước khi phân công từ bảng ca.');
    const { slots } = await scheduleAvailability(client, actor, booking.branch_id, booking.day, items[0].service_id, 'update', bookingId);
    const slot = slots.find(item => item.technicianId === technicianId &&
      item.start === booking.start_time.slice(0, 5) && item.end === booking.end_time.slice(0, 5));
    if (!slot) throw new ConflictException('Kỹ thuật viên hoặc phòng giường không phù hợp với giờ đã đặt.');
    await client.query('UPDATE bookings SET technician_id=$2,assigned_room_id=$3,assigned_bed_number=$4,updated_at=now() WHERE id=$1',
      [bookingId, technicianId, slot.roomId, slot.bed]);
    if (slot.bedId) await client.query('UPDATE bookings SET bed_id=$2 WHERE id=$1', [bookingId, slot.bedId]);
    await client.query('UPDATE booking_items SET technician_id=$2 WHERE booking_id=$1', [bookingId, technicianId]);
    await client.query("INSERT INTO audit_logs(actor_id,table_name,action,record_id) VALUES($1,'bookings','ASSIGN_STAFF_BOOKING',$2)", [actor.id, bookingId]);
    await client.query('COMMIT');
    return { id: bookingId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
