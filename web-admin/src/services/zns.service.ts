import { ZNSTemplate, ZaloZnsLog, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export interface ZaloCloudConfig {
  oaId: string;
  appId: string;
  appSecret: string;
  accessToken: string;
  refreshToken?: string;
  webhookUrl?: string;
  isLiveMode: boolean;
  expiresAt?: string;
}

export const znsService = {
  getZaloConfig(): ZaloCloudConfig {
    try {
      const saved = localStorage.getItem('mld_zalo_cloud_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Cannot read Zalo config from storage:', e);
    }
    return {
      oaId: '2849182390192830192',
      appId: '4928109283019283',
      appSecret: '',
      accessToken: '',
      refreshToken: '',
      webhookUrl: 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
      isLiveMode: false,
    };
  },

  async loadZaloConfigFromCloud(): Promise<ZaloCloudConfig> {
    try {
      const rows = await supabaseService.query<any[]>('zns_config?id=eq.default');
      if (rows && rows.length > 0) {
        const row = rows[0];
        const config: ZaloCloudConfig = {
          oaId: row.oa_id || '2849182390192830192',
          appId: row.app_id || '4928109283019283',
          appSecret: row.app_secret || '',
          accessToken: row.access_token || '',
          refreshToken: row.refresh_token || '',
          webhookUrl: 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
          isLiveMode: Boolean(row.access_token),
          expiresAt: row.expires_at,
        };
        this.saveZaloConfig(config);
        return config;
      }
    } catch (e) {
      console.warn('Error reading zns_config from Supabase:', e);
    }
    return this.getZaloConfig();
  },

  saveZaloConfig(config: ZaloCloudConfig): void {
    localStorage.setItem('mld_zalo_cloud_config', JSON.stringify(config));
    // Đồng bộ đồng thời lên Supabase Cloud
    try {
      supabaseService.query('zns_config?id=eq.default', {
        method: 'PATCH',
        body: JSON.stringify({
          oa_id: config.oaId,
          app_id: config.appId,
          app_secret: config.appSecret,
          access_token: config.accessToken,
          refresh_token: config.refreshToken,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch (_) {}
  },

  async refreshZaloToken(config?: ZaloCloudConfig): Promise<{ success: boolean; message: string; data?: any }> {
    const target = config || this.getZaloConfig();
    if (!target.appId || !target.appSecret || !target.refreshToken) {
      return {
        success: false,
        message: 'Vui lòng nhập đầy đủ App ID, App Secret và Refresh Token để làm mới Access Token.',
      };
    }

    try {
      const bodyParams = new URLSearchParams({
        refresh_token: target.refreshToken.trim(),
        app_id: target.appId.trim(),
        grant_type: 'refresh_token',
      });

      const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'secret_key': target.appSecret.trim(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await res.json();

      if (data.access_token) {
        const expiresInSeconds = Number(data.expires_in) || 90000;
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

        const updatedConfig: ZaloCloudConfig = {
          ...target,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || target.refreshToken,
          expiresAt,
        };

        this.saveZaloConfig(updatedConfig);

        return {
          success: true,
          message: `Làm mới Access Token thành công! Hiệu lực 25h (đến ${new Date(expiresAt).toLocaleTimeString('vi-VN')} ${new Date(expiresAt).toLocaleDateString('vi-VN')}).`,
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || target.refreshToken,
            expiresAt,
          },
        };
      } else {
        return {
          success: false,
          message: `Zalo Cloud báo lỗi ${data.error || 'ERROR'}: ${data.message || 'Không thể làm mới token.'}`,
          data,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Lỗi kết nối tới máy chủ Zalo OAuth: ${err.message}`,
      };
    }
  },

  async testZaloConnection(token?: string): Promise<{ success: boolean; message: string; details?: any }> {
    const activeToken = token || this.getZaloConfig().accessToken;
    if (!activeToken || !activeToken.trim()) {
      return {
        success: false,
        message: 'Chưa cấu hình Access Token. Vui lòng dán Access Token hợp lệ từ cổng Zalo for Developers.',
      };
    }
    try {
      const res = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
        method: 'GET',
        headers: {
          access_token: activeToken.trim(),
        },
      });
      const data = await res.json();
      if (data && data.error === 0) {
        return {
          success: true,
          message: `Kết nối Zalo OA thành công! Trang: ${data.data?.name || 'MLD Vietnam'} (OA ID: ${data.data?.oa_id || 'OK'})`,
          details: data.data,
        };
      } else {
        return {
          success: false,
          message: `Zalo Cloud trả về mã lỗi ${data.error}: ${data.message || 'Token không hợp lệ hoặc đã hết hạn.'}`,
          details: data,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Lỗi kết nối tới máy chủ Zalo Cloud: ${err.message}`,
      };
    }
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

  async sendZns(data: {
    recipientPhone: string;
    recipientName?: string;
    templateCode: string;
    bookingId?: string | null;
    paramsSent: Record<string, any>;
  }): Promise<ApiResponse<ZaloZnsLog | null>> {
    try {
      const config = this.getZaloConfig();
      let formattedPhone = data.recipientPhone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '84' + formattedPhone.slice(1);
      } else if (!formattedPhone.startsWith('84')) {
        formattedPhone = '84' + formattedPhone;
      }

      let znsStatus: 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';
      let znsResponseCode = '0';
      let znsErrorMessage: string | null = null;
      let apiResponseInfo = '';

      // Nếu đã có Zalo Access Token -> Thực hiện gọi trực tiếp Zalo OpenAPI chính thức
      if (config.accessToken && config.accessToken.trim()) {
        try {
          const zaloRes = await fetch('https://business.openapi.zalo.me/message/template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              access_token: config.accessToken.trim(),
            },
            body: JSON.stringify({
              phone: formattedPhone,
              template_id: data.templateCode,
              template_data: data.paramsSent,
              tracking_id: data.bookingId || `MLD_${Date.now()}`,
            }),
          });
          const zaloData = await zaloRes.json();
          if (zaloData.error === 0) {
            znsStatus = 'DELIVERED';
            znsResponseCode = '0';
            apiResponseInfo = `Zalo Cloud OpenAPI xác nhận gửi thành công (ID: ${zaloData.data?.msg_id || 'OK'})`;
          } else {
            znsStatus = 'FAILED';
            znsResponseCode = String(zaloData.error);
            znsErrorMessage = zaloData.message || 'Lỗi gửi tin từ Zalo OpenAPI';
          }
        } catch (fetchErr: any) {
          znsStatus = 'FAILED';
          znsResponseCode = 'NETWORK_ERROR';
          znsErrorMessage = `Lỗi mạng khi kết nối Zalo Cloud API: ${fetchErr.message}`;
        }
      } else {
        // Chưa có Access Token -> Lưu log sẵn sàng và hướng dẫn quản trị viên
        znsStatus = 'SENT';
        znsResponseCode = 'PENDING_CONFIG';
        znsErrorMessage = 'Chờ cấu hình Zalo OA Access Token chính thức tại Tab Cấu hình Cổng';
        apiResponseInfo = 'Đã lưu lịch sử gửi tin. Sẵn sàng truyền tin Zalo Cloud khi nạp Access Token.';
      }

      const payload = {
        recipient_phone: data.recipientPhone,
        recipient_name: data.recipientName || 'Khách hàng',
        template_code: data.templateCode,
        booking_id: data.bookingId || null,
        params_sent: data.paramsSent || {},
        status: znsStatus,
        response_code: znsResponseCode,
        error_message: znsErrorMessage,
      };

      const res = await supabaseService.query<any[]>('zns_logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res || res.length === 0) {
        return { success: false, statusCode: 400, message: 'Không thể ghi nhận log ZNS', data: null };
      }

      return {
        success: znsStatus !== 'FAILED',
        statusCode: znsStatus === 'FAILED' ? 400 : 201,
        message:
          znsStatus === 'DELIVERED'
            ? `Đã gửi tin nhắn Zalo ZNS thành công tới ${data.recipientPhone} (${apiResponseInfo})`
            : znsStatus === 'FAILED'
            ? `Gửi tin ZNS thất bại: ${znsErrorMessage}`
            : `Đã tiếp nhận yêu cầu gửi ZNS tới ${data.recipientPhone} (${apiResponseInfo})`,
        data: {
          id: res[0].id,
          recipientPhone: res[0].recipient_phone,
          recipientName: res[0].recipient_name,
          templateCode: res[0].template_code,
          bookingId: res[0].booking_id,
          paramsSent: res[0].params_sent,
          status: res[0].status,
          responseCode: res[0].response_code,
          errorMessage: res[0].error_message,
          sentAt: res[0].sent_at,
        },
      };
    } catch (err: any) {
      console.error('[znsService] sendZns error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi gửi tin nhắn Zalo ZNS', data: null };
    }
  },
};
