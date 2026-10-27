import React, { useState, useEffect } from 'react';
import { Appointment } from '@/core/types';
import { SupabaseDataService } from '@/api/supabase';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, ArrowLeft, Plus } from 'lucide-react';

interface AppointmentsScreenProps {
  onBack: () => void;
  onBookNew: () => void;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({ onBack, onBookNew }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);

  useEffect(() => {
    const list = SupabaseDataService.getStoredAppointments();
    setAppointments(list);
  }, []);

  const upcomingList = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const historyList = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  const currentList = activeTab === 'upcoming' ? upcomingList : historyList;

  return (
    <div className="pb-24 animate-in fade-in duration-300">
      {/* 1. APPBAR */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-14 z-20">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-extrabold text-gray-900">Lịch Hẹn Của Tôi</h2>
        </div>
        <button
          type="button"
          onClick={onBookNew}
          className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-xl flex items-center shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Đặt mới
        </button>
      </div>

      {/* 2. TABS */}
      <div className="bg-white p-2 border-b border-gray-100 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'upcoming'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Sắp tới ({upcomingList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Lịch sử ({historyList.length})
        </button>
      </div>

      {/* 3. LIST APPOINTMENTS */}
      <div className="p-4 space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-gray-900">Chưa có lịch hẹn nào</div>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Bạn chưa có lịch hẹn trị liệu nào trong mục này. Hãy đặt lịch trị liệu dẫn lưu bạch huyết Vodder ngay.
            </p>
            <button
              type="button"
              onClick={onBookNew}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Đặt lịch ngay
            </button>
          </div>
        ) : (
          currentList.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs hover:border-blue-200 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {app.bookingCode}
                </span>
                <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {app.status === 'pending'
                    ? 'Chờ xác nhận'
                    : app.status === 'confirmed'
                    ? 'Đã xác nhận'
                    : 'Hoàn thành'}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-900 line-clamp-1">{app.serviceName}</h3>
                <div className="flex items-center text-xs text-gray-600 mt-1 space-x-2">
                  <span className="flex items-center text-blue-600 font-semibold">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {app.timeSlot}
                  </span>
                  <span>•</span>
                  <span>{app.appointmentDate}</span>
                </div>
              </div>

              <div className="text-[11px] text-gray-500 flex items-start space-x-1.5 pt-2 border-t border-gray-50">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span className="truncate">{app.branchName}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400">Tổng thanh toán:</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {app.totalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. DETAIL MODAL (C10) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedApp(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />

            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Mã: {selectedApp.bookingCode}
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Chờ duyệt
              </span>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-gray-900">{selectedApp.serviceName}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Thời lượng: {selectedApp.durationMinutes} phút</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 text-xs text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-400">Thời gian hẹn:</span>
                <span className="font-bold">{selectedApp.timeSlot} · {selectedApp.appointmentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cơ sở:</span>
                <span className="font-bold text-right max-w-[200px]">{selectedApp.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Địa chỉ:</span>
                <span className="text-right max-w-[200px] text-gray-500">{selectedApp.branchAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hotline:</span>
                <span className="font-bold text-blue-600">{selectedApp.branchPhone}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-400">Khách hàng:</span>
                <span className="font-bold">{selectedApp.customerName} ({selectedApp.customerPhone})</span>
              </div>
              {selectedApp.specialNotes && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Ghi chú:</span>
                  <span className="text-gray-600 italic">{selectedApp.specialNotes}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                <span>Tổng chi phí:</span>
                <span className="text-emerald-700">{selectedApp.totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1">
                Phương thức: {selectedApp.paymentMethod}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedApp(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 rounded-xl"
            >
              Đóng chi tiết
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

