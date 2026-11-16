import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import {
  BadGatewayException, BadRequestException, Body, Controller, ForbiddenException,
  Get, Header, Post, Req, ServiceUnavailableException, UseFilters, UseGuards,
} from '@nestjs/common';
import { AdminDatabase } from './admin.database';
import { AdminExceptionFilter } from './admin.filter';
import { AdminGuard } from './admin.guard';

const api = 'https://api.canva.com/rest/v1';
const requiredLabels = ['STUDENT_NAME', 'COURSE_TITLE', 'CERTIFICATE_CODE', 'ISSUE_DATE'];
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
type Operator = { admin?: { id: string; role: string } };
type Tokens = { access: string; refresh: string; expiresAt: number };
type JobTicket = { actor: string; phase: 'autofill' | 'export'; jobId: string; designId?: string; certificateId?: string; until: number };
type CanvaJob = { id?: string; status?: string; result?: { design?: { id?: string } }; urls?: string[] };

function trustedUrl(value: string, host: string) {
  try {
    const url = new URL(value);
    return url.origin === `https://${host}` && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

@Controller('admin/certificates/canva')
@UseGuards(AdminGuard)
@UseFilters(AdminExceptionFilter)
export class CanvaCertificatesController {
  constructor(private readonly db: AdminDatabase) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status(@Req() request: Operator) {
    const actor = this.operator(request);
    const configured = this.configured();
    if (!configured) return { configured, connected: false };
    const { rows } = await this.db.connection.query(
      'SELECT credentials IS NOT NULL AS connected FROM mld_private.canva_certificate_connections WHERE admin_id=$1', [actor],
    );
    const designId = this.sourceId();
    return { configured, connected: !!rows[0]?.connected, designId };
  }

  @Post('connect')
  @Header('Cache-Control', 'no-store')
  async connect(@Req() request: Operator) {
    const actor = this.operator(request);
    const { clientId, redirect } = this.configuration();
    const verifier = randomBytes(48).toString('base64url');
    const state = randomBytes(32).toString('base64url');
    await this.db.connection.query(
      `INSERT INTO mld_private.canva_certificate_connections(admin_id,oauth_state,oauth_verifier,oauth_expires_at)
       VALUES($1,$2,$3,now()+interval '10 minutes')
       ON CONFLICT(admin_id) DO UPDATE SET oauth_state=EXCLUDED.oauth_state,
         oauth_verifier=EXCLUDED.oauth_verifier,oauth_expires_at=EXCLUDED.oauth_expires_at`,
      [actor, state, this.seal(verifier)],
    );
    const query = new URLSearchParams({
      response_type: 'code', client_id: clientId, redirect_uri: redirect, state,
      code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      scope: 'design:content:read design:content:write',
    });
    return { url: `https://www.canva.com/api/oauth/authorize?${query}` };
  }

  @Post('connect/complete')
  @Header('Cache-Control', 'no-store')
  async complete(@Req() request: Operator, @Body() body: { state?: string; code?: string }) {
    const actor = this.operator(request);
    const { redirect } = this.configuration();
    if (typeof body?.state !== 'string' || !/^[\w-]{43}$/.test(body.state) ||
        typeof body.code !== 'string' || !body.code || body.code.length > 2048)
      throw new BadRequestException('Phản hồi kết nối Canva không hợp lệ.');
    const { rows } = await this.db.connection.query(
      `UPDATE mld_private.canva_certificate_connections SET oauth_state=NULL,oauth_expires_at=NULL
       WHERE admin_id=$1 AND oauth_state=$2 AND oauth_expires_at>now() RETURNING oauth_verifier`,
      [actor, body.state],
    );
    if (!rows[0]?.oauth_verifier) throw new BadRequestException('Phiên kết nối đã hết hạn. Hãy kết nối Canva lại.');
    const credentials = await this.exchange({
      grant_type: 'authorization_code', code: body.code, redirect_uri: redirect,
      code_verifier: this.unseal(rows[0].oauth_verifier),
    });
    const saved = await this.db.connection.query(
      `UPDATE mld_private.canva_certificate_connections SET credentials=$2,oauth_verifier=NULL
       WHERE admin_id=$1 AND oauth_verifier=$3`,
      [actor, this.seal(credentials), rows[0].oauth_verifier],
    );
    if (!saved.rowCount) throw new BadRequestException('Có yêu cầu kết nối mới hơn. Hãy kiểm tra lại.');
    return { connected: true };
  }

  @Post('generate')
  @Header('Cache-Control', 'no-store')
  async generate(@Req() request: Operator, @Body() body: { certificateId?: string }) {
    const actor = this.operator(request);
    const designId = this.sourceId();
    const fields = await this.fields(body?.certificateId);
    const token = await this.access(actor);
    const { dataset } = await this.canva<{ dataset?: Record<string, { type: string }> }>(`/designs/${designId}/dataset`, token);
    const missing = requiredLabels.filter(key => dataset?.[key]?.type !== 'text');
    if (missing.length) throw new BadRequestException(`Thiết kế Canva thiếu nhãn văn bản ${missing.join(', ')}.`);
    const data = Object.fromEntries(Object.entries(fields).filter(([key]) => dataset?.[key]?.type === 'text')
      .map(([key, text]) => [key, { type: 'text', text }]));
    const { job } = await this.canva<{ job: CanvaJob }>('/autofills', token, {
      type: 'create_from_design', design_id: designId, data,
      title: body?.certificateId ? `MLD · ${fields.CERTIFICATE_CODE}` : 'MLD · Phôi kiểm thử',
    });
    return { ticket: this.jobTicket({ actor, phase: 'autofill', jobId: job?.id,
      certificateId: body?.certificateId, until: Date.now() + 15 * 60_000 }) };
  }

  @Post('progress')
  @Header('Cache-Control', 'no-store')
  async progress(@Req() request: Operator, @Body() body: { ticket?: string }) {
    const actor = this.operator(request);
    let ticket: JobTicket;
    try {
      if (typeof body?.ticket !== 'string' || body.ticket.length > 4096) throw new Error();
      ticket = this.unseal(body.ticket);
      if (ticket.actor !== actor || ticket.until <= Date.now() || !['autofill', 'export'].includes(ticket.phase) ||
          !/^[\w-]+$/.test(ticket.jobId)) throw new Error();
    } catch { throw new BadRequestException('Phiên tạo PDF không hợp lệ hoặc đã hết hạn.'); }
    if (ticket.certificateId) await this.fields(ticket.certificateId);
    const token = await this.access(actor);
    const { job } = await this.canva<{ job: CanvaJob }>(`/${ticket.phase === 'autofill' ? 'autofills' : 'exports'}/${ticket.jobId}`, token);
    if (job?.status === 'in_progress') return { ticket: body.ticket };
    if (job?.status !== 'success') throw new BadGatewayException('Canva chưa thể tạo chứng nhận. Kiểm tra quyền, phôi và gói Canva.');
    if (ticket.phase === 'autofill') {
      const designId = job.result?.design?.id;
      if (!designId || !/^[\w-]+$/.test(designId)) throw new BadGatewayException('Canva chưa trả thiết kế hoàn chỉnh.');
      const { job: exportJob } = await this.canva<{ job: CanvaJob }>('/exports', token, {
        design_id: designId, format: { type: 'pdf', pages: [1] },
      });
      return { ticket: this.jobTicket({ ...ticket, phase: 'export', jobId: exportJob?.id, designId }) };
    }
    const pdfUrl = trustedUrl(job.urls?.[0] ?? '', 'export-download.canva.com');
    if (!pdfUrl) throw new BadGatewayException('Canva chưa trả liên kết tải PDF hợp lệ.');
    return { pdfUrl, designUrl: `https://www.canva.com/design/${ticket.designId}/edit` };
  }

  private async fields(id?: string): Promise<Record<string, string>> {
    if (id === undefined) return {
      STUDENT_NAME: 'HỌ VÀ TÊN HỌC VIÊN', COURSE_TITLE: 'Chương trình đào tạo mẫu',
      CERTIFICATE_CODE: 'BẢN MẪU', STUDENT_CODE: 'HV-MẪU', ISSUE_DATE: '01/01/2026', DATE_OF_BIRTH: '01/01/2000',
      SIGNER_NAME: 'Người ký mẫu', SIGNER_TITLE: 'Giám đốc', FINAL_GRADE: 'Giỏi',
    };
    if (typeof id !== 'string' || !uuid.test(id)) throw new BadRequestException('Mã chứng nhận không hợp lệ.');
    const { rows } = await this.db.connection.query(
      `SELECT to_jsonb(c) AS certificate, to_jsonb(e)->>'order_code' AS student_code
       FROM public.student_certificates c LEFT JOIN public.course_enrollments e ON e.id=c.enrollment_id
       WHERE c.id=$1 AND c.status='ISSUED'`, [id],
    );
    const row = rows[0]?.certificate;
    if (!row) throw new BadRequestException('Chỉ xuất Canva cho chứng nhận đã phát hành.');
    const date = (value?: string) => value?.slice(0, 10).split('-').reverse().join('/') || '—';
    return {
      STUDENT_NAME: row.student_name, COURSE_TITLE: row.course_title, CERTIFICATE_CODE: row.certificate_code,
      STUDENT_CODE: rows[0].student_code || '—',
      ISSUE_DATE: date(row.issue_date), DATE_OF_BIRTH: date(row.date_of_birth), SIGNER_NAME: row.signer_name || '—',
      SIGNER_TITLE: row.signer_title || '—', FINAL_GRADE: row.final_grade || '—',
    };
  }

  private operator(request: Operator) {
    if (!request.admin?.id || !['ADMIN', 'SUPER_ADMIN'].includes(request.admin.role))
      throw new ForbiddenException('Chỉ quản trị viên toàn hệ thống được sử dụng Canva cho chứng nhận.');
    return request.admin.id;
  }

  private sourceId() {
    const id = process.env.CANVA_CERTIFICATE_DESIGN_ID?.trim();
    if (!id || !/^[\w-]{1,100}$/.test(id)) throw new ServiceUnavailableException('Cần cấu hình ID thiết kế phôi Canva.');
    return id;
  }

  private configured() {
    return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET &&
      process.env.CANVA_REDIRECT_URI && process.env.CANVA_CERTIFICATE_DESIGN_ID);
  }

  private configuration() {
    if (!this.configured()) throw new ServiceUnavailableException('Chưa cấu hình kết nối Canva trên máy chủ.');
    return { clientId: process.env.CANVA_CLIENT_ID!, secret: process.env.CANVA_CLIENT_SECRET!, redirect: process.env.CANVA_REDIRECT_URI! };
  }

  private key() {
    return createHash('sha256').update('mld-canva-certificate-v1\0').update(this.configuration().secret).digest();
  }

  private seal(value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  }

  private unseal(value: string) {
    const data = Buffer.from(value, 'base64url');
    const cipher = createDecipheriv('aes-256-gcm', this.key(), data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString());
  }

  private jobTicket(ticket: Omit<JobTicket, 'jobId'> & { jobId?: string }) {
    if (!ticket.jobId || !/^[\w-]+$/.test(ticket.jobId)) throw new BadGatewayException('Canva chưa trả mã xử lý hợp lệ.');
    return this.seal(ticket);
  }

  private async exchange(form: Record<string, string>): Promise<Tokens> {
    const { clientId, secret } = this.configuration();
    const result = await this.request<{ access_token?: string; refresh_token?: string; expires_in?: number }>('/oauth/token', {
      method: 'POST', headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      }, body: new URLSearchParams(form),
    });
    if (!result.access_token || !result.refresh_token || !result.expires_in)
      throw new BadGatewayException('Canva chưa trả thông tin đăng nhập hợp lệ.');
    return { access: result.access_token, refresh: result.refresh_token, expiresAt: Date.now() + result.expires_in * 1000 };
  }

  private async access(actor: string) {
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT credentials FROM mld_private.canva_certificate_connections WHERE admin_id=$1 FOR UPDATE', [actor],
      );
      if (!rows[0]?.credentials) throw new BadRequestException('Hãy kết nối tài khoản Canva trước.');
      let tokens: Tokens;
      try { tokens = this.unseal(rows[0].credentials); }
      catch { throw new BadRequestException('Kết nối Canva cần được cấp quyền lại.'); }
      if (tokens.expiresAt < Date.now() + 60_000) {
        tokens = await this.exchange({ grant_type: 'refresh_token', refresh_token: tokens.refresh });
        await client.query('UPDATE mld_private.canva_certificate_connections SET credentials=$2 WHERE admin_id=$1',
          [actor, this.seal(tokens)]);
      }
      await client.query('COMMIT');
      return tokens.access;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  private canva<T>(path: string, token: string, body?: unknown) {
    return this.request<T>(path, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(api + path, { ...init, redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (response.ok) return await response.json() as T;
    } catch { throw new BadGatewayException('Không thể kết nối Canva. Hãy kiểm tra lại trước khi gửi lại.'); }
    const hint = response.status === 401 ? ' Hãy kết nối lại tài khoản Canva.' : ' Kiểm tra quyền và thiết kế phôi.';
    throw new BadGatewayException(`Canva trả lỗi ${response.status}.${hint}`);
  }
}
