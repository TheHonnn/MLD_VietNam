import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
  IsArray,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID bác sĩ được chọn' })
  @IsNotEmpty({ message: 'doctorId không được để trống' })
  @IsString()
  doctorId: string;

  @ApiProperty({ description: 'ID khung giờ khám' })
  @IsNotEmpty({ message: 'slotId không được để trống' })
  @IsString()
  slotId: string;

  @ApiProperty({ example: '2026-10-15', description: 'Ngày khám YYYY-MM-DD' })
  @IsNotEmpty({ message: 'appointmentDate không được để trống' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ required: false, description: 'ID người thân (nếu đặt hộ)' })
  @IsOptional()
  @IsUUID()
  familyMemberId?: string;

  @ApiProperty({
    example: 'Sốt cao 3 ngày kèm ho khan và đau rát họng',
    description: 'Lý do khám bệnh & triệu chứng (tối thiểu 10 ký tự)',
  })
  @IsNotEmpty({ message: 'Lý do khám không được để trống' })
  @IsString()
  @MinLength(10, { message: 'Lý do khám cần mô tả tối thiểu 10 ký tự' })
  reasonForVisit: string;

  @ApiProperty({ required: false, example: 'Có tiền sử dị ứng kháng sinh penicillin' })
  @IsOptional()
  @IsString()
  symptomsDescription?: string;

  @ApiProperty({
    example: 'CASH_AT_CLINIC',
    enum: ['CASH_AT_CLINIC', 'VNPAY', 'MOMO', 'CREDIT_CARD'],
    description: 'Phương thức thanh toán',
  })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  @IsIn(['CASH_AT_CLINIC', 'VNPAY', 'MOMO', 'CREDIT_CARD'], {
    message: 'Phương thức thanh toán không hợp lệ',
  })
  paymentMethod: 'CASH_AT_CLINIC' | 'VNPAY' | 'MOMO' | 'CREDIT_CARD';

  @ApiProperty({ required: false, example: 'HEALTHY20', description: 'Mã giảm giá voucher' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({
    required: false,
    example: ['https://storage.supabase.co/prescriptions/img1.jpg'],
    description: 'Danh sách ảnh đơn thuốc/xét nghiệm cũ đính kèm',
  })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

