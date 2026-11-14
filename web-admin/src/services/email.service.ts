import { EmailTemplate, EmailLog, ApiResponse } from '../types/shared_types';
import { portalQuery } from './portalQuery';
import { apiClient } from './apiClient';

export const emailService = {
  /**
   * Lấy danh sách các mẫu Email đào tạo & vận hành
   */
  async getTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    try {
      const raw = await portalQuery<any[]>('email_templates?select=*&order=created_at.asc');
      if (!raw || raw.length === 0) {
        return { success: true, statusCode: 200, message: 'Chưa có mẫu Email được cấu hình', data: [] };
      }

      const list: EmailTemplate[] = raw.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        description: t.description || '',
        bodyHtml: t.body_html,
        variables: Array.isArray(t.variables) ? t.variables : [],
        isActive: Boolean(t.is_active),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      return { success: true, statusCode: 200, message: 'Tải danh sách mẫu Email thành công', data: list };
    } catch (err) {
      console.error('[emailService] getTemplates error:', err);
      return { success: false, statusCode: 500, message: 'Không tải được mẫu email. Vui lòng thử lại.', data: [] };
    }
  },

  /**
   * Lấy chi tiết mẫu Email theo ID
   */
  async getTemplateById(templateId: string): Promise<ApiResponse<EmailTemplate | null>> {
    try {
      const raw = await portalQuery<any[]>(`email_templates?id=eq.${templateId}&select=*`);
      if (!raw || raw.length === 0) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy mẫu Email', data: null };
      }
      const t = raw[0];
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết mẫu Email',
        data: {
          id: t.id,
          name: t.name,
          subject: t.subject,
          description: t.description || '',
          bodyHtml: t.body_html,
          variables: Array.isArray(t.variables) ? t.variables : [],
          isActive: Boolean(t.is_active),
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        },
      };
    } catch (err) {
      console.error('[emailService] getTemplateById error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải mẫu Email', data: null };
    }
  },

  /**
   * Cập nhật nội dung tiêu đề hoặc HTML của mẫu Email
   */
  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<ApiResponse<boolean>> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.bodyHtml !== undefined) payload.body_html = updates.bodyHtml;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      payload.updated_at = new Date().toISOString();

      const res = await portalQuery<any>(`email_templates?id=eq.${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      return { success: res !== null, statusCode: 200, message: 'Cập nhật mẫu Email thành công', data: true };
    } catch (err) {
      console.error('[emailService] updateTemplate error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi cập nhật mẫu Email', data: false };
    }
  },

  /**
   * Lấy nhật ký gửi Email (Logs)
   */
  async getLogs(params?: {
    recipientEmail?: string;
    templateId?: string;
    status?: string;
  }): Promise<ApiResponse<EmailLog[]>> {
    try {
      let queryPath = 'email_logs?select=*&order=sent_at.desc';
      if (params?.recipientEmail) queryPath += `&recipient_email=ilike.*${params.recipientEmail}*`;
      if (params?.templateId) queryPath += `&template_id=eq.${params.templateId}`;
      if (params?.status) queryPath += `&status=eq.${params.status}`;

      const raw = await portalQuery<any[]>(queryPath);
      if (!raw) return { success: true, statusCode: 200, message: 'Nhật ký gửi Email', data: [] };

      const list: EmailLog[] = raw.map((l) => ({
        id: l.id,
        recipientEmail: l.recipient_email,
        recipientName: l.recipient_name || '',
        templateId: l.template_id,
        subject: l.subject,
        bodyHtml: l.body_html,
        status: l.status,
        metadata: l.metadata || {},
        errorMessage: l.error_message,
        sentAt: l.sent_at,
        createdAt: l.created_at,
      }));

      return { success: true, statusCode: 200, message: 'Tải nhật ký gửi Email thành công', data: list };
    } catch (err) {
      console.error('[emailService] getLogs error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải nhật ký Email', data: [] };
    }
  },

  /**
   * Gửi Email sử dụng mẫu thông báo đào tạo và ghi log
   */
  async sendEmail(params: {
    recipientEmail: string;
    recipientName?: string;
    templateId: string;
    variables: Record<string, string>;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<boolean>> {
    try {
      await apiClient.post<boolean>('admin/email/test', {
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        templateId: params.templateId,
        variables: params.variables,
      });

      return {
        success: true,
        statusCode: 200,
        message: `Đã gửi thành công email mẫu tới ${params.recipientEmail}`,
        data: true,
      };
    } catch (err: any) {
      console.error('[emailService] sendEmail error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi gửi email', data: false };
    }
  },

  /**
   * Xem trước mẫu email với các biến truyền vào
   */
  previewEmail(template: EmailTemplate, variables: Record<string, string>): { subject: string; bodyHtml: string } {
    let finalSubject = template.subject;
    let finalHtml = template.bodyHtml;

    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      finalSubject = finalSubject.replace(regex, val || '');
      finalHtml = finalHtml.replace(regex, val || '');
    });

    return { subject: finalSubject, bodyHtml: finalHtml };
  },

  /**
   * Xóa log gửi email
   */
  async deleteLog(logId: string): Promise<ApiResponse<boolean>> {
    try {
      await portalQuery(`email_logs?id=eq.${logId}`, {
        method: 'DELETE',
      });
      return { success: true, statusCode: 200, message: 'Đã xóa bản ghi nhật ký', data: true };
    } catch (err) {
      console.error('[emailService] deleteLog error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi xóa nhật ký email', data: false };
    }
  },

  /**
   * Helper 1: Báo cáo tiến độ học tập & thời gian còn lại (định kỳ hàng tháng)
   */
  async sendMonthlyProgressEmail(params: {
    recipientEmail: string;
    studentName: string;
    courseName: string;
    studentCode: string;
    daysLeft: number;
    validUntilDate: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    attendedSessions: number;
  }): Promise<ApiResponse<boolean>> {
    return this.sendEmail({
      recipientEmail: params.recipientEmail,
      recipientName: params.studentName,
      templateId: 'ENROLLMENT_PROGRESS_MONTHLY',
      variables: {
        student_name: params.studentName,
        course_name: params.courseName,
        student_code: params.studentCode,
        days_left: String(params.daysLeft),
        valid_until_date: params.validUntilDate,
        progress_percent: String(params.progressPercent),
        completed_lessons: String(params.completedLessons),
        total_lessons: String(params.totalLessons),
        attended_sessions: String(params.attendedSessions),
      },
      metadata: { type: 'MONTHLY_PROGRESS', studentCode: params.studentCode },
    });
  },

  /**
   * Helper 2: Cảnh báo sắp hết hạn khóa học (30 ngày & 7 ngày)
   */
  async sendExpiryWarningEmail(params: {
    recipientEmail: string;
    studentName: string;
    courseName: string;
    studentCode: string;
    daysLeft: number;
    validUntilDate: string;
  }): Promise<ApiResponse<boolean>> {
    return this.sendEmail({
      recipientEmail: params.recipientEmail,
      recipientName: params.studentName,
      templateId: 'ENROLLMENT_EXPIRY_WARNING',
      variables: {
        student_name: params.studentName,
        course_name: params.courseName,
        student_code: params.studentCode,
        days_left: String(params.daysLeft),
        valid_until_date: params.validUntilDate,
        exams_pending: 'Kỳ thi Trắc nghiệm Lý thuyết & Sát hạch Thực hành Lâm sàng',
        hotline: '096.7786.399',
        portal_link: 'https://mldvietnam.edu.vn',
      },
      metadata: { type: 'EXPIRY_WARNING', daysLeft: params.daysLeft, studentCode: params.studentCode },
    });
  },

  /**
   * Helper 3: Thông báo lịch học thực hành lâm sàng & nhắc lịch trước 24 giờ
   */
  async sendPracticeScheduleEmail(params: {
    recipientEmail: string;
    studentName: string;
    batchCode: string;
    sessionTopic: string;
    sessionDate: string;
    sessionTime: string;
    roomName: string;
    instructorName: string;
    branchAddress: string;
  }): Promise<ApiResponse<boolean>> {
    return this.sendEmail({
      recipientEmail: params.recipientEmail,
      recipientName: params.studentName,
      templateId: 'PRACTICE_SCHEDULE_ANNOUNCEMENT',
      variables: {
        student_name: params.studentName,
        batch_code: params.batchCode,
        session_topic: params.sessionTopic,
        session_date: params.sessionDate,
        session_time: params.sessionTime,
        room_name: params.roomName,
        instructor_name: params.instructorName,
        branch_address: params.branchAddress,
        requirements: 'Đồng phục MLD, móng tay cắt ngắn, tập giáo trình lâm sàng Vodder',
      },
      metadata: { type: 'PRACTICE_SCHEDULE', batchCode: params.batchCode, sessionDate: params.sessionDate },
    });
  },
};
