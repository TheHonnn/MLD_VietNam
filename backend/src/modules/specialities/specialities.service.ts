import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class SpecialitiesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService.adminClient
      .from('specialities')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(`Lỗi khi lấy danh mục chuyên khoa: ${error.message}`);
    }

    return data;
  }
}

