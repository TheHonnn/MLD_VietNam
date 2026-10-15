import {
  mockServices,
  mockTreatmentPackages,
  mockUserPackages,
  mockTreatmentJournals,
} from './mockData';
import {
  Service,
  TreatmentPackage,
  UserPackage,
  TreatmentJournal,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const treatmentService = {
  // --- Danh mục dịch vụ ---
  async getServices(params?: {
    categoryId?: string;
    search?: string;
  }): Promise<ApiResponse<Service[]>> {
    try {
      const live = await supabaseService.getServices();
      if (live && live.length > 0) {
        let result = live;
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
      }
    } catch (err) {
      console.warn('[treatmentService] getServices failed:', err);
    }

    let result = [...mockServices];
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
      message: 'Dữ liệu minh họa',
      data: result,
    };
  },

  async getServiceById(id: string): Promise<ApiResponse<Service | undefined>> {
    try {
      const live = await supabaseService.getServices();
      const found = live?.find((s) => s.id === id);
      if (found) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu từ Supabase Cloud',
          data: found,
        };
      }
    } catch (err) {
      console.warn('[treatmentService] getServiceById failed:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa',
      data: mockServices.find((s) => s.id === id),
    };
  },

  // --- Gói Liệu Trình (TreatmentPackage) ---
  async getTreatmentPackages(): Promise<ApiResponse<TreatmentPackage[]>> {
    try {
      const live = await supabaseService.getTreatmentPackages();
      if (live && live.length > 0) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu trực tiếp từ Supabase Cloud',
          data: live,
        };
      }
    } catch (err) {
      console.warn('[treatmentService] getTreatmentPackages failed:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa',
      data: mockTreatmentPackages,
    };
  },

  async getTreatmentPackageById(id: string): Promise<ApiResponse<TreatmentPackage | undefined>> {
    try {
      const live = await supabaseService.getTreatmentPackages();
      const found = live?.find((p) => p.id === id);
      if (found) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu từ Supabase Cloud',
          data: found,
        };
      }
    } catch (err) {
      console.warn('[treatmentService] getTreatmentPackageById failed:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa',
      data: mockTreatmentPackages.find((p) => p.id === id),
    };
  },

  // --- Gói Liệu Trình của Khách hàng (UserPackage) ---
  async getUserPackagesByCustomer(customerId: string): Promise<ApiResponse<UserPackage[]>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu gói liệu trình',
      data: mockUserPackages.filter((p) => p.customerId === customerId),
    };
  },

  // --- Nhật ký & Buổi trị liệu (TreatmentJournal) ---
  async getTreatmentJournalsByCustomer(customerId: string): Promise<ApiResponse<TreatmentJournal[]>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu nhật ký điều trị',
      data: mockTreatmentJournals.filter((s) => s.customerId === customerId),
    };
  },

  async getTreatmentJournalById(id: string): Promise<ApiResponse<TreatmentJournal | undefined>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Chi tiết buổi điều trị',
      data: mockTreatmentJournals.find((s) => s.id === id),
    };
  },

  async updateTreatmentJournal(
    id: string,
    data: Partial<TreatmentJournal>
  ): Promise<ApiResponse<TreatmentJournal>> {
    const journal = mockTreatmentJournals.find((s) => s.id === id);
    if (journal) {
      Object.assign(journal, data);
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Cập nhật thành công',
      data: (journal || mockTreatmentJournals[0]) as TreatmentJournal,
    };
  },
};
