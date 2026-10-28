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

  /**
   * CRON JOB 3: Tự động gia hạn Access Token Zalo Cloud trước khi hết hạn (chạy định kỳ mỗi 6 giờ)
   */
  @Cron('0 */6 * * *')
  async handleAutoRefreshZaloToken(): Promise<void> {
    try {
      const { data: cfg } = await this.supabaseService.adminClient
        .from('zns_config')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!cfg || !cfg.refresh_token || !cfg.app_secret || !cfg.app_id) {
        return;
      }

      const expiresAt = cfg.expires_at ? new Date(cfg.expires_at).getTime() : 0;
      const hoursRemaining = (expiresAt - Date.now()) / (1000 * 60 * 60);

      // Nếu còn dưới 6 tiếng hoặc đã quá hạn -> Tự động gọi làm mới token
      if (hoursRemaining <= 6) {
        this.logger.log(`⏱️ [CRON JOB] Zalo Access Token còn ${hoursRemaining.toFixed(1)}h hiệu lực. Đang tự động làm mới...`);

        const bodyParams = new URLSearchParams({
          refresh_token: cfg.refresh_token.trim(),
          app_id: cfg.app_id.trim(),
          grant_type: 'refresh_token',
        });

        const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
          method: 'POST',
          headers: {
            'secret_key': cfg.app_secret.trim(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });
        const data = await res.json();
        if (data.access_token) {
          const expiresInSeconds = Number(data.expires_in) || 90000;
          const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
          await this.supabaseService.adminClient
            .from('zns_config')
            .upsert({
              id: 'default',
              access_token: data.access_token,
              refresh_token: data.refresh_token || cfg.refresh_token,
              expires_at: newExpiresAt,
              updated_at: new Date().toISOString(),
            });
          this.logger.log(`✅ [CRON JOB] Đã tự động làm mới Zalo Access Token thành công! Hiệu lực đến ${newExpiresAt}`);
        } else {
          this.logger.warn(`[CRON JOB Zalo Error]: ${JSON.stringify(data)}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi trong cron job refresh Zalo token: ${err.message}`);
    }
  }

  /**
   * CRON JOB 4: Tự động quét kiểm tra thời hạn 365 ngày của học viên
   * Chạy định kỳ vào 00:00 (nửa đêm) mỗi ngày
   * Tự động chuyển các ghi danh quá hạn 365 ngày sang trạng thái EXPIRED và thu hồi quyền truy cập
   */
  @Cron('0 0 * * *')
  async handleSweepExpiredEnrollments(): Promise<{ expiredCount: number; expiringSoonCount: number; activeCount: number }> {
    try {
      this.logger.log('⏱️ [CRON JOB HỌC VIỆN] Bắt đầu quét kiểm tra thời hạn 365 ngày của học viên...');

      const { data, error } = await this.supabaseService.adminClient.rpc('fn_expire_enrollments_cron');

      if (!error && data && data.length > 0) {
        const row = data[0];
        const expiredCount = Number(row.expired_count || 0);
        const expiringSoonCount = Number(row.expiring_soon_count || 0);
        const activeCount = Number(row.active_count || 0);

        this.logger.log(
          `✅ [CRON JOB HỌC VIỆN] Quét hoàn tất: ${expiredCount} học viên hết hạn (EXPIRED), ${expiringSoonCount} học viên sắp hết hạn (<=30 ngày), ${activeCount} học viên đang hoạt động.`,
        );

        return { expiredCount, expiringSoonCount, activeCount };
      } else {
        // Fallback nếu RPC chưa sẵn sàng: truy vấn và cập nhật trực tiếp qua Supabase Client
        const nowIso = new Date().toISOString();
        const { data: expiredList } = await this.supabaseService.adminClient
          .from('course_enrollments')
          .select('id, student_name, valid_until')
          .lt('valid_until', nowIso)
          .neq('access_status', 'EXPIRED');

        let expiredCount = 0;
        if (expiredList && expiredList.length > 0) {
          for (const item of expiredList) {
            await this.supabaseService.adminClient
              .from('course_enrollments')
              .update({
                access_status: 'EXPIRED',
                expired_at: nowIso,
              })
              .eq('id', item.id);
            expiredCount++;
          }
        }

        this.logger.log(`✅ [CRON JOB HỌC VIỆN] Đã cập nhật ${expiredCount} học viên hết hạn sang EXPIRED.`);
        return { expiredCount, expiringSoonCount: 0, activeCount: 0 };
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi trong cron job quét hết hạn học viên: ${err.message}`);
      return { expiredCount: 0, expiringSoonCount: 0, activeCount: 0 };
    }
  }

  /**
   * CRON JOB 5: Tự động giải phóng tài nguyên Spa khi ca kết thúc (Auto-Release Lifecycle)
   * Chạy định kỳ mỗi 10 phút
   * Cập nhật các booking đã qua giờ kết thúc thành COMPLETED, giải phóng 6 Giường và 6 KTV cho ca tiếp theo
   */
  @Cron('*/5 * * * *')
  async handleAutoReleaseExpiredBookings(): Promise<{ releasedCount: number }> {
    try {
      this.logger.log('⏱️ [CRON JOB SPA DRC] Bắt đầu quét giải phóng tài nguyên ca đã kết thúc (Auto-Release)...');
      
      // 1. Thử gọi RPC fn_release_completed_bookings
      const { data, error } = await this.supabaseService.adminClient.rpc('fn_release_completed_bookings');
      if (!error && data && data.length > 0) {
        const releasedCount = Number(data[0].released_count || 0);
        if (releasedCount > 0) {
          this.logger.log(
            `✅ [CRON JOB SPA DRC] Auto-release RPC hoàn tất: ${releasedCount} ca đã hoàn thành (nhả giường & KTV).`,
          );
        }
        return { releasedCount };
      }

      // 2. Fallback trực tiếp bằng Supabase query
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = now.toTimeString().split(' ')[0];
      const { data: pastBookings } = await this.supabaseService.adminClient
        .from('bookings')
        .select('id')
        .eq('booking_date', todayStr)
        .lte('end_time', currentTimeStr)
        .in('status', ['IN_SERVICE', 'CONFIRMED']);

      let releasedCount = 0;
      if (pastBookings && pastBookings.length > 0) {
        for (const b of pastBookings) {
          await this.supabaseService.adminClient
            .from('bookings')
            .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
            .eq('id', b.id);
          releasedCount++;
        }
        this.logger.log(`✅ [CRON JOB SPA DRC] Fallback hoàn tất: Đã nhả phòng & KTV cho ${releasedCount} ca.`);
      }
      return { releasedCount };
    } catch (err: any) {
      this.logger.warn(`Lỗi trong cron job auto-release booking: ${err.message}`);
      return { releasedCount: 0 };
    }
  }
}


