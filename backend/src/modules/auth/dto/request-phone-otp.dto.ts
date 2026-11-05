import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class RequestPhoneOtpDto {
  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại nhận mã OTP (định dạng Việt Nam)',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phone: string;
}

