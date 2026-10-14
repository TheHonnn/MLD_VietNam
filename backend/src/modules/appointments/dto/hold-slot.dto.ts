import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class HoldSlotDto {
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444401', description: 'ID bác sĩ' })
  @IsNotEmpty({ message: 'doctorId không được để trống' })
  @IsString()
  doctorId: string;

  @ApiProperty({ description: 'ID khung giờ khám' })
  @IsNotEmpty({ message: 'slotId không được để trống' })
  @IsString()
  slotId: string;

  @ApiProperty({ example: '2026-10-15', description: 'Ngày khám YYYY-MM-DD' })
  @IsNotEmpty({ message: 'slotDate không được để trống' })
  @IsDateString()
  slotDate: string;
}

