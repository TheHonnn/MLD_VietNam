import { apiClient } from './apiClient';
import { mockBookings } from './mockData';
import { Booking, BookingStatus, ApiResponse } from '../types/shared_types';

export const bookingService = {
  async getBookings(params?: {
    branchId?: string;
    customerId?: string;
    date?: string;
    status?: BookingStatus;
  }): Promise<ApiResponse<Booking[]>> {
    return apiClient.get<Booking[]>('/bookings', {
      params,
      mockFallback: () => {
        let result = [...mockBookings];
        if (params?.branchId) {
          result = result.filter((b) => b.branchId === params.branchId);
        }
        if (params?.customerId) {
          result = result.filter((b) => b.customerId === params.customerId);
        }
        if (params?.status) {
          result = result.filter((b) => b.status === params.status);
        }
        return result;
      },
    });
  },

  async getBookingById(id: string): Promise<ApiResponse<Booking | undefined>> {
    return apiClient.get<Booking | undefined>(`/bookings/${id}`, {
      mockFallback: () => mockBookings.find((b) => b.id === id),
    });
  },

  async updateBookingStatus(id: string, status: BookingStatus): Promise<ApiResponse<Booking>> {
    return apiClient.patch<Booking>(`/bookings/${id}/status`, { status }, {
      mockFallback: () => {
        const b = mockBookings.find((item) => item.id === id);
        if (b) {
          b.status = status;
        }
        return b;
      },
    });
  },
};
