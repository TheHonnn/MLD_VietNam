import {
  Branch,
  BranchRoom,
  User,
  Service,
  Technician,
  Course,
  CourseChapter,
  CourseLesson,
  TreatmentPackage,
  MemberTier,
  UserPackage,
  TreatmentJournal,
  Booking,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  Invoice,
  CourseBatch,
  CourseEnrollment,
  TuitionTransaction,
  PackageStatus,
  EnrollmentStatus,
  RoomType,
  AuditLog,
  StaffCommission,
  ServiceMaterial,
  InventoryConsumptionLog,
  StudentCertificate,
  EdemaAssessment,
  BatchSchedule,
  StudentAttendance,
  AttendanceStatus,
} from '../types/shared_types';

import { adminApi, Listing } from '../admin/api';
import { matchSearch, isUuid } from '../utils/searchUtils';
import { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabaseHeaders } from './supabaseClient';

class SupabaseService {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url.replace(/\/+$/, '');
    this.key = key;
  }

  private getHeaders(): Record<string, string> {
    return getSupabaseHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    });
  }

  public async query<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    // 1. Direct Supabase Cloud REST API (Primary for live production on Vercel & mobile sync)
    if (this.url && this.key) {
      try {
        const fullUrl = `${this.url}/rest/v1/${path}`;
        const res = await fetch(fullUrl, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...(options.headers || {}),
          },
        });

        if (res.ok) {
          const json = await res.json();
          return json as T;
        }
      } catch {
        // Fallback to local adminApi if direct fetch fails
      }
    }

    // 2. Fallback to adminApi if local backend is active
    try {
      const [table, query = ''] = path.split('?');
      if (options.method === 'POST') {
        const created = await adminApi(`${table}/insert`, { values: JSON.parse(String(options.body)) });
        return (Array.isArray(created) ? created : [created]) as T;
      }
      const params = new URLSearchParams(query), filter: Record<string, string> = {};
      const [sort, direction] = (params.get('order') || '').split(',')[0].split('.');
      for (const [name, value] of params.entries()) if (value.startsWith('eq.')) filter[name] = value.slice(3);
      const result: any[] = [];
      for (let page = 1; ; page++) {
        const listing = await adminApi<Listing>(`${table}?limit=100&page=${page}&filter=${encodeURIComponent(JSON.stringify(filter))}${sort ? `&sort=${encodeURIComponent(sort)}&direction=${direction === 'asc' ? 'asc' : 'desc'}` : ''}`);
        if (options.method === 'PATCH') {
          if (listing.rows.length !== 1) throw new Error('Không tìm thấy bản ghi cần sửa.');
          const updated = await adminApi(`${table}/update`, { key: { id: listing.rows[0].id }, values: JSON.parse(String(options.body)), expectedUpdatedAt: listing.rows[0].updated_at });
          return [updated] as T;
        }
        result.push(...listing.rows);
        if (result.length >= listing.total) break;
      }
      if (table === 'user_packages' && params.get('select')?.includes('package:treatment_packages')) {
        const packages = await this.query<any[]>('treatment_packages?select=*');
        const byId = new Map((packages || []).map((pkg) => [pkg.id, pkg]));
        for (const row of result) row.package = byId.get(row.package_id) ?? null;
      }
      return result as T;
    } catch (err) {
      console.warn(`[Supabase Service Error] Could not query ${path}:`, err);
      return null;
    }
  }

  // 1. CHI NHÁNH (BRANCHES)
  async getBranches(includeArchived = false): Promise<Branch[] | null> {
    const raw = await this.query<any[]>('branches?select=*&order=code.asc');
    if (!raw || raw.length === 0) return null;

    const filtered = includeArchived
      ? raw
      : raw.filter((b) => !b.name?.startsWith('[ARCHIVED]') && !b.name?.startsWith('[DELETED]'));

    return filtered.map((b) => ({
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
      isArchived: Boolean(b.name?.startsWith('[ARCHIVED]') || b.name?.startsWith('[DELETED]')),
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  async getArchivedBranches(): Promise<Branch[]> {
    const raw = await this.query<any[]>('branches?select=*&order=code.asc');
    if (!raw || raw.length === 0) return [];

    const archived = raw.filter((b) => b.name?.startsWith('[ARCHIVED]') || b.name?.startsWith('[DELETED]'));
    return archived.map((b) => ({
      id: b.id,
      name: (b.name || '').replace(/^\[(ARCHIVED|DELETED)\]\s*/, ''),
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
      isActive: false,
      isArchived: true,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  async createBranch(branch: Partial<Branch> & { name: string; code: string; phone: string; address: string; district: string }): Promise<Branch | null> {
    try {
      const payload = {
        name: branch.name,
        code: branch.code,
        phone: branch.phone,
        address: branch.address,
        district: branch.district,
        city: branch.city || 'TP. Hồ Chí Minh',
        latitude: branch.latitude ?? 10.7769,
        longitude: branch.longitude ?? 106.7009,
        opening_time: branch.openingTime || '08:30:00',
        closing_time: branch.closingTime || '20:30:00',
        image_url: branch.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
        gallery_urls: branch.galleryUrls || [],
        amenities: branch.amenities || ['Phòng VIP riêng biệt', 'Đỗ xe ô tô', 'Trà thảo mộc'],
        is_active: branch.isActive !== undefined ? branch.isActive : true,
      };

      const res = await this.query<any[]>('branches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.length > 0) {
        const b = res[0];
        return {
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
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] createBranch error:', err);
    }
    return null;
  }

  async updateBranch(branchId: string, updates: Partial<Branch>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.code !== undefined) payload.code = updates.code;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.district !== undefined) payload.district = updates.district;
      if (updates.city !== undefined) payload.city = updates.city;
      if (updates.openingTime !== undefined) payload.opening_time = updates.openingTime;
      if (updates.closingTime !== undefined) payload.closing_time = updates.closingTime;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.amenities !== undefined) payload.amenities = updates.amenities;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const res = await this.query<any>(`branches?id=eq.${branchId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res !== null;
    } catch (err) {
      console.warn('[SupabaseService] updateBranch error:', err);
      return false;
    }
  }

  /**
   * Xóa chi nhánh khỏi hệ thống vận hành (SOFT DELETE):
   * Bảo toàn 100% dữ liệu chi nhánh trong cơ sở dữ liệu Supabase Cloud.
   * Bản ghi KHÔNG bị xóa cứng (DELETE) để giữ nguyên vẹn liên kết khóa ngoại với lịch hẹn,
   * nhân sự, phòng dịch vụ và báo cáo tài chính.
   */
  async deleteBranch(branchId: string, permanent = true): Promise<boolean> {
    try {
      if (permanent) {
        // First delete dependent rooms to avoid foreign key conflicts
        try {
          await this.query(`branch_rooms?branch_id=eq.${branchId}`, {
            method: 'DELETE',
          });
        } catch {}

        // Perform hard delete from branches table
        const delRes = await this.query(`branches?id=eq.${branchId}`, {
          method: 'DELETE',
        });
        if (delRes !== null) {
          return true;
        }
      }

      // Fallback: soft delete if permanent delete fails due to existing bookings/invoices
      const existing = await this.query<any[]>(`branches?id=eq.${branchId}&select=*`);
      if (existing && existing.length > 0) {
        const br = existing[0];
        const originalName = br.name || '';
        const cleanName = originalName.replace(/^\[(ARCHIVED|DELETED)\]\s*/, '');
        const archivedName = `[ARCHIVED] ${cleanName}`.slice(0, 100);

        const patchRes = await this.query<any>(`branches?id=eq.${branchId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: archivedName,
            is_active: false,
          }),
        });

        try {
          await this.query('audit_logs', {
            method: 'POST',
            body: JSON.stringify({
              action: 'SOFT_DELETE_BRANCH',
              table_name: 'branches',
              record_id: branchId,
              old_data: br,
              new_data: {
                status: 'ARCHIVED',
                note: 'Chi nhánh đã xóa khỏi hệ thống vận hành, bảo lưu toàn vẹn trong cơ sở dữ liệu',
                archived_at: new Date().toISOString(),
              },
            }),
          });
        } catch {}

        return patchRes !== null;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] deleteBranch error:', err);
      return false;
    }
  }

  async restoreBranch(branchId: string): Promise<boolean> {
    try {
      const existing = await this.query<any[]>(`branches?id=eq.${branchId}&select=*`);
      if (existing && existing.length > 0) {
        const br = existing[0];
        const originalName = br.name || '';
        const restoredName = originalName.replace(/^\[(ARCHIVED|DELETED)\]\s*/, '');

        const patchRes = await this.query<any>(`branches?id=eq.${branchId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: restoredName,
            is_active: true,
          }),
        });

        try {
          await this.query('audit_logs', {
            method: 'POST',
            body: JSON.stringify({
              action: 'RESTORE_BRANCH',
              table_name: 'branches',
              record_id: branchId,
              restored_at: new Date().toISOString(),
            }),
          });
        } catch {}

        return patchRes !== null;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] restoreBranch error:', err);
      return false;
    }
  }


  // 2. PHÒNG CHI NHÁNH (BRANCH ROOMS)
  async getRooms(branchId?: string, includeArchived = false): Promise<BranchRoom[] | null> {
    const queryPath = branchId
      ? `branch_rooms?branch_id=eq.${branchId}&select=*`
      : 'branch_rooms?select=*';
    const raw = await this.query<any[]>(queryPath);
    if (!raw || raw.length === 0) return null;

    const filtered = includeArchived
      ? raw
      : raw.filter((r) => !r.name?.startsWith('[ARCHIVED]') && !r.name?.startsWith('[DELETED]'));

    return filtered.map((r) => ({
      id: r.id,
      branchId: r.branch_id,
      name: r.name,
      roomType: r.room_type,
      bedCapacity: Number(r.bed_capacity),
      isAvailable: Boolean(r.is_available),
      isArchived: Boolean(r.name?.startsWith('[ARCHIVED]') || r.name?.startsWith('[DELETED]')),
      createdAt: r.created_at,
    }));
  }

  async getArchivedRooms(branchId?: string): Promise<BranchRoom[]> {
    const queryPath = branchId
      ? `branch_rooms?branch_id=eq.${branchId}&select=*`
      : 'branch_rooms?select=*';
    const raw = await this.query<any[]>(queryPath);
    if (!raw || raw.length === 0) return [];

    const archived = raw.filter((r) => r.name?.startsWith('[ARCHIVED]') || r.name?.startsWith('[DELETED]'));
    return archived.map((r) => ({
      id: r.id,
      branchId: r.branch_id,
      name: (r.name || '').replace(/^\[(ARCHIVED|DELETED)\]\s*/, ''),
      roomType: r.room_type,
      bedCapacity: Number(r.bed_capacity),
      isAvailable: Boolean(r.is_available),
      isArchived: true,
      createdAt: r.created_at,
    }));
  }

  async createRoom(room: {
    branchId: string;
    name: string;
    roomType: RoomType;
    bedCapacity: number;
    isAvailable?: boolean;
  }): Promise<BranchRoom | null> {
    try {
      const payload = {
        branch_id: room.branchId,
        name: room.name,
        room_type: room.roomType || 'VIP_ROOM',
        bed_capacity: Number(room.bedCapacity) || 1,
        is_available: room.isAvailable !== undefined ? room.isAvailable : true,
      };

      const res = await this.query<any[]>('branch_rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.length > 0) {
        const r = res[0];
        return {
          id: r.id,
          branchId: r.branch_id,
          name: r.name,
          roomType: r.room_type,
          bedCapacity: Number(r.bed_capacity),
          isAvailable: Boolean(r.is_available),
          isArchived: false,
          createdAt: r.created_at,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] createRoom error:', err);
    }
    return null;
  }

  async updateRoom(roomId: string, updates: Partial<BranchRoom>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.roomType !== undefined) payload.room_type = updates.roomType;
      if (updates.bedCapacity !== undefined) payload.bed_capacity = Number(updates.bedCapacity);
      if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;

      const res = await this.query<any>(`branch_rooms?id=eq.${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res !== null;
    } catch (err) {
      console.warn('[SupabaseService] updateRoom error:', err);
      return false;
    }
  }

  /**
   * Xóa phòng khỏi hệ thống vận hành (SOFT DELETE):
   * Bảo toàn 100% dữ liệu phòng trong cơ sở dữ liệu Supabase Cloud.
   * Bản ghi KHÔNG bị xóa cứng (DELETE) để giữ nguyên vẹn khóa ngoại và lịch sử đặt hẹn,
   * thay vào đó được gắn tag [ARCHIVED] và tắt trạng thái sẵn sàng để ẩn hoàn toàn khỏi hệ thống.
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      // 1. Tra cứu bản ghi phòng hiện tại trên database
      const existing = await this.query<any[]>(`branch_rooms?id=eq.${roomId}&select=*`);
      if (existing && existing.length > 0) {
        const room = existing[0];
        const originalName = room.name || '';
        const cleanName = originalName.replace(/^\[(ARCHIVED|DELETED)\]\s*/, '');
        const archivedName = `[ARCHIVED] ${cleanName}`.slice(0, 100);

        // 2. Cập nhật trạng thái lưu trữ trên Supabase (PATCH thay vì DELETE vật lý)
        const patchRes = await this.query<any>(`branch_rooms?id=eq.${roomId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: archivedName,
            is_available: false,
          }),
        });

        // 3. Ghi vết kiểm toán (Audit Log)
        try {
          await this.query('audit_logs', {
            method: 'POST',
            body: JSON.stringify({
              action: 'SOFT_DELETE_ROOM',
              table_name: 'branch_rooms',
              record_id: roomId,
              old_data: room,
              new_data: {
                status: 'ARCHIVED',
                note: 'Phòng đã xóa khỏi hệ thống vận hành, bảo lưu toàn vẹn trong cơ sở dữ liệu',
                archived_at: new Date().toISOString(),
              },
            }),
          });
        } catch {}

        return patchRes !== null;
      }

      return true;
    } catch (err) {
      console.warn('[SupabaseService] deleteRoom (soft delete) error:', err);
      return false;
    }
  }

  /**
   * Khôi phục phòng đã xóa/lưu trữ về lại hệ thống vận hành
   */
  async restoreRoom(roomId: string): Promise<boolean> {
    try {
      const existing = await this.query<any[]>(`branch_rooms?id=eq.${roomId}&select=*`);
      if (existing && existing.length > 0) {
        const room = existing[0];
        const cleanName = (room.name || '').replace(/^\[(ARCHIVED|DELETED)\]\s*/, '');

        const patchRes = await this.query<any>(`branch_rooms?id=eq.${roomId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: cleanName,
            is_available: true,
          }),
        });

        try {
          await this.query('audit_logs', {
            method: 'POST',
            body: JSON.stringify({
              action: 'RESTORE_ROOM',
              table_name: 'branch_rooms',
              record_id: roomId,
              old_data: room,
              new_data: {
                status: 'ACTIVE',
                note: 'Khôi phục phòng vào lại hệ thống vận hành',
                restored_at: new Date().toISOString(),
              },
            }),
          });
        } catch {}

        return patchRes !== null;
      }
      return false;
    } catch (err) {
      console.warn('[SupabaseService] restoreRoom error:', err);
      return false;
    }
  }

  // 3. TÀI KHOẢN KHÁCH HÀNG / NGƯỜI DÙNG (USERS)
  async getUsers(search?: string, tier?: MemberTier): Promise<User[] | null> {
    let path = 'users?select=*&role=eq.CUSTOMER&order=created_at.desc';
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

    if (search && search.trim()) {
      result = result.filter((u) =>
        matchSearch([u.fullName, u.phone, u.email, u.address], search)
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

  async updateUser(userId: string, updates: Record<string, any>): Promise<boolean> {
    try {
      const updated = await adminApi<{ id: string }>('users/update', { key: { id: userId }, values: updates });
      return updated?.id === userId;
    } catch (err) {
      console.warn('[SupabaseService] updateUser error:', err);
      return false;
    }
  }

  async createUser(payload: Record<string, any>): Promise<User | null> {
    try {
      const res = await this.query<any[]>('users', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const u = res[0];
        return {
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
          role: u.role || 'CUSTOMER',
          membershipTier: u.membership_tier || 'STANDARD',
          rewardPoints: Number(u.reward_points || 0),
          totalSpent: Number(u.total_spent || 0),
          referralCode: u.referral_code,
          isActive: Boolean(u.is_active ?? true),
          createdAt: u.created_at || new Date().toISOString(),
          updatedAt: u.updated_at || new Date().toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.warn('[SupabaseService] createUser error:', err);
      return null;
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
      validityMonths: Number(p.validity_months),
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
      totalHours: Number(c.total_hours),
      theoryHours: Number(c.theory_hours),
      practiceHours: Number(c.practice_hours),
      totalLessons: Number(c.total_lessons),
      tuitionFee: Number(c.tuition_fee),
      depositAmount: Number(c.deposit_amount),
      learningOutcomes: Array.isArray(c.learning_outcomes) ? c.learning_outcomes : [],
      certificateTitle: c.certificate_title,
      imageUrl: c.image_url,
      isFeatured: Boolean(c.is_featured),
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  // 7.1 CHƯƠNG HỌC ACADEMY (COURSE CHAPTERS)
  async getCourseChapters(courseId?: string): Promise<CourseChapter[] | null> {
    const path = courseId
      ? `course_chapters?course_id=eq.${encodeURIComponent(courseId)}&select=*,courses(title,code)&order=chapter_order.asc`
      : `course_chapters?select=*,courses(title,code)&order=chapter_order.asc`;
    const raw = await this.query<any[]>(path);
    if (!raw) return null;

    return raw.map((ch) => ({
      id: ch.id,
      courseId: ch.course_id,
      chapterOrder: Number(ch.chapter_order || 1),
      title: ch.title,
      description: ch.description || '',
      createdAt: ch.created_at,
      course: ch.courses ? ({
        id: ch.course_id,
        title: ch.courses.title,
        code: ch.courses.code,
      } as any) : undefined,
    }));
  }

  // 7.2 BÀI HỌC ACADEMY (COURSE LESSONS)
  async getCourseLessons(chapterId?: string): Promise<CourseLesson[] | null> {
    const path = chapterId
      ? `course_lessons?chapter_id=eq.${encodeURIComponent(chapterId)}&select=*,course_chapters(id,title,course_id,courses(id,title,code))&order=lesson_order.asc`
      : `course_lessons?select=*,course_chapters(id,title,course_id,courses(id,title,code))&order=lesson_order.asc`;
    const raw = await this.query<any[]>(path);
    if (!raw) return null;

    return raw.map((l) => ({
      id: l.id,
      chapterId: l.chapter_id,
      lessonOrder: Number(l.lesson_order || 1),
      title: l.title,
      lessonType: l.lesson_type || 'VIDEO',
      durationMinutes: Number(l.duration_minutes || 0),
      videoUrl: l.video_url || '',
      contentText: l.content_text || '',
      attachments: Array.isArray(l.attachments) ? l.attachments : [],
      learningGoals: Array.isArray(l.learning_goals) ? l.learning_goals : [],
      isFreePreview: Boolean(l.is_free_preview),
      createdAt: l.created_at,
      chapter: l.course_chapters ? ({
        id: l.course_chapters.id,
        title: l.course_chapters.title,
        courseId: l.course_chapters.course_id,
        course: l.course_chapters.courses ? ({
          id: l.course_chapters.courses.id,
          title: l.course_chapters.courses.title,
          code: l.course_chapters.courses.code,
        } as any) : undefined,
      } as any) : undefined,
    }));
  }

  // 8. GÓI LIỆU TRÌNH KHÁCH SỞ HỮU (USER PACKAGES)
  async getUserPackages(customerId?: string): Promise<UserPackage[] | null> {
    const path = customerId
      ? `user_packages?customer_id=eq.${customerId}&select=*,package:treatment_packages(*)`
      : `user_packages?select=*,package:treatment_packages(*)`;
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((p) => ({
      id: p.id,
      customerId: p.customer_id,
      packageId: p.package_id,
      totalSessions: Number(p.total_sessions),
      completedSessions: Number(p.completed_sessions || 0),
      status: p.status,
      purchasedAt: p.purchased_at,
      expiresAt: p.expires_at,
      package: p.package
        ? {
            id: p.package.id,
            name: p.package.name,
            serviceId: p.package.service_id,
            totalSessions: Number(p.package.total_sessions),
            price: Number(p.package.price),
            discountPrice: p.package.discount_price ? Number(p.package.discount_price) : undefined,
            validityMonths: Number(p.package.validity_months),
            description: p.package.description,
            imageUrl: p.package.image_url,
            isActive: Boolean(p.package.is_active),
            createdAt: p.package.created_at,
          }
        : undefined,
    }));
  }

  // 9. NHẬT KÝ ĐIỀU TRỊ (TREATMENT JOURNAL)
  async getTreatmentJournals(customerId?: string): Promise<TreatmentJournal[] | null> {
    const path = customerId
      ? `treatment_journal?customer_id=eq.${customerId}&order=session_date.desc`
      : `treatment_journal?order=session_date.desc`;
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((j) => ({
      id: j.id,
      userPackageId: j.user_package_id,
      bookingId: j.booking_id,
      customerId: j.customer_id,
      technicianId: j.technician_id,
      assignedRoomId: j.assigned_room_id,
      sessionNumber: Number(j.session_number),
      sessionDate: j.session_date,
      conditionBefore: j.condition_before,
      conditionAfter: j.condition_after,
      treatmentNotes: j.treatment_notes,
      beforePhotos: Array.isArray(j.before_photos) ? j.before_photos : [],
      afterPhotos: Array.isArray(j.after_photos) ? j.after_photos : [],
      specialistAdvice: j.specialist_advice,
      customerSignatureUrl: j.customer_signature_url,
    }));
  }

  // 10. LỊCH ĐẶT CHỖ (BOOKINGS)
  async getBookings(branchId?: string, customerId?: string): Promise<Booking[] | null> {
    let path = `bookings?select=*,customer:users!bookings_customer_id_fkey(*),branch:branches!bookings_branch_id_fkey(*),technician:technicians(*),room:branch_rooms(*),items:booking_items(*,service:services(*))&order=booking_date.desc,start_time.asc`;
    if (branchId) path += `&branch_id=eq.${branchId}`;
    if (customerId) path += `&customer_id=eq.${customerId}`;

    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((b) => ({
      id: b.id,
      bookingCode: b.booking_code,
      customerId: b.customer_id,
      branchId: b.branch_id,
      assignedRoomId: b.assigned_room_id,
      assignedBedNumber: b.assigned_bed_number,
      technicianId: b.technician_id,
      bookingDate: b.booking_date,
      startTime: b.start_time,
      endTime: b.end_time,
      status: b.status,
      paymentStatus: b.payment_status,
      paymentMethod: b.payment_method,
      baseTotal: Number(b.base_total),
      couponId: b.coupon_id,
      discountAmount: Number(b.discount_amount || 0),
      pointsUsed: Number(b.points_used || 0),
      pointsDiscount: Number(b.points_discount || 0),
      finalPrice: Number(b.final_price),
      bookedForName: b.booked_for_name,
      bookedForPhone: b.booked_for_phone,
      specialNotes: b.special_notes,
      qrCodeHash: b.qr_code_hash,
      checkedInAt: b.checked_in_at,
      serviceStartedAt: b.service_started_at,
      checkedOutAt: b.checked_out_at,
      actualDurationMinutes: b.actual_duration_minutes ? Number(b.actual_duration_minutes) : undefined,
      hasMedicalAlert: Boolean(b.has_medical_alert),
      customer: b.customer ? {
        id: b.customer.id,
        phone: b.customer.phone,
        email: b.customer.email,
        fullName: b.customer.full_name,
        avatarUrl: b.customer.avatar_url,
        gender: b.customer.gender,
        dateOfBirth: b.customer.date_of_birth,
        address: b.customer.address,
        membershipTier: b.customer.membership_tier,
        loyaltyPoints: Number(b.customer.reward_points || 0),
        totalSpent: Number(b.customer.total_spent || 0),
        role: b.customer.role,
      } as any : undefined,
      branch: b.branch ? {
        id: b.branch.id,
        name: b.branch.name,
        code: b.branch.code,
        phone: b.branch.phone,
        address: b.branch.address,
        district: b.branch.district,
        city: b.branch.city,
        latitude: Number(b.branch.latitude),
        longitude: Number(b.branch.longitude),
        openingTime: b.branch.opening_time,
        closingTime: b.branch.closing_time,
        imageUrl: b.branch.image_url,
        galleryUrls: Array.isArray(b.branch.gallery_urls) ? b.branch.gallery_urls : [],
        amenities: Array.isArray(b.branch.amenities) ? b.branch.amenities : [],
        isActive: Boolean(b.branch.is_active),
      } : undefined,
      room: b.room ? {
        id: b.room.id,
        branchId: b.room.branch_id,
        name: b.room.name,
        roomType: b.room.room_type,
        bedCapacity: Number(b.room.bed_capacity),
        isAvailable: Boolean(b.room.is_available),
      } : undefined,
      technician: b.technician ? {
        id: b.technician.id,
        userId: b.technician.user_id,
        branchId: b.technician.branch_id,
        fullName: b.technician.full_name,
        title: b.technician.title,
        avatarUrl: b.technician.avatar_url,
        experienceYears: Number(b.technician.experience_years),
        ratingAvg: Number(b.technician.rating_avg),
        reviewCount: Number(b.technician.review_count),
        specialties: Array.isArray(b.technician.specialties) ? b.technician.specialties : [],
        bio: b.technician.bio,
        isActive: Boolean(b.technician.is_active),
      } : undefined,
      items: Array.isArray(b.items) ? b.items.map((it: any) => ({
        id: it.id,
        bookingId: it.booking_id,
        serviceId: it.service_id,
        technicianId: it.technician_id,
        durationMinutes: Number(it.duration_minutes),
        price: Number(it.price),
        service: it.service ? {
          id: it.service.id,
          name: it.service.name,
          slug: it.service.slug,
          categoryId: it.service.category_id,
          shortDescription: it.service.short_description,
          fullDescription: it.service.full_description,
          durationMinutes: Number(it.service.duration_minutes),
          price: Number(it.service.price),
          discountPrice: it.service.discount_price ? Number(it.service.discount_price) : undefined,
          imageUrl: it.service.image_url,
          galleryUrls: Array.isArray(it.service.gallery_urls) ? it.service.gallery_urls : [],
          steps: Array.isArray(it.service.steps) ? it.service.steps : [],
          benefits: Array.isArray(it.service.benefits) ? it.service.benefits : [],
          isFeatured: Boolean(it.service.is_featured),
          isActive: Boolean(it.service.is_active),
        } : undefined,
      })) : [],
    }));
  }

  // Cập nhật trạng thái và thông tin Booking
  async updateBooking(
    bookingId: string,
    updates: {
      status?: BookingStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      assignedRoomId?: string | null;
      assignedBedNumber?: string | null;
      technicianId?: string | null;
    }
  ): Promise<boolean> {
    if (!isUuid(bookingId)) {
      return false;
    }
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.paymentStatus !== undefined) payload.payment_status = updates.paymentStatus;
      if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
      if (updates.assignedRoomId !== undefined) payload.assigned_room_id = updates.assignedRoomId;
      if (updates.assignedBedNumber !== undefined) payload.assigned_bed_number = updates.assignedBedNumber;
      if (updates.technicianId !== undefined) payload.technician_id = updates.technicianId;

      const res = await this.query<any[]>(`bookings?id=eq.${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return Boolean(res && res.length > 0);
    } catch (err) {
      console.warn('[SupabaseService] updateBooking error:', err);
      return false;
    }
  }

  // Tạo mới lịch hẹn (Booking) trực tiếp lên Supabase Cloud
  async createBooking(bookingData: {
    bookingCode?: string;
    customerId?: string;
    branchId?: string;
    assignedRoomId?: string | null;
    assignedBedNumber?: string | null;
    technicianId?: string | null;
    bookingDate: string; // YYYY-MM-DD
    startTime: string;   // HH:MM:SS
    endTime: string;     // HH:MM:SS
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    baseTotal: number;
    discountAmount?: number;
    finalPrice: number;
    bookedForName: string;
    bookedForPhone?: string;
    specialNotes?: string;
    serviceId?: string;
    durationMinutes?: number;
  }): Promise<Booking | null> {
    try {
      // 1. Đảm bảo có customer_id hợp lệ cho foreign key
      let validCustomerId = bookingData.customerId;
      if (!validCustomerId) {
        const users = await this.query<any[]>('users?select=id&limit=1');
        if (users && users.length > 0) {
          validCustomerId = users[0].id;
        }
      }

      // 2. Đảm bảo có branch_id hợp lệ
      let validBranchId = bookingData.branchId;
      if (!validBranchId) {
        const branches = await this.query<any[]>('branches?select=id&limit=1');
        if (branches && branches.length > 0) {
          validBranchId = branches[0].id;
        }
      }

      const bookingCode = bookingData.bookingCode || `BK-${Date.now().toString().slice(-6)}`;
      const payload: Record<string, any> = {
        booking_code: bookingCode,
        customer_id: validCustomerId,
        branch_id: validBranchId,
        booking_date: bookingData.bookingDate,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        status: bookingData.status || 'CONFIRMED',
        payment_status: bookingData.paymentStatus || 'UNPAID',
        payment_method: bookingData.paymentMethod || 'CASH',
        base_total: bookingData.baseTotal || 0,
        discount_amount: bookingData.discountAmount || 0,
        final_price: bookingData.finalPrice || bookingData.baseTotal || 0,
        booked_for_name: bookingData.bookedForName,
        booked_for_phone: bookingData.bookedForPhone || null,
        special_notes: bookingData.specialNotes || null,
        qr_code_hash: `mld_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };

      if (bookingData.assignedRoomId) payload.assigned_room_id = bookingData.assignedRoomId;
      if (bookingData.assignedBedNumber) payload.assigned_bed_number = bookingData.assignedBedNumber;
      if (bookingData.technicianId && !bookingData.technicianId.startsWith('tech-')) {
        payload.technician_id = bookingData.technicianId;
      }

      const res = await this.query<any[]>('bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.length > 0) {
        const createdRow = res[0];

        // Nếu có serviceId, tạo thêm booking_item
        if (bookingData.serviceId && createdRow.id) {
          try {
            await this.query('booking_items', {
              method: 'POST',
              body: JSON.stringify({
                booking_id: createdRow.id,
                service_id: bookingData.serviceId,
                technician_id: payload.technician_id || null,
                duration_minutes: bookingData.durationMinutes || 60,
                price: bookingData.finalPrice,
              }),
            });
          } catch (itemErr) {
            console.warn('[SupabaseService] create booking_item error:', itemErr);
          }
        }

        // Lấy lại booking hoàn chỉnh kèm quan hệ
        const full = await this.query<any[]>(
          `bookings?select=*,customer:users!bookings_customer_id_fkey(*),branch:branches!bookings_branch_id_fkey(*),technician:technicians(*),room:branch_rooms(*),items:booking_items(*,service:services(*))&id=eq.${createdRow.id}`
        );

        if (full && full.length > 0) {
          const b = full[0];
          return {
            id: b.id,
            bookingCode: b.booking_code,
            customerId: b.customer_id,
            branchId: b.branch_id,
            assignedRoomId: b.assigned_room_id,
            assignedBedNumber: b.assigned_bed_number,
            technicianId: b.technician_id,
            bookingDate: b.booking_date,
            startTime: b.start_time,
            endTime: b.end_time,
            status: b.status,
            paymentStatus: b.payment_status,
            paymentMethod: b.payment_method,
            baseTotal: Number(b.base_total),
            couponId: b.coupon_id,
            discountAmount: Number(b.discount_amount || 0),
            pointsUsed: Number(b.points_used || 0),
            pointsDiscount: Number(b.points_discount || 0),
            finalPrice: Number(b.final_price),
            bookedForName: b.booked_for_name,
            bookedForPhone: b.booked_for_phone,
            specialNotes: b.special_notes,
            qrCodeHash: b.qr_code_hash,
            hasMedicalAlert: Boolean(b.has_medical_alert),
            customer: b.customer,
            branch: b.branch,
            technician: b.technician,
          } as Booking;
        }

        return {
          id: createdRow.id,
          bookingCode: createdRow.booking_code,
          customerId: createdRow.customer_id,
          branchId: createdRow.branch_id,
          technicianId: createdRow.technician_id,
          bookingDate: createdRow.booking_date,
          startTime: createdRow.start_time,
          endTime: createdRow.end_time,
          status: createdRow.status,
          paymentStatus: createdRow.payment_status,
          paymentMethod: createdRow.payment_method,
          baseTotal: Number(createdRow.base_total),
          discountAmount: Number(createdRow.discount_amount || 0),
          pointsUsed: 0,
          pointsDiscount: 0,
          finalPrice: Number(createdRow.final_price),
          bookedForName: createdRow.booked_for_name,
          bookedForPhone: createdRow.booked_for_phone,
          specialNotes: createdRow.special_notes,
          qrCodeHash: createdRow.qr_code_hash,
          hasMedicalAlert: false,
        } as Booking;
      }
      return null;
    } catch (err) {
      console.warn('[SupabaseService] createBooking error:', err);
      return null;
    }
  }

  // Xóa lịch hẹn theo ID trên Supabase Cloud
  async deleteBooking(bookingId: string): Promise<boolean> {
    if (!isUuid(bookingId)) {
      return false;
    }
    try {
      try {
        await this.query(`booking_items?booking_id=eq.${bookingId}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('[SupabaseService] delete booking_items warning:', e);
      }

      await this.query(`bookings?id=eq.${bookingId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (err) {
      console.warn('[SupabaseService] deleteBooking error:', err);
      return false;
    }
  }

  // Xóa toàn bộ lịch hẹn trên Supabase Cloud
  async deleteAllBookings(): Promise<boolean> {
    try {
      try {
        await this.query('booking_items?id=neq.00000000-0000-0000-0000-000000000000', {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('[SupabaseService] delete all booking_items warning:', e);
      }
      await this.query('bookings?id=neq.00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });
      return true;
    } catch (err) {
      console.warn('[SupabaseService] deleteAllBookings error:', err);
      return false;
    }
  }

  // 11. HÓA ĐƠN THU NGÂN (INVOICES)
  async getInvoices(branchId?: string, customerId?: string): Promise<Invoice[] | null> {
    let path = `invoices?select=*,customer:customer_id(id,full_name,phone,email,avatar_url,membership_tier),branch:branch_id(id,name,code,address,district,city)&order=paid_at.desc`;
    if (branchId && branchId !== 'ALL') path += `&branch_id=eq.${branchId}`;
    if (customerId) path += `&customer_id=eq.${customerId}`;

    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((inv) => ({
      id: inv.id,
      invoiceCode: inv.invoice_code,
      branchId: inv.branch_id,
      customerId: inv.customer_id,
      cashierId: inv.cashier_id,
      bookingId: inv.booking_id,
      userPackageId: inv.user_package_id,
      enrollmentId: inv.enrollment_id,
      subtotal: Number(inv.subtotal),
      discountAmount: Number(inv.discount_amount || 0),
      pointsRedeemedAmount: Number(inv.points_redeemed_amount || 0),
      vatAmount: Number(inv.vat_amount || 0),
      totalAmount: Number(inv.total_amount),
      paymentMethod: inv.payment_method,
      paymentStatus: inv.payment_status,
      gatewayTransactionId: inv.gateway_transaction_id,
      refundAmount: Number(inv.refund_amount || 0),
      paidAt: inv.paid_at,
      customer: inv.customer ? {
        id: inv.customer.id,
        fullName: inv.customer.full_name || 'Khách hàng',
        phone: inv.customer.phone || '--',
        email: inv.customer.email,
        avatarUrl: inv.customer.avatar_url,
        membershipTier: inv.customer.membership_tier,
      } as any : undefined,
      branch: inv.branch ? {
        id: inv.branch.id,
        name: inv.branch.name,
        code: inv.branch.code,
        address: inv.branch.address,
        district: inv.branch.district,
        city: inv.branch.city,
      } as any : undefined,
    }));
  }

  // Tạo mới Hóa đơn Thu ngân (Invoice) trực tiếp trên Supabase
  async createInvoice(invoice: {
    invoiceCode: string;
    branchId: string;
    customerId: string;
    cashierId?: string | null;
    bookingId?: string | null;
    userPackageId?: string | null;
    enrollmentId?: string | null;
    subtotal: number;
    discountAmount?: number;
    pointsRedeemedAmount?: number;
    vatAmount?: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    paidAt?: string;
  }): Promise<Invoice | null> {
    try {
      const payload = {
        invoice_code: invoice.invoiceCode,
        branch_id: isUuid(invoice.branchId) ? invoice.branchId : 'aaaaaaaa-0001-0001-0001-000000000001',
        customer_id: isUuid(invoice.customerId) ? invoice.customerId : '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        cashier_id: isUuid(invoice.cashierId) ? invoice.cashierId : 'bbbbbbbb-0001-0001-0001-000000000002',
        booking_id: isUuid(invoice.bookingId) ? invoice.bookingId : null,
        user_package_id: isUuid(invoice.userPackageId) ? invoice.userPackageId : null,
        enrollment_id: isUuid(invoice.enrollmentId) ? invoice.enrollmentId : null,
        subtotal: invoice.subtotal,
        discount_amount: invoice.discountAmount || 0,
        points_redeemed_amount: invoice.pointsRedeemedAmount || 0,
        vat_amount: invoice.vatAmount || 0,
        total_amount: invoice.totalAmount,
        payment_method: invoice.paymentMethod,
        payment_status: invoice.paymentStatus || 'PAID',
        paid_at: invoice.paidAt || new Date().toISOString(),
      };

      const res = await this.query<any[]>('invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res || res.length === 0) return null;
      const inv = res[0];
      return {
        id: inv.id,
        invoiceCode: inv.invoice_code,
        branchId: inv.branch_id,
        customerId: inv.customer_id,
        cashierId: inv.cashier_id,
        bookingId: inv.booking_id,
        userPackageId: inv.user_package_id,
        enrollmentId: inv.enrollment_id,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discount_amount || 0),
        pointsRedeemedAmount: Number(inv.points_redeemed_amount || 0),
        vatAmount: Number(inv.vat_amount || 0),
        totalAmount: Number(inv.total_amount),
        paymentMethod: inv.payment_method,
        paymentStatus: inv.payment_status,
        gatewayTransactionId: inv.gateway_transaction_id,
        refundAmount: Number(inv.refund_amount || 0),
        paidAt: inv.paid_at,
      };
    } catch (err) {
      console.warn('[SupabaseService] createInvoice error:', err);
      return null;
    }
  }

  // 12. LỚP HỌC THEO KHÓA (COURSE BATCHES)
  async getCourseBatches(courseId?: string): Promise<CourseBatch[] | null> {
    const path = courseId
      ? `course_batches?course_id=eq.${courseId}&order=start_date.desc`
      : `course_batches?order=start_date.desc`;
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((cb) => ({
      id: cb.id,
      courseId: cb.course_id,
      branchId: cb.branch_id,
      batchCode: cb.batch_code,
      instructorId: cb.instructor_id,
      startDate: cb.start_date,
      endDate: cb.end_date,
      scheduleText: cb.schedule_text,
      maxStudents: Number(cb.max_students),
      enrolledCount: Number(cb.enrolled_count),
      status: cb.status,
    }));
  }

  async updateCourseBatch(
    batchId: string,
    updates: {
      instructorId?: string | null;
      scheduleText?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.instructorId !== undefined) payload.instructor_id = updates.instructorId;
      if (updates.scheduleText !== undefined) payload.schedule_text = updates.scheduleText;
      if (updates.startDate !== undefined) payload.start_date = updates.startDate;
      if (updates.endDate !== undefined) payload.end_date = updates.endDate;
      if (updates.status !== undefined) payload.status = updates.status;

      const res = await this.query<any[]>(`course_batches?id=eq.${batchId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return Boolean(res && res.length > 0);
    } catch (err) {
      console.warn('[SupabaseService] updateCourseBatch error:', err);
      return false;
    }
  }

  async assignInstructorToBatch(
    batchId: string,
    instructorId: string | null,
    scheduleText?: string
  ): Promise<boolean> {
    const updates: any = { instructorId };
    if (scheduleText !== undefined) updates.scheduleText = scheduleText;
    return this.updateCourseBatch(batchId, updates);
  }

  // 13. HỒ SƠ HỌC VIÊN GHI DANH (COURSE ENROLLMENTS)
  async getEnrollments(batchId?: string): Promise<CourseEnrollment[] | null> {
    const path = batchId
      ? `course_enrollments?batch_id=eq.${batchId}&order=enrolled_at.desc`
      : `course_enrollments?order=enrolled_at.desc`;
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((e) => ({
      id: e.id,
      studentId: e.student_id,
      courseId: e.course_id,
      batchId: e.batch_id,
      status: e.status,
      tuitionTotal: Number(e.tuition_total),
      amountPaid: Number(e.amount_paid),
      completedLessonsCount: Number(e.completed_lessons_count || 0),
      progressPercent: Number(e.progress_percent || 0),
      enrolledAt: e.enrolled_at,
      studentName: e.student_name,
      studentPhone: e.student_phone,
      studentEmail: e.student_email,
      selectedBranch: e.selected_branch,
      approvalStatus: e.approval_status,
      approvedBy: e.approved_by,
      approvedAt: e.approved_at,
      approvalNotes: e.approval_notes,
      orderCode: e.order_code,
      consultationStatus: e.consultation_status || 'PENDING_CONSULTATION',
      paymentVerificationStatus: e.payment_status || 'UNPAID',
      studentAdmissionStatus: e.student_status || 'NOT_APPROVED',
      assignedStaffId: e.assigned_staff_id,
      finalTuition: e.final_tuition ? Number(e.final_tuition) : Number(e.tuition_total || 0),
      consultationHistory: e.consultation_history || [],
      qrCreatedAt: e.qr_created_at,
    }));
  }

  // 14. PHÂN CA KỸ THUẬT VIÊN (TECHNICIAN SHIFTS)
  async getTechnicianShifts(branchId?: string): Promise<any[] | null> {
    const path = branchId
      ? `technician_shifts?branch_id=eq.${branchId}&order=shift_date.desc`
      : `technician_shifts?order=shift_date.desc`;
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((ts) => ({
      id: ts.id,
      technicianId: ts.technician_id,
      branchId: ts.branch_id,
      assignedRoomId: ts.assigned_room_id,
      shiftDate: ts.shift_date,
      startTime: ts.start_time,
      endTime: ts.end_time,
      isCancelled: Boolean(ts.is_cancelled),
    }));
  }

  // 15. GIAO DỊCH HỌC PHÍ ACADEMY (TUITION TRANSACTIONS)
  async getTuitionTransactions(enrollmentId?: string): Promise<TuitionTransaction[] | null> {
    const path = enrollmentId
      ? `tuition_transactions?enrollment_id=eq.${enrollmentId}&order=paid_at.desc`
      : `tuition_transactions?order=paid_at.desc`;
    const raw = await this.query<any[]>(path);
    if (!raw || raw.length === 0) return null;

    return raw.map((tt) => ({
      id: tt.id,
      transactionCode: tt.transaction_code,
      enrollmentId: tt.enrollment_id,
      studentId: tt.student_id,
      courseId: tt.course_id,
      branchId: tt.branch_id,
      cashierId: tt.cashier_id,
      transactionType: tt.transaction_type,
      amount: Number(tt.amount),
      paymentMethod: tt.payment_method,
      paymentStatus: tt.payment_status,
      receiptNumber: tt.receipt_number,
      receiptPdfUrl: tt.receipt_pdf_url,
      dueDate: tt.due_date,
      notes: tt.notes,
      paidAt: tt.paid_at,
    }));
  }

  // 16. HỒ SƠ GIẢNG VIÊN (INSTRUCTORS)
  async getInstructors(): Promise<any[] | null> {
    const raw = await this.query<any[]>('instructors?select=*,user:users(id,full_name,phone,avatar_url,email)&order=created_at.asc');
    if (!raw || raw.length === 0) return null;

    return raw.map((ins) => ({
      id: ins.id,
      userId: ins.user_id,
      fullName: ins.full_name || ins.user?.full_name || 'Nguyễn Thảo Ngọc',
      title: ins.title || 'Master Trainer Thẩm mỹ & Dưỡng sinh',
      avatarUrl: ins.avatar_url || ins.user?.avatar_url || 'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848',
      experienceYears: Number(ins.experience_years || 10),
      bio: ins.bio || 'Giám đốc Đào tạo MLD Academy',
      achievements: Array.isArray(ins.achievements) ? ins.achievements : [],
      isActive: Boolean(ins.is_active),
      createdAt: ins.created_at,
      user: ins.user ? {
        id: ins.user.id,
        fullName: ins.user.full_name,
        phone: ins.user.phone,
        email: ins.user.email,
        avatarUrl: ins.user.avatar_url,
      } : undefined,
    }));
  }

  async createInstructor(instructor: {
    userId?: string | null;
    fullName: string;
    title: string;
    avatarUrl?: string;
    experienceYears?: number;
    bio?: string;
    achievements?: string[];
  }): Promise<any | null> {
    try {
      const payload = {
        user_id: instructor.userId || null,
        full_name: instructor.fullName,
        title: instructor.title,
        avatar_url: instructor.avatarUrl || 'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848',
        experience_years: instructor.experienceYears || 5,
        bio: instructor.bio || '',
        achievements: instructor.achievements || [],
        is_active: true,
      };

      const res = await this.query<any[]>('instructors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return res?.[0] || null;
    } catch (err) {
      console.warn('[SupabaseService] createInstructor error:', err);
      return null;
    }
  }

  // 15. QUẢN LÝ GHI DANH & HỌC PHÍ HỌC VIỆN (ACADEMY ENROLLMENT FSM)
  async createEnrollment(data: {
    studentId: string;
    courseId: string;
    batchId?: string | null;
    status?: EnrollmentStatus;
    tuitionTotal?: number;
    amountPaid?: number;
  }): Promise<CourseEnrollment | null> {
    try {
      const payload: Record<string, any> = {
        student_id: data.studentId,
        course_id: data.courseId,
        batch_id: data.batchId || null,
        status: data.status || EnrollmentStatus.CONSULTING,
        tuition_total: data.tuitionTotal || 9000000,
        amount_paid: data.amountPaid || 0,
        completed_lessons_count: 0,
        progress_percent: 0,
        enrolled_at: new Date().toISOString(),
      };
      const res = await this.query<any[]>('course_enrollments', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const enr = res[0];
        return {
          id: enr.id,
          studentId: enr.student_id,
          courseId: enr.course_id,
          batchId: enr.batch_id,
          status: enr.status as EnrollmentStatus,
          tuitionTotal: Number(enr.tuition_total),
          amountPaid: Number(enr.amount_paid),
          completedLessonsCount: enr.completed_lessons_count || 0,
          progressPercent: enr.progress_percent || 0,
          enrolledAt: enr.enrolled_at,
        };
      }
      return null;
    } catch (err) {
      console.warn('[SupabaseService] createEnrollment error:', err);
      return null;
    }
  }

  async updateEnrollment(
    enrollmentId: string,
    updates: {
      status?: EnrollmentStatus;
      batchId?: string | null;
      amountPaid?: number;
      tuitionTotal?: number;
      selectedBranch?: string;
      progressPercent?: number;
      completedLessonsCount?: number;
      approvalStatus?: string;
      approvedBy?: string;
      approvedAt?: string;
      approvalNotes?: string;
      orderCode?: string;
      consultationStatus?: string;
      paymentVerificationStatus?: string;
      studentAdmissionStatus?: string;
      assignedStaffId?: string | null;
      finalTuition?: number;
      consultationHistory?: any[];
      qrCreatedAt?: string | null;
    }
  ): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.batchId !== undefined) payload.batch_id = updates.batchId;
      if (updates.amountPaid !== undefined) payload.amount_paid = updates.amountPaid;
      if (updates.tuitionTotal !== undefined) payload.tuition_total = updates.tuitionTotal;
      if (updates.selectedBranch !== undefined) payload.selected_branch = updates.selectedBranch;
      if (updates.progressPercent !== undefined) payload.progress_percent = updates.progressPercent;
      if (updates.completedLessonsCount !== undefined) payload.completed_lessons_count = updates.completedLessonsCount;
      if (updates.approvalStatus !== undefined) payload.approval_status = updates.approvalStatus;
      if (updates.approvedBy !== undefined) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.approvedBy);
        payload.approved_by = isUuid ? updates.approvedBy : 'f0dc713a-56fc-4347-9fb3-240528726ba3';
      }
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.approvalNotes !== undefined) payload.approval_notes = updates.approvalNotes;
      if (updates.orderCode !== undefined) payload.order_code = updates.orderCode;
      if (updates.consultationStatus !== undefined) payload.consultation_status = updates.consultationStatus;
      if (updates.paymentVerificationStatus !== undefined) payload.payment_status = updates.paymentVerificationStatus;
      if (updates.studentAdmissionStatus !== undefined) payload.student_status = updates.studentAdmissionStatus;
      if (updates.assignedStaffId !== undefined) payload.assigned_staff_id = updates.assignedStaffId;
      if (updates.finalTuition !== undefined) payload.final_tuition = updates.finalTuition;
      if (updates.consultationHistory !== undefined) payload.consultation_history = updates.consultationHistory;
      if (updates.qrCreatedAt !== undefined) payload.qr_created_at = updates.qrCreatedAt;

      const res = await this.query<any[]>(`course_enrollments?id=eq.${enrollmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return Boolean(res && res.length > 0);
    } catch (err) {
      console.warn('[SupabaseService] updateEnrollment error:', err);
      return false;
    }
  }

  async recordTuitionPayment(payment: {
    transactionCode: string;
    enrollmentId: string;
    studentId: string;
    courseId: string;
    branchId: string;
    cashierId?: string | null;
    amount: number;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    notes?: string;
  }): Promise<any | null> {
    try {
      const payload = {
        transaction_code: payment.transactionCode,
        enrollment_id: payment.enrollmentId,
        student_id: payment.studentId,
        course_id: payment.courseId,
        branch_id: payment.branchId,
        cashier_id: payment.cashierId || null,
        transaction_type: 'TUITION_FEE',
        amount: payment.amount,
        payment_method: payment.paymentMethod || 'BANK_TRANSFER',
        payment_status: payment.paymentStatus || 'PAID',
        notes: payment.notes || 'Thanh toán học phí khóa học',
        paid_at: new Date().toISOString(),
      };

      const res = await this.query<any[]>('tuition_transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return res?.[0] || null;
    } catch (err) {
      console.warn('[SupabaseService] recordTuitionPayment error:', err);
      return null;
    }
  }

  // 16. QUẢN LÝ GÓI LIỆU TRÌNH & NHẬT KÝ ĐIỀU TRỊ (TREATMENT & JOURNAL FSM)
  async createUserPackage(data: {
    customerId: string;
    packageId: string;
    totalSessions: number;
    completedSessions?: number;
    status?: PackageStatus;
    expiresAt?: string;
  }): Promise<UserPackage | null> {
    try {
      const payload = {
        customer_id: data.customerId,
        package_id: data.packageId,
        total_sessions: data.totalSessions,
        completed_sessions: data.completedSessions || 0,
        status: data.status || PackageStatus.ACTIVE,
        purchased_at: new Date().toISOString(),
        expires_at: data.expiresAt || new Date(Date.now() + 180 * 86400000).toISOString(),
      };
      const res = await this.query<any[]>('user_packages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res[0]) {
        return {
          id: res[0].id,
          customerId: res[0].customer_id,
          packageId: res[0].package_id,
          totalSessions: Number(res[0].total_sessions),
          completedSessions: Number(res[0].completed_sessions || 0),
          status: res[0].status as PackageStatus,
          purchasedAt: res[0].purchased_at,
          expiresAt: res[0].expires_at,
        };
      }
      return null;
    } catch (err) {
      console.warn('[SupabaseService] createUserPackage error:', err);
      return null;
    }
  }

  async updateUserPackage(
    userPackageId: string,
    updates: {
      completedSessions?: number;
      status?: PackageStatus;
    }
  ): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.completedSessions !== undefined) payload.completed_sessions = updates.completedSessions;
      if (updates.status !== undefined) payload.status = updates.status;

      const res = await this.query<any[]>(`user_packages?id=eq.${userPackageId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return Boolean(res && res.length > 0);
    } catch (err) {
      console.warn('[SupabaseService] updateUserPackage error:', err);
      return false;
    }
  }

  async createTreatmentJournal(journal: {
    userPackageId?: string | null;
    bookingId?: string | null;
    customerId: string;
    technicianId?: string | null;
    assignedRoomId?: string | null;
    sessionNumber: number;
    sessionDate: string;
    conditionBefore?: string;
    conditionAfter?: string;
    treatmentNotes?: string;
    specialistAdvice?: string;
  }): Promise<any | null> {
    try {
      const payload = {
        user_package_id: journal.userPackageId || null,
        booking_id: journal.bookingId || null,
        customer_id: journal.customerId,
        technician_id: journal.technicianId || null,
        assigned_room_id: journal.assignedRoomId || null,
        session_number: journal.sessionNumber,
        session_date: journal.sessionDate,
        condition_before: journal.conditionBefore || '',
        condition_after: journal.conditionAfter || '',
        treatment_notes: journal.treatmentNotes || '',
        specialist_advice: journal.specialistAdvice || '',
        before_photos: [],
        after_photos: [],
      };

      const res = await this.query<any[]>('treatment_journal', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return res?.[0] || null;
    } catch (err) {
      console.warn('[SupabaseService] createTreatmentJournal error:', err);
      return null;
    }
  }

  // 17. NÂNG HẠNG THÀNH VIÊN THEO MỨC CHI TIÊU (LOYALTY FSM)
  calculateTier(totalSpent: number): MemberTier {
    if (totalSpent >= 100000000) return MemberTier.DIAMOND;
    if (totalSpent >= 50000000) return MemberTier.PLATINUM;
    if (totalSpent >= 25000000) return MemberTier.GOLD;
    if (totalSpent >= 10000000) return MemberTier.SILVER;
    return MemberTier.STANDARD;
  }

  async calculateAndUpgradeTier(userId: string, newTotalSpent: number): Promise<MemberTier> {
    const tier = this.calculateTier(newTotalSpent);
    await this.updateUser(userId, {
      total_spent: newTotalSpent,
      membership_tier: tier,
      updated_at: new Date().toISOString(),
    });
    return tier;
  }

  // 18. KHẢO SÁT LÂM SÀNG & TIẾP NHẬN TRỊ LIỆU (CONSULTATION SURVEYS)
  async getConsultationSurveys(): Promise<any[] | null> {
    try {
      const raw = await this.query<any[]>('consultation_surveys?select=*&order=created_at.desc');
      return raw || [];
    } catch (err) {
      console.warn('[SupabaseService] getConsultationSurveys error:', err);
      return [];
    }
  }

  // 19. HỆ THỐNG KIỂM TOÁN CHỐNG GIAN LẬN NỘI BỘ (AUDIT TRAIL ENGINE)
  async createAuditLog(entry: {
    tableName: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    recordId: string;
    performedBy?: string | null;
    oldData?: Record<string, any> | null;
    newData?: Record<string, any> | null;
    description?: string;
  }): Promise<AuditLog | null> {
    try {
      const payload = {
        table_name: entry.tableName,
        action: entry.action,
        record_id: isUuid(entry.recordId) ? entry.recordId : null,
        performed_by: isUuid(entry.performedBy) ? entry.performedBy : null,
        old_data: entry.oldData || null,
        new_data: entry.newData || null,
        description: entry.description || `Thao tác ${entry.action} trên bảng ${entry.tableName}`,
        created_at: new Date().toISOString(),
      };
      const res = await this.query<any[]>('audit_logs', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const row = res[0];
        return {
          id: row.id,
          tableName: row.table_name,
          action: row.action,
          recordId: row.record_id,
          performedBy: row.performed_by,
          oldData: row.old_data,
          newData: row.new_data,
          description: row.description,
          createdAt: row.created_at,
        };
      }
      return null;
    } catch (err) {
      console.warn('[SupabaseService] createAuditLog error:', err);
      return null;
    }
  }

  async getAuditLogs(tableName?: string): Promise<AuditLog[]> {
    try {
      const path = tableName
        ? `audit_logs?table_name=eq.${tableName}&order=created_at.desc&limit=50`
        : `audit_logs?order=created_at.desc&limit=50`;
      const raw = await this.query<any[]>(path);
      if (!raw || raw.length === 0) return [];
      return raw.map((r) => ({
        id: r.id,
        tableName: r.table_name,
        action: r.action,
        recordId: r.record_id,
        performedBy: r.performed_by,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        oldData: r.old_data,
        newData: r.new_data,
        description: r.description,
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.warn('[SupabaseService] getAuditLogs error:', err);
      return [];
    }
  }

  // 20. ĐỘNG CƠ TÍNH HOA HỒNG & LƯƠNG THƯỞNG KỸ THUẬT VIÊN (STAFF COMMISSION ENGINE)
  async recordStaffCommission(data: {
    staffId: string;
    branchId: string;
    bookingId?: string | null;
    invoiceId?: string | null;
    commissionType?: 'SERVICE_DIRECT' | 'PACKAGE_UPSELL' | 'CSAT_BONUS';
    baseAmount: number;
    percentage?: number;
    notes?: string;
  }): Promise<StaffCommission | null> {
    const pct = data.percentage || (data.commissionType === 'PACKAGE_UPSELL' ? 3.0 : 10.0);
    const commissionAmount = Math.round((data.baseAmount * pct) / 100);
    const now = new Date();
    const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const validBookingId = isUuid(data.bookingId) ? data.bookingId : null;
    const validStaffId = isUuid(data.staffId) ? data.staffId : 'cccccccc-0001-0001-0001-000000000001';
    const validBranchId = isUuid(data.branchId) ? data.branchId : 'aaaaaaaa-0001-0001-0001-000000000001';

    try {
      const payload = {
        staff_id: validStaffId,
        branch_id: validBranchId,
        booking_id: validBookingId,
        invoice_id: data.invoiceId || null,
        commission_type: data.commissionType || 'SERVICE_DIRECT',
        base_amount: data.baseAmount,
        percentage: pct,
        commission_amount: commissionAmount,
        status: 'APPROVED',
        cycle_month: cycleMonth,
        notes: data.notes || `Hoa hồng tự động ${pct}% từ đơn dịch vụ`,
        created_at: now.toISOString(),
      };

      const res = await this.query<any[]>('staff_commissions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });

      if (res && res.length > 0) {
        const row = res[0];
        return {
          id: row.id,
          staffId: row.staff_id,
          branchId: row.branch_id,
          bookingId: row.booking_id,
          invoiceId: row.invoice_id,
          commissionType: row.commission_type,
          baseAmount: Number(row.base_amount),
          percentage: Number(row.percentage),
          commissionAmount: Number(row.commission_amount),
          status: row.status,
          cycleMonth: row.cycle_month,
          notes: row.notes,
          createdAt: row.created_at,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] recordStaffCommission error:', err);
    }

    return null;
  }

  async getStaffCommissions(staffId?: string, cycleMonth?: string): Promise<StaffCommission[]> {
    try {
      let path = 'staff_commissions?order=created_at.desc';
      if (staffId && isUuid(staffId)) path += `&staff_id=eq.${staffId}`;
      if (cycleMonth) path += `&cycle_month=eq.${cycleMonth}`;

      const raw = await this.query<any[]>(path);
      if (raw && raw.length > 0) {
        return raw.map((r) => ({
          id: r.id,
          staffId: r.staff_id,
          branchId: r.branch_id,
          bookingId: r.booking_id,
          invoiceId: r.invoice_id,
          commissionType: r.commission_type as any,
          baseAmount: Number(r.base_amount),
          percentage: Number(r.percentage),
          commissionAmount: Number(r.commission_amount),
          status: (r.status || 'APPROVED') as any,
          cycleMonth: r.cycle_month,
          notes: r.notes,
          createdAt: r.created_at,
        }));
      }
    } catch (err) {
      console.warn('[SupabaseService] getStaffCommissions error:', err);
    }

    return [];
  }

  // 21. ĐỊNH MỨC TIÊU HAO VẬT TƯ & XUẤT KHO THEO CA (INVENTORY CONSUMPTION)
  async recordInventoryConsumption(data: {
    branchId: string;
    serviceId?: string | null;
    bookingId?: string | null;
    invoiceId?: string | null;
    technicianId?: string | null;
    materialName: string;
    quantityDeducted: number;
    unit?: string;
  }): Promise<InventoryConsumptionLog | null> {
    const validBookingId = isUuid(data.bookingId) ? data.bookingId : null;
    const validBranchId = isUuid(data.branchId) ? data.branchId : 'aaaaaaaa-0001-0001-0001-000000000001';
    const validTechId = isUuid(data.technicianId) ? data.technicianId : null;

    try {
      const payload = {
        branch_id: validBranchId,
        service_id: data.serviceId || null,
        booking_id: validBookingId,
        invoice_id: data.invoiceId || null,
        technician_id: validTechId,
        material_name: data.materialName,
        quantity_deducted: data.quantityDeducted,
        unit: data.unit || 'ml',
        logged_at: new Date().toISOString(),
      };
      const res = await this.query<any[]>('inventory_consumption_logs', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const row = res[0];
        return {
          id: row.id,
          branchId: row.branch_id,
          serviceId: row.service_id,
          bookingId: row.booking_id,
          invoiceId: row.invoice_id,
          technicianId: row.technician_id,
          materialName: row.material_name,
          quantityDeducted: Number(row.quantity_deducted),
          unit: row.unit,
          loggedAt: row.logged_at,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] recordInventoryConsumption error:', err);
    }

    return null;
  }

  // ==========================================
  // GIẤY CHỨNG NHẬN CHUẨN Y KHOA (STUDENT CERTIFICATES)
  // ==========================================
  async getStudentCertificates(): Promise<StudentCertificate[]> {
    try {
      const rows = await this.query<any[]>('student_certificates?select=*&order=issue_date.desc');
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          enrollmentId: r.enrollment_id,
          studentId: r.student_id,
          courseId: r.course_id,
          certificateCode: r.certificate_code,
          qrVerificationCode: r.qr_verification_code,
          studentName: r.student_name,
          dateOfBirth: r.date_of_birth,
          courseTitle: r.course_title,
          issueDate: r.issue_date,
          theoryScore: r.theory_score !== null ? Number(r.theory_score) : null,
          practicalScore: r.practical_score !== null ? Number(r.practical_score) : null,
          finalGrade: r.final_grade,
          certificatePdfUrl: r.certificate_pdf_url,
          qrImageUrl: r.qr_image_url,
          signerName: r.signer_name,
          signerTitle: r.signer_title,
          status: r.status,
        }));
      }
    } catch (err) {
      console.warn('[SupabaseService] getStudentCertificates error:', err);
    }
    return [];
  }

  async createStudentCertificate(data: Partial<StudentCertificate>): Promise<StudentCertificate | null> {
    const payload: any = {
      enrollment_id: isUuid(data.enrollmentId) ? data.enrollmentId : null,
      student_id: isUuid(data.studentId) ? data.studentId : null,
      course_id: isUuid(data.courseId) ? data.courseId : null,
      certificate_code: data.certificateCode || `MLD-GCN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      qr_verification_code: data.qrVerificationCode || `https://mldvietnam.vn/verify/${data.certificateCode}`,
      student_name: data.studentName,
      date_of_birth: data.dateOfBirth || null,
      course_title: data.courseTitle,
      issue_date: data.issueDate || new Date().toISOString().split('T')[0],
      theory_score: data.theoryScore ?? null,
      practical_score: data.practicalScore ?? null,
      final_grade: data.finalGrade || 'GIỎI',
      certificate_pdf_url: data.certificatePdfUrl || null,
      qr_image_url: data.qrImageUrl || null,
      signer_name: data.signerName || 'BS. CKI Trần Hoàng Nam',
      signer_title: data.signerTitle || 'Chủ Tịch Hội Đồng Y Khoa MLD',
      status: data.status || 'ISSUED',
    };

    try {
      const res = await this.query<any[]>('student_certificates', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const r = res[0];
        return {
          id: r.id,
          enrollmentId: r.enrollment_id,
          studentId: r.student_id,
          courseId: r.course_id,
          certificateCode: r.certificate_code,
          qrVerificationCode: r.qr_verification_code,
          studentName: r.student_name,
          dateOfBirth: r.date_of_birth,
          courseTitle: r.course_title,
          issueDate: r.issue_date,
          theoryScore: r.theory_score !== null ? Number(r.theory_score) : null,
          practicalScore: r.practical_score !== null ? Number(r.practical_score) : null,
          finalGrade: r.final_grade,
          certificatePdfUrl: r.certificate_pdf_url,
          qrImageUrl: r.qr_image_url,
          signerName: r.signer_name,
          signerTitle: r.signer_title,
          status: r.status,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] createStudentCertificate error:', err);
    }
    return null;
  }

  async updateStudentCertificate(id: string, updates: Partial<StudentCertificate>): Promise<StudentCertificate | null> {
    const payload: any = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.studentName !== undefined) payload.student_name = updates.studentName;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;
    if (updates.finalGrade !== undefined) payload.final_grade = updates.finalGrade;
    if (updates.signerName !== undefined) payload.signer_name = updates.signerName;
    if (updates.signerTitle !== undefined) payload.signer_title = updates.signerTitle;

    try {
      const res = await this.query<any[]>(`student_certificates?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const r = res[0];
        return {
          id: r.id,
          enrollmentId: r.enrollment_id,
          studentId: r.student_id,
          courseId: r.course_id,
          certificateCode: r.certificate_code,
          qrVerificationCode: r.qr_verification_code,
          studentName: r.student_name,
          dateOfBirth: r.date_of_birth,
          courseTitle: r.course_title,
          issueDate: r.issue_date,
          theoryScore: r.theory_score !== null ? Number(r.theory_score) : null,
          practicalScore: r.practical_score !== null ? Number(r.practical_score) : null,
          finalGrade: r.final_grade,
          certificatePdfUrl: r.certificate_pdf_url,
          qrImageUrl: r.qr_image_url,
          signerName: r.signer_name,
          signerTitle: r.signer_title,
          status: r.status,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] updateStudentCertificate error:', err);
    }
    return null;
  }

  // ==========================================
  // ĐĂNG KÝ & KIỂM TRA PHÙ LÂM SÀNG (EDEMA ASSESSMENTS)
  // ==========================================
  async getEdemaAssessments(): Promise<EdemaAssessment[]> {
    try {
      const rows = await this.query<any[]>('edema_assessments?select=*&order=assessment_date.desc,created_at.desc');
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          branchId: r.branch_id,
          examinerId: r.examiner_id,
          assessmentDate: r.assessment_date,
          timeSlot: r.time_slot,
          status: r.status,
          result: r.result,
          stageLevel: r.stage_level,
          circumferenceMeasurements: r.circumference_measurements,
          clinicalNotes: r.clinical_notes,
          certificateIssuedId: r.certificate_issued_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch (err) {
      console.warn('[SupabaseService] getEdemaAssessments error:', err);
    }
    return [];
  }

  async createEdemaAssessment(data: Partial<EdemaAssessment>): Promise<EdemaAssessment | null> {
    const payload: any = {
      customer_id: isUuid(data.customerId) ? data.customerId : null,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      branch_id: isUuid(data.branchId) ? data.branchId : 'aaaaaaaa-0001-0001-0001-000000000001',
      examiner_id: isUuid(data.examinerId) ? data.examinerId : null,
      assessment_date: data.assessmentDate || new Date().toISOString().split('T')[0],
      time_slot: data.timeSlot || '09:00 - 10:00',
      status: data.status || 'WAITING_CONFIRMATION',
      result: data.result || 'PENDING',
      stage_level: data.stageLevel || null,
      circumference_measurements: data.circumferenceMeasurements || {},
      clinical_notes: data.clinicalNotes || null,
    };

    try {
      const res = await this.query<any[]>('edema_assessments', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const r = res[0];
        return {
          id: r.id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          branchId: r.branch_id,
          examinerId: r.examiner_id,
          assessmentDate: r.assessment_date,
          timeSlot: r.time_slot,
          status: r.status,
          result: r.result,
          stageLevel: r.stage_level,
          circumferenceMeasurements: r.circumference_measurements,
          clinicalNotes: r.clinical_notes,
          certificateIssuedId: r.certificate_issued_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] createEdemaAssessment error:', err);
    }
    return null;
  }

  async updateEdemaAssessment(id: string, updates: Partial<EdemaAssessment>): Promise<EdemaAssessment | null> {
    const payload: any = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.result !== undefined) payload.result = updates.result;
    if (updates.stageLevel !== undefined) payload.stage_level = updates.stageLevel;
    if (updates.circumferenceMeasurements !== undefined) payload.circumference_measurements = updates.circumferenceMeasurements;
    if (updates.clinicalNotes !== undefined) payload.clinical_notes = updates.clinicalNotes;
    if (updates.certificateIssuedId !== undefined) payload.certificate_issued_id = updates.certificateIssuedId;

    try {
      const res = await this.query<any[]>(`edema_assessments?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (res && res.length > 0) {
        const r = res[0];
        return {
          id: r.id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          branchId: r.branch_id,
          examinerId: r.examiner_id,
          assessmentDate: r.assessment_date,
          timeSlot: r.time_slot,
          status: r.status,
          result: r.result,
          stageLevel: r.stage_level,
          circumferenceMeasurements: r.circumference_measurements,
          clinicalNotes: r.clinical_notes,
          certificateIssuedId: r.certificate_issued_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] updateEdemaAssessment error:', err);
    }
    return null;
  }

  // --- Thời khóa biểu buổi học (Batch Schedules) ---
  public async getBatchSchedules(batchId: string): Promise<BatchSchedule[]> {
    if (!batchId || !isUuid(batchId)) return [];
    try {
      const res = await this.query<any[]>(
        `batch_schedules?batch_id=eq.${batchId}&order=session_date.asc,start_time.asc`
      );
      if (Array.isArray(res)) {
        return res.map((r) => ({
          id: r.id,
          batchId: r.batch_id,
          assignedRoomId: r.assigned_room_id,
          sessionDate: r.session_date,
          startTime: (r.start_time || '').slice(0, 5),
          endTime: (r.end_time || '').slice(0, 5),
          topic: r.topic,
          isPracticeLab: Boolean(r.is_practice_lab),
        }));
      }
    } catch (err) {
      console.warn('[SupabaseService] getBatchSchedules error:', err);
    }
    return [];
  }

  public async seedBatchSchedules(batchId: string, startDateStr?: string): Promise<BatchSchedule[]> {
    if (!batchId || !isUuid(batchId)) return [];
    const baseDate = startDateStr ? new Date(startDateStr) : new Date();
    const curriculumTopics = [
      { topic: 'Buổi 1: Nhập môn & Giải phẫu hệ bạch huyết Vodder chuẩn Y khoa', lab: false },
      { topic: 'Buổi 2: Kỹ thuật thao tác dẫn lưu mặt & cổ (Thực hành Vodder)', lab: true },
      { topic: 'Buổi 3: Dẫn lưu hạch nách & kỹ thuật mở đường bạch huyết chi trên', lab: true },
      { topic: 'Buổi 4: Dẫn lưu hạch bẹn & phác đồ giảm phù nề chi dưới (Lab)', lab: true },
      { topic: 'Buổi 5: Dẫn lưu ổ bụng sâu & phục hồi phù nề sau phẫu thuật', lab: true },
      { topic: 'Buổi 6: Phác đồ cá nhân hóa, chỉ định & chống chỉ định y khoa', lab: false },
      { topic: 'Buổi 7: Thực hành lâm sàng toàn thân trên người mẫu thật', lab: true },
      { topic: 'Buổi 8: Thi sát hạch tay nghề lâm sàng & đánh giá chứng chỉ', lab: true },
    ];

    const records = curriculumTopics.map((item, idx) => {
      const sessionDate = new Date(baseDate.getTime() + idx * 3 * 86400000);
      const dateStr = sessionDate.toISOString().split('T')[0];
      return {
        batch_id: batchId,
        session_date: dateStr,
        start_time: '13:30:00',
        end_time: '17:00:00',
        topic: item.topic,
        is_practice_lab: item.lab,
      };
    });

    try {
      const res = await this.query<any[]>('batch_schedules', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(records),
      });
      if (Array.isArray(res)) {
        return res.map((r) => ({
          id: r.id,
          batchId: r.batch_id,
          assignedRoomId: r.assigned_room_id,
          sessionDate: r.session_date,
          startTime: (r.start_time || '').slice(0, 5),
          endTime: (r.end_time || '').slice(0, 5),
          topic: r.topic,
          isPracticeLab: Boolean(r.is_practice_lab),
        }));
      }
    } catch (err) {
      console.warn('[SupabaseService] seedBatchSchedules error:', err);
    }
    return this.getBatchSchedules(batchId);
  }

  // --- Điểm danh học viên (Student Attendance) ---
  public async getAttendanceForSchedules(scheduleIds: string[]): Promise<StudentAttendance[]> {
    if (!scheduleIds || scheduleIds.length === 0) return [];
    const validIds = scheduleIds.filter(isUuid);
    if (validIds.length === 0) return [];

    try {
      const res = await this.query<any[]>(
        `student_attendance?schedule_id=in.(${validIds.join(',')})`
      );
      if (Array.isArray(res)) {
        return res.map((r) => ({
          id: r.id,
          scheduleId: r.schedule_id,
          enrollmentId: r.enrollment_id,
          status: r.status as AttendanceStatus,
          checkInTime: r.check_in_time,
          notes: r.notes,
          markedById: r.marked_by_id,
        }));
      }
    } catch (err) {
      console.warn('[SupabaseService] getAttendanceForSchedules error:', err);
    }
    return [];
  }

  public async saveBatchAttendance(
    records: Array<{
      scheduleId: string;
      enrollmentId: string;
      status: AttendanceStatus | string;
      notes?: string;
    }>
  ): Promise<boolean> {
    if (!records || records.length === 0) return false;

    try {
      const rows = records.map((rec) => ({
        schedule_id: rec.scheduleId,
        enrollment_id: rec.enrollmentId,
        status: rec.status,
        check_in_time: new Date().toISOString(),
        notes: rec.notes || null,
      }));

      // Supabase POST with resolution=merge-duplicates on uq_attendance (schedule_id, enrollment_id)
      const res = await this.query<any[]>('student_attendance', {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(rows),
      });

      return Boolean(res);
    } catch (err) {
      console.warn('[SupabaseService] saveBatchAttendance error:', err);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService(SUPABASE_URL, SUPABASE_ANON_KEY);
