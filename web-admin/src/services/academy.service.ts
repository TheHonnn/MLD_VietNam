import { apiClient } from './apiClient';
import {
  mockCourses,
  mockCourseBatches,
  mockCourseEnrollments,
  mockTuitionTransactions,
  mockCertificates,
} from './mockData';
import {
  Course,
  CourseBatch,
  CourseEnrollment,
  TuitionTransaction,
  StudentCertificate,
  CourseLevel,
  EnrollmentStatus,
  TuitionTransType,
  PaymentMethod,
  PaymentStatus,
  CertificateStatus,
  ApiResponse,
} from '../types/shared_types';

import { supabaseService } from './supabaseService';

export const academyService = {
  // --- Khóa học LMS ---
  async getCourses(params?: {
    search?: string;
    level?: CourseLevel;
  }): Promise<ApiResponse<Course[]>> {
    return apiClient.get<Course[]>('/academy/courses', {
      params,
      mockFallback: async () => {
        const live = await supabaseService.getCourses();
        let result = live && live.length > 0 ? live : [...mockCourses];
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
        return result;
      },
    });
  },

  async getCourseById(id: string): Promise<ApiResponse<Course | undefined>> {
    return apiClient.get<Course | undefined>(`/academy/courses/${id}`, {
      mockFallback: async () => {
        const live = await supabaseService.getCourses();
        const found = live?.find((c) => c.id === id);
        return found || mockCourses.find((c) => c.id === id);
      },
    });
  },

  // --- Lớp học / Khóa học (Batches) ---
  async getCourseBatches(courseId?: string): Promise<ApiResponse<CourseBatch[]>> {
    return apiClient.get<CourseBatch[]>('/academy/batches', {
      params: { courseId },
      mockFallback: () => {
        if (courseId) {
          return mockCourseBatches.filter((b) => b.courseId === courseId);
        }
        return mockCourseBatches;
      },
    });
  },

  // --- Tuyển sinh & Ghi danh (Enrollment) ---
  async getEnrollments(params?: {
    status?: EnrollmentStatus;
    batchId?: string;
    search?: string;
  }): Promise<ApiResponse<CourseEnrollment[]>> {
    return apiClient.get<CourseEnrollment[]>('/academy/enrollments', {
      params,
      mockFallback: () => {
        let result = [...mockCourseEnrollments];
        if (params?.status) {
          result = result.filter((e) => e.status === params.status);
        }
        if (params?.batchId) {
          result = result.filter((e) => e.batchId === params.batchId);
        }
        if (params?.search) {
          const kw = params.search.toLowerCase();
          result = result.filter(
            (e) =>
              e.id.toLowerCase().includes(kw) ||
              e.student?.fullName.toLowerCase().includes(kw) ||
              e.course?.title.toLowerCase().includes(kw)
          );
        }
        return result;
      },
    });
  },

  async getEnrollmentById(id: string): Promise<ApiResponse<CourseEnrollment | undefined>> {
    return apiClient.get<CourseEnrollment | undefined>(`/academy/enrollments/${id}`, {
      mockFallback: () => mockCourseEnrollments.find((e) => e.id === id),
    });
  },

  async updateEnrollmentStatus(
    id: string,
    status: EnrollmentStatus
  ): Promise<ApiResponse<CourseEnrollment>> {
    return apiClient.patch<CourseEnrollment>(`/academy/enrollments/${id}/status`, {
      status,
    }, {
      mockFallback: () => {
        const enr = mockCourseEnrollments.find((e) => e.id === id);
        if (enr) {
          enr.status = status;
        }
        return enr;
      },
    });
  },

  // --- Giao dịch học phí ---
  async getTuitionTransactions(enrollmentId?: string): Promise<ApiResponse<TuitionTransaction[]>> {
    return apiClient.get<TuitionTransaction[]>('/academy/tuition-transactions', {
      params: { enrollmentId },
      mockFallback: () => {
        if (enrollmentId) {
          return mockTuitionTransactions.filter((t) => t.enrollmentId === enrollmentId);
        }
        return mockTuitionTransactions;
      },
    });
  },

  async recordTuitionPayment(
    data: Partial<TuitionTransaction>
  ): Promise<ApiResponse<TuitionTransaction>> {
    return apiClient.post<TuitionTransaction>('/academy/tuition-transactions', data, {
      mockFallback: () => {
        const newTrans: TuitionTransaction = {
          id: `tt-${Date.now()}`,
          transactionCode: `GD-HP-${Date.now().toString().slice(-6)}`,
          enrollmentId: data.enrollmentId || '',
          studentId: data.studentId || '',
          courseId: data.courseId || '',
          branchId: data.branchId || 'b-q3',
          transactionType: data.transactionType || TuitionTransType.INSTALLMENT_1,
          amount: data.amount || 0,
          paymentMethod: data.paymentMethod || PaymentMethod.BANK_TRANSFER,
          paymentStatus: data.paymentStatus || PaymentStatus.PAID,
          receiptNumber: `PT-MLD-${Date.now().toString().slice(-6)}`,
          paidAt: new Date().toISOString(),
          ...data,
        };
        mockTuitionTransactions.unshift(newTrans);
        return newTrans;
      },
    });
  },

  // --- Chứng chỉ tốt nghiệp điện tử ---
  async getCertificates(params?: {
    status?: CertificateStatus;
    search?: string;
  }): Promise<ApiResponse<StudentCertificate[]>> {
    return apiClient.get<StudentCertificate[]>('/academy/certificates', {
      params,
      mockFallback: () => {
        let result = [...mockCertificates];
        if (params?.status) {
          result = result.filter((c) => c.status === params.status);
        }
        if (params?.search) {
          const kw = params.search.toLowerCase();
          result = result.filter(
            (c) =>
              c.certificateCode.toLowerCase().includes(kw) ||
              c.studentName.toLowerCase().includes(kw)
          );
        }
        return result;
      },
    });
  },

  async issueCertificate(
    data: Partial<StudentCertificate>
  ): Promise<ApiResponse<StudentCertificate>> {
    return apiClient.post<StudentCertificate>('/academy/certificates', data, {
      mockFallback: () => {
        const certCode = `CC-MLD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const newCert: StudentCertificate = {
          id: `cert-${Date.now()}`,
          enrollmentId: data.enrollmentId || '',
          studentId: data.studentId || '',
          courseId: data.courseId || '',
          certificateCode: certCode,
          qrVerificationCode: `https://mldvietnam.vn/verify-cert/${certCode}`,
          studentName: data.studentName || 'Học viên MLD',
          courseTitle: data.courseTitle || 'Khóa đào tạo chuyên sâu',
          issueDate: new Date().toISOString().split('T')[0],
          theoryScore: data.theoryScore || 9.0,
          practicalScore: data.practicalScore || 9.0,
          finalGrade: data.finalGrade || 'Giỏi',
          status: CertificateStatus.ISSUED,
          ...data,
        };
        mockCertificates.unshift(newCert);
        return newCert;
      },
    });
  },
};
