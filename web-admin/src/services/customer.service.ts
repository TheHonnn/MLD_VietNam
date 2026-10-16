import { User, MemberTier, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const customerService = {
  async getCustomers(query?: { search?: string; tier?: MemberTier }): Promise<ApiResponse<User[]>> {
    try {
      const liveUsers = await supabaseService.getUsers(query?.search, query?.tier);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: liveUsers || [],
      };
    } catch (err) {
      console.error('[customerService] getCustomers error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn dữ liệu từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getCustomerById(id: string): Promise<ApiResponse<User | undefined>> {
    try {
      const liveUsers = await supabaseService.getUsers();
      const found = liveUsers?.find((c) => c.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[customerService] getCustomerById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy thông tin khách hàng từ Supabase',
        data: undefined,
      };
    }
  },

  async updateCustomerTier(id: string, tier: MemberTier): Promise<ApiResponse<User>> {
    try {
      await supabaseService.updateUserTier(id, tier);
      const liveUsers = await supabaseService.getUsers();
      const customer = liveUsers?.find((c) => c.id === id);
      if (customer) {
        return {
          success: true,
          statusCode: 200,
          message: 'Cập nhật hạng thành viên thành công trên Supabase',
          data: customer,
        };
      }
    } catch (err) {
      console.error('[customerService] updateCustomerTier error:', err);
    }

    return {
      success: false,
      statusCode: 500,
      message: 'Không thể cập nhật hạng thành viên trên Supabase Cloud',
      data: {} as User,
    };
  },
};
