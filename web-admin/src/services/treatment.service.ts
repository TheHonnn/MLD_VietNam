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

  // --- Gói Liệu Trình của Khách hàng (UserPackage) ---
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
        message: 'Lỗi khi lấy gói liệu trình khách hàng từ Supabase',
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
    return legacyWrite<TreatmentJournal>('treatment_journal',data,id);
  },
};
