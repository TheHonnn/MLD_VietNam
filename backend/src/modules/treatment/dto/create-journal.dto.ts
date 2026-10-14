import { ApiProperty } from '@nestjs/swagger';

export class CreateJournalDto {
  @ApiProperty({ description: 'ID gói liệu trình của khách' })
  userPackageId?: string;

  @ApiProperty({ description: 'ID lịch hẹn liên quan' })
  bookingId?: string;

  @ApiProperty({ description: 'Số thứ tự buổi chăm sóc', example: 4 })
  sessionNumber: number;

  @ApiProperty({ description: 'Tình trạng cơ thể / da trước buổi chăm sóc' })
  skinConditionBefore?: string;

  @ApiProperty({ description: 'Tiến triển sau buổi chăm sóc' })
  skinConditionAfter?: string;

  @ApiProperty({ description: 'Ghi chú kỹ thuật viên / liệu trình' })
  treatmentNotes?: string;

  @ApiProperty({ description: 'Đánh giá mức độ phục hồi (1-5 sao)', example: 5 })
  rating?: number;

  @ApiProperty({ description: 'Phản hồi của khách hàng sau buổi chăm sóc' })
  customerFeedback?: string;
}

