import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co'
).replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Lấy Access Token phiên quản trị viên đã đăng nhập từ sessionStorage / localStorage
 */
export function getAdminAuthToken(): string | null {
  try {
    return (
      sessionStorage.getItem('mld_admin_token') ||
      localStorage.getItem('mld_admin_token') ||
      localStorage.getItem('mld_auth_token') ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Trả về Headers an toàn cho các truy vấn trực tiếp đến Supabase Cloud REST API.
 * Luôn sử dụng Anon Key công khai làm apikey, và JWT của phiên admin làm Bearer token.
 * Tuyệt đối không dùng Service Role Key trên trình duyệt.
 */
export function getSupabaseHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAdminAuthToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    ...extraHeaders,
  };
}
