import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarPlus, Clock, Save, UserPlus, X } from "lucide-react";
import { bookingService, branchService, customerService, supabaseService } from "../services";
import { Branch, Service, Technician, User } from "../types/shared_types";

const START_TIMES = [
  "08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30",
];

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}

export function BookingCreateDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [customers, setCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      customerService.getCustomers(),
      branchService.getAllBranches(),
      supabaseService.getServices(),
      supabaseService.getTechnicians(),
    ]).then(([customerResult, branchResult, serviceResult, technicianResult]) => {
      if (!active) return;
      const loadedCustomers = customerResult.success ? customerResult.data.filter((customer) => customer.isActive !== false) : [];
      const loadedBranches = branchResult.success ? branchResult.data : [];
      const loadedServices = (serviceResult || []).filter((service) => service.isActive !== false);
      const loadedTechnicians = (technicianResult || []).filter((technician) => technician.isActive !== false);
      setCustomers(loadedCustomers);
      setBranches(loadedBranches);
      setServices(loadedServices);
      setTechnicians(loadedTechnicians);
      setBranchId(loadedBranches[0]?.id || "");
      setServiceId(loadedServices[0]?.id || "");
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu đặt lịch."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedService = services.find((service) => service.id === serviceId);
  const availableTechnicians = useMemo(
    () => technicians.filter((technician) => !branchId || technician.branchId === branchId),
    [technicians, branchId],
  );
  const duration = Number(selectedService?.durationMinutes || 60);
  const endTime = addMinutes(startTime, duration);
  const price = Number(selectedService?.discountPrice || selectedService?.price || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer || !branchId || !selectedService || !bookingDate || !startTime) {
      setError("Vui lòng chọn đủ khách hàng, chi nhánh, dịch vụ, ngày và giờ hẹn.");
      return;
    }
    setSaving(true);
    setError("");
    const selectedTechnician = availableTechnicians.find((technician) => technician.id === technicianId);
    try {
      const result = await bookingService.createBooking({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        customerPhone: selectedCustomer.phone || undefined,
        branchId,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        durationMinutes: duration,
        technicianId: selectedTechnician?.id || undefined,
        technicianName: selectedTechnician?.fullName,
        bookingDate,
        startTime: `${startTime}:00`,
        endTime,
        baseTotal: price,
        finalPrice: price,
        notes: notes.trim() || undefined,
      });
      if (!result.success) throw new Error(result.message || "Không thể tạo lịch hẹn.");
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo lịch hẹn.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="font-['Plus_Jakarta_Sans',sans-serif]">
      <header>
        <div>
          <p className="admin-eyebrow">Lịch hẹn / Check-in / Check-out</p>
          <h2 id="record-heading">Tạo lịch hẹn mới</h2>
          <p className="mt-1 text-xs text-[#73675F]">Hệ thống tự sinh mã lịch, tính giờ kết thúc, giá và kiểm tra năng lực phục vụ.</p>
        </div>
        <button type="button" className="admin-icon" title="Đóng" onClick={onClose} disabled={saving}><X /></button>
      </header>

      <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5 sm:p-6">
        {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        {loading ? (
          <div className="py-12 text-center text-sm text-[#73675F]">Đang tải khách hàng, dịch vụ và lịch làm việc...</div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-[#2C241E]">1. Khách hàng</h3>
                <a href="/customers?create=1" className="inline-flex items-center gap-1 text-xs font-bold text-[#985018] hover:underline"><UserPlus size={14} />Tạo hồ sơ khách mới</a>
              </div>
              <label className="block text-xs font-bold text-[#4A3E31]">Chọn hồ sơ khách hàng <span className="text-red-600">*</span>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm">
                  <option value="">Chọn theo tên hoặc số điện thoại</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone || "Chưa có SĐT"}</option>)}
                </select>
              </label>
            </section>

            <section className="space-y-3 border-t border-[#EFE4D9] pt-4">
              <h3 className="text-sm font-extrabold text-[#2C241E]">2. Dịch vụ và cơ sở</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-bold text-[#4A3E31]">Chi nhánh <span className="text-red-600">*</span>
                  <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setTechnicianId(""); }} required className="mt-1 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm">
                    <option value="">Chọn chi nhánh</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#4A3E31]">Dịch vụ <span className="text-red-600">*</span>
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm">
                    <option value="">Chọn dịch vụ</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {Number(service.discountPrice || service.price || 0).toLocaleString("vi-VN")}đ</option>)}
                  </select>
                </label>
              </div>
              {selectedService && <div className="rounded-xl border border-[#EAD8C7] bg-[#FAF8F5] px-3 py-2 text-xs text-[#5E5147]"><strong>{selectedService.name}</strong><span className="mx-2">·</span>{duration} phút<span className="mx-2">·</span>{price.toLocaleString("vi-VN")}đ</div>}
            </section>

            <section className="space-y-3 border-t border-[#EFE4D9] pt-4">
              <h3 className="text-sm font-extrabold text-[#2C241E]">3. Thời gian và chuyên viên</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-bold text-[#4A3E31]">Ngày hẹn <span className="text-red-600">*</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm" /></label>
                <label className="text-xs font-bold text-[#4A3E31]">Giờ bắt đầu <span className="text-red-600">*</span><select value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm">{START_TIMES.map((time) => <option key={time} value={time}>{time} - {addMinutes(time, duration).slice(0, 5)}</option>)}</select></label>
                <label className="text-xs font-bold text-[#4A3E31]">Chuyên viên<select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className="mt-1 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm"><option value="">Tự động chọn người ít lịch nhất</option>{availableTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.fullName}</option>)}</select></label>
                <div className="rounded-xl border border-[#EAD8C7] bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#5E5147]"><span className="flex items-center gap-1 font-bold text-[#2C241E]"><Clock size={14} />Thời gian dự kiến</span><p className="mt-1">{startTime} - {endTime.slice(0, 5)} · Hệ thống tự xếp giường trống</p></div>
              </div>
              <label className="block text-xs font-bold text-[#4A3E31]">Ghi chú tiếp đón<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Nhu cầu của khách, lưu ý sức khỏe hoặc yêu cầu khi tiếp đón..." className="mt-1 w-full resize-y rounded-xl border border-[#D8D0C7] bg-white px-3 py-2.5 text-sm" /></label>
            </section>
          </>
        )}
      </div>

      <footer>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Đóng</button>
        <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={loading || saving}><Save size={15} />{saving ? "Đang kiểm tra và tạo lịch..." : "Xác nhận tạo lịch"}</button>
      </footer>
    </form>
  );
}
