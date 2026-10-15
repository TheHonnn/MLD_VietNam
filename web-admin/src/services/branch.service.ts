import { apiClient } from './apiClient';
import { mockBranches, mockRooms } from './mockData';
import { Branch, BranchRoom, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const branchService = {
  async getAllBranches(): Promise<ApiResponse<Branch[]>> {
    return apiClient.get<Branch[]>('/branches', {
      mockFallback: async () => {
        const live = await supabaseService.getBranches();
        return live && live.length > 0 ? live : mockBranches;
      },
    });
  },

  async getBranchById(id: string): Promise<ApiResponse<Branch | undefined>> {
    return apiClient.get<Branch | undefined>(`/branches/${id}`, {
      mockFallback: async () => {
        const live = await supabaseService.getBranches();
        const found = live?.find((b) => b.id === id);
        return found || mockBranches.find((b) => b.id === id);
      },
    });
  },

  async getRoomsByBranch(branchId: string): Promise<ApiResponse<BranchRoom[]>> {
    return apiClient.get<BranchRoom[]>(`/branches/${branchId}/rooms`, {
      mockFallback: async () => {
        const live = await supabaseService.getRooms(branchId);
        return live && live.length > 0 ? live : mockRooms.filter((r) => r.branchId === branchId);
      },
    });
  },
};
