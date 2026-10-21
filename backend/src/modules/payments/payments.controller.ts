import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@ApiTags('Payments & VietQR (PayOS)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payos-link')
  @ApiOperation({ summary: 'Tạo mã thanh toán VietQR PayOS (Đặt cọc lịch hẹn / Học phí)' })
  @ApiResponse({ status: 201, description: 'Tạo link thanh toán và mã QR thành công' })
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    const data = await this.paymentsService.createPaymentLink(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Tạo mã thanh toán VietQR thành công',
      data,
    };
  }

  @Get('payos/status/:orderCode')
  @ApiOperation({
    summary: 'Kiểm tra trạng thái thanh toán trực tiếp với Ngân hàng (Quy tắc: Chưa nhận tiền chưa hoàn tất)',
  })
  @ApiResponse({ status: 200, description: 'Lấy trạng thái thanh toán từ PayOS thành công' })
  async checkPaymentStatus(@Param('orderCode', ParseIntPipe) orderCode: number) {
    const data = await this.paymentsService.checkPaymentStatus(orderCode);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Post('payos-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook nhận thông báo tiền về tự động từ PayOS' })
  @ApiResponse({ status: 200, description: 'Xử lý webhook thành công' })
  async handlePayosWebhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias Webhook chung' })
  async handleGeneralWebhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }
}

