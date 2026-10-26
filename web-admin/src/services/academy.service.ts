import {
  Course,
  CourseBatch,
  CourseChapter,
  CourseLesson,
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

  // --- Quản lý Học liệu & Bài giảng Video YouTube ---
  async getCourseCurriculum(courseId: string): Promise<ApiResponse<CourseChapter[]>> {
    try {
      const data = await supabaseService.getCourseCurriculum(courseId);
      return {
        success: true,
        statusCode: 200,
        message: 'Lấy danh sách chương và bài học thành công',
        data: data || [],
      };
    } catch (err) {
      console.error('[academyService] getCourseCurriculum failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn học liệu khóa học',
        data: [],
      };
    }
  },

  async createCourseChapter(data: { courseId: string; chapterOrder: number; title: string; description?: string }): Promise<ApiResponse<CourseChapter | null>> {
    try {
      const created = await supabaseService.createCourseChapter(data);
      return {
        success: !!created,
        statusCode: created ? 201 : 500,
        message: created ? 'Tạo chương học thành công' : 'Không tạo được chương học',
        data: created,
      };
    } catch (err) {
      console.error('[academyService] createCourseChapter failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi tạo chương học',
        data: null,
      };
    }
  },

  async createCourseLesson(data: {
    chapterId: string;
    lessonOrder: number;
    title: string;
    durationMinutes: number;
    videoUrl?: string | null;
    contentText?: string | null;
    isFreePreview?: boolean;
  }): Promise<ApiResponse<CourseLesson | null>> {
    try {
      const created = await supabaseService.createCourseLesson(data);
      return {
        success: !!created,
        statusCode: created ? 201 : 500,
        message: created ? 'Thêm bài học Video thành công' : 'Không tạo được bài học',
        data: created,
      };
    } catch (err) {
      console.error('[academyService] createCourseLesson failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi tạo bài học',
        data: null,
      };
    }
  },

  async updateCourseLesson(
    id: string,
    data: Partial<{
      title: string;
      durationMinutes: number;
      videoUrl: string | null;
      contentText: string | null;
      isFreePreview: boolean;
      chapterId: string;
      lessonOrder: number;
    }>
  ): Promise<ApiResponse<CourseLesson | null>> {
    try {
      const updated = await supabaseService.updateCourseLesson(id, data);
      return {
        success: !!updated,
        statusCode: updated ? 200 : 500,
        message: updated ? 'Cập nhật bài học thành công' : 'Không cập nhật được bài học',
        data: updated,
      };
    } catch (err) {
      console.error('[academyService] updateCourseLesson failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi cập nhật bài học',
        data: null,
      };
    }
  },

  async deleteCourseLesson(id: string): Promise<ApiResponse<boolean>> {
    try {
      const deleted = await supabaseService.deleteCourseLesson(id);
      return {
        success: deleted,
        statusCode: deleted ? 200 : 500,
        message: deleted ? 'Xóa bài học thành công' : 'Không xóa được bài học',
        data: deleted,
      };
    } catch (err) {
      console.error('[academyService] deleteCourseLesson failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi xóa bài học',
        data: false,
      };
    }
  },
};
