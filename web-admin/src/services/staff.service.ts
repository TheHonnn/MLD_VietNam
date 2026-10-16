import {
  User,
  StaffProfile,
  UserRole,
  StaffDepartment,
  EmploymentType,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';

export type StaffWithProfile = User & { staffProfile: StaffProfile };

export const staffService = {
  async getStaffList(params?: {
    branchId?: string;
    role?: UserRole;
    department?: StaffDepartment;
    search?: string;
  }): Promise<ApiResponse<StaffWithProfile[]>> {
    try {
      const liveUsers = await supabaseService.getUsers(params?.search);
      const staffRoles = [
        UserRole.TECHNICIAN,
        UserRole.INSTRUCTOR,
        UserRole.RECEPTIONIST,
        UserRole.CASHIER,
        UserRole.BRANCH_MANAGER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ];
      
      const filteredUsers = (liveUsers || []).filter((u) => staffRoles.includes(u.role));

      const result: StaffWithProfile[] = filteredUsers.map((u, idx) => ({
        ...u,
        staffProfile: {
          id: `sp-${u.id}`,
          userId: u.id,
          branchId: params?.branchId || 'aaaaaaaa-0001-0001-0001-000000000001',
          employeeCode: `NV-MLD-00${idx + 1}`,
          department: u.role === UserRole.INSTRUCTOR ? StaffDepartment.ACADEMY_TRAINING : (u.role === UserRole.CASHIER ? StaffDepartment.CASHIER : StaffDepartment.THERAPY_MASSAGE),
          position: u.role === UserRole.SUPER_ADMIN ? 'Ban Giám Đốc' : (u.role === UserRole.INSTRUCTOR ? 'Giảng viên' : 'Chuyên viên Spa'),
          employmentType: EmploymentType.FULL_TIME,
          baseSalary: 12000000,
          commissionRate: 5,
          hireDate: '2025-01-01',
          isActive: true,
        },
      }));

      return {
        success: true,
        statusCode: 200,
        message: 'Danh sách nhân sự từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[staffService] getStaffList error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn danh sách nhân sự từ Supabase',
        data: [],
      };
    }
  },

  async getStaffById(id: string): Promise<ApiResponse<StaffWithProfile | undefined>> {
    try {
      const list = await this.getStaffList();
      const found = list.data?.find((s) => s.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Thông tin nhân viên từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[staffService] getStaffById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy thông tin nhân viên',
        data: undefined,
      };
    }
  },

  async getTechnicians(branchId?: string): Promise<ApiResponse<StaffWithProfile[]>> {
    const list = await this.getStaffList({ branchId, role: UserRole.TECHNICIAN });
    return list;
  },

  async getInstructors(): Promise<ApiResponse<StaffWithProfile[]>> {
    const list = await this.getStaffList({ role: UserRole.INSTRUCTOR });
    return list;
  },
};
