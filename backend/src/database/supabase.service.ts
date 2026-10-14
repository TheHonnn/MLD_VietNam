import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  public client: SupabaseClient;
  public adminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.warn(
        '⚠️ Chưa cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env!',
      );
    }

    // Public client (tuân thủ Row Level Security)
    this.client = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
      auth: { persistSession: false },
    });

    // Admin client (dùng service role cho các tác vụ backend đặc quyền)
    this.adminClient = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder', {
      auth: { persistSession: false },
    });

    this.logger.log('✅ Supabase Service đã được khởi tạo thành công.');
  }
}

