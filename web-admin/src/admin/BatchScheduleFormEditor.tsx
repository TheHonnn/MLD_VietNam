import React, { useState, useEffect } from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  DoorOpen,
  BookOpen,
  GraduationCap,
  Activity,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
  Stethoscope,
  Eye,
} from "lucide-react";
import { adminApi, Listing, Row } from "./api";

export interface BatchScheduleFormValues {
  batch_id: string;
  assigned_room_id?: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  topic: string;
  is_practice_lab: boolean;
}

interface BatchScheduleFormEditorProps {
  values: BatchScheduleFormValues;
  onChange: (field: keyof BatchScheduleFormValues, val: any) => void;
  isCreate?: boolean;
}

// Format ngày tiếng Việt hiển thị
export function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayNames = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const dayName = dayNames[d.getDay()];
    return `${dayName}, ngày ${String(parts[2]).padStart(2, "0")}/${String(parts[1]).padStart(2, "0")}/${parts[0]}`;
  } catch {
    return dateStr;
  }
}

// Lấy thứ trong tuần ngắn
export function getShortDayOfWeek(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return "";
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return dayNames[d.getDay()];
  } catch {
    return "";
  }
}

// Lấy ngày hôm nay định dạng YYYY-MM-DD
export function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

// Cộng ngày
export function addDays(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dt}`;
  } catch {
    return dateStr;
  }
}

// Tính thời lượng giữa 2 giờ (ví dụ 08:30 và 11:30 -> "3 giờ 00 phút")
export function calculateTimeDuration(startTime: string, endTime: string): { text: string; minutes: number; isValid: boolean } {
  if (!startTime || !endTime) {
    return { text: "", minutes: 0, isValid: true };
  }
  try {
    const [h1, m1] = startTime.substring(0, 5).split(":").map(Number);
    const [h2, m2] = endTime.substring(0, 5).split(":").map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) {
      return { text: "", minutes: 0, isValid: true };
    }
    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;
    const diff = totalMinutes2 - totalMinutes1;

    if (diff <= 0) {
      return { text: "Giờ kết thúc phải sau giờ bắt đầu", minutes: diff, isValid: false };
    }
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (mins === 0) {
      return { text: `${hours} giờ`, minutes: diff, isValid: true };
    }
    return { text: `${hours} giờ ${mins} phút`, minutes: diff, isValid: true };
  } catch {
    return { text: "", minutes: 0, isValid: true };
  }
}

// Chuẩn hóa giờ HH:mm
function cleanTime(t: string | undefined | null): string {
  if (!t) return "";
  return String(t).substring(0, 5);
}

// Các ca học đào tạo chuẩn MLD
export const SHIFT_PRESETS = [
  { label: "🌅 Ca Sáng", start: "08:30", end: "11:30", duration: "3 giờ" },
  { label: "☀️ Ca Chiều", start: "13:30", end: "16:30", duration: "3 giờ" },
  { label: "🌙 Ca Tối", start: "18:00", end: "21:00", duration: "3 giờ" },
  { label: "⚡ Cả Ngày", start: "08:30", end: "16:30", duration: "8 giờ" },
  { label: "☕ Sáng Sớm", start: "09:00", end: "12:00", duration: "3 giờ" },
  { label: "🍵 Chiều Muộn", start: "14:00", end: "17:00", duration: "3 giờ" },
];

export const BatchScheduleFormEditor: React.FC<BatchScheduleFormEditorProps> = ({
  values,
  onChange,
  isCreate = true,
}) => {
  const [batches, setBatches] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Tải dữ liệu danh mục phụ trợ (lớp học, khóa học, chi nhánh, phòng học)
  useEffect(() => {
    let active = true;
    setLoadingData(true);

    Promise.all([
      adminApi<Listing>("course_batches?limit=100&page=1").catch(() => null),
      adminApi<Listing>("courses?limit=100&page=1").catch(() => null),
      adminApi<Listing>("branches?limit=50&page=1").catch(() => null),
      adminApi<Listing>("branch_rooms?limit=100&page=1").catch(() => null),
    ])
      .then(([batchesRes, coursesRes, branchesRes, roomsRes]) => {
        if (!active) return;
        if (batchesRes?.rows) setBatches(batchesRes.rows);
        if (coursesRes?.rows) setCourses(coursesRes.rows);
        if (branchesRes?.rows) setBranches(branchesRes.rows);
        if (roomsRes?.rows) setRooms(roomsRes.rows);
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Lớp học hiện tại được chọn
  const selectedBatch = batches.find((b) => String(b.id) === String(values.batch_id));
  const selectedCourse = selectedBatch
    ? courses.find((c) => String(c.id) === String(selectedBatch.course_id))
    : null;
  const selectedBranch = selectedBatch
    ? branches.find((br) => String(br.id) === String(selectedBatch.branch_id))
    : null;

  // Phòng học hiện tại được chọn
  const selectedRoom = rooms.find((r) => String(r.id) === String(values.assigned_room_id));
  const roomBranch = selectedRoom
    ? branches.find((br) => String(br.id) === String(selectedRoom.branch_id))
    : null;

  // Phòng thuộc chi nhánh của lớp học (được ưu tiên hiển thị trước)
  const priorityRooms = selectedBatch
    ? rooms.filter((r) => String(r.branch_id) === String(selectedBatch.branch_id))
    : [];
  const otherRooms = selectedBatch
    ? rooms.filter((r) => String(r.branch_id) !== String(selectedBatch.branch_id))
    : rooms;

  // Xử lý khi đổi lớp học
  const handleBatchChange = (batchId: string) => {
    onChange("batch_id", batchId);
    const b = batches.find((x) => String(x.id) === String(batchId));
    if (b) {
      // Nếu chưa có ngày học, gợi ý ngày bắt đầu của lớp
      if (!values.session_date && b.start_date) {
        onChange("session_date", String(b.start_date));
      }
      // Gợi ý phòng đầu tiên thuộc chi nhánh của lớp nếu có
      if (!values.assigned_room_id) {
        const matchingRoom = rooms.find((r) => String(r.branch_id) === String(b.branch_id));
        if (matchingRoom) {
          onChange("assigned_room_id", String(matchingRoom.id));
        }
      }
    }
  };

  const startTimeClean = cleanTime(values.start_time);
  const endTimeClean = cleanTime(values.end_time);
  const durationInfo = calculateTimeDuration(startTimeClean, endTimeClean);

  // Kiểm tra ngày học có nằm ngoài khoảng thời gian của lớp không
  const isDateOutOfBatchRange =
    selectedBatch &&
    values.session_date &&
    ((selectedBatch.start_date && values.session_date < String(selectedBatch.start_date)) ||
      (selectedBatch.end_date && values.session_date > String(selectedBatch.end_date)));

  return (
    <div className="space-y-6">
      {/* 1. KHỐI THÔNG TIN LỚP HỌC & PHÒNG HỌC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chọn Lớp học */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#2C241E] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GraduationCap size={14} className="text-[#985018]" />
              Lớp học đào tạo <b className="text-red-500">*</b>
            </span>
            {loadingData && (
              <span className="text-[10px] text-[#766554] font-normal">Đang nạp lớp...</span>
            )}
          </label>

          <select
            value={values.batch_id || ""}
            onChange={(e) => handleBatchChange(e.target.value)}
            required
            className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] transition-all"
          >
            <option value="">-- Chọn lớp học đào tạo --</option>
            {batches.map((b) => {
              const c = courses.find((x) => String(x.id) === String(b.course_id));
              const br = branches.find((x) => String(x.id) === String(b.branch_id));
              const branchName = br ? br.name : "";
              const courseTitle = c ? c.title || c.name : "Khóa học MLD";
              return (
                <option key={b.id} value={b.id}>
                  [{b.batch_code || "Lớp"}] {courseTitle} {branchName ? `· ${branchName}` : ""}
                </option>
              );
            })}
          </select>

          {/* Chi tiết lớp học đã chọn */}
          {selectedBatch ? (
            <div className="p-2.5 bg-[#FAF6F2] rounded-xl border border-[#E8DFD8] text-[11px] space-y-1 mt-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#985018]">
                  {selectedCourse?.title || selectedCourse?.name || "Khóa học MLD"}
                </span>
                <span className="px-1.5 py-0.5 bg-[#985018]/10 text-[#985018] rounded font-semibold text-[10px]">
                  {selectedBatch.batch_code}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[#766554] text-[10px]">
                {selectedBranch && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-[#B38A58]" />
                    {selectedBranch.name}
                  </span>
                )}
                {selectedBatch.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-[#B38A58]" />
                    {selectedBatch.start_date} → {selectedBatch.end_date || "..."}
                  </span>
                )}
              </div>
              {selectedBatch.schedule_text && (
                <div className="text-[10px] text-[#554536] italic pt-0.5 border-t border-[#E8DFD8]/60">
                  Lịch dự kiến: {selectedBatch.schedule_text}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#766554]">
              Vui lòng chọn lớp học để hệ thống tự động liên kết chi nhánh và phòng thực hành phù hợp.
            </p>
          )}
        </div>

        {/* Chọn Phòng học */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#2C241E] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <DoorOpen size={14} className="text-[#985018]" />
              Phòng học / Phòng Lab
            </span>
            <span className="text-[10px] text-[#766554] font-normal">Không bắt buộc</span>
          </label>

          <select
            value={values.assigned_room_id || ""}
            onChange={(e) => onChange("assigned_room_id", e.target.value ? e.target.value : null)}
            className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] transition-all"
          >
            <option value="">-- Chưa chỉ định phòng (Học Online / Tự do) --</option>

            {priorityRooms.length > 0 && (
              <optgroup label={`📍 Phòng tại ${selectedBranch?.name || "Chi nhánh của lớp"}`}>
                {priorityRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.room_type === "PRACTICE_LAB" ? "Lab Thực hành" : r.room_type || "Phòng"})
                  </option>
                ))}
              </optgroup>
            )}

            {otherRooms.length > 0 && (
              <optgroup label={priorityRooms.length > 0 ? "🏢 Các phòng tại cơ sở khác" : "🏢 Danh sách phòng"}>
                {otherRooms.map((r) => {
                  const b = branches.find((x) => String(x.id) === String(r.branch_id));
                  return (
                    <option key={r.id} value={r.id}>
                      {r.name} {b ? `(${b.name})` : ""} - {r.room_type || "Phòng"}
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>

          {selectedRoom ? (
            <div className="p-2.5 bg-[#FAF6F2] rounded-xl border border-[#E8DFD8] text-[11px] flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2C241E]">{selectedRoom.name}</span>
                <span className="text-[10px] text-[#766554]">
                  {roomBranch ? `· ${roomBranch.name}` : ""}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8DFD8] text-[#554536]">
                {selectedRoom.room_type === "PRACTICE_LAB"
                  ? "💆 Lab Thực hành"
                  : selectedRoom.room_type === "ACADEMY_CLASSROOM"
                  ? "🎓 Giảng đường"
                  : selectedRoom.room_type || "Phòng học"}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-[#766554]">
              Có thể để trống nếu là buổi học lý thuyết trực tuyến hoặc chưa chốt phòng.
            </p>
          )}
        </div>
      </div>

      {/* 2. NGÀY HỌC & CÁC CHIP CHỌN NHANH */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <CalendarDays size={14} className="text-[#985018]" />
            Ngày diễn ra buổi học <b className="text-red-500">*</b>
          </label>

          {values.session_date && (
            <span className="text-xs font-bold text-[#985018] bg-[#FAF6F2] px-2.5 py-1 rounded-lg border border-[#E8DFD8]">
              📅 {formatVietnameseDate(values.session_date)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-1">
            <input
              type="date"
              value={values.session_date || ""}
              onChange={(e) => onChange("session_date", e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] font-medium"
            />
          </div>

          {/* Quick Date Pills */}
          <div className="sm:col-span-2 flex flex-wrap gap-1.5 items-center">
            <button
              type="button"
              onClick={() => onChange("session_date", getTodayStr())}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                values.session_date === getTodayStr()
                  ? "bg-[#985018] text-white border-[#985018] font-bold"
                  : "bg-[#FAF6F2] text-[#554536] border-[#E8DFD8] hover:border-[#B38A58]"
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => onChange("session_date", addDays(getTodayStr(), 1))}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                values.session_date === addDays(getTodayStr(), 1)
                  ? "bg-[#985018] text-white border-[#985018] font-bold"
                  : "bg-[#FAF6F2] text-[#554536] border-[#E8DFD8] hover:border-[#B38A58]"
              }`}
            >
              Ngày mai
            </button>
            {values.session_date && (
              <button
                type="button"
                onClick={() => onChange("session_date", addDays(values.session_date, 7))}
                className="text-[11px] px-2.5 py-1.5 rounded-lg border bg-[#FAF6F2] text-[#554536] border-[#E8DFD8] hover:border-[#B38A58] transition-all"
                title="Cộng thêm 7 ngày (buổi tuần sau)"
              >
                +1 tuần ({getShortDayOfWeek(values.session_date)})
              </button>
            )}

            {selectedBatch?.start_date && (
              <button
                type="button"
                onClick={() => onChange("session_date", String(selectedBatch.start_date))}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                  values.session_date === String(selectedBatch.start_date)
                    ? "bg-[#985018] text-white border-[#985018] font-bold"
                    : "bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400"
                }`}
              >
                🏁 Khai giảng ({selectedBatch.start_date})
              </button>
            )}

            {selectedBatch?.end_date && (
              <button
                type="button"
                onClick={() => onChange("session_date", String(selectedBatch.end_date))}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                  values.session_date === String(selectedBatch.end_date)
                    ? "bg-[#985018] text-white border-[#985018] font-bold"
                    : "bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400"
                }`}
              >
                🎓 Bế giảng ({selectedBatch.end_date})
              </button>
            )}
          </div>
        </div>

        {/* Cảnh báo nếu ngày nằm ngoài khoảng thời gian khóa học */}
        {isDateOutOfBatchRange && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
            <AlertCircle size={13} className="shrink-0 text-amber-600" />
            <span>
              Lưu ý: Ngày <b>{values.session_date}</b> nằm ngoài thời gian dự kiến của lớp (
              {selectedBatch?.start_date} → {selectedBatch?.end_date}).
            </span>
          </div>
        )}
      </div>

      {/* 3. KHUNG GIỜ HỌC (START_TIME, END_TIME) & CA HỌC CHUẨN */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <Clock size={14} className="text-[#985018]" />
            Khung giờ bắt đầu & Kết thúc <b className="text-red-500">*</b>
          </label>

          {durationInfo.text && (
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                durationInfo.isValid
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              ⏱️ {durationInfo.isValid ? `Thời lượng: ${durationInfo.text}` : durationInfo.text}
            </span>
          )}
        </div>

        {/* Các ca học gợi ý chọn nhanh */}
        <div>
          <span className="text-[11px] text-[#766554] block mb-1.5">
            Chọn nhanh ca học tiêu chuẩn Học viện:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {SHIFT_PRESETS.map((shift, idx) => {
              const isSelected =
                startTimeClean === shift.start && endTimeClean === shift.end;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    onChange("start_time", shift.start);
                    onChange("end_time", shift.end);
                  }}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-[#985018] text-white border-[#985018] shadow-xs"
                      : "bg-[#FAF6F2] text-[#2C241E] border-[#E8DFD8] hover:border-[#B38A58]"
                  }`}
                >
                  <div className="text-[11px] font-bold flex items-center justify-between">
                    <span>{shift.label}</span>
                    {isSelected && <span>✓</span>}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      isSelected ? "text-amber-100" : "text-[#766554]"
                    }`}
                  >
                    {shift.start} - {shift.end}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 Ô nhập giờ tùy chỉnh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] text-[#766554] font-medium block mb-1">
              Giờ bắt đầu:
            </label>
            <input
              type="time"
              value={startTimeClean}
              onChange={(e) => onChange("start_time", e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#766554] font-medium block mb-1">
              Giờ kết thúc:
            </label>
            <input
              type="time"
              value={endTimeClean}
              onChange={(e) => onChange("end_time", e.target.value)}
              required
              className={`w-full text-xs px-3 py-2.5 bg-white border rounded-xl text-[#2C241E] focus:outline-none focus:ring-1 font-bold ${
                !durationInfo.isValid
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500 text-red-700"
                  : "border-[#E8DFD8] focus:border-[#B38A58] focus:ring-[#B38A58]"
              }`}
            />
          </div>
        </div>
      </div>

      {/* 4. PHÂN LOẠI BUỔI HỌC: THỰC HÀNH LÂM SÀNG VS LÝ THUYẾT */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
          <Stethoscope size={14} className="text-[#985018]" />
          Phân loại hình thức giảng dạy <b className="text-red-500">*</b>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option: Thực hành Lâm sàng */}
          <button
            type="button"
            onClick={() => onChange("is_practice_lab", true)}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              values.is_practice_lab
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-white border-[#E8DFD8] hover:border-emerald-300 hover:bg-emerald-50/40"
            }`}
          >
            <span
              className={`p-2 rounded-xl text-lg shrink-0 ${
                values.is_practice_lab ? "bg-emerald-500 text-white" : "bg-[#F5ECE2] text-[#985018]"
              }`}
            >
              💆
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#2C241E]">
                  Buổi Thực hành Lâm sàng (Hands-on Lab)
                </span>
                {values.is_practice_lab && (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                )}
              </div>
              <p className="text-[11px] text-[#766554] mt-0.5">
                Rèn luyện thao tác tay trực tiếp trên người mẫu / học viên, kiểm soát áp lực mô chuẩn
                dưới 30 mmHg.
              </p>
            </div>
          </button>

          {/* Option: Lý thuyết Chuyên môn */}
          <button
            type="button"
            onClick={() => onChange("is_practice_lab", false)}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              !values.is_practice_lab
                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                : "bg-white border-[#E8DFD8] hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            <span
              className={`p-2 rounded-xl text-lg shrink-0 ${
                !values.is_practice_lab ? "bg-blue-500 text-white" : "bg-[#F5ECE2] text-[#985018]"
              }`}
            >
              📚
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#2C241E]">
                  Buổi Lý thuyết Chuyên môn (Theory)
                </span>
                {!values.is_practice_lab && (
                  <CheckCircle2 size={14} className="text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-[#766554] mt-0.5">
                Giảng giải nguyên lý giải phẫu mạch bạch huyết, cơ chế bệnh học phù nề và phân tích ca
                lâm sàng.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 5. CHỦ ĐỀ BUỔI HỌC (TOPIC) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <BookOpen size={14} className="text-[#985018]" />
            Chủ đề / Nội dung bài giảng <b className="text-red-500">*</b>
          </label>
          <span className="text-[10px] text-[#766554]">
            {values.topic?.length || 0} ký tự
          </span>
        </div>

        <input
          type="text"
          value={values.topic || ""}
          onChange={(e) => onChange("topic", e.target.value)}
          placeholder="Ví dụ: Module 2: Kỹ thuật Thao tác Xoay tròn & Bơm đẩy Vodder Căn bản"
          required
          className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] font-medium"
        />
      </div>

      {/* 6. XEM TRƯỚC THỜI KHÓA BIỂU THỜI GIAN THỰC (LIVE PREVIEW CARD) */}
      <div className="pt-2 border-t border-[#E8DFD8]">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Eye size={14} className="text-[#985018]" />
          <h4 className="text-xs font-bold text-[#2C241E]">
            Xem trước Thẻ Thời khóa biểu (Hiển thị thực tế trên App Mobile & Web Portal)
          </h4>
        </div>

        <div className="bg-gradient-to-br from-white to-[#FAF6F2] p-4 rounded-2xl border border-[#E8DFD8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Date Badge bên trái */}
          <div className="p-3 bg-[#985018] text-white rounded-2xl flex flex-col items-center justify-center min-w-[76px] text-center shadow-xs shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
              {values.session_date ? getShortDayOfWeek(values.session_date) : "THỨ"}
            </span>
            <span className="text-2xl font-black leading-none my-0.5">
              {values.session_date
                ? String(values.session_date.split("-")[2] || "01")
                : "--"}
            </span>
            <span className="text-[9px] font-medium text-amber-100">
              {values.session_date
                ? `Thg ${Number(values.session_date.split("-")[1] || 1)}`
                : "Tháng"}
            </span>
          </div>

          {/* Chi tiết buổi học */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  values.is_practice_lab
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}
              >
                {values.is_practice_lab
                  ? "💆 Thực hành Lâm sàng"
                  : "📚 Lý thuyết Chuyên môn"}
              </span>

              <span className="flex items-center gap-1 text-[11px] font-bold text-[#2C241E]">
                <Clock size={12} className="text-[#985018]" />
                {startTimeClean || "--:--"} - {endTimeClean || "--:--"}
                {durationInfo.isValid && durationInfo.text && (
                  <span className="text-[10px] text-[#766554] font-normal">
                    ({durationInfo.text})
                  </span>
                )}
              </span>
            </div>

            <h5 className="text-sm font-bold text-[#2C241E] truncate">
              {values.topic || "Chưa nhập chủ đề bài giảng..."}
            </h5>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#766554]">
              <span className="flex items-center gap-1">
                <GraduationCap size={12} className="text-[#B38A58]" />
                {selectedCourse?.title || selectedCourse?.name || "Lớp học đào tạo"}
                {selectedBatch ? ` (${selectedBatch.batch_code})` : ""}
              </span>

              <span className="flex items-center gap-1">
                <DoorOpen size={12} className="text-[#B38A58]" />
                {selectedRoom?.name || "Chưa phân phòng"}
                {selectedBranch ? ` · ${selectedBranch.name}` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
