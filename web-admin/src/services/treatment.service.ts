import {
  Service,
  TreatmentPackage,
  UserPackage,
  TreatmentJournal,
  ApiResponse,
  PackageStatus,
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

  // --- Gói Liệu Trình của Khách hàng (UserPackage) ---
  getLocalUserPackages(): UserPackage[] {
    return [];
  },

  saveLocalUserPackage() {},

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

  async assignPackageToCustomer(params: {
    customerId: string;
    packageId: string;
    packageName: string;
    totalSessions: number;
    price: number;
    validityMonths?: number;
    notes?: string;
  }): Promise<ApiResponse<UserPackage>> {
    const validity = params.validityMonths || 6;
    const expiresAt = new Date(Date.now() + validity * 30 * 86400000).toISOString();

    try {
      const created = await supabaseService.createUserPackage({
        customerId: params.customerId,
        packageId: params.packageId,
        totalSessions: params.totalSessions,
        completedSessions: 0,
        status: PackageStatus.ACTIVE,
        expiresAt,
      });

      if (created) {
        created.package = {
          id: params.packageId,
          name: params.packageName,
          totalSessions: params.totalSessions,
          price: params.price,
          validityMonths: validity,
          isActive: true,
          description: '',
          imageUrl: '',
        };
        return {
          success: true,
          statusCode: 201,
          message: 'Gán gói liệu trình thành công trên Supabase Cloud',
          data: created,
        };
      }
      throw new Error('Không thể tạo bản ghi gói liệu trình trên Supabase Cloud');
    } catch (err: any) {
      console.error('[treatmentService] Cloud assign package failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi khi gán gói liệu trình lên Supabase Cloud',
        data: {} as UserPackage,
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

  async updateUserPackage(
    userPackageId: string,
    updates: { completedSessions?: number; status?: PackageStatus }
  ): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.updateUserPackage(userPackageId, updates);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Cập nhật gói liệu trình thành công trên Supabase Cloud' : 'Không thể cập nhật gói',
        data: ok,
      };
    } catch (err) {
      console.error('[treatmentService] updateUserPackage error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi cập nhật gói liệu trình',
        data: false,
      };
    }
  },

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
  }): Promise<ApiResponse<any>> {
    try {
      const res = await supabaseService.createTreatmentJournal(journal);
      return {
        success: Boolean(res),
        statusCode: res ? 201 : 400,
        message: res ? 'Ghi chép sổ điều trị thành công trên Supabase Cloud' : 'Lỗi khi ghi nhật ký',
        data: res,
      };
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
    if (currentCompleted >= totalSessions) {
      return {
        success: false,
        statusCode: 400,
        message: 'Gói liệu trình này đã hoàn tất đầy đủ các buổi theo phác đồ.',
        data: false,
      };
    }

    const nextCompleted = currentCompleted + 1;
    const nextStatus = nextCompleted >= totalSessions ? PackageStatus.COMPLETED : PackageStatus.ACTIVE;

    const res = await this.updateUserPackage(userPackageId, {
      completedSessions: nextCompleted,
      status: nextStatus,
    });

    if (res.success && journalData) {
      await this.createTreatmentJournal({
        ...journalData,
        userPackageId,
        sessionNumber: nextCompleted,
        sessionDate: new Date().toISOString().split('T')[0],
      });
    }

    return res;
  },
};
