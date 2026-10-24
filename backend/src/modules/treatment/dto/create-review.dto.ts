import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID lịch hẹn được đánh giá' })
  bookingId?: string;

  @ApiProperty({ description: 'ID dịch vụ spa' })
  serviceId?: string;

  @ApiProperty({ description: 'ID kỹ thuật viên phụ trách' })
  technicianId?: string;

  @ApiProperty({ description: 'Chấm điểm số sao (1-5)', example: 5 })
  rating?: number;

  @ApiProperty({ description: 'Chấm điểm số sao tổng thể từ app (1-5)', example: 5, required: false })
  overallRating?: number;

  @ApiProperty({ description: 'Chấm điểm chất lượng dịch vụ (1-5)', example: 5, required: false })
  serviceQualityRating?: number;

  @ApiProperty({ description: 'Chấm điểm thái độ nhân viên (1-5)', example: 5, required: false })
  staffAttitudeRating?: number;

  @ApiProperty({ description: 'Chấm điểm không gian cơ sở (1-5)', example: 5, required: false })
  spaceAmbianceRating?: number;

  @ApiProperty({ description: 'Chấm điểm quy trình dịch vụ (1-5)', example: 5, required: false })
  procedureRating?: number;

  @ApiProperty({ description: 'Sẵn sàng giới thiệu bạn bè', example: 'Có', required: false })
  willingnessToRefer?: string;

  @ApiProperty({ description: 'Các thẻ nhận xét nhanh', example: ['Chuyên môn cao', 'Lực ấn vừa vặn', 'Phòng sạch sẽ'] })
  quickTags?: string[];

  @ApiProperty({ description: 'Nội dung nhận xét chi tiết' })
  comment: string;

  @ApiProperty({ description: 'Danh sách URL ảnh feedback đính kèm' })
  photos?: string[];
}

