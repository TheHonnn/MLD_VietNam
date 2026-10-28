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
import { legacyRead, legacyWrite } from './adminAdapter';

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
      scheduleText?: string;
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
      // 1. Thử gọi backend API
      const apiBase = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');
      const res = await fetch(`${apiBase}/academy/enrollments/${enrollmentId}/check-payment`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (_) {}

    // 2. Fallback trực tiếp qua Supabase
    try {
      const enrollments = await supabaseService.getEnrollments();
      const enr = enrollments?.find((e) => e.id === enrollmentId);
      if (!enr) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy hồ sơ', data: { isPaid: false, approved: false } };
      }

      if (enr.approvalStatus === 'APPROVED' && (enr.amountPaid || 0) > 0) {
        return {
          success: true,
          statusCode: 200,
          message: 'Học viên đã được duyệt và xác nhận thanh toán!',
          data: { isPaid: true, approved: true, amountPaid: enr.amountPaid, tuitionTotal: enr.tuitionTotal },
        };
      }

      const notesCode = enr.approvalNotes?.match(/Mã KH:\s*([A-Za-z0-9_-]+)/)?.[1] || '';
      const customerCode = (notesCode || `HV-${enr.id.slice(-4)}`).toUpperCase();
      const phoneDigits = (enr.studentPhone || '').replace(/\D/g, '');

      // Check invoices
      const invoices = await supabaseService.getInvoices();
      let matchedAmount = 0;
      if (invoices && invoices.length > 0) {
        for (const inv of invoices) {
          const invCode = String(inv.invoiceCode || '').toUpperCase();
          if (
            (customerCode && invCode.includes(customerCode)) ||
            (phoneDigits && phoneDigits.length >= 7 && invCode.includes(phoneDigits))
          ) {
            matchedAmount = Number(inv.totalAmount || 0);
            break;
          }
        }
      }

      if (matchedAmount === 0) {
        const txList = await supabaseService.getTuitionTransactions(enrollmentId);
        if (txList && txList.length > 0) {
          matchedAmount = txList
            .filter((t) => t.paymentStatus === 'PAID')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        }
      }

      if (matchedAmount > 0) {
        await supabaseService.updateEnrollment(enrollmentId, {
          status: EnrollmentStatus.ENROLLED,
          approvalStatus: 'APPROVED',
          studentAdmissionStatus: StudentAdmissionStatus.APPROVED,
          paymentVerificationStatus: PaymentVerificationStatus.PAID,
          consultationStatus: ConsultationStatus.CONFIRMED,
          amountPaid: matchedAmount,
          approvedAt: new Date().toISOString(),
          approvedBy: 'HỆ THỐNG TỰ ĐỘNG',
          approvalNotes: `Đã tự động duyệt: Nhận thanh toán ${matchedAmount.toLocaleString('vi-VN')}đ khớp mã KH ${customerCode}`,
        });

        // Tự động tạo bản ghi tuition_transactions để ghi nhận doanh thu
        try {
          await supabaseService.recordTuitionPayment({
            transactionCode: `TT-${customerCode}-${Date.now().toString().slice(-4)}`,
            enrollmentId,
            studentId: enr.studentId,
            courseId: enr.courseId,
            branchId: enr.batchId || 'aaaaaaaa-0001-0001-0001-000000000001',
            amount: matchedAmount,
            paymentMethod: 'BANK_TRANSFER' as any,
            paymentStatus: 'PAID' as any,
            notes: `Tự động đối soát ngân hàng khớp mã KH ${customerCode}`,
          });
        } catch (_) {}

        return {
          success: true,
          statusCode: 200,
          message: `Xác nhận khớp mã KH ${customerCode} & số tiền ${matchedAmount.toLocaleString('vi-VN')}đ! Đã tự động duyệt học viên vào khóa học.`,
          data: { isPaid: true, approved: true, amountPaid: matchedAmount, tuitionTotal: enr.tuitionTotal, customerCode },
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: `Hệ thống chưa nhận được tiền từ ngân hàng cho mã khách hàng "${customerCode}".`,
        data: { isPaid: false, approved: false, customerCode, tuitionTotal: enr.tuitionTotal },
      };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err?.message || 'Lỗi kiểm tra thanh toán', data: { isPaid: false, approved: false } };
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
      const finalPaid = options?.amountPaid !== undefined ? options.amountPaid : (enr?.tuitionTotal || 9000000);

      await supabaseService.updateEnrollment(enrollmentId, {
        status: EnrollmentStatus.ENROLLED,
        approvalStatus: 'APPROVED',
        studentAdmissionStatus: StudentAdmissionStatus.APPROVED,
        paymentVerificationStatus: PaymentVerificationStatus.PAID,
        consultationStatus: ConsultationStatus.CONFIRMED,
        amountPaid: finalPaid,
        approvedAt: new Date().toISOString(),
        approvedBy: options?.adminUser || 'Admin Tuyển Sinh',
        approvalNotes: options?.notes || `Admin duyệt tại quầy, thu ${finalPaid.toLocaleString('vi-VN')}đ`,
      });

      // Tự động ghi nhận giao dịch vào bảng tuition_transactions để hiển thị tức thì trên Dashboard doanh thu
      if (finalPaid > 0 && enr) {
        try {
          await supabaseService.recordTuitionPayment({
            transactionCode: `TT-DESK-${Date.now().toString().slice(-6)}`,
            enrollmentId,
            studentId: enr.studentId,
            courseId: enr.courseId,
            branchId: enr.batchId || 'aaaaaaaa-0001-0001-0001-000000000001',
            amount: finalPaid,
            paymentMethod: 'CASH_AT_SPA' as any,
            paymentStatus: 'PAID' as any,
            notes: options?.notes || `Admin duyệt và thu học phí tại quầy cho học viên ${enr.studentName || ''}`,
          });
        } catch (tErr) {
          console.warn('[approveEnrollment] Lỗi tự động ghi nhận giao dịch học phí:', tErr);
        }
      }

      const updated = (await supabaseService.getEnrollments())?.find((e) => e.id === enrollmentId);
      return {
        success: true,
        statusCode: 200,
        message: 'Đã duyệt học viên vào khóa học thành công!',
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
      const live = await supabaseService.getEnrollments();
      const current = live?.find((e) => e.id === enrollmentId);
      const history = [...(current?.consultationHistory || [])];
      const noteContent = data.note
        ? data.note
        : `Đã chốt học phí ${data.finalTuition.toLocaleString('vi-VN')}đ tại ${data.branchName || 'Chi nhánh đã chọn'}`;
      history.push({
        timestamp: new Date().toISOString(),
        author: data.authorName || 'Nhân viên tư vấn',
        note: noteContent,
      });

      const ok = await supabaseService.updateEnrollment(enrollmentId, {
        consultationStatus: ConsultationStatus.CONFIRMED,
        finalTuition: data.finalTuition,
        tuitionTotal: data.finalTuition,
        selectedBranch: data.branchName,
        consultationHistory: history,
        qrCreatedAt: new Date().toISOString(),
      });

      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Đã chốt tư vấn và tạo yêu cầu thanh toán thành công' : 'Lỗi chốt tư vấn',
        data: ok,
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
      const live = await supabaseService.getEnrollments();
      const enr = live?.find((e) => e.id === enrollmentId);
      if (!enr) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy hồ sơ', data: false };
      }

      const history = [...(enr.consultationHistory || [])];
      history.push({
        timestamp: new Date().toISOString(),
        author: options?.authorName || 'Kế toán / Đối soát',
        note: options?.notes || `Đã xác nhận thanh toán đủ ${amount.toLocaleString('vi-VN')}đ`,
      });

      const ok = await supabaseService.updateEnrollment(enrollmentId, {
        paymentVerificationStatus: PaymentVerificationStatus.PAID,
        amountPaid: amount,
        approvalStatus: 'APPROVED',
        studentAdmissionStatus: StudentAdmissionStatus.APPROVED,
        consultationStatus: ConsultationStatus.CONFIRMED,
        status: EnrollmentStatus.ENROLLED,
        approvedBy: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
        approvedAt: new Date().toISOString(),
        consultationHistory: history,
      });

      if (ok) {
        try {
          await supabaseService.recordTuitionPayment({
            transactionCode: `HP-${enr.orderCode || Date.now().toString().slice(-6)}`,
            enrollmentId,
            studentId: enr.studentId,
            courseId: enr.courseId,
            branchId: enr.batchId || 'aaaaaaaa-0001-0001-0001-000000000001',
            amount,
            paymentMethod: options?.paymentMethod || PaymentMethod.BANK_TRANSFER,
            paymentStatus: PaymentStatus.PAID,
            notes: options?.notes || `Thanh toán học phí cho hồ sơ ${enr.orderCode || ''}`,
          });
        } catch (_) {}
      }

      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Xác nhận thanh toán và duyệt học viên thành công!' : 'Lỗi cập nhật thanh toán',
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
    authorName?: string
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
      if (batch.maxStudents && batch.enrolledCount >= batch.maxStudents) {
        return {
          success: false,
          statusCode: 400,
          message: `Lớp ${batch.batchCode} đã đạt sức chứa tối đa (${batch.enrolledCount}/${batch.maxStudents} học viên). Vui lòng chọn lớp khác!`,
          data: { success: false, message: 'Lớp đã đầy sĩ số' },
        };
      }

      const history = [...(enr.consultationHistory || [])];
      history.push({
        timestamp: new Date().toISOString(),
        author: authorName || 'Admin Tuyển Sinh',
        note: `Đã xếp học viên vào lớp ${batch.batchCode} (${batch.scheduleText || ''})`,
      });

      const ok = await supabaseService.updateEnrollment(enrollmentId, {
        batchId,
        studentAdmissionStatus: StudentAdmissionStatus.ENROLLED,
        status: EnrollmentStatus.STUDYING,
        approvalStatus: 'APPROVED',
        approvedBy: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
        approvedAt: new Date().toISOString(),
        consultationHistory: history,
      });

      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? `Đã xếp học viên vào lớp ${batch.batchCode} thành công!` : 'Lỗi khi xếp lớp',
        data: { success: ok, message: ok ? 'Xếp lớp thành công' : 'Lỗi cập nhật' },
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
      const res = await supabaseService.recordTuitionPayment(data);
      if (res) {
        return {
          success: true,
          statusCode: 201,
          message: 'Ghi nhận đóng học phí thành công trên Supabase Cloud',
          data: res,
        };
      }
    } catch (err) {
      console.error('[academyService] recordTuitionPayment error:', err);
    }
    return legacyWrite<TuitionTransaction>('tuition_transactions', data);
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

  async seedBatchSchedules(batchId: string, startDate?: string): Promise<ApiResponse<BatchSchedule[]>> {
    try {
      const seeded = await supabaseService.seedBatchSchedules(batchId, startDate);
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
