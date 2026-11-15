import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ description: 'Phân loại sự cố/yêu cầu', example: 'SOFTWARE_BUG' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn phân loại yêu cầu.' })
  @IsIn(['SOFTWARE_BUG', 'HARDWARE_POS', 'DATA_ISSUE', 'FEATURE_REQUEST', 'ACCOUNT_ACCESS', 'OTHER'], {
    message: 'Phân loại không hợp lệ.',
  })
  category: string;

  @ApiPropertyOptional({ description: 'Mức độ ưu tiên', example: 'MEDIUM', default: 'MEDIUM' })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], { message: 'Mức độ ưu tiên không hợp lệ.' })
  priority?: string = 'MEDIUM';

  @ApiProperty({ description: 'Tiêu đề ngắn gọn của sự cố', example: 'Lỗi in hóa đơn POS tại quầy 01' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề yêu cầu.' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự.' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự.' })
  title: string;

  @ApiProperty({ description: 'Mô tả chi tiết các bước xảy ra lỗi', example: 'Khi bấm Hoàn tất & In Bill thì máy in báo lỗi kết nối...' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mô tả chi tiết sự cố.' })
  @MinLength(10, { message: 'Mô tả chi tiết phải có ít nhất 10 ký tự.' })
  description: string;

  @ApiPropertyOptional({ description: 'Danh sách URL ảnh chụp màn hình đính kèm', type: [String] })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Thông tin môi trường kỹ thuật (Trình duyệt, OS, màn hình, route)', type: Object })
  @IsOptional()
  environment_info?: Record<string, any>;
}
