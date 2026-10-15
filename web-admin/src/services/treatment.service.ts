import { apiClient } from './apiClient';
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
    return apiClient.get<Service[]>('/services', {
      params,
      mockFallback: async () => {
        const live = await supabaseService.getServices();
        let result = live && live.length > 0 ? live : [...mockServices];
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
        return result;
      },
    });
  },

  async getServiceById(id: string): Promise<ApiResponse<Service | undefined>> {
    return apiClient.get<Service | undefined>(`/services/${id}`, {
      mockFallback: async () => {
        const live = await supabaseService.getServices();
        const found = live?.find((s) => s.id === id);
        return found || mockServices.find((s) => s.id === id);
      },
    });
  },

  // --- Gói Liệu Trình (TreatmentPackage) ---
  async getTreatmentPackages(): Promise<ApiResponse<TreatmentPackage[]>> {
    return apiClient.get<TreatmentPackage[]>('/treatment-packages', {
      mockFallback: async () => {
        const live = await supabaseService.getTreatmentPackages();
        return live && live.length > 0 ? live : mockTreatmentPackages;
      },
    });
  },

  async getTreatmentPackageById(id: string): Promise<ApiResponse<TreatmentPackage | undefined>> {
    return apiClient.get<TreatmentPackage | undefined>(`/treatment-packages/${id}`, {
      mockFallback: async () => {
        const live = await supabaseService.getTreatmentPackages();
        const found = live?.find((p) => p.id === id);
        return found || mockTreatmentPackages.find((p) => p.id === id);
      },
    });
  },

  // --- Gói Liệu Trình của Khách hàng (UserPackage) ---
  async getUserPackagesByCustomer(customerId: string): Promise<ApiResponse<UserPackage[]>> {
    return apiClient.get<UserPackage[]>(`/customers/${customerId}/packages`, {
      mockFallback: () => mockUserPackages.filter((p) => p.customerId === customerId),
    });
  },

  // --- Nhật ký & Buổi trị liệu (TreatmentJournal) ---
  async getTreatmentJournalsByCustomer(customerId: string): Promise<ApiResponse<TreatmentJournal[]>> {
    return apiClient.get<TreatmentJournal[]>(`/customers/${customerId}/treatment-journals`, {
      mockFallback: () => mockTreatmentJournals.filter((s) => s.customerId === customerId),
    });
  },

  async getTreatmentJournalById(id: string): Promise<ApiResponse<TreatmentJournal | undefined>> {
    return apiClient.get<TreatmentJournal | undefined>(`/treatment-journals/${id}`, {
      mockFallback: () => mockTreatmentJournals.find((s) => s.id === id),
    });
  },

  async updateTreatmentJournal(
    id: string,
    data: Partial<TreatmentJournal>
  ): Promise<ApiResponse<TreatmentJournal>> {
    return apiClient.patch<TreatmentJournal>(`/treatment-journals/${id}`, data, {
      mockFallback: () => {
        const journal = mockTreatmentJournals.find((s) => s.id === id);
        if (journal) {
          Object.assign(journal, data);
        }
        return journal;
      },
    });
  },
};
