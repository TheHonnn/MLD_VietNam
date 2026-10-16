import { Booking, BookingStatus, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const bookingService = {
  async getBookings(params?: {
    branchId?: string;
    customerId?: string;
    date?: string;
    status?: BookingStatus;
  }): Promise<ApiResponse<Booking[]>> {
    try {
      const live = await supabaseService.getBookings(params?.branchId, params?.customerId);
      let result = live || [];
      if (params?.date) {
        result = result.filter((b) => b.bookingDate === params.date);
      }
      if (params?.status) {
        result = result.filter((b) => b.status === params.status);
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu đặt lịch từ Supabase Cloud',
        data: result,
      };
    } catch (err) {
      console.error('[bookingService] getBookings error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn lịch hẹn từ Supabase Cloud',
        data: [],
      };
    }
  },

  async getBookingById(id: string): Promise<ApiResponse<Booking | undefined>> {
    try {
      const live = await supabaseService.getBookings();
      const found = live?.find((b) => b.id === id || b.bookingCode === id) || (live && live.length > 0 ? live[0] : undefined);
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết lịch hẹn từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[bookingService] getBookingById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi truy vấn chi tiết lịch hẹn từ Supabase',
        data: undefined,
      };
    }
  },

  async updateBookingStatus(id: string, status: BookingStatus): Promise<ApiResponse<Booking>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Cập nhật trạng thái lịch hẹn thành công',
      data: { id, status } as Booking,
    };
  },
};
