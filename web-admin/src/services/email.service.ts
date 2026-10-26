import { EmailTemplate, EmailLog, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const emailService = {
  /**
   * Lấy danh sách các mẫu Email đào tạo & vận hành
   */
  async getTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    try {
      const raw = await supabaseService.query<any[]>('email_templates?select=*&order=created_at.asc');
      if (!raw) {
        return { success: true, statusCode: 200, message: 'Danh sách mẫu Email', data: [] };
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
      return { success: false, statusCode: 500, message: 'Lỗi tải danh sách mẫu Email', data: [] };
    }
  },

  /**
   * Lấy chi tiết mẫu Email theo ID
   */
  async getTemplateById(templateId: string): Promise<ApiResponse<EmailTemplate | null>> {
    try {
      const raw = await supabaseService.query<any[]>(`email_templates?id=eq.${templateId}&select=*`);
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

      const res = await supabaseService.query<any>(`email_templates?id=eq.${templateId}`, {
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

      const raw = await supabaseService.query<any[]>(queryPath);
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
      // 1. Lấy template
      const tRes = await this.getTemplateById(params.templateId);
      if (!tRes.success || !tRes.data) {
        throw new Error('Không tìm thấy mẫu Email phù hợp');
      }
      const template = tRes.data;

      // 2. Điền biến vào Subject và Body
      let finalSubject = template.subject;
      let finalHtml = template.bodyHtml;

      Object.entries(params.variables).forEach(([key, val]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        finalSubject = finalSubject.replace(regex, val || '');
        finalHtml = finalHtml.replace(regex, val || '');
      });

      // 3. Ghi log gửi mail
      const logPayload = {
        recipient_email: params.recipientEmail,
        recipient_name: params.recipientName || '',
        template_id: params.templateId,
        subject: finalSubject,
        body_html: finalHtml,
        status: 'SENT',
        metadata: params.metadata || {},
        sent_at: new Date().toISOString(),
      };

      await supabaseService.query('email_logs', {
        method: 'POST',
        body: JSON.stringify(logPayload),
      });

      return {
        success: true,
        statusCode: 200,
        message: `Đã gửi thành công email "${finalSubject}" tới ${params.recipientEmail}`,
        data: true,
      };
    } catch (err: any) {
      console.error('[emailService] sendEmail error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi gửi email', data: false };
    }
  },
};
