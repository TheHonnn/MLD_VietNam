import React, { useState, useEffect } from 'react';
import { Branch, SpaService, Appointment, UserProfile } from '@/core/types';
import { SupabaseDataService } from '@/api/supabase';
import { zaloAuthService } from '@/api/zalo-auth-service';
import { Calendar, Clock, MapPin, User, Phone, CheckCircle, ArrowLeft, AlertCircle, FileText, Zap } from 'lucide-react';

export const MINI_APP_SPA_SLOTS = [
  { label: '09:00 – 10:00', startTime: '09:00:00', endTime: '10:00:00' },
  { label: '10:00 – 11:00', startTime: '10:00:00', endTime: '11:00:00' },
  { label: '11:00 – 12:00', startTime: '11:00:00', endTime: '12:00:00' },
  { label: '13:30 – 14:30', startTime: '13:30:00', endTime: '14:30:00' },
  { label: '14:30 – 15:30', startTime: '14:30:00', endTime: '15:30:00' },
  { label: '15:30 – 16:30', startTime: '15:30:00', endTime: '16:30:00' },
  { label: '16:30 – 17:30', startTime: '16:30:00', endTime: '17:30:00' },
  { label: '17:30 – 18:30', startTime: '17:30:00', endTime: '18:30:00' },
  { label: '18:30 – 19:30', startTime: '18:30:00', endTime: '19:30:00' },
  { label: '19:30 – 20:30', startTime: '19:30:00', endTime: '20:30:00' },
];

