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
  (import.meta as any).env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api/v1"
).replace(/\/$/, "");
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
  const timeout = window.setTimeout(abort, 20000);
  try {
    const response = await fetch(`${base}/admin/${path}`, {
      method: body === undefined ? "GET" : "POST",
      signal: controller.signal,
      headers: {
        'X-MLD-Local-Admin': '1',
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
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error("Máy chủ phản hồi quá chậm. Vui lòng thử lại.");
    if (err instanceof TypeError)
      throw new Error(
        "Không kết nối được backend. Kiểm tra máy chủ và VITE_API_BASE_URL.",
      );
    throw err;
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
