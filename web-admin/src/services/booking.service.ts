import { Booking, BookingStatus, PaymentStatus, PaymentMethod, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { isUuid } from '../utils/searchUtils';

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

      if (params?.branchId && params.branchId !== 'ALL') {
        result = result.filter((b) => !b.branchId || b.branchId === params.branchId);
      }
      if (params?.customerId) {
        result = result.filter(
          (b) => b.customerId === params.customerId || b.customer?.id === params.customerId
        );
      }
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
      const found = live?.find((b) => b.id === id || b.bookingCode === id);
      return {
        success: Boolean(found),
        statusCode: found ? 200 : 404,
        message: found ? 'Chi tiết lịch hẹn từ Supabase Cloud' : 'Không tìm thấy lịch hẹn',
        data: found,
      };
    } catch (err) {
      console.error('[bookingService] getBookingById error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy thông tin lịch hẹn từ Supabase',
        data: undefined,
      };
    }
  },

  async createBooking(params: {
    bookingCode?: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    branchId?: string;
    assignedRoomId?: string | null;
    assignedBedNumber?: string | null;
    technicianId?: string | null;
    technicianName?: string;
    roomName?: string;
    bookingDate: string; // YYYY-MM-DD
    startTime: string;   // HH:MM:SS
    endTime: string;     // HH:MM:SS
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    baseTotal: number;
    depositAmount?: number;
    finalPrice?: number;
    notes?: string;
    serviceId?: string;
    serviceName?: string;
    durationMinutes?: number;
  }): Promise<ApiResponse<Booking>> {
    const bookingCode = params.bookingCode || `BK-${Date.now().toString().slice(-6)}`;
    const finalPrice = params.finalPrice ?? params.baseTotal ?? 0;
    const discountAmount = params.depositAmount ?? 0;

    try {
      const created = await supabaseService.createBooking({
        bookingCode,
        customerId: params.customerId,
        branchId: params.branchId,
        assignedRoomId: params.assignedRoomId,
        assignedBedNumber: params.assignedBedNumber || params.roomName,
        technicianId: params.technicianId,
        bookingDate: params.bookingDate,
        startTime: params.startTime,
        endTime: params.endTime,
        status: params.status || BookingStatus.CONFIRMED,
        paymentStatus: params.paymentStatus || PaymentStatus.UNPAID,
        paymentMethod: params.paymentMethod || PaymentMethod.CASH_AT_SPA,
        baseTotal: params.baseTotal,
        discountAmount,
        finalPrice,
        bookedForName: params.customerName,
        bookedForPhone: params.customerPhone,
        specialNotes: params.notes,
        serviceId: params.serviceId,
        durationMinutes: params.durationMinutes,
      });

      if (!created) {
        throw new Error('Supabase không thể tạo lịch hẹn');
      }

      return {
        success: true,
        statusCode: 201,
        message: 'Tạo lịch hẹn thành công trên Supabase Cloud',
        data: created,
      };
    } catch (err) {
      console.error('[bookingService] createBooking error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Không thể tạo lịch hẹn trên Supabase Cloud. Vui lòng thử lại.',
        data: {} as Booking,
      };
    }
  },

  async updateBooking(
    id: string,
    updates: {
      status?: BookingStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      technicianId?: string | null;
      assignedRoomId?: string | null;
      assignedBedNumber?: string | null;
    }
  ): Promise<ApiResponse<Booking>> {
    if (!isUuid(id)) {
      return {
        success: false,
        statusCode: 400,
        message: 'ID lịch hẹn không hợp lệ',
        data: {} as Booking,
      };
    }

    try {
      const ok = await supabaseService.updateBooking(id, updates);
      if (ok) {
        const live = await supabaseService.getBookings();
        const updated = live?.find((b) => b.id === id);
        if (updated) {
          return {
            success: true,
            statusCode: 200,
            message: 'Cập nhật lịch hẹn thành công trên Supabase Cloud',
            data: updated,
          };
        }
      }
      throw new Error('Cập nhật lịch hẹn thất bại trên Supabase Cloud');
    } catch (err) {
      console.error('[bookingService] updateBooking error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Không thể cập nhật lịch hẹn trên Supabase Cloud',
        data: {} as Booking,
      };
    }
  },

  async updateBookingStatus(
    id: string,
    status?: BookingStatus,
    paymentStatus?: PaymentStatus,
    paymentMethod?: PaymentMethod
  ): Promise<ApiResponse<Booking>> {
    return this.updateBooking(id, { status, paymentStatus, paymentMethod });
  },

  async deleteBooking(id: string): Promise<ApiResponse<boolean>> {
    try {
      if (isUuid(id)) {
        await supabaseService.deleteBooking(id);
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Xóa lịch hẹn thành công trên Supabase Cloud',
        data: true,
      };
    } catch (err) {
      console.error('[bookingService] deleteBooking error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xóa lịch hẹn trên Supabase Cloud',
        data: false,
      };
    }
  },

  async deleteAllBookings(): Promise<ApiResponse<boolean>> {
    try {
      await supabaseService.deleteAllBookings();
      return {
        success: true,
        statusCode: 200,
        message: 'Đã xóa toàn bộ lịch hẹn trong Supabase Cloud',
        data: true,
      };
    } catch (err) {
      console.error('[bookingService] deleteAllBookings error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xóa toàn bộ lịch hẹn trên Supabase Cloud',
        data: false,
      };
    }
  },
};
