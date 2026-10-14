import { ApiProperty } from '@nestjs/swagger';

export class CreateSupportTicketDto {
  @ApiProperty({ description: 'Tiêu đề câu hỏi / thắc mắc', example: 'Cần tư vấn phác đồ đau mỏi gáy' })
  subject: string;

  @ApiProperty({ description: 'Nội dung chi tiết cần hỗ trợ' })
  message: string;
}

