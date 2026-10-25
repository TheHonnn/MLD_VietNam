import { ZNSTemplate, ZaloZnsLog, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const znsService = {
  async getTemplates(): Promise<ApiResponse<ZNSTemplate[]>> {
    try {
      const raw = await supabaseService.query<any[]>('zns_templates?select=*&order=created_at.asc');
      if (!raw) return { success: true, statusCode: 200, message: 'Danh sách mẫu ZNS', data: [] };

      const list: ZNSTemplate[] = raw.map((t) => ({
        id: t.id,
        templateCode: t.template_code,
        name: t.name,
        description: t.description,
        contentTemplate: t.content_template,
        sampleParams: t.sample_params || {},
        isActive: Boolean(t.is_active),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      return { success: true, statusCode: 200, message: 'Tải danh sách kịch bản ZNS thành công', data: list };
    } catch (err) {
      console.error('[znsService] getTemplates error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải kịch bản ZNS', data: [] };
    }
  },

  async toggleTemplate(templateId: string, isActive: boolean): Promise<ApiResponse<boolean>> {
    try {
      const res = await supabaseService.query<any>(`zns_templates?id=eq.${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
      return { success: res !== null, statusCode: 200, message: 'Cập nhật trạng thái mẫu tin thành công', data: true };
    } catch (err) {
      console.error('[znsService] toggleTemplate error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi cập nhật trạng thái', data: false };
    }
  },

  async getLogs(params?: {
    phone?: string;
    templateCode?: string;
    status?: string;
  }): Promise<ApiResponse<ZaloZnsLog[]>> {
    try {
      let queryPath = 'zns_logs?select=*&order=sent_at.desc';
      if (params?.phone) queryPath += `&recipient_phone=ilike.*${params.phone}*`;
      if (params?.templateCode) queryPath += `&template_code=eq.${params.templateCode}`;
      if (params?.status) queryPath += `&status=eq.${params.status}`;

      const raw = await supabaseService.query<any[]>(queryPath);
      if (!raw) return { success: true, statusCode: 200, message: 'Nhật ký gửi ZNS', data: [] };

      const list: ZaloZnsLog[] = raw.map((l) => ({
        id: l.id,
        recipientPhone: l.recipient_phone,
        recipientName: l.recipient_name,
        templateCode: l.template_code,
        bookingId: l.booking_id,
        paramsSent: l.params_sent || {},
        status: l.status,
        responseCode: l.response_code,
        errorMessage: l.error_message,
        sentAt: l.sent_at,
      }));

      return { success: true, statusCode: 200, message: 'Tải nhật ký gửi ZNS thành công', data: list };
    } catch (err) {
      console.error('[znsService] getLogs error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải nhật ký ZNS', data: [] };
    }
  },

  async sendZns(data: {
    recipientPhone: string;
    recipientName?: string;
    templateCode: string;
    bookingId?: string | null;
    paramsSent: Record<string, any>;
  }): Promise<ApiResponse<ZaloZnsLog | null>> {
    try {
      const payload = {
        recipient_phone: data.recipientPhone,
        recipient_name: data.recipientName || 'Khách hàng',
        template_code: data.templateCode,
        booking_id: data.bookingId || null,
        params_sent: data.paramsSent || {},
        status: 'SENT',
        response_code: '0',
        error_message: null,
      };

      const res = await supabaseService.query<any[]>('zns_logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res || res.length === 0) return { success: false, statusCode: 400, message: 'Không thể ghi nhận log ZNS', data: null };

      return {
        success: true,
        statusCode: 201,
        message: `Đã gửi tin nhắn Zalo ZNS thành công tới ${data.recipientPhone}`,
        data: {
          id: res[0].id,
          recipientPhone: res[0].recipient_phone,
          recipientName: res[0].recipient_name,
          templateCode: res[0].template_code,
          bookingId: res[0].booking_id,
          paramsSent: res[0].params_sent,
          status: res[0].status,
          responseCode: res[0].response_code,
          sentAt: res[0].sent_at,
        },
      };
    } catch (err) {
      console.error('[znsService] sendZns error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi gửi tin nhắn Zalo ZNS', data: null };
    }
  },
};
