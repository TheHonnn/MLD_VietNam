import {
  Branch,
  BranchRoom,
  User,
  Service,
  Technician,
  Course,
  TreatmentPackage,
  MemberTier,
} from '../types/shared_types';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

class SupabaseService {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url.replace(/\/+$/, '');
    this.key = key;
  }

  private getHeaders(): Record<string, string> {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    };
  }

  private async query<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const fullUrl = `${this.url}/rest/v1/${path}`;
      const res = await fetch(fullUrl, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        console.warn(`[Supabase Query Warn] ${res.status} for ${path}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[Supabase Direct Error] ${err}`);
      return null;
    }
  }

  // 1. CHI NHÁNH (BRANCHES)
  async getBranches(): Promise<Branch[] | null> {
    const raw = await this.query<any[]>('branches?select=*&order=code.asc');
    if (!raw || raw.length === 0) return null;

    return raw.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      phone: b.phone,
      address: b.address,
      district: b.district,
      city: b.city,
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
      openingTime: b.opening_time,
      closingTime: b.closing_time,
      imageUrl: b.image_url,
      galleryUrls: Array.isArray(b.gallery_urls) ? b.gallery_urls : [],
      amenities: Array.isArray(b.amenities) ? b.amenities : [],
      isActive: Boolean(b.is_active),
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  // 2. PHÒNG CHI NHÁNH (BRANCH ROOMS)
  async getRooms(branchId?: string): Promise<BranchRoom[] | null> {
    const queryPath = branchId
      ? `branch_rooms?branch_id=eq.${branchId}&select=*`
      : 'branch_rooms?select=*';
    const raw = await this.query<any[]>(queryPath);
    if (!raw || raw.length === 0) return null;

    return raw.map((r) => ({
      id: r.id,
      branchId: r.branch_id,
      name: r.name,
      roomType: r.room_type,
      bedCapacity: Number(r.bed_capacity),
      isAvailable: Boolean(r.is_available),
      createdAt: r.created_at,
    }));
  }

  // 3. TÀI KHOẢN KHÁCH HÀNG / NGƯỜI DÙNG (USERS)
  async getUsers(search?: string, tier?: MemberTier): Promise<User[] | null> {
    let path = 'users?select=*&order=created_at.desc';
    if (tier) {
      path += `&membership_tier=eq.${tier}`;
    }
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    let result: User[] = raw.map((u) => ({
      id: u.id,
      phone: u.phone,
      email: u.email,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      gender: u.gender || 'OTHER',
      dateOfBirth: u.date_of_birth,
      address: u.address,
      emergencyContactName: u.emergency_contact_name,
      emergencyContactPhone: u.emergency_contact_phone,
      purpose: u.purpose,
      role: u.role,
      membershipTier: u.membership_tier,
      rewardPoints: Number(u.reward_points || 0),
      totalSpent: Number(u.total_spent || 0),
      referralCode: u.referral_code,
      isActive: Boolean(u.is_active),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(s) ||
          u.phone.includes(s) ||
          (u.email && u.email.toLowerCase().includes(s))
      );
    }

    return result;
  }

  async updateUserTier(userId: string, tier: MemberTier): Promise<boolean> {
    try {
      const res = await this.query<any>(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ membership_tier: tier }),
      });
      return res !== null;
    } catch {
      return false;
    }
  }

  // 4. DỊCH VỤ SPA (SERVICES)
  async getServices(): Promise<Service[] | null> {
    const raw = await this.query<any[]>('services?select=*&order=name.asc');
    if (!raw || raw.length === 0) return null;

    return raw.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      slug: s.slug,
      shortDescription: s.short_description || '',
      fullDescription: s.full_description || '',
      durationMinutes: Number(s.duration_minutes),
      price: Number(s.price),
      discountPrice: s.discount_price ? Number(s.discount_price) : undefined,
      imageUrl: s.image_url,
      galleryUrls: Array.isArray(s.gallery_urls) ? s.gallery_urls : [],
      steps: Array.isArray(s.steps) ? s.steps : [],
      benefits: Array.isArray(s.benefits) ? s.benefits : [],
      isFeatured: Boolean(s.is_featured),
      isActive: Boolean(s.is_active),
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  // 5. GÓI LIỆU TRÌNH (TREATMENT PACKAGES)
  async getTreatmentPackages(): Promise<TreatmentPackage[] | null> {
    const raw = await this.query<any[]>('treatment_packages?select=*&order=name.asc');
    if (!raw || raw.length === 0) return null;

    return raw.map((p) => ({
      id: p.id,
      name: p.name,
      serviceId: p.service_id,
      totalSessions: Number(p.total_sessions),
      price: Number(p.price),
      discountPrice: p.discount_price ? Number(p.discount_price) : undefined,
      validityMonths: Number(p.validity_months || 6),
      description: p.description,
      imageUrl: p.image_url,
      isActive: Boolean(p.is_active),
      createdAt: p.created_at,
    }));
  }

  // 6. KỸ THUẬT VIÊN & BÁC SĨ (TECHNICIANS)
  async getTechnicians(): Promise<Technician[] | null> {
    const raw = await this.query<any[]>('technicians?select=*&order=full_name.asc');
    if (!raw || raw.length === 0) return null;

    return raw.map((t) => ({
      id: t.id,
      userId: t.user_id,
      branchId: t.branch_id,
      fullName: t.full_name,
      title: t.title,
      avatarUrl: t.avatar_url,
      experienceYears: Number(t.experience_years),
      ratingAvg: Number(t.rating_avg),
      reviewCount: Number(t.review_count),
      specialties: Array.isArray(t.specialties) ? t.specialties : [],
      bio: t.bio,
      isActive: Boolean(t.is_active),
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  // 7. KHÓA ĐÀO TẠO ACADEMY (COURSES)
  async getCourses(): Promise<Course[] | null> {
    const raw = await this.query<any[]>('courses?select=*&order=title.asc');
    if (!raw || raw.length === 0) return null;

    return raw.map((c) => ({
      id: c.id,
      categoryId: c.category_id,
      primaryInstructorId: c.primary_instructor_id || null,
      title: c.title,
      code: c.code,
      shortDescription: c.short_description || '',
      fullDescription: c.full_description || '',
      level: c.level,
      totalHours: Number(c.total_hours || 144),
      theoryHours: Number(c.theory_hours || 48),
      practiceHours: Number(c.practice_hours || 96),
      totalLessons: Number(c.total_lessons || 20),
      tuitionFee: Number(c.tuition_fee),
      depositAmount: Number(c.deposit_amount),
      learningOutcomes: Array.isArray(c.learning_outcomes) ? c.learning_outcomes : [],
      certificateTitle: c.certificate_title || 'Chứng chỉ Nghề MLD',
      imageUrl: c.image_url,
      isFeatured: Boolean(c.is_featured),
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }
}

export const supabaseService = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);
