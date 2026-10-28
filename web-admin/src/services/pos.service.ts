import { adminCommand } from '../admin/api';
import {
  ApiResponse,
  CashierShift,
  Invoice,
  InvoiceSyncResult,
  PaymentMethod,
} from '../types/shared_types';
import { supabaseService } from './supabaseService';

export interface CashierCollection {
  kind: 'BOOKING' | 'TUITION' | 'PACKAGE';
  bookingId?: string;
  enrollmentId?: string;
  packageId?: string;
  customerId?: string;
  branchId?: string;
  amount?: number;
  vatRate?: number;
  paymentMethod: PaymentMethod.CASH_AT_SPA | PaymentMethod.BANK_TRANSFER;
  shiftId: string;
  notes?: string;
}

const failed = <T>(error: any, data: T): ApiResponse<T> => ({
  success: false,
  statusCode: error?.statusCode || 500,
  message: error?.message || 'Không thể hoàn tất thao tác thu ngân.',
  data,
});

export const posService = {
  async syncInvoices(): Promise<ApiResponse<InvoiceSyncResult | null>> {
    try {
      const result = await supabaseService.syncInvoicesAndRevenue();
      return {
        success: true,
        statusCode: 200,
        message: 'Đã đồng bộ hóa đơn.',
        data: result,
      };
    } catch (error) {
      return failed(error, null);
    }
  },

  async getInvoices(params?: {
    branchId?: string;
    customerId?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<ApiResponse<Invoice[]>> {
    try {
      let invoices = (await supabaseService.getInvoices(params?.branchId, params?.customerId)) || [];
      if (params?.paymentStatus) {
        invoices = invoices.filter((invoice) => invoice.paymentStatus === params.paymentStatus);
      }
      if (params?.search) {
        const query = params.search.toLowerCase();
        invoices = invoices.filter((invoice) => invoice.invoiceCode.toLowerCase().includes(query));
      }
      return { success: true, statusCode: 200, message: 'Đã tải hóa đơn.', data: invoices };
    } catch (error) {
      return failed(error, []);
    }
  },

  async getInvoiceById(id: string): Promise<ApiResponse<Invoice | undefined>> {
    try {
      const invoices = await supabaseService.getInvoices();
      return {
        success: true,
        statusCode: 200,
        message: 'Đã tải hóa đơn.',
        data: invoices?.find((invoice) => invoice.id === id),
      };
    } catch (error) {
      return failed(error, undefined);
    }
  },

  async collectPayment(data: CashierCollection): Promise<ApiResponse<any>> {
    try {
      const result = await adminCommand<any>('cashier/collect', data);
      return {
        success: true,
        statusCode: 200,
        message: 'Đã ghi nhận khoản thu.',
        data: result,
      };
    } catch (error) {
      return failed(error, null);
    }
  },

  async getActiveShift(branchId?: string): Promise<ApiResponse<CashierShift | null>> {
    try {
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      const shift = await adminCommand<CashierShift | null>(`cashier/shifts/active${query}`);
      return { success: true, statusCode: 200, message: 'Đã tải ca thu ngân.', data: shift };
    } catch (error) {
      return failed(error, null);
    }
  },

  async openShift(data: {
    branchId: string;
    openingCash: number;
    notes?: string;
  }): Promise<ApiResponse<CashierShift>> {
    try {
      const shift = await adminCommand<CashierShift>('cashier/shifts/open', data);
      return { success: true, statusCode: 201, message: 'Đã mở ca.', data: shift };
    } catch (error) {
      return failed(error, {} as CashierShift);
    }
  },

  async closeShift(
    shiftId: string,
    data: { closingCash: number; notes?: string },
  ): Promise<ApiResponse<CashierShift>> {
    try {
      const shift = await adminCommand<CashierShift>(
        `cashier/shifts/${encodeURIComponent(shiftId)}/close`,
        data,
      );
      return { success: true, statusCode: 200, message: 'Đã đóng ca.', data: shift };
    } catch (error) {
      return failed(error, {} as CashierShift);
    }
  },
};
