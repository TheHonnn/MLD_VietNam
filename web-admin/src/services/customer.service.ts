import { mockCustomers } from './mockData';
import { User, MemberTier, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const customerService = {
  async getCustomers(query?: { search?: string; tier?: MemberTier }): Promise<ApiResponse<User[]>> {
    // 1. Thử lấy dữ liệu trực tiếp từ Supabase Cloud
    try {
      const liveUsers = await supabaseService.getUsers(query?.search, query?.tier);
      if (liveUsers && liveUsers.length > 0) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu trực tiếp từ Supabase Cloud',
          data: liveUsers,
        };
      }
    } catch (err) {
      console.warn('[customerService] Supabase query warn, using mock fallback:', err);
    }

    // 2. Dự phòng sang mockCustomers nếu Supabase chưa có data hoặc query lỗi
    let result = [...mockCustomers];
    if (query?.search) {
      const s = query.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          (c.referralCode && c.referralCode.toLowerCase().includes(s))
      );
    }
    if (query?.tier) {
      result = result.filter((c) => c.membershipTier === query.tier);
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa (Mock Data)',
      data: result,
    };
  },

  async getCustomerById(id: string): Promise<ApiResponse<User | undefined>> {
    try {
      const liveUsers = await supabaseService.getUsers();
      const found = liveUsers?.find((c) => c.id === id);
      if (found) {
        return {
          success: true,
          statusCode: 200,
          message: 'Dữ liệu từ Supabase Cloud',
          data: found,
        };
      }
    } catch (err) {
      console.warn('[customerService] getCustomerById error:', err);
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Dữ liệu minh họa',
      data: mockCustomers.find((c) => c.id === id),
    };
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
      console.warn('[customerService] updateCustomerTier error:', err);
    }

    const mock = mockCustomers.find((c) => c.id === id);
    if (mock) {
      mock.membershipTier = tier;
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Cập nhật thành công (Mock)',
      data: (mock || mockCustomers[0]) as User,
    };
  },
};
