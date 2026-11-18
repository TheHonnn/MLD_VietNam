import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { CreatePaymentGatewayIntentDto } from './dto/create-payment-gateway-intent.dto';

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

  @Post('bank-transfer-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook tự động đối soát biến động số dư ngân hàng (SePay / Casso / MBBank)' })
  @ApiResponse({ status: 200, description: 'Đối soát và cập nhật thanh toán tự động thành công' })
  async handleBankTransferWebhook(@Body() body: any, @Headers() headers: Record<string, string>) {
    return this.paymentsService.handleBankTransferWebhook(body, headers);
  }

  @Post('sepay-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint Webhook tích hợp trực tiếp SePay' })
  async handleSepayWebhook(@Body() body: any, @Headers() headers: Record<string, string>) {
    return this.paymentsService.handleBankTransferWebhook(body, headers);
  }

  @Post('casso-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint Webhook tích hợp trực tiếp Casso' })
  async handleCassoWebhook(@Body() body: any, @Headers() headers: Record<string, string>) {
    return this.paymentsService.handleBankTransferWebhook(body, headers);
  }

  @Post('zalo-refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cơ chế làm mới Zalo OA Access Token tự động (Zalo OAuth v4)' })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  async refreshZaloToken(@Body() body: any) {
    return this.paymentsService.refreshZaloAccessToken(body);
  }

  @Get('gateway/config')
  @ApiOperation({ summary: 'Lấy trạng thái cấu hình cổng thanh toán trung gian hiện tại' })
  getGatewayConfig() {
    const data = this.paymentsService.getGatewayPublicConfig();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Post('gateway/intent')
  @ApiOperation({ summary: 'Tạo phiên thanh toán tự động qua Adapter cổng thanh toán trung gian' })
  async createGatewayIntent(@Body() dto: CreatePaymentGatewayIntentDto) {
    const data = await this.paymentsService.createGatewayIntent(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: data.message,
      data,
    };
  }

  @Get('gateway/status/:orderCode')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán tự động theo orderCode' })
  async checkGatewayIntentStatus(@Param('orderCode', ParseIntPipe) orderCode: number) {
    const data = await this.paymentsService.checkGatewayIntentStatus(orderCode);
    return {
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    };
  }

  @Post('gateway/webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận và đối soát webhook tự động từ cổng thanh toán trung gian' })
  async handleGenericGatewayWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.paymentsService.handleGenericGatewayWebhook(provider, body, headers);
  }
}

