import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGeneralSettingsDto {
  @ApiProperty({ description: 'Tên đầy đủ của doanh nghiệp', example: 'CÔNG TY CỔ PHẦN CHĂM SÓC SỨC KHỎE MLD VIỆT NAM' })
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @ApiProperty({ description: 'Tên viết tắt thương hiệu', example: 'MLD Healthcare & Spa' })
  @IsString()
  @IsNotEmpty()
  short_name: string;

  @ApiProperty({ description: 'Mã số thuế doanh nghiệp', example: '0318889999' })
  @IsString()
  @Matches(/^[0-9]{10}(-[0-9]{3})?$/, { message: 'Mã số thuế phải gồm 10 hoặc 13 chữ số hợp lệ' })
  tax_code: string;

  @ApiProperty({ description: 'Số hotline chăm sóc khách hàng', example: '1900 8888' })
  @IsString()
  @IsNotEmpty()
  hotline: string;

  @ApiProperty({ description: 'Email liên hệ chính thức', example: 'contact@mldvietnam.vn' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  email: string;

  @ApiProperty({ description: 'Website chính thức', example: 'https://mldvietnam.vn' })
  @IsString()
  website: string;

  @ApiProperty({ description: 'Địa chỉ trụ sở chính', example: 'Số 123 Đường Ba Tháng Hai, Phường 11, Quận 10, TP. Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty()
  headquarters_address: string;

  @ApiPropertyOptional({ description: 'Số giấy phép hoạt động y tế/spa', example: 'GPHĐ-08992/SYT-GCH' })
  @IsOptional()
  @IsString()
  operating_license?: string;
}

export class UpdateBookingSettingsDto {
  @ApiProperty({ description: 'Giờ mở cửa đón khách (HH:mm)', example: '08:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Giờ mở cửa phải có định dạng HH:mm (VD: 08:30)' })
  open_time: string;

  @ApiProperty({ description: 'Giờ đóng cửa (HH:mm)', example: '21:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Giờ đóng cửa phải có định dạng HH:mm (VD: 21:00)' })
  close_time: string;

  @ApiProperty({ description: 'Bước nhảy khung giờ hẹn (phút)', example: 30 })
  @IsInt()
  @Min(15)
  @Max(120)
  slot_duration_minutes: number;

  @ApiProperty({ description: 'Thời gian trễ tối đa trước khi ghi nhận NO_SHOW (phút)', example: 15 })
  @IsInt()
  @Min(0)
  @Max(60)
  max_late_minutes: number;

  @ApiProperty({ description: 'Khoảng đệm vệ sinh chuẩn bị phòng giữa 2 ca liên tiếp (phút)', example: 10 })
  @IsInt()
  @Min(0)
  @Max(60)
  buffer_time_minutes: number;

  @ApiProperty({ description: 'Cho phép khách chọn đích danh KTV khi đặt hẹn', example: true })
  @IsBoolean()
  allow_pick_technician: boolean;

  @ApiProperty({ description: 'Thời hạn tối thiểu trước giờ hẹn được hủy miễn phí (giờ)', example: 2 })
  @IsInt()
  @Min(0)
  @Max(72)
  cancel_deadline_hours: number;

  @ApiProperty({ description: 'Số lần hủy hẹn tối đa trong 1 tháng trước khi tạm khóa tính năng tự đặt', example: 3 })
  @IsInt()
  @Min(1)
  @Max(20)
  max_monthly_cancellations: number;
}

export class UpdatePosSettingsDto {
  @ApiProperty({ description: 'Đơn vị tiền tệ hiển thị', example: 'VND' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Bật phương thức thanh toán Tiền mặt', example: true })
  @IsBoolean()
  enable_cash: boolean;

  @ApiProperty({ description: 'Bật phương thức Chuyển khoản VietQR', example: true })
  @IsBoolean()
  enable_vietqr: boolean;

  @ApiProperty({ description: 'Bật thanh toán quẹt thẻ máy POS', example: true })
  @IsBoolean()
  enable_card_pos: boolean;

  @ApiProperty({ description: 'Bật thanh toán trừ gói liệu trình đã mua', example: true })
  @IsBoolean()
  enable_treatment_wallet: boolean;

  @ApiProperty({ description: 'Bật tiêu điểm tích lũy', example: true })
  @IsBoolean()
  enable_loyalty_points: boolean;

  @ApiProperty({ description: 'Bắt buộc nhập lý do khi giảm giá thủ công', example: true })
  @IsBoolean()
  require_discount_reason: boolean;

  @ApiProperty({ description: 'Tiêu đề đầu hóa đơn in nhiệt 80mm', example: 'MLD HEALTHCARE & SPA - TRỊ LIỆU DẪN LƯU BẠCH HUYẾT' })
  @IsString()
  receipt_header_text: string;

  @ApiProperty({ description: 'Lời nhắn cuối biên lai in nhiệt', example: 'Cảm ơn Quý khách đã tin tưởng dịch vụ MLD. Chúc Quý khách có một ngày thư thái!' })
  @IsString()
  receipt_footer_note: string;

  @ApiProperty({ description: 'Tự động mở hộp thoại in khi hoàn tất thanh toán', example: true })
  @IsBoolean()
  auto_print_receipt_on_payment: boolean;
}

export class UpdateAcademySettingsDto {
  @ApiProperty({ description: 'Tỷ lệ điểm danh tối thiểu để đủ điều kiện thi (%)', example: 80 })
  @IsInt()
  @Min(50)
  @Max(100)
  min_attendance_percent_to_graduate: number;

  @ApiProperty({ description: 'Số buổi vắng tối đa cho phép', example: 3 })
  @IsInt()
  @Min(0)
  @Max(20)
  max_allowed_absences: number;

  @ApiProperty({ description: 'Điểm trắc nghiệm đạt chuẩn (thang điểm 100)', example: 80 })
  @IsInt()
  @Min(50)
  @Max(100)
  min_quiz_passing_score: number;

  @ApiProperty({ description: 'Số lần thi lại trắc nghiệm tối đa', example: 2 })
  @IsInt()
  @Min(0)
  @Max(10)
  max_quiz_retakes: number;

  @ApiProperty({ description: 'Chức danh người ký trên chứng chỉ', example: 'GIÁM ĐỐC ĐÀO TẠO HỌC VIỆN' })
  @IsString()
  @IsNotEmpty()
  certificate_signer_title: string;

  @ApiProperty({ description: 'Tiền tố mã chứng chỉ', example: 'MLD-CERT' })
  @IsString()
  @IsNotEmpty()
  certificate_code_prefix: string;
}

export class UpdateIntegrationsSettingsDto {
  @ApiProperty({ description: 'Kích hoạt cổng Zalo Cloud ZNS', example: false })
  @IsBoolean()
  zns_enabled: boolean;

  @ApiPropertyOptional({ description: 'Zalo Official Account ID', example: '1424469774232439257' })
  @IsOptional()
  @IsString()
  zns_oa_id?: string;

  @ApiPropertyOptional({ description: 'Zalo App ID', example: '' })
  @IsOptional()
  @IsString()
  zns_app_id?: string;

  @ApiProperty({ description: 'Nhà cung cấp lưu trữ đám mây', example: 'supabase' })
  @IsString()
  cloud_storage_provider: string;

  @ApiProperty({ description: 'Tên bucket lưu trữ tài liệu', example: 'documents' })
  @IsString()
  cloud_storage_bucket: string;

  @ApiProperty({ description: 'Cổng gửi tin SMS OTP', example: 'disabled' })
  @IsString()
  sms_otp_provider: string;
}

export class UpdateSecuritySettingsDto {
  @ApiProperty({ description: 'Độ dài mật khẩu tối thiểu cho tài khoản admin', example: 8 })
  @IsInt()
  @Min(6)
  @Max(32)
  min_password_length: number;

  @ApiProperty({ description: 'Bắt buộc có ký tự đặc biệt hoặc chữ số', example: true })
  @IsBoolean()
  require_special_char: boolean;

  @ApiProperty({ description: 'Thời gian hết hạn phiên làm việc (phút)', example: 240 })
  @IsInt()
  @Min(15)
  @Max(1440)
  session_timeout_minutes: number;

  @ApiProperty({ description: 'Số lần thử đăng nhập sai tối đa trước khi khóa', example: 5 })
  @IsInt()
  @Min(3)
  @Max(10)
  max_login_attempts: number;

  @ApiProperty({ description: 'Ghi nhật ký audit logs cho mọi hành động nhạy cảm', example: true })
  @IsBoolean()
  enable_audit_logging: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại', example: 'MatKhauCu123!' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: 'Mật khẩu mới (tối thiểu 8 ký tự)', example: 'MatKhauMoi456!' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có tối thiểu 8 ký tự' })
  newPassword: string;
}
