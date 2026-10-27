import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class EnrollCourseDto {
  @ApiProperty({ description: 'ID Khóa học', example: '30303030-0001-0001-0001-000000000001' })
  @IsNotEmpty({ message: 'courseId không được để trống' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'ID Lớp/Đợt khai giảng', required: false })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ description: 'Họ và tên học viên', example: 'Nguyễn Văn Nam' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  studentName: string;

  @ApiProperty({ description: 'Số điện thoại học viên', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  studentPhone: string;

  @ApiProperty({ description: 'Email học viên', required: false, example: 'nam.nguyen@example.com' })
  @IsOptional()
  @IsString()
  studentEmail?: string;

  @ApiProperty({ description: 'Chi nhánh đăng ký học', required: false, example: 'Chi nhánh Quận 3' })
  @IsOptional()
  @IsString()
  selectedBranch?: string;

  @ApiProperty({ description: 'Ca học lựa chọn', required: false, example: 'Thứ 6–7–Chủ nhật · 13:00–17:00' })
  @IsOptional()
  @IsString()
  selectedShift?: string;

  @ApiProperty({ description: 'Số tiền đặt cọc', required: false, example: 2000000 })
  @IsOptional()
  @IsNumber()
  depositAmount?: number;
}

