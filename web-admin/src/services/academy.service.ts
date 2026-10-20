import {
  Course,
  CourseBatch,
  CourseEnrollment,
  TuitionTransaction,
  StudentCertificate,
  Instructor,
  CourseLevel,
  EnrollmentStatus,
  CertificateStatus,
  ApiResponse,
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

  async updateEnrollmentStatus(
    id: string,
    status: EnrollmentStatus
  ): Promise<ApiResponse<CourseEnrollment>> {
    return legacyWrite<CourseEnrollment>('course_enrollments',{status},id);
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
    data: Partial<TuitionTransaction>
  ): Promise<ApiResponse<TuitionTransaction>> {
    return legacyWrite<TuitionTransaction>('tuition_transactions',data);
  },

  // --- Chứng chỉ tốt nghiệp điện tử ---
  async getCertificates(params?: {
    status?: CertificateStatus;
    search?: string;
  }): Promise<ApiResponse<StudentCertificate[]>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu chứng chỉ tốt nghiệp từ Supabase Cloud',
      data: (await legacyRead<StudentCertificate>('student_certificates')).filter(c=>(!params?.status||c.status===params.status)&&(!params?.search||c.studentName.toLowerCase().includes(params.search.toLowerCase()))),
    };
  },

  async issueCertificate(
    data: Partial<StudentCertificate>
  ): Promise<ApiResponse<StudentCertificate>> {
    return legacyWrite<StudentCertificate>('student_certificates',data);
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
