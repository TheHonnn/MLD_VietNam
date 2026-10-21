import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID chi nhánh Spa', example: 'aaaaaaaa-0001-0001-0001-000000000001' })
  @IsNotEmpty({ message: 'branchId không được để trống' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'ID dịch vụ Spa chính' })
  @IsNotEmpty({ message: 'serviceId không được để trống' })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: 'Danh sách ID các dịch vụ phụ / addon', required: false })
  @IsOptional()
  @IsArray()
  addonServiceIds?: string[];

  @ApiProperty({ description: 'ID chuyên viên (để trống nếu random)', required: false })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiProperty({ description: 'Tự động gán KTV ngẫu nhiên đang rảnh ca', default: false, required: false })
  @IsOptional()
  isAutoAssign?: boolean;

  @ApiProperty({ description: 'ID slot giờ khám/dịch vụ', required: false })
  @IsOptional()
  @IsString()
  slotId?: string;

  @ApiProperty({ description: 'Ngày hẹn YYYY-MM-DD', example: '2026-10-25' })
  @IsNotEmpty({ message: 'bookingDate không được để trống' })
  @IsString()
  bookingDate: string;

  @ApiProperty({ description: 'Giờ bắt đầu HH:mm', example: '14:00' })
  @IsNotEmpty({ message: 'startTime không được để trống' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'Giờ kết thúc HH:mm', example: '15:00', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Tên người sử dụng dịch vụ', required: false })
  @IsOptional()
  @IsString()
  bookedForName?: string;

  @ApiProperty({ description: 'Số điện thoại liên hệ', required: false })
  @IsOptional()
  @IsString()
  bookedForPhone?: string;

  @ApiProperty({ description: 'Ghi chú đặc biệt của khách hàng', required: false })
  @IsOptional()
  @IsString()
  specialNotes?: string;

  @ApiProperty({ description: 'Phương thức thanh toán', default: 'VIETQR', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: 'Mã giảm giá', required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

