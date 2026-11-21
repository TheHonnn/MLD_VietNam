import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin.guard';
import { AdminExceptionFilter } from '../admin.filter';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateCustomerTicketDto } from './dto/update-customer-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';

@ApiTags('Web Admin - Hỗ trợ kỹ thuật & Vận hành')
@Controller('admin/support')
@UseGuards(AdminGuard)
@UseFilters(AdminExceptionFilter)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get('diagnostics')
  @ApiOperation({ summary: 'Chẩn đoán kết nối và độ trễ hệ thống thời gian thực' })
  async getDiagnostics() {
    return this.service.getDiagnostics();
  }

  @Get('guides')
  @ApiOperation({ summary: 'Lấy danh sách cẩm nang hướng dẫn vận hành SOP' })
  async getGuides(
    @Query('module') module?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getGuides(module, search);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Lấy danh sách phiếu hỗ trợ theo phân quyền' })
  async getTickets(@Req() req: any, @Query() query: QueryTicketsDto) {
    return this.service.getTickets(req.admin, query);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Tạo phiếu hỗ trợ / báo lỗi mới' })
  async createTicket(@Req() req: any, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(req.admin, dto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một phiếu hỗ trợ' })
  async getTicketById(@Req() req: any, @Param('id') id: string) {
    return this.service.getTicketById(req.admin, id);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Cập nhật trạng thái / phản hồi phiếu hỗ trợ' })
  async updateTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.service.updateTicket(req.admin, id, dto);
  }

  @Post('tickets/:id/update')
  @ApiOperation({ summary: 'Cập nhật trạng thái / phản hồi phiếu hỗ trợ (POST)' })
  async updateTicketPost(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.service.updateTicket(req.admin, id, dto);
  }

  @Get('customer-tickets')
  @ApiOperation({ summary: 'Lấy danh sách phiếu hỗ trợ của khách hàng từ Mobile App' })
  async getCustomerTickets(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getCustomerTickets(req.admin, status, search);
  }

  @Patch('customer-tickets/:id')
  @ApiOperation({ summary: 'Phản hồi / cập nhật trạng thái phiếu hỗ trợ khách hàng' })
  async updateCustomerTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateCustomerTicketDto,
  ) {
    return this.service.updateCustomerTicket(req.admin, id, body);
  }

  @Post('customer-tickets/:id/update')
  @ApiOperation({ summary: 'Phản hồi / cập nhật trạng thái phiếu hỗ trợ khách hàng (POST)' })
  async updateCustomerTicketPost(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateCustomerTicketDto,
  ) {
    return this.service.updateCustomerTicket(req.admin, id, body);
  }
}
