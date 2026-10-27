import React, { useEffect, useMemo, useRef, useState } from "react";
import { TrainingActions } from "./TrainingActions";
import { QuizOptions, quizOptions } from "./QuizOptions";
import { ConsultationSurveySheet, COMMON_FOCUS_AREAS } from "./ConsultationSurveyView";
import { ServiceDetailSheet } from "./ServiceDetailView";
import { TreatmentPackageDetailSheet } from "./TreatmentPackageDetailView";
import { StaffProfileEditorSheet } from "./StaffProfileEditorSheet";
import { CourseEditorSheet } from "./CourseEditorSheet";
import { EnrollmentEditorSheet } from "./EnrollmentEditorSheet";
import { ChapterEditorSheet } from "./ChapterEditorSheet";
import { LessonEditorSheet } from "./LessonEditorSheet";
import { QuizEditorSheet } from "./QuizEditorSheet";
import { QuestionEditorSheet } from "./QuestionEditorSheet";
import { BatchDateRangeEditor, BatchScheduleTextEditor } from "./BatchDateRangeEditor";
import { CourseCategoryFormEditor, slugifyCategoryCode } from "./CourseCategoryFormEditor";
import { InstructorFormEditor } from "./InstructorFormEditor";
import { BatchScheduleFormEditor } from "./BatchScheduleFormEditor";
import { StudentAcademicRecordFormEditor } from "./StudentAcademicRecordFormEditor";
import { ExcelQuizImportModal } from "./ExcelQuizImportModal";
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
  Clipboard,
  Users,
  GraduationCap,
  MapPin,
  UserCheck,
  BookOpen,
  CalendarCheck,
  CheckCheck,
  FileEdit,
  FileSpreadsheet,
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
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

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
          placeholder="Nhập lợi ích mới..."
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

export interface PricingTier {
  id?: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
}

export interface ServiceAddon {
  id?: string;
  name: string;
  price: number;
  unit?: string;
  note?: string;
}

