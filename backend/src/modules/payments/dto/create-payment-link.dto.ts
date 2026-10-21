import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'Số tiền cần thanh toán (VNĐ)', example: 150000 })
  @IsNumber()
  @Min(1000)
  @Max(100000000)
  amount: number;

  @ApiProperty({ description: 'Nội dung chuyển khoản (tối đa 25 ký tự, không dấu cách đặc biệt)', example: 'MLD C0C 123456' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Mã đơn hàng PayOS (số nguyên duy nhất, tự sinh nếu để trống)', example: 177566 })
  @IsOptional()
  @IsNumber()
  orderCode?: number;

  @ApiPropertyOptional({ description: 'ID Lịch hẹn (Booking)', example: 'apt-17726372' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'ID Khóa học (Academy Enrollment)', example: 'enr-99823' })
  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @ApiPropertyOptional({ description: 'Tên người thanh toán' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại người thanh toán' })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}

