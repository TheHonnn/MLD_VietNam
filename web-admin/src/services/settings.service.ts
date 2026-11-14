import { adminApi, adminCommand } from '../admin/api';
import { getAdminAuthToken, getSupabaseHeaders, SUPABASE_URL } from './supabaseClient';

export interface CompanySettings {
  company_name: string;
  short_name: string;
  tax_code: string;
  hotline: string;
  email: string;
  website: string;
  headquarters_address: string;
  operating_license?: string;
}

export interface BookingSettings {
  open_time: string;
  close_time: string;
  slot_duration_minutes: number;
  max_late_minutes: number;
  buffer_time_minutes: number;
  allow_pick_technician: boolean;
  cancel_deadline_hours: number;
  max_monthly_cancellations: number;
}

export interface PosSettings {
  currency: string;
  enable_cash: boolean;
  enable_vietqr: boolean;
  enable_card_pos: boolean;
  enable_treatment_wallet: boolean;
  enable_loyalty_points: boolean;
  require_discount_reason: boolean;
  receipt_header_text: string;
  receipt_footer_note: string;
  auto_print_receipt_on_payment: boolean;
}

export interface AcademySettings {
  min_attendance_percent_to_graduate: number;
  max_allowed_absences: number;
  min_quiz_passing_score: number;
  max_quiz_retakes: number;
  certificate_signer_title: string;
  certificate_code_prefix: string;
}

export interface IntegrationsSettings {
  zns_enabled: boolean;
  zns_oa_id: string;
  zns_app_id?: string;
  cloud_storage_provider: string;
  cloud_storage_bucket: string;
  sms_otp_provider: string;
}

export interface SecuritySettings {
  min_password_length: number;
  require_special_char: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  enable_audit_logging: boolean;
}

export interface SystemSettingsState {
  general: CompanySettings;
  booking: BookingSettings;
  pos: PosSettings;
  academy: AcademySettings;
  integrations: IntegrationsSettings;
  security: SecuritySettings;
}

export interface SettingsCategoryItem<T = any> {
  data: T;
  description?: string;
  updated_at?: string;
}

export type AllSettingsResponse = Record<string, SettingsCategoryItem>;

export const DEFAULT_SETTINGS_STATE: SystemSettingsState = {
  general: {
    company_name: 'CÔNG TY CỔ PHẦN CHĂM SÓC SỨC KHỎE MLD VIỆT NAM',
    short_name: 'MLD Healthcare & Spa',
    tax_code: '0318889999',
    hotline: '1900 8888',
    email: 'contact@mldvietnam.vn',
    website: 'https://mldvietnam.vn',
    headquarters_address: 'Số 123 Đường Ba Tháng Hai, Phường 11, Quận 10, TP. Hồ Chí Minh',
    operating_license: 'GPHĐ-08992/SYT-GCH',
  },
  booking: {
    open_time: '08:30',
    close_time: '21:00',
    slot_duration_minutes: 30,
    max_late_minutes: 15,
    buffer_time_minutes: 10,
    allow_pick_technician: true,
    cancel_deadline_hours: 2,
    max_monthly_cancellations: 3,
  },
  pos: {
    currency: 'VND',
    enable_cash: true,
    enable_vietqr: true,
    enable_card_pos: true,
    enable_treatment_wallet: true,
    enable_loyalty_points: true,
    require_discount_reason: true,
    receipt_header_text: 'MLD HEALTHCARE & SPA - TRỊ LIỆU DẪN LƯU BẠCH HUYẾT',
    receipt_footer_note: 'Cảm ơn Quý khách đã tin tưởng dịch vụ MLD. Chúc Quý khách có một ngày thư thái!',
    auto_print_receipt_on_payment: true,
  },
  academy: {
    min_attendance_percent_to_graduate: 80,
    max_allowed_absences: 3,
    min_quiz_passing_score: 80,
    max_quiz_retakes: 2,
    certificate_signer_title: 'GIÁM ĐỐC ĐÀO TẠO HỌC VIỆN',
    certificate_code_prefix: 'MLD-CERT',
  },
  integrations: {
    zns_enabled: false,
    zns_oa_id: '',
    zns_app_id: '',
    cloud_storage_provider: 'supabase',
    cloud_storage_bucket: 'documents',
    sms_otp_provider: 'disabled',
  },
  security: {
    min_password_length: 8,
    require_special_char: true,
    session_timeout_minutes: 240,
    max_login_attempts: 5,
    enable_audit_logging: true,
  },
};

export const settingsService = {
  /**
   * Tải toàn bộ cấu hình hệ thống từ backend / Supabase
   */
  async getAllSettings(signal?: AbortSignal, role?: string): Promise<AllSettingsResponse> {
    const deadline = AbortSignal.timeout(15000);
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
      const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
      if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && hostname !== 'localhost' && hostname !== '127.0.0.1' && getAdminAuthToken()) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_read_system_settings`, {
          headers: getSupabaseHeaders(),
          signal: requestSignal,
          cache: 'no-store',
        });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message || 'Không thể tải cài đặt hệ thống.');
        }
        return await response.json();
      }
      return await adminCommand<AllSettingsResponse>('settings', undefined, requestSignal);
    } catch (error) {
      if (deadline.aborted && !signal?.aborted) {
        throw new Error('Máy chủ phản hồi chậm. Vui lòng tải lại cài đặt.');
      }
      throw error;
    }
  },

  /**
   * Lấy cấu hình theo nhóm chuyên biệt
   */
  async getSettingsByCategory<T>(category: string, signal?: AbortSignal): Promise<T> {
    const res = await adminApi<{ data: T }>(`settings/${category}`, undefined, signal);
    return res?.data || (DEFAULT_SETTINGS_STATE as any)[category];
  },

  /**
   * Cập nhật cấu hình cho 1 nhóm
   */
  async updateSettings<T>(category: string, data: Partial<T>): Promise<{ success: boolean; message: string; data?: T }> {
    return adminCommand<{ success: boolean; message: string; data?: T }>(`settings/${category}/configuration`, { data });
  },

  /**
   * Kiểm tra kết nối Zalo Cloud ZNS thực tế
   */
  async testZnsConnection(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return adminCommand<{ success: boolean; message: string; timestamp: string }>('settings/test-zns', {});
  },

  /**
   * Đổi mật khẩu tài khoản quản trị viên cá nhân
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return adminCommand<{ success: boolean; message: string }>('settings/change-password', {
      oldPassword,
      newPassword,
    });
  },
};
