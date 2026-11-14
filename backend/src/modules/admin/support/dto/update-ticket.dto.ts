import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Trạng thái xử lý', example: 'IN_PROGRESS' })
  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], { message: 'Trạng thái không hợp lệ.' })
  status?: string;

  @ApiPropertyOptional({ description: 'Mức độ ưu tiên cập nhật', example: 'HIGH' })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], { message: 'Mức độ ưu tiên không hợp lệ.' })
  priority?: string;

  @ApiPropertyOptional({ description: 'Phản hồi hoặc ghi chú từ kỹ thuật viên', example: 'Đã cập nhật driver máy in...' })
  @IsOptional()
  @IsString()
  admin_reply?: string;

  @ApiPropertyOptional({ description: 'ID kỹ thuật viên được giao xử lý', example: 'a0000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID('4', { message: 'ID kỹ thuật viên không hợp lệ.' })
  assigned_to?: string;
}
