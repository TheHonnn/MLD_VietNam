import React, { useState, useRef } from "react";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  Plus,
  Minus,
  RefreshCw,
  Eye,
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";

export interface CourseCategoryFormValues {
  name: string;
  code: string;
  icon_url: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

interface CourseCategoryFormEditorProps {
  values: CourseCategoryFormValues;
  onChange: (field: keyof CourseCategoryFormValues, val: any) => void;
  isCreate?: boolean;
}

// Chuyển chuỗi tiếng Việt thành mã Code viết hoa
export function slugifyCategoryCode(name: string): string {
  if (!name) return "";
  let str = name.toLowerCase().trim();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[^a-z0-9\s-]/g, "");
  str = str.replace(/\s+/g, "-").replace(/-+/g, "-");
  return str.toUpperCase();
}

// Các mẫu danh mục gợi ý nhanh chuẩn Y khoa Học viện MLD
export const PRESET_CATEGORIES = [
  {
    name: "Dẫn lưu Bạch huyết Vodder Cơ bản",
    code: "MLD-BASIC",
    icon_url: "https://api.iconify.design/lucide:graduation-cap.svg?color=%23985018",
    emoji: "🎓",
    description: "Khóa đào tạo nền tảng lý thuyết & thao tác dẫn lưu bạch huyết chuẩn Dr. Vodder quốc tế.",
  },
  {
    name: "Phù nề Hậu phẫu & Trị liệu Y khoa",
    code: "MLD-POSTOP",
    icon_url: "https://api.iconify.design/lucide:hospital.svg?color=%23985018",
    emoji: "🏥",
    description: "Phác đồ kiểm soát và phục hồi biến chứng phù nề sau phẫu thuật tạo hình, chấn thương mô.",
  },
  {
    name: "Kỹ thuật Chuyên sâu & Thực hành Lâm sàng",
    code: "MLD-ADVANCED",
    icon_url: "https://api.iconify.design/lucide:activity.svg?color=%23985018",
    emoji: "💆",
    description: "Kỹ thuật nắn bóp chuyên sâu, giải phóng xơ hóa và hỗ trợ bệnh lý phù bạch huyết mạn tính.",
  },
  {
    name: "Đào tạo Giảng viên & Master Vodder",
    code: "MLD-MASTER",
    icon_url: "https://api.iconify.design/lucide:award.svg?color=%23985018",
    emoji: "🩺",
    description: "Chương trình phát triển giảng viên sư phạm và chuyển giao phác đồ MLD độc quyền.",
  },
  {
    name: "Chăm sóc Tự nhiên & Phục hồi Tại nhà",
    code: "MLD-HOMECARE",
    icon_url: "https://api.iconify.design/lucide:leaf.svg?color=%23985018",
    emoji: "🌿",
    description: "Cẩm nang hướng dẫn tự chăm sóc tuần hoàn bạch huyết và duy trì hiệu quả tại gia.",
  },
];

// Danh sách biểu tượng icon/SVG chuẩn để chọn 1 chạm
export const PRESET_ICONS = [
  {
    label: "Học viện",
    emoji: "🎓",
    url: "https://api.iconify.design/lucide:graduation-cap.svg?color=%23985018",
  },
  {
    label: "Y khoa",
    emoji: "🏥",
    url: "https://api.iconify.design/lucide:hospital.svg?color=%23985018",
  },
  {
    label: "Trị liệu",
    emoji: "💆",
    url: "https://api.iconify.design/lucide:activity.svg?color=%23985018",
  },
  {
    label: "Chuyên gia",
    emoji: "🩺",
    url: "https://api.iconify.design/lucide:stethoscope.svg?color=%23985018",
  },
  {
    label: "Tự nhiên",
    emoji: "🌿",
    url: "https://api.iconify.design/lucide:leaf.svg?color=%23985018",
  },
  {
    label: "Lâm sàng",
    emoji: "🔬",
    url: "https://api.iconify.design/lucide:microscope.svg?color=%23985018",
  },
  {
    label: "Chứng chỉ",
    emoji: "🏆",
    url: "https://api.iconify.design/lucide:award.svg?color=%23985018",
  },
  {
    label: "Giáo trình",
    emoji: "📚",
    url: "https://api.iconify.design/lucide:book-open.svg?color=%23985018",
  },
  {
    label: "Kỹ năng",
    emoji: "💡",
    url: "https://api.iconify.design/lucide:lightbulb.svg?color=%23985018",
  },
  {
    label: "Đặc quyền",
    emoji: "✨",
    url: "https://api.iconify.design/lucide:sparkles.svg?color=%23985018",
  },
];

