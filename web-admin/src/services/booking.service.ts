import { Booking, BookingStatus, PaymentStatus, PaymentMethod, ApiResponse, DualSlotAvailability } from '../types/shared_types';
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

  async getDaySlotsDualAvailability(branchId: string, bookingDate: string): Promise<ApiResponse<DualSlotAvailability[]>> {
    try {
      const data = await supabaseService.getDaySlotsDualAvailability(branchId, bookingDate);
      return {
        success: true,
        statusCode: 200,
        message: 'Năng lực phục vụ kép (6 Giường × 6 KTV × Ca 1 Giờ) từ Supabase Cloud',
        data: data || [],
      };
    } catch (err: any) {
      console.error('[bookingService] getDaySlotsDualAvailability error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi kiểm tra khung giờ khả dụng',
        data: [],
      };
    }
  },

  async checkSlotDualAvailability(
    branchId: string,
    bookingDate: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<DualSlotAvailability | null>> {
    try {
      const res = await supabaseService.checkSlotDualAvailability(branchId, bookingDate, startTime, endTime);
      return {
        success: Boolean(res?.isAvailable),
        statusCode: res?.isAvailable ? 200 : 409,
        message: res?.statusText || (res?.isAvailable ? 'Khung giờ còn chỗ phục vụ' : 'Đã hết giường hoặc KTV'),
        data: res,
      };
    } catch (err: any) {
      console.error('[bookingService] checkSlotDualAvailability error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi kiểm tra tình trạng slot',
        data: null,
      };
    }
  },

  async releaseCompletedBookings(branchId?: string): Promise<ApiResponse<{ releasedCount: number; message: string }>> {
    try {
      const res = await supabaseService.releaseCompletedBookings(branchId);
      return {
        success: true,
        statusCode: 200,
        message: res.message,
        data: res,
      };
    } catch (err: any) {
      console.error('[bookingService] releaseCompletedBookings error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi tự động nhả phòng và KTV',
        data: { releasedCount: 0, message: 'Lỗi thực thi' },
      };
    }
  },

  async dispatchLeastBusyTechnician(
    branchId: string,
    bookingDate: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<{ technicianId: string; fullName: string; sessionsToday: number } | null>> {
    try {
      const res = await supabaseService.dispatchLeastBusyTechnician(branchId, bookingDate, startTime, endTime);
      return {
        success: Boolean(res?.technicianId),
        statusCode: res?.technicianId ? 200 : 404,
        message: res?.technicianId
          ? `Đã điều phối KTV ${res.fullName} (ít ca nhất trong ngày: ${res.sessionsToday} ca)`
          : 'Không có KTV nào rảnh trong khung giờ này',
        data: res,
      };
    } catch (err: any) {
      console.error('[bookingService] dispatchLeastBusyTechnician error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi điều phối KTV Least-Busy Dispatch',
        data: null,
      };
    }
  },

  async getAvailableSlots(params: {
    branchId?: string;
    date: string;
    technicianId?: string;
    isAutoAssign?: boolean;
  }): Promise<ApiResponse<DualSlotAvailability[]>> {
    try {
      const branchId = params.branchId || 'aaaaaaaa-0001-0001-0001-000000000001';
      // 1. Tự động giải phóng các ca quá giờ trước
      await supabaseService.releaseCompletedBookings(branchId).catch(() => {});

      // 2. Lấy danh sách 10 ca 1 tiếng với năng lực kép
      const daySlots = await supabaseService.getDaySlotsDualAvailability(branchId, params.date);

      // 3. Nếu chỉ định riêng 1 KTV (không auto-assign), kiểm tra xem KTV đó có bận slot nào không
      if (params.technicianId && !params.isAutoAssign) {
        const bookings = await supabaseService.getBookings(branchId);
        const techBusyTimes = new Set(
          (bookings || [])
            .filter(
              (b) =>
                b.bookingDate === params.date &&
                b.technicianId === params.technicianId &&
                b.status !== BookingStatus.CANCELLED
            )
            .map((b) => b.startTime?.slice(0, 5))
        );

        for (const slot of daySlots) {
          const slotStart = slot.startTime?.slice(0, 5);
          if (techBusyTimes.has(slotStart)) {
            slot.isAvailable = false;
            slot.statusText = 'KTV đã kín lịch';
          }
        }
      }

      // 4. Compact slot recommendation (ưu tiên slot liền kề ca đã có khách)
      for (let i = 0; i < daySlots.length; i++) {
        if (daySlots[i].isAvailable) {
          const prev = daySlots[i - 1];
          const next = daySlots[i + 1];
          const prevHasClients = prev && prev.remainingCapacity < 6;
          const nextHasClients = next && next.remainingCapacity < 6;
          if (prevHasClients || nextHasClients) {
            daySlots[i].isRecommended = true;
            daySlots[i].recommendedTag = 'Khung giờ gợi ý tốt nhất';
          }
        }
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Danh sách khung giờ DRC từ Supabase Cloud',
        data: daySlots,
      };
    } catch (err: any) {
      console.error('[bookingService] getAvailableSlots error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Lỗi lấy danh sách khung giờ',
        data: [],
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
    const targetBranchId = params.branchId || 'aaaaaaaa-0001-0001-0001-000000000001';

    try {
      // 1. Kiểm tra năng lực DRC trước khi đặt
      const drc = await supabaseService.checkSlotDualAvailability(
        targetBranchId,
        params.bookingDate,
        params.startTime,
        params.endTime
      );
      if (drc && !drc.isAvailable) {
        return {
          success: false,
          statusCode: 409,
          message: `Không thể đặt lịch: ${drc.statusText} (Giường trống: ${drc.freeBeds}/6, KTV rảnh: ${drc.freeStaff})`,
          data: {} as Booking,
        };
      }

      // 2. Gán giường trống cố định trong 6 giường (2 VIP + 4 Body)
      const standardBeds = ['G-VIP-01', 'G-VIP-02', 'G-BODY-01', 'G-BODY-02', 'G-BODY-03', 'G-BODY-04'];
      let bedCode = params.assignedBedNumber || params.roomName;
      if (!bedCode) {
        const bookings = await supabaseService.getBookings(targetBranchId);
        const busyBeds = new Set(
          (bookings || [])
            .filter((b) => b.bookingDate === params.bookingDate && b.status !== BookingStatus.CANCELLED)
            .map((b) => b.assignedBedNumber)
            .filter(Boolean)
        );
        bedCode = standardBeds.find((b) => !busyBeds.has(b)) || 'G-BODY-01';
      }

      // 3. Tự động điều phối KTV rảnh có số ca ít nhất nếu không chỉ định riêng (Least-Busy Dispatch)
      let assignedTechId = params.technicianId;
      let assignedTechName = params.technicianName;
      if (!assignedTechId) {
        const dispatched = await supabaseService.dispatchLeastBusyTechnician(
          targetBranchId,
          params.bookingDate,
          params.startTime,
          params.endTime
        );
        if (dispatched) {
          assignedTechId = dispatched.technicianId;
          assignedTechName = dispatched.fullName;
        }
      }

      const created = await supabaseService.createBooking({
        bookingCode,
        customerId: params.customerId,
        branchId: targetBranchId,
        assignedRoomId: params.assignedRoomId,
        assignedBedNumber: bedCode,
        technicianId: assignedTechId,
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
    } catch (err: any) {
      console.error('[bookingService] createBooking error:', err);
      return {
        success: false,
        statusCode: 500,
        message: err?.message || 'Không thể tạo lịch hẹn trên Supabase Cloud. Vui lòng thử lại.',
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
      cancellationReason?: string | null;
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
    paymentMethod?: PaymentMethod,
    cancellationReason?: string | null
  ): Promise<ApiResponse<Booking>> {
    return this.updateBooking(id, { status, paymentStatus, paymentMethod, cancellationReason });
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
