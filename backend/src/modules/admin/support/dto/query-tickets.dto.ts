import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryTicketsDto {
  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', example: 'OPEN' })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Lọc theo mức độ ưu tiên', example: 'URGENT' })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Lọc theo phân loại', example: 'SOFTWARE_BUG' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm từ khóa theo mã phiếu hoặc tiêu đề' })
  @IsOptional()
  @IsString()
  search?: string;
}
