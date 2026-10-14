import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class DoctorsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(filters: {
    specialityId?: string;
    keyword?: string;
    minRating?: number;
  }) {
    let query = this.supabaseService.adminClient
      .from('doctors')
      .select(`
        id,
        title,
        consultation_fee,
        experience_years,
        patient_count,
        rating_avg,
        review_count,
        bio,
        room_number,
        is_available,
        user:users!doctors_user_id_fkey(id, full_name, avatar_url, phone),
        speciality:specialities!doctors_speciality_id_fkey(id, name, code, icon_url),
        clinic:clinics!doctors_clinic_id_fkey(id, name, address, city, latitude, longitude)
      `)
      .eq('is_available', true);

    if (filters.specialityId) {
      query = query.eq('speciality_id', filters.specialityId);
    }

    if (filters.minRating) {
      query = query.gte('rating_avg', filters.minRating);
    }

    const { data, error } = await query.order('rating_avg', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`Lỗi khi lấy danh sách bác sĩ: ${error.message}`);
    }

    // Lọc theo từ khóa tìm kiếm (Tên bác sĩ hoặc chuyên khoa) nếu có
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase().trim();
      return (data || []).filter((doc: any) => {
        const name = doc.user?.full_name?.toLowerCase() || '';
        const spec = doc.speciality?.name?.toLowerCase() || '';
        return name.includes(kw) || spec.includes(kw);
      });
    }

    return data;
  }

  async findOne(id: string) {
    const { data: doctor, error } = await this.supabaseService.adminClient
      .from('doctors')
      .select(`
        id,
        title,
        license_number,
        consultation_fee,
        experience_years,
        patient_count,
        rating_avg,
        review_count,
        bio,
        room_number,
        is_available,
        user:users!doctors_user_id_fkey(id, full_name, avatar_url, phone, email),
        speciality:specialities!doctors_speciality_id_fkey(id, name, code, icon_url, description),
        clinic:clinics!doctors_clinic_id_fkey(id, name, address, phone, opening_time, closing_time)
      `)
      .eq('id', id)
      .single();

    if (error || !doctor) {
      throw new NotFoundException('Không tìm thấy thông tin bác sĩ');
    }

    // Lấy các đánh giá gần nhất
    const { data: reviews } = await this.supabaseService.adminClient
      .from('doctor_reviews')
      .select(`
        id,
        rating,
        tags,
        comment,
        created_at,
        patient:users!doctor_reviews_patient_id_fkey(full_name, avatar_url)
      `)
      .eq('doctor_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...doctor,
      recent_reviews: reviews || [],
    };
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const { data: slots, error } = await this.supabaseService.adminClient
      .from('doctor_slots')
      .select('id, slot_date, start_time, end_time, status, hold_expires_at')
      .eq('doctor_id', doctorId)
      .eq('slot_date', date)
      .order('start_time', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(`Lỗi khi lấy khung giờ khám: ${error.message}`);
    }

    const now = new Date();

    // Chuẩn hóa trạng thái slot: nếu slot đang HOLD mà đã quá thời hạn hold_expires_at thì coi là AVAILABLE
    return (slots || []).map((slot: any) => {
      let isAvailable = slot.status === 'AVAILABLE';
      if (slot.status === 'HOLD' && slot.hold_expires_at) {
        if (new Date(slot.hold_expires_at) <= now) {
          isAvailable = true;
        }
      }

      return {
        id: slot.id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: isAvailable ? 'AVAILABLE' : slot.status,
        is_bookable: isAvailable,
      };
    });
  }
}

