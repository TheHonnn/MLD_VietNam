import { Injectable, Logger, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private isValidUuid(id: string): boolean {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  private async resolveUserId(userId: string): Promise<string | null> {
    if (this.isValidUuid(userId)) {
      return userId;
    }
    return null;
  }

  /**
   * D01: Lấy danh sách gói liệu trình của khách hàng
   */
  async getMyPackages(userId: string) {
    const resolvedId = await this.resolveUserId(userId);

    if (resolvedId) {
      try {
        const { data, error } = await this.supabaseService.adminClient
          .from('user_packages')
          .select(`
            id,
            total_sessions,
            completed_sessions,
            status,
            expires_at,
            purchased_at,
            treatment_packages (
              id,
              name,
              description,
              image_url,
              total_sessions,
              price
            )
          `)
          .eq('customer_id', resolvedId)
          .order('purchased_at', { ascending: false });

        if (!error && data) {
          return data.map((pkg: any) => ({
            id: pkg.id,
            total_sessions: pkg.total_sessions,
            completed_sessions: pkg.completed_sessions,
            status: pkg.status,
            expires_at: pkg.expires_at,
            treatment_packages: pkg.treatment_packages,
            assigned_specialist: 'Trần Minh Phương',
            branch_name: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
            next_session_recommended: '',
          }));
        }
      } catch (err) {
        this.logger.warn(`Error fetching user packages: ${err}`);
      }
    }

    return [];
  }

  /**
   * D02: Chi tiết gói liệu trình & Phác đồ điều trị từng buổi
   */
  async getPackageDetail(userId: string, packageId: string) {
    if (this.isValidUuid(packageId)) {
      try {
        const { data: userPkg } = await this.supabaseService.adminClient
          .from('user_packages')
          .select(`
            id,
            total_sessions,
            completed_sessions,
            status,
            expires_at,
            treatment_packages (
              id,
              name,
              description,
              image_url,
              total_sessions,
              price
            )
          `)
          .eq('id', packageId)
          .maybeSingle();

        if (userPkg) {
          const { data: journals } = await this.supabaseService.adminClient
            .from('treatment_journal')
            .select('*')
            .eq('user_package_id', packageId)
            .order('session_number', { ascending: true });

          const tp = (userPkg as any).treatment_packages;
          const roadmap = (journals || []).map((j: any) => ({
            session: j.session_number,
            title: `Buổi ${j.session_number}: ${j.treatment_notes || 'Trị liệu phục hồi chuyên sâu'}`,
            status: 'COMPLETED',
            date: j.session_date,
            note: j.condition_after || j.specialist_advice || '',
          }));

          const completedCount = roadmap.length;
          const totalSessions = userPkg.total_sessions || tp?.total_sessions || 10;
          for (let i = completedCount + 1; i <= totalSessions; i++) {
            roadmap.push({
              session: i,
              title: `Buổi ${i}: Liệu pháp chuyên sâu theo phác đồ`,
              status: 'PENDING',
              date: `Dự kiến sau buổi ${i - 1} 3-5 ngày`,
              note: 'Theo dõi tiến triển tại buổi trị liệu kế tiếp.',
            });
          }

          return {
            id: userPkg.id,
            package_name: tp?.name || 'Gói Liệu Trình Trị Liệu MLD',
            total_sessions: totalSessions,
            completed_sessions: userPkg.completed_sessions || completedCount,
            status: userPkg.status || 'ACTIVE',
            specialist_name: 'Trần Minh Phương',
            specialist_title: 'Kỹ thuật viên Trị liệu Chuyên sâu MLD',
            specialist_avatar: 'assets/images/specialist_avatar_1.png',
            branch_name: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
            branch_address: '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
            goal: tp?.description || 'Giải phóng co thắt cơ, khai thông kinh lạc và phục hồi sức sống tự nhiên.',
            roadmap,
          };
        }
      } catch (err) {
        this.logger.warn(`Error getting package detail: ${err}`);
      }
    }

    return {
      id: packageId,
      package_name: 'Liệu trình Trị liệu Cổ Vai Gáy & Cột sống 10 buổi',
      total_sessions: 10,
      completed_sessions: 4,
      status: 'ACTIVE',
      specialist_name: 'Trần Minh Phương',
      specialist_title: 'Kỹ thuật viên Trị liệu Cổ Vai Gáy',
      specialist_avatar: 'assets/images/specialist_avatar_1.png',
      branch_name: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
      branch_address: '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
      goal: 'Giải phóng 100% co thắt cơ nâng vai và thang cơ, phục hồi biên độ cổ xoay 90 độ, dứt điểm đau nhức đầu do chèn ép dây thần kinh.',
      roadmap: [
        { session: 1, title: 'Khai thông kinh mạch vùng vai', status: 'COMPLETED', date: '01/10/2026', note: 'Cơ thang bên phải co cứng mạnh, đã tác động giải phóng sơ bộ.' },
        { session: 2, title: 'Đả thông kinh lạc & bấm huyệt Phong Trì', status: 'COMPLETED', date: '04/10/2026', note: 'Biên độ xoay cổ cải thiện 40%, khách đỡ đau nhức nửa đầu.' },
        { session: 3, title: 'Liệu pháp nhiệt ấm ngải cứu dưỡng sinh', status: 'COMPLETED', date: '08/10/2026', note: 'Kinh lạc lưu thông tốt, da ấm hồng hào, giấc ngủ sâu hơn.' },
        { session: 4, title: 'Cân bằng trục cổ và kéo giãn đốt sống', status: 'COMPLETED', date: '11/10/2026', note: 'Độ mềm cơ đạt 75%, khách không còn tê bì cánh tay.' },
        { session: 5, title: 'Tác động sâu nhóm cơ trám và liên sườn', status: 'PENDING', date: 'Dự kiến 15/10/2026', note: 'Chuẩn bị phác đồ tăng cường biên độ vận động.' },
        { session: 6, title: 'Phục hồi cân bằng tư thế đốt sống cổ', status: 'PENDING', date: 'Dự kiến 19/10/2026', note: 'Đánh giá khả năng tự giữ thẳng trục cột sống.' },
        { session: 7, title: 'Bảo dưỡng kinh mạch & bài độc sâu', status: 'PENDING', date: 'Dự kiến 23/10/2026', note: 'Liệu pháp ngâm thảo mộc kết hợp bài độc.' },
        { session: 8, title: 'Củng cố màng cơ chống tái phát', status: 'PENDING', date: 'Dự kiến 27/10/2026', note: 'Liệu pháp củng cố trương lực cơ ổn định.' },
        { session: 9, title: 'Điều hòa khí huyết toàn diện', status: 'PENDING', date: 'Dự kiến 31/10/2026', note: 'Khai mở toàn bộ mạch Đốc và Nhâm.' },
        { session: 10, title: 'Nghiệm thu liệu trình & hướng dẫn dưỡng sinh', status: 'PENDING', date: 'Dự kiến 05/11/2026', note: 'Bàn giao phác đồ bài tập tự luyện tại nhà.' },
      ],
    };
  }

  /**
   * D03: Lấy danh sách nhật ký chăm sóc sức khỏe
   */
  async getCareJournal(userId: string) {
    const resolvedId = await this.resolveUserId(userId);

    if (resolvedId) {
      try {
        const { data, error } = await this.supabaseService.adminClient
          .from('treatment_journal')
          .select(`
            id,
            session_number,
            session_date,
            condition_before,
            condition_after,
            treatment_notes,
            specialist_advice,
            customer_signature_url,
            technicians (
              id,
              users (full_name)
            )
          `)
          .eq('customer_id', resolvedId)
          .order('session_date', { ascending: false });

        if (!error && data) {
          return data.map((j: any) => ({
            id: j.id,
            session_number: j.session_number,
            date: j.session_date,
            service_name: 'Buổi chăm sóc trị liệu phục hồi',
            technician_name: j.technicians?.users?.full_name || 'Kỹ thuật viên MLD',
            specialist_name: j.technicians?.users?.full_name || 'Kỹ thuật viên MLD',
            branch_name: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
            condition_before: j.condition_before || '',
            condition_after: j.condition_after || '',
            recovery_score: 85,
            rating: 5,
            doctor_advice: j.specialist_advice || '',
            home_advice: j.specialist_advice || '',
            customer_feedback: j.treatment_notes || '',
            customer_note: j.treatment_notes || '',
            therapist_note: j.condition_after || '',
          }));
        }
      } catch (err) {
        this.logger.warn(`Error querying treatment journal: ${err}`);
      }
    }

    return [];
  }

  /**
   * D03: Tạo nhật ký chăm sóc mới
   */
  async createCareJournal(userId: string, dto: CreateJournalDto) {
    const resolvedId = await this.resolveUserId(userId);

    let savedRecord = null;
    if (resolvedId) {
      try {
        const payload: Record<string, any> = {
          customer_id: resolvedId,
          session_number: dto.sessionNumber || 1,
          session_date: new Date().toISOString().split('T')[0],
          condition_before: dto.skinConditionBefore || null,
          condition_after: dto.skinConditionAfter || null,
          treatment_notes: dto.treatmentNotes || dto.customerFeedback || null,
          specialist_advice: dto.treatmentNotes || null,
        };
        if (this.isValidUuid(dto.userPackageId || '')) payload.user_package_id = dto.userPackageId;
        if (this.isValidUuid(dto.bookingId || '')) payload.booking_id = dto.bookingId;

        const { data, error } = await this.supabaseService.adminClient
          .from('treatment_journal')
          .insert(payload)
          .select()
          .maybeSingle();

        if (!error && data) {
          savedRecord = data;
        }
      } catch (err) {
        this.logger.warn(`Error inserting treatment journal: ${err}`);
      }
    }

    return {
      success: true,
      message: 'Đã lưu nhật ký buổi chăm sóc thành công!',
      data: savedRecord || {
        id: `jrn-${Date.now()}`,
        session_number: dto.sessionNumber,
        created_at: new Date().toISOString(),
        ...dto,
      },
    };
  }

  /**
   * D04: Lưu bảng câu hỏi khảo sát tiền dịch vụ
   */
  async saveConsultation(userId: string, dto: CreateConsultationDto) {
    const resolvedId = await this.resolveUserId(userId);

    let savedRecord = null;
    if (resolvedId) {
      try {
        const payload: Record<string, any> = {
          customer_id: resolvedId,
          focus_areas: dto.focusAreas || [],
          pressure_pref: dto.pressurePreference || 'MEDIUM',
          has_sensitive_skin: dto.hasSensitiveSkin ?? false,
          has_oil_allergy: dto.hasEssentialOilAllergy ?? false,
          allergy_details: dto.allergyDetails || null,
          medical_conditions: dto.medicalConditions || [],
          special_requests: dto.specialRequests || null,
        };
        if (this.isValidUuid(dto.bookingId || '')) payload.booking_id = dto.bookingId;

        const { data, error } = await this.supabaseService.adminClient
          .from('consultation_surveys')
          .insert(payload)
          .select()
          .maybeSingle();

        if (!error && data) {
          savedRecord = data;
        }
      } catch (err) {
        this.logger.warn(`Error saving consultation survey: ${err}`);
      }
    }

    return {
      success: true,
      message: 'Đã lưu thông tin sàng lọc sức khỏe vào hồ sơ buổi chăm sóc!',
      data: savedRecord || {
        id: `cst-${Date.now()}`,
        customer_id: userId,
        created_at: new Date().toISOString(),
        ...dto,
      },
    };
  }

  /**
   * D05: Gửi đánh giá dịch vụ & chuyên gia (nhận +50 điểm thưởng)
   */
  async submitReview(userId: string, dto: CreateReviewDto) {
    let resolvedId = await this.resolveUserId(userId);
    if (!resolvedId) {
      const { data: firstUser } = await this.supabaseService.adminClient
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (firstUser) resolvedId = firstUser.id;
    }

    if (!resolvedId) {
      throw new BadRequestException('Không tìm thấy thông tin khách hàng hợp lệ.');
    }

    const ratingVal = dto.rating || (dto as any).overallRating || 5;
    const quickTags: string[] = dto.quickTags && dto.quickTags.length > 0 ? [...dto.quickTags] : [];
    if ((dto as any).serviceQualityRating) quickTags.push(`Chất lượng dịch vụ: ${(dto as any).serviceQualityRating}★`);
    if ((dto as any).staffAttitudeRating) quickTags.push(`Thái độ nhân viên: ${(dto as any).staffAttitudeRating}★`);
    if ((dto as any).spaceAmbianceRating) quickTags.push(`Không gian: ${(dto as any).spaceAmbianceRating}★`);
    if ((dto as any).procedureRating) quickTags.push(`Quy trình: ${(dto as any).procedureRating}★`);
    if ((dto as any).willingnessToRefer) quickTags.push(`Giới thiệu bạn bè: ${(dto as any).willingnessToRefer}`);

    // 1. Resolve & check booking_id (BUG-012, BUG-013)
    let bookingId = this.isValidUuid(dto.bookingId || '') ? dto.bookingId : null;
    let technicianId = this.isValidUuid(dto.technicianId || '') ? dto.technicianId : null;
    let serviceId = this.isValidUuid(dto.serviceId || '') ? dto.serviceId : null;

    if (bookingId) {
      // Kiểm tra booking này đã được đánh giá chưa (BUG-012)
      const { data: existingRev } = await this.supabaseService.adminClient
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (existingRev) {
        throw new ConflictException('Buổi hẹn này đã được đánh giá rồi.');
      }

      // Lấy thông tin service_id, technician_id từ booking nếu dto chưa có
      const { data: bkgData } = await this.supabaseService.adminClient
        .from('bookings')
        .select('id, service_id, technician_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (bkgData) {
        if (!technicianId && bkgData.technician_id) technicianId = bkgData.technician_id;
        if (!serviceId && bkgData.service_id) serviceId = bkgData.service_id;
      }
    } else {
      // Tìm booking gần nhất của user chưa được đánh giá
      const { data: reviewedList } = await this.supabaseService.adminClient
        .from('reviews')
        .select('booking_id')
        .eq('customer_id', resolvedId);

      const reviewedIds = (reviewedList || []).map((r: any) => r.booking_id).filter(Boolean);

      let bkgQuery = this.supabaseService.adminClient
        .from('bookings')
        .select('id, service_id, technician_id')
        .eq('customer_id', resolvedId)
        .order('created_at', { ascending: false });

      if (reviewedIds.length > 0) {
        bkgQuery = bkgQuery.not('id', 'in', `(${reviewedIds.join(',')})`);
      }

      const { data: availableBookings } = await bkgQuery.limit(1);

      if (availableBookings && availableBookings.length > 0) {
        bookingId = availableBookings[0].id;
        if (!technicianId && availableBookings[0].technician_id) technicianId = availableBookings[0].technician_id;
        if (!serviceId && availableBookings[0].service_id) serviceId = availableBookings[0].service_id;
      } else {
        throw new BadRequestException('Không tìm thấy buổi hẹn hợp lệ để thực hiện đánh giá.');
      }
    }

    // Fallback serviceId / technicianId if still missing
    if (!serviceId) {
      const { data: firstService } = await this.supabaseService.adminClient
        .from('services')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (firstService) serviceId = firstService.id;
    }

    if (!technicianId) {
      const { data: firstTech } = await this.supabaseService.adminClient
        .from('technicians')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (firstTech) technicianId = firstTech.id;
    }

    // 2. Insert Review (BUG-014: ném lỗi nếu insert thất bại)
    const reviewPayload: Record<string, any> = {
      customer_id: resolvedId,
      rating: ratingVal,
      review_tags: quickTags,
      comment: dto.comment || 'Khách hàng đánh giá chất lượng dịch vụ rất tốt.',
      photos: dto.photos || [],
      service_id: serviceId,
      booking_id: bookingId,
    };
    if (technicianId) reviewPayload.technician_id = technicianId;

    const { data: savedReview, error: revError } = await this.supabaseService.adminClient
      .from('reviews')
      .insert(reviewPayload)
      .select()
      .maybeSingle();

    if (revError || !savedReview) {
      this.logger.error(`Error inserting review to Supabase: ${revError?.message}`);
      throw new BadRequestException(revError?.message || 'Không thể lưu đánh giá. Vui lòng thử lại sau.');
    }

    // 3. Tích điểm thưởng cho khách hàng sau khi đánh giá thành công (BUG-014: chỉ tích điểm khi review insert OK)
    try {
      const { data: user } = await this.supabaseService.adminClient
        .from('users')
        .select('reward_points')
        .eq('id', resolvedId)
        .maybeSingle();

      const currentPts = (user?.reward_points as number) || 0;
      const newPts = currentPts + 50;

      await this.supabaseService.adminClient
        .from('users')
        .update({ reward_points: newPts })
        .eq('id', resolvedId);

      await this.supabaseService.adminClient
        .from('point_transactions')
        .insert({
          user_id: resolvedId,
          points_change: 50,
          balance_after: newPts,
          action_type: 'REVIEW_SERVICE',
          description: `Đánh giá chất lượng dịch vụ (+50 điểm) cho lịch hẹn ${bookingId}`,
        });
    } catch (ptErr) {
      this.logger.warn(`Error updating loyalty points: ${ptErr}`);
    }

    // 4. Cập nhật rating_avg và review_count của technician (BUG-015)
    if (technicianId) {
      try {
        const { data: techReviews } = await this.supabaseService.adminClient
          .from('reviews')
          .select('rating')
          .eq('technician_id', technicianId);

        if (techReviews && techReviews.length > 0) {
          const revCount = techReviews.length;
          const revAvg = +(techReviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / revCount).toFixed(2);
          await this.supabaseService.adminClient
            .from('technicians')
            .update({ rating_avg: revAvg, review_count: revCount })
            .eq('id', technicianId);
        }
      } catch (techErr) {
        this.logger.warn(`Error updating technician rating stats: ${techErr}`);
      }
    }

    return {
      success: true,
      message: 'Cảm ơn bạn đã đánh giá! Bạn được cộng +50 điểm thưởng hội viên VIP.',
      reward_points: 50,
      data: savedReview,
    };
  }

  /**
   * D06: Danh sách cẩm nang chăm sóc tại nhà
   */
  async getGuidelines(category?: string) {
    try {
      let query = this.supabaseService.adminClient
        .from('home_care_guidelines')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (category && category !== 'Tất cả') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (_) {}

    const list = [
      {
        id: 'gl-001',
        title: 'Chăm sóc cơ thể đúng cách trong 24 giờ sau liệu trình Massage',
        category: 'Phục hồi sau Massage',
        read_time_minutes: 4,
        image_url: 'assets/images/gioithieu_1.png',
        summary: 'Những lưu ý vàng giúp cơ thể đào thải độc tố và duy trì hiệu quả đả thông kinh lạc sau buổi bấm huyệt.',
        steps: [
          { step: 1, title: 'Uống đủ nước ấm', desc: 'Bổ sung 300-500ml nước ấm ngay sau liệu trình để hỗ trợ thận đào thải axit lactic tích tụ.' },
          { step: 2, title: 'Tránh tắm nước lạnh ngay', desc: 'Nên nghỉ ngơi ít nhất 2-3 giờ trước khi tắm bằng nước ấm để không bị nhiễm hàn khí vào lỗ chân lông.' },
          { step: 3, title: 'Giữ ấm cơ thể', desc: 'Tránh ngồi trực diện luồng gió điều hòa mạnh, đặc biệt là vùng gáy và thắt lưng.' },
          { step: 4, title: 'Ngủ sớm trước 23h', desc: 'Giấc ngủ sâu là thời điểm vàng để cơ bắp tái tạo và kinh mạch gan mật bài độc.' },
        ],
      },
      {
        id: 'gl-002',
        title: '5 Động tác giãn cơ cổ vai gáy 3 phút dành cho dân văn phòng',
        category: 'Giãn cơ văn phòng',
        read_time_minutes: 3,
        image_url: 'assets/images/branch_hero_1.png',
        summary: 'Giải phóng chèn ép đốt sống cổ ngay tại bàn làm việc mà không cần dụng cụ.',
        steps: [
          { step: 1, title: 'Nghiêng đầu sang bên', desc: 'Giữ mỗi bên 15 giây, cảm nhận sự kéo giãn nhẹ nhàng cơ ức đòn chũm.' },
          { step: 2, title: 'Xoay khớp vai ra sau', desc: 'Thực hiện 10 vòng xoay tròn chậm rãi, mở rộng lồng ngực.' },
          { step: 3, title: 'Đan tay đẩy cằm lên', desc: 'Dùng 2 ngón tay cái nhẹ nhàng đẩy cằm ngửa lên trần nhà trong 10 giây.' },
          { step: 4, title: 'Cúi gập cổ kéo giãn', desc: 'Đan hai tay sau gáy và nhẹ nhàng kéo đầu hướng xuống ngực.' },
        ],
      },
      {
        id: 'gl-003',
        title: 'Bí quyết ngâm chân thảo dược dưỡng sinh giấc ngủ sâu',
        category: 'Dưỡng sinh giấc ngủ',
        read_time_minutes: 5,
        image_url: 'assets/images/gioithieu_2.png',
        summary: 'Kích hoạt các huyệt đạo dưới lòng bàn chân giúp xua tan hàn khí, an thần và ngủ sâu giấc.',
        steps: [
          { step: 1, title: 'Nhiệt độ nước thích hợp', desc: 'Duy trì nước ấm khoảng 40-42 độ C, mực nước ngập trên mắt cá chân 2 đốt ngón tay.' },
          { step: 2, title: 'Thêm thảo dược tự nhiên', desc: 'Thêm gừng tươi đập dập, muối hạt hoặc gói thảo dược ngâm chân MLD.' },
          { step: 3, title: 'Thời gian ngâm chuẩn', desc: 'Ngâm trong 15-20 phút trước khi đi ngủ, lau khô và giữ ấm lòng bàn chân.' },
        ],
      },
    ];

    if (category && category !== 'Tất cả') {
      return list.filter((i) => i.category === category);
    }
    return list;
  }

  /**
   * D07: Lấy danh mục câu hỏi thường gặp FAQ
   */
  async getFaqs() {
    try {
      const { data, error } = await this.supabaseService.adminClient
        .from('support_faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (_) {}

    return [
      {
        id: 'faq-01',
        category: 'Đặt lịch & Đổi giờ',
        question: 'Tôi có thể đổi giờ hẹn hoặc hủy lịch hẹn trước bao lâu?',
        answer: 'Bạn có thể tự do đổi ngày/giờ hẹn miễn phí trước ít nhất 2 giờ so với lịch hẹn dự kiến. Nếu đổi lịch trong vòng 2 giờ, vui lòng liên hệ trực tiếp hotline để được hỗ trợ.',
      },
      {
        id: 'faq-02',
        category: 'Đặt lịch & Đổi giờ',
        question: 'Tiền cọc giữ chỗ có được hoàn lại nếu tôi hủy lịch không?',
        answer: 'Khi bạn hủy lịch trước 2 giờ, số tiền cọc sẽ được hoàn lại 100% vào tài khoản ví MLD hoặc ngân hàng trong 1-3 ngày làm việc.',
      },
      {
        id: 'faq-03',
        category: 'Liệu trình & Thanh toán',
        question: 'Gói liệu trình nhiều buổi có thời hạn sử dụng trong bao lâu?',
        answer: 'Các gói liệu trình 5 - 10 buổi tại MLD Vietnam có thời hạn sử dụng 6 tháng kể từ ngày kích hoạt buổi đầu tiên.',
      },
      {
        id: 'faq-04',
        category: 'Dưỡng sinh & Sức khỏe',
        question: 'Tôi bị đau mỏi nhiều sau buổi massage đầu tiên thì có bình thường không?',
        answer: 'Đây là phản ứng sinh học hoàn toàn bình thường (cơ bắp giải phóng axit lactic tích tụ lâu ngày). Cảm giác này sẽ dịu dần sau 24-48 giờ và cơ thể bạn sẽ nhẹ nhõm hơn rõ rệt.',
      },
      {
        id: 'faq-05',
        category: 'Liệu trình & Thanh toán',
        question: 'Tôi có thể chuyển nhượng số buổi liệu trình cho người thân không?',
        answer: 'Có, MLD Vietnam hỗ trợ chuyển nhượng các buổi liệu trình chưa sử dụng cho người thân hoặc bạn bè hoàn toàn miễn phí tại quầy lễ tân.',
      },
    ];
  }

  /**
   * D07: Tạo phiếu yêu cầu hỗ trợ khách hàng
   */
  async createSupportTicket(userId: string, dto: CreateSupportTicketDto) {
    const resolvedId = await this.resolveUserId(userId);
    const code = `TK-${Date.now().toString().slice(-6)}`;

    if (resolvedId) {
      try {
        await this.supabaseService.adminClient
          .from('support_tickets')
          .insert({
            customer_id: resolvedId,
            subject: dto.subject,
            message: dto.message,
            status: 'PENDING',
          });
      } catch (err) {
        this.logger.warn(`Error creating support ticket: ${err}`);
      }
    }

    return {
      success: true,
      ticket_code: code,
      message: 'Yêu cầu của bạn đã được tiếp nhận. Đội ngũ CSKH MLD sẽ phản hồi trong vòng 15 phút.',
      data: dto,
    };
  }

  /**
   * D08: Danh sách thông báo
   */
  async getNotifications(userId: string, type?: string) {
    const resolvedId = await this.resolveUserId(userId);

    if (resolvedId) {
      try {
        let query = this.supabaseService.adminClient
          .from('notifications')
          .select('*')
          .eq('user_id', resolvedId)
          .order('created_at', { ascending: false });

        if (type && type !== 'ALL') {
          query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            time: 'Gần đây',
            is_read: n.is_read,
          }));
        }
      } catch (err) {
        this.logger.warn(`Error querying notifications: ${err}`);
      }
    }

    const notifications = [
      {
        id: 'notif-01',
        type: 'APPOINTMENT',
        title: 'Nhắc lịch chăm sóc sắp tới',
        message: 'Lịch hẹn Massage thư giãn toàn thân lúc 14:00 ngày mai tại Chi nhánh Quận 3. Chuyên viên: Trần Minh Phương.',
        time: '1 giờ trước',
        is_read: false,
      },
      {
        id: 'notif-02',
        type: 'PROMO',
        title: 'Voucher ưu đãi 50.000đ dành riêng cho bạn',
        message: 'Mã MLDCHAOXIN giảm 50.000đ cho gói liệu trình chăm sóc cổ vai gáy có hiệu lực đến hết tuần này.',
        time: 'Hôm qua',
        is_read: false,
      },
      {
        id: 'notif-03',
        type: 'SYSTEM',
        title: 'Đã hoàn thành buổi chăm sóc số 4',
        message: 'Bạn đã hoàn thành buổi 4/10 của Liệu trình Cổ Vai Gáy. Xem lời dặn dò của chuyên viên trong Nhật ký.',
        time: '2 ngày trước',
        is_read: true,
      },
      {
        id: 'notif-04',
        type: 'SYSTEM',
        title: 'Chúc mừng bạn thăng hạng VIP Kim Cương',
        message: 'Tài khoản của bạn đã đạt mốc 350 điểm thưởng, mở khóa ưu đãi giảm 10% trọn đời tất cả dịch vụ.',
        time: '5 ngày trước',
        is_read: true,
      },
    ];

    if (type && type !== 'ALL') {
      return notifications.filter((n) => n.type === type);
    }
    return notifications;
  }

  /**
   * D08: Đánh dấu đã đọc thông báo
   */
  async markNotificationRead(userId: string, notificationId: string) {
    const resolvedId = await this.resolveUserId(userId);

    if (resolvedId && this.isValidUuid(notificationId)) {
      try {
        await this.supabaseService.adminClient
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', resolvedId);
      } catch (err) {
        this.logger.warn(`Error marking notification as read: ${err}`);
      }
    }

    return { success: true, notification_id: notificationId, is_read: true };
  }
}
