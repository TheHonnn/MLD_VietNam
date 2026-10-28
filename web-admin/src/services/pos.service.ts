import {
  Invoice,
  PaymentStatus,
  PaymentMethod,
  ApiResponse,
  CashierShift,
  ShiftStatus,
  InvoiceSyncResult,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyWrite } from './adminAdapter';
import { isUuid } from '../utils/searchUtils';

export const posService = {
  async syncInvoices(): Promise<ApiResponse<InvoiceSyncResult | null>> {
    try {
      const result = await supabaseService.syncInvoicesAndRevenue();
      return {
        success: true,
        statusCode: 200,
        message: result ? 'Đồng bộ hóa đơn và doanh thu thành công từ Supabase Cloud' : 'Hóa đơn đã được đồng bộ mới nhất',
        data: result,
      };
    } catch (err) {
      console.error('[posService] syncInvoices error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi đồng bộ hóa đơn từ hệ thống',
        data: null,
      };
    }
  },
  async getInvoices(params?: {
    branchId?: string;
    customerId?: string;
    paymentStatus?: PaymentStatus;
    search?: string;
  }): Promise<ApiResponse<Invoice[]>> {
    try {
      const live = await supabaseService.getInvoices(params?.branchId, params?.customerId);
      let result = live || [];
      if (params?.paymentStatus) {
        result = result.filter((inv) => inv.paymentStatus === params.paymentStatus);
      }
      if (params?.search) {
        const kw = params.search.toLowerCase();
        result = result.filter((inv) =>
          inv.invoiceCode.toLowerCase().includes(kw)
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu hóa đơn từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[posService] getInvoices error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn hóa đơn từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getInvoiceById(id: string): Promise<ApiResponse<Invoice | undefined>> {
    try {
      const live = await supabaseService.getInvoices();
      const found = live?.find((inv) => inv.id === id);
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết hóa đơn từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[posService] getInvoiceById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn chi tiết hóa đơn từ Supabase',
        data: undefined,
      };
    }
  },

  async createInvoice(data: any): Promise<ApiResponse<Invoice>> {
    const validBookingId = isUuid(data.bookingId) ? data.bookingId : null;
    const validUserPackageId = isUuid(data.userPackageId) ? data.userPackageId : null;
    const validEnrollmentId = isUuid(data.enrollmentId) ? data.enrollmentId : null;
    const validCustomerId = isUuid(data.customerId) ? data.customerId : '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e';
    const validBranchId = isUuid(data.branchId) ? data.branchId : 'aaaaaaaa-0001-0001-0001-000000000001';
    const invoiceCode = data.invoiceCode || `HD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const created = await supabaseService.createInvoice({
        invoiceCode,
        branchId: validBranchId,
        customerId: validCustomerId,
        cashierId: isUuid(data.cashierId) ? data.cashierId : 'bbbbbbbb-0001-0001-0001-000000000002',
        bookingId: validBookingId,
        userPackageId: validUserPackageId,
        enrollmentId: validEnrollmentId,
        subtotal: data.subtotal || data.totalAmount || 0,
        discountAmount: data.discountAmount || 0,
        pointsRedeemedAmount: data.pointsRedeemedAmount || 0,
        vatAmount: data.vatAmount || 0,
        totalAmount: data.totalAmount || 0,
        paymentMethod: data.paymentMethod || PaymentMethod.CASH_AT_SPA,
        paymentStatus: data.paymentStatus || PaymentStatus.PAID,
        paidAt: data.paidAt || new Date().toISOString(),
      });

      if (created) {
        return {
          success: true,
          statusCode: 201,
          message: 'Tạo hóa đơn thành công trên Supabase Cloud',
          data: created,
        };
      }
    } catch (err) {
      console.error('[posService] createInvoice error:', err);
    }

    try {
      const sanitizedData = {
        ...data,
        invoiceCode,
        branchId: validBranchId,
        customerId: validCustomerId,
        bookingId: validBookingId,
        userPackageId: validUserPackageId,
        enrollmentId: validEnrollmentId,
      };
      return await legacyWrite<Invoice>('invoices', sanitizedData);
    } catch (fallbackErr) {
      console.error('[posService] createInvoice error:', fallbackErr);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi tạo hóa đơn trên hệ thống',
        data: {} as Invoice,
      };
    }
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    method?: PaymentMethod
  ): Promise<ApiResponse<Invoice>> {
    return legacyWrite<Invoice>('invoices',{paymentStatus:status,...(method?{paymentMethod:method}:{})},id);
  },

  async getActiveShift(branchId?: string): Promise<ApiResponse<CashierShift | null>> {
    try {
      const saved = localStorage.getItem('mld_current_shift');
      if (saved) {
        const parsed = JSON.parse(saved) as CashierShift;
        if (parsed && parsed.status === ShiftStatus.OPEN) {
          if (!branchId || parsed.branchId === branchId) {
            return { success: true, statusCode: 200, message: 'Ca làm việc đang mở', data: parsed };
          }
        }
      }
    } catch (e) {
      console.warn('[posService] Error reading active shift:', e);
    }
    return { success: true, statusCode: 200, message: 'Chưa có ca làm việc nào đang mở', data: null };
  },

  async openShift(data: {
    branchId: string;
    cashierId?: string;
    openingCash: number;
    notes?: string;
  }): Promise<ApiResponse<CashierShift>> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randNum = Math.floor(10 + Math.random() * 90);
    const shiftCode = `CA-${dateStr}-${randNum}`;

    const newShift: CashierShift = {
      id: `shift-${Date.now()}`,
      branchId: data.branchId || 'aaaaaaaa-0001-0001-0001-000000000001',
      cashierId: data.cashierId || 'bbbbbbbb-0001-0001-0001-000000000002',
      shiftCode,
      openingCash: Number(data.openingCash) || 0,
      closingCash: 0,
      systemCash: Number(data.openingCash) || 0,
      cardSales: 0,
      transferSales: 0,
      totalSales: 0,
      discrepancyAmount: 0,
      status: ShiftStatus.OPEN,
      openedAt: now.toISOString(),
      notes: data.notes || '',
    };

    localStorage.setItem('mld_current_shift', JSON.stringify(newShift));
    return {
      success: true,
      statusCode: 201,
      message: `Đã mở ca làm việc ${shiftCode} thành công`,
      data: newShift,
    };
  },

  async closeShift(shiftId: string, data: {
    closingCash: number;
    systemCash: number;
    cardSales: number;
    transferSales: number;
    totalSales: number;
    notes?: string;
  }): Promise<ApiResponse<CashierShift>> {
    let baseShift: CashierShift;
    try {
      const saved = localStorage.getItem('mld_current_shift');
      baseShift = saved ? JSON.parse(saved) : {
        id: shiftId,
        branchId: 'aaaaaaaa-0001-0001-0001-000000000001',
        cashierId: 'bbbbbbbb-0001-0001-0001-000000000002',
        shiftCode: 'CA-DEFAULT',
        openingCash: 0,
        status: ShiftStatus.OPEN,
        openedAt: new Date().toISOString(),
      };
    } catch {
      baseShift = {
        id: shiftId,
        branchId: 'aaaaaaaa-0001-0001-0001-000000000001',
        cashierId: 'bbbbbbbb-0001-0001-0001-000000000002',
        shiftCode: 'CA-DEFAULT',
        openingCash: 0,
        status: ShiftStatus.OPEN,
        openedAt: new Date().toISOString(),
      };
    }

    const discrepancy = Number(data.closingCash) - Number(data.systemCash);
    const updatedShift: CashierShift = {
      ...baseShift,
      closingCash: Number(data.closingCash),
      systemCash: Number(data.systemCash),
      cardSales: Number(data.cardSales),
      transferSales: Number(data.transferSales),
      totalSales: Number(data.totalSales),
      discrepancyAmount: discrepancy,
      status: ShiftStatus.CLOSED,
      closedAt: new Date().toISOString(),
      notes: data.notes || baseShift.notes,
    };

    localStorage.removeItem('mld_current_shift');
    try {
      const history = JSON.parse(localStorage.getItem('mld_closed_shifts') || '[]');
      history.unshift(updatedShift);
      localStorage.setItem('mld_closed_shifts', JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.warn('Error saving closed shift history:', e);
    }

    return {
      success: true,
      statusCode: 200,
      message: `Đã kết ca ${updatedShift.shiftCode} và đối soát hoàn tất`,
      data: updatedShift,
    };
  },

  async getClosedShifts(): Promise<ApiResponse<CashierShift[]>> {
    try {
      const history = JSON.parse(localStorage.getItem('mld_closed_shifts') || '[]');
      return { success: true, statusCode: 200, message: 'Danh sách ca đã đóng', data: history };
    } catch {
      return { success: true, statusCode: 200, message: 'Danh sách ca đã đóng', data: [] };
    }
  },
};
