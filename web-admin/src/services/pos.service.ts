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
  kind: 'BOOKING' | 'TUITION' | 'PACKAGE' | 'CART';
  requestId?: string;
  expectedTotal?: number;
  discountAmount?: number;
  items?: Array<{ id: string; type: 'SERVICE' | 'PACKAGE' | 'PRODUCT'; quantity: number; serviceId?: string; packageId?: string }>;
  bookingId?: string;
  enrollmentId?: string;
  packageId?: string;
  customerId?: string;
  commissionStaffId?: string;
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

export function effectiveCataloguePrice(item: {price: number; discountPrice?: number | null}) {
  const base = Number(item.price);
  const discount = Number(item.discountPrice);
  return Number.isFinite(discount) && discount > 0 && discount < base ? discount : base;
}

const numericColumns = new Set(['receipt_net_amount','amount','price','discount_price','base_total','final_price','subtotal','total_amount','amount_paid','tuition_total','duration_minutes','total_sessions','completed_sessions','opening_cash','closing_cash','system_cash','transfer_sales','card_sales','total_sales','discrepancy_amount','vat_rate','vat_amount','pre_tax_amount','discount_amount','points_discount','commission_rate','quantity','max_students','enrolled_count','rating_avg','experience_years','price_min','price_max','reward_points','total_spent','deposit_amount']);
function fromDatabase(value: any): any {
  if (Array.isArray(value)) return value.map(fromDatabase);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    numericColumns.has(key) && item !== null ? Number(item) : fromDatabase(item),
  ]));
}

export const posService = {
  async getWorkspace(branchId?: string): Promise<ApiResponse<any>> {
    try {
      const data = await adminCommand<any>('cashier/workspace' + (branchId ? '?branchId=' + encodeURIComponent(branchId) : ''));
      return {success:true,statusCode:200,message:'Đã tải dữ liệu thu ngân.',data:fromDatabase(data)};
    } catch (error) { return failed(error, null); }
  },
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
      let invoices = await supabaseService.getInvoices(params?.branchId, params?.customerId);
      if (invoices === null) return failed(new Error('Không tải được hóa đơn.'), []);
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
      const payload = JSON.stringify(data);
      let pending: Record<string, string> = {};
      try { pending = JSON.parse(sessionStorage.getItem('mld_admin_cashier_requests') || '{}'); } catch {}
      const requestId = data.requestId || pending[payload] || crypto.randomUUID();
      pending[payload] = requestId;
      sessionStorage.setItem('mld_admin_cashier_requests', JSON.stringify(pending));
      const result = await adminCommand<any>('cashier/collect', { ...data, requestId });
      // Preserve other unresolved requests, including a different cart in this tab.
      let latest: Record<string, string> = {};
      try { latest = JSON.parse(sessionStorage.getItem('mld_admin_cashier_requests') || '{}'); } catch {}
      delete latest[payload];
      sessionStorage.setItem('mld_admin_cashier_requests', JSON.stringify(latest));
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

  async createInvoice(_data: unknown): Promise<ApiResponse<Invoice>> {
    return failed(new Error('Hãy dùng luồng thu ngân để tạo và xác nhận hóa đơn cùng lúc.'), {} as Invoice);
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
    cashierId?: string;
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
    data: {
      closingCash: number;
      notes?: string;
      systemCash?: number;
      cardSales?: number;
      transferSales?: number;
      totalSales?: number;
    },
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
