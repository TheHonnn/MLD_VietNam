import {
  Invoice,
  PaymentStatus,
  PaymentMethod,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';

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
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceCode: `HD-${Date.now().toString().slice(-6)}`,
      branchId: data.branchId || '',
      customerId: data.customerId || '',
      subtotal: data.subtotal || 0,
      discountAmount: data.discountAmount || 0,
      pointsRedeemedAmount: data.pointsRedeemedAmount || 0,
      vatAmount: data.vatAmount || 0,
      totalAmount: data.totalAmount || 0,
      paymentMethod: data.paymentMethod || PaymentMethod.CASH_AT_SPA,
      paymentStatus: data.paymentStatus || PaymentStatus.PENDING,
      paidAt: data.paidAt || new Date().toISOString(),
      refundAmount: data.refundAmount || 0,
      ...data,
    };
    return {
      success: true,
      statusCode: 201,
      message: 'Tạo hóa đơn thành công',
      data: newInvoice,
    };
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    method?: PaymentMethod
  ): Promise<ApiResponse<Invoice>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Cập nhật trạng thái thanh toán thành công',
      data: { id, paymentStatus: status, paymentMethod: method } as Invoice,
    };
  },
};
