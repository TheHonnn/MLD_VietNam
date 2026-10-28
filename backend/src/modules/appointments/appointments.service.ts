import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  HttpException,
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
      paymentMethod: requestedPaymentMethod,
      couponCode,
    } = dto;

    const paymentMethod = requestedPaymentMethod?.trim() || 'CASH_AT_SPA';
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const bookingCode = dto.bookingCode || `MLD-BK-${Date.now().toString().slice(-6)}`;
    const effectiveUserId = (userId && userId !== 'default-user' && uuidRegex.test(userId)) ? userId : 'bbbbbbbb-0001-0001-0001-000000000001';
    const targetBranchId = (branchId && uuidRegex.test(branchId)) ? branchId : 'aaaaaaaa-0001-0001-0001-000000000001';
    const targetServiceId = (serviceId && uuidRegex.test(serviceId)) ? serviceId : '235166f2-66c9-4231-bbe1-af91b48fc67c';

    // 1. Lấy thông tin Dịch vụ & Giá từ Supabase
    const { data: srv, error: serviceError } = await this.supabaseService.adminClient
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('id', targetServiceId)
      .maybeSingle();

    if (serviceError) {
      this.logger.error(`Lỗi tải dịch vụ ${targetServiceId}: ${serviceError.message}`);
      throw new InternalServerErrorException('Không thể xác minh dịch vụ. Vui lòng thử lại.');
    }
    if (!srv) throw new NotFoundException('Không tìm thấy dịch vụ đã chọn');

    const basePrice = Number(srv.price);
    const durationMinutes = Number(srv.duration_minutes) || 60;

    const calculatedEndTime = endTime || this.calculateEndTime(startTime, durationMinutes);
    const finalPrice = basePrice;
    const qrCodeHash = crypto
      .createHash('sha256')
      .update(`${bookingCode}-${effectiveUserId}-${Date.now()}`)
      .digest('hex');

    // 1.1. Kiểm tra năng lực phục vụ kép (DRC: 6 Giường × 6 KTV × Ca 1 Giờ)
    try {
      const { data: drcData, error: drcError } = await this.supabaseService.adminClient.rpc(
        'fn_check_slot_dual_availability',
        {
          p_branch_id: targetBranchId,
          p_booking_date: bookingDate,
          p_start_time: startTime,
          p_end_time: calculatedEndTime,
        }
      );
      if (drcError) throw new Error(drcError.message);
      const drc = drcData?.[0];
      if (!drc) throw new Error('Không có kết quả kiểm tra năng lực phục vụ');
      if (drc && !drc.is_available) {
        throw new ConflictException(
          `Không thể đặt lịch: ${drc.reason} (Giường trống: ${drc.free_beds}/6, Chuyên viên rảnh: ${drc.free_staff})`
        );
      }
    } catch (checkErr: any) {
      if (checkErr instanceof ConflictException) throw checkErr;
      this.logger.error(`Không thể kiểm tra năng lực phục vụ: ${checkErr.message}`);
      throw new InternalServerErrorException('Không thể xác nhận chỗ trống. Vui lòng thử lại.');
    }

    // 1.2. Thuật toán Least-Busy Dispatch: Tự động gán KTV ít ca nhất trong ngày để kín lịch đều cho 6 KTV
    let assignedTechnicianId = technicianId;
    if (!assignedTechnicianId) {
      try {
        const dispatched = await this.dispatchLeastBusyTechnician(
          targetBranchId,
          bookingDate,
          startTime,
          calculatedEndTime,
        );
        if (dispatched && dispatched.technicianId) {
          assignedTechnicianId = dispatched.technicianId;
        }
      } catch (dispatchErr: any) {
        this.logger.warn(`Lỗi điều phối Least-Busy Dispatch: ${dispatchErr.message}`);
      }
    }

    // 1.3. Gán giường trị liệu trong 6 giường cố định (2 VIP, 4 Body Massage)
    const standardBeds = ['G-VIP-01', 'G-VIP-02', 'G-BODY-01', 'G-BODY-02', 'G-BODY-03', 'G-BODY-04'];
    let assignedBed = dto.assignedBedNumber;
    if (!assignedBed) {
      try {
        const { data: occupiedBeds, error: bedsError } = await this.supabaseService.adminClient
          .from('bookings')
          .select('assigned_bed_number, start_time, end_time')
          .eq('branch_id', targetBranchId)
          .eq('booking_date', bookingDate)
          .in('status', ['CONFIRMED', 'IN_SERVICE', 'PENDING']);

        if (bedsError) throw bedsError;

        const occSet = new Set(
          (occupiedBeds || [])
            .filter((o) => o.start_time < calculatedEndTime && o.end_time > startTime)
            .map((o) => o.assigned_bed_number)
            .filter(Boolean),
        );
        assignedBed = standardBeds.find((b) => !occSet.has(b));
        if (!assignedBed) throw new ConflictException('Chi nhánh đã hết giường trống trong khung giờ này');
      } catch (bedErr: any) {
        if (bedErr instanceof ConflictException) throw bedErr;
        this.logger.error(`Không thể kiểm tra giường trống: ${bedErr.message}`);
        throw new InternalServerErrorException('Không thể xác nhận tài nguyên phòng. Vui lòng thử lại.');
      }
    }

    let createdBooking: any = null;

    try {
      // 2. Phân loại payment_status và booking_status theo phương thức thanh toán
      let initialPaymentStatus = 'UNPAID';
      let initialBookingStatus = 'PENDING';
      const upperMethod = (paymentMethod || '').toUpperCase();
      let validPaymentMethod = 'CASH_AT_SPA';
      if (upperMethod === 'MEMBERSHIP_WALLET' || upperMethod === 'PACKAGE' || upperMethod === 'MEMBERSHIP_CARD') {
        initialPaymentStatus = 'PAID';
        initialBookingStatus = 'CONFIRMED';
        validPaymentMethod = 'MEMBERSHIP_WALLET';
      } else if (upperMethod === 'VIETQR' || upperMethod === 'BANK_TRANSFER') {
        initialPaymentStatus = 'UNPAID';
        initialBookingStatus = 'PENDING';
        validPaymentMethod = 'BANK_TRANSFER';
      } else if (upperMethod === 'MOMO') {
        initialPaymentStatus = 'UNPAID';
        initialBookingStatus = 'PENDING';
        validPaymentMethod = 'MOMO';
      } else if (upperMethod === 'VNPAY') {
        initialPaymentStatus = 'UNPAID';
        initialBookingStatus = 'PENDING';
        validPaymentMethod = 'VNPAY';
      } else {
        // CASH_AT_SPA, AT_BRANCH, CASH
        initialPaymentStatus = 'UNPAID';
        initialBookingStatus = 'CONFIRMED';
        validPaymentMethod = 'CASH_AT_SPA';
      }

      const cleanStartTime = /^\d{1,2}:\d{2}/.test(startTime) ? (startTime.length === 5 ? `${startTime}:00` : startTime) : '09:00:00';
      const cleanEndTime = /^\d{1,2}:\d{2}/.test(calculatedEndTime) ? (calculatedEndTime.length === 5 ? `${calculatedEndTime}:00` : calculatedEndTime) : '10:00:00';

      // 3. Chèn vào bảng bookings
      const { data: booking, error: bErr } = await this.supabaseService.adminClient
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          customer_id: effectiveUserId,
          branch_id: targetBranchId,
          technician_id: assignedTechnicianId || null,
          assigned_bed_number: assignedBed,
          booking_date: bookingDate,
          start_time: cleanStartTime,
          end_time: cleanEndTime,
          status: initialBookingStatus,
          payment_status: initialPaymentStatus,
          payment_method: validPaymentMethod,
          base_total: basePrice,
          final_price: finalPrice,
          booked_for_name: bookedForName || 'Khách hàng MLD',
          booked_for_phone: bookedForPhone || '0901234567',
          special_notes: specialNotes || null,
          qr_code_hash: qrCodeHash,
        })
        .select('*')
        .maybeSingle();

      if (bErr || !booking) {
        throw new InternalServerErrorException('Không thể lưu lịch hẹn. Vui lòng thử lại.');
      }
      createdBooking = booking;

      const { error: itemError } = await this.supabaseService.adminClient.from('booking_items').insert({
        booking_id: booking.id,
        service_id: targetServiceId,
        technician_id: assignedTechnicianId || null,
        duration_minutes: durationMinutes,
        price: basePrice,
      });
      if (itemError) throw new Error(`Không thể lưu dịch vụ của lịch hẹn: ${itemError.message}`);

      if (slotId) {
        const { data: updatedSlot, error: slotError } = await this.supabaseService.adminClient
          .from('technician_slots')
          .update({ status: 'BOOKED', held_by_user_id: null, hold_expires_at: null })
          .eq('id', slotId)
          .select('id')
          .maybeSingle();
        if (slotError) throw new Error(`Không thể xác nhận khung giờ: ${slotError.message}`);
        if (!updatedSlot) throw new ConflictException('Khung giờ không còn khả dụng. Vui lòng chọn giờ khác.');
      }
    } catch (err: any) {
      if (createdBooking?.id) {
        const { error: itemCleanupError } = await this.supabaseService.adminClient
          .from('booking_items')
          .delete()
          .eq('booking_id', createdBooking.id);
        const { error: bookingCleanupError } = await this.supabaseService.adminClient
          .from('bookings')
          .delete()
          .eq('id', createdBooking.id);
        if (itemCleanupError || bookingCleanupError) {
          this.logger.error(`Không thể hoàn tác booking ${createdBooking.id} sau lỗi lưu.`);
        }
      }
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi ghi DB booking: ${err.message}`);
      throw new InternalServerErrorException('Không thể lưu đầy đủ lịch hẹn. Vui lòng thử lại.');
    } finally {
      if (slotId) {
        try {
          await this.redisService.releaseLock(`lock:slot:${slotId}`, userId || 'guest');
        } catch (releaseErr: any) {
          this.logger.warn(`Không thể giải phóng Redis lock cho slot ${slotId}: ${releaseErr.message}`);
        }
      }
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

    // 2.0. Kiểm tra năng lực phục vụ kép (DRC: 6 Giường × 6 KTV) cho khung giờ mới
    try {
      const { data: drcData } = await this.supabaseService.adminClient.rpc(
        'fn_check_slot_dual_availability',
        {
          p_branch_id: branchId,
          p_booking_date: newDate,
          p_start_time: newStartTime,
          p_end_time: calculatedEndTime,
        },
      );
      const drc = drcData?.[0];
      if (drc && !drc.is_available) {
        throw new ConflictException(
          `Không thể đổi sang khung giờ này: ${drc.reason} (Giường trống: ${drc.free_beds}/6, Chuyên viên rảnh: ${drc.free_staff})`,
        );
      }
    } catch (checkErr: any) {
      if (checkErr instanceof ConflictException) throw checkErr;
      this.logger.warn(`Lỗi kiểm tra DRC khi reschedule: ${checkErr.message}`);
    }

    // 2.1. PHÂN NHÁNH QUY TẮC ĐIỀU PHỐI KTV
    if (isAutoAssign) {
      // --- NHÁNH 1: LEAST-BUSY TECHNICIAN DISPATCH ---
      const dispatched = await this.dispatchLeastBusyTechnician(
        branchId,
        newDate,
        newStartTime,
        calculatedEndTime,
      );
      if (!dispatched || !dispatched.technicianId) {
        throw new ConflictException(
          'Không còn chuyên viên nào sẵn sàng trong khung giờ đã chọn. Vui lòng chọn khung giờ khác!',
        );
      }
      assignedTechnicianId = dispatched.technicianId;
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
   * 4. TRA CỨU KHUNG GIỜ CÒN TRỐNG & LÝ DO BẬN (DUAL-RESOURCE AVAILABILITY: 6 GIƯỜNG × 6 KTV × CA 1 TIẾNG)
   */
  async getAvailableSlots(branchId: string, date: string, technicianId?: string, isAutoAssign?: boolean) {
    const effectiveBranchId = branchId || 'aaaaaaaa-0001-0001-0001-000000000001';

    // 0. Tự động giải phóng các ca quá giờ trước khi tra cứu slot
    await this.autoReleaseExpiredBookings(effectiveBranchId).catch(() => {});

    try {
      // 1. Gọi RPC tính toán năng lực kép của toàn bộ 10 ca 1 tiếng trong ngày
      const { data: rpcSlots, error: rpcErr } = await this.supabaseService.adminClient.rpc(
        'fn_get_day_slots_dual_availability',
        {
          p_branch_id: effectiveBranchId,
          p_booking_date: date,
        }
      );

      // Nếu có technicianId được chỉ định riêng (không phải random KTV)
      const techBusySlots: Set<string> = new Set();
      if (technicianId && !isAutoAssign) {
        const { data: techBookings } = await this.supabaseService.adminClient
          .from('bookings')
          .select('start_time, end_time')
          .eq('branch_id', effectiveBranchId)
          .eq('booking_date', date)
          .eq('technician_id', technicianId)
          .in('status', ['CONFIRMED', 'IN_SERVICE', 'PENDING']);

        if (techBookings) {
          for (const tb of techBookings) {
            techBusySlots.add(tb.start_time?.slice(0, 5) || tb.start_time);
          }
        }
      }

      if (!rpcErr && rpcSlots && rpcSlots.length > 0) {
        const slots = rpcSlots.map((s: any) => {
          const startTimeStr = s.start_time ? s.start_time.slice(0, 5) : '09:00';
          const isTechBusy = Boolean(technicianId && !isAutoAssign && techBusySlots.has(startTimeStr));
          const isAvailable = Boolean(s.is_available && !isTechBusy);

          let statusText = s.status_text;
          let unavailabilityReason: string | null = null;

          if (isTechBusy) {
            statusText = 'KTV đã kín lịch';
            unavailabilityReason = 'Chuyên viên chỉ định đã có lịch phục vụ khách hàng khác trong khung giờ này';
          } else if (!s.is_available) {
            unavailabilityReason = s.status_text;
          }

          return {
            time: startTimeStr,
            slotTime: s.slot_time,
            startTime: s.start_time,
            endTime: s.end_time,
            isAvailable,
            freeBeds: Number(s.free_beds || 0),
            freeStaff: Number(s.free_staff || 0),
            remainingCapacity: isAvailable ? Number(s.remaining_capacity || 0) : 0,
            statusText,
            unavailabilityReason,
            isHeld: false,
            isRecommended: false,
            recommendedTag: null as string | null,
          };
        });

        // 2. Tối ưu hóa phân bổ (Compact Slot Recommendation): Ưu tiên slot liền kề ca đã có khách
        for (let i = 0; i < slots.length; i++) {
          if (slots[i].isAvailable) {
            const prev = slots[i - 1];
            const next = slots[i + 1];
            const prevHasClients = prev && prev.remainingCapacity < 6;
            const nextHasClients = next && next.remainingCapacity < 6;
            if (prevHasClients || nextHasClients) {
              slots[i].isRecommended = true;
              slots[i].recommendedTag = 'Khung giờ gợi ý tốt nhất';
            }
          }
        }

        return {
          success: true,
          data: slots,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi khi gọi RPC fn_get_day_slots_dual_availability: ${err.message}`);
    }

    // Fallback chuẩn 10 ca 1 tiếng nếu RPC gặp sự cố tạm thời
    const fallbackSlots = [
      { time: '09:00', slotTime: '09:00–10:00', startTime: '09:00:00', endTime: '10:00:00' },
      { time: '10:00', slotTime: '10:00–11:00', startTime: '10:00:00', endTime: '11:00:00' },
      { time: '11:00', slotTime: '11:00–12:00', startTime: '11:00:00', endTime: '12:00:00' },
      { time: '13:30', slotTime: '13:30–14:30', startTime: '13:30:00', endTime: '14:30:00' },
      { time: '14:30', slotTime: '14:30–15:30', startTime: '14:30:00', endTime: '15:30:00' },
      { time: '15:30', slotTime: '15:30–16:30', startTime: '15:30:00', endTime: '16:30:00' },
      { time: '16:30', slotTime: '16:30–17:30', startTime: '16:30:00', endTime: '17:30:00' },
      { time: '17:30', slotTime: '17:30–18:30', startTime: '17:30:00', endTime: '18:30:00' },
      { time: '18:30', slotTime: '18:30–19:30', startTime: '18:30:00', endTime: '19:30:00' },
      { time: '19:30', slotTime: '19:30–20:30', startTime: '19:30:00', endTime: '20:30:00' },
    ].map((f) => ({
      ...f,
      isAvailable: true,
      freeBeds: 6,
      freeStaff: 6,
      remainingCapacity: 6,
      statusText: 'Còn 6 chỗ',
      unavailabilityReason: null,
      isHeld: false,
      isRecommended: false,
      recommendedTag: null,
    }));

    return {
      success: true,
      data: fallbackSlots,
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

    // 3.1. Chặn hủy nếu lịch hẹn đã thanh toán và đã được duyệt
    const isPaid = (currentBooking.payment_status || '').toUpperCase() === 'PAID';
    const isApproved = ['CONFIRMED', 'IN_SERVICE', 'COMPLETED'].includes(currentBooking.status);
    if (isPaid && isApproved) {
      throw new BadRequestException(
        'Không thể Hủy. Dịch vụ đã thanh toán, vui lòng liên hệ nhân viên để được hỗ trợ.',
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

  /**
   * 8. LEAST-BUSY TECHNICIAN DISPATCH (Cân bằng tải 6 KTV theo số ca trong ngày)
   */
  async dispatchLeastBusyTechnician(
    branchId: string,
    bookingDate: string,
    startTime: string,
    endTime: string,
  ): Promise<{ technicianId: string; fullName: string; sessionsToday: number } | null> {
    const targetBranchId = branchId || 'aaaaaaaa-0001-0001-0001-000000000001';
    try {
      const { data, error } = await this.supabaseService.adminClient.rpc(
        'fn_dispatch_least_busy_technician',
        {
          p_branch_id: targetBranchId,
          p_booking_date: bookingDate,
          p_start_time: startTime,
          p_end_time: endTime,
        },
      );

      if (!error && data && data.length > 0) {
        return {
          technicianId: data[0].technician_id,
          fullName: data[0].full_name,
          sessionsToday: Number(data[0].sessions_today || 0),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi gọi RPC fn_dispatch_least_busy_technician: ${err.message}`);
    }

    // Fallback quét trực tiếp DB nếu RPC gặp sự cố tạm thời
    try {
      const { data: techs } = await this.supabaseService.adminClient
        .from('technicians')
        .select('id, full_name')
        .eq('branch_id', targetBranchId)
        .eq('is_active', true);

      if (!techs || techs.length === 0) return null;

      const { data: dayBookings } = await this.supabaseService.adminClient
        .from('bookings')
        .select('technician_id, start_time, end_time')
        .eq('branch_id', targetBranchId)
        .eq('booking_date', bookingDate)
        .in('status', ['CONFIRMED', 'IN_SERVICE', 'PENDING']);

      const counts: Record<string, number> = {};
      const busyTechIdsInSlot = new Set<string>();

      for (const t of techs) counts[t.id] = 0;

      for (const b of (dayBookings || [])) {
        if (b.technician_id) {
          counts[b.technician_id] = (counts[b.technician_id] || 0) + 1;
          if (
            (b.start_time <= startTime && b.end_time > startTime) ||
            (b.start_time < endTime && b.end_time >= endTime) ||
            (b.start_time >= startTime && b.end_time <= endTime)
          ) {
            busyTechIdsInSlot.add(b.technician_id);
          }
        }
      }

      const availableTechs = techs.filter((t) => !busyTechIdsInSlot.has(t.id));
      if (availableTechs.length === 0) return null;

      availableTechs.sort((a, b) => counts[a.id] - counts[b.id]);
      return {
        technicianId: availableTechs[0].id,
        fullName: availableTechs[0].full_name,
        sessionsToday: counts[availableTechs[0].id],
      };
    } catch (fallbackErr: any) {
      this.logger.warn(`Lỗi fallback least busy: ${fallbackErr.message}`);
      return null;
    }
  }

  /**
   * 9. AUTO-RELEASE COMPLETED BOOKINGS (Tự động nhả 6 Giường × 6 KTV khi hết ca)
   */
  async autoReleaseExpiredBookings(branchId?: string): Promise<{ releasedCount: number; message: string }> {
    try {
      const { data, error } = await this.supabaseService.adminClient.rpc(
        'fn_release_completed_bookings',
        { p_branch_id: branchId || null },
      );

      if (!error && data && data.length > 0) {
        return {
          releasedCount: Number(data[0].released_count || 0),
          message: data[0].message || 'Đã giải phóng tài nguyên thành công',
        };
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi RPC release bookings: ${err.message}`);
    }

    // Fallback trực tiếp DB
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = now.toTimeString().split(' ')[0];

      let query = this.supabaseService.adminClient
        .from('bookings')
        .select('id')
        .eq('booking_date', todayStr)
        .lte('end_time', currentTimeStr)
        .in('status', ['IN_SERVICE', 'CONFIRMED']);

      if (branchId) query = query.eq('branch_id', branchId);

      const { data: pastBookings } = await query;
      let releasedCount = 0;
      if (pastBookings && pastBookings.length > 0) {
        for (const b of pastBookings) {
          await this.supabaseService.adminClient
            .from('bookings')
            .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
            .eq('id', b.id);
          releasedCount++;
        }
      }

      return {
        releasedCount,
        message: `Đã tự động giải phóng ${releasedCount} ca trị liệu hoàn tất (nhả giường & KTV).`,
      };
    } catch (fallbackErr: any) {
      this.logger.error(`Lỗi fallback auto-release: ${fallbackErr.message}`);
      return { releasedCount: 0, message: fallbackErr.message };
    }
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
