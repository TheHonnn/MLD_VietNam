import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID lịch hẹn được đánh giá' })
  bookingId?: string;

  @ApiProperty({ description: 'ID dịch vụ spa' })
  serviceId?: string;

  @ApiProperty({ description: 'ID kỹ thuật viên phụ trách' })
  technicianId?: string;

  @ApiProperty({ description: 'Chấm điểm số sao (1-5)', example: 5 })
  rating: number;

  @ApiProperty({ description: 'Các thẻ nhận xét nhanh', example: ['Chuyên môn cao', 'Lực ấn vừa vặn', 'Phòng sạch sẽ'] })
  quickTags?: string[];

  @ApiProperty({ description: 'Nội dung nhận xét chi tiết' })
  comment: string;

  @ApiProperty({ description: 'Danh sách URL ảnh feedback đính kèm' })
  photos?: string[];
}

