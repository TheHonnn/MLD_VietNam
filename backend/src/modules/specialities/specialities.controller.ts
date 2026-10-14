import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SpecialitiesService } from './specialities.service';

@ApiTags('Chuyên khoa y tế (Specialities)')
@Controller('specialities')
export class SpecialitiesController {
  constructor(private readonly specialitiesService: SpecialitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh mục chuyên khoa đang hoạt động' })
  @ApiResponse({ status: 200, description: 'Danh sách chuyên khoa y tế' })
  async findAll() {
    return this.specialitiesService.findAll();
  }
}

