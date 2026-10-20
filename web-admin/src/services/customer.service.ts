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
      const found = liveUsers?.find((c) => c.id === id || c.phone === id);
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

  async updateCustomer(id: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const payload: Record<string, any> = {};
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.email !== undefined) payload.email = updates.email || null;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl || null;
      if (updates.gender !== undefined) payload.gender = updates.gender;
      if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth || null;
      if (updates.address !== undefined) payload.address = updates.address || null;
      if (updates.emergencyContactName !== undefined) payload.emergency_contact_name = updates.emergencyContactName || null;
      if (updates.emergencyContactPhone !== undefined) payload.emergency_contact_phone = updates.emergencyContactPhone || null;
      if (updates.membershipTier !== undefined) payload.membership_tier = updates.membershipTier;
      if (updates.purpose !== undefined) payload.purpose = updates.purpose;

      await supabaseService.updateUser(id, payload);
      const custRes = await this.getCustomerById(id);
      if (custRes.success && custRes.data) {
        return {
          success: true,
          statusCode: 200,
          message: 'Cập nhật thông tin khách hàng thành công',
          data: custRes.data,
        };
      }
    } catch (err) {
      console.error('[customerService] updateCustomer error:', err);
    }

    return {
      success: false,
      statusCode: 500,
      message: 'Không thể cập nhật thông tin khách hàng trên hệ thống',
      data: {} as User,
    };
  },
};

