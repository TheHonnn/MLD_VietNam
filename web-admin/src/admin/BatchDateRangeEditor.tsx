import React from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface BatchDateRangeEditorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (newStart: string) => void;
  onEndDateChange: (newEnd: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function getVietnameseDayOfWeek(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return "";
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay();
    const dayNames = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return `${dayNames[day]}, ${String(parts[2]).padStart(2, "0")}/${String(parts[1]).padStart(2, "0")}/${parts[0]}`;
  } catch {
    return "";
  }
}

export function calculateDurationDays(startStr: string, endStr: string): number | null {
  if (!startStr || !endStr) return null;
  try {
    const p1 = startStr.split("-").map(Number);
    const p2 = endStr.split("-").map(Number);
    const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
    const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return null;
  }
}

export function addDaysToDate(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

export function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilNextMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

export function getFirstDayOfNextMonth(): string {
  const d = new Date();
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const y = nextMonth.getFullYear();
  const m = String(nextMonth.getMonth() + 1).padStart(2, "0");
  const dt = String(nextMonth.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

const DURATION_PRESETS = [
  { days: 3, label: "3 ngày", desc: "Workshop / Cấp tốc" },
  { days: 7, label: "1 tuần", desc: "7 ngày" },
  { days: 14, label: "2 tuần", desc: "Tiêu chuẩn MLD" },
  { days: 30, label: "1 tháng", desc: "30 ngày" },
  { days: 60, label: "2 tháng", desc: "Nâng cao" },
  { days: 90, label: "3 tháng", desc: "Chứng chỉ Master" },
];

export const BatchDateRangeEditor: React.FC<BatchDateRangeEditorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  required = true,
  disabled = false,
}) => {
  const safeStart = startDate ? startDate.slice(0, 10) : "";
  const safeEnd = endDate ? endDate.slice(0, 10) : "";

  const durationDays = calculateDurationDays(safeStart, safeEnd);
  const isInvalidRange = durationDays !== null && durationDays <= 0;

  const handleStartChange = (newStart: string) => {
    onStartDateChange(newStart);
    // If we had a valid duration previously, shift end date to preserve duration
    if (newStart && safeStart && safeEnd && durationDays && durationDays > 0) {
      const shiftedEnd = addDaysToDate(newStart, durationDays);
      onEndDateChange(shiftedEnd);
    } else if (newStart && (!safeEnd || safeEnd < newStart)) {
      // Default to 14 days if end date is missing or invalid
      onEndDateChange(addDaysToDate(newStart, 14));
    }
  };

  const handleSelectPreset = (days: number) => {
    const baseStart = safeStart || getToday();
    if (!safeStart) {
      onStartDateChange(baseStart);
    }
    const newEnd = addDaysToDate(baseStart, days);
    onEndDateChange(newEnd);
  };

  const getDurationHumanText = (days: number) => {
    if (days <= 0) return "Ngày kết thúc không hợp lệ";
    if (days === 1) return "1 ngày (Hội thảo / Khóa học 1 ngày)";
    if (days === 7) return "7 ngày (Tròn 1 tuần)";
    if (days === 14) return "14 ngày (2 tuần trọn vẹn)";
    if (days === 21) return "21 ngày (3 tuần)";
    if (days === 30) return "30 ngày (Khoảng 1 tháng)";
    if (days === 60) return "60 ngày (Khoảng 2 tháng)";
    if (days === 90) return "90 ngày (Khoảng 3 tháng - Toàn khóa)";
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks > 0 && rem === 0) return `${days} ngày (${weeks} tuần)`;
    if (weeks > 0) return `${days} ngày (${weeks} tuần ${rem} ngày)`;
    return `${days} ngày`;
  };

  return (
    <div className="admin-field-wide bg-[#FAF8F5] border border-[#E8DFD8] rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE8E1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center shadow-xs">
            <CalendarDays size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
              Thời gian đào tạo & Khung lớp học {required && <b className="text-red-500">*</b>}
            </span>
            <p className="text-[11px] text-[#766554]">
              Chọn ngày bắt đầu và kết thúc; hệ thống tự tính thời lượng & thứ trong tuần.
            </p>
          </div>
        </div>

        {durationDays !== null && durationDays > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] border border-[#CDEED5] text-xs font-bold text-[#059669]">
            <CheckCircle2 size={13} />
            <span>Thời lượng: {getDurationHumanText(durationDays)}</span>
          </div>
        )}
      </div>

      {/* Date Pickers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1">
              <Calendar size={13} className="text-[#B38A58]" />
              Ngày bắt đầu nhập học <span className="text-red-500">*</span>
            </label>
            {safeStart && (
              <span className="text-[11px] font-semibold text-[#985018]">
                {getVietnameseDayOfWeek(safeStart).split(",")[0]}
              </span>
            )}
          </div>

          <input
            type="date"
            value={safeStart}
            disabled={disabled}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] font-medium focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] disabled:bg-[#F9F7F5]"
            required={required}
          />

          {safeStart && (
            <p className="text-[11px] text-[#766554] flex items-center gap-1 pl-1">
              📅 {getVietnameseDayOfWeek(safeStart)}
            </p>
          )}

          {!disabled && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleStartChange(getToday())}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E8DFD8] text-[#554536] hover:border-[#B38A58] hover:text-[#985018] transition-colors"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleStartChange(getNextMonday())}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E8DFD8] text-[#554536] hover:border-[#B38A58] hover:text-[#985018] transition-colors"
              >
                Thứ 2 tới
              </button>
              <button
                type="button"
                onClick={() => handleStartChange(getFirstDayOfNextMonth())}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E8DFD8] text-[#554536] hover:border-[#B38A58] hover:text-[#985018] transition-colors"
              >
                Đầu tháng sau
              </button>
            </div>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1">
              <Calendar size={13} className="text-[#B38A58]" />
              Ngày bế giảng / Kết thúc <span className="text-red-500">*</span>
            </label>
            {safeEnd && (
              <span className="text-[11px] font-semibold text-[#985018]">
                {getVietnameseDayOfWeek(safeEnd).split(",")[0]}
              </span>
            )}
          </div>

          <input
            type="date"
            value={safeEnd}
            min={safeStart || undefined}
            disabled={disabled}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={`w-full text-xs px-3 py-2.5 bg-white border rounded-xl font-medium focus:outline-none focus:ring-1 disabled:bg-[#F9F7F5] ${
              isInvalidRange
                ? "border-red-400 text-red-700 focus:border-red-500 focus:ring-red-500"
                : "border-[#E8DFD8] text-[#2C241E] focus:border-[#B38A58] focus:ring-[#B38A58]"
            }`}
            required={required}
          />

          {isInvalidRange ? (
            <p className="text-[11px] text-red-600 flex items-center gap-1 pl-1 font-semibold">
              <AlertCircle size={12} />
              Ngày kết thúc phải diễn ra sau ngày bắt đầu!
            </p>
          ) : safeEnd ? (
            <p className="text-[11px] text-[#766554] flex items-center gap-1 pl-1">
              🏁 {getVietnameseDayOfWeek(safeEnd)}
            </p>
          ) : null}

          {!disabled && safeStart && (
            <div className="pt-1">
              <span className="text-[11px] text-[#766554]">
                Tự động chọn thời lượng lớp:
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Duration Preset Chips */}
      {!disabled && (
        <div className="pt-2 border-t border-[#EFE8E1]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-[#554536] flex items-center gap-1">
              <Sparkles size={12} className="text-[#B38A58]" />
              Chọn nhanh thời lượng lớp học:
            </span>
            <span className="text-[11px] text-[#766554]">
              (Tự động cộng dồn ngày kết thúc)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {DURATION_PRESETS.map((p) => {
              const isSelected = durationDays === p.days;
              return (
                <button
                  type="button"
                  key={p.days}
                  onClick={() => handleSelectPreset(p.days)}
                  className={`px-2.5 py-2 rounded-xl text-left transition-all border ${
                    isSelected
                      ? "bg-[#985018] text-white border-[#985018] shadow-xs"
                      : "bg-white text-[#2C241E] border-[#E8DFD8] hover:border-[#B38A58] hover:bg-[#FAF6F2]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{p.label}</span>
                    {isSelected && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span
                    className={`block text-[10px] mt-0.5 truncate ${
                      isSelected ? "text-amber-100" : "text-[#766554]"
                    }`}
                  >
                    {p.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface BatchScheduleTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const SCHEDULE_PRESETS = [
  "Thứ 2 - Thứ 6 (Sáng 08:30 - 11:30)",
  "Thứ 2 - Thứ 6 (Chiều 13:30 - 16:30)",
  "Tối Thứ 2, 4, 6 (18:30 - 21:00)",
  "Tối Thứ 3, 5, 7 (18:30 - 21:00)",
  "Cuối tuần: Thứ 7 & Chủ Nhật (08:30 - 17:00)",
  "Học cấp tốc cả ngày (09:00 - 17:00)",
];

export const BatchScheduleTextEditor: React.FC<BatchScheduleTextEditorProps> = ({
  value,
  onChange,
  required = true,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ví dụ: Thứ 2 - Thứ 6 (Sáng 08:30 - 11:30)"
        className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] disabled:bg-[#F9F7F5]"
        required={required}
      />
      {!disabled && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {SCHEDULE_PRESETS.map((preset) => {
            const isSelected = value === preset;
            return (
              <button
                type="button"
                key={preset}
                onClick={() => onChange(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-[#985018] text-white border-[#985018] font-bold shadow-xs"
                    : "bg-white text-[#554536] border-[#E8DFD8] hover:border-[#B38A58] hover:text-[#985018]"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {preset}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

