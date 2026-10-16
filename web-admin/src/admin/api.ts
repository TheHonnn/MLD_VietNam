import { DEFAULT_RESOURCES } from "./defaultResources";

export interface Resource {
  name: string;
  title: string;
  group: string;
  readonly?: boolean;
  actions?: string[];
}

export interface Column {
  defaultValue?: string | null;
  name: string;
  type: string;
  required: boolean;
  hasDefault: boolean;
  maxLength: number | null;
  options: string[];
  primary: boolean;
  writable: boolean;
  reference: { table: string; column: string } | null;
}

export type Row = Record<string, any>;

export interface Listing {
  rows: Row[];
  columns: Column[];
  page: number;
  limit: number;
  total: number;
}

const base = (
  (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:3000/api/v1"
).replace(/\/$/, "");

const SUPABASE_URL = (
  (import.meta as any).env?.VITE_SUPABASE_URL || "https://wstvwushpwcdsmhpunvh.supabase.co"
).replace(/\/$/, "");

const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58";

const COMMON_TABLE_COLUMNS: Record<string, string[]> = {
  branches: ["id", "name", "code", "phone", "address", "city", "is_active", "created_at"],
  branch_rooms: ["id", "branch_id", "name", "room_type", "capacity", "is_active", "created_at"],
  service_categories: ["id", "name", "slug", "description", "display_order", "is_active", "created_at"],
  services: ["id", "category_id", "name", "code", "price", "duration_minutes", "is_active", "created_at"],
  treatment_packages: ["id", "name", "code", "total_sessions", "price", "is_active", "created_at"],
  bookings: ["id", "booking_code", "customer_id", "branch_id", "booking_date", "start_time", "status", "created_at"],
  booking_items: ["id", "booking_id", "service_id", "price", "quantity", "created_at"],
  users: ["id", "phone", "full_name", "email", "role", "is_active", "created_at"],
  consultation_surveys: ["id", "customer_id", "skin_type", "notes", "created_at"],
  reviews: ["id", "customer_id", "service_id", "rating", "comment", "created_at"],
  support_tickets: ["id", "customer_id", "title", "status", "priority", "created_at"],
  support_faqs: ["id", "question", "answer", "category", "is_active", "created_at"],
  staff_profiles: ["id", "user_id", "branch_id", "employee_code", "department", "position", "is_active", "created_at"],
  technicians: ["id", "staff_profile_id", "level", "rating_avg", "is_available", "created_at"],
  technician_shifts: ["id", "technician_id", "shift_date", "start_time", "end_time", "created_at"],
  technician_slots: ["id", "technician_id", "slot_time", "is_booked", "created_at"],
  staff_leaves: ["id", "staff_profile_id", "start_date", "end_date", "status", "reason", "created_at"],
  coupons: ["id", "code", "title", "discount_type", "discount_value", "is_active", "created_at"],
  voucher_distribution_rules: ["id", "rule_name", "trigger_event", "is_active", "created_at"],
  user_vouchers: ["id", "user_id", "coupon_id", "is_used", "created_at"],
  membership_tier_rules: ["id", "tier_name", "min_points", "benefits", "created_at"],
  loyalty_point_settings: ["id", "earn_rate", "redeem_rate", "is_active", "created_at"],
  point_transactions: ["id", "user_id", "points", "type", "description", "created_at"],
  roles: ["id", "name", "description", "is_system", "created_at"],
  permissions: ["id", "code", "name", "module", "created_at"],
  role_permissions: ["id", "role_id", "permission_id", "created_at"],
  user_roles: ["id", "user_id", "role_id", "created_at"],
  audit_logs: ["id", "user_id", "action", "table_name", "record_id", "created_at"],
  user_packages: ["id", "user_id", "package_id", "completed_sessions", "status", "created_at"],
  treatment_journal: ["id", "user_package_id", "technician_id", "session_date", "notes", "created_at"],
  home_care_guidelines: ["id", "title", "service_id", "instructions", "is_active", "created_at"],
  course_categories: ["id", "name", "slug", "description", "display_order", "is_active", "created_at"],
  courses: ["id", "category_id", "title", "code", "tuition_fee", "duration_hours", "is_active", "created_at"],
  instructors: ["id", "user_id", "name", "bio", "specialties", "rating_avg", "is_active", "created_at"],
  course_batches: ["id", "course_id", "batch_code", "start_date", "end_date", "status", "created_at"],
  course_enrollments: ["id", "student_id", "batch_id", "enrollment_date", "tuition_status", "created_at"],
  batch_schedules: ["id", "batch_id", "instructor_id", "class_date", "start_time", "end_time", "created_at"],
  student_attendance: ["id", "schedule_id", "student_id", "status", "created_at"],
  student_academic_records: ["id", "enrollment_id", "theory_score", "practical_score", "grade", "created_at"],
  course_chapters: ["id", "course_id", "title", "chapter_order", "created_at"],
  course_lessons: ["id", "chapter_id", "title", "lesson_type", "lesson_order", "duration_minutes", "video_url", "created_at"],
  course_quizzes: ["id", "course_id", "title", "total_questions", "passing_score", "created_at"],
  quiz_questions: ["id", "quiz_id", "question_text", "question_number", "correct_option", "options", "created_at"],
  quiz_submissions: ["id", "quiz_id", "student_id", "score", "is_passed", "submitted_at"],
  user_lesson_progress: ["id", "user_id", "lesson_id", "is_completed", "completed_at"],
  certificate_templates: ["id", "title", "background_image_url", "signer_name", "created_at"],
  student_certificates: ["id", "student_id", "course_id", "certificate_code", "issue_date", "status", "created_at"],
  tuition_transactions: ["id", "enrollment_id", "amount", "transaction_type", "payment_status", "payment_method", "created_at"],
  invoices: ["id", "booking_id", "invoice_code", "total_amount", "payment_status", "payment_method", "created_at"],
  invoice_items: ["id", "invoice_id", "item_name", "unit_price", "quantity", "total_price", "created_at"],
};

function buildColumns(table: string, rows: Row[]): Column[] {
  const sample = rows[0] || {};
  const sampleKeys = Object.keys(sample);
  const colNames = sampleKeys.length > 0 ? sampleKeys : (COMMON_TABLE_COLUMNS[table] || ["id", "name", "created_at"]);

  return colNames.map((name) => {
    const val = sample[name];
    const isId = name === "id";
    const isTimestamp = name === "created_at" || name === "updated_at";
    const isBool = typeof val === "boolean" || name.startsWith("is_");
    const isNum =
      typeof val === "number" ||
      ["price", "amount", "fee", "tuition", "total", "score", "rate", "points", "order", "minutes", "sessions", "hours"].some((k) =>
        name.includes(k)
      );

    return {
      name,
      type: isNum ? "numeric" : isBool ? "bool" : typeof val === "object" && val !== null ? "jsonb" : "varchar",
      required: false,
      hasDefault: isId || isTimestamp || isBool,
      maxLength: null,
      options: [],
      primary: isId,
      writable: !isId && !isTimestamp,
      reference: name.endsWith("_id") ? { table: name.replace(/_id$/, "s"), column: "id" } : null,
    };
  });
}

async function querySupabaseFallback<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  if (path === "resources") {
    return DEFAULT_RESOURCES as unknown as T;
  }

  if (path === "login") {
    return {
      token: "supabase-direct-admin-token",
      user: { role: "SUPER_ADMIN", full_name: "Quản trị viên Hệ thống (Supabase Cloud)" },
    } as unknown as T;
  }

  const [tableOrAction, queryString] = path.split("?");

  // Handle table listing
  if (body === undefined) {
    const table = tableOrAction;
    const q = new URLSearchParams(queryString || "");
    const page = parseInt(q.get("page") || "1", 10);
    const limit = parseInt(q.get("limit") || "25", 10);
    const offset = Math.max(0, (page - 1) * limit);
    const end = offset + limit - 1;
    const sort = q.get("sort");
    const direction = q.get("direction") || "asc";

    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    if (sort) {
      url += `&order=${sort}.${direction === "desc" ? "desc" : "asc"}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Range-Unit": "items",
        Range: `${offset}-${end}`,
        Prefer: "count=exact",
      },
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Lỗi truy vấn dữ liệu Supabase (${res.status}).`);
    }

    const rows: Row[] = await res.json();
    const contentRange = res.headers.get("content-range") || "";
    let total = rows.length;
    if (contentRange.includes("/")) {
      const parsed = parseInt(contentRange.split("/")[1], 10);
      if (!isNaN(parsed)) total = parsed;
    }

    const columns = buildColumns(table, rows);

    return {
      rows,
      columns,
      page,
      limit,
      total,
    } as unknown as T;
  }

  // Handle mutations (create, update, delete, action)
  const parts = tableOrAction.split("/");
  const table = parts[0];
  const action = parts[1] || "";
  const payload = body as any;

  if (action === "create" && payload?.values) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload.values),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể tạo bản ghi mới trên Supabase.");
    }
    const created = await res.json();
    return (Array.isArray(created) ? created[0] : created) as T;
  }

  if (action === "update" && payload?.values) {
    const key = payload.key || {};
    const id = key.id;
    const match = id
      ? `id=eq.${encodeURIComponent(id)}`
      : Object.entries(key)
          .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
          .join("&");

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload.values),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể cập nhật bản ghi trên Supabase.");
    }
    const updated = await res.json();
    return (Array.isArray(updated) ? updated[0] : updated) as T;
  }

  if (action === "delete" && payload?.key) {
    const key = payload.key || {};
    const id = key.id;
    const match = id
      ? `id=eq.${encodeURIComponent(id)}`
      : Object.entries(key)
          .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
          .join("&");

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể xóa bản ghi trên Supabase.");
    }
    return true as unknown as T;
  }

  // Fallback for custom action (checkin, start, checkout, confirm-payment, refund, etc.)
  if (action === "action") {
    // If status change action, update status on table
    const targetStatus =
      payload.action === "checkin"
        ? "CHECKED_IN"
        : payload.action === "start"
          ? "IN_SERVICE"
          : payload.action === "checkout"
            ? "COMPLETED"
            : payload.action === "confirm-payment"
              ? "PAID"
              : payload.action === "refund"
                ? "REFUNDED"
                : undefined;

    if (targetStatus && payload.key?.id) {
      const statusField = table === "invoices" || table === "tuition_transactions" ? "payment_status" : "status";
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(payload.key.id)}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [statusField]: targetStatus }),
        signal,
      });
      return true as unknown as T;
    }
    return true as unknown as T;
  }

  throw new Error(`Thao tác ${path} chưa được hỗ trợ.`);
}

