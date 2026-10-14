import { ApiProperty } from '@nestjs/swagger';

export class CreateConsultationDto {
  @ApiProperty({ description: 'ID lịch hẹn chuẩn bị thực hiện' })
  bookingId?: string;

  @ApiProperty({ description: 'Các vùng đau mỏi cần tập trung', example: ['Cổ vai gáy', 'Thắt lưng'] })
  focusAreas: string[];

  @ApiProperty({ description: 'Mức độ lực bấm mong muốn', enum: ['LIGHT', 'MEDIUM', 'STRONG'], example: 'MEDIUM' })
  pressurePreference: 'LIGHT' | 'MEDIUM' | 'STRONG';

  @ApiProperty({ description: 'Có làn da nhạy cảm không', default: false })
  hasSensitiveSkin: boolean;

  @ApiProperty({ description: 'Có tiền sử dị ứng tinh dầu không', default: false })
  hasEssentialOilAllergy: boolean;

  @ApiProperty({ description: 'Chi tiết dị ứng nếu có' })
  allergyDetails?: string;

  @ApiProperty({ description: 'Bệnh lý hoặc lưu ý đặc biệt', example: ['Huyết áp thấp', 'Mất ngủ'] })
  medicalConditions?: string[];

  @ApiProperty({ description: 'Yêu cầu riêng gửi chuyên viên' })
  specialRequests?: string;
}

