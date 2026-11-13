import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PoolClient } from 'pg';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { AdminDatabase } from './admin.database';
import { inspectAdminSchema } from './admin.schema';
import { createTreatmentBooking } from './treatment-booking';
import { validateStaffWorkflow } from './staff-workflow';
import { assignStaffBooking, createStaffBooking, scheduleAvailability } from './staff-booking';
import { recordMaterialCount, syncInventoryItem } from './treatment-inventory';
import { enrichReferenceLabels } from './admin.labels';
import { allowedBranches, branchPredicate, assertRowScope, assertCashierBranch, packageBranchIdsSql } from './admin.scope';
import {
  ADMIN_RESOURCES,
  COMPUTED_COLUMNS,
  GENERATED_COLUMNS,
  HIDDEN_COLUMNS,
  SYSTEM_COLUMNS,
  quote,
} from './admin.resources';

const SYSTEM_GUEST_CUSTOMER_ID = process.env.ADMIN_GUEST_CUSTOMER_ID || 'bbbbbbbb-0001-0001-0001-000000000001';

export interface Column {
  defaultValue?: string | null;
  name: string;
  type: string;
  required: boolean;
  hasDefault: boolean;
  maxLength: number | null;
  options: string[];
  primary: boolean;
  reference: { table: string; column: string } | null;
  writable: boolean;
}
export interface AdminActor {
  id: string;
  role: string;
  full_name?: string;
  permissions?: string[];
  scopes?: Array<{ permission: string; branchId: string | null }>;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(
    private readonly db: AdminDatabase,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async schemaStatus() {
    return inspectAdminSchema(this.db.connection);
  }

  async assertJournalAccess(actor: AdminActor, id: string) {
    if (!this.isUuid(id)) throw new BadRequestException('Nhật ký không hợp lệ.');
    const branches = allowedBranches(actor, 'treatment_journal.update');
    const rows = (await this.db.connection.query(
      `SELECT DISTINCT branch_id FROM (
         SELECT b.branch_id FROM treatment_journal j JOIN bookings b ON b.id=j.booking_id WHERE j.id=$1
         UNION
         SELECT i.branch_id FROM treatment_journal j JOIN invoices i ON i.user_package_id=j.user_package_id WHERE j.id=$1
       ) scoped`, [id],
    )).rows;
    if (!rows.length) throw new NotFoundException('Không tìm thấy nhật ký có chi nhánh hợp lệ.');
    if (branches !== null && !rows.some(row => branches.includes(row.branch_id)))
      throw new ForbiddenException('Nhật ký không thuộc chi nhánh được cấp quyền.');
  }

  async assertDocumentAccess(actor: AdminActor, pathStr: string) {
    if (!pathStr || typeof pathStr !== 'string') {
      throw new BadRequestException('Vui lòng cung cấp đường dẫn tệp tài liệu.');
    }
    if (['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) return;

    const hasGeneralPerm = actor.permissions?.some(p => ['documents.read', 'portal_content.read', 'courses.read'].includes(p));
    if (hasGeneralPerm) return;

    let allowed = false;
    try {
      const branches = allowedBranches(actor, 'treatment_journal.read');
      if (branches === null) {
        allowed = true;
      } else if (branches.length) {
        const check = await this.db.connection.query(
          `SELECT 1 FROM treatment_journal j
           JOIN bookings b ON b.id=j.booking_id
           WHERE b.branch_id=ANY($1::uuid[]) AND (
             j.before_photos::text LIKE '%' || $2 || '%' OR
             j.after_photos::text LIKE '%' || $2 || '%' OR
             j.treatment_notes LIKE '%' || $2 || '%'
           ) LIMIT 1`,
          [branches, pathStr],
        );
        if (check.rowCount) allowed = true;
      }
    } catch {}

    if (!allowed) {
      const publicDoc = await this.db.connection.query(
        `SELECT 1 FROM portal_content WHERE (file_url LIKE '%' || $1 || '%' OR content LIKE '%' || $1 || '%')
         UNION
         SELECT 1 FROM home_care_guidelines WHERE (media::text LIKE '%' || $1 || '%' OR image_url LIKE '%' || $1 || '%')
         LIMIT 1`,
        [pathStr],
      );
      if (publicDoc.rowCount) allowed = true;
    }

    if (!allowed) {
      throw new ForbiddenException('Tài liệu riêng tư hoặc chưa được phân quyền cho nhân viên.');
    }
  }

  resource(table: string, actor: AdminActor, write = false) {
    const resource =
      Object.prototype.hasOwnProperty.call(ADMIN_RESOURCES, table) &&
      ADMIN_RESOURCES[table];
    if (!resource) throw new NotFoundException('Phân hệ không tồn tại.');
    if (resource.group === 'Phân quyền' && actor.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Chỉ SUPER_ADMIN được quản lý phân quyền.');
    if (write && resource.readonly)
      throw new ForbiddenException('Sổ lịch sử chỉ được xem.');
    return resource;
  }

  async login(body: { identifier?: string; password?: string }, ip: string) {
    const identifier =
      typeof body?.identifier === 'string' ? body.identifier.trim() : '';
    if (
      !identifier ||
      typeof body.password !== 'string' ||
      body.password.length > 256 ||
      identifier.length > 255
    )
      throw new BadRequestException('Nhập tài khoản và mật khẩu hợp lệ.');
    const key = ip;
    const now = Date.now();
    for (const [k, v] of this.attempts)
      if (v.until < now) this.attempts.delete(k);
    if (this.attempts.size > 10000)
      throw new HttpException('Vui lòng thử lại sau.', 429);
    const entry = this.attempts.get(key) || {
      count: 0,
      until: now + 15 * 60000,
    };
    if (entry.count >= 10)
      throw new HttpException(
        'Quá nhiều lần đăng nhập. Thử lại sau 15 phút.',
        429,
      );
    entry.count++;
    this.attempts.set(key, entry);
    const secret = this.config.get<string>('JWT_SECRET');
    if (
      !secret ||
      secret.length < 32 ||
      secret === 'super-secret-jwt-key-medical-healthcare-2026'
    )
      throw new ServiceUnavailableException(
        'Cần cấu hình JWT_SECRET riêng, ít nhất 32 ký tự.',
      );
    const { rows } = await this.db.connection.query(
      'SELECT id,full_name,role,is_active,password_hash FROM users WHERE phone=$1 OR email=$1 LIMIT 1',
      [identifier],
    );
    const user = rows[0];
    const hash =
      user?.password_hash ||
      '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const valid = await bcrypt.compare(body.password, hash).catch(() => false);
    let granted = false;
    if (
      valid &&
      user?.is_active &&
      !['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    ) {
      const grants = await this.db.connection.query(
        'SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id WHERE ur.user_id=$1 AND ur.branch_id IS NULL LIMIT 1',
        [user.id],
      );
      granted = !!grants.rowCount;
    }
    if (
      !valid ||
      !user?.is_active ||
      (!['ADMIN', 'SUPER_ADMIN'].includes(user.role) && !granted)
    )
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu quản trị không chính xác.',
      );
    this.attempts.delete(key);
    return {
      accessToken: this.jwt.sign(
        { sub: user.id },
        { secret, audience: 'mld-admin', expiresIn: '2h' },
      ),
      user: { id: user.id, full_name: user.full_name, role: user.role },
    };
  }

  async columns(table: string, actor: AdminActor): Promise<Column[]> {
    this.resource(table, actor);
    const { rows } = await this.db.connection.query(
      `
      SELECT a.attname AS name, t.typname AS type, a.attnotnull AS required,
        a.atthasdef AS "hasDefault", CASE WHEN t.typname='varchar' THEN a.atttypmod-4 ELSE NULL END AS "maxLength",
        COALESCE((SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid),'[]') AS options,
        CASE WHEN t.typname='bool' THEN (SELECT pg_get_expr(d.adbin,d.adrelid) FROM pg_attrdef d WHERE d.adrelid=c.oid AND d.adnum=a.attnum) ELSE NULL END AS "defaultValue",
        EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='p' AND a.attnum=ANY(k.conkey)) AS primary,
        (SELECT json_build_object('table',fc.relname,'column',fa.attname)
          FROM pg_constraint fk JOIN pg_class fc ON fc.oid=fk.confrelid
          JOIN pg_attribute fa ON fa.attrelid=fc.oid AND fa.attnum=fk.confkey[array_position(fk.conkey,a.attnum)]
          WHERE fk.conrelid=c.oid AND fk.contype='f' AND a.attnum=ANY(fk.conkey) LIMIT 1) AS reference
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid
      WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`,
      [table],
    );
    if (!rows.length)
      throw new ServiceUnavailableException(
        'Database chung chưa có bảng ' +
          table +
          '. Cần chủ database kiểm tra schema, không tự tạo dữ liệu mẫu.',
      );
    const columns: Column[] = rows
      .filter((c) => !HIDDEN_COLUMNS.has(c.name))
      .map((c) => ({
        ...c,
        writable:
          !SYSTEM_COLUMNS.has(c.name) &&
          !COMPUTED_COLUMNS.has(c.name) &&
          !GENERATED_COLUMNS.has(c.name) &&
          !(table === 'course_quizzes' && c.name === 'total_questions') &&
          !(c.primary && c.hasDefault),
      }));
    if (table === 'academy_enrollment_funnel') {
      const pk = columns.find((c) => c.name === 'course_id');
      if (pk) pk.primary = true;
    }
    if (table === 'staff_profiles')
      columns.push({
        name: 'full_name',
        type: 'varchar',
        required: false,
        hasDefault: false,
        maxLength: 150,
        options: [],
        primary: false,
        reference: null,
        writable: false,
      });
    return columns;
  }

  async catalog(actor: AdminActor) {
    const full = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
    return Object.entries(ADMIN_RESOURCES)
      .filter(
        ([name, r]) =>
          (r.group !== 'Phân quyền' || actor.role === 'SUPER_ADMIN') &&
          (full || actor.permissions?.includes(`${name}.read`)),
      )
      .map(([name, resource]) => ({
        name,
        ...resource,
        actions: resource.readonly
          ? []
          : (resource.actions || ['create', 'update', 'delete', 'action']).filter(
              (action) =>
                full || actor.permissions?.includes(`${name}.${action}`),
            ),
      }));
  }

  async summary(from: string, to: string) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to || '') ||
      from > to
    )
      throw new BadRequestException('Khoảng ngày không hợp lệ.');
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const result = await client.query(
        `SELECT
        (SELECT coalesce(sum(CASE WHEN payment_status='REFUNDED' THEN 0 ELSE total_amount - coalesce(refund_amount, 0) END),0)::text FROM invoices WHERE payment_status IN ('PAID', 'REFUNDED') AND enrollment_id IS NULL AND paid_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND paid_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')) AS "invoiceRevenue",
        (SELECT coalesce(sum(CASE WHEN transaction_type='REFUND' THEN -amount ELSE amount END),0)::text FROM tuition_transactions WHERE payment_status='PAID' AND paid_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND paid_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')) AS "tuitionRevenue",
        (SELECT count(*)::int FROM bookings WHERE booking_date BETWEEN $1::date AND $2::date) AS "bookingCount",
        (SELECT count(*)::int FROM users WHERE role='CUSTOMER') AS "customerCount",
        (SELECT count(*)::int FROM course_enrollments) AS "enrollmentCount"`,
        [from, to],
      );
      const upcoming = await client.query(
        `SELECT b.id,b.booking_code,b.booking_date::text,b.start_time,b.status,u.full_name AS customer_name,r.name AS branch_name FROM bookings b JOIN users u ON u.id=b.customer_id JOIN branches r ON r.id=b.branch_id WHERE b.booking_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') ORDER BY b.booking_date,b.start_time LIMIT 12`,
      );
      await client.query('COMMIT');
      return { ...result.rows[0], upcoming: upcoming.rows };
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  async list(table: string, actor: AdminActor, query: Record<string, string>) {
    const columns = await this.columns(table, actor);
    const expression = (name: string) =>
      table === 'staff_profiles' && name === 'full_name'
        ? '(SELECT u.full_name FROM public.users u WHERE u.id="staff_profiles".user_id)'
        : quote(name);
    let page = Math.max(1, Math.min(100000, Number(query.page) || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    if (!Number.isInteger(page) || !Number.isInteger(limit))
      throw new BadRequestException('Phân trang không hợp lệ.');
    const values: unknown[] = [];
    const where: string[] = [];
    const scopedBranches = allowedBranches(actor, `${table}.read`);
    if (scopedBranches !== null) {
      values.push(scopedBranches);
      where.push(branchPredicate(table, quote(table), `$${values.length}`, columns.map(column => column.name)));
    }
    if (table === 'users' && query.staffCandidates === '1') {
      where.push("is_active AND role::text NOT IN ('CUSTOMER','STUDENT','GUEST') AND NOT EXISTS (SELECT 1 FROM staff_profiles p WHERE p.user_id=users.id)");
    }
    if (query.search?.trim()) {
      const text = columns.filter((c) =>
        ['varchar', 'text', 'uuid'].includes(c.type),
      );
      if (text.length) {
        values.push(
          '%' +
            query.search
              .trim()
              .slice(0, 200)
              .replace(/[\\%_]/g, '\\$&') +
            '%',
        );
        const predicates = text.map((c) => `${expression(c.name)}::text ILIKE $${values.length}`);
        if (table === 'staff_profiles') {
          predicates.push(`EXISTS (SELECT 1 FROM public.users u WHERE u.id="staff_profiles".user_id AND u.full_name ILIKE $${values.length})`);
          predicates.push(`EXISTS (SELECT 1 FROM public.branches b WHERE b.id="staff_profiles".branch_id AND b.name ILIKE $${values.length})`);
        }
        where.push('(' + predicates.join(' OR ') + ')');
      }
    }
    if (query.filter) {
      let filters: Record<string, unknown>;
      try {
        filters = JSON.parse(query.filter);
      } catch {
        throw new BadRequestException('Bộ lọc không hợp lệ.');
      }
      if (!filters || typeof filters !== 'object' || Array.isArray(filters))
        throw new BadRequestException('Bộ lọc không hợp lệ.');
      for (const [name, value] of Object.entries(filters)) {
        // The class selector uses this sentinel for an unfiltered listing,
        // including attendance/grades whose batch relation is indirect.
        if (name === 'batch_id' && value === '__ALL__' &&
          ['course_enrollments', 'student_attendance', 'student_academic_records'].includes(table)) continue;
        if (!columns.some((c) => c.name === name) || typeof value === 'object')
          throw new BadRequestException('Trường lọc không hợp lệ.');
        values.push(value);
        where.push(`${expression(name)}=$${values.length}`);
      }
    }
    if (actor.role === 'INSTRUCTOR' && ['course_batches', 'course_batch_assistants', 'student_academic_records', 'student_attendance'].includes(table)) {
      values.push(actor.id);
      const actorParam = `$${values.length}`;
      if (table === 'course_batches') {
        where.push(`(EXISTS (SELECT 1 FROM public.instructors i WHERE i.id=course_batches.instructor_id AND i.user_id=${actorParam}) OR EXISTS (SELECT 1 FROM public.course_batch_assistants a JOIN public.instructors i ON i.id=a.instructor_id WHERE a.batch_id=course_batches.id AND i.user_id=${actorParam}))`);
      } else if (table === 'course_batch_assistants') {
        where.push(`(EXISTS (SELECT 1 FROM public.instructors i WHERE i.id=course_batch_assistants.instructor_id AND i.user_id=${actorParam}) OR EXISTS (SELECT 1 FROM public.course_batches b JOIN public.instructors i ON i.id=b.instructor_id WHERE b.id=course_batch_assistants.batch_id AND i.user_id=${actorParam}))`);
      } else if (table === 'student_academic_records') {
        where.push(`EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id=student_academic_records.enrollment_id AND (EXISTS (SELECT 1 FROM public.course_batches b JOIN public.instructors i ON i.id=b.instructor_id WHERE b.id=e.batch_id AND i.user_id=${actorParam}) OR EXISTS (SELECT 1 FROM public.course_batch_assistants a JOIN public.instructors i ON i.id=a.instructor_id WHERE a.batch_id=e.batch_id AND a.can_enter_grades AND i.user_id=${actorParam})))`);
      } else if (table === 'student_attendance') {
        where.push(`EXISTS (SELECT 1 FROM public.batch_schedules s WHERE s.id=student_attendance.schedule_id AND (EXISTS (SELECT 1 FROM public.course_batches b JOIN public.instructors i ON i.id=b.instructor_id WHERE b.id=s.batch_id AND i.user_id=${actorParam}) OR EXISTS (SELECT 1 FROM public.course_batch_assistants a JOIN public.instructors i ON i.id=a.instructor_id WHERE a.batch_id=s.batch_id AND a.can_mark_attendance AND i.user_id=${actorParam})))`);
      }
    }
    const clause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const order =
      columns.find((c) => c.name === query.sort) ||
      columns.find((c) => c.name === 'created_at') ||
      columns.find((c) => c.primary) ||
      columns[0];
    const selected = columns
      .map((c) =>
        c.type === 'date'
          ? `${quote(c.name)}::text AS ${quote(c.name)}`
          : `${expression(c.name)} AS ${quote(c.name)}`,
      )
      .join(',');
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const count = await client.query(
        `SELECT count(*)::int AS total FROM public.${quote(table)}${clause}`,
        values,
      );
      page = Math.min(page, Math.max(1, Math.ceil(count.rows[0].total / limit)));
      const data = await client.query(
        `SELECT ${selected} FROM public.${quote(table)}${clause} ORDER BY ${quote(order.name)} ${query.direction === 'asc' ? 'ASC' : 'DESC'}${columns
          .filter((c) => c.primary && c.name !== order.name)
          .map((c) => ',' + quote(c.name))
          .join('')} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, (page - 1) * limit],
      );
      await enrichReferenceLabels(client, columns, data.rows);
      if (table === 'user_packages' && data.rows.length) {
        const context = await client.query(
          `SELECT up.id, tp.service_id, s.name AS service_name,
             (SELECT jsonb_build_object('id',bk.id,'code',bk.booking_code,'date',bk.booking_date,'time',bk.start_time,'branch',br.name)
              FROM bookings bk JOIN branches br ON br.id=bk.branch_id
              WHERE bk.customer_id=up.customer_id AND bk.special_notes LIKE ('%user_package_id=' || up.id::text || ']%')
                AND bk.booking_date>=CURRENT_DATE AND bk.status::text IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE','IN_PROGRESS')
              ORDER BY bk.booking_date,bk.start_time LIMIT 1) AS next_booking,
             COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'name',b.name))
               FROM branches b WHERE b.id IN (${packageBranchIdsSql('up')})), '[]'::jsonb) AS package_branches
           FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id
           LEFT JOIN services s ON s.id=tp.service_id WHERE up.id=ANY($1::uuid[])`,
          [data.rows.map(row => row.id)],
        );
        const contexts = new Map(context.rows.map(row => [row.id, row]));
        for (const row of data.rows) Object.assign(row, contexts.get(row.id) || {});
      }
      await client.query('COMMIT');
      return {
        rows: data.rows,
        total: count.rows[0].total,
        page,
        limit,
        columns,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  validate(columns: Column[], input: unknown, create: boolean) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadRequestException('Dữ liệu không hợp lệ.');
    const data: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(input)) {
      const col = columns.find((c) => c.name === name);
      if (!col?.writable)
        throw new BadRequestException('Không được ghi trường ' + name);
      if (value === null) {
        if (col.required) throw new BadRequestException('Thiếu ' + name);
        data[name] = null;
        continue;
      }
      if (col.options.length && !col.options.includes(value as string))
        throw new BadRequestException('Giá trị không hợp lệ: ' + name);
      if (col.type === 'bool' && typeof value !== 'boolean')
        throw new BadRequestException('Cần giá trị bật/tắt: ' + name);
      if (
        ['int2', 'int4', 'int8', 'numeric', 'float4', 'float8'].includes(
          col.type,
        )
      ) {
        if (
          (typeof value !== 'number' && typeof value !== 'string') ||
          String(value).trim() === '' ||
          !Number.isFinite(Number(value))
        )
          throw new BadRequestException('Cần số hợp lệ: ' + name);
        if (col.type.startsWith('int') && !Number.isSafeInteger(Number(value)))
          throw new BadRequestException('Cần số nguyên: ' + name);
      } else if (['json', 'jsonb'].includes(col.type)) {
        if (typeof value !== 'object')
          throw new BadRequestException('Cần JSON hợp lệ: ' + name);
      } else if (col.type.startsWith('_')) {
        if (!Array.isArray(value) || !value.every((x) => typeof x === 'string'))
          throw new BadRequestException('Cần danh sách chuỗi: ' + name);
      } else if (col.type !== 'bool') {
        if (
          typeof value !== 'string' ||
          (col.required && !value.trim()) ||
          (col.maxLength && value.length > col.maxLength)
        )
          throw new BadRequestException('Nội dung không hợp lệ: ' + name);
        if (
          col.type === 'uuid' &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
          )
        )
          throw new BadRequestException('Mã liên kết không hợp lệ: ' + name);
      }
      data[name] = value;
    }
    if (create)
      for (const c of columns)
        if (
          c.writable &&
          c.required &&
          !c.hasDefault &&
          data[c.name] === undefined
        )
          throw new BadRequestException('Thiếu trường ' + c.name);
    return data;
  }

  key(columns: Column[], key: unknown) {
    const pks = columns.filter((c) => c.primary);
    if (
      !pks.length ||
      !key ||
      typeof key !== 'object' ||
      Array.isArray(key) ||
      Object.keys(key).length !== pks.length
    )
      throw new BadRequestException('Khóa bản ghi không hợp lệ.');
    const values = pks.map((c) => (key as Record<string, unknown>)[c.name]);
    if (values.some((v) => !['string', 'number'].includes(typeof v)))
      throw new BadRequestException('Thiếu khóa bản ghi.');
    return {
      clause: pks.map((c, i) => `${quote(c.name)}=$${i + 1}`).join(' AND '),
      values,
    };
  }

  async mutate(
    table: string,
    actor: AdminActor,
    operation: 'create' | 'update' | 'delete',
    body: { values?: unknown; key?: unknown; expectedUpdatedAt?: string; reason?: string },
    allocateTreatmentSession = false,
  ) {
    const resource = this.resource(table, actor, true);
    if (resource.actions && !resource.actions.includes(operation)) {
      if (table === 'support_tickets' && operation === 'create')
        throw new ForbiddenException('Yêu cầu hỗ trợ phải do khách hàng gửi từ ứng dụng. Admin chỉ tiếp nhận và xử lý phiếu.');
      if (table === 'user_packages' && operation === 'create')
        throw new BadRequestException('Chỉ luồng POS mới được kích hoạt gói cho khách hàng.');
      if (table === 'treatment_journal' && operation === 'delete')
        throw new BadRequestException('Không thể xóa nhật ký điều trị đã ghi nhận. Hãy sử dụng tính năng hoàn tác buổi (reverse).');
      throw new ForbiddenException('Thao tác này không được phép với phân hệ hiện tại.');
    }
    if ((table === 'invoices' || table === 'invoice_items') && operation !== 'create')
      throw new ForbiddenException('Không sửa trực tiếp hóa đơn hoặc dòng hàng. Dùng thao tác thanh toán/hoàn tiền và luồng sửa mô tả biên lai có lưu lịch sử.');
    if (table === 'departments' && !['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
      throw new ForbiddenException('Chỉ quản trị viên được tạo hoặc quản lý bộ phận.');
    if (table === 'departments' && operation === 'delete')
      throw new ConflictException('Không xóa bộ phận có lịch sử; hãy chuyển trạng thái sang ngừng hoạt động.');
    if (table === 'course_batch_assistants' && !['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
      throw new ForbiddenException('Chỉ quản trị viên hoặc quản lý chi nhánh được phân công trợ giảng.');
    if (table === 'student_academic_records' && operation === 'delete')
      throw new ConflictException('Không xóa bảng điểm đã lưu; hãy cập nhật điểm với lý do để giữ lịch sử.');
    if (table === 'user_packages' && operation === 'create') {
      throw new BadRequestException('Chỉ luồng POS mới được kích hoạt gói cho khách hàng.');
    }
    if (table === 'staff_commissions') throw new ForbiddenException('Dùng quy trình duyệt và ghi nhận chi trả hoa hồng.');
    const columns = await this.columns(table, actor);
    let input = body?.values;
    let password: string | undefined;
    if (
      table === 'users' &&
      input &&
      typeof input === 'object' &&
      !Array.isArray(input)
    ) {
      const { password: raw, ...rest } = input as Record<string, unknown>;
      input = rest;
      if (raw !== undefined) {
        if (typeof raw !== 'string' || raw.length < 12 || raw.length > 256)
          throw new BadRequestException('Mật khẩu cần từ 12 đến 256 ký tự.');
        password = raw;
      }
    }
    const derivedTechnicianFields = ['full_name', 'user_id', 'branch_id', 'avatar_url'];
    const derivesTechnician = table === 'technicians' && Boolean((input as Record<string, unknown>)?.staff_profile_id);
    const validationColumns = derivesTechnician
      ? columns.map(column => derivedTechnicianFields.includes(column.name) ? { ...column, required: false } : column)
      : columns;
    const data =
      operation === 'delete'
        ? {}
        : this.validate(validationColumns, input, operation === 'create');
    if (operation === 'create' && table === 'users')
      data.referral_code = 'MLD' + randomBytes(6).toString('hex').toUpperCase();
    if (password) data.password_hash = await bcrypt.hash(password, 12);
    const key = operation === 'create' ? null : this.key(columns, body?.key);
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      // Serialize admin mutations while relationship checks protect against cascaded data loss.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))",
      );
      const previous = key
        ? (
            await client.query(
              `SELECT * FROM public.${quote(table)} WHERE ${key.clause} FOR UPDATE`,
              key.values,
            )
          ).rows[0]
        : null;
      if (key && !previous)
        throw new NotFoundException('Bản ghi không còn tồn tại.');
      if (previous) await assertRowScope(client, table, previous, columns.map(column => column.name), actor, operation);
      if (table === 'technicians' && operation !== 'delete') {
        const profileId = data.staff_profile_id ?? previous?.staff_profile_id;
        if (operation === 'create' && !profileId) throw new BadRequestException('Chọn hồ sơ nhân viên trước khi tạo kỹ thuật viên.');
        if (previous?.staff_profile_id && data.staff_profile_id !== undefined && data.staff_profile_id !== previous.staff_profile_id)
          throw new ConflictException('Hồ sơ kỹ thuật viên đã liên kết với nhân viên.');
        if (profileId && (derivesTechnician || derivedTechnicianFields.some(field => field !== 'avatar_url' && field in data))) {
          const staff = (await client.query(
            'SELECT p.branch_id,p.user_id,u.full_name,u.avatar_url FROM staff_profiles p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.is_active AND u.is_active',
            [profileId],
          )).rows[0];
          if (!staff) throw new ConflictException('Chọn hồ sơ nhân viên có tài khoản đang hoạt động.');
          Object.assign(data, {
            branch_id: staff.branch_id, user_id: staff.user_id, full_name: staff.full_name,
            ...(operation === 'create' && !data.avatar_url ? { avatar_url: staff.avatar_url || '' } : {}),
          });
        }
      }
      if (table === 'departments' && operation !== 'delete') {
        delete data.created_by_id;
        if (operation === 'create') data.created_by_id = actor.id;
        if (typeof data.name === 'string') data.name = data.name.trim();
        if (typeof data.code === 'string') {
          const code = data.code.trim().toUpperCase();
          if (!/^[A-Z0-9_-]+$/.test(code)) throw new BadRequestException('Mã bộ phận chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.');
          data.code = code;
        }
        if (data.sort_order !== undefined && Number(data.sort_order) < 0)
          throw new BadRequestException('Thứ tự hiển thị phải từ 0 trở lên.');
      }
      if (operation !== 'delete') await assertRowScope(client, table, { ...previous, ...data }, columns.map(column => column.name), actor, operation);
      if (
        previous?.updated_at &&
        (!body.expectedUpdatedAt ||
          new Date(previous.updated_at).toISOString() !==
            new Date(body.expectedUpdatedAt).toISOString())
      )
        throw new ConflictException(
          'Bản ghi đã thay đổi. Tải lại trước khi lưu.',
        );
      if (table === 'users') {
        if (
          previous?.id === actor.id &&
          (operation === 'delete' || data.is_active === false || data.role)
        )
          throw new ConflictException(
            'Không thể tự khóa, xóa hoặc đổi quyền tài khoản đang dùng.',
          );
        if (
          actor.role !== 'SUPER_ADMIN' &&
          ((previous && !['CUSTOMER', 'STUDENT'].includes(previous.role)) ||
            (data.role && !['CUSTOMER', 'STUDENT'].includes(String(data.role))))
        )
          throw new ForbiddenException(
            'Chỉ SUPER_ADMIN được sửa tài khoản nhân sự/quản trị.',
          );
        if (
          previous?.role === 'SUPER_ADMIN' &&
          (operation === 'delete' ||
            data.is_active === false ||
            (data.role && data.role !== 'SUPER_ADMIN'))
        ) {
          const admins = await client.query(
            "SELECT id FROM users WHERE role='SUPER_ADMIN' AND is_active=true FOR UPDATE",
          );
          if (admins.rowCount <= 1)
            throw new ConflictException(
              'Không thể vô hiệu hóa SUPER_ADMIN cuối cùng.',
            );
        }
      }
      if (table === 'roles' && previous?.is_system)
        throw new ConflictException('Không được sửa/xóa vai trò hệ thống.');
      await this.businessRules(client, table, data, previous, operation, actor, allocateTreatmentSession);
      await this.authorizeAcademyWrite(client, table, data, previous, operation, actor);
      let result: Record<string, unknown>;
      const names = Object.keys(data);
      const values = names.map((name) =>
        ['json', 'jsonb'].includes(
          columns.find((c) => c.name === name)?.type || '',
        ) && data[name] !== null
          ? JSON.stringify(data[name])
          : data[name],
      );
      if (operation === 'delete') {
        await this.preventCascade(client, table, previous);
        await client.query(
          `DELETE FROM public.${quote(table)} WHERE ${key.clause}`,
          key.values,
        );
        result = { deleted: true };
      } else if (operation === 'create') {
        result = (
          await client.query(
            `INSERT INTO public.${quote(table)} ${names.length ? '(' + names.map(quote).join(',') + ') VALUES (' + names.map((_, i) => '$' + (i + 1)).join(',') + ')' : 'DEFAULT VALUES'} RETURNING *`,
            values,
          )
        ).rows[0];
      } else {
        if (!names.length) throw new BadRequestException('Chưa có thay đổi.');
        const clause = columns
          .filter((c) => c.primary)
          .map((c, i) => `${quote(c.name)}=$${names.length + i + 1}`)
          .join(' AND ');
        result = (
          await client.query(
            `UPDATE public.${quote(table)} SET ${names.map((name, i) => `${quote(name)}=$${i + 1}`).join(',')} WHERE ${clause} RETURNING *`,
            [...values, ...key.values],
          )
        ).rows[0];
      }
      await this.syncRelated(
        client,
        table,
        operation === 'delete' ? null : result,
        previous,
      );
      if (table === 'treatment_journal' && operation === 'create' && result && result.confirmation_status === 'CONFIRMED') {
        await this.syncTreatmentJournalArtifacts(client, result, data, actor);
      }
      if (table === 'user_packages' && operation === 'update' && data.status && previous && data.status !== previous.status) {
        await client.query(
          `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
           VALUES($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            result.id,
            previous.status,
            data.status,
            data.status === 'PAUSED' ? 'PAUSE' : (data.status === 'ACTIVE' ? 'RESUME' : 'STATUS_CHANGE'),
            body.reason?.trim() || 'Cập nhật trạng thái gói',
            actor.id,
            JSON.stringify({ updatedVia: 'mutate' }),
          ],
        );
      }
      if (table === 'student_academic_records' && operation !== 'delete') {
        const gradeFields = [
          'theory_score', 'practical_score', 'attended_sessions',
          'total_batch_sessions', 'attendance_rate', 'feedback_theory',
          'feedback_practical', 'feedback_attendance', 'feedback_attitude',
        ];
        const changed = operation === 'create' || gradeFields.some((field) =>
          data[field] !== undefined && String(data[field] ?? '') !== String(previous?.[field] ?? ''),
        );
        if (changed) {
          await client.query(
            `INSERT INTO student_academic_record_history(academic_record_id,actor_id,reason,before_data,after_data)
             VALUES($1,$2,$3,$4::jsonb,$5::jsonb)`,
            [
              result.id,
              actor.id,
              body.reason?.trim() || (operation === 'create' ? 'Tạo bảng điểm' : 'Cập nhật điểm thủ công'),
              JSON.stringify(previous || {}),
              JSON.stringify(result),
            ],
          );
        }
      }
      await this.audit(
        client,
        actor,
        table,
        operation,
        result.id || previous?.id,
      );
      await client.query('COMMIT');
      return Object.fromEntries(
        Object.entries(result).filter(([k]) => !HIDDEN_COLUMNS.has(k)),
      );
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  private async businessRules(
    client: PoolClient,
    table: string,
    data: Record<string, any>,
    previous: Record<string, any> | null,
    operation: string,
    actor: AdminActor,
    allocateTreatmentSession = false,
  ) {
    const next = { ...previous, ...data };
    await validateStaffWorkflow(client, table, next, previous, operation);
    if (table === 'home_care_guidelines') {
      if (operation === 'delete') throw new ConflictException('Hãy gỡ xuất bản mẫu hướng dẫn để giữ lịch sử đã giao cho khách.');
      delete data.version;
      if (operation === 'create') {
        data.version = 1;
        if (data.is_published === undefined) data.is_published = false;
      } else data.version = Number(previous?.version || 1) + 1;
      if (!next.slug) data.slug = String(next.title || 'huong-dan').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomUUID().slice(0, 8);
      if (data.is_published === undefined && previous?.is_published) data.is_published = false;
    }
    if (table === 'home_care_guidelines' && operation !== 'delete' && data.is_published === true) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
        throw new ForbiddenException('Chỉ quản trị viên được duyệt và xuất bản hướng dẫn chăm sóc.');
      data.approved_by_id = actor.id;
      data.approved_at = new Date().toISOString();
    }
    if (table === 'course_quizzes' && operation === 'create')
      data.total_questions = 0;
    if (
      table === 'course_lessons' &&
      operation !== 'delete' &&
      (next.lesson_type || 'VIDEO') === 'VIDEO'
    ) {
      let url: URL;
      try {
        url = new URL(next.video_url);
      } catch {
        throw new BadRequestException(
          'Bài học video cần đường dẫn video hợp lệ.',
        );
      }
      if (!['https:', 'http:'].includes(url.protocol))
        throw new BadRequestException('Video cần đường dẫn HTTP hoặc HTTPS.');
    }
    if (table === 'quiz_questions' && operation !== 'delete') {
      const options = Array.isArray(next.options)
        ? Object.fromEntries(
            next.options.map((value, index) => [
              String.fromCharCode(65 + index),
              value,
            ]),
          )
        : next.options;
      if (
        !options ||
        typeof options !== 'object' ||
        Object.keys(options).length < 2 ||
        Object.keys(options).length > 26 ||
        Object.values(options).some(
          (value) => typeof value !== 'string' || !value.trim(),
        ) ||
        !Object.prototype.hasOwnProperty.call(options, next.correct_option)
      )
        throw new BadRequestException(
          'Câu hỏi cần ít nhất hai đáp án có nội dung và một đáp án đúng thuộc danh sách.',
        );
    }
    for (const name of [
      'price',
      'discount_price',
      'unit_price',
      'amount',
      'subtotal',
      'total_amount',
      'base_total',
      'final_price',
      'discount_amount',
      'points_discount',
      'vat_amount',
      'refund_amount',
      'tuition_total',
      'tuition_fee',
      'deposit_amount',
      'base_salary',
      'max_discount',
      'min_order_amount',
    ]) {
      if (next[name] != null && Number(next[name]) < 0)
        throw new BadRequestException('Số tiền không được âm: ' + name);
    }
    const finance = ['invoices', 'tuition_transactions'].includes(table);
    if (finance) {
      if (previous && !['UNPAID', 'PENDING'].includes(previous.payment_status))
        throw new ConflictException('Chứng từ đã ghi sổ không được sửa/xóa.');
      if (
        data.payment_status &&
        !['UNPAID', 'PENDING'].includes(data.payment_status)
      )
        throw new BadRequestException(
          'Dùng thao tác xác nhận thu tiền, không sửa trực tiếp trạng thái.',
        );
      if (operation === 'create') {
        data.payment_status = 'PENDING';
        data.cashier_id = actor.id;
      }
      if (data.refund_amount !== undefined && Number(data.refund_amount) !== 0)
        throw new BadRequestException(
          'Dùng thao tác hoàn tiền, không sửa trực tiếp số tiền hoàn.',
        );
    }
    if (table === 'invoice_items' && operation !== 'delete') {
      data.amount =
        Math.round(Number(next.unit_price) * Number(next.quantity) * 100) / 100;
    }
    if (table === 'invoice_items') {
      if (previous?.invoice_id && previous.invoice_id !== next.invoice_id) {
        const original = (
          await client.query(
            'SELECT payment_status FROM invoices WHERE id=$1 FOR UPDATE',
            [previous.invoice_id],
          )
        ).rows[0];
        if (
          !original ||
          !['UNPAID', 'PENDING'].includes(original.payment_status)
        )
          throw new ConflictException(
            'Không được chuyển chi tiết khỏi hóa đơn đã thu.',
          );
      }
      const invoice = (
        await client.query(
          'SELECT payment_status FROM invoices WHERE id=$1 FOR UPDATE',
          [next.invoice_id],
        )
      ).rows[0];
      if (!invoice || !['UNPAID', 'PENDING'].includes(invoice.payment_status))
        throw new ConflictException('Không được sửa chi tiết hóa đơn đã thu.');
    }
    if (table === 'student_certificates') {
      if (previous?.status !== 'DRAFT' && previous)
        throw new ConflictException('Chứng chỉ đã phát hành chỉ được thu hồi.');
      if (data.status && data.status !== 'DRAFT')
        throw new BadRequestException('Dùng thao tác phát hành chứng chỉ.');
      if (operation === 'create') {
        data.status = 'DRAFT';
        data.qr_verification_code = randomUUID();
      }
    }
    if (table === 'bookings') {
      if (previous && ['COMPLETED', 'CANCELLED'].includes(previous.status))
        throw new ConflictException('Lịch đã kết thúc không được sửa/xóa.');
      if (
        data.status &&
        !['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'].includes(data.status)
      )
        throw new BadRequestException(
          'Dùng thao tác check-in, bắt đầu hoặc check-out.',
        );
      if (data.payment_status && data.payment_status !== 'UNPAID')
        throw new BadRequestException(
          'Trạng thái thanh toán phải cập nhật từ hóa đơn.',
        );
      if (operation === 'create')
        data.qr_code_hash = randomBytes(32).toString('hex');
    }
    for (const [start, end] of [
      ['start_date', 'end_date'],
      ['valid_from', 'valid_to'],
      ['start_time', 'end_time'],
    ]) {
      const begin =
        start === 'start_time'
          ? String(next[start])
          : new Date(next[start]).getTime();
      const finish =
        end === 'end_time' ? String(next[end]) : new Date(next[end]).getTime();
      if (next[start] && next[end] && begin >= finish)
        throw new BadRequestException(
          'Thời điểm kết thúc phải sau thời điểm bắt đầu.',
        );
    }
    if (
      next.discount_price != null &&
      Number(next.discount_price) > Number(next.price)
    )
      throw new BadRequestException('Giá ưu đãi không được vượt giá gốc.');
    if (table === 'treatment_packages' && operation !== 'delete') {
      if (!next.service_id)
        throw new BadRequestException('Gói liệu trình phải liên kết với một dịch vụ.');
      if (Number(next.total_sessions) < 2 || !Number.isInteger(Number(next.total_sessions)))
        throw new BadRequestException('Gói liệu trình cần có ít nhất 2 buổi nguyên.');
      if (Number(next.validity_months) < 1 || !Number.isInteger(Number(next.validity_months)))
        throw new BadRequestException('Thời hạn gói phải từ 1 tháng trở lên.');
      if (Number(next.price) <= 0)
        throw new BadRequestException('Giá gốc gói liệu trình phải lớn hơn 0.');
      if (next.discount_price != null && Number(next.discount_price) < 0)
        throw new BadRequestException('Giá ưu đãi không được âm.');
      if (next.service_id) {
        const service = (await client.query(
          'SELECT id,is_active FROM services WHERE id=$1', [next.service_id],
        )).rows[0];
        if (!service) throw new BadRequestException('Dịch vụ liên kết không tồn tại.');
      }
      if (Number(next.discount_price) === 0 && next.discount_price != null)
        data.discount_price = null;
    }
    if (table === 'treatment_packages' && operation === 'delete') {
      const holders = await client.query(
        'SELECT 1 FROM user_packages WHERE package_id=$1 LIMIT 1', [previous?.id],
      );
      if (holders.rowCount)
        throw new ConflictException('Không thể xóa gói đã cấp cho khách; hãy ngừng mở bán để giữ lịch sử.');
    }
    if (table === 'services' && operation === 'delete') {
      const usage = await client.query(
        'SELECT 1 FROM booking_items WHERE service_id=$1 UNION ALL SELECT 1 FROM treatment_packages WHERE service_id=$1 LIMIT 1',
        [previous?.id],
      );
      if (usage.rowCount)
        throw new ConflictException('Dịch vụ đã được dùng trong lịch hoặc gói; hãy ngừng kinh doanh thay vì xóa.');
    }
    if (table === 'user_packages') {
      if (operation === 'create')
        throw new BadRequestException('Chỉ luồng POS mới được kích hoạt gói cho khách hàng.');
      if (operation === 'delete')
        throw new ConflictException('Không thể xóa gói khách đã mua; hãy xử lý hoàn tiền theo quy trình.');
      const immutableFields = [
        'customer_id', 'package_id', 'total_sessions', 'completed_sessions',
        'purchased_at', 'expires_at', 'paused_at', 'resumed_at', 'cancelled_at',
        'cancelled_reason', 'transferred_at', 'transferred_to_user_id',
        'refunded_at', 'refund_amount', 'refund_reason', 'transferred_from_package_id',
      ];
      if (immutableFields.some((field) => Object.prototype.hasOwnProperty.call(data, field)))
        throw new BadRequestException('Thông tin mua, số buổi và trạng thái vòng đời chỉ được cập nhật bởi hệ thống qua nhật ký điều trị hoặc lệnh vòng đời.');
      if (data.status && !(
        (previous?.status === 'ACTIVE' && data.status === 'PAUSED') ||
        (previous?.status === 'PAUSED' && data.status === 'ACTIVE' && new Date(previous.expires_at).getTime() > Date.now())
      ))
        throw new ConflictException('Không sửa trạng thái gói tùy ý. Hãy dùng các thao tác chuyên biệt (tạm dừng, tiếp tục, gia hạn, chuyển nhượng, hủy, hoàn tiền).');
    }
    if (table === 'student_attendance') {
      const match = await client.query(
        'SELECT 1 FROM batch_schedules s JOIN course_enrollments e ON e.batch_id=s.batch_id WHERE s.id=$1 AND e.id=$2',
        [next.schedule_id, next.enrollment_id],
      );
      if (!match.rowCount)
        throw new BadRequestException(
          'Học viên không thuộc lớp của buổi điểm danh.',
        );
      data.marked_by_id = actor.id;
    }
    if (table === 'booking_items') {
      if (operation !== 'delete') {
        const service = (await client.query(
          'SELECT is_active FROM services WHERE id=$1', [next.service_id],
        )).rows[0];
        if (!service?.is_active)
          throw new ConflictException('Dịch vụ đã ngừng kinh doanh, không thể thêm vào lịch.');
      }
      for (const id of new Set(
        [previous?.booking_id, next.booking_id].filter(Boolean),
      )) {
        const booking = (
          await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [
            id,
          ])
        ).rows[0];
        if (
          !booking ||
          !['PENDING', 'CONFIRMED'].includes(booking.status) ||
          booking.payment_status === 'PAID'
        )
          throw new ConflictException(
            'Chỉ sửa dịch vụ của lịch chưa tiếp đón và chưa thanh toán.',
          );
      }
    }
    if (table === 'treatment_journal') {
      if (operation === 'delete')
        throw new ConflictException('Không thể xóa nhật ký điều trị đã ghi nhận. Hãy sử dụng thao tác hoàn tác buổi điều trị.');
      if (previous?.confirmation_status === 'CONFIRMED')
        throw new ConflictException('Không thể chỉnh sửa buổi điều trị đã được xác nhận hoàn thành.');
      if (previous?.is_reversed)
        throw new ConflictException('Không thể chỉnh sửa buổi điều trị đã được hoàn tác.');
      if (operation === 'update' && !['DRAFT', 'PENDING'].includes(previous?.confirmation_status))
        throw new ConflictException('Hồ sơ đã gửi chỉ được xử lý qua lệnh nghiệp vụ.');
      const protectedJournalFields = ['clinical_approved_at','clinical_approved_by','reversed_at','reversed_by','is_reversed','reversal_id','reversal_reason','post_care_status'];
      if (protectedJournalFields.some(field => Object.prototype.hasOwnProperty.call(data,field)) ||
        (operation === 'update' && ['confirmation_status','customer_id','booking_id','user_package_id','session_number','session_date','technician_id','assigned_room_id'].some(field => Object.prototype.hasOwnProperty.call(data,field))))
        throw new BadRequestException('Không sửa trực tiếp trạng thái, phê duyệt hoặc liên kết nhật ký. Dùng lệnh nghiệp vụ.');
      if (operation === 'create' && data.confirmation_status && !['DRAFT','PENDING'].includes(data.confirmation_status))
        throw new BadRequestException('Nhật ký mới phải là bản nháp.');
      if (data.is_reversed !== undefined || data.reversal_id !== undefined || data.reversal_reason !== undefined)
        throw new BadRequestException('Không sửa trực tiếp trạng thái hoàn tác.');
      if (operation === 'create' && !next.booking_id)
        throw new BadRequestException(
          'Nhật ký điều trị phải liên kết với một ca đang phục vụ.',
        );
      if (operation === 'create' && data.confirmation_status === 'CONFIRMED')
        throw new BadRequestException('Chỉ command xác nhận buổi mới được chuyển trạng thái CONFIRMED.');
      if (operation === 'create' && !data.confirmation_status)
        data.confirmation_status = 'DRAFT';
      if (next.user_package_id) {
        const pkg = (
          await client.query(
            'SELECT * FROM user_packages WHERE id=$1 FOR UPDATE',
            [next.user_package_id],
          )
        ).rows[0];
        if (!pkg || pkg.customer_id !== next.customer_id)
          throw new BadRequestException('Liệu trình không thuộc khách hàng.');
        if (operation === 'create' && pkg.status !== 'ACTIVE')
          throw new ConflictException('Liệu trình không còn hoạt động.');
        if (operation === 'create' && new Date(pkg.expires_at).getTime() <= Date.now())
          throw new ConflictException('Liệu trình đã hết hạn sử dụng.');
        if (Number(next.session_number) > Number(pkg.total_sessions))
          throw new BadRequestException(
            'Số thứ tự buổi vượt tổng buổi của liệu trình.',
          );
        if (operation === 'create') {
          const expected = (await client.query(
            `SELECT min(n)::int AS next_session FROM generate_series(1,$2::int) n
             WHERE NOT EXISTS(SELECT 1 FROM treatment_journal j WHERE j.user_package_id=$1 AND j.session_number=n AND j.is_reversed IS NOT TRUE)`,
            [next.user_package_id,pkg.total_sessions],
          )).rows[0].next_session;
          if (!expected) throw new ConflictException('Không còn buổi trống để ghi nhận.');
          if (allocateTreatmentSession) data.session_number = next.session_number = expected;
          if (Number(next.session_number) !== Number(expected))
            throw new ConflictException(`Buổi tiếp theo của gói là buổi ${expected}.`);
        }
        const exists = await client.query(
          'SELECT 1 FROM treatment_journal WHERE user_package_id=$1 AND session_number=$2 AND id<>$3 AND is_reversed IS NOT TRUE',
          [
            next.user_package_id,
            next.session_number,
            previous?.id || '00000000-0000-4000-8000-000000000000',
          ],
        );
        if (operation !== 'delete' && exists.rowCount)
          throw new ConflictException('Buổi điều trị đã có nhật ký.');
      }
      if (next.booking_id) {
        const booking = (
          await client.query('SELECT customer_id FROM bookings WHERE id=$1', [
            next.booking_id,
          ])
        ).rows[0];
        if (booking?.customer_id !== next.customer_id)
          throw new BadRequestException('Lịch hẹn không thuộc khách hàng.');
        if (operation === 'create') {
          const workflowBooking = (
            await client.query(
              'SELECT status,session_status,technician_id,assigned_room_id FROM bookings WHERE id=$1 FOR UPDATE',
              [next.booking_id],
            )
          ).rows[0];
          if (!workflowBooking || workflowBooking.status !== 'IN_SERVICE' || workflowBooking.session_status === 'COMPLETED')
            throw new ConflictException('Chỉ ghi nhật ký cho lịch đang trong quá trình phục vụ.');
          const duplicate = await client.query(
            'SELECT 1 FROM treatment_journal WHERE booking_id=$1 LIMIT 1',
            [next.booking_id],
          );
          if (duplicate.rowCount)
            throw new ConflictException('Lịch hẹn đã có nhật ký điều trị.');
          if (workflowBooking.technician_id && next.technician_id !== workflowBooking.technician_id)
            throw new BadRequestException('Kỹ thuật viên trong nhật ký không khớp ca phục vụ.');
          if (workflowBooking.assigned_room_id && next.assigned_room_id !== workflowBooking.assigned_room_id)
            throw new BadRequestException('Phòng trong nhật ký không khớp ca phục vụ.');
        }
        if (next.user_package_id) {
          const packageService = (await client.query(
            'SELECT tp.service_id FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id WHERE up.id=$1', [next.user_package_id],
          )).rows[0];
          if (packageService?.service_id) {
            const matchingService = await client.query(
              'SELECT 1 FROM booking_items WHERE booking_id=$1 AND service_id=$2 LIMIT 1',
              [next.booking_id, packageService.service_id],
            );
            if (!matchingService.rowCount)
              throw new ConflictException('Dịch vụ của lịch không khớp dịch vụ trong gói liệu trình.');
          }
        }
      }
    }
    if (
      [
        'course_enrollments',
        'tuition_transactions',
        'student_certificates',
      ].includes(table) &&
      next.enrollment_id
    ) {
      const e = (
        await client.query(
          'SELECT student_id,course_id FROM course_enrollments WHERE id=$1',
          [next.enrollment_id],
        )
      ).rows[0];
      if (
        !e ||
        e.student_id !== next.student_id ||
        e.course_id !== next.course_id
      )
        throw new BadRequestException(
          'Học viên/khóa học không khớp hồ sơ ghi danh.',
        );
    }
    if (table === 'course_enrollments' && next.batch_id) {
      const b = (
        await client.query(
          'SELECT course_id,max_students FROM course_batches WHERE id=$1 FOR UPDATE',
          [next.batch_id],
        )
      ).rows[0];
      if (b?.course_id !== next.course_id)
        throw new BadRequestException('Lớp không thuộc khóa học.');
      const enrolled = await client.query(
        "SELECT count(*)::int n FROM course_enrollments WHERE batch_id=$1 AND status<>'DROPPED' AND id<>$2",
        [next.batch_id, previous?.id || '00000000-0000-4000-8000-000000000000'],
      );
      if (
        operation !== 'delete' &&
        next.status !== 'DROPPED' &&
        enrolled.rows[0].n >= b.max_students
      )
        throw new ConflictException('Lớp đã đủ sĩ số.');
      const duplicate = await client.query(
        "SELECT 1 FROM course_enrollments WHERE batch_id=$1 AND student_id=$2 AND status<>'DROPPED' AND id<>$3",
        [
          next.batch_id,
          next.student_id,
          previous?.id || '00000000-0000-4000-8000-000000000000',
        ],
      );
      if (operation !== 'delete' && duplicate.rowCount)
        throw new ConflictException('Học viên đã có hồ sơ trong lớp này.');
    }
    if (next.assigned_room_id && next.branch_id) {
      const r = (
        await client.query('SELECT branch_id FROM branch_rooms WHERE id=$1', [
          next.assigned_room_id,
        ])
      ).rows[0];
      if (r?.branch_id !== next.branch_id)
        throw new BadRequestException('Phòng không thuộc chi nhánh.');
    }
    if (next.technician_id && next.branch_id) {
      const t = (
        await client.query('SELECT branch_id FROM technicians WHERE id=$1', [
          next.technician_id,
        ])
      ).rows[0];
      if (t?.branch_id !== next.branch_id)
        throw new BadRequestException('Chuyên viên không thuộc chi nhánh.');
    }
    if (
      table === 'staff_leaves' &&
      ['APPROVED', 'REJECTED'].includes(data.status)
    ) {
      data.approved_by = actor.id;
      data.approved_at = new Date().toISOString();
    }
  }

  private async authorizeAcademyWrite(
    client: PoolClient,
    table: string,
    data: Record<string, any>,
    previous: Record<string, any> | null,
    operation: string,
    actor: AdminActor,
  ) {
    if (!['student_academic_records', 'student_attendance'].includes(table)) return;
    if (['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role)) return;
    if (actor.role !== 'INSTRUCTOR')
      throw new ForbiddenException('Chỉ quản trị viên hoặc giảng viên được phân công mới được sửa điểm danh và bảng điểm.');

    const record = operation === 'delete' ? previous : { ...previous, ...data };
    let allowed = false;
    if (table === 'student_academic_records' && record?.enrollment_id) {
      allowed = (await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM course_enrollments e
           JOIN course_batches b ON b.id=e.batch_id
           JOIN instructors primary_teacher ON primary_teacher.id=b.instructor_id
           WHERE e.id=$1 AND primary_teacher.user_id=$2
           UNION ALL
           SELECT 1 FROM course_enrollments e
           JOIN course_batch_assistants a ON a.batch_id=e.batch_id AND a.can_enter_grades=TRUE
           JOIN instructors assistant ON assistant.id=a.instructor_id
           WHERE e.id=$1 AND assistant.user_id=$2
         ) AS allowed`,
        [record.enrollment_id, actor.id],
      )).rows[0]?.allowed === true;
    } else if (table === 'student_attendance' && record?.schedule_id) {
      allowed = (await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM batch_schedules s
           JOIN course_batches b ON b.id=s.batch_id
           JOIN instructors primary_teacher ON primary_teacher.id=b.instructor_id
           WHERE s.id=$1 AND primary_teacher.user_id=$2
           UNION ALL
           SELECT 1 FROM batch_schedules s
           JOIN course_batch_assistants a ON a.batch_id=s.batch_id AND a.can_mark_attendance=TRUE
           JOIN instructors assistant ON assistant.id=a.instructor_id
           WHERE s.id=$1 AND assistant.user_id=$2
         ) AS allowed`,
        [record.schedule_id, actor.id],
      )).rows[0]?.allowed === true;
    }
    if (!allowed) throw new ForbiddenException('Chỉ giảng viên/trợ giảng được phân công cho lớp mới được thao tác điểm danh hoặc điểm số.');
  }

  private async syncRelated(
    client: PoolClient,
    table: string,
    row: Record<string, any> | null,
    previous: Record<string, any> | null,
  ) {
    const ids = (key: string) => [
      ...new Set([row?.[key], previous?.[key]].filter(Boolean)),
    ];
    if (table === 'course_enrollments')
      for (const id of ids('batch_id'))
        await client.query(
          "UPDATE course_batches SET enrolled_count=(SELECT count(*) FROM course_enrollments WHERE batch_id=$1 AND status<>'DROPPED') WHERE id=$1",
          [id],
        );
    if (table === 'quiz_questions')
      for (const id of ids('quiz_id'))
        await client.query(
          'UPDATE course_quizzes SET total_questions=(SELECT count(*) FROM quiz_questions WHERE quiz_id=$1) WHERE id=$1',
          [id],
        );
    if (table === 'course_lessons')
      for (const id of ids('chapter_id'))
        await client.query(
          'UPDATE courses SET total_lessons=(SELECT count(*) FROM course_lessons l JOIN course_chapters c ON c.id=l.chapter_id WHERE c.course_id=courses.id) WHERE id=(SELECT course_id FROM course_chapters WHERE id=$1)',
          [id],
        );
    if (table === 'treatment_journal')
      for (const id of ids('user_package_id'))
        await client.query(
          `UPDATE user_packages
           SET completed_sessions = (
             SELECT count(*)::int
             FROM treatment_journal
             WHERE user_package_id = $1
               AND is_reversed IS NOT TRUE
               AND confirmation_status = 'CONFIRMED'
           ),
           status = CASE
             WHEN (
               SELECT count(*)::int
               FROM treatment_journal
               WHERE user_package_id = $1
                 AND is_reversed IS NOT TRUE
                 AND confirmation_status = 'CONFIRMED'
             ) >= total_sessions THEN 'COMPLETED'::package_status
             WHEN status = 'COMPLETED' THEN 'ACTIVE'::package_status
             ELSE status
           END
           WHERE id = $1`,
          [id],
        );
    if (table === 'booking_items')
      for (const id of ids('booking_id')) {
        const booking = (
          await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [
            id,
          ])
        ).rows[0];
        const totals = (
          await client.query(
            'SELECT coalesce(sum(price),0)::numeric total,coalesce(sum(duration_minutes),0)::int duration FROM booking_items WHERE booking_id=$1',
            [id],
          )
        ).rows[0];
        if (
          Number(totals.total) <
          Number(booking.discount_amount) + Number(booking.points_discount)
        )
          throw new ConflictException('Giảm giá vượt tổng dịch vụ.');
        const start = String(booking.start_time).split(':').map(Number);
        if (start[0] * 60 + start[1] + totals.duration >= 1440)
          throw new BadRequestException(
            'Lịch dịch vụ không được vượt qua ngày hôm sau.',
          );
        await client.query(
          "UPDATE bookings SET base_total=$2,final_price=$2::numeric-discount_amount-points_discount,end_time=start_time+($3::int*interval '1 minute') WHERE id=$1",
          [id, totals.total, totals.duration],
        );
      }
    if (table === 'student_attendance')
      for (const id of ids('enrollment_id'))
        await client.query(
          "UPDATE student_academic_records SET attended_sessions=(SELECT count(*) FROM student_attendance WHERE enrollment_id=$1 AND status IN ('PRESENT','LATE')),total_batch_sessions=(SELECT count(*) FROM batch_schedules s JOIN course_enrollments e ON e.batch_id=s.batch_id WHERE e.id=$1),attendance_rate=COALESCE((SELECT round(100.0*(SELECT count(*) FROM student_attendance WHERE enrollment_id=$1 AND status IN ('PRESENT','LATE'))/NULLIF(count(*),0),2) FROM batch_schedules s JOIN course_enrollments e ON e.batch_id=s.batch_id WHERE e.id=$1),0) WHERE enrollment_id=$1",
          [id],
        );
  }

  private async preventCascade(
    client: PoolClient,
    table: string,
    row: Record<string, unknown>,
  ) {
    const refs = await client.query(
      `SELECT c.relname AS table, a.attname AS column, pa.attname AS parent FROM pg_constraint k
      JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_class p ON p.oid=k.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.conkey[1]
      JOIN pg_attribute pa ON pa.attrelid=p.oid AND pa.attnum=k.confkey[1]
      WHERE k.contype='f' AND pn.nspname='public' AND n.nspname='public' AND p.relname=$1`,
      [table],
    );
    for (const ref of refs.rows) {
      const found = await client.query(
        `SELECT 1 FROM public.${quote(ref.table)} WHERE ${quote(ref.column)}=$1 LIMIT 1`,
        [row[ref.parent]],
      );
      if (found.rowCount)
        throw new ConflictException(
          'Bản ghi đang được sử dụng ở ' +
            (ADMIN_RESOURCES[ref.table]?.title || ref.table) +
            '. Không xóa dây chuyền; hãy ngừng hoạt động nếu phù hợp.',
        );
    }
  }

  async action(
    table: string,
    actor: AdminActor,
    body: { key?: unknown; action?: string; reason?: string; userPackageId?: string; requireEnded?: boolean },
  ) {
    this.resource(table, actor, true);
    const columns = await this.columns(table, actor);
    const key = this.key(columns, body.key);
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))",
      );
      const row = (
        await client.query(
          `SELECT * FROM public.${quote(table)} WHERE ${key.clause} FOR UPDATE`,
          key.values,
        )
      ).rows[0];
      if (!row) throw new NotFoundException('Không tìm thấy bản ghi.');
      await assertRowScope(client, table, row, columns.map(column => column.name), actor, 'action');
      if (table === 'bookings') {
        const action = body.action || '';
        if (action === 'confirm') {
          if (row.status !== 'PENDING')
            throw new ConflictException('Chỉ xác nhận lịch đang chờ xử lý.');
          await client.query("UPDATE bookings SET status='CONFIRMED' WHERE id=$1", [row.id]);
        } else if (action === 'cancel') {
          if (!['PENDING', 'CONFIRMED'].includes(row.status))
            throw new ConflictException('Chỉ hủy lịch chưa tiếp đón khách.');
          if (!body.reason?.trim())
            throw new BadRequestException('Cần nhập lý do hủy lịch.');
          await client.query(
            "UPDATE bookings SET status='CANCELLED',cancellation_reason=$2,cancelled_by_id=$3 WHERE id=$1",
            [row.id, body.reason.trim().slice(0, 2000), actor.id],
          );
        } else if (action === 'no-show') {
          if (row.status !== 'CONFIRMED')
            throw new ConflictException('Chỉ đánh dấu không đến cho lịch đã xác nhận.');
          if (!body.reason?.trim())
            throw new BadRequestException('Cần ghi lý do xác nhận khách không đến.');
          await client.query(
            "UPDATE bookings SET status='NO_SHOW',cancellation_reason=$2,cancelled_by_id=$3 WHERE id=$1",
            [row.id, body.reason.trim().slice(0, 2000), actor.id],
          );
        } else if (action === 'checkin') {
          if (row.status !== 'CONFIRMED')
            throw new ConflictException('Chỉ check-in lịch đã được xác nhận.');
          if (row.payment_method === 'MEMBERSHIP_WALLET') {
            const userPackageId = String(body.userPackageId || '');
            if (!this.isUuid(userPackageId))
              throw new BadRequestException('Cần chọn gói liệu trình hợp lệ trước khi check-in.');
            const entitlement = (await client.query(
              `SELECT up.id,tp.service_id
               FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id
               WHERE up.id=$1 AND up.customer_id=$2 AND up.status='ACTIVE'
                 AND up.completed_sessions<up.total_sessions
                 AND (up.expires_at IS NULL OR up.expires_at>now())
               FOR UPDATE OF up`,
              [userPackageId, row.customer_id],
            )).rows[0];
            if (!entitlement)
              throw new ConflictException('Gói liệu trình không thuộc khách, đã hết buổi hoặc hết hạn.');
            const serviceMatches = (await client.query(
              'SELECT 1 FROM booking_items WHERE booking_id=$1 AND service_id=$2 LIMIT 1',
              [row.id, entitlement.service_id],
            )).rowCount;
            if (!serviceMatches)
              throw new ConflictException('Dịch vụ đặt lịch không khớp gói liệu trình.');
            const linkedPackage = String(row.special_notes || '').match(/user_package_id=([0-9a-f-]{36})/i)?.[1];
            if (linkedPackage && linkedPackage !== userPackageId)
              throw new ConflictException('Gói check-in không khớp gói đã liên kết trong lịch hẹn.');
            if (Number(row.final_price) !== 0 || (await client.query('SELECT 1 FROM booking_items WHERE booking_id=$1 AND service_id<>$2 LIMIT 1',[row.id,entitlement.service_id])).rowCount)
              throw new ConflictException('Lịch dùng gói phải có giá phải thu bằng 0 và chỉ chứa dịch vụ được gói chi trả.');
            await client.query(
              "UPDATE bookings SET payment_status='PAID',status='CHECKED_IN',checked_in_at=now(),checked_in_by_id=$2,special_notes=CASE WHEN special_notes LIKE ('%user_package_id=' || $3::text || ']%') THEN special_notes ELSE COALESCE(special_notes,'') || ' [user_package_id=' || $3::text || ']' END WHERE id=$1",
              [row.id, actor.id, userPackageId],
            );
          } else {
            await client.query(
              "UPDATE bookings SET status='CHECKED_IN',checked_in_at=now(),checked_in_by_id=$2 WHERE id=$1",
              [row.id, actor.id],
            );
          }
        } else if (action === 'start') {
          if (row.status !== 'CHECKED_IN')
            throw new ConflictException('Cần check-in khách trước khi bắt đầu dịch vụ.');
          await client.query(
            "UPDATE bookings SET status='IN_SERVICE',session_status='IN_SERVICE',service_started_at=now() WHERE id=$1",
            [row.id],
          );
        } else if (action === 'finish-service') {
          if (row.status !== 'IN_SERVICE' || row.session_status === 'COMPLETED')
            throw new ConflictException('Ca dịch vụ không ở trạng thái có thể hoàn tất.');
          const journal = await client.query(
            "SELECT 1 FROM treatment_journal WHERE booking_id=$1 AND is_reversed IS NOT TRUE AND (user_package_id IS NULL OR confirmation_status='CONFIRMED') LIMIT 1",
            [row.id],
          );
          if (!journal.rowCount)
            throw new ConflictException('Cần lưu hồ sơ buổi chăm sóc trước khi hoàn tất chuyên môn.');
          await client.query(
            `UPDATE bookings SET session_status='COMPLETED',
             status=CASE WHEN payment_status='PAID' THEN 'COMPLETED'::booking_status ELSE status END,
             checked_out_at=CASE WHEN payment_status='PAID' THEN now() ELSE checked_out_at END,
             checked_out_by_id=CASE WHEN payment_status='PAID' THEN $2 ELSE checked_out_by_id END,
             actual_duration_minutes=GREATEST(0,floor(extract(epoch from (now()-service_started_at))/60))::int
             WHERE id=$1`,
            [row.id, actor.id],
          );
        } else if (action === 'checkout') {
          if (body.requireEnded === true && !(await client.query(
            "SELECT booking_date + end_time <= now() AT TIME ZONE 'Asia/Ho_Chi_Minh' AS ended FROM bookings WHERE id=$1", [row.id],
          )).rows[0]?.ended) throw new ConflictException('Ca chưa hết giờ theo lịch.');
          if (row.status !== 'IN_SERVICE' || row.session_status !== 'COMPLETED')
            throw new ConflictException('Cần hoàn tất hồ sơ chuyên môn trước khi check-out.');
          if (row.payment_status !== 'PAID')
            throw new ConflictException('Cần hoàn tất thanh toán trước khi check-out.');
          await client.query(
            "UPDATE bookings SET status='COMPLETED',checked_out_at=now(),checked_out_by_id=$2,actual_duration_minutes=GREATEST(0,floor(extract(epoch from (now()-service_started_at))/60))::int WHERE id=$1",
            [row.id, actor.id],
          );
        } else {
          throw new BadRequestException('Thao tác lịch hẹn không được hỗ trợ.');
        }
      } else if (
        ['tuition_transactions', 'invoices'].includes(table) &&
        ['confirm-payment', 'confirm-refund'].includes(body.action)
      ) {
        if (!['PENDING', 'UNPAID'].includes(row.payment_status))
          throw new ConflictException('Chứng từ đã được xử lý.');
        if (!['CASH_AT_SPA', 'BANK_TRANSFER'].includes(row.payment_method))
          throw new BadRequestException(
            'Thanh toán qua cổng cần xác minh webhook, không xác nhận tay.',
          );
        if (table === 'tuition_transactions') {
          const enrollment = (
            await client.query(
              'SELECT * FROM course_enrollments WHERE id=$1 FOR UPDATE',
              [row.enrollment_id],
            )
          ).rows[0];
          if (
            !enrollment ||
            enrollment.student_id !== row.student_id ||
            enrollment.course_id !== row.course_id
          )
            throw new ConflictException('Thông tin ghi danh không khớp.');
          const refund = row.transaction_type === 'REFUND';
          if (
            refund &&
            (body.action !== 'confirm-refund' || !body.reason?.trim())
          )
            throw new BadRequestException(
              'Phiếu hoàn cần thao tác hoàn tiền và lý do.',
            );
          if (!refund && body.action !== 'confirm-payment')
            throw new BadRequestException('Đây không phải phiếu hoàn học phí.');
          const amount = refund ? -Number(row.amount) : Number(row.amount);
          const updated = await client.query(
            'UPDATE course_enrollments SET amount_paid=amount_paid+$2::numeric WHERE id=$1 AND amount_paid+$2::numeric<=tuition_total AND amount_paid+$2::numeric>=0 RETURNING id',
            [row.enrollment_id, amount],
          );
          if (!updated.rowCount)
            throw new ConflictException('Số tiền vượt học phí còn phải thu.');
          if (refund)
            await client.query(
              'UPDATE tuition_transactions SET notes=$2 WHERE id=$1',
              [row.id, body.reason.trim().slice(0, 2000)],
            );
        } else {
          if (body.action !== 'confirm-payment')
            throw new BadRequestException(
              'Dùng thao tác hoàn trên hóa đơn đã thu.',
            );
          if (
            Number(row.total_amount) <= 0 ||
            Number(row.total_amount) !==
              Math.round(
                (Number(row.subtotal) -
                  Number(row.discount_amount) -
                  Number(row.points_redeemed_amount) +
                  Number(row.vat_amount)) *
                  100,
              ) /
                100
          )
            throw new BadRequestException('Tổng tiền hóa đơn không hợp lệ.');
          if (Number(row.points_redeemed_amount) > 0)
            throw new BadRequestException(
              'Chưa hỗ trợ trừ điểm bằng thao tác thu tay.',
            );
          if (row.enrollment_id)
            throw new BadRequestException(
              'Thu học phí trong phân hệ Học phí để tránh ghi nhận trùng.',
            );
          const items = await client.query(
            'SELECT coalesce(sum(amount),0)::text total,count(*)::int count FROM invoice_items WHERE invoice_id=$1',
            [row.id],
          );
          if (
            !items.rows[0].count ||
            Number(items.rows[0].total) !== Number(row.subtotal)
          )
            throw new BadRequestException(
              'Chi tiết hóa đơn chưa khớp tổng trước giảm.',
            );
          if (row.booking_id) {
            const booking = (
              await client.query(
                'SELECT * FROM bookings WHERE id=$1 FOR UPDATE',
                [row.booking_id],
              )
            ).rows[0];
            if (
              !booking ||
              booking.customer_id !== row.customer_id ||
              booking.branch_id !== row.branch_id ||
              booking.payment_status === 'PAID' ||
              Number(booking.final_price) !== Number(row.total_amount)
            )
              throw new ConflictException(
                'Hóa đơn không khớp lịch hẹn hoặc lịch đã thu tiền.',
              );
            await client.query(
              `UPDATE bookings SET payment_status='PAID',payment_method=$2,
               status=CASE WHEN session_status='COMPLETED' THEN 'COMPLETED'::booking_status ELSE status END,
               checked_out_at=CASE WHEN session_status='COMPLETED' THEN now() ELSE checked_out_at END,
               checked_out_by_id=CASE WHEN session_status='COMPLETED' THEN $3 ELSE checked_out_by_id END
               WHERE id=$1`,
              [row.booking_id, row.payment_method, actor.id],
            );
          }
        }
        let shiftToUpdate: any = null;
        if (row.branch_id) {
          const openShift = (
            await client.query(
              `SELECT id FROM cashier_shifts WHERE cashier_id=$1 AND branch_id=$2 AND status='OPEN' ORDER BY opened_at DESC LIMIT 1`,
              [actor.id, row.branch_id],
            )
          ).rows[0];
          if (openShift) shiftToUpdate = openShift;
        }
        await client.query(
          `UPDATE public.${quote(table)} SET payment_status='PAID',paid_at=now(),cashier_id=$2${shiftToUpdate ? ',shift_id=$3' : ''} WHERE id=$1`,
          shiftToUpdate ? [row.id, actor.id, shiftToUpdate.id] : [row.id, actor.id],
        );
        if (shiftToUpdate) {
          const delta = (table === 'tuition_transactions' && row.transaction_type === 'REFUND') ? -Number(row.amount) : Number(row.amount || row.total_amount);
          await this.updateCashierShiftTotals(client, shiftToUpdate.id, row.payment_method, delta);
        }
      } else if (table === 'invoices' && body.action === 'refund') {
        if (row.payment_status !== 'PAID' || !body.reason?.trim())
          throw new ConflictException('Chỉ hoàn hóa đơn đã thu và cần lý do.');
        const user = (
          await client.query(
            'SELECT reward_points FROM users WHERE id=$1 FOR UPDATE',
            [row.customer_id],
          )
        ).rows[0];
        const earned = (
          await client.query(
            "SELECT coalesce(sum(points_change),0)::int n FROM point_transactions WHERE reference_id=$1 AND action_type='BOOKING_EARN'",
            [row.id],
          )
        ).rows[0].n;
        const deducted = Math.min(
          Number(user.reward_points),
          Math.max(0, Number(earned)),
        );
        if (deducted > 0) {
          const updated = (
            await client.query(
              'UPDATE users SET reward_points=reward_points-$2 WHERE id=$1 RETURNING reward_points',
              [row.customer_id, deducted],
            )
          ).rows[0];
          await client.query(
            "INSERT INTO point_transactions(user_id,points_change,balance_after,action_type,description,reference_id) VALUES($1,$2,$3,'REFUND_REVERSAL',$4,$5)",
            [
              row.customer_id,
              -deducted,
              updated.reward_points,
              'Hoàn hóa đơn ' + row.invoice_code,
              row.id,
            ],
          );
        }
        await client.query(
          "UPDATE invoices SET payment_status='REFUNDED',refund_amount=total_amount,refunded_at=now(),refund_reason=$2,refunded_by_id=$3 WHERE id=$1",
          [row.id, body.reason.trim().slice(0, 2000), actor.id],
        );
        if (row.booking_id)
          await client.query(
            "UPDATE bookings SET payment_status='REFUNDED' WHERE id=$1",
            [row.booking_id],
          );
      } else if (table === 'student_certificates' && body.action === 'issue') {
        if (row.status !== 'DRAFT')
          throw new ConflictException('Chỉ phát hành chứng chỉ nháp.');
        const record = (
          await client.query(
            'SELECT * FROM student_academic_records WHERE enrollment_id=$1 FOR UPDATE',
            [row.enrollment_id],
          )
        ).rows[0];
        const enrollment = (
          await client.query(
            'SELECT * FROM course_enrollments WHERE id=$1 FOR UPDATE',
            [row.enrollment_id],
          )
        ).rows[0];
        if (
          !record?.is_graduated ||
          Number(record.theory_score) < 5 ||
          Number(record.practical_score) < 5 ||
          Number(record.attendance_rate) < 80 ||
          enrollment?.student_id !== row.student_id ||
          enrollment?.course_id !== row.course_id ||
          Number(enrollment.amount_paid) < Number(enrollment.tuition_total)
        )
          throw new ConflictException(
            'Cần tốt nghiệp, đủ học phí, điểm lý thuyết/thực hành từ 5 và chuyên cần từ 80%.',
          );
        await client.query(
          "UPDATE student_certificates SET status='ISSUED',issue_date=CURRENT_DATE,theory_score=$2,practical_score=$3 WHERE id=$1",
          [row.id, record.theory_score, record.practical_score],
        );
        await client.query(
          'UPDATE student_academic_records SET certificate_id=$2 WHERE enrollment_id=$1',
          [row.enrollment_id, row.id],
        );
      } else if (table === 'student_certificates' && body.action === 'revoke') {
        if (row.status !== 'ISSUED' || !body.reason?.trim())
          throw new BadRequestException(
            'Chỉ thu hồi chứng chỉ đã phát hành và cần lý do.',
          );
        await client.query(
          "UPDATE student_certificates SET status='REVOKED',revoked_at=now(),revocation_reason=$2 WHERE id=$1",
          [row.id, body.reason.trim().slice(0, 2000)],
        );
      } else if (table === 'user_packages') {
        const action = body.action || '';
        const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
        if (action === 'pause') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'].includes(actor.role))
            throw new ForbiddenException('Tài khoản chưa được cấp quyền tạm dừng gói liệu trình.');
          if (!reason || reason.length < 3)
            throw new BadRequestException('Bắt buộc nhập lý do tạm dừng gói liệu trình.');
          if (row.status !== 'ACTIVE')
            throw new ConflictException('Chỉ có thể tạm dừng gói đang ở trạng thái hoạt động.');
          if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
            throw new ConflictException('Gói đã hết hạn sử dụng, không thể tạm dừng.');
          await client.query(
            "UPDATE user_packages SET status='PAUSED', paused_at=now() WHERE id=$1",
            [row.id],
          );
          await client.query(
            `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
             VALUES($1, 'ACTIVE', 'PAUSED', 'PAUSE', $2, $3, $4::jsonb)`,
            [row.id, reason.slice(0, 2000), actor.id, JSON.stringify({ pausedAt: new Date().toISOString() })],
          );
        } else if (action === 'resume') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'].includes(actor.role))
            throw new ForbiddenException('Tài khoản chưa được cấp quyền mở lại gói liệu trình.');
          if (row.status !== 'PAUSED')
            throw new ConflictException('Chỉ có thể mở lại gói đang tạm dừng.');
          if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
            throw new ConflictException('Gói đã hết hạn sử dụng trong thời gian tạm dừng. Vui lòng gia hạn trước.');
          await client.query(
            "UPDATE user_packages SET status='ACTIVE', resumed_at=now() WHERE id=$1",
            [row.id],
          );
          await client.query(
            `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
             VALUES($1, 'PAUSED', 'ACTIVE', 'RESUME', $2, $3, $4::jsonb)`,
            [row.id, (reason || 'Mở lại gói liệu trình').slice(0, 2000), actor.id, JSON.stringify({ resumedAt: new Date().toISOString() })],
          );
        } else if (action === 'extend') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
            throw new ForbiddenException('Tài khoản chưa được cấp quyền gia hạn gói liệu trình.');
          const extensionMonths = Number((body as any).extensionMonths ?? 1);
          if (!Number.isInteger(extensionMonths) || extensionMonths < 1 || extensionMonths > 24)
            throw new BadRequestException('Số tháng gia hạn phải là số nguyên từ 1 đến 24 tháng.');
          if (!reason || reason.length < 3)
            throw new BadRequestException('Bắt buộc nhập lý do gia hạn gói liệu trình.');
          if (['CANCELLED', 'REFUNDED', 'TRANSFERRED'].includes(row.status))
            throw new ConflictException('Không thể gia hạn gói đã hủy, hoàn tiền hoặc chuyển nhượng.');
          const currentExpiry = row.expires_at ? new Date(row.expires_at).getTime() : Date.now();
          const baseDate = currentExpiry > Date.now() ? row.expires_at : new Date().toISOString();
          const newStatus = (row.status === 'EXPIRED' && Number(row.completed_sessions) < Number(row.total_sessions))
            ? 'ACTIVE'
            : row.status;
          await client.query(
            `UPDATE user_packages
             SET expires_at = ($2::timestamptz + ($3::int * interval '1 month')),
                 extension_months = COALESCE(extension_months, 0) + $3::int,
                 original_expires_at = COALESCE(original_expires_at, expires_at),
                 status = $4
             WHERE id=$1`,
            [row.id, baseDate, extensionMonths, newStatus],
          );
          await client.query(
            `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
             VALUES($1, $2, $3, 'EXTEND_EXPIRY', $4, $5, $6::jsonb)`,
            [row.id, row.status, newStatus, reason.slice(0, 2000), actor.id, JSON.stringify({ extensionMonths, previousExpiry: row.expires_at })],
          );
        } else if (action === 'cancel') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
            throw new ForbiddenException('Tài khoản chưa được cấp quyền hủy gói liệu trình.');
          if (!reason || reason.length < 5)
            throw new BadRequestException('Bắt buộc nhập lý do hủy gói chi tiết (tối thiểu 5 ký tự).');
          if (['CANCELLED', 'REFUNDED', 'TRANSFERRED'].includes(row.status))
            throw new ConflictException('Gói đã ở trạng thái kết thúc, không thể hủy.');
          const activeBookings = await client.query(
            `SELECT 1 FROM bookings b
             WHERE b.customer_id=$1 AND b.status IN ('CHECKED_IN', 'IN_SERVICE')
               AND EXISTS (
                 SELECT 1 FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id
                 JOIN booking_items bi ON bi.booking_id=b.id AND bi.service_id=tp.service_id
                 WHERE up.id=$2
               ) LIMIT 1`,
            [row.customer_id, row.id],
          );
          if (activeBookings.rowCount)
            throw new ConflictException('Không thể hủy gói khi đang có ca dịch vụ diễn ra.');
          await client.query(
            "UPDATE user_packages SET status='CANCELLED', cancelled_at=now(), cancelled_reason=$2 WHERE id=$1",
            [row.id, reason.slice(0, 2000)],
          );
          await client.query(
            `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
             VALUES($1, $2, 'CANCELLED', 'CANCEL', $3, $4, $5::jsonb)`,
            [row.id, row.status, reason.slice(0, 2000), actor.id, JSON.stringify({ cancelledAt: new Date().toISOString() })],
          );
        } else if (action === 'transfer') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
            throw new ForbiddenException('Tài khoản chưa được cấp quyền chuyển nhượng gói.');
          const newCustomerId = String((body as any).newCustomerId || '');
          if (!this.isUuid(newCustomerId))
            throw new BadRequestException('Vui lòng chọn khách hàng nhận chuyển nhượng hợp lệ.');
          if (newCustomerId === row.customer_id)
            throw new BadRequestException('Không thể chuyển nhượng cho chính chủ sở hữu hiện tại.');
          if (!reason || reason.length < 5)
            throw new BadRequestException('Bắt buộc nhập lý do chuyển nhượng chi tiết.');
          if (['CANCELLED', 'REFUNDED', 'TRANSFERRED', 'COMPLETED'].includes(row.status))
            throw new ConflictException('Không thể chuyển nhượng gói đã kết thúc hoặc đã chuyển nhượng.');
          const newCustomer = (await client.query(
            'SELECT id, full_name, is_active FROM users WHERE id=$1',
            [newCustomerId],
          )).rows[0];
          if (!newCustomer || !newCustomer.is_active)
            throw new NotFoundException('Khách hàng nhận chuyển nhượng không tồn tại hoặc đã bị khóa.');
          const remainingSessions = Number(row.total_sessions) - Number(row.completed_sessions);
          if (remainingSessions <= 0)
            throw new ConflictException('Gói không còn buổi để chuyển nhượng.');
          await client.query(
            `UPDATE user_packages
             SET status='TRANSFERRED', transferred_to_user_id=$2, transferred_at=now(), transfer_reason=$3
             WHERE id=$1`,
            [row.id, newCustomerId, reason.slice(0, 2000)],
          );
          const transferredPackage = (await client.query(
            `INSERT INTO user_packages(
               customer_id, package_id, total_sessions, completed_sessions, status,
               purchased_at, expires_at, transferred_from_package_id
             ) VALUES($1, $2, $3, 0, 'ACTIVE', now(), $4, $5)
             RETURNING id`,
            [newCustomerId, row.package_id, remainingSessions, row.expires_at, row.id],
          )).rows[0];
          await client.query(
            `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
             VALUES($1, $2, 'TRANSFERRED', 'TRANSFER', $3, $4, $5::jsonb)`,
            [
              row.id,
              row.status,
              reason.slice(0, 2000),
              actor.id,
              JSON.stringify({ previousCustomerId: row.customer_id, newCustomerId, newCustomerName: newCustomer.full_name, transferredPackageId: transferredPackage.id }),
            ],
          );
        } else if (action === 'refund') {
          if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
            throw new ForbiddenException('Chỉ Quản trị viên mới được thực hiện hoàn tiền gói.');
          if (!reason || reason.length < 5)
            throw new BadRequestException('Bắt buộc nhập lý do hoàn tiền chi tiết.');
          if (['REFUNDED', 'CANCELLED'].includes(row.status))
            throw new ConflictException('Gói đã được hoàn tiền hoặc hủy trước đó.');
          const refundAmount = Number((body as any).refundAmount ?? 0);
          if (!Number.isFinite(refundAmount) || refundAmount < 0)
            throw new BadRequestException('Số tiền hoàn không hợp lệ.');
          await client.query(
            `UPDATE user_packages
             SET status='REFUNDED', refunded_at=now(), refund_amount=$2, refund_reason=$3
             WHERE id=$1`,
            [row.id, refundAmount, reason.slice(0, 2000)],
          );
          const commissions = await client.query(
            `SELECT * FROM staff_commissions
             WHERE user_package_id=$1 AND reversal_of_id IS NULL AND commission_amount > 0 FOR UPDATE`,
            [row.id],
          );
          for (const comm of commissions.rows) {
            await client.query(
              `INSERT INTO staff_commissions(
                 staff_id, branch_id, invoice_id, user_package_id, commission_type, base_amount,
                 percentage, commission_amount, status, cycle_month, notes, reversal_of_id, reversed_at, source_session_status
               ) VALUES (
                 $1, $2, $3, $4, $5, -($6::numeric), $7, -($8::numeric), 'PENDING', to_char(now(), 'YYYY-MM'),
                 $9, $10, now(), 'REFUNDED'
               ) ON CONFLICT (reversal_of_id) WHERE reversal_of_id IS NOT NULL DO NOTHING`,
              [
                comm.staff_id, comm.branch_id, comm.invoice_id, null, 'REVERSAL',
                comm.base_amount, comm.percentage, comm.commission_amount,
                `Đảo hoa hồng do hoàn tiền gói: ${reason.slice(0, 500)}`, comm.id,
              ],
            );
            await client.query('UPDATE staff_commissions SET reversed_at=now(), source_session_status=\'REFUNDED\' WHERE id=$1', [comm.id]);
          }
          await client.query(
            `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
             VALUES($1, $2, 'REFUNDED', 'REFUND', $3, $4, $5::jsonb)`,
            [row.id, row.status, reason.slice(0, 2000), actor.id, JSON.stringify({ refundAmount, refundedAt: new Date().toISOString() })],
          );
        } else {
          throw new BadRequestException(`Thao tác ${action} trên gói liệu trình không được hỗ trợ.`);
        }
      } else if (table === 'treatment_journal') {
        const action = body.action || '';
        const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

        if (['save-draft', 'save-treatment-draft'].includes(action)) {
          if (!['DRAFT', 'PENDING'].includes(row.confirmation_status))
            throw new ConflictException('Chỉ chỉnh sửa hồ sơ còn ở trạng thái bản nháp.');
          if (row.is_reversed)
            throw new ConflictException('Buổi điều trị đã được hoàn tác, không thể chỉnh sửa.');
          if (row.confirmation_status === 'CONFIRMED')
            throw new ConflictException('Buổi điều trị đã được xác nhận hoàn thành, không thể sửa nháp.');

          const vals = ((body as any).values || body) as Record<string, any>;
          const allowedFields = [
            'condition_before', 'condition_after', 'treatment_notes', 'specialist_advice',
            'treatment_areas', 'treatment_protocol', 'technical_parameters',
            'has_abnormal_reaction', 'adverse_reactions', 'consumables_used',
            'photos_metadata', 'home_care_instructions', 'next_session_recommended_at', 'next_session_notes',
            'treatment_start_time', 'treatment_end_time',
            'before_photos', 'after_photos',
          ];
          const updates: string[] = ["confirmation_status = 'DRAFT'", 'clinical_approved_at = NULL', 'clinical_approved_by = NULL'];
          const updateVals: any[] = [row.id];

          for (const f of allowedFields) {
            if (vals[f] !== undefined) {
              updateVals.push(['technical_parameters', 'consumables_used', 'photos_metadata', 'before_photos', 'after_photos'].includes(f) ? JSON.stringify(vals[f]) : vals[f]);
              updates.push(`${quote(f)} = $${updateVals.length}`);
            }
          }

          await client.query(
            `UPDATE treatment_journal SET ${updates.join(', ')} WHERE id = $1`,
            updateVals,
          );
        } else if (['submit-session', 'submit-treatment-session', 'submit'].includes(action)) {
          if (!['DRAFT','PENDING'].includes(row.confirmation_status))
            throw new ConflictException('Chỉ gửi hồ sơ còn ở trạng thái bản nháp; không được gửi lại để thay đổi yêu cầu duyệt.');
          if (row.is_reversed)
            throw new ConflictException('Buổi điều trị đã được hoàn tác.');
          if (row.confirmation_status === 'CONFIRMED')
            throw new ConflictException('Buổi điều trị đã được xác nhận hoàn thành.');

          const vals = ((body as any).values || body) as Record<string, any>;
          const before = vals.condition_before || row.condition_before;
          const after = vals.condition_after || row.condition_after;
          const notes = vals.treatment_notes || row.treatment_notes;

          if (!before || !after || !notes)
            throw new BadRequestException('Vui lòng điền đầy đủ tình trạng trước, sau điều trị và ghi chú chuyên môn trước khi gửi.');

          const hasAbnormal = (vals.has_abnormal_reaction !== undefined ? Boolean(vals.has_abnormal_reaction) : Boolean(row.has_abnormal_reaction))
            || Boolean(String(vals.adverse_reactions ?? row.adverse_reactions ?? '').trim());
          const nextStatus = hasAbnormal ? 'REVIEW_REQUIRED' : 'SUBMITTED';

          await client.query(
            `UPDATE treatment_journal
             SET confirmation_status = $2,
                 has_abnormal_reaction = $3,
                 adverse_reactions = COALESCE($4, adverse_reactions),
                 technical_parameters = COALESCE(technical_parameters, '{}'::jsonb) || $5::jsonb
             WHERE id = $1`,
            [
              row.id,
              nextStatus,
              hasAbnormal,
              vals.adverse_reactions || null,
              JSON.stringify({
                submitted_at: new Date().toISOString(),
                submitted_by: actor.id,
              }),
            ],
          );
        } else if (['confirm-session', 'confirm-treatment-session', 'confirm'].includes(action)) {
          if (!['SUBMITTED', 'REVIEW_REQUIRED', 'CONFIRMED'].includes(row.confirmation_status))
            throw new ConflictException('Cần gửi hồ sơ chuyên môn trước khi xác nhận buổi.');
          if (row.is_reversed)
            throw new ConflictException('Buổi điều trị đã được hoàn tác, không thể xác nhận.');
          if (row.confirmation_status === 'CONFIRMED')
            throw new ConflictException('Buổi điều trị này đã được xác nhận trước đó.');

          if (!row.user_package_id)
            throw new BadRequestException('Buổi điều trị không gắn với gói liệu trình.');

          // Khóa dòng user_packages bằng SELECT FOR UPDATE
          const targetPackage = (await client.query(
            'SELECT * FROM user_packages WHERE id=$1 FOR UPDATE',
            [row.user_package_id],
          )).rows[0];

          if (!targetPackage)
            throw new NotFoundException('Không tìm thấy gói liệu trình liên kết.');

          if (targetPackage.status !== 'ACTIVE')
            throw new ConflictException(`Không thể xác nhận buổi cho gói đang ở trạng thái ${targetPackage.status}.`);

          if (targetPackage.expires_at && new Date(targetPackage.expires_at).getTime() <= Date.now())
            throw new ConflictException('Gói liệu trình đã hết hạn sử dụng.');

          if (Number(targetPackage.completed_sessions) >= Number(targetPackage.total_sessions))
            throw new ConflictException('Gói liệu trình đã hoàn thành đủ tất cả các buổi.');

          if (targetPackage.customer_id !== row.customer_id)
            throw new BadRequestException('Khách hàng của gói không khớp với buổi điều trị.');

          if (row.booking_id) {
            const booking = (await client.query(
              'SELECT * FROM bookings WHERE id=$1 FOR UPDATE',
              [row.booking_id],
            )).rows[0];

            if (!booking || booking.customer_id !== row.customer_id)
              throw new BadRequestException('Lịch hẹn không thuộc khách hàng của buổi điều trị.');
            if (booking.status !== 'IN_SERVICE' || booking.session_status === 'COMPLETED')
              throw new ConflictException('Chỉ xác nhận lịch đang phục vụ và chưa hoàn tất chuyên môn.');

            const packageService = (await client.query(
              'SELECT tp.service_id FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id WHERE up.id=$1',
              [targetPackage.id],
            )).rows[0];

            if (packageService?.service_id) {
              const serviceMatches = (await client.query(
                'SELECT 1 FROM booking_items WHERE booking_id=$1 AND service_id=$2 LIMIT 1',
                [booking.id, packageService.service_id],
              )).rowCount;
              if (!serviceMatches)
                throw new ConflictException('Dịch vụ đặt lịch không khớp gói liệu trình.');
            }
          }

          if (row.has_abnormal_reaction || row.confirmation_status === 'REVIEW_REQUIRED') {
            if (!row.clinical_approved_at) {
              throw new ForbiddenException('Hồ sơ có phản ứng bất thường cần Quản lý chi nhánh hoặc Bác sĩ duyệt chuyên môn trước khi xác nhận.');
            }
          }

          const clinicalApprover = row.clinical_approved_by || null;
          const clinicalApprovedAt = row.clinical_approved_at || null;

          await client.query(
            `UPDATE treatment_journal
             SET confirmation_status = 'CONFIRMED',
                 clinical_approved_by = COALESCE(clinical_approved_by, $2),
                 clinical_approved_at = COALESCE(clinical_approved_at, $3),
                 technical_parameters = COALESCE(technical_parameters, '{}'::jsonb) || $4::jsonb
             WHERE id = $1`,
            [
              row.id,
              clinicalApprover,
              clinicalApprovedAt,
              JSON.stringify({
                confirmed_at: new Date().toISOString(),
                confirmed_by: actor.id,
              }),
            ],
          );

          // Tăng completed_sessions đúng 1 lần và chuyển COMPLETED nếu đủ buổi
          const nextCompleted = Number(targetPackage.completed_sessions || 0) + 1;
          const nextStatus = nextCompleted >= Number(targetPackage.total_sessions) ? 'COMPLETED' : targetPackage.status;

          await client.query(
            'UPDATE user_packages SET completed_sessions=$2, status=$3 WHERE id=$1',
            [targetPackage.id, nextCompleted, nextStatus],
          );

          // Phát sinh vật tư tiêu hao vào outbox
          if (Array.isArray(row.consumables_used) && row.consumables_used.length > 0) {
            const bookingBranch = row.booking_id
              ? (await client.query('SELECT branch_id FROM bookings WHERE id=$1', [row.booking_id])).rows[0]?.branch_id
              : null;
            await client.query(
              `INSERT INTO treatment_inventory_outbox(branch_id, treatment_journal_id, booking_id, operation_type, items, sync_status, notes)
               VALUES($1, $2, $3, 'DEDUCT', $4::jsonb, 'PENDING_SYNC', $5)`,
              [bookingBranch, row.id, row.booking_id, JSON.stringify(row.consumables_used), `Tiêu hao theo buổi ${row.session_number}`],
            );
          }

          // Phát sinh post-care outbox
          if (row.home_care_instructions) {
            await client.query(
              `INSERT INTO post_care_outbox(treatment_journal_id, customer_id, channel, content, status)
               VALUES($1, $2, 'IN_APP', $3, 'PENDING')`,
              [row.id, row.customer_id, row.home_care_instructions],
            );
          }

          // Phát sinh hoa hồng kỹ thuật viên nếu có
          const techId = row.technician_id || (row.booking_id ? (await client.query('SELECT technician_id FROM bookings WHERE id=$1', [row.booking_id])).rows[0]?.technician_id : null);
          if (techId) {
            let staffUserId: string | null = null;
            let techBranchId: string | null = null;

            const isUser = (await client.query('SELECT 1 FROM users WHERE id=$1', [techId])).rowCount;
            if (isUser) {
              staffUserId = techId;
            } else {
              const techRow = (await client.query('SELECT user_id, branch_id FROM technicians WHERE id=$1', [techId])).rows[0];
              if (techRow?.user_id) staffUserId = techRow.user_id;
              if (techRow?.branch_id) techBranchId = techRow.branch_id;
            }

            const bookingRow = row.booking_id ? (await client.query('SELECT branch_id, base_total FROM bookings WHERE id=$1', [row.booking_id])).rows[0] : null;
            const effectiveBranchId = bookingRow?.branch_id || techBranchId;

            if (staffUserId && effectiveBranchId) {
              const existingComm = (await client.query('SELECT 1 FROM staff_commissions WHERE treatment_journal_id=$1 LIMIT 1', [row.id])).rowCount;
              if (!existingComm) {
                const baseAmt = Number(bookingRow?.base_total ?? 0);
                await client.query(
                  `INSERT INTO staff_commissions(staff_id, branch_id, booking_id, treatment_journal_id, commission_type, base_amount, percentage, commission_amount, status, cycle_month, notes, source_session_status)
                   VALUES($1, $2, $3, $4, 'TREATMENT_SESSION', $5, 10, round($5 * 0.1), 'PENDING', to_char(now(), 'YYYY-MM'), $6, 'CONFIRMED')
                   ON CONFLICT DO NOTHING`,
                  [staffUserId, effectiveBranchId, row.booking_id, row.id, baseAmt, `Hoa hồng thực hiện buổi ${row.session_number}`],
                );
              }
            }
          }

          if (row.booking_id) {
            await client.query(
              `UPDATE bookings SET session_status='COMPLETED',
               payment_status=CASE WHEN final_price=0 AND payment_method::text='MEMBERSHIP_WALLET'
                 AND special_notes LIKE ('%user_package_id=' || $2::text || ']%') THEN 'PAID'::payment_status ELSE payment_status END,
               status=CASE WHEN final_price=0 AND payment_method::text='MEMBERSHIP_WALLET'
                 AND special_notes LIKE ('%user_package_id=' || $2::text || ']%') THEN 'COMPLETED'::booking_status ELSE status END,
               checked_out_at=CASE WHEN final_price=0 AND payment_method::text='MEMBERSHIP_WALLET'
                 AND special_notes LIKE ('%user_package_id=' || $2::text || ']%') THEN now() ELSE checked_out_at END
               WHERE id=$1`,
              [row.booking_id, targetPackage.id],
            );
          }

          await this.audit(client, actor, 'treatment_journal', 'CONFIRM_SESSION', row.id);
        } else if (action === 'reverse') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
            throw new ForbiddenException('Chỉ Quản lý chi nhánh hoặc Quản trị viên mới được hoàn tác buổi.');
          if (!reason || reason.length < 5)
            throw new BadRequestException('Bắt buộc nhập lý do hoàn tác buổi chi tiết (tối thiểu 5 ký tự).');
          if (row.is_reversed)
            throw new ConflictException('Buổi điều trị này đã được hoàn tác trước đó.');
          if (row.confirmation_status !== 'CONFIRMED')
            throw new BadRequestException('Chỉ có thể hoàn tác buổi điều trị đã được xác nhận.');

          const idempotencyKey = String((body as any).idempotencyKey || `rev-${row.id}`);
          const existingRev = await client.query(
            'SELECT id FROM treatment_session_reversals WHERE journal_id=$1 OR idempotency_key=$2 LIMIT 1',
            [row.id, idempotencyKey],
          );
          if (existingRev.rowCount)
            throw new ConflictException('Buổi điều trị này đã có bản ghi hoàn tác.');

          let userPackageId = row.user_package_id;
          let targetPackage: any = null;
          if (userPackageId) {
            targetPackage = (await client.query(
              'SELECT * FROM user_packages WHERE id=$1 FOR UPDATE',
              [userPackageId],
            )).rows[0];
            if (targetPackage) {
              const currentCompleted = Number(targetPackage.completed_sessions || 0);
              const nextCompleted = Math.max(0, currentCompleted - 1);
              const nextStatus = targetPackage.status === 'COMPLETED' ? 'ACTIVE' : targetPackage.status;
              await client.query(
                'UPDATE user_packages SET completed_sessions=$2, status=$3 WHERE id=$1',
                [userPackageId, nextCompleted, nextStatus],
              );
              await client.query(
                `INSERT INTO user_package_lifecycle_logs(user_package_id, from_status, to_status, action, reason, performed_by, metadata)
                 VALUES($1, $2, $3, 'SESSION_REVERSED', $4, $5, $6::jsonb)`,
                [
                  userPackageId,
                  targetPackage.status,
                  nextStatus,
                  `Hoàn tác buổi ${row.session_number}: ${reason.slice(0, 1000)}`,
                  actor.id,
                  JSON.stringify({ journalId: row.id, sessionNumber: row.session_number, previousCompleted: currentCompleted, nextCompleted }),
                ],
              );
            }
          }

          const revRecord = (await client.query(
            `INSERT INTO treatment_session_reversals(
               journal_id, user_package_id, booking_id, session_number, reason, reversed_by, reversed_at, idempotency_key, metadata
             ) VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $8::jsonb) RETURNING *`,
            [
              row.id,
              userPackageId,
              row.booking_id,
              row.session_number,
              reason.slice(0, 2000),
              actor.id,
              idempotencyKey,
              JSON.stringify({ reversedAt: new Date().toISOString(), sessionDate: row.session_date }),
            ],
          )).rows[0];

          await client.query(
            `UPDATE treatment_journal
             SET is_reversed=TRUE, reversed_at=now(), reversed_by=$2, reversal_reason=$3, reversal_id=$4, confirmation_status='REVERSED'
             WHERE id=$1`,
            [row.id, actor.id, reason.slice(0, 2000), revRecord.id],
          );

          if (row.booking_id) {
            await client.query(
              "UPDATE bookings SET session_status='REVERSED' WHERE id=$1",
              [row.booking_id],
            );
          }

          const commissions = await client.query(
            `SELECT * FROM staff_commissions
             WHERE (treatment_journal_id=$1 OR (booking_id=$2 AND $2::uuid IS NOT NULL))
               AND reversal_of_id IS NULL AND commission_amount > 0 FOR UPDATE`,
            [row.id, row.booking_id],
          );
          for (const comm of commissions.rows) {
            await client.query(
              `INSERT INTO staff_commissions(
                 staff_id, branch_id, booking_id, treatment_journal_id, commission_type, base_amount,
                 percentage, commission_amount, status, cycle_month, notes, reversal_of_id, reversed_at, source_session_status
               ) VALUES (
                 $1, $2, $3, $4, $5, -($6::numeric), $7, -($8::numeric), 'PENDING', to_char(now(), 'YYYY-MM'),
                 $9, $10, now(), 'REVERSED'
               ) ON CONFLICT (reversal_of_id) WHERE reversal_of_id IS NOT NULL DO NOTHING`,
              [
                comm.staff_id, comm.branch_id, comm.booking_id, null, 'REVERSAL',
                comm.base_amount, comm.percentage, comm.commission_amount,
                `Đảo hoa hồng do hoàn tác buổi ${row.session_number}: ${reason.slice(0, 500)}`, comm.id,
              ],
            );
            await client.query('UPDATE staff_commissions SET reversed_at=now(), source_session_status=\'REVERSED\' WHERE id=$1', [comm.id]);
          }

          if (Array.isArray(row.consumables_used) && row.consumables_used.length > 0) {
            const bookingBranch = row.booking_id
              ? (await client.query('SELECT branch_id FROM bookings WHERE id=$1', [row.booking_id])).rows[0]?.branch_id
              : null;
            await client.query(
              `INSERT INTO treatment_inventory_outbox(branch_id, treatment_journal_id, booking_id, operation_type, items, sync_status, notes)
               VALUES($1, $2, $3, 'REVERSE_RESTORE', $4::jsonb, 'PENDING_SYNC', $5)`,
              [bookingBranch, row.id, row.booking_id, JSON.stringify(row.consumables_used), `Hoàn trả kho khi hoàn tác buổi ${row.session_number}`],
            );
          }
        } else if (action === 'approve-clinical') {
          if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(actor.role))
            throw new ForbiddenException('Chỉ bác sĩ / chuyên gia được duyệt hồ sơ chuyên môn.');
          if (row.is_reversed || row.confirmation_status !== 'REVIEW_REQUIRED')
            throw new ConflictException('Chỉ duyệt chuyên môn hồ sơ đã gửi và đang chờ duyệt.');
          await client.query(
            `UPDATE treatment_journal
             SET clinical_approved_by=$2,
                 clinical_approved_at=now(),
                 confirmation_status=CASE WHEN confirmation_status='REVIEW_REQUIRED' THEN 'SUBMITTED' ELSE confirmation_status END
             WHERE id=$1`,
            [row.id, actor.id],
          );
        } else if (action === 'update-post-care') {
          const instructions = typeof (body as any).instructions === 'string' ? (body as any).instructions.trim() : '';
          await client.query(
            "UPDATE treatment_journal SET home_care_instructions=$2, post_care_status='DRAFT' WHERE id=$1",
            [row.id, instructions],
          );
          if (instructions) {
            await client.query(
              `INSERT INTO post_care_outbox(treatment_journal_id, customer_id, channel, content, status)
               VALUES($1, $2, 'IN_APP', $3, 'PENDING')`,
              [row.id, row.customer_id, instructions],
            );
          }
        } else {
          throw new BadRequestException(`Thao tác ${action} trên nhật ký điều trị không được hỗ trợ.`);
        }
      } else throw new BadRequestException('Thao tác không được hỗ trợ.');
      const updatedRow = (
        await client.query(`SELECT * FROM public.${quote(table)} WHERE ${key.clause}`, key.values)
      ).rows[0];
      await this.audit(client, actor, table, body.action, row.id);
      await client.query('COMMIT');
      return updatedRow || { completed: true };
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  async recordMaterialCount(actor: AdminActor, body: Record<string,unknown>) {
    return recordMaterialCount(this.db.connection,actor,body);
  }

  async syncInventory(actor:AdminActor,id:string) {
    if(!this.isUuid(id))throw new BadRequestException('Mã yêu cầu kho không hợp lệ.');
    const row=(await this.db.connection.query('SELECT * FROM treatment_inventory_outbox WHERE id=$1',[id])).rows[0];
    if(!row)throw new NotFoundException('Không tìm thấy yêu cầu kho.');
    await assertRowScope(this.db.connection,'treatment_inventory_outbox',row,['branch_id'],actor,'action');
    return syncInventoryItem(this.db.connection,id);
  }

  async bookTreatmentSession(actor: AdminActor, packageId: string, body: Record<string, unknown>) {
    return createTreatmentBooking(this.db.connection,actor,packageId,body);
  }

  async commissionsWorkspace(actor: AdminActor, month: string) {
    const branches = allowedBranches(actor, 'staff_commissions.read');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ''))
      throw new BadRequestException('Chọn kỳ hoa hồng hợp lệ.');
    const rows = (await this.db.connection.query(
      `SELECT c.id,c.staff_id,c.branch_id,c.cycle_month,c.status,c.notes,c.commission_type,
        c.base_amount,c.percentage,c.commission_amount,c.reversed_at,c.reversal_of_id,
        u.full_name AS staff_name,b.name AS branch_name,i.invoice_code,bk.booking_code
       FROM staff_commissions c JOIN users u ON u.id=c.staff_id JOIN branches b ON b.id=c.branch_id
       LEFT JOIN invoices i ON i.id=c.invoice_id LEFT JOIN bookings bk ON bk.id=c.booking_id
       WHERE c.cycle_month=$1 AND ($2::uuid[] IS NULL OR c.branch_id=ANY($2))
       ORDER BY c.created_at DESC,c.id DESC`, [month, branches],
    )).rows;
    let actionBranches: string[] | null = [];
    try { actionBranches = allowedBranches(actor, 'staff_commissions.action'); }
    catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    return { rows, actionBranches };
  }

  async transitionCommissions(actor: AdminActor, body: { action?: string; entries?: unknown }) {
    const branches = allowedBranches(actor, 'staff_commissions.action');
    const { action, entries } = body;
    if (!['approve', 'record-payment'].includes(action || '') || !Array.isArray(entries) ||
      !entries.length || entries.length > 100 || (action === 'record-payment' && entries.length !== 1) ||
      entries.some(item => !item || typeof item.id !== 'string' || !this.isUuid(item.id) || !Number.isFinite(item.amount)))
      throw new BadRequestException('Danh sách khoản hoa hồng cần xử lý không hợp lệ.');
    const expected = new Map<string, number>(entries.map(item => [item.id, item.amount]));
    if (expected.size !== entries.length) throw new BadRequestException('Khoản hoa hồng bị chọn trùng.');
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))");
      const { rows } = await client.query(
        'SELECT id,branch_id,status,commission_amount,reversed_at,reversal_of_id FROM staff_commissions WHERE id=ANY($1::uuid[]) AND ($2::uuid[] IS NULL OR branch_id=ANY($2)) ORDER BY id FOR UPDATE',
        [[...expected.keys()], branches],
      );
      const validStatus = action === 'approve' ? ['PENDING', 'PENDING_APPROVAL'] : ['APPROVED'];
      if (rows.length !== expected.size || rows.some(row => !validStatus.includes(row.status) || row.reversed_at ||
        row.reversal_of_id || Number(row.commission_amount) <= 0 || Number(row.commission_amount) !== expected.get(row.id)))
        throw new ConflictException('Danh sách đã thay đổi hoặc có khoản không đủ điều kiện. Tải lại và đối soát trước khi xác nhận.');
      await client.query('UPDATE staff_commissions SET status=$2 WHERE id=ANY($1::uuid[])',
        [[...expected.keys()], action === 'approve' ? 'APPROVED' : 'PAID']);
      for (const row of rows)
        await this.audit(client, actor, 'staff_commissions', action === 'approve' ? 'APPROVE_COMMISSION' : 'RECORD_COMMISSION_PAYMENT', row.id);
      await client.query('COMMIT');
      return { count: rows.length };
    } catch (error) {
      await client.query('ROLLBACK');
      return this.fail(error);
    } finally {
      client.release();
    }
  }

  async staffScheduleSlots(actor: AdminActor, query: Record<string,string>) {
    const client = await this.db.connection.connect();
    try {
      const {slots, shifts} = await scheduleAvailability(client, actor, query.branchId || '', query.date || '', query.serviceId || '');
      return {slots, shifts: shifts.map(shift => ({
        technicianId: shift.technician_id,
        start: String(shift.start_time).slice(0, 5),
        end: String(shift.end_time).slice(0, 5),
      }))};
    } finally { client.release(); }
  }

  async createScheduleBooking(actor: AdminActor, body: Record<string, unknown>) {
    try { return await createStaffBooking(this.db.connection, actor, body); }
    catch (error) { return this.fail(error); }
  }

  async assignScheduleBooking(actor: AdminActor, body: Record<string, unknown>) {
    try {
      return await assignStaffBooking(this.db.connection, actor, String(body.bookingId || ''), String(body.technicianId || ''));
    } catch (error) { return this.fail(error); }
  }

  async startTreatmentDraft(actor: AdminActor, packageId: string, bookingId: string) {
    if (!this.isUuid(packageId) || !this.isUuid(bookingId)) throw new BadRequestException('Mã gói hoặc lịch hẹn không hợp lệ.');
    const packageColumns = await this.columns('user_packages',actor);
    const journalColumns = await this.columns('treatment_journal',actor);
    const bookingColumns = await this.columns('bookings',actor);
    const pkg = (await this.db.connection.query('SELECT * FROM user_packages WHERE id=$1',[packageId])).rows[0];
    const booking = (await this.db.connection.query('SELECT * FROM bookings WHERE id=$1',[bookingId])).rows[0];
    if (!pkg || !booking) throw new NotFoundException('Không tìm thấy gói hoặc lịch hẹn.');
    await assertRowScope(this.db.connection,'user_packages',pkg,packageColumns.map(c=>c.name),actor,'read');
    await assertRowScope(this.db.connection,'bookings',booking,bookingColumns.map(c=>c.name),actor,'read');
    if (pkg.customer_id !== booking.customer_id) throw new ConflictException('Lịch hẹn không thuộc khách hàng của gói.');
    const linked = String(booking.special_notes || '').match(/user_package_id=([0-9a-f-]{36})/i)?.[1];
    if (linked && linked !== packageId) throw new ConflictException('Lịch hẹn đã liên kết với gói liệu trình khác.');
    const existing = (await this.db.connection.query('SELECT * FROM treatment_journal WHERE booking_id=$1',[bookingId])).rows[0];
    if (existing) {
      await assertRowScope(this.db.connection,'treatment_journal',existing,journalColumns.map(c=>c.name),actor,'create');
      if (existing.user_package_id !== packageId) throw new ConflictException('Lịch hẹn đã được ghi nhận bằng gói khác.');
      return existing;
    }
    try { return await this.mutate('treatment_journal',actor,'create',{ values: {
      user_package_id:packageId,booking_id:bookingId,customer_id:booking.customer_id,
      technician_id:booking.technician_id,assigned_room_id:booking.assigned_room_id,
      session_date: booking.booking_date instanceof Date ? booking.booking_date.toISOString().slice(0,10) : String(booking.booking_date).slice(0,10),session_number:1,confirmation_status:'DRAFT',
    } }, true); } catch (error) {
      const saved = (await this.db.connection.query('SELECT * FROM treatment_journal WHERE booking_id=$1 AND user_package_id=$2',[bookingId,packageId])).rows[0];
      if (!saved) throw error;
      await assertRowScope(this.db.connection,'treatment_journal',saved,journalColumns.map(c=>c.name),actor,'create');
      return saved;
    }
  }

  async homeCareTemplatesForSession(actor: AdminActor, journalId: string) {
    if (!this.isUuid(journalId)) throw new BadRequestException('Mã buổi không hợp lệ.');
    const columns = await this.columns('treatment_journal', actor);
    const row = (await this.db.connection.query('SELECT * FROM treatment_journal WHERE id=$1',[journalId])).rows[0];
    if (!row) throw new NotFoundException('Không tìm thấy buổi điều trị.');
    await assertRowScope(this.db.connection,'treatment_journal',row,columns.map(c => c.name),actor,'action');
    return (await this.db.connection.query(
      `SELECT g.id,g.title,g.summary,g.content,g.steps,g.version FROM home_care_guidelines g
       WHERE g.is_published AND (g.service_id IS NULL OR EXISTS(SELECT 1 FROM user_packages up
       JOIN treatment_packages tp ON tp.id=up.package_id WHERE up.id=$1 AND tp.service_id=g.service_id)) ORDER BY g.title,g.id`,[row.user_package_id])).rows;
  }

  async assignHomeCare(actor: AdminActor, journalId: string, guidelineId: string) {
    if (!this.isUuid(journalId) || !this.isUuid(guidelineId)) throw new BadRequestException('Mã hồ sơ hoặc hướng dẫn không hợp lệ.');
    const columns = await this.columns('treatment_journal', actor);
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      const journal = (await client.query('SELECT * FROM treatment_journal WHERE id=$1 FOR UPDATE', [journalId])).rows[0];
      if (!journal) throw new NotFoundException('Không tìm thấy buổi điều trị.');
      await assertRowScope(client, 'treatment_journal', journal, columns.map(c => c.name), actor, 'action');
      if (journal.confirmation_status !== 'CONFIRMED' || journal.is_reversed) throw new ConflictException('Chỉ giao hướng dẫn cho buổi đã xác nhận và chưa hoàn tác.');
      const guideline = (await client.query('SELECT * FROM home_care_guidelines WHERE id=$1 FOR SHARE', [guidelineId])).rows[0];
      if (!guideline?.is_published) throw new ConflictException('Chỉ giao mẫu hướng dẫn đã xuất bản.');
      if (guideline.service_id) {
        const match = await client.query('SELECT 1 FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id WHERE up.id=$1 AND tp.service_id=$2', [journal.user_package_id, guideline.service_id]);
        if (!match.rowCount) throw new ConflictException('Hướng dẫn không phù hợp dịch vụ của liệu trình.');
      }
      const result = await client.query(
        `INSERT INTO home_care_deliveries(treatment_journal_id,customer_id,booking_id,channel,status,guideline_id,guideline_version,content_snapshot,sent_by_id)
         VALUES($1,$2,$3,'IN_APP','SENT',$4,$5,$6::jsonb,$7)
         ON CONFLICT (treatment_journal_id,guideline_id,guideline_version) WHERE guideline_version IS NOT NULL
         DO NOTHING RETURNING id,status`,
        [journalId,journal.customer_id,journal.booking_id,guideline.id,guideline.version,JSON.stringify(guideline),actor.id]);
      if (result.rowCount) {
        await client.query(`INSERT INTO notifications(user_id,title,message,type,data)
          VALUES($1,'Hướng dẫn chăm sóc sau trị liệu',$2,'HOME_CARE_GUIDE',$3::jsonb)`,
          [journal.customer_id,guideline.title,JSON.stringify({ guideline_id: guideline.id, delivery_id: result.rows[0].id, route: '/home-care-guidelines', target: { screen: 'treatment', tab: 'care_guide', entityId: guideline.id } })]);
      } else result.rows = (await client.query('SELECT id,status FROM home_care_deliveries WHERE treatment_journal_id=$1 AND guideline_id=$2 AND guideline_version=$3', [journalId,guideline.id,guideline.version])).rows;
      await this.audit(client, actor, 'treatment_journal', 'ASSIGN_HOME_CARE', journalId);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) { await client.query('ROLLBACK'); this.fail(error); }
    finally { client.release(); }
  }

  async treatmentConfirmationPreview(actor: AdminActor, id: string) {
    if (!this.isUuid(id)) throw new BadRequestException('Mã nhật ký không hợp lệ.');
    const columns = await this.columns('treatment_journal', actor);
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const journal = (await client.query('SELECT * FROM treatment_journal WHERE id=$1', [id])).rows[0];
      if (!journal) throw new NotFoundException('Không tìm thấy nhật ký.');
      await assertRowScope(client, 'treatment_journal', journal, columns.map(c => c.name), actor, 'action');
      const pkg = journal.user_package_id ? (await client.query(
        'SELECT up.*,tp.name AS package_name FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id WHERE up.id=$1', [journal.user_package_id])).rows[0] : null;
      const booking = journal.booking_id ? (await client.query('SELECT * FROM bookings WHERE id=$1', [journal.booking_id])).rows[0] : null;
      const technicianId = journal.technician_id || booking?.technician_id;
      const tech = technicianId ? (await client.query('SELECT user_id,branch_id,full_name FROM technicians WHERE id=$1', [technicianId])).rows[0] : null;
      const userId = technicianId ? (await client.query('SELECT id,full_name FROM users WHERE id=$1', [tech?.user_id || technicianId])).rows[0] : null;
      const warnings: string[] = [];
      if (!pkg) warnings.push('Nhật ký chưa gắn với liệu trình hợp lệ.');
      else {
        if (pkg.status !== 'ACTIVE') warnings.push('Gói không ở trạng thái đang sử dụng.');
        if (pkg.expires_at && new Date(pkg.expires_at).getTime() <= Date.now()) warnings.push('Gói đã hết hạn.');
        if (Number(pkg.completed_sessions) >= Number(pkg.total_sessions)) warnings.push('Gói không còn lượt.');
        if (pkg.customer_id !== journal.customer_id) warnings.push('Khách hàng không khớp với gói.');
      }
      if (journal.is_reversed || !['SUBMITTED', 'REVIEW_REQUIRED'].includes(journal.confirmation_status)) warnings.push('Hồ sơ chưa ở trạng thái có thể xác nhận.');
      if ((journal.has_abnormal_reaction || journal.confirmation_status === 'REVIEW_REQUIRED') && !journal.clinical_approved_at) warnings.push('Có phản ứng bất thường chưa được duyệt chuyên môn.');
      if (journal.booking_id) {
        if (!booking || booking.customer_id !== journal.customer_id) warnings.push('Lịch hẹn không thuộc khách hàng của buổi điều trị.');
        if (booking && (booking.status !== 'IN_SERVICE' || booking.session_status === 'COMPLETED')) warnings.push('Chỉ xác nhận lịch đang phục vụ và chưa hoàn tất chuyên môn.');
        if (pkg && booking) {
          const matchingService = await client.query(`SELECT 1 FROM booking_items bi
            JOIN treatment_packages tp ON tp.service_id=bi.service_id WHERE tp.id=$1 AND bi.booking_id=$2 LIMIT 1`,[pkg.package_id,booking.id]);
          if (!matchingService.rowCount) warnings.push('Dịch vụ đặt lịch không khớp gói liệu trình.');
        }
      }
      const baseAmount = Number(booking?.base_total ?? 0);
      const hasCommission = Boolean(userId && (booking?.branch_id || tech?.branch_id));
      const existing = (await client.query('SELECT 1 FROM staff_commissions WHERE treatment_journal_id=$1 LIMIT 1', [id])).rowCount;
      const before = pkg ? Math.max(0, Number(pkg.total_sessions) - Number(pkg.completed_sessions)) : 0;
      await client.query('COMMIT');
      return {
        journalId: id, packageName: pkg?.package_name || null, sessionNumber: journal.session_number,
        totalSessions: Number(pkg?.total_sessions || 0), completedBefore: Number(pkg?.completed_sessions || 0),
        remainingBefore: before, remainingAfter: Math.max(0, before - 1),
        consumables: Array.isArray(journal.consumables_used) ? journal.consumables_used : [],
        commission: { recipient: userId?.full_name || null, baseAmount, percentage: hasCommission ? 10 : 0, amount: hasCommission && !existing ? Math.round(baseAmount * 0.1) : 0, alreadyRecorded: Boolean(existing) },
        warnings, hasAbnormalReaction: Boolean(journal.has_abnormal_reaction), clinicalApproved: Boolean(journal.clinical_approved_at),
      };
    } catch (error) { await client.query('ROLLBACK'); this.fail(error); }
    finally { client.release(); }
  }

  async treatmentPackageDetail(actor: AdminActor, id: string) {
    if (!this.isUuid(id)) throw new BadRequestException('Mã liệu trình không hợp lệ.');
    const columns = await this.columns('user_packages', actor);
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const row = (await client.query('SELECT * FROM user_packages WHERE id=$1', [id])).rows[0];
      if (!row) throw new NotFoundException('Không tìm thấy liệu trình.');
      await assertRowScope(client, 'user_packages', row, columns.map(c => c.name), actor, 'read');
      const bookings = await client.query(
        `SELECT b.id,b.booking_code,b.booking_date,b.start_time,b.status,br.name AS branch_name
         FROM bookings b JOIN branches br ON br.id=b.branch_id
         WHERE b.customer_id=$2 AND b.special_notes LIKE ('%user_package_id=' || $1::text || ']%')
           AND b.booking_date>=CURRENT_DATE AND b.status::text IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE','IN_PROGRESS')
         ORDER BY b.booking_date,b.start_time`, [id, row.customer_id]);
      const journals = await client.query(
        `SELECT j.id,j.session_date,j.session_number,j.confirmation_status,j.is_reversed,j.home_care_instructions,
          b.booking_code,b.branch_id,br.name AS branch_name
         FROM treatment_journal j LEFT JOIN bookings b ON b.id=j.booking_id LEFT JOIN branches br ON br.id=b.branch_id
         WHERE j.user_package_id=$1 ORDER BY j.session_date DESC,j.id`, [id]);
      const logs = await client.query(
        `SELECT l.action,l.from_status,l.to_status,l.reason,l.performed_at,u.full_name AS actor_name
         FROM user_package_lifecycle_logs l LEFT JOIN users u ON u.id=l.performed_by
         WHERE l.user_package_id=$1 ORDER BY l.performed_at DESC,l.id`, [id]);
      const invoices = await client.query(
        `SELECT i.invoice_code,i.payment_status,i.total_amount,br.name AS branch_name
         FROM invoices i LEFT JOIN branches br ON br.id=i.branch_id WHERE i.user_package_id=$1 ORDER BY i.id`, [id]);
      const deliveries = await client.query(
        `SELECT d.id,d.content_snapshot,d.guideline_version,d.status,d.sent_at,u.full_name AS sender_name,j.session_number
         FROM home_care_deliveries d JOIN treatment_journal j ON j.id=d.treatment_journal_id
         LEFT JOIN users u ON u.id=d.sent_by_id WHERE j.user_package_id=$1 ORDER BY d.sent_at DESC,d.id`,[id]);
      await client.query('COMMIT');
      return { journals: journals.rows, logs: logs.rows, invoices: invoices.rows, bookings: bookings.rows, deliveries: deliveries.rows };
    } catch (error) { await client.query('ROLLBACK'); this.fail(error); }
    finally { client.release(); }
  }

  async cashierWorkspace(actor: AdminActor, branchId?: string) {
    this.requireCashier(actor);
    const permitted = allowedBranches(actor, 'cashier.collect');
    if (branchId && (!this.isUuid(branchId) || (permitted !== null && !permitted.includes(branchId))))
      throw new ForbiddenException('Chi nhánh không thuộc phạm vi được cấp quyền.');
    const branches = (await this.db.connection.query(
      `SELECT id,name,code,address,phone,is_active FROM branches
       WHERE ($1::uuid IS NULL OR id=$1) AND ($2::uuid[] IS NULL OR id=ANY($2::uuid[])) ORDER BY name`,
      [branchId || null, permitted],
    )).rows;
    const ids = branches.map((branch) => branch.id);
    const invoices = (await this.db.connection.query(
      `SELECT id,invoice_code,branch_id,customer_id,booking_id,total_amount,payment_status,payment_method,paid_at
       FROM invoices WHERE branch_id=ANY($1::uuid[]) ORDER BY paid_at DESC NULLS LAST LIMIT 200`, [ids],
    )).rows;
    const customers = (await this.db.connection.query(
      `SELECT DISTINCT u.id,u.full_name,u.phone,u.email,u.role,u.is_active
       FROM users u WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND b.branch_id=ANY($1::uuid[]))
       OR EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id=u.id AND i.branch_id=ANY($1::uuid[]))
       ORDER BY u.full_name LIMIT 200`, [ids],
    )).rows;
    const staff = (await this.db.connection.query(
      `SELECT u.id,u.full_name,u.phone,sp.id AS profile_id,sp.branch_id,sp.position,sp.employee_code
       FROM staff_profiles sp JOIN users u ON u.id=sp.user_id WHERE sp.branch_id=ANY($1::uuid[]) ORDER BY u.full_name`, [ids],
    )).rows.map((row) => ({
      id: row.id, full_name: row.full_name, phone: row.phone,
      staff_profile: { id: row.profile_id, branch_id: row.branch_id, position: row.position, employee_code: row.employee_code },
    }));
    return { branches, invoices, customers, staff };
  }

  async activeCashierShift(actor: AdminActor, branchId?: string) {
    this.requireCashier(actor);
    if (branchId) assertCashierBranch(actor, branchId, 'cashier.shifts');
    if (branchId && !this.isUuid(branchId))
      throw new BadRequestException('Chi nhánh không hợp lệ.');
    const values: unknown[] = [actor.id];
    const branchClause = branchId ? 'AND branch_id=$2' : '';
    if (branchId) values.push(branchId);
    try {
      const result = await this.db.connection.query(
        `SELECT * FROM cashier_shifts WHERE cashier_id=$1 AND status='OPEN' ${branchClause} ORDER BY opened_at DESC LIMIT 1`,
        values,
      );
      return result.rows[0] ? this.cashierShiftDto(result.rows[0]) : null;
    } catch (error) {
      this.fail(error);
    }
  }

  async openCashierShift(actor: AdminActor, body: Record<string, unknown>) {
    this.requireCashier(actor);
    const branchId = String(body.branchId || '');
    const openingCash = Number(body.openingCash);
    assertCashierBranch(actor, branchId, 'cashier.shifts');
    if (!this.isUuid(branchId) || !Number.isFinite(openingCash) || openingCash < 0)
      throw new BadRequestException('Chi nhánh hoặc tiền đầu ca không hợp lệ.');
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-cashier-shift'))");
      const existing = await client.query(
        "SELECT id FROM cashier_shifts WHERE cashier_id=$1 AND branch_id=$2 AND status='OPEN' FOR UPDATE",
        [actor.id, branchId],
      );
      if (existing.rowCount)
        throw new ConflictException('Bạn đã có ca đang mở tại chi nhánh này.');
      const result = await client.query(
        `INSERT INTO cashier_shifts(branch_id,cashier_id,shift_code,opening_cash,system_cash,notes)
         VALUES($1,$2,$3,$4,$4,$5) RETURNING *`,
        [
          branchId,
          actor.id,
          `CA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
          openingCash,
          typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null,
        ],
      );
      await this.audit(client, actor, 'cashier_shifts', 'OPEN', result.rows[0].id);
      await client.query('COMMIT');
      return this.cashierShiftDto(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  async closeCashierShift(actor: AdminActor, id: string, body: Record<string, unknown>) {
    this.requireCashier(actor);
    if (!this.isUuid(id)) throw new BadRequestException('Ca thu ngân không hợp lệ.');
    const closingCash = Number(body.closingCash);
    if (!Number.isFinite(closingCash) || closingCash < 0)
      throw new BadRequestException('Tiền thực đếm không hợp lệ.');
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      const shift = (await client.query(
        'SELECT * FROM cashier_shifts WHERE id=$1 FOR UPDATE', [id],
      )).rows[0];
      if (!shift) throw new NotFoundException('Không tìm thấy ca thu ngân.');
      assertCashierBranch(actor, shift.branch_id, 'cashier.shifts');
      if (shift.cashier_id !== actor.id && !['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
        throw new ForbiddenException('Bạn không được phép đóng ca này.');
      if (shift.status !== 'OPEN')
        throw new ConflictException('Ca thu ngân này đã được đóng.');
      const systemCash = Number(shift.system_cash || shift.opening_cash || 0);
      const discrepancy = Math.round((closingCash - systemCash) * 100) / 100;
      if (Math.abs(discrepancy) > 0.001) {
        const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
        if (!notes || notes.length < 5)
          throw new BadRequestException('Bắt buộc nhập lý do giải trình khi có chênh lệch tiền mặt cuối ca.');
      }
      const result = await client.query(
        `UPDATE cashier_shifts SET closing_cash=$2, discrepancy_amount=$2::numeric-$3::numeric,
         status='CLOSED',closed_at=now(),notes=COALESCE($4,notes)
         WHERE id=$1 RETURNING *`,
        [id, closingCash, systemCash, typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null],
      );
      // Closing the shift is the financial source of truth. A legacy/missing
      // audit schema must not leave an otherwise valid shift permanently open.
      await client.query('SAVEPOINT close_shift_audit');
      try {
        await this.audit(client, actor, 'cashier_shifts', 'CLOSE', id);
        await client.query('RELEASE SAVEPOINT close_shift_audit');
      } catch (auditError: any) {
        await client.query('ROLLBACK TO SAVEPOINT close_shift_audit');
        const compatibleLegacyAuditError = ['42703', '42P01', '42804'].includes(auditError?.code)
          || (auditError?.code === '22P02' && /audit_action|invalid input value for enum/i.test(String(auditError?.message || '')));
        if (!compatibleLegacyAuditError) throw auditError;
        this.logger.warn(`Đã kết ca nhưng không ghi được audit CLOSE do schema cũ (${auditError.code}).`);
      }
      await client.query('COMMIT');
      return this.cashierShiftDto(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      const databaseError = error as { code?: string; message?: string };
      if (!(error instanceof HttpException)) {
        this.logger.error(
          `Kết ca ${id} thất bại${databaseError.code ? ` [${databaseError.code}]` : ''}: ${databaseError.message || 'Unknown database error'}`,
        );
      }
      this.fail(error);
    } finally {
      client.release();
    }
  }

  async collectCashierPayment(actor: AdminActor, body: Record<string, unknown>) {
    this.requireCashier(actor);
    const kind = body.kind;
    const paymentMethod = String(body.paymentMethod || '');
    const shiftId = String(body.shiftId || '');
    const vatRate = Number(body.vatRate ?? 0);
    if (!['BOOKING', 'TUITION', 'PACKAGE', 'CART'].includes(String(kind)))
      throw new BadRequestException('Loại khoản thu không hợp lệ.');
    if (!['CASH_AT_SPA', 'BANK_TRANSFER'].includes(String(paymentMethod)))
      throw new BadRequestException('POS hiện chỉ nhận tiền mặt hoặc chuyển khoản đã xác nhận.');
    if (!this.isUuid(shiftId) || ![0, 8, 10].includes(vatRate))
      throw new BadRequestException('Ca thu ngân hoặc mức thuế không hợp lệ.');
    if (body.requestId !== undefined && !this.isUuid(String(body.requestId)))
      throw new BadRequestException('Mã yêu cầu thanh toán không hợp lệ.');

    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      if (body.requestId) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cashier:${actor.id}:${body.requestId}`]);
        const prior = (await client.query(
          'SELECT result,payload=$3::jsonb AS matches FROM admin_payment_requests WHERE actor_id=$1 AND request_id=$2',
          [actor.id,body.requestId,JSON.stringify(body)],
        )).rows[0];
        if (prior) {
          if (!prior.matches) throw new ConflictException('Mã thanh toán đã được dùng cho nội dung khác.');
          await client.query('COMMIT');
          return prior.result;
        }
      }
      const shift = (await client.query(
        "SELECT * FROM cashier_shifts WHERE id=$1 FOR UPDATE",
        [shiftId],
      )).rows[0];
      if (!shift || shift.cashier_id !== actor.id || shift.status !== 'OPEN')
        throw new ConflictException('Hãy mở ca thu ngân của bạn trước khi thu tiền.');
      assertCashierBranch(actor, shift.branch_id, 'cashier.collect');

      if (kind === 'TUITION') {
        const enrollmentId = String(body.enrollmentId || '');
        const amount = Number(body.amount);
        if (!this.isUuid(enrollmentId) || !Number.isFinite(amount) || amount <= 0)
          throw new BadRequestException('Hồ sơ học viên hoặc số tiền thu không hợp lệ.');
        const enrollment = (await client.query(
          `SELECT e.*,b.branch_id AS batch_branch_id FROM course_enrollments e
           LEFT JOIN course_batches b ON b.id=e.batch_id WHERE e.id=$1 FOR UPDATE OF e`,
          [enrollmentId],
        )).rows[0];
        if (!enrollment) throw new NotFoundException('Không tìm thấy hồ sơ học viên.');
        const branchId = enrollment.batch_branch_id || String(body.branchId || '');
        if (!this.isUuid(branchId) || branchId !== shift.branch_id)
          throw new BadRequestException('Ca thu ngân không khớp chi nhánh của lớp học.');
        const paid = Number(enrollment.amount_paid || 0);
        const tuition = Number(enrollment.tuition_total || 0);
        if (amount > tuition - paid)
          throw new ConflictException('Số tiền vượt quá học phí còn phải thu.');
        const nextPaid = paid + amount;
        const transactionCode = `TT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const transactionType = nextPaid >= tuition
          ? (paid > 0 ? 'REMAINING_BALANCE' : 'FULL_PAYMENT')
          : (paid > 0 ? 'INSTALLMENT_1' : 'DEPOSIT');
        const transaction = (await client.query(
          `INSERT INTO tuition_transactions(transaction_code,enrollment_id,student_id,course_id,branch_id,cashier_id,shift_id,transaction_type,amount,payment_method,payment_status,receipt_number,notes,paid_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PAID',$1,$11,now()) RETURNING *`,
          [transactionCode,enrollment.id,enrollment.student_id,enrollment.course_id,branchId,actor.id,shiftId,transactionType,amount,paymentMethod,typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null],
        )).rows[0];
        if (enrollment.assigned_staff_id) {
          const commissionRate = Number((await client.query(
            'SELECT commission_rate FROM staff_profiles WHERE user_id=$1 AND is_active=true',
            [enrollment.assigned_staff_id],
          )).rows[0]?.commission_rate || 0);
          if (commissionRate > 0 && commissionRate <= 100) {
            await client.query(
              `INSERT INTO staff_commissions(staff_id,branch_id,tuition_transaction_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
               VALUES($1,$2,$3,'COURSE_ENROLLMENT',$4,$5,round($4*$5/100),'PENDING',to_char(now(),'YYYY-MM'),$6)
               ON CONFLICT (tuition_transaction_id) WHERE tuition_transaction_id IS NOT NULL DO NOTHING`,
              [enrollment.assigned_staff_id,branchId,transaction.id,amount,commissionRate,`Hoa hồng tư vấn khóa học từ giao dịch ${transactionCode}`],
            );
          }
        }
        await client.query(
          `UPDATE course_enrollments SET amount_paid=$2,
           approval_status=CASE WHEN $2>=tuition_total THEN 'APPROVED' ELSE approval_status END,
           status=CASE WHEN $2>=tuition_total THEN 'ENROLLED'::enrollment_status ELSE status END,
           approved_by=CASE WHEN $2>=tuition_total THEN $3 ELSE approved_by END,
           approved_at=CASE WHEN $2>=tuition_total THEN now() ELSE approved_at END
           WHERE id=$1`,
          [enrollment.id,nextPaid,actor.id],
        );
        await this.updateCashierShiftTotals(client, shiftId, paymentMethod, amount);
        await this.audit(client, actor, 'tuition_transactions', 'COLLECT', transaction.id);
        return await this.finishCollection(client, actor, body, { kind, amount, transactionCode, paymentStatus: 'PAID', paidTotal: nextPaid, tuitionTotal: tuition, transaction });
      }

      if (kind === 'BOOKING') {
        const bookingId = String(body.bookingId || '');
        if (!this.isUuid(bookingId)) throw new BadRequestException('Lịch hẹn không hợp lệ.');
        const booking = (await client.query(
          'SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [bookingId],
        )).rows[0];
        if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
        if (booking.branch_id !== shift.branch_id)
          throw new BadRequestException('Ca thu ngân không khớp chi nhánh của lịch hẹn.');
        if (['CANCELLED','NO_SHOW'].includes(booking.status))
          throw new ConflictException('Lịch hẹn đã bị hủy hoặc khách không đến.');
        if (booking.payment_status === 'PAID')
          throw new ConflictException('Lịch hẹn đã được thanh toán.');
        const existingPaidInvoice = (await client.query(
          "SELECT id FROM invoices WHERE booking_id=$1 AND payment_status='PAID' LIMIT 1", [bookingId],
        )).rows[0];
        if (existingPaidInvoice)
          throw new ConflictException('Lịch hẹn đã có hóa đơn thanh toán.');
        const items = await client.query(
          `SELECT bi.id,bi.service_id,bi.duration_minutes,bi.price,s.name
           FROM booking_items bi JOIN services s ON s.id=bi.service_id
           WHERE bi.booking_id=$1 ORDER BY bi.created_at,bi.id`, [bookingId],
        );
        if (!items.rowCount) throw new ConflictException('Lịch hẹn chưa có dịch vụ để thu tiền.');
        const subtotal = Number(booking.base_total);
        const discount = Number(booking.discount_amount || 0);
        const points = Number(booking.points_discount || 0);
        const preTax = Math.max(0, subtotal - discount - points);
        const finalPrice = Number(booking.final_price);
        if (Math.round(preTax * 100) !== Math.round(finalPrice * 100))
          throw new ConflictException('Tổng tiền lịch hẹn không khớp chi tiết. Hãy tải lại lịch.');
        const itemsTotal = items.rows.reduce((sum, item) => sum + Number(item.price), 0);
        if (Math.round(itemsTotal * 100) !== Math.round(subtotal * 100))
          throw new ConflictException('Chi tiết dịch vụ không khớp tạm tính lịch hẹn.');
        const vatAmount = Math.round(preTax * vatRate) / 100;
        const total = preTax + vatAmount;
        if (total <= 0) throw new BadRequestException('Tổng thanh toán phải lớn hơn 0.');
        if (body.expectedTotal !== undefined && Number(body.expectedTotal) !== total)
          throw new ConflictException('Số tiền trên màn hình đã thay đổi. Tải lại lịch hẹn trước khi thu.');
        const invoiceCode = `POS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const invoice = (await client.query(
          `INSERT INTO invoices(invoice_code,branch_id,customer_id,cashier_id,shift_id,booking_id,subtotal,discount_amount,points_redeemed_amount,pre_tax_amount,vat_rate,vat_amount,total_amount,payment_method,payment_status,paid_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PENDING',now()) RETURNING *`,
          [invoiceCode,booking.branch_id,booking.customer_id,actor.id,shiftId,booking.id,subtotal,discount,points,preTax,vatRate,vatAmount,total,paymentMethod],
        )).rows[0];
        for (const item of items.rows) {
          await client.query(
            `INSERT INTO invoice_items(invoice_id,item_name,item_type,quantity,unit_price,amount)
             VALUES($1,$2,'SERVICE',1,$3,$3)`, [invoice.id,item.name,item.price],
          );
        }
        await client.query(
          `UPDATE bookings SET payment_status='PAID',payment_method=$2,updated_at=now(),
           status=CASE WHEN session_status='COMPLETED' THEN 'COMPLETED'::booking_status ELSE status END,
           checked_out_at=CASE WHEN session_status='COMPLETED' THEN now() ELSE checked_out_at END,
           checked_out_by_id=CASE WHEN session_status='COMPLETED' THEN $3 ELSE checked_out_by_id END
           WHERE id=$1`,
          [booking.id,paymentMethod,actor.id],
        );
        const paidInvoice = (await client.query(
          "UPDATE invoices SET payment_status='PAID',paid_at=now() WHERE id=$1 RETURNING *", [invoice.id],
        )).rows[0];
        await this.updateCashierShiftTotals(client, shiftId, paymentMethod, total);
        await this.audit(client, actor, 'invoices', 'COLLECT', invoice.id);
        return await this.finishCollection(client, actor, body, { kind, amount: total, invoice: paidInvoice, paymentStatus: 'PAID' });
      }

      if (kind === 'CART') {
        const result = await this.collectCart(client, actor, shift, body, paymentMethod, vatRate);
        return await this.finishCollection(client, actor, body, result);
      }

      const packageId = String(body.packageId || '');
      const customerId = String(body.customerId || '');
      const commissionStaffId = String(body.commissionStaffId || '');
      if (!this.isUuid(packageId) || !this.isUuid(customerId))
        throw new BadRequestException('Gói liệu trình hoặc khách hàng không hợp lệ.');
      if (customerId === SYSTEM_GUEST_CUSTOMER_ID)
        throw new BadRequestException('Không cho phép khách vãng lai đăng ký gói liệu trình. Vui lòng chọn hồ sơ khách hàng.');
      if (commissionStaffId && !this.isUuid(commissionStaffId))
        throw new BadRequestException('Nhân viên phụ trách gói liệu trình không hợp lệ.');
      const treatmentPackage = (await client.query(
        `SELECT tp.*,s.is_active AS service_is_active
         FROM treatment_packages tp
         LEFT JOIN services s ON s.id=tp.service_id
         WHERE tp.id=$1 AND tp.is_active=true FOR UPDATE OF tp`, [packageId],
      )).rows[0];
      if (!treatmentPackage) throw new NotFoundException('Gói liệu trình không còn mở bán.');
      if (!treatmentPackage.service_id)
        throw new ConflictException('Gói chưa được liên kết với dịch vụ điều trị.');
      if (treatmentPackage.service_id && treatmentPackage.service_is_active !== true)
        throw new ConflictException('Dịch vụ của gói đã ngừng kinh doanh.');
      const customer = (await client.query(
        'SELECT id FROM users WHERE id=$1 AND is_active=true', [customerId],
      )).rows[0];
      if (!customer) throw new NotFoundException('Không tìm thấy khách hàng.');
      if (shift.branch_id !== String(body.branchId || shift.branch_id))
        throw new BadRequestException('Ca thu ngân không khớp chi nhánh đang chọn.');
      const configuredDiscount = Number(treatmentPackage.discount_price || 0);
      if (body.discountAmount && Number(body.discountAmount) > 0 && configuredDiscount > 0)
        throw new BadRequestException('Không cho phép áp dụng chiết khấu tùy ý khi gói đã có giá ưu đãi cấu hình.');
      const subtotal = configuredDiscount > 0 && configuredDiscount < Number(treatmentPackage.price)
        ? configuredDiscount
        : Number(treatmentPackage.price);
      const vatAmount = Math.round(subtotal * vatRate) / 100;
      const total = subtotal + vatAmount;
      if (total <= 0) throw new BadRequestException('Tổng thanh toán phải lớn hơn 0.');
      if (body.expectedTotal !== undefined && Number(body.expectedTotal) !== total)
        throw new ConflictException('Giá gói hoặc tổng tiền đã thay đổi. Tải lại thông tin gói trước khi thu tiền.');
      const packageOwner = (await client.query(
        `INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,purchased_at,expires_at,commission_staff_id)
         VALUES($1,$2,$3,0,'ACTIVE',now(),now()+($4::int * interval '1 month'),$5) RETURNING *`,
        [customerId,packageId,treatmentPackage.total_sessions,treatmentPackage.validity_months,commissionStaffId || null],
      )).rows[0];
      const invoiceCode = `POS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const invoice = (await client.query(
        `INSERT INTO invoices(invoice_code,branch_id,customer_id,cashier_id,shift_id,user_package_id,subtotal,pre_tax_amount,vat_rate,vat_amount,total_amount,payment_method,payment_status,paid_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,'PENDING',now()) RETURNING *`,
        [invoiceCode,shift.branch_id,customerId,actor.id,shiftId,packageOwner.id,subtotal,vatRate,vatAmount,total,paymentMethod],
      )).rows[0];
      await client.query(
        `INSERT INTO invoice_items(invoice_id,item_name,item_type,quantity,unit_price,amount)
         VALUES($1,$2,'PACKAGE',1,$3,$3)`, [invoice.id,treatmentPackage.name,subtotal],
      );
      const paidInvoice = (await client.query(
        "UPDATE invoices SET payment_status='PAID',paid_at=now() WHERE id=$1 RETURNING *", [invoice.id],
      )).rows[0];
      if (commissionStaffId) {
        const commissionRate = Number((await client.query(
          'SELECT commission_rate FROM staff_profiles WHERE user_id=$1 AND is_active=true',
          [commissionStaffId],
        )).rows[0]?.commission_rate || 0);
        if (commissionRate > 0 && commissionRate <= 100) {
          await client.query(
            `INSERT INTO staff_commissions(staff_id,branch_id,invoice_id,user_package_id,commission_type,base_amount,percentage,commission_amount,status,cycle_month,notes)
             VALUES($1,$2,$3,$4,'TREATMENT_PATHWAY',$5,$6,round($5*$6/100),'PENDING',to_char(now(),'YYYY-MM'),$7)
             ON CONFLICT (user_package_id) WHERE user_package_id IS NOT NULL DO NOTHING`,
            [commissionStaffId,shift.branch_id,paidInvoice.id,packageOwner.id,subtotal,commissionRate,`Hoa hồng bán lộ trình ${treatmentPackage.name} từ hóa đơn ${invoiceCode}`],
          );
        }
      }
      await this.updateCashierShiftTotals(client, shiftId, paymentMethod, total);
      await this.audit(client, actor, 'invoices', 'PACKAGE_SALE', invoice.id);
      return await this.finishCollection(client, actor, body, { kind, amount: total, invoice: paidInvoice, userPackage: packageOwner, paymentStatus: 'PAID' });
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  private async finishCollection(client: PoolClient, actor: AdminActor, body: Record<string, unknown>, result: any) {
    if (body.requestId) await client.query(
      'INSERT INTO admin_payment_requests(actor_id,request_id,payload,result) VALUES($1,$2,$3::jsonb,$4::jsonb)',
      [actor.id,body.requestId,JSON.stringify(body),JSON.stringify(result)],
    );
    await client.query('COMMIT');
    return result;
  }

  private async collectCart(client: PoolClient, actor: AdminActor, shift: any, body: Record<string, unknown>, paymentMethod: string, vatRate: number) {
    const customerId = String(body.customerId || '');
    if (!this.isUuid(customerId) || !(await client.query('SELECT id FROM users WHERE id=$1 AND is_active=true', [customerId])).rowCount)
      throw new BadRequestException('Chọn khách hàng có hồ sơ hợp lệ trước khi thu tiền.');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100)
      throw new BadRequestException('Giỏ hàng không hợp lệ.');
    const lines: Array<{ name: string; type: string; quantity: number; price: number }> = [];
    for (const item of body.items) {
      if (!item || typeof item !== 'object' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)
        throw new BadRequestException('Số lượng phải là số nguyên từ 1 đến 100.');
      const table = { SERVICE: 'services', PACKAGE: 'treatment_packages', PRODUCT: 'home_products' }[item.type];
      const id = item.serviceId || item.packageId || item.productId || item.id;
      if (!table || !this.isUuid(String(id))) throw new BadRequestException('Mặt hàng không hợp lệ.');
      if (item.type === 'PACKAGE')
        throw new BadRequestException('Gói liệu trình phải được thanh toán trong một phiếu riêng.');
      const row = (await client.query(`SELECT * FROM ${quote(table)} WHERE id=$1 FOR SHARE`, [id])).rows[0];
      if (!row || row.is_active === false) throw new ConflictException('Mặt hàng đã ngừng kinh doanh.');
      const base = Number(item.type === 'PRODUCT' ? row.price_min : row.price);
      const price = Number(row.discount_price) > 0 && Number(row.discount_price) < base ? Number(row.discount_price) : base;
      if (!Number.isFinite(price) || price < 0) throw new ConflictException('Giá mặt hàng không hợp lệ.');
      lines.push({ name: row.name, type: item.type, quantity: item.quantity, price });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const discount = Number(body.discountAmount || 0);
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal)
      throw new BadRequestException('Giảm giá không hợp lệ.');
    const preTax = subtotal - discount;
    const vat = Math.round(preTax * vatRate) / 100;
    const total = preTax + vat;
    if (total <= 0 || (body.expectedTotal !== undefined && Number(body.expectedTotal) !== total))
      throw new ConflictException('Giá hoặc tổng tiền đã thay đổi. Tải lại giỏ hàng trước khi thu tiền.');
    const invoice = (await client.query(
      `INSERT INTO invoices(invoice_code,branch_id,customer_id,cashier_id,shift_id,subtotal,discount_amount,pre_tax_amount,vat_rate,vat_amount,total_amount,payment_method,payment_status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PENDING') RETURNING *`,
      [`POS-${randomUUID()}`,shift.branch_id,customerId,actor.id,shift.id,subtotal,discount,preTax,vatRate,vat,total,paymentMethod],
    )).rows[0];
    for (const line of lines) {
      await client.query('INSERT INTO invoice_items(invoice_id,item_name,item_type,quantity,unit_price,amount) VALUES($1,$2,$3,$4,$5,$6)', [invoice.id,line.name,line.type,line.quantity,line.price,line.price * line.quantity]);
    }
    const paid = (await client.query("UPDATE invoices SET payment_status='PAID',paid_at=now() WHERE id=$1 RETURNING *", [invoice.id])).rows[0];
    await this.updateCashierShiftTotals(client, shift.id, paymentMethod, total);
    await this.audit(client, actor, 'invoices', 'COLLECT', invoice.id);
    return { kind: 'CART', amount: total, invoice: paid, paymentStatus: 'PAID' };
  }

  async treatmentDashboardStats(actor: AdminActor, branchId?: string) {
    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const stats = await client.query(`
        SELECT
          (SELECT count(*)::int FROM user_packages WHERE status='ACTIVE' AND (expires_at IS NULL OR expires_at > now())) AS "activePackages",
          (SELECT count(*)::int FROM user_packages WHERE status='PAUSED') AS "pausedPackages",
          (SELECT count(*)::int FROM user_packages WHERE status='ACTIVE' AND expires_at IS NOT NULL AND expires_at > now() AND expires_at <= (now() + interval '30 days')) AS "expiringSoonPackages",
          (SELECT count(*)::int FROM user_packages WHERE status='EXPIRED' OR (status='ACTIVE' AND expires_at IS NOT NULL AND expires_at <= now())) AS "expiredPackages",
          (SELECT count(*)::int FROM user_packages WHERE status='COMPLETED') AS "completedPackages",
          (SELECT count(*)::int FROM user_packages WHERE status='CANCELLED') AS "cancelledPackages",
          (SELECT count(*)::int FROM user_packages WHERE status='REFUNDED') AS "refundedPackages",
          (SELECT count(*)::int FROM user_packages WHERE status='TRANSFERRED') AS "transferredPackages",
          (SELECT coalesce(sum(completed_sessions), 0)::int FROM user_packages WHERE status IN ('ACTIVE', 'PAUSED', 'COMPLETED')) AS "usedSessions",
          (SELECT coalesce(sum(GREATEST(0, total_sessions - completed_sessions)), 0)::int FROM user_packages WHERE status IN ('ACTIVE', 'PAUSED')) AS "remainingSessions",
          (SELECT count(*)::int FROM treatment_session_reversals) AS "reversalsCount",
          (SELECT count(*)::int FROM treatment_journal WHERE has_abnormal_reaction = TRUE) AS "abnormalReactionsCount",
          (SELECT count(*)::int FROM treatment_inventory_outbox WHERE sync_status = 'PENDING_SYNC') AS "pendingInventorySync",
          (SELECT count(*)::int FROM staff_commissions WHERE status = 'PENDING') AS "pendingCommissionsCount",
          (SELECT count(*)::int FROM bookings b WHERE b.booking_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE')) AS "upcomingBookingsCount"
      `);
      await client.query('COMMIT');
      return stats.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  private async syncTreatmentJournalArtifacts(
    client: PoolClient,
    result: Record<string, any>,
    data: Record<string, any>,
    actor: AdminActor,
  ) {
    if (Array.isArray(data.consumables_used) && data.consumables_used.length > 0) {
      const bookingBranch = result.booking_id
        ? (await client.query('SELECT branch_id FROM bookings WHERE id=$1', [result.booking_id])).rows[0]?.branch_id
        : null;
      await client.query(
        `INSERT INTO treatment_inventory_outbox(branch_id, treatment_journal_id, booking_id, operation_type, items, sync_status, notes)
         VALUES($1, $2, $3, 'DEDUCT', $4::jsonb, 'PENDING_SYNC', $5)`,
        [bookingBranch, result.id, result.booking_id, JSON.stringify(data.consumables_used), `Tiêu hao theo buổi ${result.session_number}`],
      );
    }
    if (data.home_care_instructions && typeof data.home_care_instructions === 'string') {
      await client.query(
        `INSERT INTO post_care_outbox(treatment_journal_id, customer_id, channel, content, status)
         VALUES($1, $2, 'IN_APP', $3, 'PENDING')`,
        [result.id, result.customer_id, data.home_care_instructions],
      );
    }
  }

  private requireCashier(actor: AdminActor) {
    if (!['CASHIER','BRANCH_MANAGER','ADMIN','SUPER_ADMIN'].includes(actor.role))
      throw new ForbiddenException('Vai trò hiện tại không được thao tác thu ngân.');
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private cashierShiftDto(row: Record<string, any>) {
    return {
      id: row.id, branchId: row.branch_id, cashierId: row.cashier_id,
      shiftCode: row.shift_code, openingCash: Number(row.opening_cash),
      closingCash: Number(row.closing_cash || 0), systemCash: Number(row.system_cash || 0),
      cardSales: Number(row.card_sales || 0), transferSales: Number(row.transfer_sales || 0),
      totalSales: Number(row.total_sales || 0), discrepancyAmount: Number(row.discrepancy_amount || 0),
      status: row.status, openedAt: row.opened_at, closedAt: row.closed_at, notes: row.notes,
    };
  }

  private async updateCashierShiftTotals(
    client: PoolClient,
    shiftId: string,
    paymentMethod: string,
    amount: number,
  ) {
    await client.query(
      `UPDATE cashier_shifts SET total_sales=total_sales+$2,
       system_cash=system_cash+CASE WHEN $3='CASH_AT_SPA' THEN $2 ELSE 0 END,
       transfer_sales=transfer_sales+CASE WHEN $3='BANK_TRANSFER' THEN $2 ELSE 0 END,
       updated_at=now() WHERE id=$1`,
      [shiftId,amount,paymentMethod],
    );
  }

  private async audit(
    client: PoolClient,
    actor: AdminActor,
    table: string,
    action: string,
    id: unknown,
  ) {
    await client.query(
      'INSERT INTO audit_logs(actor_id,action,table_name,record_id) VALUES($1,$2,$3,$4)',
      [actor.id, action, table, typeof id === 'string' ? id : null],
    );
  }
  private fail(error: any): never {
    if (error instanceof HttpException) throw error;
    if (error.code === '23505')
      throw new ConflictException('Mã hoặc quan hệ đã tồn tại.');
    if (error.code === '23503')
      throw new ConflictException(
        'Dữ liệu liên kết không tồn tại hoặc đang được sử dụng.',
      );
    if (
      ['23514', '23502', '22P02', '22007', '22008', '22003'].includes(
        error.code,
      )
    )
      throw new BadRequestException(
        'Dữ liệu không thỏa điều kiện database. Kiểm tra các trường bắt buộc, giá trị và ngày giờ.',
      );
    throw new ServiceUnavailableException(
      'Không truy cập được database chung. Kiểm tra cấu hình và schema backend.',
    );
  }
}
