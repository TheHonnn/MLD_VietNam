import { User, MemberTier, ApiResponse, UserRole, PurposeInterest } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const customerService = {
  async getCustomers(query?: { search?: string; tier?: MemberTier }): Promise<ApiResponse<User[]>> {
    try {
      const liveUsers = await supabaseService.getUsers(query?.search, query?.tier);
      let list = liveUsers || [];

      // Merge locally created customers from custom cache
      try {
        const stored = localStorage.getItem('mld_custom_customers');
        if (stored) {
          const customArr: User[] = JSON.parse(stored);
          for (const cu of customArr) {
            if (!list.some((u) => u.id === cu.id || u.phone === cu.phone)) {
              list = [cu, ...list];
            }
          }
        }
      } catch {}

      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: list,
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

  async createCustomer(customerData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const payload: Record<string, any> = {
        full_name: customerData.fullName,
        phone: customerData.phone,
        email: customerData.email || null,
        avatar_url: customerData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        gender: customerData.gender || 'FEMALE',
        date_of_birth: customerData.dateOfBirth || null,
        address: customerData.address || null,
        emergency_contact_name: customerData.emergencyContactName || null,
        emergency_contact_phone: customerData.emergencyContactPhone || null,
        membership_tier: customerData.membershipTier || MemberTier.STANDARD,
        purpose: customerData.purpose || PurposeInterest.BEAUTY_SPA,
        role: customerData.role || UserRole.CUSTOMER,
        reward_points: customerData.rewardPoints || 0,
        total_spent: customerData.totalSpent || 0,
        referral_code: customerData.referralCode || `MLD-KH-${Math.floor(1000 + Math.random() * 9000)}`,
        is_active: customerData.isActive !== false,
      };

      const created = await supabaseService.createUser(payload);
      const finalUser: User = created || {
        id: `u-local-${Date.now()}`,
        phone: payload.phone,
        email: payload.email,
        fullName: payload.full_name,
        avatarUrl: payload.avatar_url,
        gender: payload.gender,
        dateOfBirth: payload.date_of_birth,
        address: payload.address,
        emergencyContactName: payload.emergency_contact_name,
        emergencyContactPhone: payload.emergency_contact_phone,
        purpose: payload.purpose,
        role: payload.role,
        membershipTier: payload.membership_tier,
        rewardPoints: payload.reward_points,
        totalSpent: payload.total_spent,
        referralCode: payload.referral_code,
        isActive: payload.is_active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist to custom customers
      try {
        const stored = localStorage.getItem('mld_custom_customers');
        const customArr: User[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem('mld_custom_customers', JSON.stringify([finalUser, ...customArr]));
      } catch {}

      return {
        success: true,
        statusCode: 201,
        message: 'Tạo hồ sơ khách hàng mới thành công',
        data: finalUser,
      };
    } catch (err) {
      console.error('[customerService] createCustomer error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tạo hồ sơ khách hàng mới',
        data: {} as User,
      };
    }
  },
};

