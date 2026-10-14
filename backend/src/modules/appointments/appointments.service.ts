import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../../database/supabase.service';
import { RedisService } from '../../database/redis.service';
import { HoldSlotDto } from './dto/hold-slot.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private supabaseService: SupabaseService,
    private redisService: RedisService,
  ) {}

  /**
   * Giữ chỗ slot khám trong 10 phút (Chống Double-Booking)
   */
  async holdSlot(userId: string, dto: HoldSlotDto) {
    const { slotId } = dto;
    const lockKey = `lock:slot:${slotId}`;

    // 1. Thử xin Redis Lock (TTL 600 giây = 10 phút)
    const acquired = await this.redisService.acquireLock(lockKey, userId, 600);
    if (!acquired) {
      throw new ConflictException(
        'Khung giờ này vừa có người khác đang giữ chỗ, vui lòng chọn khung giờ khác!',
      );
    }

    // 2. Kiểm tra trạng thái slot trong DB
    const { data: slot, error: slotErr } = await this.supabaseService.adminClient
      .from('doctor_slots')
      .select('id, status, hold_expires_at')
      .eq('id', slotId)
      .single();

    if (slotErr || !slot) {
      await this.redisService.releaseLock(lockKey, userId);
      throw new NotFoundException('Không tìm thấy khung giờ khám này');
    }

    if (slot.status === 'BOOKED' || slot.status === 'BLOCKED') {
      await this.redisService.releaseLock(lockKey, userId);
      throw new ConflictException('Khung giờ này đã được đặt hoặc bị tạm đóng');
    }

    // 3. Cập nhật slot sang trạng thái HOLD trong DB
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await this.supabaseService.adminClient
      .from('doctor_slots')
      .update({
        status: 'HOLD',
        held_by_user_id: userId,
        hold_expires_at: holdExpiresAt,
      })
      .eq('id', slotId);

    return {
      message: 'Giữ chỗ khung giờ thành công trong 10 phút',
      slotId,
      holdExpiresAt,
      holdDurationSeconds: 600,
    };
  }

  /**
   * Tạo lịch hẹn chính thức
   */
  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const {
      doctorId,
      slotId,
      appointmentDate,
      familyMemberId,
      reasonForVisit,
      symptomsDescription,
      paymentMethod,
      couponCode,
      attachments,
    } = dto;

    // 1. Lấy thông tin Bác sĩ & Giá khám
    const { data: doctor, error: docErr } = await this.supabaseService.adminClient
      .from('doctors')
      .select('id, consultation_fee, title, user:users!doctors_user_id_fkey(full_name)')
      .eq('id', doctorId)
      .single();

    if (docErr || !doctor) {
      throw new NotFoundException('Không tìm thấy thông tin bác sĩ');
    }

    const baseFee = Number(doctor.consultation_fee);
    let discountAmount = 0;
    let couponId: string | null = null;

    // 2. Kiểm tra Coupon nếu có
    if (couponCode) {
      const { data: coupon } = await this.supabaseService.adminClient
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .gte('valid_to', new Date().toISOString())
        .maybeSingle();

      if (coupon) {
        couponId = coupon.id;
        if (coupon.discount_percent > 0) {
          discountAmount = (baseFee * Number(coupon.discount_percent)) / 100;
          if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
            discountAmount = Number(coupon.max_discount);
          }
        } else if (coupon.discount_amount > 0) {
          discountAmount = Number(coupon.discount_amount);
        }
      }
    }

    const totalAmount = Math.max(0, baseFee - discountAmount);

    // 3. Tạo mã định danh lịch hẹn & Mã QR Hash
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const appointmentCode = `MED-${dateStr}-${randomSuffix}`;
    const qrCodeHash = crypto
      .createHash('sha256')
      .update(`${appointmentCode}-${userId}-${Date.now()}`)
      .digest('hex');

    // 4. Lưu lịch hẹn vào DB
    const initialStatus =
      paymentMethod === 'CASH_AT_CLINIC' ? 'CONFIRMED' : 'PENDING';
    const initialPaymentStatus =
      paymentMethod === 'CASH_AT_CLINIC' ? 'UNPAID' : 'PENDING';

    const { data: appointment, error: apptErr } = await this.supabaseService.adminClient
      .from('appointments')
      .insert({
        appointment_code: appointmentCode,
        patient_id: userId,
        family_member_id: familyMemberId || null,
        doctor_id: doctorId,
        slot_id: slotId,
        appointment_date: appointmentDate,
        status: initialStatus,
        payment_status: initialPaymentStatus,
        payment_method: paymentMethod,
        base_fee: baseFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        coupon_id: couponId,
        reason_for_visit: reasonForVisit,
        symptoms_description: symptomsDescription || null,
        attachments: attachments || [],
        qr_code_hash: qrCodeHash,
      })
      .select('*')
      .single();

    if (apptErr || !appointment) {
      throw new InternalServerErrorException(
        `Không thể khởi tạo lịch hẹn: ${apptErr?.message}`,
      );
    }

    // 5. Cập nhật slot thành BOOKED và giải phóng Redis lock
    await this.supabaseService.adminClient
      .from('doctor_slots')
      .update({
        status: 'BOOKED',
        held_by_user_id: null,
        hold_expires_at: null,
      })
      .eq('id', slotId);

    await this.redisService.releaseLock(`lock:slot:${slotId}`, userId);

    // 6. Tạo thông báo Push cho người dùng
    await this.supabaseService.adminClient.from('notifications').insert({
      user_id: userId,
      title: 'Đặt lịch khám thành công! 🎉',
      body: `Mã lịch hẹn ${appointmentCode} với ${doctor.title} ${(doctor as any).user?.full_name} đã được xác nhận.`,
      type: 'APPOINTMENT_REMINDER',
      payload: { appointment_id: appointment.id, code: appointmentCode },
    });

    return {
      message: 'Đặt lịch khám thành công',
      appointment,
    };
  }

  /**
   * Lấy danh sách lịch hẹn của tôi (Upcoming / Completed / Cancelled)
   */
  async getMyAppointments(userId: string, status?: string) {
    let query = this.supabaseService.adminClient
      .from('appointments')
      .select(`
        id,
        appointment_code,
        appointment_date,
        status,
        payment_status,
        payment_method,
        total_amount,
        reason_for_visit,
        qr_code_hash,
        created_at,
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          title,
          room_number,
          user:users!doctors_user_id_fkey(full_name, avatar_url),
          speciality:specialities!doctors_speciality_id_fkey(name, icon_url),
          clinic:clinics!doctors_clinic_id_fkey(name, address, phone)
        ),
        slot:doctor_slots!appointments_slot_id_fkey(start_time, end_time)
      `)
      .eq('patient_id', userId)
      .order('appointment_date', { ascending: false });

    if (status) {
      query = query.eq('status', status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      throw new InternalServerErrorException(`Lỗi khi lấy lịch hẹn: ${error.message}`);
    }

    return data;
  }

  /**
   * Chi tiết lịch hẹn
   */
  async getAppointmentDetail(userId: string, id: string) {
    const { data: appointment, error } = await this.supabaseService.adminClient
      .from('appointments')
      .select(`
        *,
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          title,
          room_number,
          license_number,
          user:users!doctors_user_id_fkey(full_name, avatar_url, phone),
          speciality:specialities!doctors_speciality_id_fkey(name, icon_url),
          clinic:clinics!doctors_clinic_id_fkey(name, address, phone, latitude, longitude)
        ),
        slot:doctor_slots!appointments_slot_id_fkey(start_time, end_time),
        family_member:family_members!appointments_family_member_id_fkey(full_name, relationship, date_of_birth)
      `)
      .eq('id', id)
      .eq('patient_id', userId)
      .single();

    if (error || !appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn hoặc bạn không có quyền xem');
    }

    return appointment;
  }

  /**
   * Hủy lịch hẹn
   */
  async cancelAppointment(userId: string, id: string, reason: string) {
    const { data: appointment, error } = await this.supabaseService.adminClient
      .from('appointments')
      .select('id, status, slot_id')
      .eq('id', id)
      .eq('patient_id', userId)
      .single();

    if (error || !appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
      throw new BadRequestException('Lịch hẹn này không thể hủy');
    }

    // 1. Đổi trạng thái lịch sang CANCELLED
    await this.supabaseService.adminClient
      .from('appointments')
      .update({
        status: 'CANCELLED',
        cancellation_reason: reason,
        cancelled_by: userId,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id);

    // 2. Giải phóng slot khám về trạng thái AVAILABLE
    if (appointment.slot_id) {
      await this.supabaseService.adminClient
        .from('doctor_slots')
        .update({
          status: 'AVAILABLE',
          held_by_user_id: null,
          hold_expires_at: null,
        })
        .eq('id', appointment.slot_id);
    }

    return {
      message: 'Hủy lịch hẹn thành công',
      id,
    };
  }
}

