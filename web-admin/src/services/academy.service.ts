import {
  Course,
  CourseChapter,
  CourseLesson,
  CourseBatch,
  CourseEnrollment,
  TuitionTransaction,
  StudentCertificate,
  Instructor,
  CourseLevel,
  EnrollmentStatus,
  CertificateStatus,
  ApiResponse,
  EdemaAssessment,
  EdemaAssessmentStatus,
  EdemaAssessmentResult,
  ConsultationStatus,
  PaymentVerificationStatus,
  StudentAdmissionStatus,
  PaymentMethod,
  PaymentStatus,
  BatchSchedule,
  StudentAttendance,
  AttendanceStatus,
} from '../types/shared_types';

import { supabaseService } from './supabaseService';
import { posService } from './pos.service';
import { legacyRead, legacyWrite } from './adminAdapter';
import { commissionService } from './commission.service';
import { apiClient } from './apiClient';

export const academyService = {
  // --- Khóa học LMS ---
  async getCourses(params?: {
    search?: string;
    level?: CourseLevel;
  }): Promise<ApiResponse<Course[]>> {
    try {
      const live = await supabaseService.getCourses();
      let result = live || [];
      if (params?.level) {
        result = result.filter((c) => c.level === params.level);
      }
      if (params?.search) {
        const kw = params.search.toLowerCase();
        result = result.filter(
          (c) =>
            c.title.toLowerCase().includes(kw) ||
            c.code.toLowerCase().includes(kw)
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[academyService] getCourses failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn khóa học từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getCourseById(id: string): Promise<ApiResponse<Course | undefined>> {
    try {
      const live = await supabaseService.getCourses();
      const found = live?.find((c) => c.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[academyService] getCourseById failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tìm khóa học từ Supabase',
        data: undefined,
      };
    }
  },

  // --- Chương học (Chapters) ---
  async getCourseChapters(courseId?: string): Promise<ApiResponse<CourseChapter[]>> {
    try {
      const live = await supabaseService.getCourseChapters(courseId);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu chương học từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getCourseChapters failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn chương học từ Supabase Cloud',
        data: [],
      };
    }
  },

  // --- Bài học (Lessons) ---
  async getCourseLessons(chapterId?: string): Promise<ApiResponse<CourseLesson[]>> {
    try {
      const live = await supabaseService.getCourseLessons(chapterId);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu bài học từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getCourseLessons failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn bài học từ Supabase Cloud',
        data: [],
      };
    }
  },

  // --- Lớp học / Khóa học (Batches) ---
  async getCourseBatches(courseId?: string): Promise<ApiResponse<CourseBatch[]>> {
    try {
      const live = await supabaseService.getCourseBatches(courseId);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu lớp học từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getCourseBatches failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn lớp học từ Supabase Cloud',
        data: [],
      };
    }
  },

  async createCourseBatch(data: {
    courseId: string;
    branchId?: string;
    batchCode: string;
    instructorId?: string | null;
    startDate?: string;
    endDate?: string;
    scheduleText?: string;
    maxStudents?: number;
    status?: string;
  }): Promise<ApiResponse<CourseBatch | null>> {
    try {
      const created = await supabaseService.createCourseBatch(data);
      return {
        success: Boolean(created),
        statusCode: created ? 201 : 400,
        message: created ? 'Đã khởi tạo lớp đào tạo mới thành công' : 'Không thể khởi tạo lớp',
        data: created,
      };
    } catch (err) {
      console.error('[academyService] createCourseBatch failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tạo lớp đào tạo',
        data: null,
      };
    }
  },

  async updateCourseBatch(
    batchId: string,
    updates: {
      instructorId?: string | null;
      scheduleText?: string | null;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.updateCourseBatch(batchId, updates);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Cập nhật phân công lớp học thành công' : 'Lỗi cập nhật lớp học',
        data: ok,
      };
    } catch (err) {
      console.error('[academyService] updateCourseBatch failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi máy chủ khi cập nhật lớp học',
        data: false,
      };
    }
  },

  async assignInstructorToBatch(
    batchId: string,
    instructorId: string | null,
    scheduleText?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.assignInstructorToBatch(batchId, instructorId, scheduleText);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Phân công lớp thành công' : 'Lỗi khi phân công lớp',
        data: ok,
      };
    } catch (err) {
      console.error('[academyService] assignInstructorToBatch failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi máy chủ khi phân công lớp',
        data: false,
      };
    }
  },

  // --- Tuyển sinh & Ghi danh (Enrollment) ---
  async getEnrollments(params?: {
    status?: EnrollmentStatus;
    batchId?: string;
    search?: string;
  }): Promise<ApiResponse<CourseEnrollment[]>> {
    try {
      const live = await supabaseService.getEnrollments(params?.batchId);
      let result = live || [];
      if (params?.status) {
        result = result.filter((e) => e.status === params.status);
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu ghi danh học viên từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[academyService] getEnrollments failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn hồ sơ học viên từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getEnrollmentById(id: string): Promise<ApiResponse<CourseEnrollment | undefined>> {
    try {
      const live = await supabaseService.getEnrollments();
      const found = live?.find((e) => e.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Hồ sơ học viên từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[academyService] getEnrollmentById failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tìm hồ sơ học viên từ Supabase',
        data: undefined,
      };
    }
  },
  async createEnrollment(data: {
    studentId: string;
    courseId: string;
    batchId?: string | null;
    status?: EnrollmentStatus;
    tuitionTotal?: number;
    amountPaid?: number;
    studentName?: string;
    studentPhone?: string;
    studentEmail?: string;
  }): Promise<ApiResponse<CourseEnrollment>> {
    try {
      const created = await supabaseService.createEnrollment(data);
      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Tạo hồ sơ tuyển sinh thành công trên Supabase Cloud',
          data: created,
        };
      }
    } catch (err) {
      console.error('[academyService] createEnrollment error:', err);
    }
    return legacyWrite<CourseEnrollment>('course_enrollments', data);
  },

  async updateEnrollmentStatus(
    id: string,
    status: EnrollmentStatus,
    extraUpdates?: {
      amountPaid?: number;
      batchId?: string | null;
      approvalStatus?: string;
      approvedBy?: string;
      approvedAt?: string;
      approvalNotes?: string;
    }
  ): Promise<ApiResponse<CourseEnrollment>> {
    try {
      const ok = await supabaseService.updateEnrollment(id, { status, ...extraUpdates });
      if (ok) {
        const live = await supabaseService.getEnrollments();
        const updated = live?.find((e) => e.id === id);
        if (updated) {
          return {
            success: true,
            statusCode: 200,
            message: 'Cập nhật trạng thái học viên thành công trên Supabase Cloud',
            data: updated,
          };
        }
      }
    } catch (err) {
      console.error('[academyService] updateEnrollmentStatus error:', err);
    }
    return legacyWrite<CourseEnrollment>('course_enrollments', { status, ...extraUpdates }, id);
  },

  /**
   * Admin gia hạn thời gian học (+N tháng) cho học viên
   */
  async extendEnrollment(
    enrollmentId: string,
    extensionMonths: number,
    reason: string
  ): Promise<ApiResponse<{ newValidUntil?: string }>> {
    try {
      const res = await supabaseService.extendEnrollment(enrollmentId, extensionMonths, reason);
      return {
        success: res.success,
        statusCode: res.success ? 200 : 400,
        message: res.message,
        data: { newValidUntil: res.newValidUntil },
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err.message || 'Lỗi khi gia hạn học viên',
        data: {},
      };
    }
  },

  /**
   * Quét kiểm tra học viên hết hạn 365 ngày (Trigger cron thủ công từ Admin)
   */
  async sweepExpiredEnrollments(): Promise<ApiResponse<{ expiredCount: number; expiringSoonCount: number; activeCount: number }>> {
    try {
      const res = await supabaseService.sweepExpiredEnrollments();
      return {
        success: true,
        statusCode: 200,
        message: `Đã quét hoàn tất: ${res.expiredCount} học viên hết hạn (EXPIRED), ${res.expiringSoonCount} học viên sắp hết hạn (<=30 ngày), ${res.activeCount} học viên đang hoạt động.`,
        data: res,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err.message || 'Lỗi quét hết hạn',
        data: { expiredCount: 0, expiringSoonCount: 0, activeCount: 0 },
      };
    }
  },

  /**
   * Tự động kiểm tra đối soát tiền về qua ngân hàng theo mã khách hàng
   */
  async checkEnrollmentPayment(enrollmentId: string): Promise<ApiResponse<{
    isPaid: boolean;
    approved: boolean;
    amountPaid?: number;
    tuitionTotal?: number;
    customerCode?: string;
  }>> {
    try {
      return await apiClient.get(`/academy/enrollments/${enrollmentId}/check-payment`);
    } catch (error: any) {
      return {
        success: false,
        statusCode: error?.statusCode || 503,
        message: 'Không kết nối được dịch vụ đối soát. Không thay đổi trạng thái hồ sơ để tránh duyệt nhầm.',
        data: { isPaid: false, approved: false },
      };
    }
  },

  /**
   * Admin duyệt học viên & thu tiền tại quầy
   */
  async approveEnrollment(
    enrollmentId: string,
    options?: { adminUser?: string; amountPaid?: number; notes?: string }
  ): Promise<ApiResponse<CourseEnrollment | null>> {
    try {
      const enrollments = await supabaseService.getEnrollments();
      const enr = enrollments?.find((e) => e.id === enrollmentId);
      if (!enr) return { success: false, statusCode: 404, message: 'Không tìm thấy hồ sơ', data: null };
      await apiClient.post(`/academy/enrollments/${enrollmentId}/approve`, {
        amountPaid: options?.amountPaid ?? enr.amountPaid,
        notes: options?.notes,
      });

      const updated = (await supabaseService.getEnrollments())?.find((e) => e.id === enrollmentId);
      return {
        success: true,
        statusCode: 200,
        message: 'Đã duyệt nhập học. Hồ sơ đã chuyển sang chờ xếp lớp.',
        data: updated || null,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi khi duyệt học viên',
        data: null,
      };
    }
  },

  async graduateEnrollment(enrollmentId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/academy/enrollments/${enrollmentId}/graduate`, {});
  },

  /**
   * Phân công nhân viên phụ trách tư vấn
   */
  async assignStaffToEnrollment(enrollmentId: string, staffId: string | null): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.updateEnrollment(enrollmentId, { assignedStaffId: staffId });
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Đã phân công nhân viên phụ trách tư vấn' : 'Không thể phân công nhân viên',
        data: ok,
      };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err?.message || 'Lỗi phân công nhân viên', data: false };
    }
  },

  /**
   * Cập nhật trạng thái tư vấn và lưu lịch sử ghi chú
   */
  async updateConsultationStatus(
    enrollmentId: string,
    status: ConsultationStatus,
    note?: string,
    authorName?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const live = await supabaseService.getEnrollments();
      const current = live?.find((e) => e.id === enrollmentId);
      const history = [...(current?.consultationHistory || [])];
      if (note && note.trim()) {
        history.push({
          timestamp: new Date().toISOString(),
          author: authorName || 'Nhân viên tư vấn',
          note: note.trim(),
        });
      }
      const ok = await supabaseService.updateEnrollment(enrollmentId, {
        consultationStatus: status,
        consultationHistory: history,
      });
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Cập nhật trạng thái tư vấn thành công' : 'Không thể cập nhật tư vấn',
        data: ok,
      };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err?.message || 'Lỗi cập nhật tư vấn', data: false };
    }
  },

  /**
   * Chốt tư vấn: chốt học phí và cơ sở đào tạo, tạo yêu cầu thanh toán
   */
  async finalizeConsultation(
    enrollmentId: string,
    data: {
      finalTuition: number;
      branchName?: string;
      note?: string;
      authorName?: string;
    }
  ): Promise<ApiResponse<boolean>> {
    try {
      const result = await apiClient.post<any>(`/academy/enrollments/${enrollmentId}/finalize-consultation`, {
        finalTuition: data.finalTuition,
        branchName: data.branchName,
        note: data.note,
      });

      return {
        success: result.success,
        statusCode: result.statusCode || 200,
        message: result.message,
        data: result.success,
      };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err?.message || 'Lỗi chốt tư vấn', data: false };
    }
  },

  /**
   * Xác nhận thanh toán (tự động hoặc thủ công)
   */
  async confirmPayment(
    enrollmentId: string,
    amount: number,
    options?: {
      authorName?: string;
      notes?: string;
      paymentMethod?: PaymentMethod;
    }
  ): Promise<ApiResponse<boolean>> {
    try {
      // Không cho trình duyệt tự tạo số tiền đã thu. Nút thủ công chỉ yêu cầu
      // backend đối soát lại các invoice/tuition_transaction đã tồn tại.
      const reconciliation = await this.checkEnrollmentPayment(enrollmentId);
      const ok = reconciliation.success && Number(reconciliation.data?.amountPaid || 0) > 0;
      return {
        success: ok,
        statusCode: reconciliation.statusCode,
        message: reconciliation.message,
        data: ok,
      };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err?.message || 'Lỗi xác nhận thanh toán', data: false };
    }
  },

  /**
   * Xếp lớp cho học viên đã duyệt: kiểm tra khóa học, cơ sở và sức chứa
   */
  async assignBatchToStudent(
    enrollmentId: string,
    batchId: string,
    authorName?: string,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const [enrollments, batches] = await Promise.all([
        supabaseService.getEnrollments(),
        supabaseService.getCourseBatches(),
      ]);

      const enr = enrollments?.find((e) => e.id === enrollmentId);
      const batch = batches?.find((b) => b.id === batchId);

      if (!enr || !batch) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy hồ sơ hoặc lớp học', data: { success: false, message: 'Dữ liệu không hợp lệ' } };
      }

      if (enr.approvalStatus !== 'APPROVED' || ![StudentAdmissionStatus.APPROVED, StudentAdmissionStatus.ENROLLED].includes(enr.studentAdmissionStatus as StudentAdmissionStatus)) {
        return {
          success: false,
          statusCode: 409,
          message: 'Hồ sơ phải được admin duyệt nhập học trước khi xếp lớp.',
          data: { success: false, message: 'Hồ sơ chưa được duyệt' },
        };
      }

      // 1. Kiểm tra khóa học khớp
      if (enr.courseId !== batch.courseId) {
        return {
          success: false,
          statusCode: 400,
          message: 'Lớp học không thuộc khóa học mà học viên đã đăng ký!',
          data: { success: false, message: 'Sai khóa học' },
        };
      }

      // 2. Kiểm tra sức chứa lớp
      if (enr.batchId !== batchId && batch.maxStudents && batch.enrolledCount >= batch.maxStudents) {
        return {
          success: false,
          statusCode: 400,
          message: `Lớp ${batch.batchCode} đã đạt sức chứa tối đa (${batch.enrolledCount}/${batch.maxStudents} học viên). Vui lòng chọn lớp khác!`,
          data: { success: false, message: 'Lớp đã đầy sĩ số' },
        };
      }

      const result = await apiClient.post<any>(`/academy/enrollments/${enrollmentId}/assign-batch`, { batchId, reason });

      return {
        success: result.success,
        statusCode: result.statusCode || 200,
        message: result.message || `Đã xếp học viên vào lớp ${batch.batchCode} thành công!`,
        data: { success: result.success, message: result.message || 'Xếp lớp thành công' },
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi hệ thống khi xếp lớp',
        data: { success: false, message: err?.message || 'Lỗi' },
      };
    }
  },

  // --- Giao dịch học phí ---
  async getTuitionTransactions(enrollmentId?: string): Promise<ApiResponse<TuitionTransaction[]>> {
    try {
      const live = await supabaseService.getTuitionTransactions(enrollmentId);
      if (live === null) throw new Error('Không tải được giao dịch học phí.');
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu giao dịch học phí từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getTuitionTransactions failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn học phí từ Supabase',
        data: [],
      };
    }
  },

  async recordTuitionPayment(
    data: any
  ): Promise<ApiResponse<TuitionTransaction>> {
    try {
      const shiftRes = await posService.getActiveShift(data.branchId);
      if (!shiftRes.success || !shiftRes.data?.id) {
        return {
          success: false,
          statusCode: 409,
          message: 'Vui lòng mở ca thu ngân tại chi nhánh trước khi ghi nhận đóng học phí.',
          data: {} as TuitionTransaction,
        };
      }
      const collectRes = await posService.collectPayment({
        kind: 'TUITION',
        enrollmentId: data.enrollmentId,
        amount: Number(data.amount),
        shiftId: data.shiftId || shiftRes.data.id,
        branchId: data.branchId || shiftRes.data.branchId,
        paymentMethod: data.paymentMethod || PaymentMethod.BANK_TRANSFER,
        notes: data.notes || 'Thanh toán học phí khóa học',
      });
      if (collectRes.success && collectRes.data) {
        return {
          success: true,
          statusCode: 201,
          message: 'Ghi nhận đóng học phí thành công qua POS',
          data: (collectRes.data.transaction || collectRes.data) as TuitionTransaction,
        };
      }
      return {
        success: false,
        statusCode: collectRes.statusCode || 400,
        message: collectRes.message || 'Không thể ghi nhận học phí.',
        data: {} as TuitionTransaction,
      };
    } catch (err: any) {
      console.error('[academyService] recordTuitionPayment error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi ghi nhận học phí qua POS',
        data: {} as TuitionTransaction,
      };
    }
  },

  // --- Giấy chứng nhận Chuẩn Y khoa (Student Certificates) ---
  async getCertificates(params?: {
    status?: CertificateStatus;
    search?: string;
  }): Promise<ApiResponse<StudentCertificate[]>> {
    try {
      const live = await supabaseService.getStudentCertificates();
      let res = live || [];
      if (params?.status) {
        res = res.filter((c) => c.status === params.status);
      }
      if (params?.search) {
        const kw = params.search.toLowerCase();
        res = res.filter(
          (c) =>
            c.studentName.toLowerCase().includes(kw) ||
            c.certificateCode.toLowerCase().includes(kw) ||
            c.courseTitle.toLowerCase().includes(kw)
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu Giấy chứng nhận từ Supabase Cloud',
        data: res,
      };
    } catch (err) {
      console.error('[academyService] getCertificates failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn Giấy chứng nhận từ Supabase',
        data: [],
      };
    }
  },

  async issueCertificate(
    data: Partial<StudentCertificate>
  ): Promise<ApiResponse<StudentCertificate>> {
    try {
      const created = await supabaseService.createStudentCertificate(data);
      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Cấp Giấy chứng nhận thành công trên Supabase Cloud',
          data: created,
        };
      }
    } catch (err) {
      console.error('[academyService] issueCertificate failed:', err);
    }
    return legacyWrite<StudentCertificate>('student_certificates', data);
  },

  async revokeCertificate(
    id: string,
    reason?: string
  ): Promise<ApiResponse<StudentCertificate | null>> {
    try {
      const updated = await supabaseService.updateStudentCertificate(id, {
        status: CertificateStatus.REVOKED,
      });
      if (updated) {
        return {
          success: true,
          statusCode: 200,
          message: 'Thu hồi Giấy chứng nhận thành công trên Supabase Cloud',
          data: updated,
        };
      }
    } catch (err) {
      console.error('[academyService] revokeCertificate error:', err);
    }
    return {
      success: false,
      statusCode: 500,
      message: 'Lỗi khi thu hồi Giấy chứng nhận',
      data: null,
    };
  },

  // --- Đăng ký & Kiểm tra phù bạch huyết lâm sàng (Edema Assessments) ---
  async getEdemaAssessments(params?: {
    status?: EdemaAssessmentStatus;
    search?: string;
  }): Promise<ApiResponse<EdemaAssessment[]>> {
    try {
      const live = await supabaseService.getEdemaAssessments();
      let res = live || [];
      if (params?.status) {
        res = res.filter((item) => item.status === params.status);
      }
      if (params?.search) {
        const kw = params.search.toLowerCase();
        res = res.filter(
          (item) =>
            item.customerName.toLowerCase().includes(kw) ||
            item.customerPhone.includes(kw)
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu đăng ký khám phù từ Supabase Cloud',
        data: res,
      };
    } catch (err) {
      console.error('[academyService] getEdemaAssessments failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn khám phù lâm sàng',
        data: [],
      };
    }
  },

  async createEdemaAssessment(
    data: Partial<EdemaAssessment>
  ): Promise<ApiResponse<EdemaAssessment>> {
    try {
      const created = await supabaseService.createEdemaAssessment(data);
      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Đăng ký lịch khám phù lâm sàng thành công',
          data: created,
        };
      }
    } catch (err) {
      console.error('[academyService] createEdemaAssessment error:', err);
    }
    return legacyWrite<EdemaAssessment>('edema_assessments', data);
  },

  async updateEdemaAssessment(
    id: string,
    updates: Partial<EdemaAssessment>
  ): Promise<ApiResponse<EdemaAssessment | null>> {
    try {
      const updated = await supabaseService.updateEdemaAssessment(id, updates);
      if (updated) {
        return {
          success: true,
          statusCode: 200,
          message: 'Cập nhật phiếu kiểm tra phù thành công',
          data: updated,
        };
      }
    } catch (err) {
      console.error('[academyService] updateEdemaAssessment error:', err);
    }
    return {
      success: false,
      statusCode: 500,
      message: 'Lỗi cập nhật phiếu kiểm tra phù',
      data: null,
    };
  },

  // --- Đội ngũ giảng viên (Instructors) ---
  async getInstructors(): Promise<ApiResponse<Instructor[]>> {
    try {
      const live = await supabaseService.getInstructors();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu giảng viên từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getInstructors error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn giảng viên từ Supabase',
        data: [],
      };
    }
  },

  async createInstructor(data: any): Promise<ApiResponse<Instructor>> {
    try {
      const created = await supabaseService.createInstructor(data);
      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Tạo hồ sơ giảng viên thành công trên Supabase Cloud',
          data: created,
        };
      }
    } catch (err) {
      console.error('[academyService] createInstructor error:', err);
    }
    return legacyWrite<Instructor>('instructors', data);
  },

  // --- Thời khóa biểu buổi học (Batch Schedules) ---
  async getBatchSchedules(batchId: string): Promise<ApiResponse<BatchSchedule[]>> {
    try {
      const live = await supabaseService.getBatchSchedules(batchId);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu thời khóa biểu lớp học từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getBatchSchedules error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn thời khóa biểu lớp học',
        data: [],
      };
    }
  },

  async getAllBatchSchedules(): Promise<ApiResponse<BatchSchedule[]>> {
    try {
      const live = await supabaseService.getAllBatchSchedules();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu thời khóa biểu toàn viện từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getAllBatchSchedules error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn thời khóa biểu',
        data: [],
      };
    }
  },

  async createBatchSchedule(data: {
    batchId: string;
    assignedRoomId?: string | null;
    sessionDate: string;
    startTime: string;
    endTime: string;
    topic: string;
    isPracticeLab?: boolean;
  }): Promise<ApiResponse<BatchSchedule | null>> {
    try {
      const created = await supabaseService.createBatchSchedule(data);
      return {
        success: Boolean(created),
        statusCode: created ? 201 : 400,
        message: created ? 'Đã xếp lịch thực hành thành công' : 'Không thể lưu lịch thực hành',
        data: created,
      };
    } catch (err) {
      console.error('[academyService] createBatchSchedule error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xếp lịch thực hành',
        data: null,
      };
    }
  },

  async updateBatchSchedule(
    scheduleId: string,
    data: Partial<{
      batchId: string;
      assignedRoomId: string | null;
      sessionDate: string;
      startTime: string;
      endTime: string;
      topic: string;
      isPracticeLab: boolean;
    }>
  ): Promise<ApiResponse<BatchSchedule | null>> {
    try {
      const updated = await supabaseService.updateBatchSchedule(scheduleId, data);
      return {
        success: Boolean(updated),
        statusCode: updated ? 200 : 400,
        message: updated ? 'Đã cập nhật lịch thực hành thành công' : 'Không thể cập nhật lịch thực hành',
        data: updated,
      };
    } catch (err) {
      console.error('[academyService] updateBatchSchedule error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi khi cập nhật lịch thực hành', data: null };
    }
  },

  async seedBatchSchedules(batchId: string, startDate?: string, scheduleText?: string): Promise<ApiResponse<BatchSchedule[]>> {
    try {
      const seeded = await supabaseService.seedBatchSchedules(batchId, startDate, scheduleText);
      return {
        success: true,
        statusCode: 201,
        message: 'Đã tạo 8 buổi học chuẩn phác đồ Vodder cho lớp học thành công',
        data: seeded || [],
      };
    } catch (err) {
      console.error('[academyService] seedBatchSchedules error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khởi tạo thời khóa biểu lớp học',
        data: [],
      };
    }
  },

  // --- Điểm danh học viên theo buổi (Student Attendance) ---
  async getAttendanceForSchedules(scheduleIds: string[]): Promise<ApiResponse<StudentAttendance[]>> {
    try {
      const live = await supabaseService.getAttendanceForSchedules(scheduleIds);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu điểm danh lớp học từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[academyService] getAttendanceForSchedules error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn điểm danh lớp học',
        data: [],
      };
    }
  },

  async saveBatchAttendance(
    records: Array<{
      scheduleId: string;
      enrollmentId: string;
      status: AttendanceStatus | string;
      notes?: string;
    }>
  ): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.saveBatchAttendance(records);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Lưu điểm danh thành công lên Supabase Cloud' : 'Không thể lưu điểm danh',
        data: ok,
      };
    } catch (err) {
      console.error('[academyService] saveBatchAttendance error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi lưu điểm danh',
        data: false,
      };
    }
  },
};
