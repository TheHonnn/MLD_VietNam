import {
  User,
  StaffProfile,
  UserRole,
  StaffDepartment,
  EmploymentType,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyRead } from './adminAdapter';

export type StaffWithProfile = User & { staffProfile: StaffProfile; technicianId?: string | null };

export const staffService = {
  async getStaffList(params?: {
    branchId?: string;
    role?: UserRole;
    department?: StaffDepartment;
    search?: string;
  }): Promise<ApiResponse<StaffWithProfile[]>> {
    try {
      const [liveUsers, technicians, rawProfiles] = await Promise.all([
        supabaseService.getStaffUsers(params?.search),
        supabaseService.getTechnicians().catch(() => []),
        legacyRead<StaffProfile>('staff_profiles').catch(() => []),
      ]);
      const profiles =
        Array.isArray(rawProfiles) && rawProfiles.length > 0
          ? rawProfiles
          : await supabaseService.getStaffProfiles().catch(() => []);
      const staffRoles = [
        UserRole.TECHNICIAN,
        UserRole.INSTRUCTOR,
        UserRole.RECEPTIONIST,
        UserRole.CASHIER,
        UserRole.BRANCH_MANAGER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ];

      const result: StaffWithProfile[] = [];
      for (const user of liveUsers || []) {
        if (user.isActive === false || !staffRoles.includes(user.role) || (params?.role && user.role !== params.role)) {
          continue;
        }
        const profile = profiles.find((p) => p.userId === user.id);
        const tech = (technicians || []).find((t) => t.userId === user.id && t.isActive !== false);
        const effectiveBranchId = profile?.branchId || tech?.branchId || '';
        if (params?.branchId && effectiveBranchId && effectiveBranchId !== params.branchId) continue;
        if (params?.department && profile?.department !== params.department) continue;
        result.push({
          ...user,
          technicianId: tech?.id || null,
          staffProfile: profile ?? {
            id: '',
            userId: user.id,
            branchId: effectiveBranchId,
            employeeCode: '',
            department: StaffDepartment.RECEPTION,
            position: String(user.role || 'Nhân viên'),
            employmentType: EmploymentType.FULL_TIME,
            baseSalary: 0,
            commissionRate: 0,
            packageCommissionRate: 0,
            productCommissionRate: 0,
            hireDate: '',
            isActive: true,
          },
        });
      }

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
