import {
  Invoice,
  PaymentStatus,
  PaymentMethod,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyWrite } from './adminAdapter';

export const posService = {
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
    try {
      const created = await supabaseService.createInvoice({
        invoiceCode: data.invoiceCode || `HD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
        branchId: data.branchId || 'aaaaaaaa-0001-0001-0001-000000000001',
        customerId: data.customerId || '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        cashierId: data.cashierId || 'bbbbbbbb-0001-0001-0001-000000000002',
        bookingId: data.bookingId || null,
        userPackageId: data.userPackageId || null,
        enrollmentId: data.enrollmentId || null,
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
    return legacyWrite<Invoice>('invoices', data);
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    method?: PaymentMethod
  ): Promise<ApiResponse<Invoice>> {
    return legacyWrite<Invoice>('invoices',{paymentStatus:status,...(method?{paymentMethod:method}:{})},id);
  },
};
