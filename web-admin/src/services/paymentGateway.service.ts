import { apiClient } from './apiClient';
import { ApiResponse } from '../types/shared_types';

export const paymentGatewayService = {
  async createPayosPaymentLink(payload: {
    amount: number;
    description: string;
    orderCode?: number;
    bookingId?: string;
    bookingCode?: string;
    enrollmentId?: string;
    invoiceId?: string;
    invoiceCode?: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const result = await apiClient.post<any>('/payments/create-payos-link', payload);
      return {
        success: true,
        statusCode: 201,
        message: result.message || 'Đã tạo liên kết PayOS.',
        data: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error?.statusCode || 500,
        message: error?.message || 'Không thể tạo liên kết PayOS.',
        data: null,
      };
    }
  },

  async checkPayosStatus(orderCode: number): Promise<ApiResponse<any>> {
    try {
      const result = await apiClient.get<any>(`/payments/payos/status/${encodeURIComponent(String(orderCode))}`);
      return {
        success: true,
        statusCode: 200,
        message: result.message || '',
        data: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error?.statusCode || 500,
        message: error?.message || 'Không thể kiểm tra trạng thái PayOS.',
        data: null,
      };
    }
  },
};
