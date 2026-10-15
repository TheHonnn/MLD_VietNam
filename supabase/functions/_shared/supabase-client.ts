// ==============================================================================
// MLD VIỆT NAM - SUPABASE EDGE FUNCTIONS CLIENT UTILITY
// ==============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu cấu hình biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY!');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

