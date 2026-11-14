import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin.guard';
import { AdminExceptionFilter } from '../admin.filter';
import { SettingsService } from './settings.service';
import { ChangePasswordDto } from './dto/update-settings.dto';

@ApiTags('Web Admin - Cài đặt hệ thống')
@Controller('admin/settings')
@UseGuards(AdminGuard)
@UseFilters(AdminExceptionFilter)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ cài đặt hệ thống' })
  async getAllSettings(@Req() req: any) {
    return this.service.getSettings(req.admin);
  }

  @Get(':category')
  @ApiOperation({ summary: 'Lấy cài đặt theo nhóm chuyên biệt' })
  async getSettingsByCategory(
    @Param('category') category: string,
    @Req() req: any,
  ) {
    return this.service.getSettings(req.admin, category);
  }

  @Patch(':category')
  @ApiOperation({ summary: 'Cập nhật cấu hình cho 1 nhóm cài đặt' })
  async updateSettings(
    @Param('category') category: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    const payload = body?.data !== undefined ? body.data : body;
    return this.service.updateSettings(req.admin, category, payload);
  }

  @Post('test-zns')
  @ApiOperation({ summary: 'Kiểm tra thử nghiệm kết nối Zalo Cloud ZNS' })
  async testZns(@Req() req: any) {
    return this.service.testZnsConnection(req.admin);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản quản trị viên cá nhân' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.service.changePassword(req.admin, dto);
  }
}