export const CourseCategoryFormEditor: React.FC<CourseCategoryFormEditorProps> = ({
  values,
  onChange,
  isCreate = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [customIconTab, setCustomIconTab] = useState<"preset" | "upload" | "url">("preset");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Áp dụng mẫu danh mục có sẵn
  const handleApplyPreset = (preset: typeof PRESET_CATEGORIES[0]) => {
    onChange("name", preset.name);
    onChange("code", preset.code);
    onChange("icon_url", preset.icon_url);
    onChange("description", preset.description);
  };

  // Tự động sinh mã khi nhập tên
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    onChange("name", newName);
    // Nếu chưa có mã hoặc mã đang sinh từ tên cũ thì tự động cập nhật
    if (!values.code || values.code === slugifyCategoryCode(values.name)) {
      onChange("code", slugifyCategoryCode(newName));
    }
  };

  // Tải ảnh biểu tượng lên Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
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
        throw new Error("Không thể tải ảnh biểu tượng lên đám mây.");
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${cleanFileName}`;
      onChange("icon_url", publicUrl);
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải ảnh biểu tượng");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-field-wide space-y-4">
      {/* 1. THANH GỢI Ý MẪU 1-CHẠM (Dành cho việc tạo mới nhanh) */}
      {isCreate && (
        <div className="p-3 bg-[#FAF5EF] border border-[#EFE4D9] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A4F23] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#985018]" />
              <span>Gợi ý mẫu danh mục đào tạo MLD chuẩn:</span>
            </span>
            <span className="text-[10px] text-[#8C7A6B]">Bấm để điền mẫu tự động</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CATEGORIES.map((preset) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#7A3E10] border border-[#BA7E4C]/30 hover:bg-[#F3E2CE] hover:border-[#985018] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 text-left"
              >
                <span>{preset.emoji}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. HAI CỘT: TÊN DANH MỤC & MÃ DANH MỤC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-[#2C241E] mb-1">
            Tên danh mục <b className="text-[#B6443C]">*</b>
          </label>
          <input
            type="text"
            required
            value={values.name || ""}
            onChange={handleNameChange}
            placeholder="VD: Dẫn lưu Bạch huyết Cơ bản..."
            className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs font-medium"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[#2C241E]">
              Mã danh mục <b className="text-[#B6443C]">*</b>
            </label>
            <button
              type="button"
              onClick={() => onChange("code", slugifyCategoryCode(values.name || "MLD-CAT"))}
              className="text-[11px] font-semibold text-[#985018] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={10} />
              <span>Sinh mã tự động</span>
            </button>
          </div>
          <input
            type="text"
            required
            value={values.code || ""}
            onChange={(e) => onChange("code", e.target.value.toUpperCase())}
            placeholder="VD: MLD-BASIC, MLD-POSTOP..."
            className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] font-mono font-bold focus:outline-none focus:border-[#985018] shadow-2xs uppercase tracking-wide"
          />
        </div>
      </div>

      {/* 3. BỘ CHỌN BIỂU TƯỢNG (ICON PICKER & UPLOADER) */}
      <div className="p-3.5 bg-white border border-[#E2D7CB] rounded-2xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#985018]" />
            <span>Biểu tượng danh mục</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
              Đã có sẵn bộ icon chuẩn
            </span>
          </label>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setCustomIconTab("preset")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                customIconTab === "preset"
                  ? "bg-[#985018] text-white shadow-2xs"
                  : "text-[#73675F] hover:bg-[#FAF5EF]"
              }`}
            >
              Icon có sẵn
            </button>
            <button
              type="button"
              onClick={() => setCustomIconTab("upload")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                customIconTab === "upload"
                  ? "bg-[#985018] text-white shadow-2xs"
                  : "text-[#73675F] hover:bg-[#FAF5EF]"
              }`}
            >
              Tải từ máy
            </button>
            <button
              type="button"
              onClick={() => setCustomIconTab("url")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                customIconTab === "url"
                  ? "bg-[#985018] text-white shadow-2xs"
                  : "text-[#73675F] hover:bg-[#FAF5EF]"
              }`}
            >
              Dán URL
            </button>
          </div>
        </div>

        {/* Tab 1: Chọn Icon có sẵn 1 chạm */}
        {customIconTab === "preset" && (
          <div>
            <div className="text-[11px] text-[#73675F] mb-1.5">
              Bấm chọn biểu tượng đại diện phù hợp với chuyên đề đào tạo:
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {PRESET_ICONS.map((icon) => {
                const isSelected = values.icon_url === icon.url;
                return (
                  <button
                    key={icon.url}
                    type="button"
                    onClick={() => onChange("icon_url", icon.url)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#985018] bg-[#F5ECE3] shadow-xs scale-105"
                        : "border-[#E8DFD8] bg-[#FAF8F5] hover:bg-white hover:border-[#BA7E4C]"
                    }`}
                  >
                    <span className="text-xl mb-0.5">{icon.emoji}</span>
                    <span className="text-[10px] font-semibold text-[#2C241E] truncate max-w-full">
                      {icon.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Tải từ máy tính */}
        {customIconTab === "upload" && (
          <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#BA7E4C]/50 rounded-xl flex items-center justify-between gap-3">
            <div className="text-xs text-[#73675F]">
              <span className="font-bold text-[#2C241E] block">Tải ảnh biểu tượng từ máy tính</span>
              <span>Định dạng hỗ trợ: PNG, SVG, JPG, WEBP (tối đa 5MB)</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn tệp ảnh</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: Dán link URL trực tiếp */}
        {customIconTab === "url" && (
          <div>
            <input
              type="url"
              value={values.icon_url || ""}
              onChange={(e) => onChange("icon_url", e.target.value.trim())}
              placeholder="https://... dán link ảnh hoặc icon trực tiếp"
              className="w-full text-xs px-3.5 py-2 bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl text-[#2C241E] font-mono focus:outline-none focus:border-[#985018] focus:bg-white"
            />
          </div>
        )}

        {/* Ô xem trước Biểu tượng đang áp dụng */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#EFE4D9]">
          <div className="w-11 h-11 rounded-xl bg-[#F5ECE3] border border-[#BA7E4C]/40 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            {values.icon_url ? (
              <img
                src={values.icon_url}
                alt="Icon Preview"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <GraduationCap className="w-6 h-6 text-[#985018]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-[#2C241E] block">
              Biểu tượng hiện tại:
            </span>
            <span className="text-[10px] text-[#8C7A6B] font-mono truncate block">
              {values.icon_url || "Chưa chọn biểu tượng (hệ thống sẽ áp dụng icon mặc định)"}
            </span>
          </div>
          {values.icon_url && (
            <button
              type="button"
              onClick={() => onChange("icon_url", "")}
              className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
              title="Gỡ biểu tượng này"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. MÔ TẢ DANH MỤC */}
      <div>
        <label className="block text-xs font-bold text-[#2C241E] mb-1">
          Mô tả tóm tắt danh mục
        </label>
        <textarea
          rows={2}
          value={values.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Mô tả mục tiêu, đối tượng học viên hoặc đặc trưng của nhóm khóa học này..."
          className="w-full text-xs px-3.5 py-2 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs"
        />
      </div>

      {/* 5. THỨ TỰ HIỂN THỊ & TRẠNG THÁI HOẠT ĐỘNG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-[#2C241E] mb-1">
            Thứ tự hiển thị (#1, #2, #3...)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onChange("display_order", Math.max(1, (Number(values.display_order) || 1) - 1))
              }
              className="p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
              title="Giảm thứ tự"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              min="1"
              value={values.display_order ?? 1}
              onChange={(e) => onChange("display_order", Number(e.target.value) || 1)}
              className="flex-1 text-xs text-center font-bold px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
            />
            <button
              type="button"
              onClick={() =>
                onChange("display_order", (Number(values.display_order) || 1) + 1)
              }
              className="p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
              title="Tăng thứ tự"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#2C241E] mb-1">
            Trạng thái hoạt động
          </label>
          <button
            type="button"
            onClick={() => onChange("is_active", !values.is_active)}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              values.is_active !== false
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            {values.is_active !== false ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Đang hoạt động (Hiển thị)</span>
              </>
            ) : (
              <>
                <X size={15} className="text-gray-400" />
                <span>Tạm ẩn (Không hiển thị)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6. XEM TRƯỚC TRỰC QUAN THẺ DANH MỤC TRÊN MOBILE & WEB */}
      <div className="p-3.5 bg-gradient-to-br from-[#FAF8F5] to-[#F5ECE3] border border-[#BA7E4C]/30 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#8A4F23] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#985018]" />
            <span>Mô phỏng hiển thị trên Ứng dụng & Cổng đào tạo:</span>
          </span>
          <span className="text-[10px] text-[#73675F]">Thứ tự #{values.display_order || 1}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#EFE4D9] flex items-center gap-3 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#FAF0E4] border border-[#BA7E4C]/30 flex items-center justify-center shrink-0 overflow-hidden">
            {values.icon_url ? (
              <img
                src={values.icon_url}
                alt="Icon"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <GraduationCap className="w-6 h-6 text-[#985018]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#2C241E] truncate">
                {values.name || "Tên danh mục khóa học"}
              </h4>
              <span className="text-[9px] font-mono font-bold bg-[#FAF0E4] text-[#8A4F23] px-1.5 py-0.5 rounded border border-[#BA7E4C]/30">
                {values.code || "MLD-CODE"}
              </span>
            </div>
            <p className="text-[11px] text-[#73675F] truncate mt-0.5">
              {values.description || "Chưa có mô tả tóm tắt cho danh mục này."}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                values.is_active !== false
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {values.is_active !== false ? "Hoạt động" : "Tạm ẩn"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
