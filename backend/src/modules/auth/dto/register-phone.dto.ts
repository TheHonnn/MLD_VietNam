import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterPhoneDto {
  @ApiProperty({ example: 'Nguyễn Văn Nam' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0987654321' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phone: string;

  @ApiProperty({ example: 'Password@123' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;
}

export class VerifyPhoneRegisterDto {
  @ApiProperty({ example: '0987654321' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString()
  otp: string;
}