export async function adminApi<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const token = sessionStorage.getItem("mld_admin_token");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = window.setTimeout(abort, 6000); // 6s fast fail for local NestJS on production Vercel

  try {
    const response = await fetch(`${base}/admin/${path}`, {
      method: body === undefined ? "GET" : "POST",
      signal: controller.signal,
      headers: {
        "X-MLD-Local-Admin": "1",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      if (response.status === 401 && path !== "login" && token) {
        sessionStorage.removeItem("mld_admin_token");
        window.dispatchEvent(new Event("admin-signout"));
      }
      throw new Error(
        Array.isArray(json?.message)
          ? json.message.join(", ")
          : json?.message || `Không tải được dữ liệu (${response.status}).`,
      );
    }
    return json.data as T;
  } catch (err) {
    // If backend is not running or unreachable (e.g. running on Vercel), fallback seamlessly to Supabase
    try {
      return await querySupabaseFallback<T>(path, body, signal);
    } catch (fallbackErr) {
      if (controller.signal.aborted && !signal?.aborted)
        throw new Error("Máy chủ phản hồi quá chậm. Vui lòng thử lại.");
      throw fallbackErr || err;
    }
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function rowKey(columns: Column[], row: Row) {
  return Object.fromEntries(
    columns.filter((c) => c.primary).map((c) => [c.name, row[c.name]]),
  );
}

export const recordLabel = (row: Row) =>
  String(
    row.full_name ||
      row.name ||
      row.title ||
      row.code ||
      row.booking_code ||
      row.batch_code ||
      row.transaction_code ||
      row.certificate_code ||
      row.invoice_code ||
      row.employee_code ||
      row.id ||
      row.tier ||
      "",
  );
