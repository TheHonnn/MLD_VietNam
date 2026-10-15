import { apiClient } from './apiClient';
import { mockInvoices } from './mockData';
import {
  Invoice,
  PaymentStatus,
  PaymentMethod,
  ApiResponse,
} from '../types/shared_types';

export const posService = {
  async getInvoices(params?: {
    branchId?: string;
    customerId?: string;
    paymentStatus?: PaymentStatus;
    search?: string;
  }): Promise<ApiResponse<Invoice[]>> {
    return apiClient.get<Invoice[]>('/invoices', {
      params,
      mockFallback: () => {
        let result = [...mockInvoices];
        if (params?.branchId) {
          result = result.filter((inv) => inv.branchId === params.branchId);
        }
        if (params?.customerId) {
          result = result.filter((inv) => inv.customerId === params.customerId);
        }
        if (params?.paymentStatus) {
          result = result.filter((inv) => inv.paymentStatus === params.paymentStatus);
        }
        if (params?.search) {
          const kw = params.search.toLowerCase();
          result = result.filter((inv) =>
            inv.invoiceCode.toLowerCase().includes(kw)
          );
        }
        return result;
      },
    });
  },

  async getInvoiceById(id: string): Promise<ApiResponse<Invoice | undefined>> {
    return apiClient.get<Invoice | undefined>(`/invoices/${id}`, {
      mockFallback: () => mockInvoices.find((inv) => inv.id === id),
    });
  },

  async createInvoice(data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    return apiClient.post<Invoice>('/invoices', data, {
      mockFallback: () => {
        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          invoiceCode: `MH-${Date.now().toString().slice(-6)}`,
          branchId: data.branchId || 'b-q3',
          customerId: data.customerId || '',
          subtotal: data.subtotal || 0,
          discountAmount: data.discountAmount || 0,
          pointsRedeemedAmount: data.pointsRedeemedAmount || 0,
          vatAmount: data.vatAmount || 0,
          totalAmount: data.totalAmount || 0,
          paymentMethod: data.paymentMethod || PaymentMethod.CASH_AT_SPA,
          paymentStatus: data.paymentStatus || PaymentStatus.PENDING,
          refundAmount: 0,
          paidAt: data.paidAt || new Date().toISOString(),
          ...data,
        };
        mockInvoices.unshift(newInvoice);
        return newInvoice;
      },
    });
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    method?: PaymentMethod
  ): Promise<ApiResponse<Invoice>> {
    return apiClient.patch<Invoice>(`/invoices/${id}/payment`, {
      paymentStatus: status,
      paymentMethod: method,
    }, {
      mockFallback: () => {
        const inv = mockInvoices.find((item) => item.id === id);
        if (inv) {
          inv.paymentStatus = status;
          if (method) inv.paymentMethod = method;
        }
        return inv;
      },
    });
  },
};
