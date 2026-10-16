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

  async createInvoice(data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    return legacyWrite<Invoice>('invoices',data);
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    method?: PaymentMethod
  ): Promise<ApiResponse<Invoice>> {
    return legacyWrite<Invoice>('invoices',{paymentStatus:status,...(method?{paymentMethod:method}:{})},id);
  },
};
