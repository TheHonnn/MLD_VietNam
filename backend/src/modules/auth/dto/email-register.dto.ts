import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class EmailRegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn Nam', description: 'Họ và tên người dùng' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'nam.nguyen@example.com', description: 'Địa chỉ Email' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ required: false, example: '0987654321', description: 'Số điện thoại (tùy chọn)' })
  phone?: string;
}

