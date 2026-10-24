import { StaffCommission, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const commissionService = {
  async getCommissions(params?: {
    staffId?: string;
    branchId?: string;
    cycleMonth?: string;
    status?: string;
  }): Promise<ApiResponse<StaffCommission[]>> {
    try {
      let queryPath = 'staff_commissions?select=*,staff:users!staff_id(full_name),branch:branches!branch_id(name)&order=created_at.desc';
      if (params?.staffId) queryPath += `&staff_id=eq.${params.staffId}`;
      if (params?.branchId) queryPath += `&branch_id=eq.${params.branchId}`;
      if (params?.cycleMonth) queryPath += `&cycle_month=eq.${params.cycleMonth}`;
      if (params?.status) queryPath += `&status=eq.${params.status}`;

      const raw = await supabaseService.query<any[]>(queryPath);
      if (!raw) return { success: true, statusCode: 200, message: 'Dữ liệu hoa hồng', data: [] };

      const list: StaffCommission[] = raw.map((r) => ({
        id: r.id,
        staffId: r.staff_id,
        branchId: r.branch_id,
        bookingId: r.booking_id,
        invoiceId: r.invoice_id,
        commissionType: r.commission_type,
        baseAmount: Number(r.base_amount),
        percentage: Number(r.percentage),
        commissionAmount: Number(r.commission_amount),
        status: r.status,
        cycleMonth: r.cycle_month,
        notes: r.notes,
        createdAt: r.created_at,
        staffName: r.staff?.full_name || 'Kỹ thuật viên',
        branchName: r.branch?.name || 'Chi nhánh MLD',
      }));

      return {
        success: true,
        statusCode: 200,
        message: 'Tải danh sách hoa hồng KTV thành công',
        data: list,
      };
    } catch (err) {
      console.error('[commissionService] getCommissions error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi tải danh sách hoa hồng',
        data: [],
      };
    }
  },

  async approveCommission(id: string): Promise<ApiResponse<boolean>> {
    try {
      const res = await supabaseService.query<any>(`staff_commissions?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      return {
        success: res !== null,
        statusCode: 200,
        message: 'Đã duyệt hoa hồng thành công',
        data: true,
      };
    } catch (err) {
      console.error('[commissionService] approveCommission error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi duyệt hoa hồng', data: false };
    }
  },

  async bulkApproveCommissions(ids: string[]): Promise<ApiResponse<number>> {
    try {
      let count = 0;
      for (const id of ids) {
        await supabaseService.query<any>(`staff_commissions?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'APPROVED' }),
        });
        count++;
      }
      return {
        success: true,
        statusCode: 200,
        message: `Đã duyệt ${count} khoản hoa hồng`,
        data: count,
      };
    } catch (err) {
      console.error('[commissionService] bulkApproveCommissions error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi duyệt hoa hồng hàng loạt', data: 0 };
    }
  },

  async markPaid(id: string): Promise<ApiResponse<boolean>> {
    try {
      const res = await supabaseService.query<any>(`staff_commissions?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PAID' }),
      });
      return {
        success: res !== null,
        statusCode: 200,
        message: 'Đã xác nhận thanh toán hoa hồng thành công',
        data: true,
      };
    } catch (err) {
      console.error('[commissionService] markPaid error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi cập nhật thanh toán', data: false };
    }
  },

  async createCommission(data: {
    staffId: string;
    branchId: string;
    bookingId?: string | null;
    invoiceId?: string | null;
    commissionType: 'SERVICE_DIRECT' | 'PACKAGE_UPSELL' | 'CSAT_BONUS';
    baseAmount: number;
    percentage: number;
    notes?: string;
  }): Promise<ApiResponse<StaffCommission | null>> {
    try {
      const commissionAmount = Math.round((data.baseAmount * data.percentage) / 100);
      const now = new Date();
      const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const payload = {
        staff_id: data.staffId,
        branch_id: data.branchId,
        booking_id: data.bookingId || null,
        invoice_id: data.invoiceId || null,
        commission_type: data.commissionType,
        base_amount: data.baseAmount,
        percentage: data.percentage,
        commission_amount: commissionAmount,
        status: 'PENDING_APPROVAL',
        cycle_month: cycleMonth,
        notes: data.notes || '',
      };

      const res = await supabaseService.query<any[]>('staff_commissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res || res.length === 0) return { success: false, statusCode: 400, message: 'Không thể tạo hoa hồng', data: null };

      return {
        success: true,
        statusCode: 201,
        message: 'Ghi nhận hoa hồng KTV thành công',
        data: {
          id: res[0].id,
          staffId: res[0].staff_id,
          branchId: res[0].branch_id,
          bookingId: res[0].booking_id,
          invoiceId: res[0].invoice_id,
          commissionType: res[0].commission_type,
          baseAmount: Number(res[0].base_amount),
          percentage: Number(res[0].percentage),
          commissionAmount: Number(res[0].commission_amount),
          status: res[0].status,
          cycleMonth: res[0].cycle_month,
          notes: res[0].notes,
          createdAt: res[0].created_at,
        },
      };
    } catch (err) {
      console.error('[commissionService] createCommission error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi ghi nhận hoa hồng', data: null };
    }
  },
};
