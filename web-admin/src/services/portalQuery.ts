import { getAdminAuthToken, getSupabaseHeaders, SUPABASE_URL } from './supabaseClient';

// Portal tables retain their existing Supabase RLS policies. Never retry a write
// through another service or turn an empty RLS result into a successful save.
const pendingWrites = new Map<string, Promise<unknown>>();
export function portalQuery<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!options.method || options.method.toUpperCase() === 'GET') return requestPortal<T>(path, options);
  const key = `${options.method}:${path}:${String(options.body || '')}`;
  const pending = pendingWrites.get(key);
  if (pending) return pending as Promise<T>;
  const request = requestPortal<T>(path, options).finally(() => pendingWrites.delete(key));
  pendingWrites.set(key, request);
  return request;
}
async function requestPortal<T>(path: string, options: RequestInit): Promise<T> {
  if (!getAdminAuthToken()) throw new Error('Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.');
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'PATCH' || method === 'DELETE') {
    const query = new URL(path, 'https://portal.invalid').searchParams;
    if (!query.get('id')?.startsWith('eq.') || query.get('id') === 'eq.') throw new Error('Thiếu mã bản ghi cần sửa hoặc xóa.');
  }
  if (method !== 'GET' && path.split('?')[0] === 'email_logs') throw new Error('Nhật ký gửi email chỉ được tra cứu, không sửa hoặc xóa.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 100) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
      if (method === 'GET') { url.searchParams.set('limit', '100'); url.searchParams.set('offset', String(offset)); }
      const response = await fetch(url.toString(), {
        ...options, method, cache: 'no-store', signal: controller.signal,
        headers: { ...getSupabaseHeaders(), 'Content-Type': 'application/json', ...options.headers, Prefer: 'return=representation,count=exact' },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `Không tải/lưu được dữ liệu (${response.status}).`);
      if (!Array.isArray(data)) throw new Error('Máy chủ chưa trả về dữ liệu xác nhận. Hãy tải lại trước khi thử tiếp.');
      if (method !== 'GET') {
        if (data.length !== 1) throw new Error('Không xác nhận được bản ghi đã lưu. Kiểm tra quyền hoặc tải lại dữ liệu.');
        return data as T;
      }
      rows.push(...data);
      const total = Number(response.headers.get('content-range')?.split('/')[1]);
      if (!data.length || data.length < 100 || (Number.isFinite(total) && rows.length >= total)) return rows as T;
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Yêu cầu quá thời gian hoặc đã hủy. Hãy tải lại để xác nhận trạng thái trước khi thao tác tiếp.');
    throw error;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
