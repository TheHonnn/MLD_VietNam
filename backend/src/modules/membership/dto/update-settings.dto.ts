import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Thông báo lịch hẹn', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  notifyAppointments?: boolean;

  @ApiProperty({ description: 'Thông báo liệu trình', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  notifyTreatments?: boolean;

  @ApiProperty({ description: 'Thông báo khóa học', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  notifyCourses?: boolean;

  @ApiProperty({ description: 'Chương trình ưu đãi', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  notifyPromotions?: boolean;

  @ApiProperty({ description: 'Ngôn ngữ', example: 'Tiếng Việt', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: 'Chi nhánh ưu tiên', example: 'Chi nhánh mẫu 01 — Quận 3', required: false })
  @IsOptional()
  @IsString()
  preferredBranch?: string;

  @ApiProperty({ description: 'Giao diện', example: 'Sáng', required: false })
  @IsOptional()
  @IsString()
  theme?: string;
}

