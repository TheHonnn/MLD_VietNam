import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class EmailLoginDto {
  @ApiProperty({ example: 'nam.nguyen@example.com', description: 'Địa chỉ Email' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ required: false, example: 'fcm_device_token_xyz', description: 'FCM Token thiết bị' })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}

