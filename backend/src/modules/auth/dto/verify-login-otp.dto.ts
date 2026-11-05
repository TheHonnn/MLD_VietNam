import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class VerifyLoginOtpDto {
  @ApiProperty({
    example: 'xuantruong.dev26@gmail.com',
    description: 'Địa chỉ Email tài khoản cần xác thực đăng nhập',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ Email không đúng định dạng' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP ngẫu nhiên gồm 6 chữ số đã gửi về Email',
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
