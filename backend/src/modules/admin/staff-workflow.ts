import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PoolClient } from 'pg';

export async function validateStaffWorkflow(
  client: PoolClient,
  table: string,
  row: Record<string, any>,
  previous: Record<string, any> | null,
  operation: string,
) {
  if (!['staff_profiles', 'technicians', 'technician_shifts', 'technician_slots'].includes(table)) return;

  if (operation === 'delete') {
    if (table === 'technician_slots' && previous?.status === 'BLOCKED' &&
      (!previous.hold_expires_at || new Date(previous.hold_expires_at) <= new Date())) return;
    throw new ConflictException('Giữ lịch sử vận hành. Hãy ngừng hoạt động, hủy ca hoặc gỡ khung giờ khóa phù hợp.');
  }

  if (table === 'staff_profiles') {
    if (!previous) {
      const account = (await client.query('SELECT role,is_active FROM users WHERE id=$1', [row.user_id])).rows[0];
      if (!account?.is_active || ['CUSTOMER','STUDENT','GUEST'].includes(account.role)) {
        throw new ConflictException('Chọn tài khoản nhân viên đang hoạt động. Vai trò được quản lý ở trang Tài khoản.');
      }
      if (!row.department_id) throw new BadRequestException('Chọn bộ phận cho hồ sơ nhân viên.');
    }
    if (previous && previous.user_id !== row.user_id) {
      throw new ConflictException('Tài khoản đã liên kết với hồ sơ nhân viên.');
    }
    if (row.department_id && row.department_id !== previous?.department_id) {
      const department = await client.query('SELECT id FROM departments WHERE id=$1 AND is_active', [row.department_id]);
      if (!department.rowCount) throw new ConflictException('Chọn bộ phận đang hoạt động.');
    }
    const linked = previous && await client.query(
      'SELECT id FROM technicians WHERE staff_profile_id=$1 AND is_active', [previous.id],
    );
    if (linked && linked.rowCount && (row.is_active === false || row.branch_id !== previous?.branch_id)) {
      throw new ConflictException('Ngừng hoạt động hồ sơ kỹ thuật viên liên kết trước khi đổi chi nhánh hoặc ngừng hồ sơ nhân viên.');
    }
    return;
  }

  if (table === 'technicians') {
    if (row.staff_profile_id && row.staff_profile_id !== previous?.staff_profile_id) {
      const duplicate = await client.query('SELECT 1 FROM technicians WHERE staff_profile_id=$1 AND id IS DISTINCT FROM $2', [row.staff_profile_id, previous?.id ?? null]);
      if (duplicate.rowCount) throw new ConflictException('Nhân viên đã có hồ sơ kỹ thuật viên.');
    }
    if (row.staff_profile_id && row.is_active !== false) {
      const staff = (await client.query(
        'SELECT user_id,branch_id FROM staff_profiles WHERE id=$1 AND is_active', [row.staff_profile_id],
      )).rows[0];
      if (!staff || staff.branch_id !== row.branch_id || (row.user_id && staff.user_id !== row.user_id)) {
        throw new ConflictException('Hồ sơ nhân viên phải đang hoạt động và khớp chi nhánh, tài khoản của kỹ thuật viên.');
      }
    }
    if (previous && (row.is_active === false || row.branch_id !== previous.branch_id)) {
      const pending = await client.query(
        "SELECT 1 FROM bookings WHERE technician_id=$1 AND (status IN ('CHECKED_IN','IN_SERVICE') OR (status IN ('PENDING','CONFIRMED') AND booking_date + end_time > now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) LIMIT 1",
        [previous.id],
      );
      if (pending.rowCount) throw new ConflictException('Xử lý các lịch hẹn còn hiệu lực của kỹ thuật viên trước.');
      if (row.branch_id !== previous.branch_id) {
        const shifts = await client.query(
          "SELECT 1 FROM technician_shifts WHERE technician_id=$1 AND NOT is_cancelled AND shift_date + end_time > now() AT TIME ZONE 'Asia/Ho_Chi_Minh' LIMIT 1",
          [previous.id],
        );
        if (shifts.rowCount) throw new ConflictException('Hủy các ca trực còn hiệu lực ở chi nhánh cũ trước khi chuyển.');
      }
    }
    return;
  }

  const shift = table === 'technician_shifts';
  const day = shift ? row.shift_date : row.slot_date;
  if (!row.start_time || !row.end_time || String(row.start_time).slice(0, 5) >= String(row.end_time).slice(0, 5)) {
    throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu.');
  }
  if (!shift && (row.status !== 'BLOCKED' || row.held_by_user_id || row.hold_expires_at ||
    (previous && previous.status !== 'BLOCKED'))) {
    throw new ConflictException('Tại đây chỉ quản lý khung giờ khóa. Trạng thái giữ chỗ và đã đặt do hệ thống cập nhật.');
  }
  if (!shift || !row.is_cancelled) {
    const tech = (await client.query(
      'SELECT branch_id,is_active FROM technicians WHERE id=$1', [row.technician_id],
    )).rows[0];
    if (!tech?.is_active || tech.branch_id !== row.branch_id) {
      throw new ConflictException('Chọn kỹ thuật viên đang hoạt động tại đúng chi nhánh.');
    }
    if (shift) {
      const branchHours = await client.query('SELECT 1 FROM branches WHERE id=$1 AND is_active AND opening_time<=$2 AND closing_time>=$3',
        [row.branch_id, row.start_time, row.end_time]);
      if (!branchHours.rowCount) throw new ConflictException('Ca trực phải nằm trong giờ mở cửa của chi nhánh đang hoạt động.');
    }
    if (shift && row.assigned_room_id) {
      const room = await client.query('SELECT 1 FROM branch_rooms WHERE id=$1 AND branch_id=$2 AND is_available',
        [row.assigned_room_id, row.branch_id]);
      if (!room.rowCount) throw new ConflictException('Chọn phòng đang sử dụng tại chi nhánh của ca trực.');
    }
    const overlap = await client.query(
      shift
        ? 'SELECT 1 FROM technician_shifts WHERE technician_id=$1 AND shift_date=$2 AND start_time<$4 AND end_time>$3 AND id IS DISTINCT FROM $5 AND NOT is_cancelled'
        : "SELECT 1 FROM technician_slots WHERE technician_id=$1 AND slot_date=$2 AND start_time<$4 AND end_time>$3 AND id IS DISTINCT FROM $5 AND (status IN ('BLOCKED','BOOKED') OR (status='HOLD' AND hold_expires_at>now()))",
      [row.technician_id, day, row.start_time, row.end_time, previous?.id ?? null],
    );
    if (overlap.rowCount) throw new ConflictException('Ca trực hoặc giờ khóa bị trùng.');
  }

  const protectedWindow = shift ? previous : row;
  if (protectedWindow) {
    const bookingConflict = await client.query(
      "SELECT 1 FROM bookings WHERE technician_id=$1 AND booking_date=$2 AND start_time<$4::time AND end_time + interval '15 minutes'>$3::time AND (status IN ('CHECKED_IN','IN_SERVICE') OR (status IN ('PENDING','CONFIRMED') AND booking_date+end_time>now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) " +
      (shift ? 'AND ($5 OR branch_id<>$6 OR booking_date<>$7 OR start_time<$8 OR end_time + interval \'15 minutes\'>$9 OR ($10::uuid IS NOT NULL AND assigned_room_id IS DISTINCT FROM $10))' : '') +
      ' LIMIT 1',
      shift
        ? [previous?.technician_id, previous?.shift_date, previous?.start_time, previous?.end_time, Boolean(row.is_cancelled) || row.technician_id !== previous?.technician_id, row.branch_id, day, row.start_time, row.end_time, row.assigned_room_id ?? null]
        : [row.technician_id, day, row.start_time, row.end_time],
    );
    if (bookingConflict.rowCount) throw new ConflictException('Khung giờ đã có lịch hẹn. Điều phối lịch hẹn trước khi thay đổi ca hoặc khóa giờ.');
  }
}
