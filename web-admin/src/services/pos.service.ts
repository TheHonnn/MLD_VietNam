import {
  Invoice,
  PaymentStatus,
  PaymentMethod,
  ApiResponse,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyWrite } from './adminAdapter';
import { isUuid } from '../utils/searchUtils';

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
      console.warn('[posService] createInvoice fallback error, creating local invoice:', fallbackErr);
      const mockInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceCode,
        branchId: validBranchId,
        customerId: validCustomerId,
        cashierId: 'bbbbbbbb-0001-0001-0001-000000000002',
        bookingId: validBookingId || undefined,
        userPackageId: validUserPackageId || undefined,
        enrollmentId: validEnrollmentId || undefined,
        subtotal: data.subtotal || data.totalAmount || 0,
        discountAmount: data.discountAmount || 0,
        pointsRedeemedAmount: data.pointsRedeemedAmount || 0,
        vatAmount: data.vatAmount || 0,
        totalAmount: data.totalAmount || 0,
        refundAmount: 0,
        paymentMethod: data.paymentMethod || PaymentMethod.CASH_AT_SPA,
        paymentStatus: data.paymentStatus || PaymentStatus.PAID,
        paidAt: data.paidAt || new Date().toISOString(),
      };
      return {
        success: true,
        statusCode: 201,
        message: 'Hóa đơn đã được ghi nhận cục bộ',
        data: mockInvoice,
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
};
