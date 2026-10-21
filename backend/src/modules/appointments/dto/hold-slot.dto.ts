import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class HoldSlotDto {
  @ApiProperty({ description: 'ID khung giờ slot', required: false })
  @IsOptional()
  @IsString()
  slotId?: string;

  @ApiProperty({ description: 'ID chuyên viên / kỹ thuật viên', required: false })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiProperty({ description: 'ID chi nhánh Spa', required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'Ngày đặt YYYY-MM-DD', example: '2026-10-25', required: false })
  @IsOptional()
  @IsString()
  slotDate?: string;

  @ApiProperty({ description: 'Giờ bắt đầu HH:mm', example: '14:00', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;
}
