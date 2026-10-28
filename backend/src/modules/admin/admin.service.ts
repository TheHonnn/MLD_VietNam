import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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
import {
  ADMIN_RESOURCES,
  COMPUTED_COLUMNS,
  GENERATED_COLUMNS,
  HIDDEN_COLUMNS,
  SYSTEM_COLUMNS,
  quote,
} from './admin.resources';

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
}

@Injectable()
export class AdminService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(
    private readonly db: AdminDatabase,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

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
          : ['create', 'update', 'delete', 'action'].filter(
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
        (SELECT coalesce(sum(total_amount),0)::text FROM invoices WHERE payment_status='PAID' AND enrollment_id IS NULL AND paid_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND paid_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')) AS "invoiceRevenue",
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
    const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    if (!Number.isInteger(page) || !Number.isInteger(limit))
      throw new BadRequestException('Phân trang không hợp lệ.');
    const values: unknown[] = [];
    const where: string[] = [];
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
        where.push(
          '(' +
            text
              .map((c) => `${expression(c.name)}::text ILIKE $${values.length}`)
              .join(' OR ') +
            ')',
        );
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
        if (!columns.some((c) => c.name === name) || typeof value === 'object')
          throw new BadRequestException('Trường lọc không hợp lệ.');
        values.push(value);
        where.push(`${expression(name)}=$${values.length}`);
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
      const data = await client.query(
        `SELECT ${selected} FROM public.${quote(table)}${clause} ORDER BY ${quote(order.name)} ${query.direction === 'asc' ? 'ASC' : 'DESC'}${columns
          .filter((c) => c.primary && c.name !== order.name)
          .map((c) => ',' + quote(c.name))
          .join('')} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, (page - 1) * limit],
      );
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
    body: { values?: unknown; key?: unknown; expectedUpdatedAt?: string },
  ) {
    this.resource(table, actor, true);
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
    const data =
      operation === 'delete'
        ? {}
        : this.validate(columns, input, operation === 'create');
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
      await this.businessRules(client, table, data, previous, operation, actor);
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
  ) {
    const next = { ...previous, ...data };
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
      const immutableFields = ['customer_id', 'package_id', 'total_sessions', 'completed_sessions', 'purchased_at', 'expires_at'];
      if (immutableFields.some((field) => Object.prototype.hasOwnProperty.call(data, field)))
        throw new BadRequestException('Thông tin mua và số buổi chỉ được cập nhật bởi giao dịch POS/nhật ký điều trị.');
      if (data.status && !(
        (previous?.status === 'ACTIVE' && data.status === 'PAUSED') ||
        (previous?.status === 'PAUSED' && data.status === 'ACTIVE' && new Date(previous.expires_at).getTime() > Date.now())
      ))
        throw new ConflictException('Trạng thái gói chỉ được tạm dừng hoặc tiếp tục khi còn hạn.');
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
            'SELECT coalesce(max(session_number),0)::int + 1 AS next_session FROM treatment_journal WHERE user_package_id=$1',
            [next.user_package_id],
          )).rows[0].next_session;
          if (Number(next.session_number) !== Number(expected))
            throw new ConflictException(`Buổi tiếp theo của gói là buổi ${expected}.`);
        }
        const exists = await client.query(
          'SELECT 1 FROM treatment_journal WHERE user_package_id=$1 AND session_number=$2 AND id<>$3',
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
        if (operation === 'create' && !next.user_package_id) {
          const duplicate = await client.query(
            'SELECT 1 FROM treatment_journal WHERE booking_id=$1 AND user_package_id IS NULL LIMIT 1',
            [next.booking_id],
          );
          if (duplicate.rowCount)
            throw new ConflictException('Lịch hẹn đã có nhật ký điều trị.');
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
      ['technician_shifts', 'technician_slots'].includes(table) &&
      operation !== 'delete'
    ) {
      const day = table === 'technician_shifts' ? 'shift_date' : 'slot_date';
      const overlaps = await client.query(
        `SELECT 1 FROM ${quote(table)} WHERE technician_id=$1 AND ${quote(day)}=$2 AND start_time<$4::time AND end_time>$3::time AND id<>$5 ${table === 'technician_shifts' ? 'AND is_cancelled=false' : ''} LIMIT 1`,
        [
          next.technician_id,
          next[day],
          next.start_time,
          next.end_time,
          previous?.id || '00000000-0000-4000-8000-000000000000',
        ],
      );
      if (overlaps.rowCount && !next.is_cancelled)
        throw new ConflictException(
          'Ca làm / khung giờ bị trùng với lịch đã có.',
        );
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
          "UPDATE user_packages SET completed_sessions=(SELECT count(*) FROM treatment_journal WHERE user_package_id=$1),status=CASE WHEN (SELECT count(*) FROM treatment_journal WHERE user_package_id=$1)>=total_sessions THEN 'COMPLETED'::package_status WHEN status='COMPLETED' THEN 'ACTIVE'::package_status ELSE status END WHERE id=$1",
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
    body: { key?: unknown; action?: string; reason?: string },
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
      if (table === 'bookings') {
        const transitions = {
          checkin: ['CONFIRMED', 'CHECKED_IN'],
          start: ['CHECKED_IN', 'IN_SERVICE'],
          checkout: ['IN_SERVICE', 'COMPLETED'],
        };
        const t = transitions[body.action];
        if (!t || row.status !== t[0])
          throw new ConflictException('Trạng thái lịch hẹn không phù hợp.');
        if (body.action === 'checkout' && row.payment_status !== 'PAID')
          throw new ConflictException(
            'Cần hoàn tất thanh toán trước khi check-out.',
          );
        if (body.action === 'checkin')
          await client.query(
            "UPDATE bookings SET status='CHECKED_IN', checked_in_at=now(), checked_in_by_id=$2 WHERE id=$1",
            [row.id, actor.id],
          );
        if (body.action === 'start')
          await client.query(
            "UPDATE bookings SET status='IN_SERVICE',service_started_at=now() WHERE id=$1",
            [row.id],
          );
        if (body.action === 'checkout')
          await client.query(
            "UPDATE bookings SET status='COMPLETED', checked_out_at=now(),checked_out_by_id=$2,actual_duration_minutes=GREATEST(0,floor(extract(epoch from (now()-service_started_at))/60)) WHERE id=$1",
            [row.id, actor.id],
          );
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
              "UPDATE bookings SET payment_status='PAID',payment_method=$2 WHERE id=$1",
              [row.booking_id, row.payment_method],
            );
          }
        }
        await client.query(
          `UPDATE public.${quote(table)} SET payment_status='PAID',paid_at=now(),cashier_id=$2 WHERE id=$1`,
          [row.id, actor.id],
        );
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
      } else throw new BadRequestException('Thao tác không được hỗ trợ.');
      await this.audit(client, actor, table, body.action, row.id);
      await client.query('COMMIT');
      return { completed: true };
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
    }
  }

  async activeCashierShift(actor: AdminActor, branchId?: string) {
    this.requireCashier(actor);
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
      if (shift.cashier_id !== actor.id && !['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
        throw new ForbiddenException('Bạn không được phép đóng ca này.');
      if (shift.status !== 'OPEN')
        throw new ConflictException('Ca thu ngân này đã được đóng.');
      const systemCash = Number(shift.system_cash || shift.opening_cash || 0);
      const result = await client.query(
        `UPDATE cashier_shifts SET closing_cash=$2, discrepancy_amount=$2-$3,
         status='CLOSED',closed_at=now(),notes=COALESCE($4,notes),updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id, closingCash, systemCash, typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null],
      );
      await this.audit(client, actor, 'cashier_shifts', 'CLOSE', id);
      await client.query('COMMIT');
      return this.cashierShiftDto(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
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
    if (!['BOOKING', 'TUITION', 'PACKAGE'].includes(String(kind)))
      throw new BadRequestException('Loại khoản thu không hợp lệ.');
    if (!['CASH_AT_SPA', 'BANK_TRANSFER'].includes(String(paymentMethod)))
      throw new BadRequestException('POS hiện chỉ nhận tiền mặt hoặc chuyển khoản đã xác nhận.');
    if (!this.isUuid(shiftId) || ![0, 8, 10].includes(vatRate))
      throw new BadRequestException('Ca thu ngân hoặc mức thuế không hợp lệ.');

    const client = await this.db.connection.connect();
    try {
      await client.query('BEGIN');
      const shift = (await client.query(
        "SELECT * FROM cashier_shifts WHERE id=$1 FOR UPDATE",
        [shiftId],
      )).rows[0];
      if (!shift || shift.cashier_id !== actor.id || shift.status !== 'OPEN')
        throw new ConflictException('Hãy mở ca thu ngân của bạn trước khi thu tiền.');

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
        await client.query('COMMIT');
        return { kind, amount, transactionCode, paymentStatus: 'PAID', paidTotal: nextPaid, tuitionTotal: tuition };
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
        if (['COMPLETED','CANCELLED','NO_SHOW'].includes(booking.status))
          throw new ConflictException('Lịch đã kết thúc hoặc bị hủy.');
        if (booking.payment_status === 'PAID')
          throw new ConflictException('Lịch hẹn đã được thanh toán.');
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
          "UPDATE bookings SET payment_status='PAID',payment_method=$2,updated_at=now() WHERE id=$1",
          [booking.id,paymentMethod],
        );
        const paidInvoice = (await client.query(
          "UPDATE invoices SET payment_status='PAID',paid_at=now() WHERE id=$1 RETURNING *", [invoice.id],
        )).rows[0];
        await this.updateCashierShiftTotals(client, shiftId, paymentMethod, total);
        await this.audit(client, actor, 'invoices', 'COLLECT', invoice.id);
        await client.query('COMMIT');
        return { kind, amount: total, invoice: paidInvoice, paymentStatus: 'PAID' };
      }

      const packageId = String(body.packageId || '');
      const customerId = String(body.customerId || '');
      if (!this.isUuid(packageId) || !this.isUuid(customerId))
        throw new BadRequestException('Gói liệu trình hoặc khách hàng không hợp lệ.');
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
      const subtotal = configuredDiscount > 0 && configuredDiscount < Number(treatmentPackage.price)
        ? configuredDiscount
        : Number(treatmentPackage.price);
      const vatAmount = Math.round(subtotal * vatRate) / 100;
      const total = subtotal + vatAmount;
      if (total <= 0) throw new BadRequestException('Tổng thanh toán phải lớn hơn 0.');
      const packageOwner = (await client.query(
        `INSERT INTO user_packages(customer_id,package_id,total_sessions,completed_sessions,status,purchased_at,expires_at)
         VALUES($1,$2,$3,0,'ACTIVE',now(),now()+($4::int * interval '1 month')) RETURNING *`,
        [customerId,packageId,treatmentPackage.total_sessions,treatmentPackage.validity_months],
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
      await this.updateCashierShiftTotals(client, shiftId, paymentMethod, total);
      await this.audit(client, actor, 'invoices', 'PACKAGE_SALE', invoice.id);
      await client.query('COMMIT');
      return { kind, amount: total, invoice: paidInvoice, userPackage: packageOwner, paymentStatus: 'PAID' };
    } catch (error) {
      await client.query('ROLLBACK');
      this.fail(error);
    } finally {
      client.release();
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
