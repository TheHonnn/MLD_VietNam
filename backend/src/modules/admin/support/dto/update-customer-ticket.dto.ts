import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerTicketDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsString()
  admin_reply?: string;
}
