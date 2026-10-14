import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { HoldSlotDto } from './dto/hold-slot.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Đặt lịch & Quản lý Lịch khám (Appointments)')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('hold-slot')
  @ApiOperation({
    summary: 'Giữ chỗ khung giờ khám trong 10 phút (Chống Double-Booking)',
  })
  @ApiResponse({ status: 201, description: 'Giữ chỗ thành công trong 10 phút' })
  @ApiResponse({ status: 409, description: 'Khung giờ vừa có người khác giữ chỗ' })
  async holdSlot(
    @CurrentUser('id') userId: string,
    @Body() holdSlotDto: HoldSlotDto,
  ) {
    return this.appointmentsService.holdSlot(userId, holdSlotDto);
  }

  @Post()
  @ApiOperation({ summary: 'Xác nhận và tạo lịch hẹn khám chính thức' })
  @ApiResponse({ status: 201, description: 'Tạo lịch khám thành công, trả về mã lịch và QR code' })
  async createAppointment(
    @CurrentUser('id') userId: string,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(userId, createAppointmentDto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách lịch hẹn của tôi (Sắp tới / Đã khám / Đã hủy)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'],
    description: 'Lọc theo trạng thái lịch hẹn',
  })
  async getMyAppointments(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.getMyAppointments(userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một lịch hẹn kèm thông tin bác sĩ và mã QR' })
  async getAppointmentDetail(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.getAppointmentDetail(userId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy lịch hẹn khám và giải phóng khung giờ' })
  async cancelAppointment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.appointmentsService.cancelAppointment(userId, id, reason || 'Bệnh nhân chủ động hủy');
  }
}

