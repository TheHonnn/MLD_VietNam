import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại tài khoản đăng nhập/đăng ký',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP ngẫu nhiên gồm 6 chữ số đã gửi qua SMS',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    required: false,
    example: 'fcm_device_token_xyz',
    description: 'FCM Token thiết bị di động (nếu có)',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
