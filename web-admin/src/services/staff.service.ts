import { apiClient } from './apiClient';
import { mockStaff } from './mockData';
import {
  User,
  StaffProfile,
  UserRole,
  StaffDepartment,
  ApiResponse,
} from '../types/shared_types';

export type StaffWithProfile = User & { staffProfile: StaffProfile };

export const staffService = {
  async getStaffList(params?: {
    branchId?: string;
    role?: UserRole;
    department?: StaffDepartment;
    search?: string;
  }): Promise<ApiResponse<StaffWithProfile[]>> {
    return apiClient.get<StaffWithProfile[]>('/staff', {
      params,
      mockFallback: () => {
        let result = [...mockStaff];
        if (params?.branchId) {
          result = result.filter((s) => s.staffProfile.branchId === params.branchId);
        }
        if (params?.role) {
          result = result.filter((s) => s.role === params.role);
        }
        if (params?.department) {
          result = result.filter((s) => s.staffProfile.department === params.department);
        }
        if (params?.search) {
          const kw = params.search.toLowerCase();
          result = result.filter(
            (s) =>
              s.fullName.toLowerCase().includes(kw) ||
              s.phone.includes(kw) ||
              s.staffProfile.employeeCode.toLowerCase().includes(kw)
          );
        }
        return result;
      },
    });
  },

  async getStaffById(id: string): Promise<ApiResponse<StaffWithProfile | undefined>> {
    return apiClient.get<StaffWithProfile | undefined>(`/staff/${id}`, {
      mockFallback: () => mockStaff.find((s) => s.id === id),
    });
  },

  async getTechnicians(branchId?: string): Promise<ApiResponse<StaffWithProfile[]>> {
    return apiClient.get<StaffWithProfile[]>('/staff/technicians', {
      params: { branchId },
      mockFallback: () => {
        return mockStaff.filter(
          (s) =>
            s.role === UserRole.TECHNICIAN &&
            (!branchId || s.staffProfile.branchId === branchId)
        );
      },
    });
  },

  async getInstructors(): Promise<ApiResponse<StaffWithProfile[]>> {
    return apiClient.get<StaffWithProfile[]>('/staff/instructors', {
      mockFallback: () => {
        return mockStaff.filter((s) => s.role === UserRole.INSTRUCTOR);
      },
    });
  },
};
