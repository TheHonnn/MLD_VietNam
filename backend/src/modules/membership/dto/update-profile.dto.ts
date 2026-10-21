import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Ảnh đại diện URL', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Minh Anh' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email liên hệ', example: 'minh.anh@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Ngày sinh DD/MM/YYYY', example: '15/08/1998', required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Giới tính', example: 'Nữ', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'Địa chỉ liên hệ', example: '12 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Nghề nghiệp', example: 'Nhân viên văn phòng', required: false })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiProperty({ description: 'Tên người liên hệ khẩn cấp', example: 'Nguyễn Văn B', required: false })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({ description: 'Số điện thoại khẩn cấp', example: '0901 234 567', required: false })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}
