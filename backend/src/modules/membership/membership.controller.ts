import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Hội Viên & Hồ Sơ Cá Nhân (Group F)')
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F01/F02: Lấy thông tin hồ sơ cá nhân' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.membershipService.getProfile(userId || 'default-user');
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F02: Cập nhật thông tin cá nhân' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.membershipService.updateProfile(userId || 'default-user', dto);
  }

  @Get('card')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F03: Xem thẻ hội viên điện tử & đặc quyền' })
  async getMembershipCard(@CurrentUser('id') userId: string) {
    return this.membershipService.getMembershipCard(userId || 'default-user');
  }

  @Get('points')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F04: Lấy số dư điểm, lịch sử và danh mục đổi quà' })
  async getLoyaltyPoints(@CurrentUser('id') userId: string) {
    return this.membershipService.getLoyaltyPoints(userId || 'default-user');
  }

  @Post('points/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F04: Đổi điểm thưởng nhận voucher/ưu đãi' })
  async redeemReward(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemVoucherDto,
  ) {
    return this.membershipService.redeemReward(userId || 'default-user', dto);
  }

  @Get('vouchers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F05: Lấy danh sách voucher/ưu đãi của tôi' })
  @ApiQuery({ name: 'filter', required: false, enum: ['AVAILABLE', 'USED', 'EXPIRED'] })
  async getMyVouchers(
    @CurrentUser('id') userId: string,
    @Query('filter') filter?: string,
  ) {
    return this.membershipService.getMyVouchers(userId || 'default-user', filter);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F06: Xem lịch sử thanh toán theo tháng & bộ lọc' })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'category', required: false })
  async getPaymentHistory(
    @CurrentUser('id') userId: string,
    @Query('month') month?: string,
    @Query('category') category?: string,
  ) {
    return this.membershipService.getPaymentHistory(userId || 'default-user', month, category);
  }

  @Get('referral')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F07: Lấy mã giới thiệu, thống kê và lịch sử' })
  async getReferralProgram(@CurrentUser('id') userId: string) {
    return this.membershipService.getReferralProgram(userId || 'default-user');
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F08: Lấy cấu hình cài đặt thông báo và tùy chọn' })
  async getSettings(@CurrentUser('id') userId: string) {
    return this.membershipService.getSettings(userId || 'default-user');
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'F08: Cập nhật cài đặt tài khoản' })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.membershipService.updateSettings(userId || 'default-user', dto);
  }
}

