import { apiClient } from './apiClient';
import { mockBranches, mockRooms } from './mockData';
import { Branch, BranchRoom, ApiResponse } from '../types/shared_types';

export const branchService = {
  async getAllBranches(): Promise<ApiResponse<Branch[]>> {
    return apiClient.get<Branch[]>('/branches', {
      mockFallback: () => mockBranches,
    });
  },

  async getBranchById(id: string): Promise<ApiResponse<Branch | undefined>> {
    return apiClient.get<Branch | undefined>(`/branches/${id}`, {
      mockFallback: () => mockBranches.find((b) => b.id === id),
    });
  },

  async getRoomsByBranch(branchId: string): Promise<ApiResponse<BranchRoom[]>> {
    return apiClient.get<BranchRoom[]>(`/branches/${branchId}/rooms`, {
      mockFallback: () => mockRooms.filter((r) => r.branchId === branchId),
    });
  },
};