interface BookingScreenProps {
  branches: Branch[];
  activeBranch: Branch | null;
  services: SpaService[];
  preSelectedService?: SpaService | null;
  currentUser: UserProfile;
  onViewAppointments: () => void;
  onBackToHome: () => void;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({
  branches,
  activeBranch,
  services,
  preSelectedService,
  currentUser,
  onViewAppointments,
  onBackToHome,
}) => {
  // Service selection
  const selectedService = preSelectedService || services[0];
  const [selectedBranch, setSelectedBranch] = useState<Branch>(activeBranch || branches[0]);
  
  // Date: default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);

  const [selectedSlot, setSelectedSlot] = useState(MINI_APP_SPA_SLOTS[0]);
  const [drcSlots, setDrcSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (selectedBranch?.id && selectedDate) {
      setIsLoadingSlots(true);
      SupabaseDataService.getDaySlotsDualAvailability(selectedBranch.id, selectedDate)
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setDrcSlots(data);
          }
        })
        .catch(console.warn)
        .finally(() => setIsLoadingSlots(false));
    }
  }, [selectedBranch?.id, selectedDate]);

  

  // Customer form
  const [customerName, setCustomerName] = useState<string>(
    currentUser.isPhoneVerified && currentUser.fullName ? currentUser.fullName : ''
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    currentUser.isPhoneVerified && currentUser.phone ? currentUser.phone : ''
  );
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickFilling, setIsQuickFilling] = useState(false);

  useEffect(() => {
    if (currentUser.isPhoneVerified) {
      if (currentUser.fullName) setCustomerName(currentUser.fullName);
      if (currentUser.phone) setCustomerPhone(currentUser.phone);
    }
  }, [currentUser]);

  const handleQuickZaloFill = async () => {
    setIsQuickFilling(true);
    try {
      const res = await zaloAuthService.loginWithZalo();
      if (res.success && res.user) {
        setCustomerName(res.user.fullName);
        setCustomerPhone(res.user.phone);
      }
    } catch (e) {
      console.warn('Quick fill error:', e);
    } finally {
      setIsQuickFilling(false);
    }
  };

  // Success Modal
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Pricing calculations
  const price = selectedService?.price || 700000;
  const totalAmount = price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập đầy đủ họ tên và số điện thoại liên hệ!');
      return;
    }

    // Tự động đồng bộ số điện thoại vào Supabase nếu đang ở chế độ khách
    if (!currentUser.isPhoneVerified && customerPhone.trim()) {
      zaloAuthService.syncWithSupabase(customerPhone.trim(), customerName.trim()).catch(console.warn);
    }

    setIsSubmitting(true);
    const code = `MLD-DL-${Date.now().toString().slice(-6)}`;

    const newAppointment: Appointment = {
      id: code,
      bookingCode: code,
      serviceName: selectedService.name,
      serviceImage: selectedService.imageUrl,
      durationMinutes: selectedService.durationMinutes,
      branchName: selectedBranch.name,
      branchAddress: selectedBranch.address,
      branchPhone: selectedBranch.phone,
      specialistName: 'Kỹ thuật viên hệ thống MLD (Least-Busy Dispatch)',
      specialistTitle: 'Chuyên viên Vodder tự động phân bổ',
      specialistAvatar: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
      appointmentDate: selectedDate,
      timeSlot: selectedSlot.label,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      specialNotes: note.trim(),
      totalAmount,
      paymentMethod: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await SupabaseDataService.saveAppointment(newAppointment, {
      branchId: selectedBranch.id,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });

    setIsSubmitting(false);
    setConfirmedBooking(newAppointment);
  };

  return (
    <div className="pb-24 animate-in fade-in duration-300">
      {/* 1. TOP HEADER */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-14 z-20">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-extrabold text-gray-900">Đặt Lịch Trị Liệu All-In-One</h2>
        </div>
        <button
          type="button"
          onClick={onViewAppointments}
          className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg"
        >
          Lịch hẹn của tôi
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* 2. CHỌN CHI NHÁNH */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
          <label className="text-xs font-bold text-gray-800 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Chi nhánh thực hiện
          </label>
          <select
            value={selectedBranch.id}
            onChange={(e) => {
              const b = branches.find((item) => item.id === e.target.value);
              if (b) setSelectedBranch(b);
            }}
            className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} - {b.city}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 pl-1">{selectedBranch.address}</p>
        </div>

        {/* 3. DỊCH VỤ ĐÃ CHỌN */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-800">Dịch vụ trị liệu</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {selectedService.durationMinutes} phút / ca
            </span>
          </div>
          <div className="text-xs font-bold text-gray-900 leading-snug">{selectedService.name}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{selectedService.shortDescription}</div>
        </div>

        {/* 4. CHỌN NGÀY & KHUNG GIỜ */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
          <label className="text-xs font-bold text-gray-800 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Thời gian hẹn
          </label>

          {/* Date Input */}
          <div>
            <span className="text-[11px] text-gray-400 block mb-1">Ngày trị liệu:</span>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-none"
            />
          </div>

          {/* 10 Ca 1 tiếng Dual-Resource Capacity Engine */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Khung giờ ca 1 tiếng:</span>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                Cố định 6 Giường · 6 KTV
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MINI_APP_SPA_SLOTS.map((slot) => {
                const isSelected = selectedSlot.label === slot.label;
                const drc = drcSlots.find((d) => d.slot_time === slot.label || d.slotTime === slot.label);
                const isAvail = drc ? (drc.is_available ?? drc.isAvailable) : true;
                const rem = drc ? (drc.remaining_capacity ?? drc.remainingCapacity ?? 6) : 6;
                const isFull = !isAvail || rem <= 0;

                return (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={isFull}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                        : isFull
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{slot.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                    </div>
                    <div className="text-[10px] mt-0.5">
                      {isFull ? (
                        <span className="text-red-500 font-medium">Hết chỗ</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Còn {rem} chỗ</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. THÔNG TIN KHÁCH HÀNG */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 flex items-center">
              <User className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Thông tin người đặt lịch
            </label>
            {!currentUser.isPhoneVerified && (
              <button
                type="button"
                onClick={handleQuickZaloFill}
                disabled={isQuickFilling}
                className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center space-x-1 cursor-pointer transition"
              >
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{isQuickFilling ? 'Đang lấy SĐT...' : 'Điền nhanh từ Zalo'}</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Họ và tên *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Số điện thoại liên hệ *</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="0901234567"
              required
              className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Ghi chú cho chuyên viên (nếu có)</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Cần dẫn lưu giảm phù sau nâng mũi ngày thứ 5..."
              className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-none"
            />
          </div>
        </div>

        {/* 6. BẢNG TÓM TẮT & PHƯƠNG THỨC THANH TOÁN (Không còn cổng VietQR / voucher thừa) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5">
          <h4 className="text-xs font-bold text-gray-800">Thông tin chi phí</h4>

          <div className="flex justify-between text-xs text-gray-600">
            <span>Chi phí dịch vụ (1 người):</span>
            <span>{price.toLocaleString('vi-VN')}đ</span>
          </div>

          <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-100">
            <span>Tổng chi phí dự kiến:</span>
            <span className="text-emerald-700">{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>


        </div>

        {/* 7. NÚT XÁC NHẬN */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Đang gửi yêu cầu đặt lịch...' : 'Xác nhận đặt lịch'}
        </button>
      </form>

      {/* 8. SUCCESS CONFIRMATION MODAL */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Đặt lịch thành công!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Lịch hẹn ({confirmedBooking.bookingCode}) tại {confirmedBooking.branchName} vào lúc{' '}
                ngày {confirmedBooking.appointmentDate} đã được ghi nhận.
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl text-left text-xs text-gray-700 space-y-1">
              <div><strong>Dịch vụ:</strong> {confirmedBooking.serviceName}</div>
              <div><strong>Khách hàng:</strong> {confirmedBooking.customerName} ({confirmedBooking.customerPhone})</div>
              <div><strong>Chi phí:</strong> {confirmedBooking.totalAmount.toLocaleString('vi-VN')}đ</div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  onViewAppointments();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Xem lịch hẹn của tôi
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  onBackToHome();
                }}
                className="w-full py-2.5 text-gray-500 text-xs font-semibold hover:text-gray-700"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

