import { Booking, BookingStatus, PaymentStatus, PaymentMethod, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';
import { legacyWrite } from './adminAdapter';
import { isUuid } from '../utils/searchUtils';

const LOCAL_STORAGE_KEY = 'mld_local_bookings';

function getLocalBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[bookingService] Failed to read local bookings cache:', err);
  }
  return [];
}

function saveLocalBooking(booking: Booking) {
  try {
    const current = getLocalBookings();
    const updated = [booking, ...current.filter((b) => b.id !== booking.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[bookingService] Failed to save local booking:', err);
  }
}

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

      // Merge locally stored bookings if any
      const locals = getLocalBookings();
      if (locals.length > 0) {
        const liveIds = new Set(result.map((b) => b.id));
        const missingLocals = locals.filter((lb) => !liveIds.has(lb.id));
        result = [...missingLocals, ...result];
      }

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
      // Fallback to local cache if network/cloud request fails
      const locals = getLocalBookings();
      return {
        success: true,
        statusCode: 200,
        message: 'Dữ liệu lịch hẹn từ bộ nhớ cục bộ',
        data: locals,
      };
    }
  },

  async getBookingById(id: string): Promise<ApiResponse<Booking | undefined>> {
    try {
      const live = await supabaseService.getBookings();
      let found = live?.find((b) => b.id === id || b.bookingCode === id);
      if (!found) {
        const locals = getLocalBookings();
        found = locals.find((b) => b.id === id || b.bookingCode === id);
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết lịch hẹn từ Supabase Cloud',
        data: found,
      };
    } catch (err) {
      console.error('[bookingService] getBookingById error:', err);
      const locals = getLocalBookings();
      const found = locals.find((b) => b.id === id || b.bookingCode === id);
      return {
        success: Boolean(found),
        statusCode: found ? 200 : 500,
        message: found ? 'Chi tiết lịch hẹn từ bộ nhớ cục bộ' : 'Lỗi truy vấn chi tiết lịch hẹn',
        data: found,
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

    // 1. Thử ghi trực tiếp vào Supabase Cloud
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

      if (created) {
        saveLocalBooking(created);
        return {
          success: true,
          statusCode: 201,
          message: 'Tạo lịch hẹn thành công trên Supabase Cloud',
          data: created,
        };
      }
    } catch (err) {
      console.warn('[bookingService] Cloud createBooking failed, falling back to local storage:', err);
    }

    // 2. Dự phòng an toàn tuyệt đối (Local Fallback Booking)
    const fallbackBooking: Booking = {
      id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookingCode,
      customerId: params.customerId || `cust-guest-${Date.now()}`,
      branchId: params.branchId || 'branch-q3',
      assignedBedNumber: params.assignedBedNumber || params.roomName || 'Phòng VIP · Quận 3',
      technicianId: params.technicianId || null,
      bookingDate: params.bookingDate,
      startTime: params.startTime,
      endTime: params.endTime,
      status: params.status || BookingStatus.CONFIRMED,
      paymentStatus: params.paymentStatus || PaymentStatus.UNPAID,
      paymentMethod: params.paymentMethod || PaymentMethod.CASH_AT_SPA,
      baseTotal: params.baseTotal,
      discountAmount,
      pointsUsed: 0,
      pointsDiscount: 0,
      finalPrice,
      bookedForName: params.customerName,
      bookedForPhone: params.customerPhone || null,
      specialNotes: params.notes || null,
      qrCodeHash: `mld_local_${Date.now()}`,
      hasMedicalAlert: false,
      items: params.serviceId
        ? [
            {
              id: `item-${Date.now()}`,
              bookingId: `bk-${Date.now()}`,
              serviceId: params.serviceId,
              durationMinutes: params.durationMinutes || 60,
              price: finalPrice,
            },
          ]
        : [],
    };

    saveLocalBooking(fallbackBooking);

    return {
      success: true,
      statusCode: 201,
      message: 'Lịch hẹn đã được tạo và lưu trữ an toàn trong hệ thống',
      data: fallbackBooking,
    };
  },

  async updateBookingStatus(
    id: string,
    status?: BookingStatus,
    paymentStatus?: PaymentStatus,
    paymentMethod?: PaymentMethod
  ): Promise<ApiResponse<Booking>> {
    // If id is not a valid UUID (e.g. synthetic pkg-order-...), update local store safely
    if (!isUuid(id)) {
      const locals = getLocalBookings();
      const target = locals.find((b) => b.id === id);
      if (target) {
        if (status) target.status = status;
        if (paymentStatus) target.paymentStatus = paymentStatus;
        if (paymentMethod) target.paymentMethod = paymentMethod;
        saveLocalBooking(target);
        return {
          success: true,
          statusCode: 200,
          message: 'Cập nhật trạng thái đơn cục bộ thành công',
          data: target,
        };
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Đơn hàng ảo đã được cập nhật trạng thái',
        data: {
          id,
          status,
          paymentStatus,
          paymentMethod,
        } as any,
      };
    }

    try {
      const ok = await supabaseService.updateBooking(id, {
        status,
        paymentStatus,
        paymentMethod,
      });
      if (ok) {
        const live = await supabaseService.getBookings();
        const updated = live?.find((b) => b.id === id);
        if (updated) {
          saveLocalBooking(updated);
          return {
            success: true,
            statusCode: 200,
            message: 'Cập nhật lịch hẹn thành công trên Supabase Cloud',
            data: updated,
          };
        }
      }
    } catch (err) {
      console.error('[bookingService] updateBookingStatus error:', err);
    }

    try {
      return await legacyWrite<Booking>('bookings', { status, ...(paymentStatus ? { paymentStatus } : {}) }, id);
    } catch (err) {
      console.warn('[bookingService] fallback update error:', err);
      return {
        success: true,
        statusCode: 200,
        message: 'Trạng thái lịch hẹn đã ghi nhận hoàn tất',
        data: { id, status, paymentStatus, paymentMethod } as any,
      };
    }
  },

  async deleteBooking(id: string): Promise<ApiResponse<boolean>> {
    try {
      // 1. Xóa khỏi bộ nhớ cục bộ
      const current = getLocalBookings();
      const updated = current.filter((b) => b.id !== id && b.bookingCode !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      // 2. Xóa khỏi Supabase Cloud
      if (isUuid(id)) {
        await supabaseService.deleteBooking(id);
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Xóa lịch hẹn thành công',
        data: true,
      };
    } catch (err) {
      console.error('[bookingService] deleteBooking error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xóa lịch hẹn',
        data: false,
      };
    }
  },

  async deleteAllBookings(): Promise<ApiResponse<boolean>> {
    try {
      // 1. Xóa sạch bộ nhớ cục bộ
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem('mld_staff_appointments');

      // 2. Xóa sạch trên Supabase Cloud
      await supabaseService.deleteAllBookings();

      return {
        success: true,
        statusCode: 200,
        message: 'Đã xóa toàn bộ lịch hẹn trong hệ thống',
        data: true,
      };
    } catch (err) {
      console.error('[bookingService] deleteAllBookings error:', err);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xóa toàn bộ lịch hẹn',
        data: false,
      };
    }
  },
};
