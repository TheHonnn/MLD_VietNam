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

import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";


import { SCHEMA_COLUMNS } from "./schemaMeta";

function sanitizeValues(table: string, values: Record<string, any>, isUpdate = false): Record<string, any> {
  const schemaCols = SCHEMA_COLUMNS[table];
  const validColMap = new Map(schemaCols?.map((c) => [c.name, c]) || []);
  const clean: Record<string, any> = {};

  for (const [k, v] of Object.entries(values)) {
    // If table schema is known, skip non-existent columns (prevents Supabase schema cache error)
    if (schemaCols && schemaCols.length > 0 && !validColMap.has(k)) {
      continue;
    }

    // On update, do not send primary key in body
    if (isUpdate && (k === "id" || k === "created_at")) {
      continue;
    }

    // On create, do not send empty or auto-generated id/timestamps
    if (!isUpdate && (k === "created_at" || k === "updated_at")) {
      continue;
    }
    if (!isUpdate && k === "id" && (!v || v === "")) {
      continue;
    }

    const colDef = validColMap.get(k);

    // Normalize empty strings to null for nullable / foreign key / numeric / date columns
    if (v === "") {
      if (k.endsWith("_id") || colDef?.type === "numeric" || colDef?.type === "timestamptz" || colDef?.type === "date") {
        clean[k] = null;
      } else {
        clean[k] = null;
      }
      continue;
    }

    // Ensure numbers are numeric
    if (colDef && ["numeric", "int2", "int4", "int8", "float4", "float8"].includes(colDef.type) && typeof v === "string") {
      const num = Number(v);
      clean[k] = isNaN(num) ? v : num;
      continue;
    }

    // Ensure dates are valid ISO
    if (colDef && ["timestamptz", "timestamp"].includes(colDef.type) && typeof v === "string" && v) {
      try {
        clean[k] = new Date(v).toISOString();
      } catch {
        clean[k] = v;
      }
      continue;
    }

    // Ensure jsonb / arrays are serialized/parsed cleanly
    if (colDef && ["json", "jsonb"].includes(colDef.type)) {
      if (typeof v === "string") {
        try {
          clean[k] = JSON.parse(v);
        } catch {
          clean[k] = v.split("\n").map((s: string) => s.trim()).filter(Boolean);
        }
      } else {
        clean[k] = v;
      }
      continue;
    }

    clean[k] = v;
  }

  // Auto-generate slug for services if omitted
  if (table === "services") {
    if (!clean.slug && clean.name) {
      clean.slug = String(clean.name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    }
    if (!clean.short_description) {
      clean.short_description = clean.full_description || clean.name || "Dịch vụ spa MLD";
    }
    if (!clean.full_description) {
      clean.full_description = clean.short_description || clean.name || "Dịch vụ spa MLD";
    }
  }

  return clean;
}

const TABLE_SELECTS: Record<string, string> = {
  staff_profiles: "*,users(full_name,phone,email),branches(name,code)",
  technicians: "*,branches(name)",
  bookings: "*,customer:users!customer_id(full_name,phone),branches(name)",
  branch_rooms: "*,branches(name)",
  technician_shifts: "*,technicians(full_name),branches(name)",
  course_batches: "*,courses(title)",
  course_chapters: "*,courses(title)",
  course_lessons: "*,course_chapters(title)",
  course_quizzes: "*,courses(title)",
  quiz_questions: "*,course_quizzes(title)",
  consultation_surveys: "*,customer:users!customer_id(full_name,phone,avatar_url),bookings(booking_code,booking_date,start_time,status)",
  reviews: "*,customer:users!customer_id(full_name,phone),services(name),technicians(full_name),bookings(booking_code)",
  support_tickets: "*,customer:users!customer_id(full_name,phone)",
  services: "*,service_categories(name,code)",
  treatment_packages: "*,services(name)",
  staff_commissions: "*,staff:users!staff_id(full_name,phone),branches(name),bookings(booking_code)",
};

function buildColumns(table: string, rows: Row[]): Column[] {
  let cols: Column[] = [];
  const schemaCols = SCHEMA_COLUMNS[table];
  if (schemaCols && schemaCols.length > 0) {
    const sample = rows[0] || {};
    const sampleKeys = Object.keys(sample);
    const existingNames = new Set(schemaCols.map((c) => c.name));
    const extraCols: Column[] = sampleKeys
      .filter((k) => !existingNames.has(k) && typeof sample[k] !== "object")
      .map((name) => {
        const val = sample[name];
        const isId = name === "id";
        const isTimestamp = name === "created_at" || name === "updated_at";
        const isBool = typeof val === "boolean" || name.startsWith("is_");
        const isNum = typeof val === "number";
        return {
          name,
          type: isNum ? "numeric" : isBool ? "bool" : "varchar",
          required: false,
          hasDefault: isId || isTimestamp || isBool,
          maxLength: null,
          options: [],
          primary: isId,
          writable: false,
          reference: name.endsWith("_id") ? { table: name.replace(/_id$/, "s"), column: "id" } : null,
        };
      });

    cols = [...schemaCols, ...extraCols];
  } else {
    const sample = rows[0] || {};
    const sampleKeys = Object.keys(sample);
    const colNames = sampleKeys.length > 0 ? sampleKeys : ["id", "name", "created_at"];

    cols = colNames.map((name) => {
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

  // Ensure virtual columns for tables with joined entities
  if (table === "staff_profiles") {
    if (!cols.some((c) => c.name === "full_name")) {
      cols.unshift({
        name: "full_name",
        type: "varchar",
        required: false,
        hasDefault: false,
        maxLength: 150,
        options: [],
        primary: false,
        writable: false,
        reference: null,
      });
    }
    if (!cols.some((c) => c.name === "phone")) {
      cols.push({
        name: "phone",
        type: "varchar",
        required: false,
        hasDefault: false,
        maxLength: 50,
        options: [],
        primary: false,
        writable: false,
        reference: null,
      });
    }
  }

  if (table === "bookings") {
    if (!cols.some((c) => c.name === "customer_name")) {
      cols.push({
        name: "customer_name",
        type: "varchar",
        required: false,
        hasDefault: false,
        maxLength: 150,
        options: [],
        primary: false,
        writable: false,
        reference: null,
      });
    }
  }

  return cols;
}

const SEED_DATA: Record<string, Row[]> = {};

function isMissingTableError(res: Response, err: any): boolean {
  if (res.status === 404) return true;
  if (err?.code === "PGRST200") return true;
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

function formatDatabaseError(err: any, defaultMsg: string): string {
  const msg = err?.message || "";
  if (!msg) return defaultMsg;
  if (msg.includes("violates foreign key constraint")) {
    const match = msg.match(/violates foreign key constraint "([^"]+)" on table "([^"]+)"/i);
    if (match) {
      const targetTable = match[2];
      return `Không thể xóa do còn dữ liệu phụ thuộc ở bảng "${targetTable}". Vui lòng xử lý hoặc xóa các dữ liệu liên kết trước.`;
    }
    return "Không thể thực hiện do ràng buộc dữ liệu liên quan trong hệ thống.";
  }
  if (msg.includes("violates unique constraint")) {
    return "Dữ liệu đã tồn tại trong hệ thống (trùng lặp khóa duy nhất).";
  }
  if (msg.includes("violates not-null constraint")) {
    return "Dữ liệu thiếu các thông tin bắt buộc.";
  }
  return msg;
}

function getLocalTableRows(table: string): Row[] {
  try {
    const raw = localStorage.getItem(`mld_local_${table}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  const seeds = SEED_DATA[table] || [];
  if (seeds.length > 0) {
    try {
      localStorage.setItem(`mld_local_${table}`, JSON.stringify(seeds));
    } catch {}
  }
  return [...seeds];
}

function saveLocalTableRows(table: string, rows: Row[]) {
  try {
    localStorage.setItem(`mld_local_${table}`, JSON.stringify(rows));
  } catch (err) {
    console.warn(`Lỗi lưu mld_local_${table}:`, err);
  }
}

function createLocalRecord(table: string, values: Record<string, any>): Row {
  const rows = getLocalTableRows(table);
  const newRow: Row = {
    id: values.id || `${table.slice(0, 4)}-${Date.now()}`,
    ...values,
    created_at: values.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  rows.unshift(newRow);
  saveLocalTableRows(table, rows);
  return newRow;
}

function deleteLocalRecord(table: string, key: any): boolean {
  const rows = getLocalTableRows(table);
  const targetId = typeof key === "object" ? key.id : key;
  const filtered = rows.filter((r) => r.id !== targetId);
  saveLocalTableRows(table, filtered);
  return true;
}

function getLocalFallbackListing<T>(
  table: string,
  page: number,
  limit: number,
  search?: string | null,
  filterParam?: string | null,
  sort?: string | null,
  direction?: string | null,
): T {
  let allRows = getLocalTableRows(table);

  if (filterParam) {
    try {
      const filter = JSON.parse(filterParam);
      allRows = allRows.filter((r) => {
        return Object.entries(filter).every(([k, v]) => {
          if (v === undefined || v === null || v === "") return true;
          return String(r[k]) === String(v);
        });
      });
    } catch {}
  }

  if (search && search.trim()) {
    const kw = search.trim().toLowerCase();
    allRows = allRows.filter((r) => {
      return Object.values(r).some((v) =>
        typeof v === "string" && v.toLowerCase().includes(kw)
      );
    });
  }

  if (sort) {
    allRows.sort((a, b) => {
      const valA = a[sort] ?? "";
      const valB = b[sort] ?? "";
      if (valA < valB) return direction === "desc" ? 1 : -1;
      if (valA > valB) return direction === "desc" ? -1 : 1;
      return 0;
    });
  }

  const total = allRows.length;
  const offset = Math.max(0, (page - 1) * limit);
  const pagedRows = allRows.slice(offset, offset + limit);
  const columns = buildColumns(table, pagedRows.length > 0 ? pagedRows : allRows);

  return {
    rows: pagedRows,
    columns,
    page,
    limit,
    total,
  } as unknown as T;
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
    const search = q.get("search");
    const filterParam = q.get("filter");

    const selectParam = TABLE_SELECTS[table] || "*";
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(selectParam)}`;

    // Resource "users" in "Khách hàng" module only shows customers
    if (table === "users") {
      url += "&role=eq.CUSTOMER";
    }

    // Filter handling
    if (filterParam) {
      try {
        const parsedFilter = JSON.parse(filterParam);
        for (const [col, val] of Object.entries(parsedFilter)) {
          if (val !== undefined && val !== null && val !== "") {
            url += `&${col}=eq.${encodeURIComponent(String(val))}`;
          }
        }
      } catch {}
    }

    // Search handling
    if (search && search.trim()) {
      const s = search.trim();
      let matchedUserIds: string[] = [];
      let matchedBookingIds: string[] = [];

      // Pre-search users if table has customer/user relations
      const tablesWithUser = [
        "staff_profiles",
        "bookings",
        "consultation_surveys",
        "reviews",
        "support_tickets",
        "treatment_records",
        "treatment_courses",
        "customer_vouchers",
        "point_transactions",
        "invoices",
        "staff_commissions",
      ];
      if (tablesWithUser.includes(table)) {
        try {
          const userSearchUrl = `${SUPABASE_URL}/rest/v1/users?select=id&or=(full_name.ilike.*${encodeURIComponent(s)}*,phone.ilike.*${encodeURIComponent(s)}*)&limit=25`;
          const uRes = await fetch(userSearchUrl, {
            headers: getSupabaseHeaders(),
            signal,
          });
          if (uRes.ok) {
            const uRows: Array<{ id: string }> = await uRes.json();
            matchedUserIds = uRows.map((u) => u.id);
          }
        } catch {}
      }

      // Pre-search bookings if table references booking_id
      if (["consultation_surveys", "reviews", "treatment_records", "staff_commissions"].includes(table)) {
        try {
          const bSearchUrl = `${SUPABASE_URL}/rest/v1/bookings?select=id&booking_code=ilike.*${encodeURIComponent(s)}*&limit=25`;
          const bRes = await fetch(bSearchUrl, {
            headers: getSupabaseHeaders(),
            signal,
          });
          if (bRes.ok) {
            const bRows: Array<{ id: string }> = await bRes.json();
            matchedBookingIds = bRows.map((b) => b.id);
          }
        } catch {}
      }

      const NON_SEARCHABLE_COLS = new Set([
        "focus_areas",
        "medical_conditions",
        "skin_condition_tags",
        "steps",
        "benefits",
        "review_tags",
        "photos",
        "tags",
        "options",
        "metadata",
        "extra_data",
        "custom_fields",
      ]);

      const textCols = (SCHEMA_COLUMNS[table] || [])
        .filter(
          (c) =>
            ["varchar", "text"].includes(c.type) &&
            !c.type.includes("[]") &&
            !c.type.includes("array") &&
            !c.name.endsWith("_url") &&
            !c.name.endsWith("_hash") &&
            c.name !== "id" &&
            !c.name.endsWith("_id") &&
            !NON_SEARCHABLE_COLS.has(c.name),
        )
        .map((c) => c.name)
        .slice(0, 5);

      const orClauses: string[] = textCols.map((c) => `${c}.ilike.*${encodeURIComponent(s)}*`);
      if (matchedUserIds.length > 0) {
        if (table === "staff_profiles") {
          orClauses.push(`user_id.in.(${matchedUserIds.join(",")})`);
        } else if (table === "staff_commissions") {
          orClauses.push(`staff_id.in.(${matchedUserIds.join(",")})`);
        } else if (tablesWithUser.includes(table)) {
          orClauses.push(`customer_id.in.(${matchedUserIds.join(",")})`);
        }
      }

      if (matchedBookingIds.length > 0) {
        orClauses.push(`booking_id.in.(${matchedBookingIds.join(",")})`);
      }

      if (orClauses.length > 0) {
        url += `&or=(${orClauses.join(",")})`;
      } else if (tablesWithUser.includes(table)) {
        // Searched user keyword with no match and no text cols matched
        url += `&id=eq.00000000-0000-0000-0000-000000000000`;
      }
    }

    // Sort handling
    if (sort) {
      const validCols = SCHEMA_COLUMNS[table]?.map((c) => c.name);
      if (validCols && validCols.includes(sort)) {
        url += `&order=${sort}.${direction === "desc" ? "desc" : "asc"}`;
      } else if (!validCols) {
        url += `&order=${sort}.${direction === "desc" ? "desc" : "asc"}`;
      }
    }

    let res = await fetch(url, {
      method: "GET",
      headers: getSupabaseHeaders({
        "Range-Unit": "items",
        Range: `${offset}-${end}`,
        Prefer: "count=exact",
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      if (res.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin-signout"));
      }
      if (isMissingTableError(res, err)) {
        return getLocalFallbackListing(table, page, limit, search, filterParam, sort, direction);
      }
      throw new Error(err?.message || `Lỗi truy vấn dữ liệu Supabase (${res.status}).`);
    }

    const rows: Row[] = await res.json();
    const contentRange = res.headers.get("content-range") || "";
    let total = rows.length;
    if (contentRange.includes("/")) {
      const parsed = parseInt(contentRange.split("/")[1], 10);
      if (!isNaN(parsed)) total = parsed;
    }

    // Flatten joined relations
    rows.forEach((r) => {
      if (r.users) {
        r.full_name = r.full_name || r.users.full_name;
        r.phone = r.phone || r.users.phone;
        r.email = r.email || r.users.email;
      }
      if (r.branches) {
        r.branch_name = r.branch_name || r.branches.name || r.branches.code;
      }
      if (r.customer) {
        r.customer_name = r.customer_name || r.customer.full_name;
        r.customer_phone = r.customer_phone || r.customer.phone;
        r.customer_avatar = r.customer_avatar || r.customer.avatar_url;
      }
      if (r.technicians) {
        r.technician_name = r.technician_name || r.technicians.full_name;
      }
      if (r.staff) {
        r.staff_name = r.staff_name || r.staff.full_name;
        r.staff_phone = r.staff_phone || r.staff.phone;
      }
      if (r.services) {
        r.service_name = r.service_name || r.services.name;
      }
      if (r.service_categories) {
        r.category_name = r.category_name || r.service_categories.name;
        r.category_code = r.category_code || r.service_categories.code;
      }
      if (r.bookings) {
        r.booking_code = r.booking_code || r.bookings.booking_code;
        r.booking_date = r.booking_date || r.bookings.booking_date;
        r.booking_time = r.booking_time || r.bookings.start_time;
        r.booking_status = r.booking_status || r.bookings.status;
      }
      if (r.courses) {
        r.course_title = r.course_title || r.courses.title;
      }
      if (r.course_chapters) {
        r.chapter_title = r.chapter_title || r.course_chapters.title;
      }
      if (r.course_quizzes) {
        r.quiz_title = r.quiz_title || r.course_quizzes.title;
      }
    });

    // In-memory sort for virtual columns
    if (sort === "full_name") {
      rows.sort((a, b) => {
        const fa = (a.full_name || "").toString();
        const fb = (b.full_name || "").toString();
        return direction === "desc" ? fb.localeCompare(fa) : fa.localeCompare(fb);
      });
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
    if (table === "users") {
      if (!payload.values.role) payload.values.role = "CUSTOMER";
      if (!payload.values.referral_code) {
        payload.values.referral_code = `REF${Date.now().toString().slice(-6)}`;
      }
    }
    const cleanValues = sanitizeValues(table, payload.values, false);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: getSupabaseHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify(cleanValues),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      if (res.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin-signout"));
      }
      if (isMissingTableError(res, err)) {
        return createLocalRecord(table, cleanValues) as T;
      }
      throw new Error(err?.message || "Không thể tạo bản ghi mới trên Supabase.");
    }
    const created = await res.json();
    return (Array.isArray(created) ? created[0] : created) as T;
  }

  if (action === "update" && payload?.values) {
    const key = payload.key || {};
    const primaryColumns = SCHEMA_COLUMNS[table]?.filter((column) => column.primary).map((column) => column.name);
    if (!Object.keys(key).length || primaryColumns?.some((name) => key[name] == null || key[name] === "") || Object.entries(key).some(([name, value]) =>
      !/^[a-z_][a-z0-9_]*$/.test(name) || value == null || value === "" ||
      (primaryColumns?.length && !primaryColumns.includes(name)))) {
      throw new Error("Không xác định được bản ghi cần cập nhật. Vui lòng tải lại trang.");
    }
    const id = key.id;
    const match = id
      ? `id=eq.${encodeURIComponent(id)}`
      : Object.entries(key)
          .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
          .join("&");

    const cleanValues = sanitizeValues(table, payload.values, true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH",
      headers: getSupabaseHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify(cleanValues),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      if (res.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin-signout"));
      }
      throw new Error(err?.message || "Không thể cập nhật bản ghi trên Supabase.");
    }
    const updated = await res.json();
    if (!Array.isArray(updated) || updated.length !== 1 || !updated[0] ||
      Object.entries(key).some(([name, value]) => String(updated[0][name]) !== String(value))) {
      throw new Error("Database chưa xác nhận cập nhật. Tài khoản có thể thiếu quyền ghi hoặc bản ghi đã thay đổi. Vui lòng tải lại và kiểm tra quyền quản trị.");
    }
    if (table === "users" && Object.prototype.hasOwnProperty.call(cleanValues, "role")) {
      const verified = await fetch(`${SUPABASE_URL}/rest/v1/users?${match}&select=id,role`, {
        headers: getSupabaseHeaders({ "Cache-Control": "no-cache" }),
        cache: "no-store",
        signal,
      });
      const records = await verified.json().catch(() => null);
      if (!verified.ok || !Array.isArray(records) || records.length !== 1 ||
        records[0].id !== updated[0].id || records[0].role !== cleanValues.role) {
        throw new Error("Chưa xác minh được vai trò mới trong database. Vui lòng tải lại tài khoản để kiểm tra trước khi thử lại.");
      }
    }
    return updated[0] as T;
  }

  if (action === "delete" && (payload?.key || payload?.id)) {
    const key = payload.key || {};
    const id = key.id || payload.id;
    const match = id
      ? `id=eq.${encodeURIComponent(id)}`
      : Object.entries(key)
          .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
          .join("&");

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "DELETE",
      headers: getSupabaseHeaders({
        Prefer: "return=representation",
      }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      if (res.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin-signout"));
      }
      if (isMissingTableError(res, err)) {
        deleteLocalRecord(table, id || key);
        return true as unknown as T;
      }
      throw new Error(formatDatabaseError(err, "Không thể xóa bản ghi trên Supabase."));
    }

    deleteLocalRecord(table, id || key);
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
        headers: getSupabaseHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ [statusField]: targetStatus }),
        signal,
      });
      return true as unknown as T;
    }
    if (payload.action === "toggle-active" && payload.key?.id) {
      const targetActive = payload.targetActive !== undefined ? Boolean(payload.targetActive) : !Boolean(payload.currentActive);
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(payload.key.id)}`, {
        method: "PATCH",
        headers: getSupabaseHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ is_active: targetActive }),
        signal,
      });
      return true as unknown as T;
    }

    if (payload.action === "toggle-featured" && payload.key?.id) {
      const targetFeatured = payload.targetFeatured !== undefined ? Boolean(payload.targetFeatured) : !Boolean(payload.currentFeatured);
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(payload.key.id)}`, {
        method: "PATCH",
        headers: getSupabaseHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ is_featured: targetFeatured }),
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
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const shouldDirectSupabase =
    (isHttps && base.startsWith("http://")) || (!isLocalhost && base.includes("127.0.0.1"));

  // On production (Vercel) or remote environments, immediately query Supabase to prevent mixed content & delay
  if (shouldDirectSupabase) {
    return querySupabaseFallback<T>(path, body, signal);
  }

  const token = sessionStorage.getItem("mld_admin_token");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = window.setTimeout(abort, 4000); // 4s fast fail for local NestJS

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
    // If backend is not running or unreachable, fallback seamlessly to Supabase
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
  const primaryCols = columns.filter((c) => c.primary);
  if (primaryCols.length === 0 && row?.id !== undefined) {
    return { id: row.id };
  }
  return Object.fromEntries(
    primaryCols.map((c) => [c.name, row[c.name]]),
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
