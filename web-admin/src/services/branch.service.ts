import { Branch, BranchRoom, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const branchService = {
  async getAllBranches(): Promise<ApiResponse<Branch[]>> {
    try {
      const live = await supabaseService.getBranches();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[branchService] getAllBranches error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn danh sách chi nhánh từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getBranchById(id: string): Promise<ApiResponse<Branch | undefined>> {
    try {
      const live = await supabaseService.getBranches();
      const found = live?.find((b) => b.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[branchService] getBranchById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn chi tiết chi nhánh từ Supabase Cloud',
        data: undefined,
      };
    }
  },

  async getRoomsByBranch(branchId: string): Promise<ApiResponse<BranchRoom[]>> {
    try {
      const live = await supabaseService.getRooms(branchId);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[branchService] getRoomsByBranch error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tải danh sách phòng từ Supabase Cloud',
        data: [],
      };
    }
  },

  async createBranch(branchData: Omit<Branch, 'id'>): Promise<ApiResponse<Branch>> {
    try {
      const created = await supabaseService.createBranch(branchData);
      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Khởi tạo cơ sở chi nhánh mới thành công trên hệ thống',
          data: created,
        };
      }
    } catch (err) {
      console.error('[branchService] createBranch error:', err);
    }

    return {
      success: false,
      statusCode: 500,
      message: 'Không thể khởi tạo cơ sở chi nhánh trên Supabase Cloud',
      data: {} as Branch,
    };
  },

  async updateBranch(id: string, updates: Partial<Branch>): Promise<ApiResponse<Branch>> {
    try {
      await supabaseService.updateBranch(id, updates);
    } catch (err) {
      console.error('[branchService] updateBranch error:', err);
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Cập nhật thông tin chi nhánh thành công',
      data: { id, ...updates } as Branch,
    };
  },
};

