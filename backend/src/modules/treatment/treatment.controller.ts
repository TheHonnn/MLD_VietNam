import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TreatmentService } from './treatment.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Gói Liệu Trình, Nhật Ký & Chăm Sóc Khách Hàng (Group D)')
@Controller('treatment')
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  @Get('packages/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D01: Lấy danh sách gói liệu trình của khách hàng' })
  async getMyPackages(@CurrentUser('id') userId: string) {
    return this.treatmentService.getMyPackages(userId || 'default-user');
  }

  @Get('packages/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D02: Xem chi tiết gói liệu trình & phác đồ từng buổi' })
  async getPackageDetail(
    @CurrentUser('id') userId: string,
    @Param('id') packageId: string,
  ) {
    return this.treatmentService.getPackageDetail(userId || 'default-user', packageId);
  }

  @Get('journal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D03: Lấy dòng thời gian nhật ký chăm sóc sức khỏe' })
  async getCareJournal(@CurrentUser('id') userId: string) {
    return this.treatmentService.getCareJournal(userId || 'default-user');
  }

  @Post('journal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D03: Tạo ghi chú nhật ký buổi chăm sóc mới' })
  async createCareJournal(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJournalDto,
  ) {
    return this.treatmentService.createCareJournal(userId || 'default-user', dto);
  }

  @Post('consultation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D04: Gửi bảng khảo sát sức khỏe tiền dịch vụ' })
  async saveConsultation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.treatmentService.saveConsultation(userId || 'default-user', dto);
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D05: Gửi đánh giá dịch vụ & chuyên gia (nhận điểm thưởng)' })
  async submitReview(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.treatmentService.submitReview(userId || 'default-user', dto);
  }

  @Get('guidelines')
  @ApiOperation({ summary: 'D06: Lấy cẩm nang hướng dẫn tự chăm sóc tại nhà' })
  @ApiQuery({ name: 'category', required: false, description: 'Lọc theo danh mục' })
  async getGuidelines(@Query('category') category?: string) {
    return this.treatmentService.getGuidelines(category);
  }

  @Get('faqs')
  @ApiOperation({ summary: 'D07: Lấy danh mục câu hỏi thường gặp FAQ' })
  async getFaqs() {
    return this.treatmentService.getFaqs();
  }

  @Post('support/tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D07: Gửi yêu cầu hỗ trợ khách hàng' })
  async createSupportTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.treatmentService.createSupportTicket(userId || 'default-user', dto);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D08: Lấy danh sách thông báo của người dùng' })
  @ApiQuery({ name: 'type', required: false, enum: ['ALL', 'APPOINTMENT', 'PROMO', 'SYSTEM'] })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
  ) {
    return this.treatmentService.getNotifications(userId || 'default-user', type);
  }

  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'D08: Đánh dấu đã đọc thông báo' })
  async markNotificationRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.treatmentService.markNotificationRead(userId || 'default-user', notificationId);
  }
}

