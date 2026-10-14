import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '0987654321', description: 'Số điện thoại hoặc Email' })
  @IsNotEmpty({ message: 'Số điện thoại hoặc email không được để trống' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'Password@123', description: 'Mật khẩu đăng nhập' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ required: false, example: 'fcm_token_device_xyz', description: 'FCM Token nhận thông báo' })
  fcmToken?: string;
}

