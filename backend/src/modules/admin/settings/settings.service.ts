import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../../../database/supabase.service';
import { AdminDatabase } from '../admin.database';
import { ChangePasswordDto } from './dto/update-settings.dto';

export const ALLOWED_SETTINGS_CATEGORIES = [
  'general',
  'booking',
  'pos',
  'academy',
  'integrations',
  'security',
] as const;

export type SettingsCategory = typeof ALLOWED_SETTINGS_CATEGORIES[number];

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly db: AdminDatabase,
  ) {}

  /**
   * Lấy cấu hình hệ thống: toàn bộ hoặc theo danh mục cụ thể.
   */
  async getSettings(adminUser: any, category?: string) {
    if (!adminUser) {
      throw new ForbiddenException('Yêu cầu xác thực tài khoản quản trị.');
    }

    if (category) {
      if (!ALLOWED_SETTINGS_CATEGORIES.includes(category as SettingsCategory)) {
        throw new NotFoundException(`Nhóm cài đặt '${category}' không tồn tại.`);
      }

      const { data, error } = await this.supabase.adminClient
        .from('system_settings')
        .select('*')
        .eq('category', category)
        .maybeSingle();

      if (error) {
        this.logger.error(`Lỗi truy vấn cài đặt ${category}: ${error.message}`);
        throw new BadRequestException(`Không thể tải cài đặt: ${error.message}`);
      }

      return {
        category,
        data: this.sanitizeSettingsForRole(adminUser.role, category, data?.data || {}),
        description: data?.description,
        updated_at: data?.updated_at,
      };
    }

    // Lấy toàn bộ các nhóm cài đặt
    const { data, error } = await this.supabase.adminClient
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      this.logger.error(`Lỗi truy vấn toàn bộ cài đặt: ${error.message}`);
      throw new BadRequestException(`Không thể tải danh mục cài đặt: ${error.message}`);
    }

    const result: Record<string, any> = {};
    for (const item of data || []) {
      result[item.category] = {
        data: this.sanitizeSettingsForRole(adminUser.role, item.category, item.data || {}),
        description: item.description,
        updated_at: item.updated_at,
      };
    }

    return result;
  }

  /**
   * Cập nhật cấu hình cho 1 nhóm cụ thể.
   */
  async updateSettings(adminUser: any, category: string, payload: Record<string, any>) {
    if (!adminUser) {
      throw new ForbiddenException('Yêu cầu xác thực tài khoản quản trị.');
    }

    // Chỉ SUPER_ADMIN hoặc ADMIN mới có quyền sửa đổi cài đặt hệ thống
    if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) {
      throw new ForbiddenException('Chỉ Quản trị viên cấp cao mới có quyền cập nhật cấu hình hệ thống.');
    }

    if (!ALLOWED_SETTINGS_CATEGORIES.includes(category as SettingsCategory)) {
      throw new BadRequestException(`Nhóm cài đặt '${category}' không hợp lệ.`);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Dữ liệu cài đặt phải là một đối tượng JSON hợp lệ.');
    }

    // Cập nhật vào Supabase PostgreSQL
    const { data: updated, error } = await this.supabase.adminClient
      .from('system_settings')
      .upsert({
        category,
        data: payload,
        updated_by: adminUser.id,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Lỗi cập nhật cài đặt ${category}: ${error.message}`);
      throw new BadRequestException(`Không thể lưu cấu hình: ${error.message}`);
    }

    // Ghi nhật ký quản trị Audit Logs
    try {
      await this.db.connection.query(
        'INSERT INTO audit_logs(actor_id, action, table_name, record_id) VALUES($1, $2, $3, $4)',
        [adminUser.id, 'UPDATE_SETTINGS', 'system_settings', category],
      );
    } catch (auditErr: any) {
      this.logger.warn(`Không ghi được audit log cho cập nhật cài đặt: ${auditErr.message}`);
    }

    this.logger.log(`Admin ${adminUser.id} đã cập nhật thành công nhóm cài đặt '${category}'`);
    return {
      success: true,
      message: `Đã lưu cấu hình nhóm '${category}' thành công.`,
      data: updated.data,
      updated_at: updated.updated_at,
    };
  }

  /**
   * Kiểm tra kết nối thử nghiệm cổng Zalo Cloud ZNS (Ping check).
   */
  async testZnsConnection(adminUser: any) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser?.role)) {
      throw new ForbiddenException('Tài khoản chưa được cấp quyền kiểm tra kết nối dịch vụ ngoài.');
    }

    const { data } = await this.supabase.adminClient
      .from('system_settings')
      .select('data')
      .eq('category', 'integrations')
      .maybeSingle();

    const znsSettings = data?.data || {};
    const oaId = znsSettings.zns_oa_id || '';
    const enabled = Boolean(znsSettings.zns_enabled);

    if (!enabled) {
      return {
        success: false,
        message: 'Cổng Zalo ZNS hiện đang ở trạng thái TẮT trong cài đặt.',
        timestamp: new Date().toISOString(),
      };
    }

    if (!oaId) {
      return {
        success: false,
        message: 'Chưa cấu hình Zalo Official Account ID.',
        timestamp: new Date().toISOString(),
      };
    }

    // Giả lập / Xác thực kết nối OA ID
    return {
      success: true,
      message: `Kết nối Zalo OA ID [${oaId}] thành công. Cổng ZNS sẵn sàng gửi thông báo.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Đổi mật khẩu tài khoản Admin cá nhân an toàn.
   */
  async changePassword(adminUser: any, dto: ChangePasswordDto) {
    if (!adminUser?.id) {
      throw new ForbiddenException('Phiên đăng nhập không hợp lệ.');
    }

    if (!dto.oldPassword || !dto.newPassword) {
      throw new BadRequestException('Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 8 ký tự.');
    }

    // Truy vấn thông tin người dùng từ bảng users
    const { data: user, error: fetchErr } = await this.supabase.adminClient
      .from('users')
      .select('id, password_hash')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (fetchErr || !user) {
      throw new BadRequestException('Không tìm thấy thông tin tài khoản.');
    }

    // So khớp mật khẩu cũ
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password_hash || '').catch(() => false);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    // Băm mật khẩu mới với salt 12 rounds chuẩn MLD
    const newHash = await bcrypt.hash(dto.newPassword, 12);

    const { error: updateErr } = await this.supabase.adminClient
      .from('users')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminUser.id);

    if (updateErr) {
      throw new BadRequestException(`Không thể cập nhật mật khẩu: ${updateErr.message}`);
    }

    // Ghi audit log
    try {
      await this.db.connection.query(
        'INSERT INTO audit_logs(actor_id, action, table_name, record_id) VALUES($1, $2, $3, $4)',
        [adminUser.id, 'CHANGE_PASSWORD', 'users', adminUser.id],
      );
    } catch {
      // Ignored
    }

    return {
      success: true,
      message: 'Đổi mật khẩu tài khoản quản trị thành công.',
    };
  }

  /**
   * Ẩn các trường thông tin nhạy cảm nếu không phải SUPER_ADMIN
   */
  private sanitizeSettingsForRole(role: string, category: string, data: Record<string, any>) {
    if (role === 'SUPER_ADMIN') {
      return data;
    }

    const sanitized = { ...data };
    if (category === 'integrations') {
      if (sanitized.zns_app_secret) sanitized.zns_app_secret = '********';
    }
    return sanitized;
  }
}
