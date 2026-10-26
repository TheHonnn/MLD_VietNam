import React, { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  BookOpen,
  Clock,
  BadgeDollarSign,
  Award,
  Sparkles,
  Pencil,
  Save,
  X,
  LoaderCircle,
  AlertCircle,
  Image as ImageIcon,
  Check,
  Target,
  Users,
  Upload,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface CourseEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}

const LEVELS = [
  { value: "BEGINNER", label: "Cơ bản (Người mới bắt đầu)" },
  { value: "INTERMEDIATE", label: "Trung cấp (Người làm nghề)" },
  { value: "ADVANCED", label: "Nâng cao (Chuyên viên chuyên sâu)" },
  { value: "MASTER", label: "Chuyên gia Master / Giảng viên" },
];

const COURSE_GROUP_SUGGESTIONS = [
  "Chuyên sâu",
  "Cơ bản nghề",
  "Nâng cao",
  "Nền tảng",
  "Chuyên đề Mẹ & Bé",
  "Chuyên sâu CDT",
  "Phục hồi chức năng",
  "Chuyên gia & Giảng viên",
];

const TARGET_AUDIENCE_SUGGESTIONS = [
  "Kỹ thuật viên, Y bác sĩ & Người quan tâm đến sức khỏe",
  "Chủ Spa, Quản lý thẩm mỹ viện & KTV ngành làm đẹp",
  "Người mới bắt đầu tìm hiểu dẫn lưu bạch huyết Vodder",
  "Bệnh nhân và người nhà có nhu cầu tự chăm sóc tại nhà",
];

const TARGET_NEED_SUGGESTIONS = [
  "Nâng cao tay nghề và chăm sóc hệ bạch huyết chuyên sâu",
  "Chuẩn hóa phương pháp dẫn lưu bạch huyết Vodder Châu Âu",
  "Ứng dụng giảm phù nề sau phẫu thuật và làm đẹp y khoa",
  "Xây dựng lộ trình phát triển giảng viên chuyển giao công nghệ",
];

