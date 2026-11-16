import { adminCommand } from '../admin/api';
import { ZNSTemplate, ZaloZnsLog, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const znsService = {
  getGatewayStatus() {
    return adminCommand<{ tokenConfigured: boolean; templateConfigured: boolean; testPhoneConfigured: boolean }>('zalo/status');
  },

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

  async sendTest(data: {
    recipientPhone: string;
    templateCode: string;
    paramsSent: Record<string, unknown>;
  }): Promise<ApiResponse<{ messageId: string; trackingId: string } | null>> {
    try {
      const receipt = await adminCommand<{ messageId: string; trackingId: string }>('zalo/test', data);
      if (!receipt?.messageId) throw new Error('Phản hồi chưa có mã tin từ Zalo.');
      return { success: true, statusCode: 200, message: 'Zalo đã tiếp nhận yêu cầu.', data: receipt };
    } catch (error) {
      return {
        success: false, statusCode: 400, data: null,
        message: error instanceof Error ? error.message : 'Không thể gửi thử Zalo.',
      };
    }
  },
};
