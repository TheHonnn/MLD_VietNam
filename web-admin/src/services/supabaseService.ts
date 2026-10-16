import {
  Branch,
  BranchRoom,
  User,
  Service,
  Technician,
  Course,
  TreatmentPackage,
  MemberTier,
  UserPackage,
  TreatmentJournal,
  Booking,
  Invoice,
  CourseBatch,
  CourseEnrollment,
  TuitionTransaction,
} from '../types/shared_types';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

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
            validityMonths: Number(p.package.validity_months || 6),
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
    let path = `bookings?select=*&order=booking_date.desc,start_time.asc`;
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
    }));
  }

  // 11. HÓA ĐƠN THU NGÂN (INVOICES)
  async getInvoices(branchId?: string, customerId?: string): Promise<Invoice[] | null> {
    let path = `invoices?select=*&order=paid_at.desc`;
    if (branchId) path += `&branch_id=eq.${branchId}`;
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
    }));
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
}

export const supabaseService = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);
