import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Printer,
  Send,
  User,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  FileText,
  AlertOctagon,
  Check,
  X,
} from 'lucide-react';
import { Row } from './api';
import { toast } from '../components/common';
import { SUPABASE_URL, getSupabaseHeaders } from '../services/supabaseClient';

export const COMMON_FOCUS_AREAS = [
  'Cổ vai gáy',
  'Vùng lưng',
  'Thắt lưng',
  'Bắp chân',
  'Đầu & Trán',
  'Cánh tay',
  'Bàn chân',
  'Bụng eo',
];

interface ConsultationSurveySheetProps {
  row: Row;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ConsultationSurveySheet: React.FC<ConsultationSurveySheetProps> = ({
  row,
  onClose,
  onRefresh,
}) => {
  const [techNote, setTechNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [existingNotes, setExistingNotes] = useState<string | null>(null);

  const custName = row.customer_name || row.customer?.full_name || 'Khách hàng';
  const custPhone = row.customer_phone || row.customer?.phone || '';
  const avatar = row.customer_avatar || row.customer?.avatar_url;
  const bookingCode = row.booking_code || row.bookings?.booking_code || (typeof row.booking_id === 'string' && row.booking_id.startsWith('BK-') ? row.booking_id : null);
  const bookingId = row.booking_id;
  const bookingDate = row.booking_date || row.bookings?.booking_date;
  const bookingTime = row.booking_time || row.bookings?.start_time;
  const bookingStatus = row.booking_status || row.bookings?.status;

  const focusAreas = Array.isArray(row.focus_areas)
    ? row.focus_areas
    : typeof row.focus_areas === 'string' && row.focus_areas.length > 0
      ? row.focus_areas.split(',').map((s: string) => s.trim())
      : ['Toàn thân thư giãn'];

  const pressure = String(row.pressure_pref || '').toUpperCase();
  const isSensitive = Boolean(row.has_sensitive_skin);
  const hasAllergy = Boolean(row.has_oil_allergy);
  const allergyDetails = row.allergy_details;
  const medicalConds = Array.isArray(row.medical_conditions)
    ? row.medical_conditions.join(', ')
    : typeof row.medical_conditions === 'string'
      ? row.medical_conditions
      : '';
  const specialRequests = row.special_requests;

  // Load existing special_notes of booking if available
  useEffect(() => {
    if (!bookingId) return;
    fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=special_notes,checkin_notes`, {
      headers: getSupabaseHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const notes = data[0].special_notes || data[0].checkin_notes;
          if (notes) setExistingNotes(notes);
        }
      })
      .catch(() => {});
  }, [bookingId]);

  const handleSendTechNote = async () => {
    if (!bookingId) {
      toast.error('Lỗi', 'Phiếu khảo sát này chưa liên kết với mã lịch hẹn cụ thể.');
      return;
    }
    if (!techNote.trim()) {
      toast.warning('Thiếu nội dung', 'Vui lòng nhập nội dung dặn dò kỹ thuật viên.');
      return;
    }

    setIsSendingNote(true);
    try {
      const fullNote = existingNotes
        ? `${existingNotes}\n[Dặn dò KTV ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}]: ${techNote.trim()}`
        : `[Dặn dò KTV ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}]: ${techNote.trim()}`;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }),
        body: JSON.stringify({
          special_notes: fullNote,
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể cập nhật dặn dò ca làm việc.');
      }

      setExistingNotes(fullNote);
      setTechNote('');
      setShowNoteInput(false);
      toast.success('Đã gửi dặn dò', 'Nội dung đã được đồng bộ trực tiếp vào ca làm việc của chuyên viên.');
      onRefresh?.();
    } catch (err: any) {
      toast.error('Lỗi gửi dặn dò', err.message || 'Có lỗi xảy ra khi lưu ghi chú.');
    } finally {
      setIsSendingNote(false);
    }
  };

  return (
    <div className="consultation-sheet space-y-4 max-w-2xl mx-auto w-full text-xs">
      {/* 1. Header Hero with Customer & Booking summary */}
      <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={custName}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#E8DFD8] shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FAF0E4] text-[#985018] font-black text-base flex items-center justify-center border-2 border-[#E8DFD8] shrink-0">
              {custName.slice(0, 1)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-[#2C241E]">{custName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
                Hồ sơ lâm sàng
              </span>
            </div>
            <div className="text-xs text-[#73675F] mt-0.5 flex flex-wrap items-center gap-2">
              {custPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#985018]" />
                  <strong className="text-[#2C241E]">{custPhone}</strong>
                </span>
              )}
              <span>•</span>
              <span>
                Ngày tạo:{' '}
                {row.created_at
                  ? new Intl.DateTimeFormat('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(new Date(row.created_at))
                  : 'Vừa xong'}
              </span>
            </div>
          </div>
        </div>

        {/* Linked Booking Badge & Quick Jump */}
        {bookingCode ? (
          <div className="flex flex-col sm:items-end gap-1">
            <a
              href={`/staff-schedule?booking=${encodeURIComponent(bookingCode)}`}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF4EE] border border-[#D8BDA7] text-[#904206] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
              title="Mở ca hẹn trên Lịch trình chuyên viên"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lịch hẹn {bookingCode}</span>
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
            </a>
            {bookingDate && (
              <span className="text-[10.5px] text-[#73675F]">
                {bookingTime ? `${bookingTime.slice(0, 5)} · ` : ''}
                {bookingDate}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#8C7A6B] bg-white px-2.5 py-1 rounded-lg border border-[#E8DFD8]">
            Chưa gán ca hẹn
          </span>
        )}
      </div>

      {/* 2. Medical Safety & Clinical Alerts Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Box Da nhạy cảm */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isSensitive
              ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]'
              : 'bg-[#FAF8F5] border-[#EFE4D9] text-[#73675F]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
              <span>🩺</span> Tình trạng da
            </span>
            {isSensitive ? (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                ⚠️ Da nhạy cảm
              </span>
            ) : (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[#E8F6ED] text-[#166534]">
                ✓ Bình thường
              </span>
            )}
          </div>
          <p className="text-[11.5px] leading-relaxed">
            {isSensitive
              ? 'Khách có làn da dễ kích ứng hoặc nhạy cảm. Yêu cầu chuyên viên sử dụng dòng mỹ phẩm phục hồi Hydro-Care dịu nhẹ, không xoa xát mạnh.'
              : 'Khách không có phản ứng nhạy cảm đặc biệt với sản phẩm chăm sóc tiêu chuẩn.'}
          </p>
        </div>

        {/* Box Dị ứng tinh dầu */}
        <div
          className={`p-3.5 rounded-2xl border ${
            hasAllergy
              ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
              : 'bg-[#FAF8F5] border-[#EFE4D9] text-[#73675F]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
              <span>🌿</span> Dị ứng tinh dầu
            </span>
            {hasAllergy ? (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-[#DC2626] text-white">
                ⛔ Dị ứng tinh dầu
              </span>
            ) : (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[#E8F6ED] text-[#166534]">
                ✓ An toàn
              </span>
            )}
          </div>
          <p className="text-[11.5px] leading-relaxed">
            {hasAllergy
              ? `CẢNH BÁO LÂM SÀNG: Khách bị dị ứng tinh dầu. Loại dị ứng: ${allergyDetails || 'Chưa ghi chú cụ thể - Cần hỏi kỹ trước khi xông phòng!'}`
              : 'Khách có thể sử dụng các loại tinh dầu trị liệu tiêu chuẩn (Sả chanh, Oải hương, Gừng ấm...).'}
          </p>
        </div>
      </div>

      {/* 3. Therapeutic Focus & Pressure Preferences */}
      <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-4 space-y-3">
        <div className="text-xs font-bold text-[#3E200C] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#985018]" />
          <span>Chỉ định kỹ thuật & Sở thích trị liệu</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Focus Areas */}
          <div>
            <label className="text-[11px] font-bold text-[#73675F] block mb-1.5">
              Vùng cần tập trung chăm sóc sâu:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {focusAreas.map((a: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] shadow-2xs"
                >
                  ✓ {a}
                </span>
              ))}
            </div>
          </div>

          {/* Pressure Preference */}
          <div>
            <label className="text-[11px] font-bold text-[#73675F] block mb-1.5">
              Lực massage mong muốn:
            </label>
            <div>
              {pressure === 'STRONG' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                  <span>💪</span>
                  <span>Lực mạnh (Bấm huyệt sâu, giải bó cơ)</span>
                </div>
              ) : pressure === 'LIGHT' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F6ED] text-[#0D6832] border border-[#BDE8CD]">
                  <span>🍃</span>
                  <span>Nhẹ nhàng (Thư giãn, xoa vuốt êm ái)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
                  <span>⚡</span>
                  <span>Vừa phải (Lực chuẩn y khoa tiêu chuẩn)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Medical conditions */}
        {medicalConds && (
          <div className="pt-2 border-t border-[#EFE4D9]">
            <label className="text-[11px] font-bold text-[#73675F] block mb-1">
              Tiền sử bệnh lý / Lưu ý sức khỏe:
            </label>
            <div className="text-xs text-[#2C241E] bg-white p-2.5 rounded-xl border border-[#E8DFD8]">
              {medicalConds}
            </div>
          </div>
        )}

        {/* Special requests */}
        {specialRequests && (
          <div className="pt-2 border-t border-[#EFE4D9]">
            <label className="text-[11px] font-bold text-[#73675F] block mb-1">
              Yêu cầu đặc biệt từ khách hàng:
            </label>
            <div className="text-xs text-[#2C241E] bg-white p-2.5 rounded-xl border border-[#E8DFD8] italic">
              "{specialRequests}"
            </div>
          </div>
        )}
      </div>

      {/* 4. Technician Notes & Handover Box */}
      <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-[#3E200C] flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-[#985018]" />
            <span>Dặn dò Kỹ thuật viên cho ca phục vụ</span>
          </div>
          {bookingId && !showNoteInput && (
            <button
              type="button"
              onClick={() => setShowNoteInput(true)}
              className="text-[11px] font-bold text-[#985018] hover:text-[#854412] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>+ Thêm dặn dò KTV</span>
            </button>
          )}
        </div>

        {existingNotes ? (
          <div className="p-3 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] whitespace-pre-line leading-relaxed">
            {existingNotes}
          </div>
        ) : (
          <div className="text-[11.5px] text-[#73675F] italic">
            Chưa có ghi chú dặn dò riêng cho ca hẹn này.
          </div>
        )}

        {showNoteInput && (
          <div className="pt-2 space-y-2">
            <textarea
              rows={2}
              value={techNote}
              onChange={(e) => setTechNote(e.target.value)}
              placeholder="Ví dụ: Khách đau mỏi nhiều vùng gáy, không dùng đá nóng ở cổ, dùng tinh dầu gừng ấm..."
              className="w-full p-2.5 bg-white border border-[#D8BDA7] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNoteInput(false);
                  setTechNote('');
                }}
                className="px-3 py-1.5 rounded-lg border border-[#E8DFD8] bg-white text-xs text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSendingNote || !techNote.trim()}
                onClick={handleSendTechNote}
                className="px-4 py-1.5 rounded-lg bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSendingNote ? 'Đang lưu...' : 'Lưu dặn dò vào ca hẹn'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EFE4D9]">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] text-xs font-bold text-[#73675F] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Printer className="w-4 h-4 text-[#985018]" />
          <span>In phiếu kẹp phòng trị liệu</span>
        </button>

        <div className="flex items-center gap-2">
          {bookingCode && (
            <a
              href={`/staff-schedule?booking=${encodeURIComponent(bookingCode)}`}
              className="px-4 py-2 rounded-xl bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] text-xs font-bold border border-[#D8BDA7] transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Xem trên Lịch trình KTV</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Đã xem xong
          </button>
        </div>
      </div>
    </div>
  );
};
