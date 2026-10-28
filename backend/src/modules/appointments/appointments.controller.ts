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
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Đặt lịch & Quản lý Lịch hẹn Spa (Bookings & Appointments)')
@Controller(['bookings', 'appointments'])
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('hold-slot')
  @ApiOperation({
    summary: 'C04: Giữ chỗ khung giờ trong 10 phút (Chống Double-Booking bằng Redis Lock)',
  })
  @ApiResponse({ status: 201, description: 'Giữ chỗ thành công trong 10 phút' })
  @ApiResponse({ status: 409, description: 'Khung giờ vừa có người khác giữ chỗ để cọc' })
  async holdSlot(
    @CurrentUser('id') userId: string,
    @Body() holdSlotDto: HoldSlotDto,
  ) {
    return this.appointmentsService.holdSlot(userId || 'default-user', holdSlotDto);
  }

  @Post()
  @ApiOperation({ summary: 'C06: Xác nhận và tạo lịch hẹn dịch vụ Spa chính thức' })
  @ApiResponse({ status: 201, description: 'Tạo lịch hẹn thành công kèm mã QR check-in' })
  async createBooking(
    @CurrentUser('id') userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.appointmentsService.createBooking(userId || 'default-user', createBookingDto);
  }

  @Patch(':id/reschedule')
  @ApiOperation({
    summary: 'C10: Đổi lịch hẹn (Tự động phân nhánh: Chỉ định KTV vs Random KTV rảnh ca)',
  })
  @ApiResponse({ status: 200, description: 'Đổi lịch hẹn thành công' })
  @ApiResponse({ status: 409, description: 'Chuyên viên đã kín lịch trong khung giờ này' })
  async rescheduleBooking(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.appointmentsService.rescheduleBooking(userId || 'default-user', id, dto);
  }

  @Get('slots')
  @ApiOperation({ summary: 'C04: Lấy danh sách khung giờ & kiểm tra khả dụng / lý do bận' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID chi nhánh' })
  @ApiQuery({ name: 'date', required: true, description: 'Ngày YYYY-MM-DD' })
  @ApiQuery({ name: 'technicianId', required: false, description: 'ID chuyên viên nếu chỉ định' })
  @ApiQuery({ name: 'isAutoAssign', required: false, type: Boolean, description: 'Random chuyên viên' })
  async getAvailableSlots(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('technicianId') technicianId?: string,
    @Query('isAutoAssign') isAutoAssign?: boolean,
  ) {
    return this.appointmentsService.getAvailableSlots(branchId, date, technicianId, isAutoAssign);
  }

  @Get('my')
  @ApiOperation({ summary: 'C09: Lấy danh sách lịch hẹn của tôi (Sắp tới / Đã làm / Đã hủy)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'],
  })
  async getMyAppointments(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.getMyAppointments(userId || 'default-user', status);
  }

  @Post('auto-release')
  @ApiOperation({ summary: 'Tự động giải phóng tài nguyên các ca trị liệu đã hoàn tất (Auto-Release Lifecycle)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID chi nhánh cần quét' })
  async autoReleaseExpiredBookings(@Query('branchId') branchId?: string) {
    return this.appointmentsService.autoReleaseExpiredBookings(branchId);
  }

  @Get('least-busy-technician')
  @ApiOperation({ summary: 'Thuật toán điều phối KTV có tải thấp nhất trong ngày (Least-Busy Dispatch)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID chi nhánh' })
  @ApiQuery({ name: 'date', required: true, description: 'Ngày YYYY-MM-DD' })
  @ApiQuery({ name: 'startTime', required: true, description: 'Giờ bắt đầu HH:MM:SS' })
  @ApiQuery({ name: 'endTime', required: true, description: 'Giờ kết thúc HH:MM:SS' })
  async getLeastBusyTechnician(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.appointmentsService.dispatchLeastBusyTechnician(branchId, date, startTime, endTime);
  }

  @Get(':id')
  @ApiOperation({ summary: 'C10: Lấy chi tiết lịch hẹn kèm mã QR check-in & KTV' })
  async getAppointmentDetail(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.getAppointmentDetail(userId || 'default-user', id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy lịch hẹn và giải phóng khung giờ' })
  async cancelAppointment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.appointmentsService.cancelAppointment(
      userId || 'default-user',
      id,
      reason || 'Khách hàng chủ động hủy lịch',
    );
  }
}
