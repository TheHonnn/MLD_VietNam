import { ZNSTemplate, ZaloZnsLog, ApiResponse } from '../types/shared_types';
import { adminApi, adminCommand } from '../admin/api';

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
      const row = await adminApi<any>('zalo/cloud-config');
      if (row && typeof row === 'object') {
        const config: ZaloCloudConfig = {
          oaId: row.oaId || row.oa_id || '2849182390192830192',
          appId: row.appId || row.app_id || '4928109283019283',
          appSecret: row.appSecret || row.app_secret || '',
          accessToken: row.accessToken || row.access_token || '',
          refreshToken: row.refreshToken || row.refresh_token || '',
          webhookUrl: row.webhookUrl || row.webhook_url || 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
          isLiveMode: Boolean(row.accessToken || row.access_token || row.isLiveMode),
          expiresAt: row.expiresAt || row.expires_at,
        };
        localStorage.setItem('mld_zalo_cloud_config', JSON.stringify(config));
        return config;
      }
    } catch (_) {}
    return this.getZaloConfig();
  },

  saveZaloConfig(config: ZaloCloudConfig): void {
    localStorage.setItem('mld_zalo_cloud_config', JSON.stringify(config));
    try {
      adminCommand('zalo/cloud-config', {
        oaId: config.oaId,
        appId: config.appId,
        appSecret: config.appSecret,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: config.expiresAt || null,
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
          secret_key: target.appSecret.trim(),
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
      const raw = await adminApi<any[]>('zalo/templates');
      if (!Array.isArray(raw)) return { success: true, statusCode: 200, message: 'Danh sách mẫu ZNS', data: [] };

      const list: ZNSTemplate[] = raw.map((t) => ({
        id: t.id,
        templateCode: t.template_code || t.templateCode,
        name: t.name,
        description: t.description,
        contentTemplate: t.content_template || t.contentTemplate,
        sampleParams: t.sample_params || t.sampleParams || {},
        isActive: Boolean(t.is_active ?? t.isActive),
        createdAt: t.created_at || t.createdAt,
        updatedAt: t.updated_at || t.updatedAt,
      }));

      return { success: true, statusCode: 200, message: 'Tải danh sách kịch bản ZNS thành công', data: list };
    } catch (_) {
      return { success: true, statusCode: 200, message: 'Danh sách mẫu ZNS', data: [] };
    }
  },

  async toggleTemplate(templateId: string, isActive: boolean): Promise<ApiResponse<boolean>> {
    try {
      await adminCommand('zalo/templates/toggle', { id: templateId, isActive });
      return { success: true, statusCode: 200, message: 'Cập nhật trạng thái mẫu tin thành công', data: true };
    } catch (_) {
      return { success: false, statusCode: 500, message: 'Lỗi cập nhật trạng thái', data: false };
    }
  },

  async getLogs(params?: {
    phone?: string;
    templateCode?: string;
    status?: string;
  }): Promise<ApiResponse<ZaloZnsLog[]>> {
    try {
      const raw = await adminApi<any[]>('zalo/logs');
      if (!Array.isArray(raw)) return { success: true, statusCode: 200, message: 'Nhật ký gửi ZNS', data: [] };

      let list: ZaloZnsLog[] = raw.map((l) => ({
        id: l.id,
        recipientPhone: l.recipient_phone || l.recipientPhone,
        recipientName: l.recipient_name || l.recipientName,
        templateCode: l.template_code || l.templateCode,
        bookingId: l.booking_id || l.bookingId,
        paramsSent: l.params_sent || l.paramsSent || {},
        status: l.status,
        responseCode: l.response_code || l.responseCode,
        errorMessage: l.error_message || l.errorMessage,
        sentAt: l.sent_at || l.sentAt,
      }));

      if (params?.phone) {
        const kw = params.phone.toLowerCase();
        list = list.filter((l) => (l.recipientPhone || '').toLowerCase().includes(kw));
      }
      if (params?.templateCode) {
        list = list.filter((l) => l.templateCode === params.templateCode);
      }
      if (params?.status) {
        list = list.filter((l) => l.status === params.status);
      }

      return { success: true, statusCode: 200, message: 'Tải nhật ký gửi ZNS thành công', data: list };
    } catch (_) {
      return { success: true, statusCode: 200, message: 'Nhật ký gửi ZNS', data: [] };
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

      const res = await adminCommand<any[]>('zalo/logs', payload);

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
    } catch (_) {
      return { success: false, statusCode: 500, message: 'Lỗi gửi tin nhắn Zalo ZNS', data: null };
    }
  },
};
