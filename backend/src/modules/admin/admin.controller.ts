import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminExceptionFilter } from './admin.filter';

@ApiTags('Web Admin')
@Controller('admin')
@UseFilters(AdminExceptionFilter)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Post('login')
  login(
    @Body() body: { identifier?: string; password?: string },
    @Ip() ip: string,
  ) {
    return this.service.login(body, ip);
  }
  @Get('session')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  session(@Req() req) {
    return req.admin;
  }
  @Post('cashier/collect')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  collectCashierPayment(@Body() body: Record<string, unknown>, @Req() req) {
    return this.service.collectCashierPayment(req.admin, body);
  }
  @Get('cashier/shifts/active')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  activeCashierShift(@Query('branchId') branchId: string, @Req() req) {
    return this.service.activeCashierShift(req.admin, branchId);
  }
  @Post('cashier/shifts/open')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  openCashierShift(@Body() body: Record<string, unknown>, @Req() req) {
    return this.service.openCashierShift(req.admin, body);
  }
  @Post('cashier/shifts/:id/close')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  closeCashierShift(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req,
  ) {
    return this.service.closeCashierShift(req.admin, id, body);
  }
  @Get('resources')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  resources(@Req() req) {
    return this.service.catalog(req.admin);
  }
  @Get('summary')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  summary(@Query('from') from: string, @Query('to') to: string) {
    return this.service.summary(from, to);
  }
  @Get(':table')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  list(
    @Param('table') table: string,
    @Query() query: Record<string, string>,
    @Req() req,
  ) {
    return this.service.list(table, req.admin, query);
  }
  @Post(':table/create')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(
    @Param('table') table: string,
    @Body() body: { values?: unknown },
    @Req() req,
  ) {
    return this.service.mutate(table, req.admin, 'create', body);
  }
  @Post(':table/update')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  update(
    @Param('table') table: string,
    @Body()
    body: { values?: unknown; key?: unknown; expectedUpdatedAt?: string },
    @Req() req,
  ) {
    return this.service.mutate(table, req.admin, 'update', body);
  }
  @Post(':table/delete')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  delete(
    @Param('table') table: string,
    @Body() body: { key?: unknown; expectedUpdatedAt?: string },
    @Req() req,
  ) {
    return this.service.mutate(table, req.admin, 'delete', body);
  }
  @Post(':table/action')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  action(
    @Param('table') table: string,
    @Body() body: { key?: unknown; action?: string; reason?: string },
    @Req() req,
  ) {
    return this.service.action(table, req.admin, body);
  }
}
