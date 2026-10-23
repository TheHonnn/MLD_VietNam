import React, { useEffect, useRef, useState } from "react";
import { TrainingActions } from "./TrainingActions";
import { QuizOptions, quizOptions } from "./QuizOptions";
import { ConsultationSurveySheet, COMMON_FOCUS_AREAS } from "./ConsultationSurveyView";
import { ServiceDetailSheet } from "./ServiceDetailView";
import { TreatmentPackageDetailSheet } from "./TreatmentPackageDetailView";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAdmin } from "./Auth";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Eye,
  Check,
  Play,
  LogOut,
  Send,
  Ban,
  Save,
  AlertCircle,
  Upload,
  Lock,
  Calendar,
  ArrowUpRight,
  Printer,
  FileText,
  Sparkles,
  AlertTriangle,
  Leaf,
  Clock,
  Layers,
  CreditCard,
} from "lucide-react";
import {
  adminApi,
  Column,
  Listing,
  recordLabel,
  Resource,
  Row,
  rowKey,
} from "./api";
import { DEFAULT_RESOURCES } from "./defaultResources";
import { display, enums, label } from "./labels";
import {
  VIETNAM_LOCATIONS_2026,
  VIETNAM_PROVINCE_NAMES,
  HISTORICAL_TO_2026_PROVINCE,
  HISTORICAL_PROVINCE_NAMES,
} from "../data/vietnamLocations";

const toSlug = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

function ServiceStepsEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (steps: string[]) => void;
}) {
  const steps: string[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const p = JSON.parse(value);
            return Array.isArray(p) ? p : [value];
          } catch {
            return value.split("\n").filter(Boolean);
          }
        })()
      : [];

  const updateStep = (idx: number, text: string) => {
    const next = [...steps];
    next[idx] = text;
    onChange(next);
  };

  const removeStep = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx);
    onChange(next);
  };

  const addStep = () => {
    onChange([...steps, `Bước ${steps.length + 1}: `]);
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-[#2C241E]">
          Quy trình chuẩn kỹ thuật viên ({steps.length} bước)
        </span>
        <button
          type="button"
          onClick={addStep}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer"
        >
          + Thêm bước
        </button>
      </div>
      {steps.map((st, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#BA7E4C] text-white text-xs font-bold flex items-center justify-center shrink-0">
            {idx + 1}
          </span>
          <input
            type="text"
            value={st}
            placeholder={`Nội dung bước ${idx + 1}...`}
            onChange={(e) => updateStep(idx, e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
          />
          <button
            type="button"
            onClick={() => removeStep(idx)}
            className="p-1 text-[#A69788] hover:text-[#DC2626] cursor-pointer"
            title="Xóa bước này"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {steps.length === 0 && (
        <p className="text-xs text-[#8C7A6B] py-2 text-center italic">
          Chưa có bước quy trình. Bấm "+ Thêm bước" để bổ sung các bước SOP cho KTV.
        </p>
      )}
    </div>
  );
}

function ServiceBenefitsEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (benefits: string[]) => void;
}) {
  const benefits: string[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const p = JSON.parse(value);
            return Array.isArray(p) ? p : [value];
          } catch {
            return value.split("\n").filter(Boolean);
          }
        })()
      : [];

  const [inputVal, setInputVal] = useState("");

  const addBenefit = () => {
    if (!inputVal.trim()) return;
    onChange([...benefits, inputVal.trim()]);
    setInputVal("");
  };

  const removeBenefit = (idx: number) => {
    onChange(benefits.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl font-['Plus_Jakarta_Sans',sans-serif]">
      <span className="text-xs font-bold text-[#2C241E] block">
        Hiệu quả & Lợi ích trị liệu ({benefits.length} lợi ích)
      </span>
      <div className="flex flex-wrap gap-1.5">
        {benefits.map((b, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-[#2C241E] border border-[#E8DFD8] shadow-xs"
          >
            <span className="text-[#0D6832] font-bold">✓</span>
            <span>{b}</span>
            <button
              type="button"
              onClick={() => removeBenefit(idx)}
              className="text-[#A69788] hover:text-[#DC2626] cursor-pointer ml-0.5"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={inputVal}
          placeholder="Nhập lợi ích mới (e.g. Giảm đau nhức mỏi, Cải thiện giấc ngủ...)"
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addBenefit();
            }
          }}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
        />
        <button
          type="button"
          onClick={addBenefit}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer shrink-0"
        >
          + Thêm
        </button>
      </div>
    </div>
  );
}

function ServiceImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const PRESET_SPA_IMAGES = [
    { label: "Chăm sóc da", url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881" },
    { label: "Gội đầu", url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1" },
    { label: "Massage body", url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874" },
    { label: "Thẩm mỹ CNC", url: "https://images.unsplash.com/photo-1512290903671-17adc820948b" },
  ];

  return (
    <div className="space-y-2 p-3 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center gap-3">
        {value ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-[#E8DFD8] shrink-0 shadow-xs">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-[#F0E6DC] text-[#985018] flex items-center justify-center shrink-0 border border-[#E8DFD8]">
            <Leaf className="w-6 h-6 stroke-[1.8]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <input
            type="url"
            value={value || ""}
            placeholder="Nhập đường dẫn ảnh (URL) hoặc chọn ảnh mẫu bên dưới..."
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[11px] text-[#8C7A6B]">Ảnh mẫu gợi ý:</span>
        {PRESET_SPA_IMAGES.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.url)}
            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-[#73675F] border border-[#E8DFD8] hover:border-[#BA7E4C] hover:text-[#985018] cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatCell(row: Row, c: Column): React.ReactNode {
  if (c.name === "branch_id") {
    return row.branch_name || row.branches?.name || row.branches?.code || display(row[c.name]);
  }
  if (c.name === "user_id") {
    return row.full_name || row.users?.full_name || display(row[c.name]);
  }
  if (c.name === "customer_id") {
    const custName = row.customer_name || row.customer?.full_name || row.users?.full_name || display(row[c.name]);
    const phone = row.customer_phone || row.customer?.phone || row.users?.phone;
    const avatar = row.customer_avatar || row.customer?.avatar_url || row.users?.avatar_url;
    return (
      <div className="flex items-center gap-2.5">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="w-7 h-7 rounded-full object-cover border border-[#EFE4D9] shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#FAF0E4] text-[#985018] font-bold text-xs flex items-center justify-center shrink-0 border border-[#E8DFD8]">
            {String(custName || "K").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-bold text-[#2C241E] truncate leading-tight">{custName}</div>
          {phone && <div className="text-[10px] text-[#73675F]">{phone}</div>}
        </div>
      </div>
    );
  }
  if (c.name === "technician_id") {
    return row.technician_name || row.technicians?.full_name || display(row[c.name]);
  }
  if (c.name === "service_id") {
    return row.service_name || row.services?.name || display(row[c.name]);
  }
  if (c.name === "category_id") {
    const catName = row.category_name || row.service_categories?.name || display(row[c.name]);
    if (!catName || catName === "—") return "—";
    const lower = String(catName).toLowerCase();
    const icon = lower.includes("da") ? "✨" : lower.includes("gội") || lower.includes("đầu") ? "💆" : lower.includes("massage") || lower.includes("body") ? "🌿" : lower.includes("thẩm mỹ") || lower.includes("cao") ? "⚡" : "🌸";
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
        <span>{icon}</span>
        <span>{catName}</span>
      </span>
    );
  }
  if (c.name === "image_url" || c.name === "icon_url") {
    const url = row[c.name];
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FAF8F5] border border-[#E8DFD8] shrink-0 shadow-xs flex items-center justify-center">
        {url ? (
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <Leaf className="w-4 h-4 text-[#BA7E4C]" />
        )}
      </div>
    );
  }
  if (c.name === "duration_minutes") {
    const val = row[c.name];
    if (!val) return "—";
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
        <Clock className="w-3.5 h-3.5 text-[#985018]" />
        <span>{val} phút</span>
      </span>
    );
  }
  if (c.name === "total_sessions") {
    const val = row[c.name];
    if (!val) return "—";
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EAF2FA] text-[#1E5D9B] border border-[#CDE1F4]">
        <span>🎟️</span>
        <span>{val} buổi</span>
      </span>
    );
  }
  if (c.name === "validity_months") {
    const val = row[c.name];
    return val ? <span className="text-xs font-semibold text-[#73675F]">📅 {val} tháng</span> : "—";
  }
  if (c.name === "price") {
    const p = Number(row.price || 0);
    return (
      <div className="font-bold text-[#2C241E] text-xs">
        {p > 0 ? `${p.toLocaleString("vi-VN")} ₫` : "—"}
      </div>
    );
  }
  if (c.name === "discount_price") {
    const val = Number(row[c.name]);
    return val > 0 ? (
      <span className="font-extrabold text-[#0D6832] text-xs">
        {val.toLocaleString("vi-VN")} ₫
      </span>
    ) : (
      <span className="text-[#A69788] text-xs">—</span>
    );
  }
  if (c.name === "is_featured") {
    return Boolean(row[c.name]) ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A]">
        <span>⭐</span>
        <span>Nổi bật</span>
      </span>
    ) : (
      <span className="text-[#A69788] text-xs">—</span>
    );
  }
  if (c.name === "is_active") {
    const active = Boolean(row[c.name]);
    return active ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[#E8F6ED] text-[#0D6832] border border-[#BDE8CD]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0D6832]" />
        <span>Đang kinh doanh</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F5F5F5] text-[#73675F] border border-[#E5E5E5]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#A3A3A3]" />
        <span>Tạm dừng</span>
      </span>
    );
  }
  if (c.name === "name" && (row.slug || row.short_description)) {
    return (
      <div className="min-w-0 max-w-[240px]">
        <div className="font-bold text-[#2C241E] leading-snug truncate" title={row.name}>{row.name}</div>
        {row.slug && (
          <div className="text-[10px] text-[#8C7A6B] font-mono mt-0.5 truncate">
            {row.slug}
          </div>
        )}
      </div>
    );
  }
  if (c.name === "commission_amount") {
    const val = Number(row[c.name] || 0);
    return (
      <span className="font-extrabold text-[#0D6832] text-xs">
        +{val.toLocaleString("vi-VN")} ₫
      </span>
    );
  }
  if (c.name === "base_amount") {
    const val = Number(row[c.name] || 0);
    return (
      <span className="font-medium text-[#2C241E] text-xs">
        {val.toLocaleString("vi-VN")} ₫
      </span>
    );
  }
  if (c.name === "percentage") {
    const val = Number(row[c.name] || 0);
    return (
      <span className="font-bold text-[#8A4F23] text-xs">
        {val}%
      </span>
    );
  }
  if (c.name === "staff_id") {
    const name = row.staff_name || row.staff?.full_name || (typeof row[c.name] === "string" ? row[c.name] : null);
    const phone = row.staff_phone || row.staff?.phone;
    return (
      <div>
        <div className="font-bold text-[#2C241E] text-xs">{name || "—"}</div>
        {phone && <div className="text-[10px] text-[#8C7A6B]">{phone}</div>}
      </div>
    );
  }
  if (c.name === "status" && (row.commission_type || row.commission_amount !== undefined)) {
    const s = String(row[c.name] || "APPROVED");
    const isPaid = s === "PAID";
    const isApproved = s === "APPROVED";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          isPaid
            ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
            : isApproved
            ? "bg-[#E8F6ED] text-[#0D6832] border-[#BDE8CD]"
            : "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPaid ? "bg-[#1D4ED8]" : isApproved ? "bg-[#0D6832]" : "bg-[#854D0E]"
          }`}
        />
        <span>{enums[s] || s}</span>
      </span>
    );
  }
  if (c.name === "booking_id") {
    const bCode = row.booking_code || row.bookings?.booking_code || (typeof row[c.name] === "string" ? row[c.name] : null);
    if (!bCode) return "—";
    const shortCode = bCode.startsWith("BK-") ? bCode : `BK-${String(bCode).slice(0, 8)}`;
    return (
      <a
        href={`/staff-schedule?booking=${encodeURIComponent(bCode)}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] hover:text-[#854412] transition-colors"
        title="Bấm để mở lịch trình ca làm này"
      >
        <span>{shortCode}</span>
        <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
      </a>
    );
  }
  if (c.name === "focus_areas") {
    const areas = Array.isArray(row[c.name])
      ? row[c.name]
      : typeof row[c.name] === "string" && row[c.name].trim().length > 0
        ? row[c.name].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
    if (areas.length === 0) return "—";
    return (
      <div className="flex flex-wrap gap-1 max-w-[220px]">
        {areas.map((a: string, idx: number) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#FAF0E4] text-[#6B4B35] border border-[#E8DFD8]"
          >
            {a}
          </span>
        ))}
      </div>
    );
  }
  if (c.name === "pressure_pref") {
    const val = String(row[c.name] || "").toUpperCase();
    if (val === "LIGHT" || val === "NHẸ NHÀNG") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F6ED] text-[#0D6832] border border-[#BDE8CD]">
          <span>🍃</span>
          <span>Nhẹ nhàng</span>
        </span>
      );
    }
    if (val === "MEDIUM" || val === "VỪA PHẢI") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
          <span>⚡</span>
          <span>Vừa phải</span>
        </span>
      );
    }
    if (val === "STRONG" || val === "LỰC MẠNH") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
          <span>💪</span>
          <span>Lực mạnh</span>
        </span>
      );
    }
    return display(row[c.name]);
  }
  if (c.name === "has_sensitive_skin") {
    const isSensitive = Boolean(row[c.name]);
    return isSensitive ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
        <span>⚠️</span>
        <span>Da nhạy cảm</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#73675F] bg-[#FAF8F5] border border-[#E8DFD8]">
        Bình thường
      </span>
    );
  }
  if (c.name === "has_oil_allergy") {
    const hasAllergy = Boolean(row[c.name]);
    const details = row.allergy_details;
    return hasAllergy ? (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]"
        title={details ? `Chi tiết: ${details}` : "Dị ứng tinh dầu"}
      >
        <span>⛔</span>
        <span>Dị ứng{details ? `: ${details}` : ""}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#166534] bg-[#E8F6ED] border border-[#DCFCE7]">
        An toàn
      </span>
    );
  }
  if (c.name === "primary_instructor_id" || c.name === "instructor_id") {
    return row.instructor_name || row.instructor?.full_name || display(row[c.name]);
  }
  if (c.name === "rating") {
    const val = Number(row[c.name]);
    if (!isNaN(val) && val > 0) {
      return `⭐ ${val} / 5`;
    }
  }
  if (c.name === "reward_points") {
    const val = Number(row[c.name]);
    if (!isNaN(val)) {
      return val.toLocaleString("vi-VN") + " điểm";
    }
  }
  if (c.name === "total_spent") {
    const val = Number(row[c.name]);
    if (!isNaN(val)) {
      return val.toLocaleString("vi-VN") + " đ";
    }
  }
  if (c.name === "base_salary") {
    const val = Number(row[c.name]);
    if (!isNaN(val) && val > 0) {
      return val.toLocaleString("vi-VN") + " đ";
    }
  }
  if (c.name === "commission_rate") {
    const val = Number(row[c.name]);
    if (!isNaN(val) && val > 0) {
      return val + " %";
    }
  }
  if (c.name === "gender") {
    const val = String(row[c.name] || "").toUpperCase();
    if (val === "MALE") return "👨 Nam";
    if (val === "FEMALE") return "👩 Nữ";
    if (val === "OTHER") return "🧑 Khác";
    return display(row[c.name]);
  }
  if (c.name === "avatar_url" && row[c.name]) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={row[c.name]}
          alt=""
          className="w-7 h-7 rounded-full object-cover border border-[#EFE4D9] bg-[#FAF8F5] shrink-0"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
        <span className="text-xs text-[#7A6D61] truncate max-w-[130px]">{row[c.name]}</span>
      </div>
    );
  }
  if (
    c.type === "timestamptz" ||
    c.type === "timestamp" ||
    c.name === "created_at" ||
    c.name === "updated_at" ||
    c.name.endsWith("_at")
  ) {
    const val = row[c.name];
    if (!val) return "—";
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return (
        <span className="text-[11.5px] font-medium text-[#73675F]" title={String(val)}>
          {new Intl.DateTimeFormat("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(d)}
        </span>
      );
    }
  }
  if (Array.isArray(row[c.name])) {
    return row[c.name].length > 0 ? row[c.name].join(", ") : "—";
  }
  return display(row[c.name]);
}

