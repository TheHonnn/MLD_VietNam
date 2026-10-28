import React, { useState } from 'react';
import { Branch, SpaService, Appointment, UserProfile } from '@/core/types';
import { SupabaseDataService } from '@/api/supabase';
import { Calendar, Clock, MapPin, User, Phone, CheckCircle, ArrowLeft, AlertCircle, FileText } from 'lucide-react';

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

  

  // Customer form
  const [customerName, setCustomerName] = useState<string>(currentUser.fullName || 'Khách hàng MLD');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser.phone || '0967786399');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Pricing calculations
  const price = selectedService?.price || 700000;
  const totalAmount = price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập đầy đủ họ tên và số điện thoại!');
      return;
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
      specialistName: 'Kỹ thuật viên hệ thống MLD',
      specialistTitle: 'Chuyên viên Vodder tự động phân bổ',
      specialistAvatar: 'https://images.unsplash.com/photo-1594824813633-4f90bf4a8585',
      appointmentDate: selectedDate,
      timeSlot: 'Trong ngày',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      specialNotes: note.trim(),
      totalAmount,
      paymentMethod: 'Thanh toán tại cơ sở / QR',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    SupabaseDataService.saveAppointment(newAppointment);

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBooking(newAppointment);
    }, 400);
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
        </div>

        {/* 5. THÔNG TIN KHÁCH HÀNG */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
          <label className="text-xs font-bold text-gray-800 flex items-center">
            <User className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Thông tin người đặt lịch
          </label>

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
            <span>Tổng thanh toán:</span>
            <span className="text-emerald-700">{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 text-[11px] text-blue-900 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Hình thức: <strong>Thanh toán trực tiếp tại cơ sở / QR</strong></span>
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

