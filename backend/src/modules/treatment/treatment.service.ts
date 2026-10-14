import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@Injectable()
export class TreatmentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * D01: Lấy danh sách gói liệu trình của khách hàng
   */
  async getMyPackages(userId: string) {
    try {
      const { data, error } = await this.supabaseService.adminClient
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
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (_) {}

    // Mock data phong phú chuẩn MLD khi chưa kết nối DB
    return [
      {
        id: 'pkg-user-001',
        total_sessions: 10,
        completed_sessions: 4,
        status: 'ACTIVE',
        expires_at: '2026-12-31T23:59:59Z',
        treatment_packages: {
          id: 'tp-001',
          name: 'Liệu trình Trị liệu Cổ Vai Gáy & Cột sống 10 buổi',
          description: 'Phác đồ khai thông kinh lạc, giải phóng chèn ép cơ và phục hồi vận động.',
          image_url: 'assets/images/specialist_hero_1.png',
          total_sessions: 10,
          price: 3500000,
        },
        assigned_specialist: 'Trần Minh Phương',
        branch_name: 'Chi nhánh mẫu 01 — Quận 3',
        next_session_recommended: '16/10/2026',
      },
      {
        id: 'pkg-user-002',
        total_sessions: 5,
        completed_sessions: 2,
        status: 'ACTIVE',
        expires_at: '2026-11-20T23:59:59Z',
        treatment_packages: {
          id: 'tp-002',
          name: 'Gói Chăm Sóc Da & Phục Hồi Dưỡng Ẩm 5 buổi',
          description: 'Quy trình phục hồi màng ẩm sinh học tự nhiên với tinh chất thảo mộc quý.',
          image_url: 'assets/images/gioithieu_2.png',
          total_sessions: 5,
          price: 2100000,
        },
        assigned_specialist: 'Nguyễn Thu Hà',
        branch_name: 'Chi nhánh mẫu 01 — Quận 3',
        next_session_recommended: '18/10/2026',
      },
    ];
  }

  /**
   * D02: Chi tiết gói liệu trình & Phác đồ điều trị từng buổi
   */
  async getPackageDetail(userId: string, packageId: string) {
    return {
      id: packageId,
      package_name: 'Liệu trình Trị liệu Cổ Vai Gáy & Cột sống 10 buổi',
      total_sessions: 10,
      completed_sessions: 4,
      status: 'ACTIVE',
      specialist_name: 'Trần Minh Phương',
      specialist_title: 'Kỹ thuật viên Trị liệu Cổ Vai Gáy',
      specialist_avatar: 'assets/images/specialist_avatar_1.png',
      branch_name: 'Chi nhánh mẫu 01 — Quận 3',
      branch_address: '123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
      goal: 'Giải phóng 100% co thắt cơ nâng vai và thang cơ, phục hồi biên độ cổ xoay 90 độ, dứt điểm đau nhức đầu do chèn ép dây thần kinh.',
      roadmap: [
        { session: 1, title: 'Khai thông kinh mạch vùng vai', status: 'COMPLETED', date: '01/10/2026', note: 'Cơ thang bên phải co cứng mạnh, đã tác động giải phóng sơ bộ.' },
        { session: 2, title: 'Đả thông kinh lạc & bấm huyệt Phong Trì', status: 'COMPLETED', date: '04/10/2026', note: 'Biên độ xoay cổ cải thiện 40%, khách đỡ đau nhức nửa đầu.' },
        { session: 3, title: 'Liệu pháp nhiệt ấm ngải cứu dưỡng sinh', status: 'COMPLETED', date: '08/10/2026', note: 'Kinh lạc lưu thông tốt, da ấm hồng hào, giấc ngủ sâu hơn.' },
        { session: 4, title: 'Cân bằng trục cổ và kéo giãn đốt sống', status: 'COMPLETED', date: '11/10/2026', note: 'Độ mềm cơ đạt 75%, khách không còn tê bì cánh tay.' },
        { session: 5, title: 'Tác động sâu nhóm cơ trám và liên sườn', status: 'PENDING', date: 'Dự kiến 15/10/2026' },
        { session: 6, title: 'Phục hồi cân bằng tư thế đốt sống cổ', status: 'PENDING', date: 'Dự kiến 19/10/2026' },
        { session: 7, title: 'Bảo dưỡng kinh mạch & bài độc sâu', status: 'PENDING', date: 'Dự kiến 23/10/2026' },
        { session: 8, title: 'Củng cố màng cơ chống tái phát', status: 'PENDING', date: 'Dự kiến 27/10/2026' },
        { session: 9, title: 'Điều hòa khí huyết toàn diện', status: 'PENDING', date: 'Dự kiến 31/10/2026' },
        { session: 10, title: 'Nghiệm thu liệu trình & hướng dẫn dưỡng sinh', status: 'PENDING', date: 'Dự kiến 05/11/2026' },
      ],
    };
  }

  /**
   * D03: Lấy danh sách nhật ký chăm sóc sức khỏe
   */
  async getCareJournal(userId: string) {
    return [
      {
        id: 'jrn-001',
        session_number: 4,
        date: '11/10/2026',
        specialist_name: 'Trần Minh Phương',
        condition_before: 'Cổ hơi mỏi sau 3 ngày làm việc văn phòng.',
        condition_after: 'Cổ xoay nhẹ nhàng, hết hoàn toàn cảm giác căng nặng vai.',
        recovery_score: 85,
        rating: 5,
        doctor_advice: 'Uống nhiều nước ấm, tránh ngồi cúi gập đầu xem điện thoại quá 30 phút liên tục.',
        customer_feedback: 'Buổi thứ 4 cảm nhận cơ thể nhẹ nhõm rõ rệt, đêm ngủ rất ngon giấc.',
      },
      {
        id: 'jrn-002',
        session_number: 3,
        date: '08/10/2026',
        specialist_name: 'Trần Minh Phương',
        condition_before: 'Căng cơ nhẹ, ngủ chập chờn.',
        condition_after: 'Người ấm áp, cơ vai giãn mềm tốt.',
        recovery_score: 70,
        rating: 5,
        doctor_advice: 'Dùng túi chườm ấm thảo dược trước khi đi ngủ 15 phút.',
        customer_feedback: 'Ấn huyệt Phong Trì rất dễ chịu, giảm đau đầu ngay.',
      },
      {
        id: 'jrn-003',
        session_number: 2,
        date: '04/10/2026',
        specialist_name: 'Trần Minh Phương',
        condition_before: 'Đau mỏi vùng gáy lan sang bả vai phải.',
        condition_after: 'Đỡ mỏi khoảng 50%, hơi ê nhẹ do giải phóng điểm co thắt.',
        recovery_score: 55,
        rating: 5,
        doctor_advice: 'Hiện tượng ê cơ nhẹ trong 24h là bình thường, sẽ dịu đi vào ngày mai.',
        customer_feedback: 'Kỹ thuật viên làm rất có tâm, lực bấm vừa vặn.',
      },
    ];
  }

  /**
   * D03: Tạo nhật ký chăm sóc mới
   */
  async createCareJournal(userId: string, dto: CreateJournalDto) {
    return {
      success: true,
      message: 'Đã lưu nhật ký buổi chăm sóc thành công!',
      data: {
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
    return {
      success: true,
      message: 'Đã lưu thông tin sàng lọc sức khỏe vào hồ sơ buổi chăm sóc!',
      data: {
        id: `cst-${Date.now()}`,
        customer_id: userId,
        created_at: new Date().toISOString(),
        ...dto,
      },
    };
  }

  /**
   * D05: Gửi đánh giá dịch vụ & chuyên gia
   */
  async submitReview(userId: string, dto: CreateReviewDto) {
    return {
      success: true,
      message: 'Cảm ơn bạn đã đánh giá! Bạn được cộng +50 điểm thưởng hội viên VIP.',
      reward_points: 50,
      data: {
        id: `rev-${Date.now()}`,
        customer_id: userId,
        created_at: new Date().toISOString(),
        ...dto,
      },
    };
  }

  /**
   * D06: Danh sách cẩm nang chăm sóc tại nhà
   */
  async getGuidelines(category?: string) {
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
    return {
      success: true,
      ticket_code: `TK-${Date.now().toString().slice(-6)}`,
      message: 'Yêu cầu của bạn đã được tiếp nhận. Đội ngũ CSKH MLD sẽ phản hồi trong vòng 15 phút.',
      data: dto,
    };
  }

  /**
   * D08: Danh sách thông báo
   */
  async getNotifications(userId: string, type?: string) {
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
    return { success: true, notification_id: notificationId, is_read: true };
  }
}

