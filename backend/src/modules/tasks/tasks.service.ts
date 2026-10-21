import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../database/supabase.service';
import { RedisService } from '../../database/redis.service';
import { EmailService } from '../auth/services/email.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  // Bộ nhớ theo dõi các mã lịch đã gửi reminder tránh spam trùng lặp
  private sentReminders24h = new Set<string>();
  private sentReminders2h = new Set<string>();

  constructor(
    private supabaseService: SupabaseService,
    private redisService: RedisService,
    private emailService: EmailService,
  ) {}

  /**
   * CRON JOB 1: Tự động quét và giải phóng các slot quá hạn 10 phút chưa thanh toán cọc
   * Chạy định kỳ mỗi 1 phút
   */
  @Cron('*/1 * * * *')
  async handleReleaseExpiredHoldSlots(): Promise<void> {
    const nowIso = new Date().toISOString();

    try {
      // 1. Quét DB tìm các slot có status HOLD và thời gian hold_expires_at đã qua
      const { data: expiredSlots, error } = await this.supabaseService.adminClient
        .from('technician_slots')
        .select('id, held_by_user_id, slot_date, start_time')
        .eq('status', 'HOLD')
        .lt('hold_expires_at', nowIso);

      if (!error && expiredSlots && expiredSlots.length > 0) {
        this.logger.log(
          `⏱️ [CRON JOB] Phát hiện ${expiredSlots.length} slot quá hạn 10 phút chưa hoàn tất cọc. Đang tự động giải phóng...`,
        );

        for (const slot of expiredSlots) {
          // Cập nhật DB lại AVAILABLE
          await this.supabaseService.adminClient
            .from('technician_slots')
            .update({
              status: 'AVAILABLE',
              held_by_user_id: null,
              hold_expires_at: null,
            })
            .eq('id', slot.id);

          // Giải phóng Redis Lock
          await this.redisService.releaseLock(
            `lock:slot:${slot.id}`,
            slot.held_by_user_id || 'guest',
          );
        }

        this.logger.log(`✅ [CRON JOB] Đã giải phóng thành công ${expiredSlots.length} slot về trạng thái sẵn sàng.`);
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi trong cron job giải phóng hold slots: ${err.message}`);
    }
  }

  /**
   * CRON JOB 2: Tự động gửi Email nhắc lịch hẹn trước 24 giờ và trước 2 giờ
   * Chạy định kỳ mỗi 10 phút
   */
  @Cron('*/10 * * * *')
  async handleAppointmentReminders(): Promise<void> {
    try {
      const now = Date.now();

      // Quét các lịch hẹn CONFIRMED sắp tới
      const { data: bookings, error } = await this.supabaseService.adminClient
        .from('bookings')
        .select(`
          id,
          booking_code,
          booking_date,
          start_time,
          booked_for_name,
          booked_for_phone,
          customer_id,
          users:users!bookings_customer_id_fkey(email, full_name),
          branches (name, address, phone),
          technicians (full_name)
        `)
        .eq('status', 'CONFIRMED');

      if (error || !bookings || bookings.length === 0) return;

      for (const b of bookings) {
        const appointmentTimeStr = `${b.booking_date}T${b.start_time}:00`;
        const appointmentTimestamp = new Date(appointmentTimeStr).getTime();
        if (isNaN(appointmentTimestamp)) continue;

        const diffMs = appointmentTimestamp - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        const email = (b as any).users?.email;
        if (!email) continue;

        const customerName = b.booked_for_name || (b as any).users?.full_name || 'Quý khách';
        const branchName = (b as any).branches?.name || 'Chi nhánh Quận 3';
        const branchAddress = (b as any).branches?.address || '123 Đường Nam Kỳ Khởi Nghĩa, Quận 3, TP. HCM';
        const specialistName = (b as any).technicians?.full_name || 'Chuyên viên chỉ định MLD';

        // 1. Nhắc trước 24 giờ (cửa sổ từ 23.0h đến 24.5h)
        if (diffHours >= 23.0 && diffHours <= 24.5) {
          const key24h = `${b.id}-24h`;
          if (!this.sentReminders24h.has(key24h)) {
            this.sentReminders24h.add(key24h);
            await this.emailService.sendAppointmentReminderEmail({
              to: email,
              customerName,
              bookingCode: b.booking_code,
              serviceName: 'Dịch vụ Trị liệu & Chăm sóc Spa MLD',
              branchName,
              branchAddress,
              date: b.booking_date,
              time: b.start_time,
              specialistName,
              hoursBefore: 24,
            });
          }
        }

        // 2. Nhắc trước 2 giờ (cửa sổ từ 1.5h đến 2.2h)
        if (diffHours >= 1.5 && diffHours <= 2.2) {
          const key2h = `${b.id}-2h`;
          if (!this.sentReminders2h.has(key2h)) {
            this.sentReminders2h.add(key2h);
            await this.emailService.sendAppointmentReminderEmail({
              to: email,
              customerName,
              bookingCode: b.booking_code,
              serviceName: 'Dịch vụ Trị liệu & Chăm sóc Spa MLD',
              branchName,
              branchAddress,
              date: b.booking_date,
              time: b.start_time,
              specialistName,
              hoursBefore: 2,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi trong cron job gửi email nhắc lịch: ${err.message}`);
    }
  }
}

