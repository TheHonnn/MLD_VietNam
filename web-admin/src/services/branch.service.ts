import { Branch, BranchRoom, ApiResponse, RoomType } from '../types/shared_types';
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

  async getAllRooms(includeArchived = false): Promise<ApiResponse<BranchRoom[]>> {
    try {
      const live = await supabaseService.getRooms(undefined, includeArchived);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[branchService] getAllRooms error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tải danh sách tất cả phòng từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getAllArchivedRooms(): Promise<ApiResponse<BranchRoom[]>> {
    try {
      const live = await supabaseService.getArchivedRooms();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[branchService] getAllArchivedRooms error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tải danh sách phòng lưu trữ từ Supabase Cloud',
        data: [],
      };
    }
  },

  async createRoom(roomData: {
    branchId: string;
    name: string;
    roomType: RoomType;
    bedCapacity: number;
    isAvailable?: boolean;
  }): Promise<ApiResponse<BranchRoom | null>> {
    try {
      const created = await supabaseService.createRoom(roomData);
      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Bổ sung phòng mới vào cơ sở thành công',
          data: created,
        };
      }
    } catch (err) {
      console.error('[branchService] createRoom error:', err);
    }
    return {
      success: false,
      statusCode: 500,
      message: 'Không thể thêm phòng vào CSDL Supabase',
      data: null,
    };
  },

  async updateRoom(
    roomId: string,
    updates: Partial<BranchRoom>
  ): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.updateRoom(roomId, updates);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Cập nhật phòng thành công' : 'Lỗi cập nhật phòng',
        data: ok,
      };
    } catch (err) {
      console.error('[branchService] updateRoom error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối khi cập nhật phòng',
        data: false,
      };
    }
  },

  async deleteRoom(roomId: string): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.deleteRoom(roomId);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok
          ? 'Đã xóa phòng khỏi hệ thống vận hành và bảo toàn dữ liệu trong cơ sở dữ liệu'
          : 'Lỗi khi xóa phòng',
        data: ok,
      };
    } catch (err) {
      console.error('[branchService] deleteRoom error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối khi xóa phòng',
        data: false,
      };
    }
  },

  async restoreRoom(roomId: string): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.restoreRoom(roomId);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok ? 'Khôi phục phòng vào hệ thống thành công' : 'Lỗi khi khôi phục phòng',
        data: ok,
      };
    } catch (err) {
      console.error('[branchService] restoreRoom error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối khi khôi phục phòng',
        data: false,
      };
    }
  },

  async getArchivedRooms(branchId: string): Promise<ApiResponse<BranchRoom[]>> {
    try {
      const archived = await supabaseService.getArchivedRooms(branchId);
      return {
        success: true,
        statusCode: 200,
        message: 'Lấy danh sách phòng lưu trữ trong CSDL thành công',
        data: archived,
      };
    } catch (err) {
      console.error('[branchService] getArchivedRooms error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối khi lấy phòng lưu trữ',
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

  async deleteBranch(id: string): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.deleteBranch(id);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok
          ? 'Đã xóa chi nhánh khỏi hệ thống vận hành và bảo toàn dữ liệu trong cơ sở dữ liệu'
          : 'Lỗi khi xóa chi nhánh',
        data: ok,
      };
    } catch (err) {
      console.error('[branchService] deleteBranch error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối khi xóa chi nhánh',
        data: false,
      };
    }
  },

  async restoreBranch(id: string): Promise<ApiResponse<boolean>> {
    try {
      const ok = await supabaseService.restoreBranch(id);
      return {
        success: ok,
        statusCode: ok ? 200 : 400,
        message: ok
          ? 'Khôi phục chi nhánh vào hệ thống thành công'
          : 'Lỗi khi khôi phục chi nhánh',
        data: ok,
      };
    } catch (err) {
      console.error('[branchService] restoreBranch error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi kết nối khi khôi phục chi nhánh',
        data: false,
      };
    }
  },

  async getArchivedBranches(): Promise<ApiResponse<Branch[]>> {
    try {
      const live = await supabaseService.getArchivedBranches();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu chi nhánh lưu trữ từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[branchService] getArchivedBranches error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tải danh sách chi nhánh lưu trữ từ Supabase Cloud',
        data: [],
      };
    }
  },
};