function ReferenceInput({
  column,
  value,
  onChange,
  required,
}: {
  column: Column;
  value: string;
  onChange: (v: string) => void;
  required: boolean;
}) {
  const [search, setSearch] = useState(""),
    [rows, setRows] = useState<Row[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      adminApi<Listing>(
        `${column.reference!.table}?limit=25&page=${page}&search=${encodeURIComponent(search)}`,
        undefined,
        controller.signal,
      )
        .then((data) => {
          setRows(data.rows);
          setTotal(data.total);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [column.reference!.table, search, page]);
  return (
    <div className="admin-reference">
      <input
        type="search"
        aria-label={`Tìm ${label(column.name)}`}
        placeholder="Tìm bản ghi liên kết…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <select
        aria-label={label(column.name)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={busy}
      >
        <option value="">{busy ? "Đang tải…" : "Chưa chọn"}</option>
        {value &&
          !rows.some((r) => String(r[column.reference!.column]) === value) && (
            <option value={value}>{value}</option>
          )}
        {rows.map((r, i) => (
          <option
            key={String(r[column.reference!.column]) + "-" + i}
            value={r[column.reference!.column]}
          >
            {recordLabel(r)}
            {r.phone ? " · " + r.phone : ""}
            {r.full_name || r.name || r.title
              ? " · " + String(r[column.reference!.column]).slice(0, 8)
              : ""}
          </option>
        ))}
      </select>
      {error && <span className="admin-field-error">{error}</span>}
      {total > 25 && (
        <div className="admin-reference-pages">
          <button
            type="button"
            title="Trang trước"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {page} / {Math.ceil(total / 25)}
          </span>
          <button
            type="button"
            title="Trang sau"
            disabled={page * 25 >= total || busy}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ImageUploadInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSearchEngineUrl =
    typeof value === "string" &&
    (value.includes("bing.com/images") ||
      value.includes("google.com/search") ||
      value.includes("google.com/imgres") ||
      value.includes("yandex.com/images"));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLoadError(false);
    try {
      const ext = file.name.split(".").pop() || "png";
      const cleanFileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const SUPABASE_URL = "https://wstvwushpwcdsmhpunvh.supabase.co";
      const KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE";

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${cleanFileName}`,
        {
          method: "POST",
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            "Content-Type": file.type || "image/png",
          },
          body: file,
        },
      );
      if (!res.ok) {
        throw new Error("Không thể tải ảnh lên kho lưu trữ Supabase.");
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${cleanFileName}`;
      onChange(publicUrl);
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải ảnh");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="url"
          style={{ flex: 1 }}
          placeholder="https://... (dán link ảnh trực tiếp đuôi .jpg, .png hoặc tải từ máy)"
          value={value}
          onChange={(e) => {
            setLoadError(false);
            onChange(e.target.value.trim());
          }}
          required={required}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="admin-secondary"
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            cursor: "pointer",
          }}
          title="Tải ảnh trực tiếp từ máy tính"
        >
          {uploading ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          <span>{uploading ? "Đang tải..." : "Tải từ máy"}</span>
        </button>
      </div>

      {isSearchEngineUrl && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#FEF3C7",
            border: "1px solid #FCD34D",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#92400E",
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <b>Lưu ý link tìm kiếm:</b> Đường dẫn này là trang tìm kiếm Bing/Google, không phải file ảnh trực tiếp nên trình duyệt không thể hiển thị ảnh.
            <br />
            👉 <b>Cách làm:</b> Chuột phải vào bức ảnh trên Bing/Google &gt; chọn <b>"Sao chép địa chỉ hình ảnh" (Copy image address)</b> rồi dán lại, hoặc bấm nút <b>"Tải từ máy"</b> ở trên.
          </div>
        </div>
      )}

      {value && !isSearchEngineUrl && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 10px",
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              overflow: "hidden",
              backgroundColor: "#FFF",
              border: "1px solid #D1D5DB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {loadError ? (
              <AlertCircle size={20} color="#EF4444" />
            ) : (
              <img
                src={value}
                alt="Xem trước ảnh chân dung"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setLoadError(true)}
              />
            )}
          </div>
          <div style={{ fontSize: "12px" }}>
            {loadError ? (
              <span style={{ color: "#DC2626", fontWeight: 500 }}>
                ⚠️ Không tải được ảnh từ link này. Vui lòng kiểm tra lại đường dẫn ảnh trực tiếp.
              </span>
            ) : (
              <span style={{ color: "#059669", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Check size={14} /> Ảnh hợp lệ (Xem trước trực tiếp)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GenderSelector({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const options = [
    { key: "MALE", label: "Nam", icon: "👨" },
    { key: "FEMALE", label: "Nữ", icon: "👩" },
    { key: "OTHER", label: "Khác", icon: "🧑" },
  ];

  const currentVal = String(value || "").toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {options.map((opt) => {
          const isSelected = currentVal === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (isSelected && !required) {
                  onChange("");
                } else {
                  onChange(opt.key);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                border: isSelected ? "1.5px solid #8A4F23" : "1px solid #E8DFD8",
                background: isSelected ? "#FAF0E4" : "#ffffff",
                color: isSelected ? "#8A4F23" : "#554A41",
                boxShadow: isSelected ? "0 1px 3px rgba(138, 79, 35, 0.12)" : "none",
              }}
            >
              <span style={{ fontSize: "14px" }}>{opt.icon}</span>
              <span>{opt.label}</span>
              {isSelected && <Check size={14} style={{ marginLeft: "2px" }} />}
            </button>
          );
        })}
      </div>
      {currentVal && (
        <span style={{ fontSize: "11px", color: "#8A4F23", paddingLeft: "2px" }}>
          Đã chọn: <b>{currentVal === "MALE" ? "Nam (MALE)" : currentVal === "FEMALE" ? "Nữ (FEMALE)" : "Khác (OTHER)"}</b>
        </span>
      )}
    </div>
  );
}

const PRESET_CATEGORY_ICONS = [
  { label: "Chăm sóc da", url: "https://cdn-icons-png.flaticon.com/512/3163/3163195.png" },
  { label: "Gội đầu dưỡng sinh", url: "https://cdn-icons-png.flaticon.com/512/2622/2622075.png" },
  { label: "Massage Body", url: "https://cdn-icons-png.flaticon.com/512/2865/2865620.png" },
  { label: "Công nghệ cao", url: "https://cdn-icons-png.flaticon.com/512/4371/4371510.png" },
  { label: "Đông y & Thảo dược", url: "https://cdn-icons-png.flaticon.com/512/1047/1047711.png" },
  { label: "Nail & Móng", url: "https://cdn-icons-png.flaticon.com/512/1940/1940922.png" },
  { label: "Nối mi", url: "https://cdn-icons-png.flaticon.com/512/3163/3163188.png" },
  { label: "Dưỡng trắng", url: "https://cdn-icons-png.flaticon.com/512/2965/2965567.png" },
  { label: "Đào tạo Academy", url: "https://cdn-icons-png.flaticon.com/512/3976/3976625.png" },
  { label: "Mỹ phẩm Spa", url: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
];

function toCategoryCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function CategoryIconPicker({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isCustomUrl, setIsCustomUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLoadError(false);
    try {
      const ext = file.name.split(".").pop() || "png";
      const cleanFileName = `cat_icon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const SUPABASE_URL = "https://wstvwushpwcdsmhpunvh.supabase.co";
      const KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE";

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${cleanFileName}`,
        {
          method: "POST",
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            "Content-Type": file.type || "image/png",
          },
          body: file,
        }
      );

      if (!res.ok) {
        throw new Error("Tải ảnh thất bại");
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${cleanFileName}`;
      onChange(publicUrl);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tải biểu tượng lên storage. Vui lòng thử lại!");
    } finally {
      setUploading(false);
    }
  };

  const selectedPreset = PRESET_CATEGORY_ICONS.find((p) => p.url === value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      {/* 1. Preset Icons Quick Picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#766554" }}>
            ✨ Chọn nhanh biểu tượng Spa chuẩn:
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#8A4F23",
              background: "#FAF4EE",
              border: "1px solid #D7BBA6",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {uploading ? <LoaderCircle size={12} className="animate-spin" /> : <Upload size={12} />}
            <span>Tải icon từ máy</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "8px",
            background: "#FAF8F5",
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid #E8DFD8",
          }}
        >
          {PRESET_CATEGORY_ICONS.map((item) => {
            const isSelected = value === item.url;
            return (
              <button
                key={item.url}
                type="button"
                onClick={() => {
                  onChange(item.url);
                  setLoadError(false);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "6px 4px",
                  borderRadius: "8px",
                  border: isSelected ? "2px solid #8A4F23" : "1px solid #E8DFD8",
                  background: isSelected ? "#FAF0E4" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
                title={item.label}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  style={{ width: "28px", height: "28px", objectFit: "contain" }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? "#8A4F23" : "#554A41",
                    textAlign: "center",
                    lineHeight: 1.1,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      background: "#8A4F23",
                      color: "#fff",
                      borderRadius: "50%",
                      width: "14px",
                      height: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                    }}
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Preview & Custom URL Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 12px",
          background: "#ffffff",
          border: "1px solid #E8DFD8",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            border: "1px solid #E8DFD8",
            background: "#FAF8F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {value ? (
            <img
              src={value}
              alt="Icon preview"
              style={{ width: "28px", height: "28px", objectFit: "contain" }}
              onError={() => setLoadError(true)}
            />
          ) : (
            <span style={{ fontSize: "11px", color: "#A89B8F" }}>Trống</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, fontSize: "12px" }}>
          {selectedPreset ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 600, color: "#8A4F23" }}>
                Biểu tượng: {selectedPreset.label}
              </span>
              <span style={{ fontSize: "11px", color: "#059669", fontWeight: 500 }}>
                (Sẵn sàng hiển thị)
              </span>
            </div>
          ) : (
            <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#554A41" }}>
              {value ? `URL: ${value}` : "(Chưa chọn biểu tượng)"}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCustomUrl(!isCustomUrl)}
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "#766554",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            flexShrink: 0,
          }}
        >
          {isCustomUrl ? "Thu gọn URL" : "Dán link ảnh tùy chỉnh"}
        </button>
      </div>

      {isCustomUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <input
            type="url"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setLoadError(false);
            }}
            placeholder="Dán link ảnh biểu tượng (https://...png)..."
            required={required}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #E8DFD8",
              fontSize: "13px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}
    </div>
  );
}

function parseVietnameseAddress(addr: string): {
  province: string;
  district: string;
  street: string;
} {
  if (!addr || !addr.trim()) {
    return { province: "", district: "", street: "" };
  }
  const trimmed = addr.trim();

  // 1. Khớp theo 34 tỉnh thành chính thức năm 2026 (ưu tiên tên dài trước)
  const sorted2026 = [...VIETNAM_PROVINCE_NAMES].sort((a, b) => b.length - a.length);

  let matchedProvince = "";
  let remainder = trimmed;

  for (const p of sorted2026) {
    const pLower = p.toLowerCase();
    const rLower = remainder.toLowerCase();
    const idx = rLower.lastIndexOf(pLower);
    if (idx !== -1) {
      const after = rLower.slice(idx + pLower.length).trim();
      if (after === "" || after === "," || after === ".") {
        matchedProvince = p;
        remainder = remainder.slice(0, idx).trim().replace(/,\s*$/, "");
        break;
      }
    }
  }

  // 2. Nếu địa chỉ cũ dùng tên 63 tỉnh trước sáp nhập (ví dụ Bình Dương, Hải Dương...), tự động quy đổi về đơn vị mới năm 2026
  if (!matchedProvince) {
    const sortedHistorical = [...HISTORICAL_PROVINCE_NAMES].sort((a, b) => b.length - a.length);
    for (const oldP of sortedHistorical) {
      const pLower = oldP.toLowerCase();
      const rLower = remainder.toLowerCase();
      const idx = rLower.lastIndexOf(pLower);
      if (idx !== -1) {
        const after = rLower.slice(idx + pLower.length).trim();
        if (after === "" || after === "," || after === ".") {
          matchedProvince = HISTORICAL_TO_2026_PROVINCE[oldP] || oldP;
          remainder = remainder.slice(0, idx).trim().replace(/,\s*$/, "");
          break;
        }
      }
    }
  }

  let matchedDistrict = "";
  if (matchedProvince && VIETNAM_LOCATIONS_2026[matchedProvince]) {
    const districts = [...VIETNAM_LOCATIONS_2026[matchedProvince]].sort((a, b) => b.length - a.length);
    for (const d of districts) {
      const dLower = d.toLowerCase();
      const rLower = remainder.toLowerCase();
      const idx = rLower.lastIndexOf(dLower);
      if (idx !== -1) {
        const after = rLower.slice(idx + dLower.length).trim();
        if (after === "" || after === "," || after === ".") {
          matchedDistrict = d;
          remainder = remainder.slice(0, idx).trim().replace(/,\s*$/, "");
          break;
        }
      }
    }
  }

  return {
    province: matchedProvince,
    district: matchedDistrict,
    street: remainder,
  };
}

function AddressInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");
  const [isCustomDistrict, setIsCustomDistrict] = useState(false);
  const [street, setStreet] = useState("");
  const initialValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialValueRef.current === null) {
      initialValueRef.current = value || "";
      if (value) {
        const parsed = parseVietnameseAddress(value);
        if (parsed.province) {
          setProvince(parsed.province);
          if (parsed.district) {
            setDistrict(parsed.district);
          }
          setStreet(parsed.street);
        } else {
          setStreet(value);
        }
      }
    }
  }, [value]);

  const updateCombined = (newStreet: string, newDist: string, newProv: string) => {
    const parts = [newStreet.trim(), newDist.trim(), newProv.trim()].filter(Boolean);
    const combined = parts.join(", ");
    onChange(combined);
  };

  const handleProvinceChange = (newProv: string) => {
    setProvince(newProv);
    setDistrict("");
    setIsCustomDistrict(false);
    setCustomDistrict("");
    updateCombined(street, "", newProv);
  };

  const handleDistrictChange = (val: string) => {
    if (val === "__CUSTOM__") {
      setIsCustomDistrict(true);
      setDistrict("");
      updateCombined(street, customDistrict, province);
    } else {
      setIsCustomDistrict(false);
      setDistrict(val);
      updateCombined(street, val, province);
    }
  };

  const handleCustomDistrictChange = (val: string) => {
    setCustomDistrict(val);
    updateCombined(street, val, province);
  };

  const handleStreetChange = (val: string) => {
    setStreet(val);
    const effectiveDistrict = isCustomDistrict ? customDistrict : district;
    updateCombined(val, effectiveDistrict, province);
  };

  const availableDistricts = province ? VIETNAM_LOCATIONS_2026[province] || [] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      {/* Row 1: Tỉnh/Thành phố & Quận/Huyện */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#766554" }}>
            Tỉnh / Thành phố
          </span>
          <select
            value={province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            required={required}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #E8DFD8",
              background: "#fff",
              fontSize: "13px",
              color: "#332A24",
              width: "100%",
            }}
          >
            <option value="">-- Chọn Tỉnh / Thành phố --</option>
            {VIETNAM_PROVINCE_NAMES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#766554" }}>
            Quận / Huyện / Thị xã
          </span>
          {isCustomDistrict ? (
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={customDistrict}
                onChange={(e) => handleCustomDistrictChange(e.target.value)}
                placeholder="Nhập quận/huyện..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #E8DFD8",
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomDistrict(false);
                  setCustomDistrict("");
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: "11px",
                  background: "#F3EDE7",
                  border: "1px solid #E2D7CB",
                  borderRadius: "6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Danh sách
              </button>
            </div>
          ) : (
            <select
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!province}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #E8DFD8",
                background: province ? "#fff" : "#FAF8F5",
                fontSize: "13px",
                color: "#332A24",
                width: "100%",
              }}
            >
              <option value="">
                {province ? "-- Chọn Quận / Huyện --" : "-- Hãy chọn Tỉnh/Thành trước --"}
              </option>
              {district && !availableDistricts.includes(district) && (
                <option value={district}>{district}</option>
              )}
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              {province && <option value="__CUSTOM__">+ Nhập quận / huyện khác...</option>}
            </select>
          )}
        </div>
      </div>

      {/* Row 2: Địa chỉ chi tiết */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#766554" }}>
          Số nhà, tên đường, tòa nhà, phường/xã
        </span>
        <input
          type="text"
          value={street}
          onChange={(e) => handleStreetChange(e.target.value)}
          placeholder="Ví dụ: Số 123 Nguyễn Huệ, Phường Bến Nghé..."
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #E8DFD8",
            fontSize: "13px",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}

function RecordDialog({
  resource,
  columns,
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}: {
  resource: Resource;
  columns: Column[];
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}) {
  const [values, setValues] = useState<Row>(() =>
      mode === "create" ? { ...row } : {},
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const generated =
    resource.name === "users"
      ? [
          "referral_code",
          "locked_reason",
          "locked_at",
          "fcm_device_token",
          ...(mode === "create" ? ["reward_points", "total_spent", "membership_tier"] : []),
        ]
      : resource.name === "student_certificates"
        ? ["qr_verification_code"]
        : [];
  const fields = columns.filter(
    (c) =>
      !generated.includes(c.name) &&
      (mode === "view" ||
        (c.writable && !(mode === "update" && c.primary))),
  );
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const set = (name: string, value: any) =>
    setValues((old) => {
      const next = { ...old, [name]: value };
      if (resource.name === "service_categories" && mode === "create") {
        if (name === "code") {
          setCodeManuallyEdited(true);
        } else if (name === "name" && !codeManuallyEdited) {
          next.code = toCategoryCode(String(value || ""));
        }
      }
      return next;
    });

  const formatDatetimeForInput = (val: any) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val).slice(0, 16);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const formatDateForInput = (val: any) => {
    if (!val) return "";
    return String(val).slice(0, 10);
  };

  const current = (c: Column) => {
    if (values[c.name] !== undefined) return values[c.name];
    if (mode === "create") {
      if (resource.name === "service_categories") {
        if (c.name === "display_order") return 1;
        if (c.name === "icon_url") return PRESET_CATEGORY_ICONS[0].url;
      }
      if (c.type === "bool") return c.defaultValue === "true" || c.name.startsWith("is_");
      if (c.name === "valid_from") {
        return formatDatetimeForInput(new Date());
      }
      if (c.name === "valid_to") {
        return formatDatetimeForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      }
      if (c.name === "booking_date" || c.name === "session_date" || c.name === "start_date") {
        return formatDateForInput(new Date());
      }
      return "";
    }
    const val = row[c.name];
    if (val === null || val === undefined) return "";
    if (c.type === "timestamptz" || c.type === "timestamp") {
      return formatDatetimeForInput(val);
    }
    if (c.type === "date") {
      return formatDateForInput(val);
    }
    return val;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: Row = {};
      const mergedValues: Row = { ...values };

      // Ensure fields with create defaults are populated
      if (mode === "create") {
        for (const c of fields) {
          if (mergedValues[c.name] === undefined) {
            const defVal = current(c);
            if (defVal !== "" && defVal !== undefined) {
              mergedValues[c.name] = defVal;
            }
          }
        }
      }

      for (const [name, value] of Object.entries(mergedValues)) {
        if (resource.name === "users" && ["reward_points", "total_spent", "membership_tier"].includes(name)) {
          continue; // Khóa chỉnh sửa thủ công để đảm bảo toàn vẹn dữ liệu kế toán và loyalty
        }
        if (resource.name === "reviews" && name !== "branch_reply") {
          continue; // Chỉ cho phép phản hồi chi nhánh, không can thiệp nội dung nhận xét hoặc số sao của khách
        }
        if (resource.name === "support_tickets" && !["admin_reply", "status"].includes(name)) {
          continue; // Chỉ cho phép phản hồi và cập nhật trạng thái xử lý yêu cầu hỗ trợ
        }
        const c = columns.find((x) => x.name === name);
        if (name === "password") {
          if (value) payload.password = value;
          continue;
        }
        if (!c) continue;
        if (value === "") {
          if (mode === "update" || !c.hasDefault) payload[name] = null;
          continue;
        }
        if (["numeric", "int2", "int4", "int8", "float4", "float8"].includes(c.type)) {
          payload[name] = isNaN(Number(value)) ? value : Number(value);
        } else if (["timestamptz", "timestamp"].includes(c.type) && typeof value === "string") {
          try {
            payload[name] = new Date(value).toISOString();
          } catch {
            payload[name] = value;
          }
        } else if (["json", "jsonb"].includes(c.type) || c.type.startsWith("_")) {
          payload[name] = typeof value === "string" ? JSON.parse(value) : value;
        } else {
          payload[name] = value;
        }
      }
      await adminApi(`${resource.name}/${mode}`, {
        values: payload,
        ...(mode === "update"
          ? { key: rowKey(columns, row), expectedUpdatedAt: row.updated_at }
          : {}),
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Nội dung JSON chưa hợp lệ."
          : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      className="admin-dialog"
      ref={dialog}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="record-heading"
    >
      <form onSubmit={save}>
        <header>
          <div>
            <p className="admin-eyebrow">
              {resource.name === "consultation_surveys" && mode === "view"
                ? "MLD Spa & Clinic · Khảo sát lâm sàng"
                : resource.name === "services" && mode === "view"
                  ? "MLD Spa & Clinic · Danh mục dịch vụ"
                  : resource.title}
            </p>
            <h2 id="record-heading">
              {resource.name === "consultation_surveys" && mode === "view"
                ? "Phiếu Khảo Sát & Chỉ Định Trước Dịch Vụ"
                : resource.name === "services" && mode === "view"
                  ? "Hồ Sơ Tiêu Chuẩn Dịch Vụ MLD"
                  : mode === "view"
                    ? "Chi tiết"
                    : mode === "create"
                      ? "Thêm mới"
                      : "Chỉnh sửa"}
            </h2>
          </div>
          <button
            type="button"
            className="admin-icon"
            title="Đóng"
            onClick={onClose}
            disabled={busy}
          >
            <X />
          </button>
        </header>

        {resource.name === "consultation_surveys" && mode === "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh]">
            <ConsultationSurveySheet
              row={row}
              onClose={onClose}
              onRefresh={onSaved}
            />
          </div>
        ) : resource.name === "services" && mode === "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
            <ServiceDetailSheet
              row={row}
              onClose={onClose}
              onEdit={() => (onSwitchMode ? onSwitchMode("update", row) : undefined)}
              onRefresh={onSaved}
            />
          </div>
        ) : resource.name === "treatment_packages" && mode === "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
            <TreatmentPackageDetailSheet
              row={row}
              onClose={onClose}
              onEdit={() => (onSwitchMode ? onSwitchMode("update", row) : undefined)}
              onRefresh={onSaved}
            />
          </div>
        ) : (
          <div className="admin-form-grid">
            {fields.map((c) => {
              const value = current(c),
                structured =
                  ["json", "jsonb"].includes(c.type) || c.type.startsWith("_");
              const required = c.required && !c.hasDefault && mode === "create";
              const text =
                structured && typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value);

              if (
                resource.name === "consultation_surveys" &&
                c.name === "focus_areas" &&
                mode !== "view"
              ) {
                const currentAreas: string[] = Array.isArray(value)
                  ? value
                  : typeof value === "string" && value.length > 0
                    ? value.split(",").map((s: string) => s.trim())
                    : [];
                return (
                  <div key={c.name} className="admin-field-wide space-y-2">
                    <span className="text-xs font-bold text-[#2C241E]">
                      {label(c.name)} {required && <b className="admin-required">*</b>}
                    </span>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl">
                      {COMMON_FOCUS_AREAS.map((area) => {
                        const isSelected = currentAreas.includes(area);
                        return (
                          <button
                            type="button"
                            key={area}
                            onClick={() => {
                              const next = isSelected
                                ? currentAreas.filter((x) => x !== area)
                                : [...currentAreas, area];
                              set("focus_areas", next);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#985018] text-white border-[#985018] shadow-xs"
                                : "bg-white text-[#73675F] border-[#E8DFD8] hover:border-[#D8BDA7]"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (
                resource.name === "consultation_surveys" &&
                c.name === "has_oil_allergy" &&
                mode !== "view"
              ) {
                return (
                  <div key={c.name} className="space-y-2">
                    <label className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => set("has_oil_allergy", e.target.checked)}
                        className="w-4 h-4 text-[#985018] rounded"
                      />
                      <span className="text-xs font-bold text-[#2C241E]">
                        Khách bị dị ứng tinh dầu
                      </span>
                    </label>
                  </div>
                );
              }

              if (
                resource.name === "quiz_questions" &&
                c.name === "options" &&
                mode !== "view"
              )
                return (
                  <QuizOptions
                    key={c.name}
                    value={value}
                    onChange={(options, removed) => {
                      set("options", options);
                      if (removed) set("correct_option", "");
                    }}
                  />
                );
              if (
                resource.name === "services" &&
                c.name === "steps" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <ServiceStepsEditor
                      value={value}
                      onChange={(steps) => set("steps", steps)}
                    />
                  </div>
                );

              if (
                resource.name === "services" &&
                c.name === "benefits" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <ServiceBenefitsEditor
                      value={value}
                      onChange={(benefits) => set("benefits", benefits)}
                    />
                  </div>
                );

              if (
                resource.name === "services" &&
                c.name === "image_url" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <span className="text-xs font-bold text-[#2C241E] mb-1.5 block">
                      Ảnh đại diện dịch vụ (URL)
                    </span>
                    <ServiceImageInput
                      value={String(value || "")}
                      onChange={(url) => set("image_url", url)}
                    />
                  </div>
                );

              if (
                resource.name === "service_categories" &&
                c.name === "icon_url" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <span className="text-xs font-bold text-[#2C241E] mb-1.5 flex items-center justify-between">
                      <span>Biểu tượng danh mục <b className="text-[#8A4F23]">*</b></span>
                      <span className="text-[11px] font-normal text-[#8A7968]">Hỗ trợ chọn icon sẵn, tải ảnh hoặc dán link</span>
                    </span>
                    <CategoryIconPicker
                      value={String(value || "")}
                      onChange={(url) => set("icon_url", url)}
                      required={required}
                    />
                  </div>
                );

            return (
              <label
                key={c.name}
                className={
                  structured || c.type === "text" || c.name === "address" || c.name.endsWith("_address") || c.name === "icon_url" ? "admin-field-wide" : ""
                }
              >
                <span>
                  {label(c.name)}
                  {required && <b className="admin-required"> *</b>}
                  {resource.name === "service_categories" && c.name === "code" && (
                    <span style={{ fontSize: "11px", color: "#8A7968", fontWeight: "normal", marginLeft: "6px" }}>
                      (Tự động tạo theo Tên danh mục)
                    </span>
                  )}
                </span>
                {mode === "view" ? (
                  <div className="admin-detail-value">
                    {formatCell(row, c)}
                  </div>
                ) : resource.name === "users" && (c.name === "reward_points" || c.name === "total_spent" || c.name === "membership_tier") ? (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#FAF8F5",
                      border: "1px solid #E8DFD8",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#332A24",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: c.name === "total_spent" ? "#0D6832" : "#8A4F23" }}>
                      {c.name === "reward_points"
                        ? `${Number(value || 0).toLocaleString("vi-VN")} điểm`
                        : c.name === "total_spent"
                        ? `${Number(value || 0).toLocaleString("vi-VN")} đ`
                        : enums[value] || value || "STANDARD"}
                    </span>
                    <span style={{ fontSize: "11px", color: "#8A7968", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Lock size={12} />
                      {c.name === "reward_points"
                        ? "Tự động từ giao dịch điểm"
                        : c.name === "total_spent"
                        ? "Tự động từ hóa đơn POS"
                        : "Tự động theo mức chi tiêu"}
                    </span>
                  </div>
                ) : resource.name === "reviews" && c.name !== "branch_reply" ? (
                  <div className="admin-detail-value">
                    {formatCell(row, c)}
                  </div>
                ) : resource.name === "support_tickets" && !["admin_reply", "status"].includes(c.name) ? (
                  <div className="admin-detail-value">
                    {formatCell(row, c)}
                  </div>
                ) : resource.name === "quiz_questions" &&
                  c.name === "correct_option" ? (
                  <select
                    value={value}
                    required
                    onChange={(e) => set(c.name, e.target.value)}
                  >
                    <option value="">Chọn đáp án đúng</option>
                    {quizOptions(
                      current(
                        columns.find((column) => column.name === "options")!,
                      ),
                    ).map(([key]) => (
                      <option key={key} value={key}>
                        Đáp án {key}
                      </option>
                    ))}
                  </select>
                ) : c.reference ? (
                  <ReferenceInput
                    column={c}
                    value={String(value)}
                    onChange={(v) => set(c.name, v)}
                    required={required}
                  />
                ) : c.options.length ? (
                  <select
                    value={value}
                    onChange={(e) => set(c.name, e.target.value)}
                    required={required}
                  >
                    <option value="">
                      {c.hasDefault ? "Theo cấu hình database" : "Chưa chọn"}
                    </option>
                    {c.options.map((o) => (
                      <option key={o} value={o}>
                        {enums[o] || o}
                      </option>
                    ))}
                  </select>
                ) : c.type === "bool" ? (
                  <span className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => set(c.name, e.target.checked)}
                    />
                    {value ? "Có" : "Không"}
                  </span>
                ) : c.name === "avatar_url" || c.name === "image_url" || c.name.endsWith("_image_url") ? (
                  <ImageUploadInput
                    value={String(value || "")}
                    onChange={(v) => set(c.name, v)}
                    required={required}
                  />
                ) : c.name === "gender" ? (
                  <GenderSelector
                    value={String(value || "")}
                    onChange={(v) => set(c.name, v)}
                    required={required}
                  />
                ) : c.name === "address" || c.name.endsWith("_address") ? (
                  <AddressInput
                    value={String(value || "")}
                    onChange={(v) => set(c.name, v)}
                    required={required}
                  />
                ) : c.name === "video_url" ? (
                  <input
                    type="url"
                    value={text}
                    onChange={(e) => set(c.name, e.target.value)}
                    required={
                      required ||
                      current(
                        columns.find(
                          (column) => column.name === "lesson_type",
                        )!,
                      ) === "VIDEO"
                    }
                  />
                ) : structured || c.type === "text" ? (
                  <textarea
                    rows={structured ? 5 : 3}
                    value={text}
                    onChange={(e) => set(c.name, e.target.value)}
                    required={required}
                    spellCheck={false}
                    placeholder={
                      resource.name === "service_categories" && c.name === "description"
                        ? "Mô tả ngắn gọn về nhóm dịch vụ này (ví dụ: Chăm sóc da chuyên sâu với thảo dược và công nghệ hiện đại...)"
                        : undefined
                    }
                  />
                ) : (
                  <input
                    placeholder={
                      resource.name === "service_categories"
                        ? c.name === "name"
                          ? "Ví dụ: Gội đầu dưỡng sinh"
                          : c.name === "code"
                          ? "Ví dụ: GOI_DAU_DUONG_SINH"
                          : c.name === "display_order"
                          ? "1"
                          : undefined
                        : undefined
                    }
                    type={
                      c.type === "date"
                        ? "date"
                        : c.type === "timestamptz" || c.type === "timestamp"
                          ? "datetime-local"
                          : c.type === "time"
                            ? "time"
                            : [
                                  "numeric",
                                  "int2",
                                  "int4",
                                  "int8",
                                  "float4",
                                  "float8",
                                ].includes(c.type)
                              ? "number"
                              : c.name === "email"
                                ? "email"
                                : "text"
                    }
                    step={
                      c.type === "numeric" || c.type.startsWith("float")
                        ? "0.01"
                        : c.type === "time"
                          ? "1"
                          : undefined
                    }
                    value={
                      c.type === "date"
                        ? String(value).slice(0, 10)
                        : c.type === "timestamptz" || c.type === "timestamp"
                          ? value
                            ? new Date(
                                new Date(value).getTime() -
                                  new Date(value).getTimezoneOffset() * 60000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                          : value
                    }
                    onChange={(e) =>
                      set(
                        c.name,
                        (c.type === "timestamp" || c.type === "timestamptz") &&
                          e.target.value
                          ? new Date(e.target.value).toISOString()
                          : e.target.value,
                      )
                    }
                    required={required}
                    maxLength={c.maxLength || undefined}
                  />
                )}
              </label>
            );
          })}
          {resource.name === "users" && mode !== "view" && (
            <label>
              <span>
                {mode === "create" ? "Mật khẩu đăng nhập" : "Mật khẩu mới"}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                value={values.password || ""}
                onChange={(e) => set("password", e.target.value)}
              />
            </label>
          )}
        </div>
        )}
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        {!(["consultation_surveys", "services"].includes(resource.name) && mode === "view") && (
          <footer>
            <button
              type="button"
              className="admin-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Đóng
            </button>
            {mode !== "view" && (
              <button
                className="admin-primary"
                disabled={
                  busy || (mode === "update" && !Object.keys(values).length)
                }
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <Save />}Lưu
                thay đổi
              </button>
            )}
          </footer>
        )}
      </form>
    </dialog>
  );
}

function availableActions(table: string, row: Row) {
  if (table === "consultation_surveys")
    return [
      {
        key: "open-schedule",
        title: "Xem ca hẹn trên Lịch trình chuyên viên",
        icon: Calendar,
      },
      {
        key: "handover-tech",
        title: "Dặn dò KTV phụ trách ca hẹn",
        icon: Send,
      },
    ];
  if (table === "services")
    return [
      {
        key: "toggle-active",
        title: row.is_active ? "Tạm ngưng phục vụ dịch vụ này" : "Kích hoạt kinh doanh dịch vụ này",
        icon: row.is_active ? Ban : Check,
      },
      {
        key: "open-pos",
        title: "Tạo đơn thu ngân với dịch vụ này",
        icon: CreditCard,
      },
      {
        key: "view-schedule",
        title: "Xem lịch KTV cho dịch vụ này",
        icon: Calendar,
      },
    ];
  if (table === "treatment_packages")
    return [
      {
        key: "toggle-active",
        title: row.is_active ? "Ngưng áp dụng gói liệu trình này" : "Kích hoạt áp dụng gói này",
        icon: row.is_active ? Ban : Check,
      },
      {
        key: "open-pos",
        title: "Tạo đơn thu ngân mở bán gói này",
        icon: CreditCard,
      },
      {
        key: "open-treatment",
        title: "Xem phác đồ & tiến trình điều trị",
        icon: Layers,
      },
    ];
  if (table === "bookings")
    return row.status === "CONFIRMED"
      ? [{ key: "checkin", title: "Check-in", icon: Check }]
      : row.status === "CHECKED_IN"
        ? [{ key: "start", title: "Bắt đầu dịch vụ", icon: Play }]
        : row.status === "IN_SERVICE"
          ? [{ key: "checkout", title: "Check-out", icon: LogOut }]
          : [];
  if (
    ["invoices", "tuition_transactions"].includes(table) &&
    ["UNPAID", "PENDING"].includes(row.payment_status)
  )
    return row.transaction_type === "REFUND"
      ? [
          {
            key: "confirm-refund",
            title: "Xác nhận đã hoàn học phí",
            icon: Check,
          },
        ]
      : [
          {
            key: "confirm-payment",
            title: "Xác nhận đã nhận tiền",
            icon: Check,
          },
        ];
  if (table === "invoices" && row.payment_status === "PAID")
    return [{ key: "refund", title: "Hoàn toàn bộ hóa đơn", icon: Ban }];
  if (table === "student_certificates")
    return row.status === "DRAFT"
      ? [{ key: "issue", title: "Phát hành", icon: Send }]
      : row.status === "ISSUED"
        ? [{ key: "revoke", title: "Thu hồi", icon: Ban }]
        : [];
  return [];
}

export function ResourcePage({ table: fixedTable }: { table?: string }) {
  const { table: routeTable } = useParams(),
    table = fixedTable || routeTable || "";
  const [params, setParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>(DEFAULT_RESOURCES),
    [listing, setListing] = useState<Listing | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0),
    [pending, setPending] = useState(false);
  const [edit, setEdit] = useState<{
      row: Row;
      mode: "create" | "update" | "view";
    } | null>(null),
    [confirmation, setConfirmation] = useState<{
      row: Row;
      action: string;
      title: string;
    } | null>(null),
    [reason, setReason] = useState("");
  const [search, setSearch] = useState(params.get("search") || "");
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const page = Number(params.get("page")) || 1;
  const resource = resources.find((r) => r.name === table);
  useEffect(() => {
    const c = new AbortController();
    adminApi<Resource[]>("resources", undefined, c.signal)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setResources(res);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get("search") || "")) {
        const next = new URLSearchParams(params);
        search ? next.set("search", search) : next.delete("search");
        next.delete("page");
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, params, setParams]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListing(null);
    setError("");
    setEdit(null);
    setConfirmation(null);
    setNotice("");
    adminApi<Listing>(
      `${table}?${params.toString()}`,
      undefined,
      controller.signal,
    )
      .then(setListing)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [table, params.toString(), version]);
  useEffect(() => {
    if (confirmation) confirmDialog.current?.showModal();
  }, [confirmation]);
  useEffect(() => {
    if (
      !listing ||
      !resource?.actions?.includes("create") ||
      params.get("create") !== "1"
    )
      return;
    setEdit({
      mode: "create",
      row:
        table === "course_lessons" && params.get("lesson_type") === "VIDEO"
          ? { lesson_type: "VIDEO" }
          : {},
    });
  }, [listing, resource, table, params]);
  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(name, value) : next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next);
  };
  let filter: Row = {};
  try {
    filter = JSON.parse(params.get("filter") || "{}");
  } catch {}
  const filterColumns =
    listing?.columns.filter((c) => c.options.length || c.type === "bool") || [];
  const preferred = [
    "name",
    "full_name",
    "title",
    "booking_code",
    "invoice_code",
    "transaction_code",
    "certificate_code",
    "employee_code",
    "batch_code",
    "code",
    "phone",
    "email",
    "booking_date",
    "session_date",
    "start_time",
    "price",
    "amount",
    "total_amount",
    "tuition_total",
    "amount_paid",
    "status",
    "payment_status",
    "is_active",
    "is_published",
  ];
  const columnOrder: Record<string, string[]> = {
    coupons: [
      "code",
      "title",
      "discount_percent",
      "discount_amount",
      "valid_from",
      "valid_to",
      "usage_limit",
      "used_count",
      "is_active",
    ],
    branches: ["name", "code", "phone", "address", "city", "is_active"],
    branch_rooms: ["name", "branch_id", "room_type", "bed_capacity", "is_available"],
    services: [
      "image_url",
      "name",
      "category_id",
      "duration_minutes",
      "price",
      "discount_price",
      "is_featured",
      "is_active",
    ],
    treatment_packages: [
      "image_url",
      "name",
      "service_id",
      "total_sessions",
      "validity_months",
      "price",
      "discount_price",
      "is_active",
    ],
    service_categories: [
      "icon_url",
      "name",
      "code",
      "description",
      "display_order",
      "is_active",
    ],
    bookings: ["booking_code", "customer_id", "branch_id", "booking_date", "start_time", "status", "payment_status"],
    users: [
      "full_name",
      "phone",
      "email",
      "role",
      "membership_tier",
      "reward_points",
      "total_spent",
      "is_active",
    ],
    consultation_surveys: [
      "customer_id",
      "booking_id",
      "focus_areas",
      "pressure_pref",
      "has_sensitive_skin",
      "has_oil_allergy",
      "special_requests",
      "created_at",
    ],
    reviews: [
      "customer_id",
      "service_id",
      "technician_id",
      "rating",
      "comment",
      "branch_reply",
      "created_at",
    ],
    staff_commissions: [
      "staff_id",
      "branch_id",
      "commission_type",
      "base_amount",
      "percentage",
      "commission_amount",
      "status",
      "cycle_month",
      "notes",
    ],
    support_tickets: [
      "customer_id",
      "subject",
      "message",
      "status",
      "admin_reply",
      "created_at",
    ],
    support_faqs: [
      "category",
      "question",
      "answer",
      "display_order",
      "is_active",
    ],
    staff_profiles: [
      "full_name",
      "employee_code",
      "department",
      "position",
      "branch_id",
      "phone",
      "is_active",
    ],
    course_lessons: [
      "title",
      "lesson_type",
      "lesson_order",
      "duration_minutes",
      "video_url",
    ],
    course_quizzes: [
      "title",
      "total_questions",
      "time_limit_minutes",
      "passing_score",
    ],
    quiz_questions: [
      "question_text",
      "question_number",
      "correct_option",
      "quiz_id",
    ],
  };
  const visible = listing
    ? columnOrder[table]
      ? columnOrder[table].flatMap((name) =>
          listing.columns.find((c) => c.name === name)
            ? [listing.columns.find((c) => c.name === name)!]
            : [],
        )
      : listing.columns.filter((c) => preferred.includes(c.name)).slice(0, 7)
    : [];
  if (listing && visible.length < 3)
    for (const c of listing.columns) {
      if (!visible.includes(c) && !["jsonb", "text"].includes(c.type))
        visible.push(c);
      if (visible.length >= 5) break;
    }
  const done = () => {
    setEdit(null);
    if (params.has("create")) {
      const next = new URLSearchParams(params);
      next.delete("create");
      next.delete("lesson_type");
      setParams(next, { replace: true });
    } else setVersion((v) => v + 1);
  };

  const { user } = useAdmin();
  const isSuperAdminOrAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const isManagerOrAdmin = isSuperAdminOrAdmin || user?.role === "BRANCH_MANAGER";
  const isRestrictedAdminOnly = [
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "audit_logs",
    "loyalty_point_settings",
    "voucher_distribution_rules",
    "membership_tier_rules",
  ].includes(table);
  const isRestrictedManagerOnly = ["staff_commissions"].includes(table);

  if (isRestrictedAdminOnly && !isSuperAdminOrAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-sm border border-[#EAD8C7] text-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-14 h-14 mx-auto mb-4 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-[#2D1B08] mb-2">Giới hạn quyền quản trị</h2>
        <p className="text-xs text-[#7D6E63] leading-relaxed mb-6">
          Chỉ Quản trị viên cấp cao (Admin / Super Admin) mới có quyền truy cập bảng <code className="bg-[#F8F1E8] px-1.5 py-0.5 rounded text-[#8A4F23] font-bold">{table}</code>.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#8A4F23] text-white text-xs font-semibold rounded-xl hover:bg-[#723F1A] transition-all shadow-sm"
        >
          Quay lại Bảng điều khiển
        </Link>
      </div>
    );
  }

  if (isRestrictedManagerOnly && !isManagerOrAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-sm border border-[#EAD8C7] text-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-14 h-14 mx-auto mb-4 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-[#2D1B08] mb-2">Giới hạn quyền hoa hồng</h2>
        <p className="text-xs text-[#7D6E63] leading-relaxed mb-6">
          Chỉ Quản lý chi nhánh hoặc Quản trị viên mới có quyền xem dữ liệu hoa hồng nhân viên.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#8A4F23] text-white text-xs font-semibold rounded-xl hover:bg-[#723F1A] transition-all shadow-sm"
        >
          Quay lại Bảng điều khiển
        </Link>
      </div>
    );
  }

  return (
    <section className="admin-resource">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{resource?.group || "QUẢN TRỊ"}</p>
          <h1>{resource?.title || "Đang tải phân hệ…"}</h1>
        </div>
        <div className="admin-toolbar-actions">
          <button
            className="admin-icon"
            title="Tải lại"
            onClick={() => setVersion((v) => v + 1)}
            disabled={loading}
          >
            <RefreshCw size={18} />
          </button>
          {resource?.actions?.includes("create") && listing && (
            <button
              className="admin-primary"
              onClick={() => setEdit({ row: {}, mode: "create" })}
            >
              <Plus />
              Thêm mới
            </button>
          )}
        </div>
      </div>
      {[
        "course_lessons",
        "course_quizzes",
        "quiz_questions",
        "course_chapters",
      ].includes(table) && <TrainingActions />}
      <nav className="admin-related-tabs" aria-label="Phân hệ liên quan">
        {resources
          .filter((r) => r.group === resource?.group)
          .map((r) => (
            <Link
              key={r.name}
              to={`/manage/${r.name}`}
              aria-current={r.name === table ? "page" : undefined}
            >
              {r.title}
            </Link>
          ))}
      </nav>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Tìm kiếm…"
            aria-label="Tìm kiếm bản ghi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterColumns.slice(0, 3).map((c) => (
          <select
            key={c.name}
            aria-label={`Lọc ${label(c.name)}`}
            value={filter[c.name] === undefined ? "" : String(filter[c.name])}
            onChange={(e) => {
              const next = { ...filter };
              if (e.target.value === "") delete next[c.name];
              else
                next[c.name] =
                  c.type === "bool"
                    ? e.target.value === "true"
                    : e.target.value;
              updateParam(
                "filter",
                Object.keys(next).length ? JSON.stringify(next) : "",
              );
            }}
          >
            <option value="">{label(c.name)} · Tất cả</option>
            {(c.options.length ? c.options : ["true", "false"]).map((v) => (
              <option key={v} value={v}>
                {enums[v] ||
                  (v === "true" ? "Có" : v === "false" ? "Không" : v)}
              </option>
            ))}
          </select>
        ))}
        {Object.keys(filter).length > 0 && (
          <button
            className="admin-secondary"
            onClick={() => updateParam("filter", "")}
          >
            <X size={14} />
            Xóa bộ lọc
          </button>
        )}
      </div>
      {error ? (
        <div className="admin-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setVersion((v) => v + 1)}>Thử lại</button>
        </div>
      ) : loading ? (
        <div className="admin-empty">
          <LoaderCircle className="animate-spin" />
          <p>Đang tải dữ liệu…</p>
        </div>
      ) : (
        listing && (
          <>
            {notice && (
              <p className="admin-notice" role="status">
                {notice}
              </p>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {visible.map((c) => (
                      <th key={c.name}>
                        <button
                          onClick={() => {
                            const next = new URLSearchParams(params);
                            next.set("sort", c.name);
                            next.set(
                              "direction",
                              params.get("sort") === c.name &&
                                params.get("direction") === "asc"
                                ? "desc"
                                : "asc",
                            );
                            next.delete("page");
                            setParams(next);
                          }}
                        >
                          {label(c.name)}
                          {params.get("sort") === c.name
                            ? params.get("direction") === "asc"
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </button>
                      </th>
                    ))}
                    <th className="admin-row-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.rows.map((row, i) => (
                    <tr key={JSON.stringify(rowKey(listing.columns, row)) || i}>
                      {visible.map((c, j) => (
                        <td key={c.name}>
                          {j === 0 ? (
                            <button
                              className="admin-record-link"
                              onClick={() => setEdit({ row, mode: "view" })}
                            >
                              {formatCell(row, c)}
                            </button>
                          ) : (
                            <span
                              className={
                                c.name === "status" ||
                                c.name === "payment_status"
                                  ? "admin-status"
                                  : ""
                              }
                            >
                              {formatCell(row, c)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="admin-row-actions">
                          <button
                            className="admin-icon"
                            title="Xem chi tiết"
                            onClick={() => setEdit({ row, mode: "view" })}
                          >
                            <Eye size={16} />
                          </button>
                          {resource?.actions?.includes("update") && (
                            <button
                              className="admin-icon"
                              title="Chỉnh sửa"
                              onClick={() => setEdit({ row, mode: "update" })}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {resource?.actions?.includes("delete") && (
                            <button
                              className="admin-icon admin-danger"
                              title="Xóa"
                              onClick={() => {
                                setReason("");
                                setConfirmation({
                                  row,
                                  action: "delete",
                                  title: "Xóa bản ghi",
                                });
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {resource?.actions?.includes("action") &&
                            availableActions(table, row).map((a) => (
                              <button
                                key={a.key}
                                className="admin-icon"
                                title={a.title}
                                onClick={() => {
                                  if (a.key === "open-schedule") {
                                    const bCode =
                                      row.booking_code ||
                                      row.bookings?.booking_code ||
                                      (typeof row.booking_id === "string"
                                        ? row.booking_id
                                        : "");
                                    window.location.href = `/staff-schedule?booking=${encodeURIComponent(bCode)}`;
                                    return;
                                  }
                                  if (a.key === "open-pos") {
                                    if (table === "treatment_packages") {
                                      window.location.href = `/cashier-pos?packageId=${encodeURIComponent(row.id)}&packageName=${encodeURIComponent(row.name || "")}`;
                                      return;
                                    }
                                    const sName = row.name || "";
                                    window.location.href = `/cashier-pos?serviceName=${encodeURIComponent(sName)}`;
                                    return;
                                  }
                                  if (a.key === "open-treatment") {
                                    window.location.href = `/treatment-management?packageId=${encodeURIComponent(row.id)}`;
                                    return;
                                  }
                                  if (a.key === "view-schedule") {
                                    window.location.href = "/staff-schedule";
                                    return;
                                  }
                                  if (a.key === "toggle-active") {
                                    (async () => {
                                      try {
                                        setPending(true);
                                        await adminApi(`${table}/action`, {
                                          key: rowKey(listing.columns, row),
                                          action: "toggle-active",
                                          currentActive: row.is_active,
                                        });
                                        setVersion((v) => v + 1);
                                        setNotice(
                                          row.is_active
                                            ? `Đã tạm ngừng phục vụ "${row.name || "dịch vụ"}".`
                                            : `Đã kích hoạt kinh doanh "${row.name || "dịch vụ"}".`
                                        );
                                      } catch (err: any) {
                                        setError(err.message || "Lỗi thay đổi trạng thái.");
                                      } finally {
                                        setPending(false);
                                      }
                                    })();
                                    return;
                                  }
                                  setReason("");
                                  setConfirmation({
                                    row,
                                    action: a.key,
                                    title: a.title,
                                  });
                                }}
                              >
                                <a.icon size={16} />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!listing.rows.length && (
                <div className="admin-empty">
                  <p>
                    {params.get("search") || params.get("filter")
                      ? "Không có kết quả phù hợp."
                      : "Chưa có dữ liệu."}
                  </p>
                </div>
              )}
            </div>
            <div className="admin-pagination">
              <span>{listing.total.toLocaleString("vi-VN")} bản ghi</span>
              <div>
                <select
                  aria-label="Số bản ghi mỗi trang"
                  value={params.get("limit") || "25"}
                  onChange={(e) => updateParam("limit", e.target.value)}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / trang
                    </option>
                  ))}
                </select>
                <button
                  className="admin-icon"
                  title="Trang trước"
                  disabled={page <= 1}
                  onClick={() => updateParam("page", String(page - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  {page} /{" "}
                  {Math.max(1, Math.ceil(listing.total / listing.limit))}
                </span>
                <button
                  className="admin-icon"
                  title="Trang sau"
                  disabled={page * listing.limit >= listing.total}
                  onClick={() => updateParam("page", String(page + 1))}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )
      )}
      {resource && listing && edit && (
        <RecordDialog
          key={table + edit.mode + JSON.stringify(edit.row)}
          resource={resource}
          columns={listing.columns}
          row={edit.row}
          mode={edit.mode}
          onSwitchMode={(newMode, targetRow) =>
            setEdit({ row: targetRow || edit.row, mode: newMode })
          }
          onClose={() => {
            setEdit(null);
            if (params.has("create")) {
              const next = new URLSearchParams(params);
              next.delete("create");
              next.delete("lesson_type");
              setParams(next, { replace: true });
            }
          }}
          onSaved={done}
        />
      )}
      {confirmation && listing && (
        <dialog
          ref={confirmDialog}
          className="admin-dialog admin-confirm"
          onCancel={(e) => {
            if (pending) e.preventDefault();
            else setConfirmation(null);
          }}
          aria-labelledby="confirm-heading"
        >
          <header>
            <h2 id="confirm-heading">{confirmation.title}</h2>
          </header>
          <p>{recordLabel(confirmation.row)}</p>
          <p>
            {confirmation.action === "delete"
              ? "Bản ghi sẽ bị xóa khỏi database chung."
              : confirmation.action === "confirm-payment"
                ? "Chỉ xác nhận khi thực tế đã nhận đủ tiền mặt hoặc kiểm tra giao dịch chuyển khoản."
                : confirmation.action === "handover-tech"
                  ? "Nhập nội dung dặn dò kỹ thuật viên phụ trách ca hẹn này để KTV xem được trực tiếp trên lịch phòng:"
                  : ["refund", "confirm-refund"].includes(confirmation.action)
                    ? "Chỉ xác nhận sau khi thực tế đã hoàn tiền cho khách hàng."
                    : "Thay đổi sẽ được lưu vào database chung."}
          </p>
          {["revoke", "refund", "confirm-refund", "handover-tech"].includes(
            confirmation.action,
          ) && (
            <label>
              {confirmation.action === "handover-tech"
                ? "Nội dung dặn dò chuyên viên / KTV phụ trách"
                : "Lý do"}
              <textarea
                placeholder={
                  confirmation.action === "handover-tech"
                    ? "Ví dụ: Khách da nhạy cảm vùng cổ, massage nhẹ nhàng vai gáy, dùng tinh dầu gừng ấm..."
                    : ""
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
              />
            </label>
          )}
          <footer>
            <button
              className="admin-secondary"
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              Hủy
            </button>
            <button
              className="admin-primary"
              disabled={
                pending ||
                (["revoke", "refund", "confirm-refund", "handover-tech"].includes(
                  confirmation.action,
                ) &&
                  !reason.trim())
              }
              onClick={async () => {
                setPending(true);
                try {
                  if (confirmation.action === "handover-tech") {
                    const bId = confirmation.row.booking_id;
                    if (bId) {
                      await adminApi("bookings/update", {
                        key: { id: bId },
                        values: {
                          special_notes: reason,
                          checkin_notes: `[Dặn dò KTV từ Khảo sát] ${reason}`,
                        },
                      });
                      setNotice(
                        "Đã chuyển nội dung dặn dò tới ca làm việc của chuyên viên thành công."
                      );
                    }
                    setConfirmation(null);
                    setVersion((v) => v + 1);
                    return;
                  }

                  const targetRow = confirmation.row;
                  const isDeleteAction = confirmation.action === "delete";

                  await adminApi(
                    `${table}/${isDeleteAction ? "delete" : "action"}`,
                    {
                      key: {
                        ...rowKey(listing.columns, targetRow),
                        ...(targetRow?.id ? { id: targetRow.id } : {}),
                      },
                      id: targetRow?.id,
                      action: confirmation.action,
                      reason,
                      expectedUpdatedAt: targetRow?.updated_at,
                    },
                  );

                  if (isDeleteAction) {
                    setListing((prev) =>
                      prev
                        ? {
                            ...prev,
                            rows: prev.rows.filter((r) => r.id !== targetRow.id),
                            total: Math.max(0, prev.total - 1),
                          }
                        : null,
                    );
                    setNotice(`Đã xóa "${targetRow?.name || targetRow?.title || "bản ghi"}" thành công.`);
                  }

                  setConfirmation(null);
                  setVersion((v) => v + 1);
                } catch (err) {
                  setConfirmation(null);
                  setError((err as Error).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
              Xác nhận
            </button>
          </footer>
        </dialog>
      )}
    </section>
  );
}
