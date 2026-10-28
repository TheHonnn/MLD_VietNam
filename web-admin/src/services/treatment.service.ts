import {
  Service,
  TreatmentPackage,
  UserPackage,
  TreatmentJournal,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyWrite } from './adminAdapter';

export const treatmentService = {
  // --- Danh mục dịch vụ ---
  async getServices(params?: {
    categoryId?: string;
    search?: string;
  }): Promise<ApiResponse<Service[]>> {
    try {
      const live = await supabaseService.getServices();
      let result = live || [];
      if (params?.categoryId) {
        result = result.filter((s) => s.categoryId === params.categoryId);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        result = result.filter(
          (item) =>
            item.name.toLowerCase().includes(s) ||
            item.slug.toLowerCase().includes(s)
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[treatmentService] getServices failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn dịch vụ từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getServiceById(id: string): Promise<ApiResponse<Service | undefined>> {
    try {
      const live = await supabaseService.getServices();
      const found = live?.find((s) => s.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[treatmentService] getServiceById failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tìm dịch vụ từ Supabase',
        data: undefined,
      };
    }
  },

  // --- Gói Liệu Trình (TreatmentPackage) ---
  async getTreatmentPackages(): Promise<ApiResponse<TreatmentPackage[]>> {
    try {
      const live = await supabaseService.getTreatmentPackages();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentPackages failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn gói liệu trình từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getTreatmentPackageById(id: string): Promise<ApiResponse<TreatmentPackage | undefined>> {
    try {
      const live = await supabaseService.getTreatmentPackages();
      const found = live?.find((p) => p.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentPackageById failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tìm gói liệu trình từ Supabase',
        data: undefined,
      };
    }
  },

  async getUserPackagesByCustomer(customerId?: string): Promise<ApiResponse<UserPackage[]>> {
    try {
      const isValidUuid = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      const live = await supabaseService.getUserPackages(isValidUuid ? customerId : undefined);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu gói liệu trình từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[treatmentService] getUserPackagesByCustomer error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi nạp gói liệu trình từ Supabase Cloud',
        data: [],
      };
    }
  },

  // --- Nhật ký & Buổi trị liệu (TreatmentJournal) ---
  async getTreatmentJournalsByCustomer(customerId?: string): Promise<ApiResponse<TreatmentJournal[]>> {
    try {
      const isValidUuid = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      const live = await supabaseService.getTreatmentJournals(isValidUuid ? customerId : undefined);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu nhật ký điều trị từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentJournalsByCustomer error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy nhật ký điều trị từ Supabase',
        data: [],
      };
    }
  },

  async getTreatmentJournalById(id: string): Promise<ApiResponse<TreatmentJournal | undefined>> {
    try {
      const live = await supabaseService.getTreatmentJournals();
      const found = live?.find((s) => s.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết buổi điều trị từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentJournalById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy chi tiết buổi điều trị từ Supabase',
        data: undefined,
      };
    }
  },

  async updateTreatmentJournal(
    id: string,
    data: Partial<TreatmentJournal>
  ): Promise<ApiResponse<TreatmentJournal>> {
    return legacyWrite<TreatmentJournal>('treatment_journal', data, id);
  },

  async createTreatmentJournal(journal: {
    userPackageId?: string | null;
    bookingId?: string | null;
    customerId: string;
    technicianId?: string | null;
    assignedRoomId?: string | null;
    sessionNumber: number;
    sessionDate: string;
    treatmentStartTime?: string | null;
    treatmentEndTime?: string | null;
    conditionBefore?: string;
    conditionAfter?: string;
    treatmentNotes?: string;
    specialistAdvice?: string;
    beforePhotos?: string[];
    afterPhotos?: string[];
  }): Promise<ApiResponse<any>> {
    try {
      const res = await legacyWrite<TreatmentJournal>('treatment_journal', journal);
      if (!res.success || !res.data?.id) {
        return {
          success: false,
          statusCode: res.statusCode || 500,
          message: res.message || 'Không xác nhận được nhật ký điều trị đã lưu.',
          data: null,
        };
      }
      return res;
    } catch (err) {
      console.error('[treatmentService] createTreatmentJournal error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi ghi chép sổ điều trị',
        data: null,
      };
    }
  },

  // Tiến trình FSM: Thực hiện 1 buổi và tự động hoàn thành gói khi đủ số buổi
  async completePackageSession(
    userPackageId: string,
    currentCompleted: number,
    totalSessions: number,
    journalData?: any
  ): Promise<ApiResponse<boolean>> {
    if (!journalData) {
      return {
        success: false,
        statusCode: 400,
        message: 'Thiếu thông tin buổi điều trị.',
        data: false,
      };
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(userPackageId) || !uuidPattern.test(journalData.customerId)) {
      return {
        success: false,
        statusCode: 400,
        message: 'Mã gói hoặc khách hàng không hợp lệ.',
        data: false,
      };
    }

    const existingJournals = await this.getTreatmentJournalsByCustomer(journalData.customerId);
    if (!existingJournals.success) {
      return {
        success: false,
        statusCode: 503,
        message: 'Không thể kiểm tra nhật ký hiện có. Buổi điều trị chưa được lưu.',
        data: false,
      };
    }
    const nextCompleted = currentCompleted + 1;
    const existingJournal = existingJournals.data.find((journal) =>
      journal.userPackageId === userPackageId && (
        journalData.bookingId
          ? journal.bookingId === journalData.bookingId
          : journal.sessionNumber === Number(journalData.sessionNumber || nextCompleted)
      )
    );
    if (currentCompleted >= totalSessions && !existingJournal) {
      return {
        success: false,
        statusCode: 400,
        message: 'Gói liệu trình này đã hoàn tất đầy đủ các buổi theo phác đồ.',
        data: false,
      };
    }
    const requestedSession = Number(journalData.sessionNumber || existingJournal?.sessionNumber || nextCompleted);
    if (!existingJournal && requestedSession !== nextCompleted) {
      return {
        success: false,
        statusCode: 409,
        message: `Buổi tiếp theo cần cập nhật là buổi ${nextCompleted}.`,
        data: false,
      };
    }
    const journalRes = existingJournal
      ? { success: true, statusCode: 200, message: 'Buổi điều trị đã được ghi nhận.', data: existingJournal }
      : await this.createTreatmentJournal({
          ...journalData,
          userPackageId,
          sessionNumber: requestedSession,
          sessionDate: journalData.sessionDate || new Date().toISOString().slice(0, 10),
        });

    if (!journalRes.success) return journalRes;

    return {
      success: true,
      statusCode: journalRes.statusCode,
      message: requestedSession >= totalSessions
        ? 'Đã lưu buổi cuối và hoàn tất gói liệu trình.'
        : 'Đã lưu buổi điều trị và cập nhật tiến trình gói.',
      data: true,
    };
  },
};
