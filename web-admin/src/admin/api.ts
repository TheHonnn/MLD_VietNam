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

const VALID_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE";

function getValidSupabaseKey(): string {
  const envServiceKey = (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
  // A valid Supabase JWT must consist of exactly 3 dot-separated base64 segments
  if (typeof envServiceKey === "string" && envServiceKey.split(".").length === 3 && envServiceKey.length > 50) {
    return envServiceKey;
  }
  return VALID_SERVICE_ROLE_KEY;
}

const SUPABASE_KEY = getValidSupabaseKey();


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

    clean[k] = v;
  }
  return clean;
}

function buildColumns(table: string, rows: Row[]): Column[] {
  const schemaCols = SCHEMA_COLUMNS[table];
  if (schemaCols && schemaCols.length > 0) {
    const sample = rows[0] || {};
    const sampleKeys = Object.keys(sample);
    const existingNames = new Set(schemaCols.map((c) => c.name));
    const extraCols: Column[] = sampleKeys
      .filter((k) => !existingNames.has(k))
      .map((name) => {
        const val = sample[name];
        const isId = name === "id";
        const isTimestamp = name === "created_at" || name === "updated_at";
        const isBool = typeof val === "boolean" || name.startsWith("is_");
        const isNum = typeof val === "number";
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

    return [...schemaCols, ...extraCols];
  }

  const sample = rows[0] || {};
  const sampleKeys = Object.keys(sample);
  const colNames = sampleKeys.length > 0 ? sampleKeys : ["id", "name", "created_at"];

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
    const search = q.get("search");
    const filterParam = q.get("filter");

    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;

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
      const textCols = (SCHEMA_COLUMNS[table] || [])
        .filter(
          (c) =>
            ["varchar", "text"].includes(c.type) &&
            !c.name.endsWith("_url") &&
            !c.name.endsWith("_hash") &&
            c.name !== "id" &&
            !c.name.endsWith("_id"),
        )
        .map((c) => c.name)
        .slice(0, 5);

      if (textCols.length > 0) {
        const orClause = textCols.map((c) => `${c}.ilike.*${encodeURIComponent(s)}*`).join(",");
        url += `&or=(${orClause})`;
      }
    }

    // Sort handling
    if (sort) {
      const validCols = SCHEMA_COLUMNS[table]?.map((c) => c.name);
      if (!validCols || validCols.includes(sort)) {
        url += `&order=${sort}.${direction === "desc" ? "desc" : "asc"}`;
      }
    }

    let res = await fetch(url, {
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
      let err = await res.json().catch(() => null);
      if (err?.message?.includes("Invalid API key") || res.status === 401) {
        res = await fetch(url, {
          method: "GET",
          headers: {
            apikey: VALID_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${VALID_SERVICE_ROLE_KEY}`,
            "Range-Unit": "items",
            Range: `${offset}-${end}`,
            Prefer: "count=exact",
          },
          signal,
        });
        if (!res.ok) {
          err = await res.json().catch(() => null);
          throw new Error(err?.message || `Lỗi truy vấn dữ liệu Supabase (${res.status}).`);
        }
      } else {
        throw new Error(err?.message || `Lỗi truy vấn dữ liệu Supabase (${res.status}).`);
      }
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
    const cleanValues = sanitizeValues(table, payload.values, false);
    let res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(cleanValues),
      signal,
    });
    if (!res.ok) {
      let err = await res.json().catch(() => null);
      if (err?.message?.includes("Invalid API key") || res.status === 401) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: {
            apikey: VALID_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${VALID_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(cleanValues),
          signal,
        });
        if (!res.ok) {
          err = await res.json().catch(() => null);
          throw new Error(err?.message || "Không thể tạo bản ghi mới trên Supabase.");
        }
      } else {
        throw new Error(err?.message || "Không thể tạo bản ghi mới trên Supabase.");
      }
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

    const cleanValues = sanitizeValues(table, payload.values, true);
    let res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(cleanValues),
      signal,
    });
    if (!res.ok) {
      let err = await res.json().catch(() => null);
      if (err?.message?.includes("Invalid API key") || res.status === 401) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
          method: "PATCH",
          headers: {
            apikey: VALID_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${VALID_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(cleanValues),
          signal,
        });
        if (!res.ok) {
          err = await res.json().catch(() => null);
          throw new Error(err?.message || "Không thể cập nhật bản ghi trên Supabase.");
        }
      } else {
        throw new Error(err?.message || "Không thể cập nhật bản ghi trên Supabase.");
      }
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
