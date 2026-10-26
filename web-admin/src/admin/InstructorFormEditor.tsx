import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  User,
  GraduationCap,
  Award,
  CheckCircle2,
  X,
  Loader2,
  Plus,
  Minus,
  Briefcase,
  FileText,
  Star,
  Eye,
  Stethoscope,
  Activity,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { adminApi, Listing, Row } from "./api";

export interface InstructorFormValues {
  user_id?: string;
  full_name: string;
  title: string;
  avatar_url: string;
  experience_years: number;
  bio: string;
  achievements: string[] | string;
  is_active: boolean;
}

interface InstructorFormEditorProps {
  values: InstructorFormValues;
  onChange: (field: keyof InstructorFormValues, val: any) => void;
  isCreate?: boolean;
}

export const InstructorFormEditor: React.FC<InstructorFormEditorProps> = ({
  values,
  onChange,
  isCreate = true,
}) => {
  const [usersList, setUsersList] = useState<Row[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"upload" | "url">("upload");
  const [newAchievementInput, setNewAchievementInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse achievements sang mảng chuỗi
  const achievementsArray: string[] = Array.isArray(values.achievements)
    ? values.achievements
    : typeof values.achievements === "string" && values.achievements.trim().length > 0
    ? (() => {
        try {
          const parsed = JSON.parse(values.achievements);
          return Array.isArray(parsed) ? parsed : [values.achievements];
        } catch {
          return values.achievements.split("\n").map((s) => s.trim()).filter(Boolean);
        }
      })()
    : [];

  // Tải danh sách tài khoản người dùng để liên kết
  useEffect(() => {
    let active = true;
    setLoadingUsers(true);
    adminApi<Listing>("users?limit=100&page=1")
      .then((data) => {
        if (active && data?.rows) {
          setUsersList(data.rows);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Xử lý khi chọn tài khoản người dùng
  const handleUserSelect = (userId: string) => {
    onChange("user_id", userId || undefined);
    if (!userId) return;

    const matchedUser = usersList.find((u) => String(u.id) === userId);
    if (matchedUser) {
      if (!values.full_name || values.full_name === "Chưa đặt tên") {
        onChange("full_name", matchedUser.full_name || matchedUser.name || "");
      }
      if (!values.avatar_url && matchedUser.avatar_url) {
        onChange("avatar_url", matchedUser.avatar_url);
      }
    }
  };

  // Thêm thành tích / chứng chỉ
  const handleAddAchievement = (item: string) => {
    const text = item.trim();
    if (!text || achievementsArray.includes(text)) return;
    const updated = [...achievementsArray, text];
    onChange("achievements", updated);
  };

  const handleRemoveAchievement = (index: number) => {
    const updated = achievementsArray.filter((_, i) => i !== index);
    onChange("achievements", updated);
  };

  // Tải ảnh chân dung từ máy
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Kiểm tra định dạng tệp ảnh
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Kiểm tra dung lượng tối đa 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    // 3. Hiển thị ngay ảnh xem trước để người dùng thấy kết quả tức thì
    const localBlob = URL.createObjectURL(file);
    onChange("avatar_url", localBlob);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const cleanFileName = `instructor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
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
        // Fallback sang Base64 nếu storage gặp trục trặc
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            onChange("avatar_url", String(reader.result));
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${cleanFileName}`;
      onChange("avatar_url", publicUrl);
    } catch (err: any) {
      console.warn("Lỗi tải ảnh lên Supabase Storage, chuyển sang lưu Base64:", err);
      // Fallback an toàn sang Base64 để không làm gián đoạn người dùng
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onChange("avatar_url", String(reader.result));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-field-wide space-y-4">
      {/* 1. HAI CỘT: TÀI KHOẢN HỆ THỐNG & HỌ VÀ TÊN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1">
              <User size={13} className="text-[#985018]" />
              <span>Liên kết Tài khoản người dùng</span>
            </label>
            <span className="text-[10px] text-[#8C7A6B]">Không bắt buộc</span>
          </div>
          <select
            value={values.user_id || ""}
            onChange={(e) => handleUserSelect(e.target.value)}
            disabled={loadingUsers}
            className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs font-medium cursor-pointer"
          >
            <option value="">-- Chưa liên kết tài khoản (Giảng viên độc lập) --</option>
            {usersList.map((u) => (
              <option key={String(u.id)} value={u.id}>
                {u.full_name || u.name || "Người dùng"}
                {u.phone ? ` · SĐT: ${u.phone}` : ""}
                {u.role ? ` [${u.role}]` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#2C241E] mb-1">
            Họ và tên giảng viên <b className="text-[#B6443C]">*</b>
          </label>
          <input
            type="text"
            required
            value={values.full_name || ""}
            onChange={(e) => onChange("full_name", e.target.value)}
            placeholder="VD: Nguyễn Thảo Ngọc, BS. Trần Đình Quân..."
            className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs font-bold"
          />
        </div>
      </div>

      {/* 2. CHỨC DANH / DANH XƯNG CHUYÊN MÔN */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#2C241E]">
          Chức danh / Danh xưng chuyên môn
        </label>
        <input
          type="text"
          value={values.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="VD: Chuyên gia MLD Vodder Quốc tế · Master Level 3..."
          className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs font-medium"
        />
      </div>

      {/* 3. ẢNH CHÂN DUNG ĐẠI DIỆN (AVATAR PICKER & UPLOADER) */}
      <div className="p-3.5 bg-white border border-[#E2D7CB] rounded-2xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#985018]" />
            <span>Ảnh chân dung đại diện</span>
          </label>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setAvatarTab("upload")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                avatarTab === "upload"
                  ? "bg-[#985018] text-white shadow-2xs"
                  : "text-[#73675F] hover:bg-[#FAF5EF]"
              }`}
            >
              Tải từ máy
            </button>
            <button
              type="button"
              onClick={() => setAvatarTab("url")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                avatarTab === "url"
                  ? "bg-[#985018] text-white shadow-2xs"
                  : "text-[#73675F] hover:bg-[#FAF5EF]"
              }`}
            >
              Dán URL
            </button>
          </div>
        </div>

        {/* Tab 2: Tải từ máy tính */}
        {avatarTab === "upload" && (
          <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#BA7E4C]/50 rounded-xl flex items-center justify-between gap-3">
            <div className="text-xs text-[#73675F]">
              <span className="font-bold text-[#2C241E] block">Tải ảnh chân dung giảng viên</span>
              <span>Định dạng hỗ trợ: JPG, PNG, WEBP (tối đa 5MB)</span>
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
        {avatarTab === "url" && (
          <div>
            <input
              type="url"
              value={values.avatar_url || ""}
              onChange={(e) => onChange("avatar_url", e.target.value.trim())}
              placeholder="https://... dán link ảnh chân dung trực tiếp đuôi .jpg, .png"
              className="w-full text-xs px-3.5 py-2 bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl text-[#2C241E] font-mono focus:outline-none focus:border-[#985018] focus:bg-white"
            />
          </div>
        )}

        {/* Ô xem trước Ảnh chân dung đang áp dụng */}
        <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8]">
          <div
            className="rounded-2xl bg-[#F5ECE3] border-2 border-[#BA7E4C]/50 flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative"
            style={{ width: 68, height: 68, minWidth: 68, minHeight: 68, maxWidth: 68, maxHeight: 68 }}
          >
            {values.avatar_url ? (
              <img
                src={values.avatar_url}
                alt="Avatar Preview"
                className="w-full h-full object-cover block"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <User className="w-8 h-8 text-[#985018]" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#2C241E] truncate block">
                {values.full_name || "Chưa nhập họ tên"}
              </span>
              {values.avatar_url && !uploading && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#EBF7EE] text-[#059669] border border-[#CDEED5]">
                  ✓ Đã có ảnh
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#8C7A6B] font-mono truncate block mt-0.5">
              {uploading
                ? "Đang tải ảnh lên máy chủ..."
                : values.avatar_url || "Chưa có ảnh (sẽ dùng avatar mặc định)"}
            </span>
            {values.avatar_url && !uploading && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-[#985018] hover:underline font-bold cursor-pointer"
                >
                  Đổi ảnh khác
                </button>
                <span className="text-[#D1C7BD] text-[10px]">·</span>
                <a
                  href={values.avatar_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#73675F] hover:underline cursor-pointer"
                >
                  Xem ảnh gốc
                </a>
                <span className="text-[#D1C7BD] text-[10px]">·</span>
                <button
                  type="button"
                  onClick={() => onChange("avatar_url", "")}
                  className="text-[10px] text-[#DC2626] hover:underline cursor-pointer"
                >
                  Gỡ ảnh
                </button>
              </div>
            )}
          </div>
          {values.avatar_url && !uploading && (
            <button
              type="button"
              onClick={() => onChange("avatar_url", "")}
              className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
              title="Gỡ ảnh này"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. KINH NGHIỆM GIẢNG DẠY & ĐIỀU TRỊ */}
      <div className="p-3 bg-white border border-[#E2D7CB] rounded-2xl space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <Briefcase size={14} className="text-[#985018]" />
            <span>Kinh nghiệm giảng dạy & điều trị</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onChange("experience_years", Math.max(1, (Number(values.experience_years) || 1) - 1))
              }
              className="p-1.5 rounded-lg border border-[#E2D7CB] bg-white text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
            >
              <Minus size={12} />
            </button>
            <span className="text-xs font-bold text-[#985018] min-w-[50px] text-center font-mono">
              {values.experience_years || 1} năm
            </span>
            <button
              type="button"
              onClick={() =>
                onChange("experience_years", (Number(values.experience_years) || 1) + 1)
              }
              className="p-1.5 rounded-lg border border-[#E2D7CB] bg-white text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. GIỚI THIỆU TIỂU SỬ & CHUYÊN MÔN */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
          <FileText size={14} className="text-[#985018]" />
          <span>Tiểu sử & Giới thiệu chuyên môn <b className="text-[#B6443C]">*</b></span>
        </label>
        <textarea
          rows={3}
          required
          value={values.bio || ""}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="Mô tả quá trình đào tạo, lĩnh vực nghiên cứu và kinh nghiệm giảng dạy thực tế..."
          className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs leading-relaxed"
        />
      </div>

      {/* 6. THÀNH TÍCH & CHỨNG CHỈ */}
      <div className="p-3.5 bg-white border border-[#E2D7CB] rounded-2xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <Award size={14} className="text-[#985018]" />
            <span>Thành tích & Chứng chỉ y khoa đạt được</span>
          </label>
          <span className="text-[10px] text-[#8C7A6B]">
            {achievementsArray.length} danh hiệu
          </span>
        </div>

        {/* Danh sách thành tích hiện có */}
        {achievementsArray.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {achievementsArray.map((ach, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-[#FAF0E4] text-[#7A3E10] border border-[#BA7E4C]/40"
              >
                <ShieldCheck size={13} className="text-[#985018]" />
                <span>{ach}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAchievement(idx)}
                  className="hover:text-red-600 cursor-pointer ml-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Ô thêm thành tích mới */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newAchievementInput}
            onChange={(e) => setNewAchievementInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddAchievement(newAchievementInput);
                setNewAchievementInput("");
              }
            }}
            placeholder="Nhập chứng chỉ / thành tích và bấm Thêm..."
            className="flex-1 text-xs px-3 py-2 bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] focus:bg-white"
          />
          <button
            type="button"
            onClick={() => {
              handleAddAchievement(newAchievementInput);
              setNewAchievementInput("");
            }}
            className="px-3 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <Plus size={13} />
            <span>Thêm</span>
          </button>
        </div>
      </div>

      {/* 8. TRẠNG THÁI HOẠT ĐỘNG */}
      <div>
        <label className="block text-xs font-bold text-[#2C241E] mb-1">
          Trạng thái giảng dạy
        </label>
        <button
          type="button"
          onClick={() => onChange("is_active", !values.is_active)}
          className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            values.is_active !== false
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          {values.is_active !== false ? (
            <>
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Đang giảng dạy (Hiển thị trên App & Web Học viện)</span>
            </>
          ) : (
            <>
              <X size={16} className="text-gray-400" />
              <span>Tạm ngưng giảng dạy (Ẩn khỏi danh mục)</span>
            </>
          )}
        </button>
      </div>

      {/* 9. THẺ MÔ PHỎNG XEM TRƯỚC GIẢNG VIÊN TRÊN MOBILE & WEB */}
      <div className="p-3.5 bg-gradient-to-br from-[#FAF8F5] to-[#F5ECE3] border border-[#BA7E4C]/30 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#8A4F23] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#985018]" />
            <span>Mô phỏng hiển thị trên Hồ sơ Học viện & Mobile App:</span>
          </span>
          <span className="text-[10px] text-[#73675F]">{values.experience_years || 1} năm kinh nghiệm</span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-[#EFE4D9] flex items-start gap-3.5 shadow-2xs">
          <div
            className="rounded-2xl bg-[#F5ECE3] border-2 border-[#BA7E4C]/40 flex items-center justify-center shrink-0 overflow-hidden shadow-xs"
            style={{ width: 56, height: 56, minWidth: 56, minHeight: 56, maxWidth: 56, maxHeight: 56 }}
          >
            {values.avatar_url ? (
              <img
                src={values.avatar_url}
                alt="Instructor"
                className="w-full h-full object-cover block"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <User className="w-7 h-7 text-[#985018]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#2C241E] truncate">
                {values.full_name || "Tên giảng viên"}
              </h4>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  values.is_active !== false
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {values.is_active !== false ? "Đang giảng dạy" : "Tạm ngưng"}
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#985018] truncate mt-0.5">
              {values.title || "Chức danh / Danh xưng chuyên môn"}
            </p>
            <p className="text-[11px] text-[#73675F] line-clamp-2 mt-1 leading-relaxed">
              {values.bio || "Chưa có thông tin giới thiệu tiểu sử chuyên môn."}
            </p>
            {achievementsArray.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {achievementsArray.slice(0, 2).map((item, i) => (
                  <span
                    key={i}
                    className="text-[9.5px] font-semibold bg-[#FAF0E4] text-[#8A4F23] px-1.5 py-0.5 rounded border border-[#BA7E4C]/30"
                  >
                    ★ {item}
                  </span>
                ))}
                {achievementsArray.length > 2 && (
                  <span className="text-[9.5px] text-[#8C7A6B] font-medium self-center">
                    +{achievementsArray.length - 2} chứng chỉ khác
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
