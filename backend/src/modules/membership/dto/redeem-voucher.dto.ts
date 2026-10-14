import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemVoucherDto {
  @ApiProperty({ description: 'Mã voucher hoặc ID phần thưởng', example: 'MASSAGE20DEMO' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

