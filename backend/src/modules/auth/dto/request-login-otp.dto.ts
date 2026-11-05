import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestLoginOtpDto {
  @ApiProperty({
    example: 'xuantruong.dev26@gmail.com',
    description: 'Địa chỉ Email tài khoản cần gửi mã OTP đăng nhập ngẫu nhiên',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ Email không đúng định dạng' })
  email: string;
}
