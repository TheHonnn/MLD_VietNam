import React from 'react';
import { Box, Text, Modal } from 'zmp-ui';
import { Booking } from '../../../../backend/src/data/database';
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon, QrCodeIcon } from './Icons';

interface ETicketGroupCProps {
  booking: Booking | null;
  onClose: () => void;
  onGoToAppointments: () => void;
}

export const ETicketGroupC: React.FC<ETicketGroupCProps> = ({
  booking,
  onClose,
  onGoToAppointments,
}) => {
  if (!booking) return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
      <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center gap-3 shadow-xs shrink-0">
        <button onClick={onClose} aria-label="Quay lại" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button>
        <h2 className="text-sm font-bold text-[#40352F]">Vé hẹn điện tử (E-Ticket)</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 text-center">
        {/* Success Icon */}
        <Box className="w-16 h-16 mx-auto rounded-full bg-[#FAF6F0] text-[#98501B] flex items-center justify-center shadow-inner border border-[#EADECF]">
          <CheckIcon size={32} className="text-[#98501B]" strokeWidth={2.5} />
        </Box>

        <Box className="space-y-1">
          <Text className="text-base font-extrabold text-[#40352F]">
            Đặt Lịch Khám Thành Công!
          </Text>
          <Text className="text-xs text-stone-500">
            Phiếu khám điện tử đã được kích hoạt trên hệ thống Kiosk MLD
          </Text>
        </Box>

        {/* E-Ticket Card (Figma Group C Pass) */}
        <Box className="p-4 rounded-3xl bg-gradient-to-b from-[#FAF6F0] to-[#F5ECE0] border border-[#EADECF] shadow-sm text-left space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#98501B]/5 rounded-full blur-xl pointer-events-none" />

          {/* Code Header */}
          <Box className="flex items-center justify-between border-b border-[#EADECF] pb-2">
            <Box>
              <Text className="text-[10px] text-stone-400 uppercase font-bold">Mã vé khám (E-Ticket)</Text>
              <Text className="text-sm font-black text-[#98501B] tracking-wider">
                {booking.code}
              </Text>
            </Box>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block mr-1"></span>
              Đã xác nhận
            </span>
          </Box>

          {/* Details */}
          <Box className="space-y-1.5 text-xs">
            <Box className="flex justify-between">
              <span className="text-stone-500">Dịch vụ:</span>
              <span className="font-bold text-[#40352F] text-right max-w-[170px] truncate">
                {booking.serviceTitle}
              </span>
            </Box>
            <Box className="flex justify-between">
              <span className="text-stone-500">Bác sĩ phụ trách:</span>
              <span className="font-bold text-[#40352F]">{booking.doctorName}</span>
            </Box>
            <Box className="flex justify-between">
              <span className="text-stone-500">Thời gian:</span>
              <span className="font-bold text-[#98501B]">{booking.timeSlot} • {booking.date}</span>
            </Box>
            <Box className="flex justify-between">
              <span className="text-stone-500">Địa điểm:</span>
              <span className="font-bold text-[#40352F] text-right max-w-[170px] truncate">
                {booking.branchName}
              </span>
            </Box>
          </Box>

          {/* QR Code */}
          <Box className="pt-2 border-t border-dashed border-[#EADECF] flex flex-col items-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${booking.code}`}
              alt="QR Code"
              className="w-32 h-32 rounded-xl p-1 bg-white border border-[#EADECF] shadow-sm"
            />
            <Text className="text-[10px] text-stone-400 mt-1.5">
              Quét mã này tại Kiosk bệnh viện để nhận số thứ tự ưu tiên
            </Text>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box className="space-y-2 pt-1">
          <button
            onClick={() => {
              onClose();
              onGoToAppointments();
            }}
            className="w-full py-2.5 rounded-xl bg-[#98501B] hover:bg-[#804215] text-white text-xs font-bold shadow-md shadow-[#98501B]/20 active:scale-95 transition flex items-center justify-center space-x-1.5"
          >
            <span>Xem Danh Sách Lịch Hẹn Của Tôi</span>
            <ArrowRightIcon size={14} />
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
          >
            Đóng
          </button>
        </Box>
      </div>
    </div>
  );
};
