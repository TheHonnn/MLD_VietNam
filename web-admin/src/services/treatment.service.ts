import {
  Service,
  TreatmentPackage,
  UserPackage,
  TreatmentJournal,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyWrite } from './adminAdapter';
import { adminApi, adminCommand } from '../admin/api';
import { supabase } from './supabaseClient';

export const treatmentService = {
  // --- Danh mục dịch vụ ---
  async getServices(params?: {
    categoryId?: string;
    search?: string;
  }): Promise<ApiResponse<Service[]>> {
    try {
      const live = await supabaseService.getServices();
      let result = live || [];
      if (params?.categoryId) {
        result = result.filter((s) => s.categoryId === params.categoryId);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        result = result.filter(
          (item) =>
            item.name.toLowerCase().includes(s) ||
            item.slug.toLowerCase().includes(s)
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[treatmentService] getServices failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn dịch vụ từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getServiceById(id: string): Promise<ApiResponse<Service | undefined>> {
    try {
      const live = await supabaseService.getServices();
      const found = live?.find((s) => s.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[treatmentService] getServiceById failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tìm dịch vụ từ Supabase',
        data: undefined,
      };
    }
  },

  // --- Gói Liệu Trình (TreatmentPackage) ---
  async getTreatmentPackages(): Promise<ApiResponse<TreatmentPackage[]>> {
    try {
      const live = await supabaseService.getTreatmentPackages();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu trực tiếp từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentPackages failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn gói liệu trình từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getTreatmentPackageById(id: string): Promise<ApiResponse<TreatmentPackage | undefined>> {
    try {
      const live = await supabaseService.getTreatmentPackages();
      const found = live?.find((p) => p.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentPackageById failed:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tìm gói liệu trình từ Supabase',
        data: undefined,
      };
    }
  },

  async getUserPackagesByCustomer(customerId?: string): Promise<ApiResponse<UserPackage[]>> {
    try {
      const isValidUuid = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      const live = await supabaseService.getUserPackages(isValidUuid ? customerId : undefined);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu gói liệu trình từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[treatmentService] getUserPackagesByCustomer error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi nạp gói liệu trình từ Supabase Cloud',
        data: [],
      };
    }
  },

  // --- Nhật ký & Buổi trị liệu (TreatmentJournal) ---
  async getTreatmentJournalsByCustomer(customerId?: string): Promise<ApiResponse<TreatmentJournal[]>> {
    try {
      const isValidUuid = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      const live = await supabaseService.getTreatmentJournals(isValidUuid ? customerId : undefined);
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu nhật ký điều trị từ Supabase Cloud',
        data: live || [],
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentJournalsByCustomer error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy nhật ký điều trị từ Supabase',
        data: [],
      };
    }
  },

  async getTreatmentJournalById(id: string): Promise<ApiResponse<TreatmentJournal | undefined>> {
    try {
      const live = await supabaseService.getTreatmentJournals();
      const found = live?.find((s) => s.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết buổi điều trị từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[treatmentService] getTreatmentJournalById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy chi tiết buổi điều trị từ Supabase',
        data: undefined,
      };
    }
  },

  async updateTreatmentJournal(
    id: string,
    data: Partial<TreatmentJournal>
  ): Promise<ApiResponse<TreatmentJournal>> {
    return legacyWrite<TreatmentJournal>('treatment_journal', data, id);
  },

  async createTreatmentJournal(journal: {
    userPackageId?: string | null;
    bookingId?: string | null;
    customerId: string;
    technicianId?: string | null;
    assignedRoomId?: string | null;
    sessionNumber: number;
    sessionDate: string;
    treatmentStartTime?: string | null;
    treatmentEndTime?: string | null;
    conditionBefore?: string;
    conditionAfter?: string;
    treatmentNotes?: string;
    specialistAdvice?: string;
    beforePhotos?: string[];
    afterPhotos?: string[];
  }): Promise<ApiResponse<any>> {
    try {
      const values = Object.fromEntries(Object.entries(journal).map(([key, value]) => [key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()), value]));
      const saved = await adminCommand<any>('treatment_journal/create', { values: { ...values, confirmation_status: 'DRAFT' } });
      const res = { success: true, statusCode: 200, message: 'Đã lưu bản nháp. Chưa trừ buổi.', data: saved };
      if (!res.success || !res.data?.id) {
        return {
          success: false,
          statusCode: res.statusCode || 500,
          message: res.message || 'Không xác nhận được nhật ký điều trị đã lưu.',
          data: null,
        };
      }
      return res;
    } catch (err) {
      console.error('[treatmentService] createTreatmentJournal error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi ghi chép sổ điều trị',
        data: null,
      };
    }
  },

  async bookPackageSession(userPackageId: string, input: { branchId: string; technicianId?: string | null; bookingDate: string; startTime: string; notes?: string; requestId: string }): Promise<ApiResponse<any>> {
    try {
      const row = await adminCommand<any>(`treatment/packages/${encodeURIComponent(userPackageId)}/book-session`, input);
      return { success: true,statusCode:201,message:'Đã lưu lịch và dịch vụ.',data:{ ...row,bookingCode:row.booking_code } };
    } catch (error: any) {
      return { success:false,statusCode:error?.statusCode || 400,message:error?.message || 'Chưa xác minh được kết quả đặt lịch.',data:null };
    }
  },

  async saveSessionDraftFromBooking(
    userPackageId: string,
    journalData?: any
  ): Promise<ApiResponse<boolean>> {
    if (!journalData?.bookingId) return { success: false, statusCode: 400, message: 'Cần chọn ca đang phục vụ để ghi nhận.', data: false };
    try {
      const draft = await adminCommand<any>(`treatment/packages/${encodeURIComponent(userPackageId)}/start-draft`, { bookingId: journalData.bookingId });
      if (draft.is_reversed || !['DRAFT', 'PENDING'].includes(draft.confirmation_status)) {
        return { success: false, statusCode: 409, message: 'Ca đã có hồ sơ được gửi hoặc xác nhận. Mở Nhật ký điều trị để xem.', data: false };
      }
      const values = Object.fromEntries(Object.entries(journalData).map(([key, value]) => [key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()), value]));
      const result = await this.saveTreatmentDraft(draft.id, values);
      return { success: result.success, statusCode: result.statusCode, message: result.message, data: result.success };
    } catch (error: any) {
      return { success: false, statusCode: error?.statusCode || 400, message: error?.message || 'Không thể lưu hồ sơ. Hãy kiểm tra nhật ký trước khi thử lại.', data: false };
    }
  },

  // --- VẬN HÀNH VÒNG ĐỜI GÓI LIỆU TRÌNH (ADMIN FSM) ---

  async _executePackageAction(userPackageId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await adminCommand(`treatment/packages/${encodeURIComponent(userPackageId)}/action`, payload);
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.message?.includes('Cannot POST') || String(err?.message || '').includes('404')) {
        await adminCommand('user_packages/action', {
          ...payload,
          key: { id: userPackageId },
        });
        return;
      }
      throw err;
    }
  },

  async pausePackage(userPackageId: string, reason: string): Promise<ApiResponse<boolean>> {
    try {
      await this._executePackageAction(userPackageId, {
        action: 'pause',
        reason,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã tạm dừng gói liệu trình thành công.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] pausePackage failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể tạm dừng gói liệu trình.',
        data: false,
      };
    }
  },

  async resumePackage(userPackageId: string, reason?: string): Promise<ApiResponse<boolean>> {
    try {
      await this._executePackageAction(userPackageId, {
        action: 'resume',
        reason: reason || 'Mở lại gói liệu trình hoạt động bình thường',
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã kích hoạt lại gói liệu trình thành công.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] resumePackage failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể kích hoạt lại gói liệu trình.',
        data: false,
      };
    }
  },

  async extendPackage(
    userPackageId: string,
    extensionMonths: number,
    reason: string
  ): Promise<ApiResponse<boolean>> {
    try {
      await this._executePackageAction(userPackageId, {
        action: 'extend',
        extensionMonths,
        reason,
      });
      return {
        success: true,
        statusCode: 200,
        message: `Đã gia hạn gói thêm ${extensionMonths} tháng thành công.`,
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] extendPackage failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể gia hạn gói liệu trình.',
        data: false,
      };
    }
  },

  async cancelPackage(userPackageId: string, reason: string): Promise<ApiResponse<boolean>> {
    try {
      await this._executePackageAction(userPackageId, {
        action: 'cancel',
        reason,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã hủy gói liệu trình thành công.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] cancelPackage failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể hủy gói liệu trình.',
        data: false,
      };
    }
  },

  async transferPackage(
    userPackageId: string,
    newCustomerId: string,
    reason: string
  ): Promise<ApiResponse<boolean>> {
    try {
      await this._executePackageAction(userPackageId, {
        action: 'transfer',
        newCustomerId,
        reason,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã chuyển nhượng gói liệu trình sang khách hàng mới thành công.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] transferPackage failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể chuyển nhượng gói liệu trình.',
        data: false,
      };
    }
  },

  async refundPackage(
    userPackageId: string,
    refundAmount: number,
    reason: string
  ): Promise<ApiResponse<boolean>> {
    try {
      await this._executePackageAction(userPackageId, {
        action: 'refund',
        refundAmount,
        reason,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã ghi nhận hoàn tiền gói liệu trình thành công.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] refundPackage failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể hoàn tiền gói liệu trình.',
        data: false,
      };
    }
  },

  // --- HOÀN TÁC BUỔI ĐIỀU TRỊ AN TOÀN (REVERSAL) ---

  async reverseSession(
    journalId: string,
    reason: string,
    idempotencyKey?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      await adminApi('treatment_journal/action', {
        key: { id: journalId },
        action: 'reverse',
        reason,
        idempotencyKey,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã hoàn tác buổi điều trị, hoàn lại số buổi và điều chỉnh đối soát thành công.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] reverseSession failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể hoàn tác buổi điều trị.',
        data: false,
      };
    }
  },

  async approveClinicalSession(journalId: string): Promise<ApiResponse<boolean>> {
    try {
      await adminApi('treatment_journal/action', {
        key: { id: journalId },
        action: 'approve-clinical',
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã duyệt xác nhận chuyên môn cho buổi điều trị.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] approveClinicalSession failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể duyệt xác nhận chuyên môn.',
        data: false,
      };
    }
  },

  async updatePostCareInstructions(
    journalId: string,
    instructions: string
  ): Promise<ApiResponse<boolean>> {
    try {
      await adminApi('treatment_journal/action', {
        key: { id: journalId },
        action: 'update-post-care',
        instructions,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã cập nhật hướng dẫn chăm sóc sau buổi.',
        data: true,
      };
    } catch (err: any) {
      console.error('[treatmentService] updatePostCareInstructions failed:', err);
      return {
        success: false,
        statusCode: err?.status || 400,
        message: err?.message || 'Không thể cập nhật hướng dẫn chăm sóc.',
        data: false,
      };
    }
  },

  // --- SỐ LIỆU DASHBOARD VẬN HÀNH THỰC TẾ ---

  async getTreatmentDashboardStats(branchId?: string): Promise<ApiResponse<any>> {
    try {
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      const stats = await adminApi<any>(`treatment/dashboard-stats${query}`);
      return {
        success: true,
        statusCode: 200,
        message: 'Số liệu dashboard liệu trình trực tiếp từ hệ thống',
        data: stats,
      };
    } catch (err: any) {
      console.warn('[treatmentService] getTreatmentDashboardStats fallback:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi tải số liệu dashboard',
        data: null,
      };
    }
  },

  async getPackageLifecycleLogs(userPackageId: string): Promise<ApiResponse<any[]>> {
    try {
      const res = await adminApi<any>(
        `user_package_lifecycle_logs?filter=${encodeURIComponent(JSON.stringify({ user_package_id: userPackageId }))}&limit=100`
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Lịch sử vòng đời gói',
        data: res?.rows || [],
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: 'Không thể nạp lịch sử vòng đời',
        data: [],
      };
    }
  },

  async getSessionReversals(userPackageId?: string): Promise<ApiResponse<any[]>> {
    try {
      const filter = userPackageId ? `?filter=${encodeURIComponent(JSON.stringify({ user_package_id: userPackageId }))}` : '';
      const res = await adminApi<any>(`treatment_session_reversals${filter}&limit=100`);
      return {
        success: true,
        statusCode: 200,
        message: 'Sổ cái hoàn tác buổi',
        data: res?.rows || [],
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: 'Không thể nạp sổ cái hoàn tác',
        data: [],
      };
    }
  },

  // --- CÁC COMMAND QUẢN LÝ VÒNG ĐỜI BUỔI ĐIỀU TRỊ ---

  async saveTreatmentDraft(
    journalId: string,
    data: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      const res = await adminCommand('treatment_journal/action', {
        key: { id: journalId },
        action: 'save-draft',
        values: data,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã lưu bản nháp nhật ký điều trị.',
        data: res,
      };
    } catch (err: any) {
      console.error('[treatmentService] saveTreatmentDraft failed:', err);
      return {
        success: false,
        statusCode: err?.statusCode || 400,
        message: err?.message || 'Không thể lưu bản nháp nhật ký.',
        data: null,
      };
    }
  },

  async submitTreatmentSession(
    journalId: string,
    data?: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      const res = await adminCommand('treatment_journal/action', {
        key: { id: journalId },
        action: 'submit-session',
        values: data,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã gửi duyệt hồ sơ chuyên môn.',
        data: res,
      };
    } catch (err: any) {
      console.error('[treatmentService] submitTreatmentSession failed:', err);
      return {
        success: false,
        statusCode: err?.statusCode || 400,
        message: err?.message || 'Không thể gửi hồ sơ chuyên môn.',
        data: null,
      };
    }
  },

  async confirmTreatmentSession(
    journalId: string,
    idempotencyKey?: string
  ): Promise<ApiResponse<any>> {
    try {
      const res = await adminCommand('treatment_journal/action', {
        key: { id: journalId },
        action: 'confirm-session',
        idempotencyKey,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Đã xác nhận hoàn thành buổi điều trị và trừ lượt thành công.',
        data: res,
      };
    } catch (err: any) {
      console.error('[treatmentService] confirmTreatmentSession failed:', err);
      return {
        success: false,
        statusCode: err?.statusCode || 400,
        message: err?.message || 'Không thể xác nhận buổi điều trị.',
        data: null,
      };
    }
  },
};
