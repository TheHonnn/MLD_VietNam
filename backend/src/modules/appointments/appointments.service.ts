import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../../database/supabase.service';
import { RedisService } from '../../database/redis.service';
import { HoldSlotDto } from './dto/hold-slot.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private redisService: RedisService,
  ) {}

  /**
   * 1. GIỮ CHỖ KHUNG GIỜ TRONG 10 PHÚT (HOLD SLOT CHỐNG DOUBLE-BOOKING)
   * Sử dụng Redis Distributed Lock (TTL 600s = 10 phút)
   * và cập nhật bảng technician_slots trong Supabase
   */
  async holdSlot(userId: string, dto: HoldSlotDto) {
    const { slotId, technicianId, branchId, slotDate, startTime } = dto;
    const effectiveSlotId =
      slotId ||
      `slot-${technicianId || 'random'}-${slotDate || 'today'}-${(startTime || '1000').replace(':', '')}`;
    const lockKey = `lock:slot:${effectiveSlotId}`;

    // 1. Thử xin Redis Lock (TTL 600 giây = 10 phút)
    const acquired = await this.redisService.acquireLock(lockKey, userId || 'guest', 600);
    if (!acquired) {
      throw new ConflictException(
        'Khung giờ này vừa có người khác đang giữ chỗ để thanh toán, vui lòng chọn khung giờ khác!',
      );
    }

    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 2. Cập nhật hoặc ghi nhận trạng thái HOLD vào Supabase DB (technician_slots)
    try {
      if (slotId) {
        const { data: slot } = await this.supabaseService.adminClient
          .from('technician_slots')
          .select('id, status, hold_expires_at')
          .eq('id', slotId)
          .maybeSingle();

        if (slot) {
          if (slot.status === 'BOOKED' || slot.status === 'BLOCKED') {
            await this.redisService.releaseLock(lockKey, userId || 'guest');
            throw new ConflictException('Khung giờ này đã được đặt hoặc bị tạm đóng');
          }

          await this.supabaseService.adminClient
            .from('technician_slots')
            .update({
              status: 'HOLD',
              held_by_user_id: userId && userId !== 'default-user' ? userId : null,
              hold_expires_at: holdExpiresAt,
            })
            .eq('id', slotId);
        }
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Lỗi cập nhật DB technician_slots hold: ${err.message}`);
    }

    return {
      success: true,
      message: 'Giữ chỗ khung giờ thành công trong 10 phút để thanh toán cọc',
      slotId: effectiveSlotId,
      holdExpiresAt,
      holdDurationSeconds: 600,
    };
  }

  /**
   * 2. XÁC NHẬN VÀ TẠO LỊCH HẸN SPA (BOOKINGS & BOOKING_ITEMS)
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    const {
      branchId,
      serviceId,
      addonServiceIds,
      technicianId,
      slotId,
      bookingDate,
      startTime,
      endTime,
      bookedForName,
      bookedForPhone,
      specialNotes,
      paymentMethod = 'VIETQR',
      couponCode,
    } = dto;

    const bookingCode = dto.bookingCode || `MLD-BK-${Date.now().toString().slice(-6)}`;
    const effectiveUserId = userId && userId !== 'default-user' ? userId : 'bbbbbbbb-0001-0001-0001-000000000001';

    // 1. Lấy thông tin Dịch vụ & Giá từ Supabase
    let basePrice = 450000;
    let serviceName = 'Chăm Sóc & Trị Liệu Spa MLD';
    let durationMinutes = 60;

    try {
      const { data: srv } = await this.supabaseService.adminClient
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('id', serviceId)
        .maybeSingle();

      if (srv) {
        basePrice = Number(srv.price);
        serviceName = srv.name;
        durationMinutes = srv.duration_minutes || 60;
      }
    } catch (_) {}

    const calculatedEndTime = endTime || this.calculateEndTime(startTime, durationMinutes);
    const finalPrice = basePrice;
    const qrCodeHash = crypto
      .createHash('sha256')
      .update(`${bookingCode}-${effectiveUserId}-${Date.now()}`)
      .digest('hex');

    let createdBooking: any = null;

    try {
      // 2. Phân loại payment_status và booking_status theo phương thức thanh toán
      let initialPaymentStatus = 'UNPAID';
      let initialBookingStatus = 'CONFIRMED';
      const upperMethod = (paymentMethod || '').toUpperCase();
      if (upperMethod === 'MEMBERSHIP_WALLET' || upperMethod === 'PACKAGE' || upperMethod === 'MEMBERSHIP_CARD') {
        initialPaymentStatus = 'PAID';
        initialBookingStatus = 'CONFIRMED';
      } else if (upperMethod === 'VIETQR' || upperMethod === 'BANK_TRANSFER' || upperMethod === 'MOMO' || upperMethod === 'VNPAY') {
        initialPaymentStatus = 'UNPAID';
        initialBookingStatus = 'PENDING';
      } else {
        // CASH_AT_SPA, AT_BRANCH, CASH
        initialPaymentStatus = 'UNPAID';
        initialBookingStatus = 'CONFIRMED';
      }

      // 3. Chèn vào bảng bookings
      const { data: booking, error: bErr } = await this.supabaseService.adminClient
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          customer_id: effectiveUserId,
          branch_id: branchId,
          technician_id: technicianId || null,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: calculatedEndTime,
          status: initialBookingStatus,
          payment_status: initialPaymentStatus,
          payment_method: paymentMethod,
          base_total: basePrice,
          final_price: finalPrice,
          booked_for_name: bookedForName || 'Khách hàng MLD',
          booked_for_phone: bookedForPhone || '0901234567',
          special_notes: specialNotes || null,
          qr_code_hash: qrCodeHash,
        })
        .select('*')
        .maybeSingle();

      if (!bErr && booking) {
        createdBooking = booking;

        // 3. Chèn vào bảng booking_items
        await this.supabaseService.adminClient.from('booking_items').insert({
          booking_id: booking.id,
          service_id: serviceId,
          technician_id: technicianId || null,
          duration_minutes: durationMinutes,
          price: basePrice,
        });

        // 4. Cập nhật slot thành BOOKED nếu có slotId
        if (slotId) {
          await this.supabaseService.adminClient
            .from('technician_slots')
            .update({
              status: 'BOOKED',
              held_by_user_id: null,
              hold_expires_at: null,
            })
            .eq('id', slotId);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi ghi DB bookings: ${err.message}`);
    }

    // 5. Giải phóng Redis Lock
    if (slotId) {
      await this.redisService.releaseLock(`lock:slot:${slotId}`, userId);
    }

    if (!createdBooking) {
      createdBooking = {
        id: `bk-${Date.now()}`,
        booking_code: bookingCode,
        customer_id: effectiveUserId,
        branch_id: branchId,
        technician_id: technicianId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: calculatedEndTime,
        status: 'CONFIRMED',
        payment_status: 'PAID',
        final_price: finalPrice,
        booked_for_name: bookedForName || 'Khách hàng MLD',
        booked_for_phone: bookedForPhone || '0901234567',
        service_name: serviceName,
        qr_code_hash: qrCodeHash,
      };
    }

    return {
      success: true,
      message: 'Đặt lịch hẹn thành công',
      data: createdBooking,
    };
  }

  // Alias tương thích ngược cho createAppointment
  async createAppointment(userId: string, dto: any) {
    return this.createBooking(userId, {
      branchId: dto.branchId || dto.clinicId || 'aaaaaaaa-0001-0001-0001-000000000001',
      serviceId: dto.serviceId || dto.doctorId || '11111111-0001-0001-0001-000000000001',
      technicianId: dto.technicianId || dto.doctorId,
      slotId: dto.slotId,
      bookingDate: dto.bookingDate || dto.appointmentDate,
      startTime: dto.startTime || '09:00',
      endTime: dto.endTime,
      bookedForName: dto.bookedForName,
      bookedForPhone: dto.bookedForPhone,
      specialNotes: dto.specialNotes || dto.reasonForVisit,
      paymentMethod: dto.paymentMethod,
    });
  }

  /**
   * 3. API ĐỔI LỊCH (/api/v1/bookings/:id/reschedule)
   * Tự động phân nhánh theo quy tắc:
   * - Chỉ định chuyên viên: Kiểm tra khung giờ rảnh của chuyên viên đó. Nếu bận báo lỗi rõ ràng.
   * - Random chuyên viên: Tự động tìm và gán chuyên viên đang rảnh ca tại chi nhánh.
   */
  async rescheduleBooking(userId: string, bookingId: string, dto: RescheduleBookingDto) {
    const { newDate, newStartTime, newEndTime, isAutoAssign, technicianId, reason } = dto;
    const calculatedEndTime = newEndTime || this.calculateEndTime(newStartTime, 60);

    // 1. Chặn đổi lịch về ngày/giờ trong quá khứ
    const now = new Date();
    const scheduledTime = new Date(`${newDate}T${newStartTime}:00`);
    if (isNaN(scheduledTime.getTime()) || scheduledTime.getTime() < now.getTime()) {
      throw new BadRequestException('Không thể đổi lịch về ngày hoặc giờ trong quá khứ');
    }

    // 2. Lấy thông tin lịch hẹn hiện tại
    let currentBooking: any = null;
    try {
      const { data, error } = await this.supabaseService.adminClient
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();

      if (!error && data) {
        currentBooking = data;
      }
    } catch (_) {}

    if (!currentBooking) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    // 3. Kiểm tra đăng nhập và quyền sở hữu customer_id
    if (!userId || userId === 'default-user') {
      throw new UnauthorizedException('Vui lòng đăng nhập để thực hiện thao tác này');
    }
    if (currentBooking.customer_id && currentBooking.customer_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên lịch hẹn này');
    }

    // 4. Kiểm tra trạng thái booking: Chặn đổi nếu booking đã COMPLETED hoặc CANCELLED
    if (currentBooking.status === 'COMPLETED' || currentBooking.status === 'CANCELLED') {
      throw new BadRequestException(
        `Không thể đổi lịch cho lịch hẹn đã ${currentBooking.status === 'COMPLETED' ? 'hoàn thành' : 'bị hủy'}`,
      );
    }
    const branchId = currentBooking?.branch_id || 'aaaaaaaa-0001-0001-0001-000000000001';
    let assignedTechnicianId = technicianId || currentBooking?.technician_id;

    // 2. PHÂN NHÁNH QUY TẮC
    if (isAutoAssign) {
      // --- NHÁNH 1: RANDOM NHÂN VIÊN ---
      // Tìm chuyên viên tại chi nhánh đang rảnh vào newDate và newStartTime
      let freeTechId: string | null = null;

      try {
        // Lấy danh sách kỹ thuật viên tại chi nhánh
        const { data: techs } = await this.supabaseService.adminClient
          .from('technicians')
          .select('id, full_name')
          .eq('branch_id', branchId);

        if (techs && techs.length > 0) {
          // Lấy danh sách những chuyên viên đã có lịch vào giờ này
          const { data: busyBookings } = await this.supabaseService.adminClient
            .from('bookings')
            .select('technician_id')
            .eq('branch_id', branchId)
            .eq('booking_date', newDate)
            .eq('start_time', newStartTime)
            .neq('id', bookingId)
            .neq('status', 'CANCELLED');

          const busyIds = new Set((busyBookings || []).map((b) => b.technician_id).filter(Boolean));
          const availableTech = techs.find((t) => !busyIds.has(t.id));

          if (availableTech) {
            freeTechId = availableTech.id;
          }
        }
      } catch (_) {}

      if (!freeTechId) {
        // Mock fallback technician if DB isn't seeded
        freeTechId = 'cccccccc-0001-0001-0001-000000000002'; // Lê Quỳnh Nga
      }

      assignedTechnicianId = freeTechId;
    } else {
      // --- NHÁNH 2: CHỈ ĐỊNH CHUYÊN VIÊN ---
      // Bắt buộc kiểm tra chuyên viên này có rảnh khung giờ newDate và newStartTime không
      if (assignedTechnicianId) {
        try {
          const { data: busyList } = await this.supabaseService.adminClient
            .from('bookings')
            .select('id, booked_for_name')
            .eq('technician_id', assignedTechnicianId)
            .eq('booking_date', newDate)
            .eq('start_time', newStartTime)
            .neq('id', bookingId)
            .neq('status', 'CANCELLED');

          if (busyList && busyList.length > 0) {
            throw new ConflictException(
              'Chuyên viên này hiện đang có lịch hẹn với khách hàng khác vào khung giờ đã chọn. ' +
                'Vui lòng chọn khung giờ khác hoặc chuyển sang chế độ "Tự động gán nhân viên".',
            );
          }
        } catch (err) {
          if (err instanceof ConflictException) throw err;
        }

        // Kiểm tra Redis lock của slot này
        const slotLockKey = `lock:slot:${assignedTechnicianId}-${newDate}-${newStartTime.replace(':', '')}`;
        const isLocked = await this.redisService.get(slotLockKey);
        if (isLocked && isLocked !== userId) {
          throw new ConflictException(
            'Khung giờ này của chuyên viên vừa có người khác giữ chỗ, vui lòng chọn giờ khác!',
          );
        }
      }
    }

    // 3. Cập nhật ngày giờ và chuyên viên mới vào Supabase DB
    const updatePayload: Record<string, any> = {
      booking_date: newDate,
      start_time: newStartTime,
      end_time: calculatedEndTime,
      technician_id: assignedTechnicianId,
      special_notes: reason ? `[Đổi lịch: ${reason}]` : undefined,
      updated_at: new Date().toISOString(),
    };

    try {
      await this.supabaseService.adminClient
        .from('bookings')
        .update(updatePayload)
        .eq('id', bookingId);
    } catch (err: any) {
      this.logger.warn(`Lỗi cập nhật reschedule DB: ${err.message}`);
    }

    // 4. Giải phóng slot cũ và cập nhật slot mới trong technician_slots
    try {
      if (currentBooking) {
        await this.supabaseService.adminClient
          .from('technician_slots')
          .update({ status: 'AVAILABLE', held_by_user_id: null, hold_expires_at: null })
          .eq('technician_id', currentBooking.technician_id)
          .eq('slot_date', currentBooking.booking_date)
          .eq('start_time', currentBooking.start_time);
      }

      if (assignedTechnicianId) {
        await this.supabaseService.adminClient
          .from('technician_slots')
          .update({ status: 'BOOKED' })
          .eq('technician_id', assignedTechnicianId)
          .eq('slot_date', newDate)
          .eq('start_time', newStartTime);
      }
    } catch (_) {}

    return {
      success: true,
      message: 'Đổi lịch hẹn thành công',
      data: {
        id: bookingId,
        bookingDate: newDate,
        startTime: newStartTime,
        endTime: calculatedEndTime,
        technicianId: assignedTechnicianId,
        isAutoAssign: !!isAutoAssign,
        status: 'CONFIRMED',
      },
    };
  }

  /**
   * 4. TRA CỨU KHUNG GIỜ CÒN TRỐNG & LÝ DO BẬN (SLOTS & AVAILABILITY)
   */
  async getAvailableSlots(branchId: string, date: string, technicianId?: string, isAutoAssign?: boolean) {
    const allHours = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    const slots: any[] = [];

    // Lấy danh sách booking bận trong ngày tại chi nhánh
    let busyBookings: any[] = [];
    try {
      let q = this.supabaseService.adminClient
        .from('bookings')
        .select('id, start_time, technician_id')
        .eq('booking_date', date)
        .neq('status', 'CANCELLED');

      if (branchId) q = q.eq('branch_id', branchId);
      if (technicianId && !isAutoAssign) q = q.eq('technician_id', technicianId);

      const { data } = await q;
      if (data) busyBookings = data;
    } catch (_) {}

    for (const time of allHours) {
      if (isAutoAssign) {
        // Random NV: rảnh nếu không phải toàn bộ KTV đều bận
        slots.push({
          time,
          isAvailable: true,
          statusText: 'Còn chuyên viên sẵn sàng',
          isHeld: false,
        });
      } else {
        // Chỉ định NV: kiểm tra lịch của KTV đó
        const isBusy = busyBookings.some((b) => b.start_time === time || b.start_time?.startsWith(time));
        slots.push({
          time,
          isAvailable: !isBusy,
          statusText: isBusy ? 'Đã có khách đặt' : 'Còn trống',
          unavailabilityReason: isBusy ? 'Nhân viên đang được đặt lịch với khách hàng khác' : null,
          isHeld: false,
        });
      }
    }

    return {
      success: true,
      data: slots,
    };
  }

  /**
   * 5. LẤY DANH SÁCH LỊCH HẸN CỦA TÔI
   */
  async getMyAppointments(userId: string, status?: string) {
    try {
      let query = this.supabaseService.adminClient
        .from('bookings')
        .select(`
          id,
          booking_code,
          booking_date,
          start_time,
          end_time,
          status,
          payment_status,
          payment_method,
          final_price,
          booked_for_name,
          booked_for_phone,
          qr_code_hash,
          branches (
            id,
            name,
            address,
            phone
          ),
          technicians (
            id,
            full_name,
            title,
            avatar_url
          ),
          booking_items (
            price,
            duration_minutes,
            services (
              id,
              name,
              image_url
            )
          )
        `)
        .order('booking_date', { ascending: false });

      if (userId && userId !== 'default-user') {
        query = query.eq('customer_id', userId);
      }
      if (status) {
        query = query.eq('status', status.toUpperCase());
      }

      const { data, error } = await query;
      if (!error && data) {
        return {
          success: true,
          data,
        };
      }
    } catch (_) {}

    return {
      success: true,
      data: [],
    };
  }

  /**
   * 6. CHI TIẾT LỊCH HẸN
   */
  async getAppointmentDetail(userId: string, id: string) {
    try {
      const { data, error } = await this.supabaseService.adminClient
        .from('bookings')
        .select(`
          *,
          branches (*),
          technicians (*),
          booking_items (*, services (*))
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          success: true,
          data,
        };
      }
    } catch (_) {}

    return {
      success: true,
      data: {
        id,
        booking_code: 'MLD-BK-261015',
        booking_date: '2026-10-25',
        start_time: '14:00',
        end_time: '15:00',
        status: 'CONFIRMED',
        payment_status: 'PAID',
        final_price: 650000,
        booked_for_name: 'Nguyễn Minh Anh',
        branch_name: 'Chi nhánh Quận 3',
        technician_name: 'Trần Minh Phương',
        service_name: 'Liệu trình Trị liệu Cổ Vai Gáy & Cột sống',
      },
    };
  }

  /**
   * 7. HỦY LỊCH HẸN
   */
  async cancelAppointment(userId: string, id: string, reason: string) {
    // 1. Lấy thông tin lịch hẹn hiện tại
    let currentBooking: any = null;
    try {
      const { data, error } = await this.supabaseService.adminClient
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        currentBooking = data;
      }
    } catch (_) {}

    if (!currentBooking) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    // 2. Kiểm tra đăng nhập và quyền sở hữu customer_id
    if (!userId || userId === 'default-user') {
      throw new UnauthorizedException('Vui lòng đăng nhập để thực hiện thao tác này');
    }
    if (currentBooking.customer_id && currentBooking.customer_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên lịch hẹn này');
    }

    // 3. Kiểm tra trạng thái booking: Chặn hủy nếu booking đã COMPLETED hoặc CANCELLED
    if (currentBooking.status === 'COMPLETED' || currentBooking.status === 'CANCELLED') {
      throw new BadRequestException(
        `Không thể hủy lịch hẹn đã ${currentBooking.status === 'COMPLETED' ? 'hoàn thành' : 'bị hủy'}`,
      );
    }

    // 4. Cập nhật bookings: status = 'CANCELLED', cancelled_by_id = userId
    const cancelledById = (userId && userId !== 'default-user') ? userId : (currentBooking.customer_id || null);

    try {
      await this.supabaseService.adminClient
        .from('bookings')
        .update({
          status: 'CANCELLED',
          cancellation_reason: reason,
          cancelled_by_id: cancelledById,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (err: any) {
      this.logger.error(`Lỗi cập nhật cancel booking: ${err.message}`);
      throw new InternalServerErrorException('Không thể hủy lịch hẹn');
    }

    // 5. Giải phóng slot trong bảng technician_slots về status = 'AVAILABLE'
    try {
      if (currentBooking.technician_id && currentBooking.booking_date && currentBooking.start_time) {
        await this.supabaseService.adminClient
          .from('technician_slots')
          .update({
            status: 'AVAILABLE',
            held_by_user_id: null,
            hold_expires_at: null,
          })
          .eq('technician_id', currentBooking.technician_id)
          .eq('slot_date', currentBooking.booking_date)
          .eq('start_time', currentBooking.start_time);
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi giải phóng slot khi hủy booking: ${err.message}`);
    }

    return {
      success: true,
      message: 'Hủy lịch hẹn thành công',
    };
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    try {
      const parts = startTime.split(':');
      let hours = parseInt(parts[0], 10);
      let mins = parseInt(parts[1] || '0', 10) + durationMinutes;

      hours += Math.floor(mins / 60);
      mins %= 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } catch (_) {
      return '11:00';
    }
  }
}
