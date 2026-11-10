import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock, CreditCard, MapPin, Pencil, Phone, UserCheck, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { bookingService } from "../services";
import { Row } from "./api";

const statusMeta: Record<string, { label: string; tone: string; step: number }> = {
  PENDING: { label: "Chờ xác nhận", tone: "bg-amber-50 text-amber-800 border-amber-200", step: 0 },
  CONFIRMED: { label: "Đã xác nhận", tone: "bg-sky-50 text-sky-800 border-sky-200", step: 1 },
  CHECKED_IN: { label: "Đã tiếp đón", tone: "bg-blue-50 text-blue-800 border-blue-200", step: 2 },
  IN_SERVICE: { label: "Đang thực hiện", tone: "bg-violet-50 text-violet-800 border-violet-200", step: 3 },
  COMPLETED: { label: "Hoàn tất", tone: "bg-emerald-50 text-emerald-800 border-emerald-200", step: 4 },
  CANCELLED: { label: "Đã hủy", tone: "bg-slate-100 text-slate-700 border-slate-200", step: -1 },
  NO_SHOW: { label: "Khách không đến", tone: "bg-red-50 text-red-800 border-red-200", step: -1 },
};

const paymentLabels: Record<string, string> = {
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ thanh toán",
  PARTIAL: "Thanh toán một phần",
  REFUNDED: "Đã hoàn tiền",
};

const methodLabels: Record<string, string> = {
  CASH_AT_SPA: "Tiền mặt tại cơ sở",
  BANK_TRANSFER: "Chuyển khoản",
  MOMO: "Ví điện tử",
  MEMBERSHIP_WALLET: "Buổi trong gói liệu trình",
};

const pick = (...values: any[]) => values.find((value) => value !== undefined && value !== null && value !== "");

