import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';

@ApiTags('Danh mục Bác sĩ & Khung giờ (Doctors)')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ kèm bộ lọc (chuyên khoa, từ khóa, đánh giá)' })
  @ApiQuery({ name: 'specialityId', required: false, description: 'Lọc theo ID chuyên khoa' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Tìm theo tên bác sĩ hoặc chuyên khoa' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Điểm đánh giá tối thiểu (ví dụ: 4.5)' })
  async findAll(
    @Query('specialityId') specialityId?: string,
    @Query('keyword') keyword?: string,
    @Query('minRating') minRating?: number,
  ) {
    return this.doctorsService.findAll({
      specialityId,
      keyword,
      minRating: minRating ? Number(minRating) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ bác sĩ và các đánh giá gần nhất' })
  async findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'Lấy danh sách các slot khám trống của bác sĩ theo ngày' })
  @ApiQuery({ name: 'date', required: true, example: '2026-10-15', description: 'Ngày khám định dạng YYYY-MM-DD' })
  async getAvailableSlots(
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    return this.doctorsService.getAvailableSlots(id, date);
  }
}

