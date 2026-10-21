import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({ description: 'Ngày hẹn mới YYYY-MM-DD', example: '2026-10-25' })
  @IsNotEmpty({ message: 'newDate không được để trống' })
  @IsString()
  newDate: string;

  @ApiProperty({ description: 'Khung giờ bắt đầu mới HH:mm', example: '14:00' })
  @IsNotEmpty({ message: 'newStartTime không được để trống' })
  @IsString()
  newStartTime: string;

  @ApiProperty({ description: 'Khung giờ kết thúc mới HH:mm', example: '15:00', required: false })
  @IsOptional()
  @IsString()
  newEndTime?: string;

  @ApiProperty({
    description: 'Tự động gán chuyên viên ngẫu nhiên đang rảnh ca',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutoAssign?: boolean;

  @ApiProperty({
    description: 'ID chuyên viên được chỉ định (nếu muốn giữ hoặc đổi người cụ thể)',
    required: false,
  })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiProperty({ description: 'Lý do đổi lịch', required: false, example: 'Bận đột xuất công việc' })
  @IsOptional()
  @IsString()
  reason?: string;
}

