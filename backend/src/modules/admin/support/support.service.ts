import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../database/supabase.service';
import { AdminDatabase } from '../admin.database';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';

export interface SystemDiagnosticResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'error';
    latencyMs: number;
    error?: string;
  };
  backend: {
    status: 'running';
    nodeVersion: string;
    memoryRssMb: number;
    memoryHeapMb: number;
  };
  integrations: {
    zaloZns: {
      status: 'configured' | 'unconfigured';
      appIdConfigured: boolean;
    };
    supabaseStorage: {
      status: 'accessible';
    };
  };
  appVersion: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly db: AdminDatabase,
    private readonly config: ConfigService,
  ) {}

  /**
   * 1. Chẩn đoán trạng thái hệ thống theo thời gian thực (Health & Latency Check)
   */
  async getDiagnostics(): Promise<SystemDiagnosticResult> {
    const start = Date.now();
    let dbStatus: 'connected' | 'error' = 'connected';
    let latencyMs = 0;
    let dbError: string | undefined;

    try {
      if (this.db?.connection) {
        await this.db.connection.query('SELECT 1');
        latencyMs = Math.max(1, Date.now() - start);
      } else {
        const { error } = await this.supabase.adminClient
          .from('system_settings')
          .select('category')
          .limit(1);
        if (error) throw error;
        latencyMs = Math.max(1, Date.now() - start);
      }
    } catch (err: any) {
      dbStatus = 'error';
      latencyMs = Date.now() - start;
      dbError = err?.message || 'Database connection error';
      this.logger.error(`Database health check failed: ${dbError}`);
    }

    const mem = process.memoryUsage();
    const hasZnsAppId = Boolean(
      this.config.get<string>('ZALO_ZNS_APP_ID') ||
        process.env.ZALO_ZNS_APP_ID,
    );

    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      dbStatus === 'error'
        ? 'unhealthy'
        : latencyMs > 800
        ? 'degraded'
        : 'healthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      backend: {
        status: 'running',
        nodeVersion: process.version,
        memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        memoryHeapMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      },
      integrations: {
        zaloZns: {
          status: hasZnsAppId ? 'configured' : 'unconfigured',
          appIdConfigured: hasZnsAppId,
        },
        supabaseStorage: {
          status: 'accessible',
        },
      },
      appVersion: 'v1.0.4',
    };
  }

  /**
   * 2. Lấy danh sách cẩm nang hướng dẫn vận hành SOP
   */
  async getGuides(module?: string, search?: string) {
    try {
      let query = this.supabase.adminClient
        .from('admin_sop_guides')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (module && module !== 'ALL') {
        query = query.eq('module', module);
      }

      if (search && search.trim()) {
        const keyword = search.trim();
        query = query.or(`title.ilike.%${keyword}%,summary.ilike.%${keyword}%`);
      }

      const { data, error } = await query;
      if (error) {
        this.logger.error(`Error loading SOP guides: ${error.message}`);
        throw new BadRequestException(`Không thể tải cẩm nang: ${error.message}`);
      }

      return data || [];
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      // Fallback query qua connection pool nếu Supabase client lỗi
      let sql = 'SELECT * FROM public.admin_sop_guides WHERE is_published = true';
      const params: any[] = [];
      if (module && module !== 'ALL') {
        params.push(module);
        sql += ` AND module = $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        sql += ` AND (title ILIKE $${params.length} OR summary ILIKE $${params.length})`;
      }
      sql += ' ORDER BY display_order ASC';

      const res = await this.db.connection.query(sql, params);
      return res.rows;
    }
  }

  /**
   * 3. Lấy danh sách phiếu hỗ trợ (Tickets) theo phân quyền
   */
  async getTickets(actor: any, queryDto: QueryTicketsDto) {
    if (!actor) {
      throw new ForbiddenException('Yêu cầu xác thực tài khoản.');
    }

    const isFullAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(actor.role);
    const isBranchManager = actor.role === 'BRANCH_MANAGER';

    try {
      let query = this.supabase.adminClient
        .from('admin_support_tickets')
        .select(`
          *,
          requester:users!admin_support_tickets_requester_id_fkey(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      // Phân quyền dữ liệu
      if (!isFullAdmin) {
        if (isBranchManager && actor.branchId) {
          query = query.or(`branch_id.eq.${actor.branchId},requester_id.eq.${actor.id}`);
        } else {
          query = query.eq('requester_id', actor.id);
        }
      }

      if (queryDto.status && queryDto.status !== 'ALL') {
        query = query.eq('status', queryDto.status);
      }

      if (queryDto.priority && queryDto.priority !== 'ALL') {
        query = query.eq('priority', queryDto.priority);
      }

      if (queryDto.category && queryDto.category !== 'ALL') {
        query = query.eq('category', queryDto.category);
      }

      if (queryDto.search && queryDto.search.trim()) {
        const keyword = queryDto.search.trim();
        query = query.or(`ticket_code.ilike.%${keyword}%,title.ilike.%${keyword}%`);
      }

      const { data, error } = await query;
      if (error) {
        this.logger.error(`Error querying tickets: ${error.message}`);
        // Fallback directly to PostgreSQL pool query
        return this.queryTicketsViaPool(actor, queryDto);
      }

      return data || [];
    } catch {
      return this.queryTicketsViaPool(actor, queryDto);
    }
  }

  private async queryTicketsViaPool(actor: any, queryDto: QueryTicketsDto) {
    const isFullAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(actor.role);
    const isBranchManager = actor.role === 'BRANCH_MANAGER';

    let sql = `
      SELECT t.*, 
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'phone', u.phone) as requester
      FROM public.admin_support_tickets t
      LEFT JOIN public.users u ON u.id = t.requester_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!isFullAdmin) {
      if (isBranchManager && actor.branchId) {
        params.push(actor.branchId, actor.id);
        sql += ` AND (t.branch_id = $${params.length - 1} OR t.requester_id = $${params.length})`;
      } else {
        params.push(actor.id);
        sql += ` AND t.requester_id = $${params.length}`;
      }
    }

    if (queryDto.status && queryDto.status !== 'ALL') {
      params.push(queryDto.status);
      sql += ` AND t.status = $${params.length}`;
    }

    if (queryDto.priority && queryDto.priority !== 'ALL') {
      params.push(queryDto.priority);
      sql += ` AND t.priority = $${params.length}`;
    }

    if (queryDto.category && queryDto.category !== 'ALL') {
      params.push(queryDto.category);
      sql += ` AND t.category = $${params.length}`;
    }

    if (queryDto.search && queryDto.search.trim()) {
      params.push(`%${queryDto.search.trim()}%`);
      sql += ` AND (t.ticket_code ILIKE $${params.length} OR t.title ILIKE $${params.length})`;
    }

    sql += ' ORDER BY t.created_at DESC';

    const res = await this.db.connection.query(sql, params);
    return res.rows;
  }

  /**
   * 4. Tạo phiếu hỗ trợ mới
   */
  async createTicket(actor: any, dto: CreateTicketDto) {
    if (!actor || !actor.id) {
      throw new ForbiddenException('Yêu cầu xác thực tài khoản để tạo phiếu hỗ trợ.');
    }

    const payload = {
      requester_id: actor.id,
      branch_id: actor.branchId || null,
      category: dto.category,
      priority: dto.priority || 'MEDIUM',
      title: dto.title.trim(),
      description: dto.description.trim(),
      attachments: dto.attachments || [],
      environment_info: {
        ...(dto.environment_info || {}),
        submitted_by_role: actor.role,
        submitted_at: new Date().toISOString(),
      },
      status: 'OPEN',
    };

    try {
      const { data, error } = await this.supabase.adminClient
        .from('admin_support_tickets')
        .insert(payload)
        .select()
        .single();

      if (error) {
        this.logger.error(`Supabase ticket insert error: ${error.message}`);
        throw error;
      }

      return data;
    } catch {
      // Fallback Postgres pool insert
      const sql = `
        INSERT INTO public.admin_support_tickets (
          requester_id, branch_id, category, priority, title, description, attachments, environment_info, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
        RETURNING *;
      `;
      const values = [
        payload.requester_id,
        payload.branch_id,
        payload.category,
        payload.priority,
        payload.title,
        payload.description,
        JSON.stringify(payload.attachments),
        JSON.stringify(payload.environment_info),
      ];

      const res = await this.db.connection.query(sql, values);
      return res.rows[0];
    }
  }

  /**
   * 5. Lấy chi tiết một phiếu hỗ trợ
   */
  async getTicketById(actor: any, id: string) {
    if (!actor) {
      throw new ForbiddenException('Yêu cầu xác thực.');
    }

    const isFullAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(actor.role);

    const sql = `
      SELECT t.*, 
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'phone', u.phone) as requester
      FROM public.admin_support_tickets t
      LEFT JOIN public.users u ON u.id = t.requester_id
      WHERE t.id = $1
    `;
    const res = await this.db.connection.query(sql, [id]);
    if (!res.rows.length) {
      throw new NotFoundException(`Không tìm thấy phiếu hỗ trợ với mã ${id}`);
    }

    const ticket = res.rows[0];
    if (!isFullAdmin && ticket.requester_id !== actor.id && ticket.branch_id !== actor.branchId) {
      throw new ForbiddenException('Bạn không có quyền xem phiếu hỗ trợ này.');
    }

    return ticket;
  }

  /**
   * 6. Cập nhật phiếu hỗ trợ (chỉ Quản lý / Admin)
   */
  async updateTicket(actor: any, id: string, dto: UpdateTicketDto) {
    if (!actor) {
      throw new ForbiddenException('Yêu cầu xác thực.');
    }

    const isFullAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(actor.role);
    if (!isFullAdmin) {
      throw new ForbiddenException('Chỉ Quản trị viên mới có quyền cập nhật phiếu hỗ trợ.');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (dto.status) {
      values.push(dto.status);
      updates.push(`status = $${values.length}`);

      if (['RESOLVED', 'CLOSED'].includes(dto.status)) {
        updates.push(`resolved_at = timezone('utc'::text, now())`);
      }
    }

    if (dto.priority) {
      values.push(dto.priority);
      updates.push(`priority = $${values.length}`);
    }

    if (dto.admin_reply !== undefined) {
      values.push(dto.admin_reply);
      updates.push(`admin_reply = $${values.length}`);
    }

    if (dto.assigned_to !== undefined) {
      values.push(dto.assigned_to);
      updates.push(`assigned_to = $${values.length}`);
    }

    if (!updates.length) {
      return this.getTicketById(actor, id);
    }

    values.push(id);
    const sql = `
      UPDATE public.admin_support_tickets
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const res = await this.db.connection.query(sql, values);
    if (!res.rows.length) {
      throw new NotFoundException(`Không tìm thấy phiếu hỗ trợ với mã ${id}`);
    }

    return res.rows[0];
  }

  async getCustomerTickets(actor: any, status?: string, search?: string) {
    if (!actor || !['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'].includes(actor.role)) {
      throw new ForbiddenException('Bạn không có quyền xem phiếu hỗ trợ khách hàng.');
    }

    let sql = `
      SELECT st.*,
        json_build_object('id', u.id, 'full_name', u.full_name, 'phone', u.phone, 'email', u.email) AS customer
      FROM public.support_tickets st
      LEFT JOIN public.users u ON u.id = st.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND st.status::text = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (st.subject ILIKE $${params.length} OR st.message ILIKE $${params.length} OR coalesce(u.full_name,'') ILIKE $${params.length} OR coalesce(u.phone,'') ILIKE $${params.length})`;
    }
    sql += ' ORDER BY st.created_at DESC LIMIT 200';
    const res = await this.db.connection.query(sql, params);
    return res.rows;
  }

  async updateCustomerTicket(actor: any, id: string, body: { status?: string; admin_reply?: string }) {
    if (!actor || !['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'].includes(actor.role)) {
      throw new ForbiddenException('Bạn không có quyền xử lý phiếu hỗ trợ khách hàng.');
    }
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      throw new BadRequestException('Mã phiếu hỗ trợ không hợp lệ.');
    }
    const updates: string[] = [];
    const params: any[] = [];
    if (body?.status) {
      const normalized = String(body.status).trim().toUpperCase();
      if (!['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(normalized)) {
        throw new BadRequestException('Trạng thái phiếu không hợp lệ.');
      }
      params.push(normalized);
      updates.push(`status = $${params.length}::ticket_status`);
      if (['RESOLVED', 'CLOSED'].includes(normalized)) {
        updates.push(`resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)`);
      }
    }
    if (typeof body?.admin_reply === 'string') {
      params.push(body.admin_reply.trim().slice(0, 2000));
      updates.push(`admin_reply = $${params.length}`);
    }
    if (!updates.length) {
      throw new BadRequestException('Không có thông tin cần cập nhật.');
    }
    params.push(id);
    const res = await this.db.connection.query(
      `UPDATE public.support_tickets SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (!res.rows.length) {
      throw new NotFoundException(`Không tìm thấy phiếu hỗ trợ khách hàng ${id}.`);
    }
    return res.rows[0];
  }
}