export const CourseEditorSheet: React.FC<CourseEditorSheetProps> = ({
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

  // Categories & Instructors list
  const [categories, setCategories] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form State
  const [categoryId, setCategoryId] = useState(row.category_id || "");
  const [instructorId, setInstructorId] = useState(row.primary_instructor_id || "");
  const [title, setTitle] = useState(row.title || "");
  const [code, setCode] = useState(row.code || "");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  // Level & Hours - Khởi tạo rỗng/0 khi thêm mới, không điền mẫu
  const [level, setLevel] = useState(row.level || "");
  const [theoryHours, setTheoryHours] = useState<number | "">(row.theory_hours !== undefined ? Number(row.theory_hours) : (isCreate ? "" : 0));
  const [practiceHours, setPracticeHours] = useState<number | "">(row.practice_hours !== undefined ? Number(row.practice_hours) : (isCreate ? "" : 0));
  const [totalHours, setTotalHours] = useState<number | "">(row.total_hours !== undefined ? Number(row.total_hours) : (isCreate ? "" : 0));
  const [totalLessons, setTotalLessons] = useState<number | "">(row.total_lessons !== undefined ? Number(row.total_lessons) : (isCreate ? "" : 0));

  // Fees - Khởi tạo rỗng/0 khi thêm mới
  const [tuitionFee, setTuitionFee] = useState<number | "">(row.tuition_fee !== undefined ? Number(row.tuition_fee) : (isCreate ? "" : 0));
  const [depositAmount, setDepositAmount] = useState<number | "">(row.deposit_amount !== undefined ? Number(row.deposit_amount) : (isCreate ? "" : 0));

  // Learning Outcomes - Để trống khi tạo mới
  const existingOutcomes = typeof row.learning_outcomes === "object" && row.learning_outcomes !== null
    ? row.learning_outcomes
    : {};
  const [courseGroup, setCourseGroup] = useState<string>(existingOutcomes.course_group || "");
  const [targetAudience, setTargetAudience] = useState<string>(
    existingOutcomes.target_audience || ""
  );
  const [targetNeed, setTargetNeed] = useState<string>(
    existingOutcomes.target_need || ""
  );

  // Certificate & Description - Để trống khi tạo mới
  const [certificateTitle, setCertificateTitle] = useState(row.certificate_title || "");
  const [certificateManuallyEdited, setCertificateManuallyEdited] = useState(false);
  const [shortDescription, setShortDescription] = useState(row.short_description || "");
  const [fullDescription, setFullDescription] = useState(row.full_description || "");
  const [imageUrl, setImageUrl] = useState(row.image_url || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Tải ảnh bìa khóa học từ máy tính lên Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingImage(true);

    // Hiển thị ngay ảnh xem trước từ máy
    const localBlob = URL.createObjectURL(file);
    setImageUrl(localBlob);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const cleanFileName = `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const STORAGE_URL = "https://wstvwushpwcdsmhpunvh.supabase.co";
      const KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE";

      // Thử tải lên bucket 'services' trước, nếu thất bại thử sang bucket 'avatars'
      let targetBucket = "services";
      let res = await fetch(
        `${STORAGE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`,
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
        targetBucket = "avatars";
        res = await fetch(
          `${STORAGE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`,
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
      }

      if (res.ok) {
        const publicUrl = `${STORAGE_URL}/storage/v1/object/public/${targetBucket}/${cleanFileName}`;
        setImageUrl(publicUrl);
      } else {
        // Fallback sang Base64
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setImageUrl(String(reader.result));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn("Lỗi tải ảnh lên Supabase Storage, chuyển sang lưu Base64:", err);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImageUrl(String(reader.result));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Status
  const [isFeatured, setIsFeatured] = useState<boolean>(row.is_featured !== undefined ? Boolean(row.is_featured) : false);
  const [isActive, setIsActive] = useState<boolean>(row.is_active !== undefined ? Boolean(row.is_active) : true);

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Auto-calculate total hours when theory or practice changes
  const handleTheoryChange = (val: number | "") => {
    setTheoryHours(val);
    const numT = val === "" ? 0 : Number(val);
    const numP = practiceHours === "" ? 0 : Number(practiceHours);
    setTotalHours(numT + numP);
  };

  const handlePracticeChange = (val: number | "") => {
    setPracticeHours(val);
    const numT = theoryHours === "" ? 0 : Number(theoryHours);
    const numP = val === "" ? 0 : Number(val);
    setTotalHours(numT + numP);
  };

  // Title changes auto-suggest certificate title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (isCreate && !certificateManuallyEdited && newTitle.trim()) {
      setCertificateTitle(`Chứng chỉ hoàn thành: ${newTitle.trim()}`);
    }
  };

  // Quick deposit calculation
  const handleDepositPercent = (percent: number) => {
    const feeNum = tuitionFee === "" ? 0 : Number(tuitionFee);
    if (percent === 0) {
      setDepositAmount(0);
    } else {
      const calc = Math.round((feeNum * percent) / 100);
      setDepositAmount(calc);
    }
  };

  // Load categories and instructors (không tự động gán dữ liệu mẫu khi tạo mới)
  useEffect(() => {
    let mounted = true;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [catRes, instRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/course_categories?select=id,name,code&order=name.asc`, {
            headers: getSupabaseHeaders(),
          }),
          fetch(`${SUPABASE_URL}/rest/v1/instructors?select=id,full_name&order=full_name.asc`, {
            headers: getSupabaseHeaders(),
          }),
        ]);

        const [catData, instData] = await Promise.all([
          catRes.json().catch(() => []),
          instRes.json().catch(() => []),
        ]);

        if (mounted) {
          if (Array.isArray(catData)) {
            setCategories(catData);
            if (!isCreate && !categoryId && catData.length > 0) setCategoryId(catData[0].id);
          }
          if (Array.isArray(instData)) {
            setInstructors(instData);
            if (!isCreate && !instructorId && instData.length > 0) setInstructorId(instData[0].id);
          }
        }
      } catch (err) {
        console.warn("Lỗi load lookups cho khóa học:", err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };
    fetchLookups();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Vui lòng nhập Tiêu đề khóa học.");
      return;
    }
    if (!code.trim()) {
      setError("Vui lòng nhập Mã khóa học.");
      return;
    }
    if (!categoryId) {
      setError("Vui lòng chọn Danh mục đào tạo.");
      return;
    }
    if (!level) {
      setError("Vui lòng chọn Trình độ chuyên môn.");
      return;
    }
    if (!imageUrl.trim()) {
      setError("Vui lòng nhập Đường dẫn ảnh bìa hoặc URL ảnh khóa học.");
      return;
    }
    if (!shortDescription.trim()) {
      setError("Vui lòng nhập Mô tả ngắn cho khóa học.");
      return;
    }
    if (!fullDescription.trim()) {
      setError("Vui lòng nhập Mô tả chi tiết nội dung khóa học.");
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        code: code.trim(),
        category_id: categoryId,
        primary_instructor_id: instructorId || null,
        level,
        total_hours: Number(totalHours) || 0,
        theory_hours: Number(theoryHours) || 0,
        practice_hours: Number(practiceHours) || 0,
        total_lessons: Number(totalLessons) || 0,
        tuition_fee: Number(tuitionFee) || 0,
        deposit_amount: Number(depositAmount) || 0,
        learning_outcomes: {
          course_group: courseGroup.trim(),
          target_audience: targetAudience.trim(),
          target_need: targetNeed.trim(),
        },
        certificate_title: certificateTitle.trim() || `Chứng chỉ hoàn thành: ${title.trim()}`,
        short_description: shortDescription.trim(),
        full_description: fullDescription.trim(),
        image_url: imageUrl.trim() || "assets/images/course_banner_clean.png",
        is_featured: isFeatured,
        is_active: isActive,
      };

      if (isCreate) {
        await adminApi("courses/create", { values: payload });
      } else {
        await adminApi("courses/update", {
          key: { id: row.id },
          values: payload,
          expectedUpdatedAt: row.updated_at,
        });
      }

      onSaved();
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi lưu thông tin khóa học.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] bg-[#FCFBF9]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#E8DFD8] flex items-center justify-between bg-white shrink-0">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-[#B38A58]">
            MLD Spa & Clinic · Học viện & Đào tạo
          </p>
          <h2 className="text-lg font-bold text-[#2C241E] flex items-center gap-2 mt-0.5">
            {isCreate ? (
              <>
                <Sparkles size={18} className="text-[#B38A58]" />
                Thêm mới khóa học
              </>
            ) : isView ? (
              <>
                <GraduationCap size={18} className="text-[#059669]" />
                Hồ sơ khóa học: {title || code}
              </>
            ) : (
              <>
                <Pencil size={18} className="text-[#B38A58]" />
                Chỉnh sửa khóa học: {title || code}
              </>
            )}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#766554] hover:bg-[#FAF8F5] hover:text-[#2C241E] transition-colors"
          title="Đóng"
        >
          <X size={18} />
        </button>
      </header>

      {/* Body Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Thông tin cơ bản & Phân loại */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F4EFEA] pb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
              <BookOpen size={15} className="text-[#B38A58]" />
              Thông tin khóa học & Phân loại
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Tiêu đề khóa học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Dẫn lưu bạch huyết Vodder chuẩn Y khoa Level 1"
                disabled={isView}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] font-medium focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#2C241E]">
                  Mã khóa học <span className="text-red-500">*</span>
                </label>
                {title.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const slug = title
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[đĐ]/g, "d")
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "")
                        .toUpperCase();
                      setCode(slug.substring(0, 20) || "MLD-K01");
                      setCodeManuallyEdited(true);
                    }}
                    className="text-[10px] text-[#985018] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    title="Tạo mã viết tắt từ tiêu đề khóa học"
                  >
                    <Sparkles size={11} />
                    Tạo mã từ tên
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Ví dụ: MLD-K01, VODDER-BASIC..."
                disabled={isView}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeManuallyEdited(true);
                }}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] font-mono focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Danh mục đào tạo <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isView || loadingLookups}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              >
                <option value="">-- Chọn danh mục đào tạo --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Giảng viên phụ trách chính
              </label>
              <select
                disabled={isView || loadingLookups}
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              >
                <option value="">-- Chọn giảng viên (Không bắt buộc) --</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Trình độ chuyên môn <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isView}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              >
                <option value="">-- Chọn trình độ chuyên môn --</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#2C241E] flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#B38A58]" />
                  <span>Ảnh bìa khóa học</span>
                  <span className="text-red-500">*</span>
                </label>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A4F23] hover:text-[#6E3C17] bg-[#FAF5EF] hover:bg-[#F3EAE0] border border-[#E8DFD8] px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-[#8A4F23]" />
                        <span>Đang tải ảnh lên...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>Tải ảnh từ máy lên</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Input URL / Path */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ví dụ: assets/images/course_banner_clean.png hoặc URL ảnh..."
                    disabled={isView || uploadingImage}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                    required
                  />
                </div>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-3.5 py-2.5 bg-[#FAF5EF] hover:bg-[#F3EAE0] border border-[#E8DFD8] text-[#8A4F23] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Chọn tệp ảnh từ máy tính"
                  >
                    <Upload size={14} />
                    <span className="hidden sm:inline">Chọn tệp</span>
                  </button>
                )}
              </div>

              {/* Banner Preview Card */}
              {imageUrl && (
                <div className="border border-[#E8DFD8] bg-[#FAF8F5] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="relative w-full sm:w-44 h-24 rounded-lg overflow-hidden bg-[#EAE2D9] border border-[#E0D5CA] flex-shrink-0 group">
                    <img
                      src={imageUrl}
                      alt="Ảnh bìa khóa học"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23F4EFEA'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239E8E81'%3EẢnh không tải được%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check size={11} />
                        Ảnh bìa khóa học
                      </span>
                      {uploadingImage && (
                        <span className="text-[11px] text-[#B38A58] animate-pulse">
                          Đang tải lên Supabase Storage...
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#73675F] truncate font-mono">
                      {imageUrl}
                    </p>
                    {!isView && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="text-xs text-[#8A4F23] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload size={12} />
                          Đổi ảnh khác
                        </button>
                        <span className="text-[#D3C7BD]">•</span>
                        {(imageUrl.startsWith("http") || imageUrl.startsWith("blob:")) && (
                          <>
                            <a
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#73675F] hover:text-[#2C241E] hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} />
                              Xem ảnh gốc
                            </a>
                            <span className="text-[#D3C7BD]">•</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          disabled={uploadingImage}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          Gỡ ảnh
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Khối lượng đào tạo & Thời lượng */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F4EFEA] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
                <Clock size={15} className="text-[#B38A58]" />
                Khối lượng đào tạo & Số giờ học
              </h3>
            </div>
            <span className="text-xs font-bold text-[#059669] bg-[#EBF7EE] px-2.5 py-1 rounded-full border border-[#CDEED5]">
              Tổng: {Number(totalHours) || 0} giờ học ({Number(totalLessons) || 0} buổi)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Giờ lý thuyết
              </label>
              <input
                type="number"
                min="0"
                disabled={isView}
                placeholder="0"
                value={theoryHours}
                onChange={(e) => handleTheoryChange(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Giờ thực hành
              </label>
              <input
                type="number"
                min="0"
                disabled={isView}
                placeholder="0"
                value={practiceHours}
                onChange={(e) => handlePracticeChange(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Tổng giờ (Tự tính)
              </label>
              <input
                type="number"
                min="0"
                disabled={isView}
                placeholder="0"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg font-bold text-[#985018] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Tổng số buổi / bài
              </label>
              <input
                type="number"
                min="0"
                disabled={isView}
                placeholder="0"
                value={totalLessons}
                onChange={(e) => setTotalLessons(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Học phí & Đặt cọc */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F4EFEA] pb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
              <BadgeDollarSign size={15} className="text-[#B38A58]" />
              Học phí & Đặt cọc giữ chỗ
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#2C241E]">
                  Học phí niêm yết (VNĐ) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-bold text-[#985018]">
                  {Number(tuitionFee || 0).toLocaleString("vi-VN")} đ
                </span>
              </div>
              <input
                type="number"
                step="500000"
                min="0"
                disabled={isView}
                placeholder="0"
                value={tuitionFee}
                onChange={(e) => setTuitionFee(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] font-medium focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#2C241E]">
                  Tiền cọc giữ chỗ (VNĐ)
                </label>
                <span className="text-xs font-bold text-[#059669]">
                  {Number(depositAmount || 0).toLocaleString("vi-VN")} đ
                </span>
              </div>
              <input
                type="number"
                step="500000"
                min="0"
                disabled={isView}
                placeholder="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] font-medium focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />

              {!isView && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-[#766554] self-center mr-1">Tính cọc nhanh:</span>
                  {[
                    { label: "0đ", p: 0 },
                    { label: "15%", p: 15 },
                    { label: "20%", p: 20 },
                    { label: "30%", p: 30 },
                    { label: "50%", p: 50 },
                  ].map((btn) => (
                    <button
                      type="button"
                      key={btn.label}
                      onClick={() => handleDepositPercent(btn.p)}
                      className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#E8DFD8] text-[#554536] hover:border-[#B38A58] hover:text-[#985018] transition-colors"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Định hướng đào tạo & Chuẩn đầu ra */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F4EFEA] pb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
              <Target size={15} className="text-[#B38A58]" />
              Định hướng đào tạo & Chuẩn đầu ra
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Nhóm khóa học
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Chuyên sâu / Cơ bản nghề..."
                disabled={isView}
                value={courseGroup}
                onChange={(e) => setCourseGroup(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
              {!isView && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COURSE_GROUP_SUGGESTIONS.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setCourseGroup(g)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        courseGroup === g
                          ? "bg-[#FAF3EA] text-[#985018] border-[#B38A58] font-semibold"
                          : "bg-white text-[#766554] border-[#E8DFD8] hover:border-[#B38A58]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Đối tượng học viên phù hợp
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Kỹ thuật viên, Y bác sĩ..."
                disabled={isView}
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
              {!isView && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {TARGET_AUDIENCE_SUGGESTIONS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setTargetAudience(a)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        targetAudience === a
                          ? "bg-[#FAF3EA] text-[#985018] border-[#B38A58] font-semibold"
                          : "bg-white text-[#766554] border-[#E8DFD8] hover:border-[#B38A58]"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Nhu cầu mục tiêu / Chuẩn đầu ra
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Nâng cao tay nghề và chăm sóc hệ bạch huyết chuyên sâu..."
                disabled={isView}
                value={targetNeed}
                onChange={(e) => setTargetNeed(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
              {!isView && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {TARGET_NEED_SUGGESTIONS.map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setTargetNeed(n)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        targetNeed === n
                          ? "bg-[#FAF3EA] text-[#985018] border-[#B38A58] font-semibold"
                          : "bg-white text-[#766554] border-[#E8DFD8] hover:border-[#B38A58]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Tên chứng chỉ cấp khi tốt nghiệp
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Chứng chỉ hoàn thành chương trình MLD Vodder Level 1"
                disabled={isView}
                value={certificateTitle}
                onChange={(e) => {
                  setCertificateTitle(e.target.value);
                  setCertificateManuallyEdited(true);
                }}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Mô tả & Trạng thái */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F4EFEA] pb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
              5
            </div>
            <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
              <Award size={15} className="text-[#B38A58]" />
              Nội dung mô tả & Trạng thái hiển thị
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Mô tả ngắn (Hiển thị trên thẻ khóa học App / Web) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Nhập mô tả ngắn gọn tóm tắt điểm nổi bật của khóa học..."
                disabled={isView}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Mô tả chi tiết / Lộ trình học <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Chi tiết giáo trình, quyền lợi học viên, cam kết đào tạo..."
                disabled={isView}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5]"
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-[#F4EFEA]">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isView}
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8DFD8] text-[#B38A58] focus:ring-[#B38A58]"
                />
                <span className="text-xs font-semibold text-[#2C241E]">
                  Khóa học nổi bật (Hiển thị trang chủ)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isView}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8DFD8] text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs font-semibold text-[#2C241E]">
                  Đang mở tuyển sinh (Kích hoạt)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="pt-3 border-t border-[#E8DFD8] flex items-center justify-end gap-3 sticky bottom-0 bg-[#FCFBF9]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-[#E8DFD8] text-xs font-semibold text-[#766554] bg-white hover:bg-[#FAF8F5] transition-colors"
          >
            Đóng
          </button>
          {isView ? (
            <button
              type="button"
              onClick={() => onSwitchMode && onSwitchMode("update", row)}
              className="px-4 py-2 rounded-lg bg-[#B38A58] text-xs font-bold text-white hover:bg-[#967143] transition-colors flex items-center gap-1.5"
            >
              <Pencil size={14} />
              Chỉnh sửa khóa học
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-lg bg-[#B38A58] text-xs font-bold text-white hover:bg-[#967143] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              {isCreate ? "Tạo khóa học mới" : "Lưu thay đổi"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
};
