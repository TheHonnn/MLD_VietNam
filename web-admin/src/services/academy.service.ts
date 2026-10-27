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
    extraUpdates?: { amountPaid?: number; batchId?: string | null }
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
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
          amountPaid: matchedAmount,
          approvedAt: new Date().toISOString(),
          approvedBy: 'HỆ THỐNG TỰ ĐỘNG',
          approvalNotes: `Đã tự động duyệt: Nhận thanh toán ${matchedAmount.toLocaleString('vi-VN')}đ khớp mã KH ${customerCode}`,
        });
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
  ): Promise<ApiResponse<CourseEnrollment>> {
    try {
      const enrollments = await supabaseService.getEnrollments();
      const enr = enrollments?.find((e) => e.id === enrollmentId);
      const finalPaid = options?.amountPaid !== undefined ? options.amountPaid : (enr?.tuitionTotal || 9000000);

      await supabaseService.updateEnrollment(enrollmentId, {
        status: EnrollmentStatus.ENROLLED,
        approvalStatus: 'APPROVED',
        amountPaid: finalPaid,
        approvedAt: new Date().toISOString(),
        approvedBy: options?.adminUser || 'Admin Tuyển Sinh',
        approvalNotes: options?.notes || `Admin duyệt tại quầy, thu ${finalPaid.toLocaleString('vi-VN')}đ`,
      });

      const updated = (await supabaseService.getEnrollments())?.find((e) => e.id === enrollmentId);
      return {
        success: true,
        statusCode: 200,
        message: 'Đã duyệt học viên vào khóa học thành công!',
        data: updated,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi khi duyệt học viên',
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
};
