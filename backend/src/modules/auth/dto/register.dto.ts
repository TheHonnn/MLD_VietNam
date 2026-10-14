import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn Nam', description: 'Họ và tên bệnh nhân' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại Việt Nam' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phone: string;

  @ApiProperty({ example: 'Password@123', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ required: false, example: 'benhnhan@gmail.com' })
  @IsOptional()
  email?: string;
}

