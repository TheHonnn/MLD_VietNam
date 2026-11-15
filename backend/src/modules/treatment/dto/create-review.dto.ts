import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID lịch hẹn được đánh giá', required: false })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ description: 'ID dịch vụ spa', required: false })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ description: 'ID kỹ thuật viên phụ trách', required: false })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiProperty({ description: 'Chấm điểm số sao (1-5)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ description: 'Chấm điểm số sao tổng thể từ app (1-5)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiProperty({ description: 'Chấm điểm chất lượng dịch vụ (1-5)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  serviceQualityRating?: number;

  @ApiProperty({ description: 'Chấm điểm thái độ nhân viên (1-5)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  staffAttitudeRating?: number;

  @ApiProperty({ description: 'Chấm điểm không gian cơ sở (1-5)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  spaceAmbianceRating?: number;

  @ApiProperty({ description: 'Chấm điểm quy trình dịch vụ (1-5)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  procedureRating?: number;

  @ApiProperty({ description: 'Sẵn sàng giới thiệu bạn bè', example: 'Có', required: false })
  @IsOptional()
  @IsString()
  willingnessToRefer?: string;

  @ApiProperty({ description: 'Các thẻ nhận xét nhanh', example: ['Chuyên môn cao', 'Lực ấn vừa vặn', 'Phòng sạch sẽ'], required: false })
  @IsOptional()
  @IsArray()
  quickTags?: string[];

  @ApiProperty({ description: 'Các thẻ nhận xét nhanh (alias)', example: ['Chuyên môn cao'], required: false })
  @IsOptional()
  @IsArray()
  reviewTags?: string[];

  @ApiProperty({ description: 'Nội dung nhận xét chi tiết' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Danh sách URL ảnh feedback đính kèm', required: false })
  @IsOptional()
  @IsArray()
  photos?: string[];
}


