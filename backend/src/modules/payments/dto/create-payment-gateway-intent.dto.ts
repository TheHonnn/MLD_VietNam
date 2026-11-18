import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePaymentGatewayIntentDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1000)
  @Max(500000000)
  amount: number;

  @ApiProperty({ example: 'MLD BK-20261118-001' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'BOOKING' })
  @IsOptional()
  @IsIn(['BOOKING', 'PACKAGE', 'ENROLLMENT', 'PRODUCT', 'INVOICE'])
  targetType?: 'BOOKING' | 'PACKAGE' | 'ENROLLMENT' | 'PRODUCT' | 'INVOICE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ example: 'BK-20261118-001' })
  @IsOptional()
  @IsString()
  referenceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;
}
