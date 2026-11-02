import {
  Body,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseFilters,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminExceptionFilter } from './admin.filter';
import { SupabaseService } from '../../database/supabase.service';
import { createHash, randomBytes, randomUUID } from 'crypto';

@ApiTags('Web Admin')
@Controller('admin')
@UseFilters(AdminExceptionFilter)
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly supabase: SupabaseService,
  ) {}
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
  @Post('treatment-journals/:id/share-link')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async createTreatmentJournalShareLink(@Param('id') id: string, @Req() req) {
    const permissions: string[] = req.admin?.permissions || [];
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.admin?.role) && !permissions.includes('treatment_journal.update')) {
      throw new ForbiddenException('Tài khoản chưa được cấp quyền chia sẻ nhật ký điều trị.');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.supabase.adminClient
      .from('treatment_journal')
      .update({
        share_token_hash: createHash('sha256').update(token).digest('hex'),
        share_expires_at: expiresAt,
        share_revoked_at: null,
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new BadRequestException(`Không thể tạo liên kết chia sẻ: ${error.message}`);
    if (!data) throw new BadRequestException('Không tìm thấy nhật ký điều trị.');
    return { data: { token, expiresAt } };
  }

  @Post('treatment-journals/:id/revoke-share-link')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async revokeTreatmentJournalShareLink(@Param('id') id: string, @Req() req) {
    const permissions: string[] = req.admin?.permissions || [];
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.admin?.role) && !permissions.includes('treatment_journal.update')) {
      throw new ForbiddenException('Tài khoản chưa được cấp quyền thu hồi liên kết nhật ký.');
    }
    const { data, error } = await this.supabase.adminClient
      .from('treatment_journal')
      .update({ share_revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new BadRequestException(`Không thể thu hồi liên kết: ${error.message}`);
    if (!data) throw new BadRequestException('Không tìm thấy nhật ký điều trị.');
    return { data: true };
  }

  @Post('media/upload')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  @ApiBearerAuth()
  async uploadMedia(
    @UploadedFile() file: { buffer: Buffer; size: number; originalname: string; mimetype: string },
    @Req() req,
  ) {
    const permissions: string[] = req.admin?.permissions || [];
    const canUpload = ['ADMIN', 'SUPER_ADMIN'].includes(req.admin?.role) || permissions.some((permission) =>
      ['miniapp_shared_content.create', 'miniapp_shared_content.update', 'services.create', 'services.update', 'treatment_journal.create', 'treatment_journal.update'].includes(permission),
    );
    if (!canUpload) throw new ForbiddenException('Tài khoản chưa được cấp quyền tải tệp lên.');
    if (!file?.buffer?.length) throw new BadRequestException('Vui lòng chọn tệp cần tải lên.');

    const ext = file.originalname.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const allowedMimes: Record<string, string[]> = {
      pdf: ['application/pdf'],
      doc: ['application/msword'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
      xls: ['application/vnd.ms-excel'],
      xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      zip: ['application/zip', 'application/x-zip-compressed'],
      rar: ['application/x-rar-compressed', 'application/vnd.rar'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      png: ['image/png'],
      webp: ['image/webp'],
      gif: ['image/gif'],
      svg: ['image/svg+xml'],
    };

    const isDocument = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar'].includes(ext);
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);

    if (!isDocument && !isImage) {
      throw new BadRequestException('Định dạng tệp không được hỗ trợ.');
    }

    const validMimes = allowedMimes[ext] || [];
    if (!validMimes.includes(file.mimetype)) {
      throw new BadRequestException(`Phần mở rộng tệp (.${ext}) không khớp với định dạng nội dung MIME (${file.mimetype}).`);
    }

    const bucket = isDocument ? 'documents' : 'services';
    const objectPath = `admin/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const { error } = await this.supabase.adminClient.storage.from(bucket).upload(objectPath, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw new BadRequestException(`Không thể lưu tệp: ${error.message}`);

    if (isDocument) {
      const { data: signedData, error: signError } = await this.supabase.adminClient.storage
        .from(bucket)
        .createSignedUrl(objectPath, 3600);
      if (signError) throw new BadRequestException(`Lỗi tạo đường dẫn bảo mật cho tài liệu: ${signError.message}`);
      return {
        data: {
          url: signedData.signedUrl,
          path: objectPath,
          bucket,
          isPrivate: true,
          size: file.size,
        },
      };
    }

    const { data } = this.supabase.adminClient.storage.from(bucket).getPublicUrl(objectPath);
    return { data: { url: data.publicUrl, path: objectPath, bucket, isPrivate: false, size: file.size } };
  }

  @Get('documents/signed-url')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async getDocumentSignedUrl(@Query('path') pathStr: string) {
    if (!pathStr || typeof pathStr !== 'string') {
      throw new BadRequestException('Vui lòng cung cấp đường dẫn tệp tài liệu.');
    }
    const cleanPath = pathStr.replace(/^[/\\]+/, '').replace(/\.\./g, '');
    const { data, error } = await this.supabase.adminClient.storage
      .from('documents')
      .createSignedUrl(cleanPath, 3600);
    if (error || !data) {
      throw new NotFoundException(`Không thể tạo liên kết tải tài liệu: ${error?.message || 'Tệp không tồn tại'}`);
    }
    return { data: { signedUrl: data.signedUrl, expiresIn: 3600 } };
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
