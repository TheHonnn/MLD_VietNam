import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import type { AdminActor } from './admin.service';
import { assertRowScope } from './admin.scope';

export async function createTreatmentBooking(
  pool: Pool,
  actor: AdminActor,
  packageId: string,
  body: Record<string, unknown>,
) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const branchId = String(body.branchId || '');
  const technicianId = body.technicianId ? String(body.technicianId) : null;
  const requestId = String(body.requestId || '');
  const day = String(body.bookingDate || '');
  const start = String(body.startTime || '').slice(0, 5);
  const notes = String(body.notes || '')
    .trim()
    .slice(0, 1500);
  if (
    ![packageId, branchId, requestId].every((value) => uuid.test(value)) ||
    (technicianId && !uuid.test(technicianId))
  )
    throw new BadRequestException(
      'Gói, chi nhánh, yêu cầu hoặc chuyên viên không hợp lệ.',
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
  )
    throw new BadRequestException('Ngày hoặc giờ hẹn không hợp lệ.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))",
    );
    const pkg = (
      await client.query(
        `SELECT up.*,tp.service_id,s.duration_minutes,s.is_active AS service_active,tp.is_active AS package_active
      FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id JOIN services s ON s.id=tp.service_id
      WHERE up.id=$1 FOR UPDATE OF up`,
        [packageId],
      )
    ).rows[0];
    if (!pkg)
      throw new NotFoundException(
        'Không tìm thấy liệu trình có dịch vụ hợp lệ.',
      );
    await assertRowScope(
      client,
      'user_packages',
      pkg,
      ['transferred_from_package_id'],
      actor,
      'read',
    );
    await assertRowScope(
      client,
      'bookings',
      { branch_id: branchId },
      ['branch_id'],
      actor,
      'create',
    );
    const qr = `treatment:${actor.id}:${requestId}`;
    const specialNotes = `[user_package_id=${packageId}] ${notes}`.trim();
    const existing = (
      await client.query(
        'SELECT *,booking_date::text AS day FROM bookings WHERE qr_code_hash=$1',
        [qr],
      )
    ).rows[0];
    if (existing) {
      if (
        existing.customer_id !== pkg.customer_id ||
        existing.branch_id !== branchId ||
        existing.day !== day ||
        String(existing.start_time).slice(0, 5) !== start ||
        existing.special_notes !== specialNotes ||
        (technicianId && existing.technician_id !== technicianId)
      )
        throw new ConflictException(
          'Yêu cầu này đã được dùng với thông tin khác. Kiểm tra lịch đã lưu trước khi tạo lại.',
        );
      await client.query('COMMIT');
      return existing;
    }
    if (
      pkg.status !== 'ACTIVE' ||
      (pkg.expires_at && new Date(pkg.expires_at).getTime() <= Date.now()) ||
      Number(pkg.completed_sessions) >= Number(pkg.total_sessions)
    )
      throw new ConflictException(
        'Gói không hoạt động, đã hết hạn hoặc hết lượt.',
      );
    const reserved = (
      await client.query(
        `SELECT count(*)::int AS count FROM bookings b
      WHERE b.customer_id=$1 AND position($2 IN COALESCE(b.special_notes,''))>0
      AND b.status NOT IN ('CANCELLED','NO_SHOW','COMPLETED')
      AND NOT EXISTS(SELECT 1 FROM treatment_journal j WHERE j.booking_id=b.id AND j.confirmation_status='CONFIRMED' AND NOT j.is_reversed)`,
        [pkg.customer_id, `[user_package_id=${packageId}]`],
      )
    ).rows[0];
    if (
      Number(reserved.count) >=
      Number(pkg.total_sessions) - Number(pkg.completed_sessions)
    )
      throw new ConflictException(
        'Các lượt còn lại đã được đặt lịch. Hãy xử lý lịch hiện có trước.',
      );
    if (!pkg.service_active || !pkg.package_active)
      throw new ConflictException('Dịch vụ hoặc gói đã ngừng hoạt động.');
    if (
      !(
        await client.query(
          'SELECT id FROM branches WHERE id=$1 AND is_active=true',
          [branchId],
        )
      ).rowCount
    )
      throw new ConflictException('Chi nhánh đã ngừng hoạt động.');
    const customer = (
      await client.query(
        'SELECT full_name,phone FROM users WHERE id=$1 AND is_active=true',
        [pkg.customer_id],
      )
    ).rows[0];
    if (!customer)
      throw new ConflictException('Hồ sơ khách hàng không hoạt động.');
    const duration = Number(pkg.duration_minutes);
    if (!Number.isInteger(duration) || duration <= 0 || duration >= 1440)
      throw new ConflictException('Thời lượng dịch vụ chưa hợp lệ.');
    const times = (
      await client.query(
        `SELECT ($1::time + $2::int * interval '1 minute')::time::text AS finish,
      ($3::date + $1::time) > (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AS future,
      ($4::timestamptz IS NULL OR (($3::date + $1::time + $2::int * interval '1 minute') AT TIME ZONE 'Asia/Ho_Chi_Minh') <= $4::timestamptz) AS within_expiry`,
        [start, duration, day, pkg.expires_at],
      )
    ).rows[0];
    if (!times.future || times.finish <= start)
      throw new ConflictException(
        'Lịch phải ở tương lai và kết thúc trong cùng ngày.',
      );
    if (!times.within_expiry)
      throw new ConflictException(
        'Buổi hẹn phải kết thúc trước khi gói hết hạn.',
      );
    const rooms = (
      await client.query(
        'SELECT id,bed_capacity FROM branch_rooms WHERE branch_id=$1 AND is_available=true ORDER BY id FOR UPDATE',
        [branchId],
      )
    ).rows;
    if (!rooms.length)
      throw new ConflictException(
        'Chi nhánh chưa cấu hình phòng và giường phục vụ.',
      );
    const overlapping = (
      await client.query(
        `SELECT assigned_room_id,assigned_bed_number,technician_id FROM bookings
      WHERE branch_id=$1 AND booking_date=$2 AND status NOT IN ('CANCELLED','NO_SHOW','COMPLETED')
      AND start_time<$4::time AND end_time>$3::time`,
        [branchId, day, start, times.finish],
      )
    ).rows;
    const capacity = rooms.reduce(
      (sum, room) => sum + Number(room.bed_capacity),
      0,
    );
    if (overlapping.length >= capacity)
      throw new ConflictException('Khung giờ đã hết giường phục vụ.');
    const technicians = (
      await client.query(
        'SELECT id FROM technicians WHERE branch_id=$1 AND is_active=true AND ($2::uuid IS NULL OR id=$2) ORDER BY id',
        [branchId, technicianId],
      )
    ).rows;
    const assignedTech = technicians.find(
      (tech) =>
        !overlapping.some((booking) => booking.technician_id === tech.id),
    );
    if (!assignedTech)
      throw new ConflictException(
        'Chuyên viên không thuộc chi nhánh, ngừng hoạt động hoặc đã có lịch trùng giờ.',
      );
    let roomId: string | undefined;
    let bed: string | undefined;
    for (const room of rooms) {
      const occupied = overlapping.filter(
        (booking) => booking.assigned_room_id === room.id,
      );
      const occupiedIndexes = occupied.map((booking) =>
        Number(
          String(booking.assigned_bed_number || '').match(
            /^(?:B-)?(\d+)$/i,
          )?.[1],
        ),
      );
      if (
        occupiedIndexes.some(
          (index) =>
            !Number.isInteger(index) ||
            index < 1 ||
            index > Number(room.bed_capacity),
        )
      )
        continue;
      if (occupied.length >= Number(room.bed_capacity)) continue;
      for (let index = 1; index <= Number(room.bed_capacity); index++) {
        const code = `B-${index}`;
        if (!occupiedIndexes.includes(index)) {
          roomId = room.id;
          bed = code;
          break;
        }
      }
      if (roomId) break;
    }
    if (!roomId)
      throw new ConflictException('Không còn phòng phù hợp cho khung giờ.');
    const booking = (
      await client.query(
        `INSERT INTO bookings(booking_code,customer_id,branch_id,assigned_room_id,assigned_bed_number,technician_id,
      booking_date,start_time,end_time,status,payment_status,payment_method,base_total,final_price,booked_for_name,booked_for_phone,special_notes,qr_code_hash)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'CONFIRMED','UNPAID','MEMBERSHIP_WALLET',0,0,$10,$11,$12,$13) RETURNING *`,
        [
          'LT-' + requestId.replace(/-/g, '').slice(0, 24),
          pkg.customer_id,
          branchId,
          roomId,
          bed,
          assignedTech.id,
          day,
          start,
          times.finish,
          customer.full_name,
          customer.phone,
          specialNotes,
          qr,
        ],
      )
    ).rows[0];
    await client.query(
      'INSERT INTO booking_items(booking_id,service_id,technician_id,duration_minutes,price) VALUES($1,$2,$3,$4,0)',
      [booking.id, pkg.service_id, assignedTech.id, duration],
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,table_name,action,record_id) VALUES($1,'bookings','CREATE_PACKAGE_BOOKING',$2)",
      [actor.id, booking.id],
    );
    await client.query('COMMIT');
    return booking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