export function BookingDetailDialog({ row, onClose, onEdit }: { row: Row; onClose: () => void; onEdit: () => void }) {
  const [booking, setBooking] = useState<any>(row);

  useEffect(() => {
    let active = true;
    bookingService.getBookings(pick(row.branch_id, row.branchId)).then((result) => {
      if (!active || !result.success) return;
      const found = result.data.find((item) => item.id === row.id);
      if (found) setBooking((current: any) => ({ ...current, ...found }));
    });
    return () => { active = false; };
  }, [row.id, row.branch_id, row.branchId]);

  const status = String(pick(booking.status, row.status, "PENDING"));
  const meta = statusMeta[status] || { label: status, tone: "bg-slate-50 text-slate-700 border-slate-200", step: 0 };
  const paymentStatus = String(pick(booking.paymentStatus, booking.payment_status, row.payment_status, "UNPAID"));
  const customerName = pick(booking.customer?.fullName, booking.customer?.full_name, row.customer?.full_name, row.customer_name, booking.bookedForName, row.booked_for_name, "Khách hàng");
  const customerPhone = pick(booking.customer?.phone, row.customer?.phone, row.customer_phone, booking.bookedForPhone, row.booked_for_phone, "Chưa có số điện thoại");
  const branchName = pick(booking.branch?.name, row.branches?.name, row.branch?.name, row.branch_name, "Chưa xác định cơ sở");
  const technicianName = pick(booking.technician?.fullName, booking.technician?.full_name, row.technicians?.full_name, row.technician_name, "Chưa phân công");
  const roomName = pick(booking.room?.name, row.room?.name, row.branch_rooms?.name, row.room_name, "Hệ thống tự xếp phòng");
  const bedNumber = pick(booking.assignedBedNumber, booking.assigned_bed_number, row.assigned_bed_number, "Chưa xếp giường");
  const bookingCode = pick(booking.bookingCode, booking.booking_code, row.booking_code, "Chưa có mã lịch");
  const bookingDate = pick(booking.bookingDate, booking.booking_date, row.booking_date);
  const startTime = String(pick(booking.startTime, booking.start_time, row.start_time, "")).slice(0, 5);
  const endTime = String(pick(booking.endTime, booking.end_time, row.end_time, "")).slice(0, 5);
  const items = Array.isArray(booking.items) ? booking.items : [];
  const serviceNames = items.length
    ? items.map((item: any) => pick(item.service?.name, item.serviceName, item.name, "Dịch vụ")).join(", ")
    : pick(row.service_name, "Dịch vụ theo lịch hẹn");
  const baseTotal = Number(pick(booking.baseTotal, booking.base_total, row.base_total, 0));
  const discount = Number(pick(booking.discountAmount, booking.discount_amount, row.discount_amount, 0));
  const finalPrice = Number(pick(booking.finalPrice, booking.final_price, row.final_price, baseTotal - discount));
  const paymentMethod = String(pick(booking.paymentMethod, booking.payment_method, row.payment_method, "CASH_AT_SPA"));
  const notes = pick(booking.specialNotes, booking.special_notes, row.special_notes, row.notes);
  const isLocked = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status);

  return (
    <div className="font-['Plus_Jakarta_Sans',sans-serif]">
      <header>
        <div className="min-w-0">
          <p className="admin-eyebrow">Lịch hẹn / Check-in / Check-out</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 id="record-heading">{bookingCode}</h2>
            <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${meta.tone}`}>{meta.label}</span>
          </div>
          <p className="mt-1 text-xs text-[#73675F]">Hồ sơ phục vụ khách từ lúc đặt lịch đến khi hoàn tất và thanh toán.</p>
        </div>
        <button type="button" className="admin-icon" title="Đóng" onClick={onClose}><X /></button>
      </header>

      <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5 sm:p-6">
        <section className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2D6CA] bg-[#FAF8F5] p-4 sm:grid-cols-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#8C7A6B]">Ngày hẹn</p><p className="mt-1 flex items-center gap-1.5 text-sm font-black text-[#2C241E]"><Calendar size={15} className="text-[#985018]" />{bookingDate ? new Date(`${bookingDate}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa có ngày"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#8C7A6B]">Khung giờ</p><p className="mt-1 flex items-center gap-1.5 text-sm font-black text-[#2C241E]"><Clock size={15} className="text-[#985018]" />{startTime || "--:--"} - {endTime || "--:--"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#8C7A6B]">Dịch vụ</p><p className="mt-1 truncate text-sm font-black text-[#2C241E]" title={serviceNames}>{serviceNames}</p></div>
        </section>

        {meta.step >= 0 && (
          <section className="rounded-xl border border-[#E2D6CA] bg-white p-4">
            <h3 className="text-xs font-extrabold text-[#2C241E]">Tiến trình phục vụ</h3>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {["Xác nhận", "Tiếp đón", "Bắt đầu", "Hoàn tất dịch vụ", "Thanh toán"].map((label, index) => {
                const completed = index < meta.step || (index === 4 && paymentStatus === "PAID") || status === "COMPLETED";
                const current = index === meta.step && status !== "COMPLETED";
                return <div key={label} className="min-w-0"><div className={`h-1.5 rounded-full ${completed ? "bg-emerald-600" : current ? "bg-[#985018]" : "bg-[#E8DFD8]"}`} /><p className={`mt-1.5 truncate text-[9px] font-bold ${completed || current ? "text-[#2C241E]" : "text-[#9A8E84]"}`}>{label}</p></div>;
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-[#E2D6CA] bg-white p-4">
            <h3 className="flex items-center gap-2 text-xs font-extrabold text-[#2C241E]"><Users size={15} className="text-[#985018]" />Khách hàng</h3>
            <p className="mt-3 text-sm font-black text-[#2C241E]">{customerName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#73675F]"><Phone size={13} />{customerPhone}</p>
          </section>

          <section className="rounded-xl border border-[#E2D6CA] bg-white p-4">
            <h3 className="flex items-center gap-2 text-xs font-extrabold text-[#2C241E]"><MapPin size={15} className="text-[#985018]" />Điều phối phục vụ</h3>
            <p className="mt-3 text-xs font-bold text-[#2C241E]">{branchName}</p>
            <p className="mt-1 text-xs text-[#73675F]">{roomName} · {bedNumber}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#2C241E]"><UserCheck size={13} className="text-[#985018]" />{technicianName}</p>
          </section>
        </div>

        <section className="rounded-xl border border-[#E2D6CA] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-xs font-extrabold text-[#2C241E]"><CreditCard size={15} className="text-[#985018]" />Thanh toán</h3><p className="mt-2 text-xs text-[#73675F]">{paymentLabels[paymentStatus] || paymentStatus} · {methodLabels[paymentMethod] || paymentMethod}</p></div>
            <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8C7A6B]">Thành tiền</p><p className="mt-1 text-lg font-black text-[#985018]">{finalPrice.toLocaleString("vi-VN")}đ</p></div>
          </div>
          {(discount > 0 || baseTotal !== finalPrice) && <div className="mt-3 flex justify-end gap-4 border-t border-[#EFE4D9] pt-2 text-xs text-[#73675F]"><span>Giá gốc: {baseTotal.toLocaleString("vi-VN")}đ</span><span>Ưu đãi: {discount.toLocaleString("vi-VN")}đ</span></div>}
        </section>

        {notes && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-xs font-extrabold text-amber-950">Ghi chú tiếp đón</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-amber-900">{notes}</p></section>}
      </div>

      <footer>
        <button type="button" className="btn btn-outline" onClick={onClose}>Đóng</button>
        {!isLocked && <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={onEdit}><Pencil size={15} />Chỉnh sửa lịch</button>}
        {paymentStatus !== "PAID" && status !== "CANCELLED" && status !== "NO_SHOW" && <Link to={`/cashier-pos?tab=queue&booking=${encodeURIComponent(String(bookingCode))}`} className="btn btn-primary inline-flex items-center gap-2"><CreditCard size={15} />Mở thu ngân</Link>}
        {status === "COMPLETED" && paymentStatus === "PAID" && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={15} />Quy trình đã hoàn tất</span>}
      </footer>
    </div>
  );
}