function ServicePricingTiersEditor({
  value,
  onChange,
  onSuggestBasePrice,
}: {
  value: any;
  onChange: (tiers: PricingTier[]) => void;
  onSuggestBasePrice?: (price: number) => void;
}) {
  const tiers: PricingTier[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const p = JSON.parse(value);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })()
      : [];

  const addTier = () => {
    const newTier: PricingTier = {
      id: `tier_${Date.now()}`,
      name: "",
      description: "",
      price: 0,
      unit: "VNĐ/buổi",
    };
    onChange([...tiers, newTier]);
  };

  const updateTier = (idx: number, patch: Partial<PricingTier>) => {
    const updated = [...tiers];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const removeTier = (idx: number) => {
    onChange(tiers.filter((_, i) => i !== idx));
  };

  const applyPhuTayTemplate = () => {
    const template: PricingTier[] = [
      {
        id: "tier_1",
        name: "Cấp độ 1 - Chăm sóc cơ bản / Tiêu chuẩn",
        description: "Dành cho tình trạng nhẹ, thư giãn phục hồi hoặc duy trì",
        price: 350000,
        unit: "VNĐ/buổi",
      },
      {
        id: "tier_2",
        name: "Cấp độ 2 - Trị liệu chuyên sâu / Phục hồi",
        description: "Áp dụng kỹ thuật chuyên sâu giải quyết tắc nghẽn, đau nhức",
        price: 500000,
        unit: "VNĐ/buổi",
      },
      {
        id: "tier_3",
        name: "Cấp độ 3 - Trị liệu nâng cao / Toàn diện",
        description: "Liệu trình chuyên biệt kết hợp công nghệ và kỹ thuật nâng cao",
        price: 750000,
        unit: "VNĐ/buổi",
      },
    ];
    onChange(template);
    if (onSuggestBasePrice) onSuggestBasePrice(350000);
  };

  return (
    <div className="space-y-3 p-4 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DFD8] pb-2.5">
        <div>
          <span className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <span>Phân loại giá theo giai đoạn / mức độ</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              {tiers.length} mức giá
            </span>
          </span>
          <p className="text-[11px] text-[#8A7968] mt-0.5">
            Dành cho dịch vụ có nhiều mức giá theo cấp độ, thời lượng hoặc giai đoạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tiers.length === 0 && (
            <button
              type="button"
              onClick={applyPhuTayTemplate}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#8A4F23] bg-white border border-[#BA7E4C]/40 hover:bg-[#FAF0E4] hover:border-[#985018] cursor-pointer shadow-2xs transition-colors"
              title="Điền mẫu dịch vụ 3 cấp độ / giai đoạn"
            >
              ⚡ Mẫu gợi ý (3 cấp độ)
            </button>
          )}
          <button
            type="button"
            onClick={addTier}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#985018] text-white hover:bg-[#804213] cursor-pointer shadow-xs flex items-center gap-1 transition-colors"
          >
            <Plus size={13} className="stroke-[2.5]" />
            <span>Thêm mức giá / giai đoạn</span>
          </button>
        </div>
      </div>

      {tiers.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-[#D5C7B8] rounded-lg bg-white/50 text-[#8C7A6B]">
          <p className="text-xs font-medium">Chưa có phân loại giá theo giai đoạn.</p>
          <p className="text-[11px] mt-0.5">
            Nếu dịch vụ này có giá đồng nhất, chỉ cần điền ô <b>Giá niêm yết</b> ở trên. Nếu có nhiều mức giá theo cấp độ/giai đoạn, hãy bấm <b>"+ Thêm mức giá / giai đoạn"</b> hoặc <b>"⚡ Mẫu gợi ý"</b>.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tiers.map((tier, idx) => (
            <div
              key={tier.id || idx}
              className="p-3 bg-white rounded-xl border border-[#E8DFD8] shadow-xs space-y-2 relative group hover:border-[#BA7E4C] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] text-[11px] font-extrabold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-[#8A4F23]">
                    Giai đoạn / Mức {idx + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  className="p-1 rounded-md text-[#A69788] hover:text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer transition-colors"
                  title="Xóa mức giá này"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-[#73675F] uppercase tracking-wider block mb-1">
                    Tên giai đoạn / phân loại
                  </label>
                  <input
                    type="text"
                    value={tier.name}
                    placeholder="Nhập tên giai đoạn / phân loại..."
                    onChange={(e) => updateTier(idx, { name: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-[#73675F] uppercase tracking-wider block mb-1">
                    Giá tiền (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={tier.price || ""}
                    placeholder="Nhập giá tiền..."
                    onChange={(e) => updateTier(idx, { price: Number(e.target.value) || 0 })}
                    className="w-full text-xs font-bold text-[#985018] px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-[#73675F] uppercase tracking-wider block mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={tier.unit || "VNĐ/buổi"}
                    placeholder="Nhập đơn vị tính..."
                    onChange={(e) => updateTier(idx, { unit: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="sm:col-span-12">
                  <input
                    type="text"
                    value={tier.description || ""}
                    placeholder="Nhập mô tả chi tiết hoặc lưu ý..."
                    onChange={(e) => updateTier(idx, { description: e.target.value })}
                    className="w-full text-[11px] px-2.5 py-1 rounded-lg border border-[#E8DFD8] bg-white text-[#554B42] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceAddonsEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (addons: ServiceAddon[]) => void;
}) {
  const addons: ServiceAddon[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const p = JSON.parse(value);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })()
      : [];

  const addAddon = () => {
    const newAddon: ServiceAddon = {
      id: `addon_${Date.now()}`,
      name: "",
      price: 0,
      unit: "VNĐ/tháng",
      note: "",
    };
    onChange([...addons, newAddon]);
  };

  const updateAddon = (idx: number, patch: Partial<ServiceAddon>) => {
    const updated = [...addons];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const removeAddon = (idx: number) => {
    onChange(addons.filter((_, i) => i !== idx));
  };

  const applyPhuTayAddon = () => {
    const template: ServiceAddon[] = [
      {
        id: "addon_1",
        name: "Tinh dầu trị liệu & Dụng cụ chuyên dụng",
        price: 150000,
        unit: "VNĐ/lần",
        note: "Vật tư và sản phẩm chăm sóc chuyên sâu kèm theo liệu trình",
      },
    ];
    onChange(template);
  };

  return (
    <div className="space-y-3 p-4 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DFD8] pb-2.5">
        <div>
          <span className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <span>Vật tư y tế & Phụ phí kèm theo</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              {addons.length} phụ phí
            </span>
          </span>
          <p className="text-[11px] text-[#8A7968] mt-0.5">
            Dành cho vật tư trị liệu, sản phẩm chuyên dụng hoặc phụ phí kèm theo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {addons.length === 0 && (
            <button
              type="button"
              onClick={applyPhuTayAddon}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#8A4F23] bg-white border border-[#BA7E4C]/40 hover:bg-[#FAF0E4] hover:border-[#985018] cursor-pointer shadow-2xs transition-colors"
              title="Điền mẫu phụ phí / vật tư kèm theo"
            >
              ⚡ Mẫu phụ phí gợi ý
            </button>
          )}
          <button
            type="button"
            onClick={addAddon}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#BA7E4C]/40 hover:bg-[#F3E2CE] cursor-pointer shadow-xs flex items-center gap-1 transition-colors"
          >
            <Plus size={13} className="stroke-[2.5]" />
            <span>Thêm vật tư / phụ phí</span>
          </button>
        </div>
      </div>

      {addons.length === 0 ? (
        <div className="py-3 text-center border border-dashed border-[#D5C7B8] rounded-lg bg-white/50 text-[#8C7A6B]">
          <p className="text-xs font-medium">Chưa có vật tư hoặc phụ phí kèm theo.</p>
          <p className="text-[11px] mt-0.5">
            Nếu dịch vụ có phát sinh chi phí vật tư hoặc sản phẩm bổ sung, bấm <b>"+ Thêm vật tư / phụ phí"</b>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {addons.map((addon, idx) => (
            <div
              key={addon.id || idx}
              className="p-3 bg-white rounded-xl border border-[#E8DFD8] shadow-xs space-y-2 relative group hover:border-[#BA7E4C] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#8A4F23]">
                  Vật tư / Phụ phí #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAddon(idx)}
                  className="p-1 rounded-md text-[#A69788] hover:text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer transition-colors"
                  title="Xóa phụ phí này"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-[#73675F] uppercase tracking-wider block mb-1">
                    Tên vật tư / phụ phí
                  </label>
                  <input
                    type="text"
                    value={addon.name}
                    placeholder="Nhập tên vật tư / phụ phí..."
                    onChange={(e) => updateAddon(idx, { name: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-[#73675F] uppercase tracking-wider block mb-1">
                    Giá tiền (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={addon.price || ""}
                    placeholder="Nhập giá tiền..."
                    onChange={(e) => updateAddon(idx, { price: Number(e.target.value) || 0 })}
                    className="w-full text-xs font-bold text-[#985018] px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-[#73675F] uppercase tracking-wider block mb-1">
                    Chu kỳ / Đơn vị
                  </label>
                  <input
                    type="text"
                    value={addon.unit || "VNĐ/lần"}
                    placeholder="Nhập đơn vị tính..."
                    onChange={(e) => updateAddon(idx, { unit: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="sm:col-span-12">
                  <input
                    type="text"
                    value={addon.note || ""}
                    placeholder="Nhập ghi chú sử dụng..."
                    onChange={(e) => updateAddon(idx, { note: e.target.value })}
                    className="w-full text-[11px] px-2.5 py-1 rounded-lg border border-[#E8DFD8] bg-white text-[#554B42] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const uploadImageBlob = async (blob: Blob, nameHint = "service_img.png") => {
    const ext = nameHint.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "png";
    const cleanFileName = `service_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const SUPABASE_URL = "https://wstvwushpwcdsmhpunvh.supabase.co";
    const KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE";

    // Try 'services' bucket first, then fallback to 'avatars'
    let targetBucket = "services";
    let res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`,
      {
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": blob.type || "image/png",
        },
        body: blob,
      }
    );

    if (!res.ok) {
      targetBucket = "avatars";
      res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`,
        {
          method: "POST",
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            "Content-Type": blob.type || "image/png",
          },
          body: blob,
        }
      );
    }

    if (!res.ok) {
      throw new Error("Không thể tải ảnh lên kho lưu trữ Supabase.");
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${cleanFileName}`;
  };

  const handleProcessFile = async (file: File | Blob, nameHint?: string) => {
    setUploading(true);
    try {
      const publicUrl = await uploadImageBlob(file, nameHint || (file as File).name);
      onChange(publicUrl);
    } catch (err: any) {
      alert(err.message || "Tải ảnh thất bại");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Ctrl+V / Paste event anywhere on the input or wrapper
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleProcessFile(file, `pasted_${Date.now()}.${item.type.split("/")[1] || "png"}`);
          return;
        }
      }
    }
  };

  // Handle Paste Button Click (navigator.clipboard)
  const handlePasteButtonClick = async () => {
    if (!navigator.clipboard) {
      alert("Trình duyệt không hỗ trợ đọc bộ nhớ tạm qua nút bấm. Bạn có thể nhấn phím tắt Ctrl+V trực tiếp vào ô nhập!");
      return;
    }

    try {
      setUploading(true);
      // Try clipboard.read() for image blobs
      if (navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const imgType = item.types.find((t) => t.startsWith("image/"));
            if (imgType) {
              const blob = await item.getType(imgType);
              const url = await uploadImageBlob(blob, `pasted_${Date.now()}.${imgType.split("/")[1] || "png"}`);
              onChange(url);
              setUploading(false);
              return;
            }
          }
        } catch (readErr) {
          console.warn("clipboard.read() not allowed or no blob, trying readText()", readErr);
        }
      }

      // Fallback: check clipboard text for URL
      const text = await navigator.clipboard.readText();
      const trimmed = text ? text.trim() : "";
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image/")) {
        onChange(trimmed);
        setUploading(false);
        return;
      }

      alert("Không tìm thấy hình ảnh hoặc đường link ảnh trong bộ nhớ tạm. Hãy sao chép (Copy) ảnh hoặc chụp màn hình rồi thử lại!");
    } catch (err: any) {
      alert("Không thể đọc bộ nhớ tạm. Bạn vui lòng bấm phím Ctrl+V trực tiếp vào ô nhập URL!");
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        await handleProcessFile(file);
      } else {
        alert("Vui lòng thả tập tin hình ảnh (JPG, PNG, WebP...)");
      }
    }
  };

  return (
    <div
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`space-y-2.5 p-3.5 rounded-xl font-['Plus_Jakarta_Sans',sans-serif] transition-all border ${
        isDragging
          ? "bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/20"
          : "bg-[#FAF8F5] border-[#E8DFD8]"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file);
        }}
      />

      <div className="flex flex-col md:flex-row items-start gap-4">
        {/* Preview box 16:9 Banner */}
        <div className="relative w-full md:w-64 aspect-[16/9] rounded-xl overflow-hidden bg-white border border-[#E8DFD8] shrink-0 shadow-xs flex items-center justify-center group">
          {uploading ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF0E4] text-[#985018] gap-1.5 p-2">
              <LoaderCircle className="w-6 h-6 animate-spin" />
              <span className="text-[11px] font-bold">Đang tải banner 16:9...</span>
            </div>
          ) : value ? (
            <>
              <img
                src={value}
                alt="Service Banner Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider shadow-xs">
                16:9 BANNER
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                title="Gỡ ảnh này"
                className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 size={16} className="stroke-[2.2]" />
                <span className="text-[10px] font-semibold mt-1">Gỡ ảnh</span>
              </button>
            </>
          ) : (
            <div className="w-full h-full bg-[#FAF0E4]/60 text-[#985018] flex flex-col items-center justify-center border border-dashed border-[#BA7E4C]/40 p-3 text-center">
              <Leaf className="w-7 h-7 stroke-[1.8] text-[#985018]" />
              <span className="text-[11px] font-bold text-[#8A4F23] mt-1">Chưa có banner</span>
              <span className="text-[10px] text-[#8C7A6B]">Tỷ lệ chuẩn 16:9 (ngang)</span>
            </div>
          )}
        </div>

        {/* Input & Action buttons */}
        <div className="flex-1 w-full min-w-0 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={value || ""}
              placeholder="Dán link ảnh (URL) hoặc nhấn Ctrl+V để dán ảnh banner 16:9..."
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/30 transition-all placeholder:text-[#A69788]"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                title="Xóa link"
                className="p-2 rounded-lg text-[#8C7A6B] hover:text-[#DC2626] hover:bg-white border border-[#E8DFD8] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick upload & paste actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#985018] text-white hover:bg-[#804213] disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
            >
              <Upload size={13} className="stroke-[2.2]" />
              <span>Tải ảnh từ máy</span>
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={handlePasteButtonClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#985018] border border-[#BA7E4C]/40 hover:bg-[#FAF0E4] hover:border-[#985018] disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              title="Dán ảnh trực tiếp từ bộ nhớ tạm hoặc nhấn phím Ctrl+V"
            >
              <Clipboard size={13} className="stroke-[2.2]" />
              <span>Dán từ bộ nhớ tạm (Ctrl+V)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function formatCell(row: Row, c: Column): React.ReactNode {
  if (c.name === "branch_id") {
    const branchName =
      row.branch_name ||
      row.branches?.name ||
      row.branch?.name ||
      (typeof row.branches === "string" ? row.branches : null);
    const branchCode = row.branch_code || row.branches?.code || row.branch?.code;
    if (branchName) {
      return (
        <div className="min-w-0 max-w-[220px]">
          <div className="font-semibold text-[#2C241E] text-xs truncate flex items-center gap-1.5" title={branchName}>
            <span>🏢</span>
            <span>{branchName}</span>
          </div>
          {branchCode && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F0F5FA] text-[#1E56A0] border border-[#D0E0F0]">
              {branchCode}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="text-xs text-[#8C7A6B] font-mono" title={String(row[c.name] || "")}>
        Chi nhánh #{String(row[c.name] || "").slice(0, 8)}
      </span>
    );
  }
  if (c.name === "course_id") {
    const courseTitle =
      row.course_title ||
      row.courses?.title ||
      row.course?.title ||
      (typeof row.courses === "string" ? row.courses : null);
    const courseCode = row.course_code || row.courses?.code || row.course?.code;
    if (courseTitle) {
      return (
        <div className="min-w-0 max-w-[240px]">
          <div className="font-bold text-[#2C241E] text-xs truncate flex items-center gap-1.5" title={courseTitle}>
            <span>📚</span>
            <span>{courseTitle}</span>
          </div>
          {courseCode && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
              {courseCode}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="text-xs text-[#8C7A6B] font-mono" title={String(row[c.name] || "")}>
        Khóa học #{String(row[c.name] || "").slice(0, 8)}
      </span>
    );
  }
  if (c.name === "batch_id") {
    const bCode =
      row.batch_code ||
      row.course_batches?.batch_code ||
      (typeof row.course_batches === "string" ? row.course_batches : null);
    if (bCode) {
      return (
        <span className="font-bold text-[#8A4F23] text-xs inline-flex items-center gap-1.5" title={String(row[c.name] || "")}>
          <span className="px-2 py-0.5 rounded-md bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] font-mono">
            🎓 {bCode}
          </span>
        </span>
      );
    }
    return (
      <span className="text-xs text-[#8C7A6B] font-mono" title={String(row[c.name] || "")}>
        Lớp #{String(row[c.name] || "").slice(0, 8)}
      </span>
    );
  }
  if (c.name === "batch_code") {
    const val = row[c.name];
    return (
      <span className="font-bold text-[#2C241E] text-xs inline-flex items-center gap-1.5">
        <span className="px-2.5 py-1 rounded-md bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] font-bold">
          {val || "—"}
        </span>
      </span>
    );
  }
  if (c.name === "student_id") {
    const sName =
      row.student_name ||
      row.student?.full_name ||
      row.users?.full_name ||
      row.full_name;
    const phone = row.student_phone || row.student?.phone || row.users?.phone || row.phone;
    const email = row.student_email || row.student?.email || row.email;
    if (sName) {
      return (
        <div>
          <div className="font-bold text-[#2C241E] text-xs flex items-center gap-1.5">
            <span>🎓</span>
            <span className="truncate max-w-[190px]">{sName}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10.5px]">
            {phone && <span className="text-[#8A4F23] font-medium">{phone}</span>}
            {email && (
              <span className="text-[#8C7A6B] truncate max-w-[140px]" title={email}>
                {email}
              </span>
            )}
          </div>
        </div>
      );
    }
    return (
      <span className="text-xs text-[#8C7A6B] font-mono" title={String(row[c.name] || "")}>
        Học viên #{String(row[c.name] || "").slice(0, 8)}
      </span>
    );
  }
  if (c.name === "assigned_room_id" || c.name === "room_id") {
    const rName = row.room_name || row.branch_rooms?.name || row.assigned_room?.name;
    if (rName) {
      return (
        <span className="font-medium text-[#2C241E] text-xs inline-flex items-center gap-1.5" title={String(row[c.name] || "")}>
          <span>🚪</span>
          <span>{rName}</span>
        </span>
      );
    }
    return (
      <span className="text-xs text-[#8C7A6B] font-mono" title={String(row[c.name] || "")}>
        Phòng #{String(row[c.name] || "").slice(0, 8)}
      </span>
    );
  }
  if (c.name === "id") {
    const val = String(row[c.name] || "");
    return (
      <span className="font-mono text-[10px] text-[#A69788] bg-[#F5F2ED] px-1.5 py-0.5 rounded border border-[#E8DFD8]" title={val}>
        #{val.length > 8 ? val.slice(0, 8) : val}
      </span>
    );
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
    const catName =
      row.category_name ||
      row.course_categories?.name ||
      row.service_categories?.name ||
      display(row[c.name]);
    if (!catName || catName === "—") return "—";
    const lower = String(catName).toLowerCase();
    const icon =
      lower.includes("mld") || lower.includes("bạch huyết") || lower.includes("vodder")
        ? "💆"
        : lower.includes("nghề") || lower.includes("học") || lower.includes("đào tạo")
        ? "🎓"
        : lower.includes("da")
        ? "✨"
        : lower.includes("gội") || lower.includes("đầu")
        ? "💆"
        : lower.includes("massage") || lower.includes("body")
        ? "🌿"
        : lower.includes("thẩm mỹ") || lower.includes("cao")
        ? "⚡"
        : "🌸";
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
        <span>{icon}</span>
        <span>{catName}</span>
      </span>
    );
  }
  if (c.name === "image_url" || c.name === "icon_url") {
    const url = row[c.name];
    const isIcon = c.name === "icon_url";
    return (
      <div className={`${isIcon ? "w-10 h-10 rounded-xl" : "w-16 h-9 aspect-[16/9] rounded-lg"} overflow-hidden bg-[#FAF8F5] border border-[#E8DFD8] shrink-0 shadow-xs flex items-center justify-center`}>
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
    const hasTiers = Array.isArray(row.pricing_tiers) && row.pricing_tiers.length > 0;
    return (
      <div className="font-bold text-[#2C241E] text-xs flex items-center gap-1">
        {hasTiers && <span className="text-[10px] font-normal text-[#8A7968]">Từ</span>}
        <span>{p > 0 ? `${p.toLocaleString("vi-VN")} ₫` : "—"}</span>
      </div>
    );
  }
  if (c.name === "pricing_tiers") {
    const tiers = Array.isArray(row[c.name])
      ? row[c.name]
      : typeof row[c.name] === "string"
        ? (() => {
            try {
              const p = JSON.parse(row[c.name]);
              return Array.isArray(p) ? p : [];
            } catch {
              return [];
            }
          })()
        : [];
    if (!tiers || tiers.length === 0) return "—";
    const prices = tiers.map((t: any) => Number(t.price) || 0).filter((pr: number) => pr > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
        <span>{tiers.length} giai đoạn</span>
        {minP > 0 && (
          <span className="text-[11px] font-bold text-[#985018]">
            ({(minP / 1000).toLocaleString("vi-VN")}k{maxP > minP ? ` ~ ${(maxP / 1000).toLocaleString("vi-VN")}k` : ""})
          </span>
        )}
      </span>
    );
  }
  if (c.name === "add_on_items") {
    const addons = Array.isArray(row[c.name])
      ? row[c.name]
      : typeof row[c.name] === "string"
        ? (() => {
            try {
              const p = JSON.parse(row[c.name]);
              return Array.isArray(p) ? p : [];
            } catch {
              return [];
            }
          })()
        : [];
    if (!addons || addons.length === 0) return "—";
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-[#EAF2FA] text-[#1E5D9B] border border-[#C5DCF2]">
        <span>{addons.length} phụ phí</span>
      </span>
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
  if (
    c.name === "status" &&
    (row.schedule_id !== undefined ||
      row.enrollment_id !== undefined ||
      row.check_in_time !== undefined)
  ) {
    const s = String(row[c.name] || "PRESENT").toUpperCase();
    const attMap: Record<string, { label: string; badge: string; dot: string; icon: string }> = {
      PRESENT: {
        label: "Có mặt",
        badge: "bg-[#E8F6ED] text-[#0D6832] border-[#BDE8CD]",
        dot: "bg-[#0D6832]",
        icon: "✓",
      },
      ABSENT: {
        label: "Vắng",
        badge: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
        dot: "bg-[#DC2626]",
        icon: "✕",
      },
      LATE: {
        label: "Đi muộn",
        badge: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
        dot: "bg-[#D97706]",
        icon: "⏰",
      },
      EXCUSED: {
        label: "Nghỉ có phép",
        badge: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
        dot: "bg-[#2563EB]",
        icon: "✉",
      },
    };
    const opt = attMap[s];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          opt?.badge || "bg-[#FAF0E4] text-[#8A4F23] border-[#E8DFD8]"
        }`}
      >
        <span>{opt?.icon || "•"}</span>
        <span>{opt?.label || enums[s] || s}</span>
      </span>
    );
  }
  if (
    c.name === "status" &&
    (row.tuition_total !== undefined ||
      row.student_id !== undefined ||
      row.enrolled_at !== undefined ||
      row.batch_id !== undefined)
  ) {
    const s = String(row[c.name] || "ENROLLED");
    const stMap: Record<string, { label: string; badge: string; dot: string }> = {
      ENROLLED: {
        label: "Đã ghi danh",
        badge: "bg-[#EBF3FC] text-[#1E40AF] border-[#BFDBFE]",
        dot: "bg-[#2563EB]",
      },
      DEPOSITED: {
        label: "Đã đặt cọc",
        badge: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
        dot: "bg-[#D97706]",
      },
      CONSULTING: {
        label: "Tư vấn",
        badge: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
        dot: "bg-[#9CA3AF]",
      },
      STUDYING: {
        label: "Đang học",
        badge: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
        dot: "bg-[#059669]",
      },
      GRADUATED: {
        label: "Tốt nghiệp",
        badge: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]",
        dot: "bg-[#9333EA]",
      },
      DROPPED: {
        label: "Bảo lưu / Thôi học",
        badge: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
        dot: "bg-[#DC2626]",
      },
    };
    const opt = stMap[s];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          opt?.badge || "bg-[#FAF0E4] text-[#8A4F23] border-[#E8DFD8]"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${opt?.dot || "bg-[#8A4F23]"}`} />
        <span>{opt?.label || enums[s] || s}</span>
      </span>
    );
  }
  if (c.name === "tuition_total") {
    const val = Number(row[c.name] || 0);
    return (
      <span className="font-extrabold text-[#2C241E] text-xs">
        {val > 0 ? `${val.toLocaleString("vi-VN")} ₫` : "0 ₫"}
      </span>
    );
  }
  if (c.name === "amount_paid") {
    const paid = Number(row[c.name] || 0);
    const total = Number(row.tuition_total || 0);
    const isFull = total > 0 && paid >= total;
    const isPartial = paid > 0 && paid < total;
    return (
      <div className="text-xs">
        <span
          className={`font-extrabold ${
            isFull
              ? "text-[#0D6832]"
              : isPartial
                ? "text-[#C2410C]"
                : "text-[#73675F]"
          }`}
        >
          {paid.toLocaleString("vi-VN")} ₫
        </span>
        {isFull ? (
          <span className="ml-1.5 text-[10px] font-bold bg-[#E8F6ED] text-[#0D6832] px-1.5 py-0.5 rounded-md border border-[#BDE8CD]">
            Đã đủ
          </span>
        ) : isPartial ? (
          <span className="ml-1.5 text-[10px] font-bold bg-[#FFF7ED] text-[#C2410C] px-1.5 py-0.5 rounded-md border border-[#FFEDD5]">
            Một phần
          </span>
        ) : null}
      </div>
    );
  }
  if (c.name === "progress_percent") {
    const p = Math.min(100, Math.max(0, Number(row[c.name] || 0)));
    const lessons = Number(row.completed_lessons_count || 0);
    return (
      <div className="min-w-[110px] max-w-[150px]">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-bold text-[#8A4F23]">{p}%</span>
          {lessons > 0 && (
            <span className="text-[10px] text-[#8C7A6B]">({lessons} bài)</span>
          )}
        </div>
        <div className="w-full h-1.5 bg-[#FAF0E4] rounded-full overflow-hidden border border-[#E8DFD8]">
          <div
            className={`h-full rounded-full transition-all ${
              p >= 100
                ? "bg-[#0D6832]"
                : p > 50
                  ? "bg-[#8A4F23]"
                  : "bg-[#BA7E4C]"
            }`}
            style={{ width: `${p}%` }}
          />
        </div>
      </div>
    );
  }
  if (c.name === "student_id") {
    const sName =
      row.student_name ||
      row.student?.full_name ||
      row.users?.full_name ||
      (typeof row[c.name] === "object" ? row[c.name]?.full_name : null);
    const phone =
      row.student_phone ||
      row.student?.phone ||
      row.users?.phone ||
      (typeof row[c.name] === "object" ? row[c.name]?.phone : null);
    const email =
      row.student_email ||
      row.student?.email ||
      row.users?.email ||
      (typeof row[c.name] === "object" ? row[c.name]?.email : null);
    if (sName || phone || email) {
      return (
        <div className="min-w-0 max-w-[210px]">
          <div className="font-bold text-[#2C241E] text-xs leading-snug flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-[10px] font-bold border border-[#EAD8C7] shrink-0">
              👤
            </span>
            <span className="truncate">{sName || "Học viên"}</span>
          </div>
          {(phone || email) && (
            <div className="text-[10px] text-[#8C7A6B] mt-0.5 pl-6 truncate">
              {phone ? phone : email}
            </div>
          )}
        </div>
      );
    }
  }
  if (c.name === "course_id") {
    const title =
      row.course_title ||
      row.courses?.title ||
      (typeof row[c.name] === "object" ? row[c.name]?.title : null);
    const code =
      row.course_code ||
      row.courses?.code ||
      (typeof row[c.name] === "object" ? row[c.name]?.code : null);
    if (title) {
      return (
        <div className="min-w-0 max-w-[200px]">
          <div className="font-medium text-[#2C241E] text-xs truncate" title={title}>
            {title}
          </div>
          {code && <div className="text-[10px] text-[#8A4F23] font-mono mt-0.5">{code}</div>}
        </div>
      );
    }
  }
  if (c.name === "batch_id") {
    const bCode =
      row.batch_code ||
      row.course_batches?.batch_code ||
      (typeof row[c.name] === "object" ? row[c.name]?.batch_code : null);
    if (bCode) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#EAD8C7]">
          <span>🎓</span>
          <span>{bCode}</span>
        </span>
      );
    }
  }
  if (c.name === "enrollment_id") {
    const student =
      row.course_enrollments?.student ||
      (typeof row[c.name] === "object" ? row[c.name]?.student : null);
    const sName =
      student?.full_name ||
      row.student_name ||
      row.student?.full_name ||
      (typeof row[c.name] === "object" ? row[c.name]?.full_name : null);
    const phone = student?.phone || row.student?.phone;
    const email = student?.email || row.student?.email;
    const bCode =
      row.batch_code ||
      row.course_enrollments?.course_batches?.batch_code ||
      row.batch_schedules?.course_batches?.batch_code;
    return (
      <div className="min-w-0 max-w-[240px]">
        <div className="font-bold text-[#2C241E] text-xs leading-snug flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-[10px] font-bold border border-[#EAD8C7] shrink-0">
            👤
          </span>
          <span className="truncate">{sName || "Học viên"}</span>
          {bCode && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF0E4] text-[#8A4F23] font-bold border border-[#EAD8C7] shrink-0">
              🎓 {bCode}
            </span>
          )}
        </div>
        {(phone || email) && (
          <div className="text-[10px] text-[#8C7A6B] mt-0.5 pl-6 truncate">
            {phone ? phone : email}
          </div>
        )}
      </div>
    );
  }
  if (c.name === "schedule_id") {
    const sched = row.batch_schedules || (typeof row[c.name] === "object" ? row[c.name] : null);
    if (sched) {
      const dateStr = sched.session_date
        ? new Date(sched.session_date).toLocaleDateString("vi-VN")
        : "";
      const timeStr =
        sched.start_time && sched.end_time
          ? `${sched.start_time.slice(0, 5)} - ${sched.end_time.slice(0, 5)}`
          : "";
      return (
        <div className="min-w-0 max-w-[260px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#2C241E]">
              📅 {dateStr}
            </span>
            {timeStr && (
              <span className="text-[11px] font-semibold text-[#8A4F23]">
                ({timeStr})
              </span>
            )}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                sched.is_practice_lab
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {sched.is_practice_lab ? "Thực hành" : "Lý thuyết"}
            </span>
          </div>
          {sched.topic && (
            <div className="text-[11px] text-[#7D6E63] mt-0.5 truncate" title={sched.topic}>
              {sched.topic}
            </div>
          )}
        </div>
      );
    }
  }
  if (c.name === "marked_by_id") {
    const markerName =
      row.marked_by?.full_name ||
      (typeof row[c.name] === "object" ? row[c.name]?.full_name : null);
    return (
      <div className="text-xs font-medium text-[#2C241E]">
        {markerName ? (
          <span className="inline-flex items-center gap-1 text-[#0D6832]">
            <span>✓</span>
            <span>{markerName}</span>
          </span>
        ) : (
          <span className="text-[#A69788]">—</span>
        )}
      </div>
    );
  }
  if (c.name === "check_in_time") {
    const val = row[c.name];
    if (!val) return <span className="text-[#A69788] text-xs">—</span>;
    const d = new Date(val);
    if (isNaN(d.getTime())) return <span className="text-[#A69788] text-xs">—</span>;
    return (
      <span className="text-[11.5px] font-medium text-[#2C241E] inline-flex items-center gap-1">
        <Clock size={12} className="text-[#8A4F23]" />
        <span>
          {new Intl.DateTimeFormat("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(d)}
        </span>
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
    const instName =
      row.instructor_name ||
      row.instructor?.full_name ||
      row.primary_instructor?.full_name ||
      row.instructors?.full_name;
    if (instName) {
      return (
        <span className="font-semibold text-[#8A4F23] text-xs inline-flex items-center gap-1.5" title={String(row[c.name] || "")}>
          <span>👨‍🏫</span>
          <span>{instName}</span>
        </span>
      );
    }
    return (
      <span className="text-xs text-[#8C7A6B] font-mono" title={String(row[c.name] || "")}>
        Giảng viên #{String(row[c.name] || "").slice(0, 8)}
      </span>
    );
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
  const raw = row[c.name];
  const rawStr = String(raw ?? "");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawStr)) {
    return (
      <span className="font-mono text-[10.5px] text-[#8C7A6B] bg-[#F7F4F0] px-1.5 py-0.5 rounded border border-[#E8DFD8]" title={rawStr}>
        #{rawStr.slice(0, 8)}
      </span>
    );
  }
  return display(raw);
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
  const [rows, setRows] = useState<Row[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      adminApi<Listing>(
        `${column.reference!.table}?limit=100&page=${page}`,
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
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [column.reference!.table, page]);
  return (
    <div className="admin-reference">
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
          </option>
        ))}
      </select>
      {error && <span className="admin-field-error">{error}</span>}
      {total > 100 && (
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
            {page} / {Math.ceil(total / 100)}
          </span>
          <button
            type="button"
            title="Trang sau"
            disabled={page * 100 >= total || busy}
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

function toServiceSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
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
          placeholder="Nhập số nhà, tên đường, tòa nhà, phường/xã..."
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
      : resource.name === "services"
        ? ["slug", "discount_price"]
        : resource.name === "treatment_packages"
          ? ["discount_price"]
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
      if (resource.name === "services" && name === "name") {
        next.slug = toServiceSlug(String(value || ""));
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
      if (c.name === "end_date") {
        const base = new Date();
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 13);
        return formatDateForInput(d);
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
      if (resource.name === "services" && !payload.slug) {
        payload.slug = toServiceSlug(String(payload.name || values.name || row.name || "dich-vu"));
      }
      if (resource.name === "course_batches") {
        const sDate = payload.start_date || mergedValues.start_date;
        const eDate = payload.end_date || mergedValues.end_date;
        if (sDate && eDate && eDate < sDate) {
          throw new Error("Ngày kết thúc / bế giảng phải diễn ra sau ngày bắt đầu nhập học.");
        }
      }
      if (resource.name === "course_categories") {
        if (!payload.icon_url && values.icon_url) payload.icon_url = values.icon_url;
        if (!payload.icon_url) {
          payload.icon_url = "https://api.iconify.design/lucide:graduation-cap.svg?color=%23985018";
        }
        if (!payload.code) {
          payload.code = slugifyCategoryCode(String(payload.name || values.name || "MLD-CAT"));
        }
      }
      if (resource.name === "instructors") {
        if (!payload.avatar_url && values.avatar_url) payload.avatar_url = values.avatar_url;
        if (!payload.avatar_url) {
          payload.avatar_url = "https://images.unsplash.com/photo-1594824813589-4b830d937077?w=200&auto=format&fit=crop&q=80";
        }
        if (!payload.bio && values.bio) payload.bio = values.bio;
        if (!payload.bio) {
          payload.bio = "Chuyên gia đào tạo dẫn lưu bạch huyết chuẩn Dr. Vodder quốc tế tại Học viện MLD Academy.";
        }
        if (values.achievements !== undefined) {
          payload.achievements = Array.isArray(values.achievements)
            ? values.achievements
            : typeof values.achievements === "string" && values.achievements.trim()
              ? values.achievements.split("\n").map((s: string) => s.trim()).filter(Boolean)
              : [];
        }
      }
      if (resource.name === "batch_schedules") {
        if (!payload.batch_id && values.batch_id) payload.batch_id = values.batch_id;
        if (!payload.session_date && values.session_date) payload.session_date = values.session_date;
        if (!payload.start_time && values.start_time) payload.start_time = values.start_time;
        if (!payload.end_time && values.end_time) payload.end_time = values.end_time;
        if (!payload.topic && values.topic) payload.topic = values.topic;

        // Clean time format to HH:mm:ss if it is HH:mm
        if (typeof payload.start_time === "string" && payload.start_time.length === 5) {
          payload.start_time += ":00";
        }
        if (typeof payload.end_time === "string" && payload.end_time.length === 5) {
          payload.end_time += ":00";
        }

        // Validate time
        if (payload.start_time && payload.end_time && payload.end_time <= payload.start_time) {
          throw new Error("Giờ kết thúc buổi học phải diễn ra sau giờ bắt đầu.");
        }

        // Clean assigned_room_id: if empty string, set to null
        if (!payload.assigned_room_id && values.assigned_room_id) {
          payload.assigned_room_id = values.assigned_room_id;
        }
        if (payload.assigned_room_id === "" || payload.assigned_room_id === "null" || payload.assigned_room_id === undefined) {
          payload.assigned_room_id = null;
        }

        // Default topic fallback if empty
        if (!payload.topic) {
          payload.topic = "Buổi học chuyên đề Dẫn lưu Bạch huyết Vodder";
        }
      }
      if (resource.name === "student_academic_records") {
        if (!payload.enrollment_id && values.enrollment_id) payload.enrollment_id = values.enrollment_id;
        payload.theory_score = Number(payload.theory_score ?? values.theory_score ?? 0);
        payload.practical_score = Number(payload.practical_score ?? values.practical_score ?? 0);
        payload.attended_sessions = Number(payload.attended_sessions ?? values.attended_sessions ?? 0);
        payload.total_batch_sessions = Number(payload.total_batch_sessions ?? values.total_batch_sessions ?? 10);
        payload.attendance_rate = Number(payload.attendance_rate ?? values.attendance_rate ?? 100);
        payload.is_graduated = Boolean(payload.is_graduated ?? values.is_graduated ?? true);
        if (payload.is_graduated && !payload.graduation_date) {
          payload.graduation_date = values.graduation_date || new Date().toISOString().split("T")[0];
        }
        if (values.feedback_theory !== undefined) payload.feedback_theory = values.feedback_theory;
        if (values.feedback_practical !== undefined) payload.feedback_practical = values.feedback_practical;
        if (values.feedback_attendance !== undefined) payload.feedback_attendance = values.feedback_attendance;
        if (values.feedback_attitude !== undefined) payload.feedback_attitude = values.feedback_attitude;
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
      className={`admin-dialog ${
        ["staff_profiles", "courses", "course_enrollments", "course_chapters", "course_lessons", "course_quizzes", "quiz_questions"].includes(resource.name)
          ? "!max-w-[880px] !w-[min(880px,calc(100%-32px))]"
          : ""
      }`}
      ref={dialog}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="record-heading"
    >
      {resource.name === "staff_profiles" ? (
        <StaffProfileEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : resource.name === "courses" ? (
        <CourseEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : resource.name === "course_enrollments" ? (
        <EnrollmentEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : resource.name === "course_chapters" ? (
        <ChapterEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : resource.name === "course_lessons" ? (
        <LessonEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : resource.name === "course_quizzes" ? (
        <QuizEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : resource.name === "quiz_questions" ? (
        <QuestionEditorSheet
          row={row}
          mode={mode}
          onClose={onClose}
          onSaved={onSaved}
          onSwitchMode={onSwitchMode}
        />
      ) : (
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
        ) : resource.name === "course_categories" && mode !== "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
            <CourseCategoryFormEditor
              values={{
                name: String(values.name ?? (columns.find((x) => x.name === "name") ? current(columns.find((x) => x.name === "name")!) : "")),
                code: String(values.code ?? (columns.find((x) => x.name === "code") ? current(columns.find((x) => x.name === "code")!) : "")),
                icon_url: String(values.icon_url ?? (columns.find((x) => x.name === "icon_url") ? current(columns.find((x) => x.name === "icon_url")!) : "")),
                description: String(values.description ?? (columns.find((x) => x.name === "description") ? current(columns.find((x) => x.name === "description")!) : "")),
                display_order: Number(values.display_order ?? (columns.find((x) => x.name === "display_order") ? current(columns.find((x) => x.name === "display_order")!) : 1) ?? 1),
                is_active: Boolean(values.is_active ?? (columns.find((x) => x.name === "is_active") ? current(columns.find((x) => x.name === "is_active")!) : true) ?? true),
              }}
              onChange={(field, val) => set(field, val)}
              isCreate={mode === "create"}
            />
          </div>
        ) : resource.name === "instructors" && mode !== "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
            <InstructorFormEditor
              values={{
                user_id: values.user_id !== undefined ? String(values.user_id) : (columns.find((x) => x.name === "user_id") ? String(current(columns.find((x) => x.name === "user_id")!) || "") : undefined),
                full_name: String(values.full_name ?? (columns.find((x) => x.name === "full_name") ? current(columns.find((x) => x.name === "full_name")!) : "")),
                title: String(values.title ?? (columns.find((x) => x.name === "title") ? current(columns.find((x) => x.name === "title")!) : "")),
                avatar_url: String(values.avatar_url ?? (columns.find((x) => x.name === "avatar_url") ? current(columns.find((x) => x.name === "avatar_url")!) : "")),
                experience_years: Number(values.experience_years ?? (columns.find((x) => x.name === "experience_years") ? current(columns.find((x) => x.name === "experience_years")!) : 1) ?? 1),
                bio: String(values.bio ?? (columns.find((x) => x.name === "bio") ? current(columns.find((x) => x.name === "bio")!) : "")),
                achievements: values.achievements ?? (columns.find((x) => x.name === "achievements") ? current(columns.find((x) => x.name === "achievements")!) : []),
                is_active: Boolean(values.is_active ?? (columns.find((x) => x.name === "is_active") ? current(columns.find((x) => x.name === "is_active")!) : true) ?? true),
              }}
              onChange={(field, val) => set(field, val)}
              isCreate={mode === "create"}
            />
          </div>
        ) : resource.name === "batch_schedules" && mode !== "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
            <BatchScheduleFormEditor
              values={{
                batch_id: String(values.batch_id ?? (columns.find((x) => x.name === "batch_id") ? current(columns.find((x) => x.name === "batch_id")!) : "")),
                assigned_room_id: values.assigned_room_id !== undefined ? (values.assigned_room_id ? String(values.assigned_room_id) : null) : (columns.find((x) => x.name === "assigned_room_id") && current(columns.find((x) => x.name === "assigned_room_id")!) ? String(current(columns.find((x) => x.name === "assigned_room_id")!)) : null),
                session_date: String(values.session_date ?? (columns.find((x) => x.name === "session_date") ? current(columns.find((x) => x.name === "session_date")!) : "")),
                start_time: String(values.start_time ?? (columns.find((x) => x.name === "start_time") ? current(columns.find((x) => x.name === "start_time")!) : "")),
                end_time: String(values.end_time ?? (columns.find((x) => x.name === "end_time") ? current(columns.find((x) => x.name === "end_time")!) : "")),
                topic: String(values.topic ?? (columns.find((x) => x.name === "topic") ? current(columns.find((x) => x.name === "topic")!) : "")),
                is_practice_lab: Boolean(values.is_practice_lab ?? (columns.find((x) => x.name === "is_practice_lab") ? current(columns.find((x) => x.name === "is_practice_lab")!) : true) ?? true),
              }}
              onChange={(field, val) => set(field, val)}
              isCreate={mode === "create"}
            />
          </div>
        ) : resource.name === "student_academic_records" && mode !== "view" ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
            <StudentAcademicRecordFormEditor
              values={{
                enrollment_id: String(values.enrollment_id ?? (columns.find((x) => x.name === "enrollment_id") ? current(columns.find((x) => x.name === "enrollment_id")!) : "")),
                theory_score: values.theory_score !== undefined ? values.theory_score : (columns.find((x) => x.name === "theory_score") ? (current(columns.find((x) => x.name === "theory_score")!) ?? "") : ""),
                practical_score: values.practical_score !== undefined ? values.practical_score : (columns.find((x) => x.name === "practical_score") ? (current(columns.find((x) => x.name === "practical_score")!) ?? "") : ""),
                attended_sessions: values.attended_sessions !== undefined ? values.attended_sessions : (columns.find((x) => x.name === "attended_sessions") ? (current(columns.find((x) => x.name === "attended_sessions")!) ?? 10) : 10),
                total_batch_sessions: values.total_batch_sessions !== undefined ? values.total_batch_sessions : (columns.find((x) => x.name === "total_batch_sessions") ? (current(columns.find((x) => x.name === "total_batch_sessions")!) ?? 10) : 10),
                attendance_rate: values.attendance_rate !== undefined ? values.attendance_rate : (columns.find((x) => x.name === "attendance_rate") ? (current(columns.find((x) => x.name === "attendance_rate")!) ?? 100) : 100),
                feedback_theory: String(values.feedback_theory ?? (columns.find((x) => x.name === "feedback_theory") ? (current(columns.find((x) => x.name === "feedback_theory")!) || "") : "")),
                feedback_practical: String(values.feedback_practical ?? (columns.find((x) => x.name === "feedback_practical") ? (current(columns.find((x) => x.name === "feedback_practical")!) || "") : "")),
                feedback_attendance: String(values.feedback_attendance ?? (columns.find((x) => x.name === "feedback_attendance") ? (current(columns.find((x) => x.name === "feedback_attendance")!) || "") : "")),
                feedback_attitude: String(values.feedback_attitude ?? (columns.find((x) => x.name === "feedback_attitude") ? (current(columns.find((x) => x.name === "feedback_attitude")!) || "") : "")),
                is_graduated: Boolean(values.is_graduated ?? (columns.find((x) => x.name === "is_graduated") ? current(columns.find((x) => x.name === "is_graduated")!) : true) ?? true),
                graduation_date: values.graduation_date !== undefined ? (values.graduation_date ? String(values.graduation_date) : null) : (columns.find((x) => x.name === "graduation_date") && current(columns.find((x) => x.name === "graduation_date")!) ? String(current(columns.find((x) => x.name === "graduation_date")!)) : null),
              }}
              onChange={(field, val) => set(field, val)}
              isCreate={mode === "create"}
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

              // Custom Date Range Picker for course_batches
              if (resource.name === "course_batches" && c.name === "end_date" && mode !== "view") {
                // Handled together inside BatchDateRangeEditor when start_date is rendered
                return null;
              }

              if (resource.name === "course_batches" && c.name === "start_date" && mode !== "view") {
                const endCol = columns.find((x) => x.name === "end_date");
                const currentEndVal = endCol ? current(endCol) : "";
                return (
                  <BatchDateRangeEditor
                    key="course_batches_date_range"
                    startDate={String(value || "")}
                    endDate={String(currentEndVal || "")}
                    onStartDateChange={(newStart) => set("start_date", newStart)}
                    onEndDateChange={(newEnd) => set("end_date", newEnd)}
                    required={required}
                  />
                );
              }

              // Custom quick Schedule Text chips for course_batches
              if (resource.name === "course_batches" && c.name === "schedule_text" && mode !== "view") {
                return (
                  <div key={c.name} className="admin-field-wide space-y-1.5">
                    <span className="text-xs font-bold text-[#2C241E]">
                      {label(c.name)} {required && <b className="admin-required">*</b>}
                    </span>
                    <BatchScheduleTextEditor
                      value={String(value || "")}
                      onChange={(newSchedule) => set("schedule_text", newSchedule)}
                      required={required}
                    />
                  </div>
                );
              }

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
                c.name === "pricing_tiers" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <ServicePricingTiersEditor
                      value={value}
                      onChange={(tiers) => set("pricing_tiers", tiers)}
                      onSuggestBasePrice={(p) => {
                        const priceCol = fields.find((f) => f.name === "price");
                        const currentP = priceCol ? current(priceCol) : null;
                        if (!currentP || Number(currentP) === 0) {
                          set("price", p);
                        }
                      }}
                    />
                  </div>
                );

              if (
                resource.name === "services" &&
                c.name === "add_on_items" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <ServiceAddonsEditor
                      value={value}
                      onChange={(addons) => set("add_on_items", addons)}
                    />
                  </div>
                );

              if (
                (resource.name === "services" || resource.name === "treatment_packages") &&
                c.name === "image_url" &&
                mode !== "view"
              )
                return (
                  <div key={c.name} className="admin-field-wide">
                    <span className="text-xs font-bold text-[#2C241E] mb-1.5 flex items-center justify-between">
                      <span>{resource.name === "treatment_packages" ? "Ảnh đại diện gói liệu trình (Banner 16:9)" : "Ảnh đại diện dịch vụ (Banner 16:9)"}</span>
                      <span className="text-[11px] font-normal text-[#8A7968]">Tỷ lệ chuẩn 16:9 (ví dụ: 1024×576, 1200×675)</span>
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
                    <option value="">Chưa chọn</option>
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
    )}
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
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const page = Number(params.get("page")) || 1;
  const resource = resources.find((r) => r.name === table);

  // Dữ liệu phục vụ bộ lọc liên kết giữa Khóa học & Danh mục khóa học & Lớp học
  const [coursesForFilter, setCoursesForFilter] = useState<
    Array<{ id: string; title: string; code: string; category_id?: string }>
  >([]);
  const [categoriesForFilter, setCategoriesForFilter] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [batchesForFilter, setBatchesForFilter] = useState<
    Array<{
      id: string;
      batch_code: string;
      course_id: string;
      branch_id?: string;
      instructor_id?: string;
      start_date?: string;
      end_date?: string;
      schedule_text?: string;
      max_students?: number;
      enrolled_count?: number;
      status?: string;
      courses?: { id?: string; title?: string; code?: string };
      branches?: { id?: string; name?: string; code?: string };
      instructor?: { id?: string; full_name?: string };
    }>
  >([]);

  // Dữ liệu thời khóa biểu / buổi học phục vụ bộ lọc và timeline lớp học
  const [schedulesForFilter, setSchedulesForFilter] = useState<
    Array<{
      id: string;
      batch_id: string;
      session_date: string;
      start_time: string;
      end_time: string;
      topic?: string;
      is_practice_lab?: boolean;
      assigned_room_id?: string;
      room?: { id?: string; name?: string };
    }>
  >([]);

  // Danh sách học viên trong lớp phục vụ điểm danh
  const [enrollmentsForAttendance, setEnrollmentsForAttendance] = useState<
    Array<{
      id: string;
      student_id: string;
      batch_id: string;
      status: string;
      student?: { id: string; full_name: string; phone?: string; email?: string; avatar_url?: string };
    }>
  >([]);

  // Dữ liệu điểm danh của buổi học hiện tại
  const [attendanceRecordsForSchedule, setAttendanceRecordsForSchedule] = useState<
    Array<{
      id: string;
      schedule_id: string;
      enrollment_id: string;
      status: string;
      check_in_time?: string;
      notes?: string;
      marked_by_id?: string;
    }>
  >([]);

  const [markingEnrollmentId, setMarkingEnrollmentId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    if (table === "course_categories") {
      fetch(`${SUPABASE_URL}/rest/v1/courses?select=id,title,code,category_id&order=title.asc`, {
        headers: getSupabaseHeaders(),
      })
        .then((r) => r.json())
        .then((data) => {
          if (active && Array.isArray(data)) setCoursesForFilter(data);
        })
        .catch(() => {});
    } else if (table === "courses") {
      fetch(`${SUPABASE_URL}/rest/v1/course_categories?select=id,name,code&order=display_order.asc,name.asc`, {
        headers: getSupabaseHeaders(),
      })
        .then((r) => r.json())
        .then((data) => {
          if (active && Array.isArray(data)) setCategoriesForFilter(data);
        })
        .catch(() => {});
    } else if (table === "course_enrollments" || table === "student_attendance") {
      fetch(
        `${SUPABASE_URL}/rest/v1/course_batches?select=*,courses(id,title,code),branches(id,name,code),instructor:instructors!instructor_id(id,full_name)&order=start_date.desc,created_at.desc`,
        {
          headers: getSupabaseHeaders(),
        }
      )
        .then((r) => r.json())
        .then((data) => {
          if (active && Array.isArray(data)) setBatchesForFilter(data);
        })
        .catch(() => {});

      if (table === "student_attendance") {
        fetch(
          `${SUPABASE_URL}/rest/v1/batch_schedules?select=id,batch_id,session_date,start_time,end_time,topic,is_practice_lab,assigned_room_id,room:branch_rooms!assigned_room_id(id,name)&order=session_date.asc,start_time.asc`,
          {
            headers: getSupabaseHeaders(),
          }
        )
          .then((r) => r.json())
          .then((data) => {
            if (active && Array.isArray(data)) setSchedulesForFilter(data);
          })
          .catch(() => {});
      }
    }
    return () => {
      active = false;
    };
  }, [table, version]);
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
  let filter: Row = {};
  try {
    filter = JSON.parse(params.get("filter") || "{}");
  } catch {}
  const selectedBatchId =
    filter.batch_id !== undefined
      ? String(filter.batch_id)
      : params.get("batch_id") || "";
  const selectedBatch = batchesForFilter.find(
    (b) => String(b.id) === String(selectedBatchId)
  );

  const schedulesOfBatch = useMemo(() => {
    if (!selectedBatchId || selectedBatchId === "__ALL__") return [];
    return schedulesForFilter.filter((s) => s.batch_id === selectedBatchId);
  }, [schedulesForFilter, selectedBatchId]);

  const rawScheduleParam = params.get("schedule_id");
  const effectiveScheduleId = useMemo(() => {
    if (rawScheduleParam) return rawScheduleParam;
    if (schedulesOfBatch.length > 0) return schedulesOfBatch[0].id;
    return "";
  }, [rawScheduleParam, schedulesOfBatch]);

  const effectiveSchedule = useMemo(() => {
    return schedulesForFilter.find((s) => s.id === effectiveScheduleId) || null;
  }, [schedulesForFilter, effectiveScheduleId]);

  useEffect(() => {
    if (table !== "student_attendance" || !selectedBatchId || selectedBatchId === "__ALL__") {
      setEnrollmentsForAttendance([]);
      return;
    }
    let active = true;
    fetch(
      `${SUPABASE_URL}/rest/v1/course_enrollments?batch_id=eq.${selectedBatchId}&select=id,student_id,batch_id,status,student:users!student_id(id,full_name,phone,email,avatar_url)&order=created_at.asc`,
      { headers: getSupabaseHeaders() }
    )
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data)) setEnrollmentsForAttendance(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [table, selectedBatchId, version]);

  useEffect(() => {
    if (table !== "student_attendance" || !effectiveScheduleId) {
      setAttendanceRecordsForSchedule([]);
      return;
    }
    let active = true;
    fetch(
      `${SUPABASE_URL}/rest/v1/student_attendance?schedule_id=eq.${effectiveScheduleId}&select=*`,
      { headers: getSupabaseHeaders() }
    )
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setAttendanceRecordsForSchedule(data);
          const initialNotes: Record<string, string> = {};
          data.forEach((item: any) => {
            if (item.enrollment_id && item.notes) {
              initialNotes[item.enrollment_id] = item.notes;
            }
          });
          setInlineNotes((prev) => ({ ...prev, ...initialNotes }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [table, effectiveScheduleId, version]);

  const handleQuickMarkAttendance = async (enrollmentId: string, newStatus: string) => {
    if (!effectiveScheduleId) return;
    setMarkingEnrollmentId(enrollmentId);
    const existing = attendanceRecordsForSchedule.find(
      (a) => a.enrollment_id === enrollmentId
    );
    const nowIso = new Date().toISOString();

    const prevRecords = [...attendanceRecordsForSchedule];
    if (existing) {
      setAttendanceRecordsForSchedule((prev) =>
        prev.map((a) =>
          a.id === existing.id
            ? { ...a, status: newStatus, check_in_time: nowIso }
            : a
        )
      );
    } else {
      setAttendanceRecordsForSchedule((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          schedule_id: effectiveScheduleId,
          enrollment_id: enrollmentId,
          status: newStatus,
          check_in_time: nowIso,
          notes: inlineNotes[enrollmentId] || "",
        },
      ]);
    }

    try {
      const payload: any = {
        schedule_id: effectiveScheduleId,
        enrollment_id: enrollmentId,
        status: newStatus,
        check_in_time: nowIso,
      };
      if (user?.id) payload.marked_by_id = user.id;
      if (inlineNotes[enrollmentId]) payload.notes = inlineNotes[enrollmentId];

      let res;
      if (existing && !existing.id.startsWith("temp-")) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/student_attendance?id=eq.${existing.id}`, {
          method: "PATCH",
          headers: {
            ...getSupabaseHeaders(),
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/student_attendance`, {
          method: "POST",
          headers: {
            ...getSupabaseHeaders(),
            "Content-Type": "application/json",
            Prefer: "return=representation,resolution=merge-duplicates",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        throw new Error("Lỗi khi lưu điểm danh");
      }
      const saved = await res.json();
      if (Array.isArray(saved) && saved[0]) {
        setAttendanceRecordsForSchedule((prev) =>
          prev.map((a) =>
            a.enrollment_id === enrollmentId ? saved[0] : a
          )
        );
      }
    } catch (e: any) {
      console.error(e);
      setAttendanceRecordsForSchedule(prevRecords);
      alert("Không thể cập nhật điểm danh: " + (e?.message || "Lỗi mạng"));
    } finally {
      setMarkingEnrollmentId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!effectiveScheduleId || enrollmentsForAttendance.length === 0) return;
    setIsMarkingAll(true);
    const nowIso = new Date().toISOString();

    const items = enrollmentsForAttendance.map((enr) => ({
      schedule_id: effectiveScheduleId,
      enrollment_id: enr.id,
      status: "PRESENT",
      check_in_time: nowIso,
      notes: inlineNotes[enr.id] || "",
      ...(user?.id ? { marked_by_id: user.id } : {}),
    }));

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/student_attendance`, {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(),
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(items),
      });
      if (!res.ok) throw new Error("Lỗi khi điểm danh tất cả");
      const saved = await res.json();
      if (Array.isArray(saved)) {
        setAttendanceRecordsForSchedule(saved);
      }
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi điểm danh tất cả: " + (e?.message || ""));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleSaveNote = async (enrollmentId: string, notes: string) => {
    setInlineNotes((prev) => ({ ...prev, [enrollmentId]: notes }));
    const existing = attendanceRecordsForSchedule.find(
      (a) => a.enrollment_id === enrollmentId
    );
    if (!existing) {
      await handleQuickMarkAttendance(enrollmentId, "PRESENT");
    }
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/student_attendance?schedule_id=eq.${effectiveScheduleId}&enrollment_id=eq.${enrollmentId}`,
        {
          method: "PATCH",
          headers: {
            ...getSupabaseHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const presentCount = attendanceRecordsForSchedule.filter((a) => a.status === "PRESENT").length;
  const lateCount = attendanceRecordsForSchedule.filter((a) => a.status === "LATE").length;
  const absentCount = attendanceRecordsForSchedule.filter((a) => a.status === "ABSENT").length;
  const excusedCount = attendanceRecordsForSchedule.filter((a) => a.status === "EXCUSED").length;
  const markedEnrollmentIds = new Set(attendanceRecordsForSchedule.map((a) => a.enrollment_id));
  const unmarkedCount = enrollmentsForAttendance.filter((e) => !markedEnrollmentIds.has(e.id)).length;

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
        table === "users"
          ? { role: "CUSTOMER", membership_tier: "STANDARD", is_active: true }
          : table === "course_lessons" && params.get("lesson_type") === "VIDEO"
            ? { lesson_type: "VIDEO" }
            : table === "course_enrollments" && selectedBatch
              ? { batch_id: selectedBatch.id, course_id: selectedBatch.course_id }
              : {},
    });
  }, [listing, resource, table, params, selectedBatch]);
  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(name, value) : next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next);
  };
  const filterColumns =
    listing?.columns.filter(
      (c) => (c.options.length || c.type === "bool") && !(table === "users" && c.name === "role")
    ) || [];
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
    course_categories: [
      "icon_url",
      "name",
      "code",
      "description",
      "display_order",
      "is_active",
    ],
    courses: [
      "image_url",
      "title",
      "code",
      "category_id",
      "primary_instructor_id",
      "level",
      "tuition_fee",
      "is_active",
    ],
    course_batches: [
      "batch_code",
      "course_id",
      "branch_id",
      "instructor_id",
      "start_date",
      "end_date",
      "schedule_text",
      "enrolled_count",
      "status",
    ],
    batch_schedules: [
      "batch_id",
      "session_date",
      "start_time",
      "end_time",
      "topic",
      "assigned_room_id",
      "is_practice_lab",
    ],
    course_chapters: [
      "chapter_order",
      "title",
      "course_id",
      "estimated_hours",
      "is_published",
    ],
    course_enrollments: [
      "student_id",
      "course_id",
      "batch_id",
      "enrolled_at",
      "tuition_total",
      "amount_paid",
      "progress_percent",
      "status",
    ],
    instructors: [
      "avatar_url",
      "full_name",
      "title",
      "experience_years",
      "is_active",
    ],
    student_attendance: [
      "enrollment_id",
      "schedule_id",
      "status",
      "check_in_time",
      "notes",
      "marked_by_id",
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
              onClick={() => {
                if (table === "course_enrollments" && selectedBatch) {
                  setEdit({
                    row: {
                      batch_id: selectedBatch.id,
                      course_id: selectedBatch.course_id,
                    },
                    mode: "create",
                  });
                } else if (table === "student_attendance" && effectiveScheduleId) {
                  setEdit({
                    row: {
                      schedule_id: effectiveScheduleId,
                      status: "PRESENT",
                      check_in_time: new Date().toISOString(),
                    },
                    mode: "create",
                  });
                } else {
                  setEdit({ row: {}, mode: "create" });
                }
              }}
            >
              <Plus />
              Thêm mới
            </button>
          )}
          {["course_quizzes", "quiz_questions"].includes(table) && (
            <button
              type="button"
              className="btn btn-outline flex items-center gap-1.5 border-[#22C55E]/40 text-[#15803D] bg-[#F0FDF4] hover:bg-[#DCFCE7] font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer ml-2"
              onClick={() => setShowExcelImportModal(true)}
            >
              <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
              <span>Nhập từ Excel</span>
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
        {(table === "course_enrollments" || table === "student_attendance") && (
          <select
            aria-label="Chọn Lớp học"
            className="font-bold text-[#8A4F23] bg-[#FFFDF9] border-[#EAD8C7]"
            value={selectedBatchId}
            onChange={(e) => {
              const bId = e.target.value;
              const next = { ...filter };
              const p = new URLSearchParams(params);
              if (!bId) {
                delete next.batch_id;
                p.delete("batch_id");
                p.delete("schedule_id");
              } else {
                next.batch_id = bId;
                p.set("batch_id", bId);
                p.delete("schedule_id");
              }
              Object.keys(next).length
                ? p.set("filter", JSON.stringify(next))
                : p.delete("filter");
              p.delete("page");
              setParams(p);
            }}
          >
            <option value="">🎓 Chọn lớp học ({batchesForFilter.length} lớp có sẵn)</option>
            <option value="__ALL__">🌐 {table === "student_attendance" ? "Toàn bộ lịch sử điểm danh tất cả các lớp" : "Toàn bộ học viên tất cả các lớp"}</option>
            {batchesForFilter.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_code} · {b.courses?.title || "Khóa học"} {b.branches?.name ? `(${b.branches.name})` : ""}
              </option>
            ))}
          </select>
        )}
        {table === "student_attendance" && selectedBatchId && selectedBatchId !== "__ALL__" && (
          <select
            aria-label="Chọn Buổi học"
            className="font-bold text-[#2C241E] bg-[#FFFDF9] border-[#EAD8C7] max-w-[280px]"
            value={effectiveScheduleId}
            onChange={(e) => {
              const sId = e.target.value;
              const p = new URLSearchParams(params);
              if (sId) {
                p.set("schedule_id", sId);
              } else {
                p.delete("schedule_id");
              }
              p.delete("page");
              setParams(p);
            }}
          >
            {schedulesOfBatch.length === 0 ? (
              <option value="">Lớp này chưa có buổi học</option>
            ) : (
              schedulesOfBatch.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Buổi {idx + 1} ({s.session_date ? new Date(s.session_date).toLocaleDateString("vi-VN") : ""}{s.start_time ? ` ${s.start_time.slice(0, 5)}` : ""}): {s.topic || (s.is_practice_lab ? "Thực hành" : "Lý thuyết")}
                </option>
              ))
            )}
          </select>
        )}
        {table === "course_categories" && (
          <select
            aria-label="Lọc theo Khóa học"
            value={params.get("course_id") || ""}
            onChange={(e) => {
              const cId = e.target.value;
              const next = { ...filter };
              const p = new URLSearchParams(params);
              if (!cId) {
                delete next.id;
                p.delete("course_id");
              } else {
                const matched = coursesForFilter.find((c) => c.id === cId);
                if (matched?.category_id) {
                  next.id = matched.category_id;
                } else {
                  next.id = "00000000-0000-0000-0000-000000000000";
                }
                p.set("course_id", cId);
              }
              Object.keys(next).length ? p.set("filter", JSON.stringify(next)) : p.delete("filter");
              p.delete("page");
              setParams(p);
            }}
          >
            <option value="">Khóa học · Tất cả ({coursesForFilter.length})</option>
            {coursesForFilter.map((crs) => (
              <option key={crs.id} value={crs.id}>
                {crs.title} {crs.code ? `(${crs.code})` : ""}
              </option>
            ))}
          </select>
        )}
        {table === "courses" && (
          <select
            aria-label="Lọc theo Danh mục khóa học"
            value={filter.category_id === undefined ? "" : String(filter.category_id)}
            onChange={(e) => {
              const catId = e.target.value;
              const next = { ...filter };
              if (!catId) {
                delete next.category_id;
              } else {
                next.category_id = catId;
              }
              updateParam("filter", Object.keys(next).length ? JSON.stringify(next) : "");
            }}
          >
            <option value="">Danh mục khóa học · Tất cả ({categoriesForFilter.length})</option>
            {categoriesForFilter.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} {cat.code ? `(${cat.code})` : ""}
              </option>
            ))}
          </select>
        )}
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
        {(Object.keys(filter).length > 0 || Boolean(params.get("course_id")) || Boolean(params.get("batch_id")) || Boolean(params.get("schedule_id"))) && (
          <button
            className="admin-secondary"
            onClick={() => {
              const p = new URLSearchParams(params);
              p.delete("filter");
              p.delete("course_id");
              p.delete("batch_id");
              p.delete("schedule_id");
              p.delete("page");
              setParams(p);
            }}
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
            {table === "student_attendance" && !selectedBatchId && !params.get("search") ? (
              <div className="space-y-6 my-2 font-['Plus_Jakarta_Sans',sans-serif]">
                <div className="p-6 md:p-8 bg-gradient-to-br from-[#FFFDF9] via-[#FAF4EE] to-[#F5E9DC] rounded-3xl border-2 border-[#EAD8C7] shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#8A4F23] text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                        <CalendarCheck size={28} />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#8A4F23]/10 text-[#8A4F23] mb-1">
                          Học viện đào tạo MLD Việt Nam
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-[#2D1B08] tracking-tight">
                          Chọn Lớp Học Để Quản Lý Điểm Danh & Lịch Học
                        </h2>
                        <p className="text-xs md:text-sm text-[#7D6E63] mt-1 max-w-2xl leading-relaxed">
                          Xem toàn bộ lịch học và thời khóa biểu của lớp, theo dõi sĩ số học viên và thực hiện điểm danh 1 chạm cho từng buổi học theo chuẩn học viện.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const p = new URLSearchParams(params);
                        p.set("batch_id", "__ALL__");
                        const next = { ...filter, batch_id: "__ALL__" };
                        p.set("filter", JSON.stringify(next));
                        p.delete("page");
                        setParams(p);
                      }}
                      className="self-start md:self-center px-4 py-2.5 rounded-xl text-xs font-bold text-[#8A4F23] bg-white hover:bg-[#FAF0E4] border border-[#EAD8C7] transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>🌐 Xem toàn bộ nhật ký điểm danh tất cả các lớp</span>
                    </button>
                  </div>
                </div>

                {batchesForFilter.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-[#EAD8C7] space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-2xl mx-auto border border-[#EAD8C7]">
                      🎓
                    </div>
                    <h3 className="text-base font-bold text-[#2D1B08]">Chưa có lớp học nào trong hệ thống</h3>
                    <p className="text-xs text-[#7D6E63] max-w-md mx-auto">
                      Cần có ít nhất một lớp học (Course Batch) trước khi có thể điểm danh học viên. Vui lòng tạo lớp học mới trước.
                    </p>
                    <Link
                      to="/manage/course_batches?create=1"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>+ Tạo lớp học mới ngay</span>
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#2D1B08] flex items-center gap-2">
                        <span>Danh sách các lớp học hiện có</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#FAF0E4] text-[#8A4F23] border border-[#EAD8C7]">
                          {batchesForFilter.length} lớp
                        </span>
                      </h3>
                      <span className="text-xs text-[#8C7A6B]">Bấm vào một lớp để mở lịch học và điểm danh</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {batchesForFilter.map((b) => {
                        const batchSchedCount = schedulesForFilter.filter((s) => s.batch_id === b.id).length;
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              const next = { ...filter, batch_id: b.id };
                              const p = new URLSearchParams(params);
                              p.set("batch_id", b.id);
                              p.set("filter", JSON.stringify(next));
                              p.delete("schedule_id");
                              p.delete("page");
                              setParams(p);
                            }}
                            className="bg-white hover:bg-[#FFFDF9] border-2 border-[#EAD8C7] hover:border-[#8A4F23] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden text-left"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#FAF0E4] text-[#8A4F23] border border-[#EAD8C7] flex items-center gap-1">
                                  <span>🎓</span>
                                  <span>{b.batch_code}</span>
                                </span>
                                {b.status && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                      b.status === "ONGOING"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : b.status === "PLANNED"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : b.status === "COMPLETED"
                                        ? "bg-slate-50 text-slate-700 border-slate-200"
                                        : "bg-[#FAF0E4] text-[#8A4F23] border-[#EAD8C7]"
                                    }`}
                                  >
                                    {b.status === "ONGOING"
                                      ? "Đang học"
                                      : b.status === "PLANNED"
                                      ? "Sắp khai giảng"
                                      : b.status === "COMPLETED"
                                      ? "Đã bế giảng"
                                      : enums[b.status] || b.status}
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="text-base font-bold text-[#2D1B08] group-hover:text-[#8A4F23] transition-colors leading-snug line-clamp-2">
                                  {b.courses?.title || "Khóa đào tạo MLD"}
                                </h4>
                                {b.courses?.code && (
                                  <span className="text-[11px] text-[#8A4F23] font-mono mt-0.5 block font-semibold">
                                    Mã khóa: {b.courses.code}
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5 text-xs text-[#7D6E63] pt-2 border-t border-[#F2E7DC]">
                                <div className="flex items-center gap-2">
                                  <MapPin size={13} className="text-[#8A4F23] shrink-0" />
                                  <span className="truncate">
                                    Chi nhánh: <b>{b.branches?.name || "Toàn hệ thống"}</b>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <UserCheck size={13} className="text-[#8A4F23] shrink-0" />
                                  <span className="truncate">
                                    Giảng viên: <b>{b.instructor?.full_name || "Chưa phân công"}</b>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar size={13} className="text-[#8A4F23] shrink-0" />
                                  <span>
                                    Khai giảng: <b>{b.start_date ? new Date(b.start_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</b>
                                  </span>
                                </div>
                                {b.schedule_text && (
                                  <div className="flex items-center gap-2">
                                    <Clock size={13} className="text-[#8A4F23] shrink-0" />
                                    <span className="truncate">
                                      Lịch: <b>{b.schedule_text}</b>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#F2E7DC] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8A4F23] bg-[#FAF0E4] px-2 py-0.5 rounded-lg">
                                  <CalendarCheck size={13} />
                                  <span>{batchSchedCount} buổi</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D1B08] bg-[#F7F4F0] px-2 py-0.5 rounded-lg border border-[#EAD8C7]">
                                  <Users size={13} />
                                  <span>{b.enrolled_count || 0} HV</span>
                                </span>
                              </div>
                              <span className="text-xs font-bold text-[#8A4F23] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                <span>Mở điểm danh</span>
                                <span>→</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : table === "student_attendance" && selectedBatch ? (
              <div className="space-y-6 my-2 font-['Plus_Jakarta_Sans',sans-serif]">
                {/* 1. Header Banner của Lớp học */}
                <div className="bg-gradient-to-r from-[#FAF0E4] via-[#F8ECE0] to-[#F5E5D3] border-2 border-[#EAD8C7] rounded-3xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#8A4F23] text-white px-2.5 py-0.5 rounded-md shadow-2xs">
                          Lớp đào tạo đang chọn
                        </span>
                        <span className="text-base font-extrabold text-[#2D1B08] bg-white px-2.5 py-0.5 rounded-md border border-[#EAD8C7]">
                          🎓 {selectedBatch.batch_code}
                        </span>
                        {selectedBatch.branches?.name && (
                          <span className="text-xs font-medium text-[#7D6E63] bg-white/80 px-2 py-0.5 rounded-md border border-[#EAD8C7]">
                            📍 {selectedBatch.branches.name}
                          </span>
                        )}
                        {selectedBatch.instructor?.full_name && (
                          <span className="text-xs font-medium text-[#7D6E63] bg-white/80 px-2 py-0.5 rounded-md border border-[#EAD8C7]">
                            👨‍🏫 {selectedBatch.instructor.full_name}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg md:text-xl font-extrabold text-[#2D1B08]">
                        {selectedBatch.courses?.title || "Khóa đào tạo"} {selectedBatch.courses?.code ? `(${selectedBatch.courses.code})` : ""}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#7D6E63]">
                        <span>📅 Khai giảng: <b>{selectedBatch.start_date ? new Date(selectedBatch.start_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</b></span>
                        {selectedBatch.schedule_text && (
                          <span>⏰ Lịch học cố định: <b>{selectedBatch.schedule_text}</b></span>
                        )}
                        <span className="bg-[#8A4F23]/10 text-[#8A4F23] font-bold px-2.5 py-0.5 rounded-md">
                          👥 {enrollmentsForAttendance.length} học viên trong lớp
                        </span>
                        <span className="bg-[#0D6832]/10 text-[#0D6832] font-bold px-2.5 py-0.5 rounded-md">
                          📅 {schedulesOfBatch.length} buổi học trong lịch
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams(params);
                          p.delete("batch_id");
                          p.delete("schedule_id");
                          const next = { ...filter };
                          delete next.batch_id;
                          Object.keys(next).length ? p.set("filter", JSON.stringify(next)) : p.delete("filter");
                          p.delete("page");
                          setParams(p);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#8A4F23] bg-white hover:bg-[#FAF0E4] border border-[#EAD8C7] transition-all cursor-pointer shadow-2xs"
                      >
                        ⇄ Đổi lớp khác
                      </button>
                      <Link
                        to="/manage/batch_schedules?create=1"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                      >
                        <Plus size={15} />
                        <span>+ Thêm buổi học vào lịch</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 2. Lịch học của lớp đó (Schedule Timeline Strip) */}
                <div className="bg-white rounded-3xl border-2 border-[#EAD8C7] p-5 md:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F2E7DC]">
                    <div>
                      <h3 className="text-base font-extrabold text-[#2D1B08] flex items-center gap-2">
                        <CalendarCheck size={18} className="text-[#8A4F23]" />
                        <span>Lịch Học & Thời Khóa Biểu Của Lớp ({schedulesOfBatch.length} buổi)</span>
                      </h3>
                      <p className="text-xs text-[#8C7A6B] mt-0.5">
                        Bấm vào từng buổi học bên dưới để chuyển phiên và thực hiện điểm danh học viên cho buổi đó
                      </p>
                    </div>
                    {schedulesOfBatch.length > 0 && (
                      <span className="text-xs font-bold text-[#8A4F23] bg-[#FAF0E4] px-3 py-1 rounded-full border border-[#EAD8C7] self-start sm:self-auto">
                        Đang chọn: Buổi {schedulesOfBatch.findIndex((s) => s.id === effectiveScheduleId) + 1}
                      </span>
                    )}
                  </div>

                  {schedulesOfBatch.length === 0 ? (
                    <div className="p-8 text-center bg-[#FFFDF9] rounded-2xl border border-dashed border-[#EAD8C7] space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-xl mx-auto border border-[#EAD8C7]">
                        📅
                      </div>
                      <h4 className="text-sm font-bold text-[#2D1B08]">Lớp học này chưa có buổi học nào trong lịch trình</h4>
                      <p className="text-xs text-[#7D6E63] max-w-md mx-auto">
                        Để thực hiện điểm danh, cần phân bổ các buổi học trong phân hệ Thời khóa biểu (Batch Schedules).
                      </p>
                      <Link
                        to="/manage/batch_schedules?create=1"
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>+ Tạo buổi học mới cho lớp</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {schedulesOfBatch.map((s, idx) => {
                        const isActive = s.id === effectiveScheduleId;
                        const dateFormatted = s.session_date
                          ? new Date(s.session_date).toLocaleDateString("vi-VN")
                          : "Chưa có ngày";
                        const timeStr =
                          s.start_time && s.end_time
                            ? `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`
                            : "";
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              const p = new URLSearchParams(params);
                              p.set("schedule_id", s.id);
                              p.delete("page");
                              setParams(p);
                            }}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left relative overflow-hidden ${
                              isActive
                                ? "bg-[#FFFDF9] border-[#8A4F23] shadow-md ring-2 ring-[#8A4F23]/20"
                                : "bg-white hover:bg-[#FAF8F5] border-[#EAD8C7] hover:border-[#C4A48A] shadow-2xs"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                                    isActive
                                      ? "bg-[#8A4F23] text-white"
                                      : "bg-[#FAF0E4] text-[#8A4F23] border border-[#EAD8C7]"
                                  }`}
                                >
                                  Buổi {idx + 1}
                                </span>
                                <span
                                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                                    s.is_practice_lab
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-blue-50 text-blue-800 border-blue-200"
                                  }`}
                                >
                                  {s.is_practice_lab ? "⚡ Thực hành" : "📖 Lý thuyết"}
                                </span>
                              </div>

                              <div className="font-bold text-xs text-[#2D1B08] flex items-center gap-1.5 flex-wrap">
                                <span>📅 {dateFormatted}</span>
                                {timeStr && (
                                  <span className="text-[#8A4F23] font-semibold">⏰ {timeStr}</span>
                                )}
                              </div>

                              <p
                                className="text-xs text-[#4A3E36] line-clamp-2 font-medium leading-relaxed"
                                title={s.topic || `Buổi học số ${idx + 1}`}
                              >
                                {s.topic || `Chuyên đề buổi học ${idx + 1}`}
                              </p>

                              {s.room?.name && (
                                <div className="text-[11px] text-[#8C7A6B] flex items-center gap-1 truncate">
                                  <MapPin size={11} className="text-[#8A4F23] shrink-0" />
                                  <span className="truncate">{s.room.name}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-[#F2E7DC] flex items-center justify-between text-[11px]">
                              {isActive ? (
                                <span className="font-bold text-[#0D6832] flex items-center gap-1">
                                  <Check size={13} className="stroke-[3]" />
                                  <span>Đang chọn</span>
                                </span>
                              ) : (
                                <span className="font-medium text-[#8A4F23] group-hover:underline">
                                  Bấm để điểm danh
                                </span>
                              )}
                              <span className="text-[#A69788]">→</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Interactive Student Attendance Roster for Active Session */}
                {effectiveSchedule && (
                  <div className="bg-white rounded-3xl border-2 border-[#EAD8C7] p-5 md:p-6 shadow-xs space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F2E7DC]">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#8A4F23] text-white">
                            Buổi {schedulesOfBatch.findIndex((s) => s.id === effectiveScheduleId) + 1}
                          </span>
                          <h3 className="text-base md:text-lg font-black text-[#2D1B08]">
                            {effectiveSchedule.topic || "Điểm Danh Buổi Học"}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7D6E63] mt-1.5">
                          <span>📅 Ngày: <b>{effectiveSchedule.session_date ? new Date(effectiveSchedule.session_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</b></span>
                          <span>⏰ Giờ: <b>{effectiveSchedule.start_time?.slice(0, 5)} - {effectiveSchedule.end_time?.slice(0, 5)}</b></span>
                          {effectiveSchedule.room?.name && (
                            <span>📍 Phòng: <b>{effectiveSchedule.room.name}</b></span>
                          )}
                        </div>
                      </div>

                      {/* Summary Metrics & Bulk Button */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#EAD8C7]">
                          <span className="px-2 py-1 rounded-xl text-xs font-bold bg-white text-[#2D1B08] shadow-2xs border border-[#EAD8C7]" title="Tổng sĩ số">
                            Sĩ số: <b>{enrollmentsForAttendance.length}</b>
                          </span>
                          <span className="px-2 py-1 rounded-xl text-xs font-bold bg-[#E8F6ED] text-[#0D6832] border border-[#BDE8CD]" title="Có mặt">
                            ✓ {presentCount}
                          </span>
                          <span className="px-2 py-1 rounded-xl text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]" title="Đi muộn">
                            ⏰ {lateCount}
                          </span>
                          <span className="px-2 py-1 rounded-xl text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]" title="Vắng">
                            ✕ {absentCount}
                          </span>
                          <span className="px-2 py-1 rounded-xl text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]" title="Nghỉ có phép">
                            ✉ {excusedCount}
                          </span>
                          {unmarkedCount > 0 && (
                            <span className="px-2 py-1 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300" title="Chưa đánh dấu">
                              • {unmarkedCount} chưa điểm danh
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleMarkAllPresent}
                          disabled={isMarkingAll || enrollmentsForAttendance.length === 0}
                          className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0D6832] hover:bg-[#095026] active:scale-95 transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <CheckCheck size={16} />
                          <span>{isMarkingAll ? "Đang lưu..." : "✓ Điểm danh tất cả Có mặt"}</span>
                        </button>
                      </div>
                    </div>

                    {enrollmentsForAttendance.length === 0 ? (
                      <div className="p-8 text-center bg-[#FFFDF9] rounded-2xl border border-[#EAD8C7] space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-xl mx-auto border border-[#EAD8C7]">
                          👥
                        </div>
                        <h4 className="text-sm font-bold text-[#2D1B08]">Lớp học này chưa có học viên nào được ghi danh</h4>
                        <p className="text-xs text-[#7D6E63] max-w-md mx-auto">
                          Vui lòng ghi danh học viên vào lớp trước khi tiến hành điểm danh buổi học.
                        </p>
                        <Link
                          to={`/manage/course_enrollments?batch_id=${selectedBatch.id}&create=1`}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>+ Ghi danh học viên ngay</span>
                        </Link>
                      </div>
                    ) : (
                      <div className="admin-table-wrap overflow-x-auto">
                        <table className="admin-table w-full">
                          <thead>
                            <tr>
                              <th className="w-12 text-center">STT</th>
                              <th>Học viên</th>
                              <th className="min-w-[320px]">Trạng thái điểm danh (1 chạm)</th>
                              <th className="min-w-[150px]">Giờ điểm danh</th>
                              <th className="min-w-[220px]">Ghi chú buổi học</th>
                              <th className="min-w-[140px]">Người xác nhận</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrollmentsForAttendance.map((enr, idx) => {
                              const att = attendanceRecordsForSchedule.find(
                                (a) => a.enrollment_id === enr.id
                              );
                              const curStatus = att?.status;
                              const isUpdating = markingEnrollmentId === enr.id;
                              const studentName = enr.student?.full_name || "Học viên";
                              const phone = enr.student?.phone;
                              const email = enr.student?.email;

                              return (
                                <tr key={enr.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                                  <td className="text-center font-bold text-xs text-[#8C7A6B]">
                                    {idx + 1}
                                  </td>
                                  <td>
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-[#FAF0E4] text-[#8A4F23] font-bold text-xs flex items-center justify-center border border-[#EAD8C7] shrink-0">
                                        {studentName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-extrabold text-xs text-[#2D1B08] truncate">
                                          {studentName}
                                        </div>
                                        <div className="text-[10.5px] text-[#8C7A6B] truncate">
                                          {phone || email || "Chưa có liên hệ"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* PRESENT */}
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleQuickMarkAttendance(enr.id, "PRESENT")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          curStatus === "PRESENT"
                                            ? "bg-[#0D6832] text-white shadow-xs scale-102"
                                            : "bg-[#E8F6ED] text-[#0D6832] hover:bg-[#D3EEDF] border border-[#BDE8CD]"
                                        }`}
                                      >
                                        <span>✓</span>
                                        <span>Có mặt</span>
                                      </button>

                                      {/* LATE */}
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleQuickMarkAttendance(enr.id, "LATE")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          curStatus === "LATE"
                                            ? "bg-[#D97706] text-white shadow-xs scale-102"
                                            : "bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] border border-[#FDE68A]"
                                        }`}
                                      >
                                        <span>⏰</span>
                                        <span>Đi muộn</span>
                                      </button>

                                      {/* ABSENT */}
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleQuickMarkAttendance(enr.id, "ABSENT")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          curStatus === "ABSENT"
                                            ? "bg-[#DC2626] text-white shadow-xs scale-102"
                                            : "bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] border border-[#FECACA]"
                                        }`}
                                      >
                                        <span>✕</span>
                                        <span>Vắng</span>
                                      </button>

                                      {/* EXCUSED */}
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleQuickMarkAttendance(enr.id, "EXCUSED")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          curStatus === "EXCUSED"
                                            ? "bg-[#2563EB] text-white shadow-xs scale-102"
                                            : "bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] border border-[#BFDBFE]"
                                        }`}
                                      >
                                        <span>✉</span>
                                        <span>Có phép</span>
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    {att?.check_in_time ? (
                                      <span className="text-xs font-medium text-[#2D1B08] inline-flex items-center gap-1">
                                        <Clock size={12} className="text-[#8A4F23]" />
                                        <span>
                                          {new Intl.DateTimeFormat("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            day: "2-digit",
                                            month: "2-digit",
                                          }).format(new Date(att.check_in_time))}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-xs text-[#A69788]">—</span>
                                    )}
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      value={inlineNotes[enr.id] ?? (att?.notes || "")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInlineNotes((prev) => ({ ...prev, [enr.id]: val }));
                                      }}
                                      onBlur={(e) => handleSaveNote(enr.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      }}
                                      placeholder="Ghi chú (VD: tiếp thu tốt)..."
                                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#EAD8C7] bg-white w-full max-w-[220px] focus:outline-[#8A4F23]"
                                    />
                                  </td>
                                  <td>
                                    {att ? (
                                      <span className="text-xs font-medium text-[#0D6832] inline-flex items-center gap-1">
                                        <span>✓</span>
                                        <span>{user?.full_name || "Giảng viên"}</span>
                                      </span>
                                    ) : (
                                      <span className="text-xs text-[#A69788]">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : table === "course_enrollments" && !selectedBatchId && !params.get("search") ? (
              <div className="space-y-6 my-2 font-['Plus_Jakarta_Sans',sans-serif]">
                {batchesForFilter.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-[#EAD8C7] space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-2xl mx-auto border border-[#EAD8C7]">
                      🎓
                    </div>
                    <h3 className="text-base font-bold text-[#2D1B08]">Chưa có lớp học nào trong hệ thống</h3>
                    <p className="text-xs text-[#7D6E63] max-w-md mx-auto">
                      Cần có ít nhất một lớp học (Course Batch) trước khi có thể ghi danh học viên. Vui lòng tạo lớp học mới trước.
                    </p>
                    <Link
                      to="/manage/course_batches?create=1"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>+ Tạo lớp học mới ngay</span>
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#2D1B08] flex items-center gap-2">
                          <span>Danh sách các lớp học hiện có</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#FAF0E4] text-[#8A4F23] border border-[#EAD8C7]">
                            {batchesForFilter.length} lớp
                          </span>
                        </h3>
                        <p className="text-xs text-[#8C7A6B] mt-0.5">Bấm vào một lớp để mở danh sách học viên hoặc chọn xem toàn bộ bên phải</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams(params);
                          p.set("batch_id", "__ALL__");
                          const next = { ...filter, batch_id: "__ALL__" };
                          p.set("filter", JSON.stringify(next));
                          p.delete("page");
                          setParams(p);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#8A4F23] bg-white hover:bg-[#FAF0E4] border border-[#EAD8C7] transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
                      >
                        <span>🌐 Xem toàn bộ học viên tất cả các lớp</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {batchesForFilter.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            const next = { ...filter, batch_id: b.id };
                            const p = new URLSearchParams(params);
                            p.set("batch_id", b.id);
                            p.set("filter", JSON.stringify(next));
                            p.delete("page");
                            setParams(p);
                          }}
                          className="bg-white hover:bg-[#FFFDF9] border-2 border-[#EAD8C7] hover:border-[#8A4F23] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden text-left"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#FAF0E4] text-[#8A4F23] border border-[#EAD8C7] flex items-center gap-1">
                                <span>🎓</span>
                                <span>{b.batch_code}</span>
                              </span>
                              {b.status && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                    b.status === "ONGOING"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : b.status === "PLANNED"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : b.status === "COMPLETED"
                                      ? "bg-slate-50 text-slate-700 border-slate-200"
                                      : "bg-[#FAF0E4] text-[#8A4F23] border-[#EAD8C7]"
                                  }`}
                                >
                                  {b.status === "ONGOING"
                                    ? "Đang học"
                                    : b.status === "PLANNED"
                                    ? "Sắp khai giảng"
                                    : b.status === "COMPLETED"
                                    ? "Đã bế giảng"
                                    : enums[b.status] || b.status}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="text-base font-bold text-[#2D1B08] group-hover:text-[#8A4F23] transition-colors leading-snug line-clamp-2">
                                {b.courses?.title || "Khóa đào tạo MLD"}
                              </h4>
                              {b.courses?.code && (
                                <span className="text-[11px] text-[#8A4F23] font-mono mt-0.5 block font-semibold">
                                  Mã khóa: {b.courses.code}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 text-xs text-[#7D6E63] pt-2 border-t border-[#F2E7DC]">
                              <div className="flex items-center gap-2">
                                <MapPin size={13} className="text-[#8A4F23] shrink-0" />
                                <span className="truncate">
                                  Chi nhánh: <b>{b.branches?.name || "Toàn hệ thống"}</b>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserCheck size={13} className="text-[#8A4F23] shrink-0" />
                                <span className="truncate">
                                  Giảng viên: <b>{b.instructor?.full_name || "Chưa phân công"}</b>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={13} className="text-[#8A4F23] shrink-0" />
                                <span>
                                  Khai giảng: <b>{b.start_date ? new Date(b.start_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</b>
                                </span>
                              </div>
                              {b.schedule_text && (
                                <div className="flex items-center gap-2">
                                  <Clock size={13} className="text-[#8A4F23] shrink-0" />
                                  <span className="truncate">
                                    Lịch: <b>{b.schedule_text}</b>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#F2E7DC] flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8A4F23] bg-[#FAF0E4] px-2.5 py-1 rounded-lg">
                              <Users size={13} />
                              <span>{b.enrolled_count || 0} học viên</span>
                            </span>
                            <span className="text-xs font-bold text-[#8A4F23] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                              <span>Mở danh sách</span>
                              <span>→</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {table === "course_enrollments" && selectedBatch && (
                  <div className="bg-gradient-to-r from-[#FAF0E4] via-[#F8ECE0] to-[#F5E5D3] border-2 border-[#EAD8C7] rounded-2xl p-5 mb-5 shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#8A4F23] text-white px-2.5 py-0.5 rounded-md shadow-2xs">
                            Lớp học đang chọn
                          </span>
                          <span className="text-base font-extrabold text-[#2D1B08] bg-white px-2.5 py-0.5 rounded-md border border-[#EAD8C7]">
                            🎓 {selectedBatch.batch_code}
                          </span>
                          {selectedBatch.branches?.name && (
                            <span className="text-xs font-medium text-[#7D6E63] bg-white/80 px-2 py-0.5 rounded-md border border-[#EAD8C7]">
                              📍 {selectedBatch.branches.name}
                            </span>
                          )}
                          {selectedBatch.instructor?.full_name && (
                            <span className="text-xs font-medium text-[#7D6E63] bg-white/80 px-2 py-0.5 rounded-md border border-[#EAD8C7]">
                              👨‍🏫 {selectedBatch.instructor.full_name}
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg md:text-xl font-extrabold text-[#2D1B08]">
                          {selectedBatch.courses?.title || "Khóa đào tạo"} {selectedBatch.courses?.code ? `(${selectedBatch.courses.code})` : ""}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7D6E63]">
                          <span>📅 Khai giảng: <b>{selectedBatch.start_date ? new Date(selectedBatch.start_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</b></span>
                          {selectedBatch.schedule_text && (
                            <span>⏰ Lịch: <b>{selectedBatch.schedule_text}</b></span>
                          )}
                          <span className="bg-[#8A4F23]/10 text-[#8A4F23] font-bold px-2 py-0.5 rounded-md">
                            👥 {listing.total.toLocaleString("vi-VN")} học viên trong lớp
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const p = new URLSearchParams(params);
                            p.delete("batch_id");
                            const next = { ...filter };
                            delete next.batch_id;
                            Object.keys(next).length ? p.set("filter", JSON.stringify(next)) : p.delete("filter");
                            p.delete("page");
                            setParams(p);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#8A4F23] bg-white hover:bg-[#FAF0E4] border border-[#EAD8C7] transition-all cursor-pointer shadow-2xs"
                        >
                          ⇄ Đổi lớp khác
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEdit({
                              row: {
                                batch_id: selectedBatch.id,
                                course_id: selectedBatch.course_id,
                              },
                              mode: "create",
                            });
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                        >
                          <Plus size={15} />
                          <span>+ Ghi danh học viên</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {table === "student_attendance" && selectedBatchId === "__ALL__" && (
                  <div className="bg-[#FAF8F5] border border-[#EAD8C7] rounded-2xl p-4 mb-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-[#2D1B08]">
                      <span className="text-lg">🌐</span>
                      <span>Đang hiển thị toàn bộ nhật ký điểm danh của tất cả các lớp ({listing.total.toLocaleString("vi-VN")} bản ghi)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const p = new URLSearchParams(params);
                        p.delete("batch_id");
                        p.delete("schedule_id");
                        const next = { ...filter };
                        delete next.batch_id;
                        Object.keys(next).length ? p.set("filter", JSON.stringify(next)) : p.delete("filter");
                        p.delete("page");
                        setParams(p);
                      }}
                      className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#8A4F23] bg-white border border-[#EAD8C7] hover:bg-[#FAF0E4] cursor-pointer"
                    >
                      ← Quay lại chọn theo từng lớp
                    </button>
                  </div>
                )}
                {table === "course_enrollments" && selectedBatchId === "__ALL__" && (
                  <div className="bg-[#FAF8F5] border border-[#EAD8C7] rounded-2xl p-4 mb-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-[#2D1B08]">
                      <span className="text-lg">🌐</span>
                      <span>Đang hiển thị toàn bộ học viên ghi danh của tất cả các lớp ({listing.total.toLocaleString("vi-VN")} học viên)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const p = new URLSearchParams(params);
                        p.delete("batch_id");
                        const next = { ...filter };
                        delete next.batch_id;
                        Object.keys(next).length ? p.set("filter", JSON.stringify(next)) : p.delete("filter");
                        p.delete("page");
                        setParams(p);
                      }}
                      className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#8A4F23] bg-white border border-[#EAD8C7] hover:bg-[#FAF0E4] cursor-pointer"
                    >
                      ← Quay lại chọn theo từng lớp
                    </button>
                  </div>
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
                          {table === "course_categories" && c.name === "name" && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(() => {
                                const matched = coursesForFilter.filter(
                                  (crs) => crs.category_id === row.id
                                );
                                if (matched.length === 0) {
                                  return (
                                    <span className="text-[10px] text-[#A69788] italic">
                                      Chưa có khóa học
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#8A4F23] bg-[#FAF3EA] border border-[#EAD8C7] px-2 py-0.5 rounded-md"
                                    title={matched.map((m) => m.title).join(", ")}
                                  >
                                    📚 {matched.length} khóa: {matched.map((m) => m.title).join(", ")}
                                  </span>
                                );
                              })()}
                            </div>
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
                <div className="admin-empty py-10 text-center">
                  {table === "course_enrollments" && selectedBatch ? (
                    <div className="max-w-md mx-auto space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
                      <div className="w-14 h-14 rounded-2xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center text-2xl mx-auto border border-[#EAD8C7] shadow-xs">
                        🎓
                      </div>
                      <h3 className="text-base font-bold text-[#2D1B08]">
                        Lớp "{selectedBatch.batch_code}" hiện chưa có học viên nào ghi danh
                      </h3>
                      <p className="text-xs text-[#7D6E63] leading-relaxed">
                        Khóa học: <b className="text-[#8A4F23]">{selectedBatch.courses?.title || selectedBatch.batch_code}</b>.
                        Hãy ghi danh học viên mới hoặc tiếp nhận học viên đã đặt cọc vào lớp học này.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEdit({
                            row: {
                              batch_id: selectedBatch.id,
                              course_id: selectedBatch.course_id,
                            },
                            mode: "create",
                          });
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8A4F23] hover:bg-[#723F1A] transition-colors shadow-sm cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>Ghi danh học viên đầu tiên vào lớp này</span>
                      </button>
                    </div>
                  ) : (
                    <p>
                      {params.get("search") || params.get("filter")
                        ? "Không có kết quả phù hợp."
                        : "Chưa có dữ liệu."}
                    </p>
                  )}
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
            )}
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

      {/* Excel Quiz Import Modal */}
      <ExcelQuizImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        onImportSuccess={() => {
          setVersion((v) => v + 1);
          setNotice("Nhập câu hỏi trắc nghiệm từ file Excel thành công!");
        }}
      />
    </section>
  );
}
