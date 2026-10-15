import { mockBranches, mockRooms } from './mockData';
import { Branch, BranchRoom, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const branchService = {
  async getAllBranches(): Promise<ApiResponse<Branch[]>> {
    try {
      const live = await supabaseService.getBranches();
      if (live && live.length > 0) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu trực tiếp từ Supabase Cloud',
          data: live,
        };
      }
    } catch (err) {
      console.warn('[branchService] Supabase query failed:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa (Mock Data)',
      data: mockBranches,
    };
  },

  async getBranchById(id: string): Promise<ApiResponse<Branch | undefined>> {
    try {
      const live = await supabaseService.getBranches();
      const found = live?.find((b) => b.id === id);
      if (found) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu từ Supabase Cloud',
          data: found,
        };
      }
    } catch (err) {
      console.warn('[branchService] getBranchById failed:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa',
      data: mockBranches.find((b) => b.id === id),
    };
  },

  async getRoomsByBranch(branchId: string): Promise<ApiResponse<BranchRoom[]>> {
    try {
      const live = await supabaseService.getRooms(branchId);
      if (live && live.length > 0) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu từ Supabase Cloud',
          data: live,
        };
      }
    } catch (err) {
      console.warn('[branchService] getRoomsByBranch failed:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa',
      data: mockRooms.filter((r) => r.branchId === branchId),
    };
  },
};
