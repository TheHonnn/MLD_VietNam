import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Layers,
  Save,
  Pencil,
  X,
  LoaderCircle,
  AlertCircle,
  Plus,
  CheckCircle2,
  ListOrdered,
  FileText,
  ChevronRight,
  GraduationCap,
  Info,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface ChapterEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}


export const ChapterEditorSheet: React.FC<ChapterEditorSheetProps> = ({
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

  // Lookups data
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Form State
  const [courseId, setCourseId] = useState<string>(row.course_id || "");
  const [chapterOrder, setChapterOrder] = useState<number>(
    row.chapter_order !== undefined && row.chapter_order !== null ? Number(row.chapter_order) : 1
  );
  const [title, setTitle] = useState<string>(row.title || "");
  const [description, setDescription] = useState<string>(row.description || "");

  // Existing chapters in the selected course
  const [existingChapters, setExistingChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveAndAddMore, setSaveAndAddMore] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // 1. Fetch Courses list
  useEffect(() => {
    let mounted = true;
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/courses?select=id,title,code,level,total_hours,total_lessons,is_active&order=title.asc`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setCourses(data);
          // If creating and no course specified yet, default to first active course
          if (isCreate && !row.course_id && data.length > 0) {
            const first = data.find((c) => c.is_active) || data[0];
            setCourseId(first.id);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh sách khóa học:", err);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    };

    fetchCourses();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch existing chapters whenever courseId changes
  useEffect(() => {
    if (!courseId) {
      setExistingChapters([]);
      return;
    }
    let mounted = true;
    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/course_chapters?course_id=eq.${encodeURIComponent(courseId)}&select=id,chapter_order,title,description&order=chapter_order.asc`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setExistingChapters(data);

          // If creating, auto-calculate the next logical chapter_order
          if (isCreate && (!row.chapter_order || row.chapter_order === 1)) {
            const maxOrder = data.reduce((max, c) => Math.max(max, Number(c.chapter_order) || 0), 0);
            const nextOrder = maxOrder + 1;
            setChapterOrder(nextOrder);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh sách chương học của khóa:", err);
      } finally {
        if (mounted) setLoadingChapters(false);
      }
    };

    fetchChapters();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  // Selected Course Object
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === courseId);
  }, [courses, courseId]);

  // Quick Prefix Appender
  const handleApplyPrefix = (prefixType: "chapter" | "topic" | "theory" | "practical") => {
    let clean = title.replace(/^(Chương\s*\d+:\s*|Chuyên đề:\s*|Lý thuyết:\s*|Thực hành:\s*)/i, "").trim();
    if (prefixType === "chapter") {
      setTitle(`Chương ${chapterOrder}: ${clean}`);
    } else if (prefixType === "topic") {
      setTitle(`Chuyên đề: ${clean}`);
    } else if (prefixType === "theory") {
      setTitle(`Lý thuyết: ${clean}`);
    } else if (prefixType === "practical") {
      setTitle(`Thực hành: ${clean}`);
    }
  };


  // Handle Quick Order Change
  const handleSetOrder = (newOrder: number) => {
    const valid = Math.max(1, newOrder);
    setChapterOrder(valid);
    // If title has "Chương X:", update to new number
    if (/^Chương\s*\d+:/i.test(title)) {
      const rest = title.replace(/^Chương\s*\d+:\s*/i, "");
      setTitle(`Chương ${valid}: ${rest}`);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, andAddMore = false) => {
    e.preventDefault();
    setError("");
    setSuccessBanner(null);

    if (!courseId) {
      setError("Vui lòng chọn Khóa học.");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập Tiêu đề chương học.");
      return;
    }
    if (chapterOrder < 1) {
      setError("Thứ tự chương học phải lớn hơn hoặc bằng 1.");
      return;
    }

    setBusy(true);
    setSaveAndAddMore(andAddMore);

    try {
      const payload: Record<string, any> = {
        course_id: courseId,
        chapter_order: Number(chapterOrder),
        title: title.trim(),
        description: description.trim() || null,
      };

      if (isCreate) {
        await adminApi("course_chapters/create", { values: payload });
      } else {
        const key = { id: row.id };
        await adminApi("course_chapters/update", { key, values: payload });
      }

      onSaved();

      if (isCreate && andAddMore) {
        // Refresh chapter list
        setExistingChapters((prev) => [
          ...prev,
          { id: `temp-${Date.now()}`, chapter_order: chapterOrder, title: title.trim() },
        ].sort((a, b) => a.chapter_order - b.chapter_order));

        setSuccessBanner(`✓ Đã lưu thành công "${title.trim()}". Sẵn sàng nhập chương tiếp theo!`);
        // Prepare next chapter immediately
        const nextOrder = Number(chapterOrder) + 1;
        setChapterOrder(nextOrder);
        setTitle(`Chương ${nextOrder}: `);
        setDescription("");
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi lưu chương học. Vui lòng thử lại.");
    } finally {
      setBusy(false);
      setSaveAndAddMore(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-[#FDFBF7] text-[#2C241E] rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Header */}
      <header className="px-6 py-4 bg-white border-b border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              <BookOpen size={13} />
              Học viện MLD · Khung chương trình đào tạo
            </span>
            <span className="text-xs text-[#7F6E60]">
              {isCreate ? "Tạo chương mới" : isView ? "Xem chi tiết" : "Chỉnh sửa"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#2C241E] mt-1">
            {isCreate
              ? "Thêm mới chương học vào khóa đào tạo"
              : isView
              ? `Chương ${chapterOrder}: ${title || "Chi tiết chương"}`
              : `Cập nhật chương ${chapterOrder}: ${title || "Chương học"}`}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isView && onSwitchMode && (
            <button
              type="button"
              onClick={() => onSwitchMode("update", row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer transition-colors"
            >
              <Pencil size={13} />
              Chỉnh sửa
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7F6E60] hover:text-[#2C241E] hover:bg-[#FAF0E4] cursor-pointer transition-colors"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 2. Body Scrollable */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successBanner && (
          <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} className="text-[#059669]" />
              <span>{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-[#065F46] hover:text-[#047857] text-xs font-bold"
            >
              Đóng
            </button>
          </div>
        )}

        {/* SECTION 1: KHÓA HỌC & THỨ TỰ CHƯƠNG */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <GraduationCap size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">1. Khóa học & Vị trí chương</h3>
              <p className="text-xs text-[#7F6E60]">Lựa chọn khóa học chuyên môn và thiết lập số thứ tự trong giáo trình</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Khóa học */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Khóa học áp dụng <span className="text-[#DC2626]">*</span>
              </label>
              {loadingCourses ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải danh sách khóa học...
                </div>
              ) : (
                <select
                  required
                  disabled={isView}
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">-- Chọn khóa học đào tạo --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ""}{c.title} {c.level ? `(${c.level})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {selectedCourse && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#FAF0E4]/60 border border-[#E8DFD8] text-[11px] text-[#4A3E31] flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <strong>Mã khóa:</strong> {selectedCourse.code || "—"}
                  </span>
                  <span>
                    <strong>Thời lượng:</strong> {selectedCourse.total_hours || 0} giờ ({selectedCourse.total_lessons || 0} buổi)
                  </span>
                  <span>
                    <strong>Số chương hiện có:</strong>{" "}
                    <strong className="text-[#985018]">{existingChapters.length}</strong> chương
                  </span>
                </div>
              )}
            </div>

            {/* Thứ tự chương */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Thứ tự chương học <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-center gap-2">
                {!isView && (
                  <button
                    type="button"
                    onClick={() => handleSetOrder(chapterOrder - 1)}
                    disabled={chapterOrder <= 1}
                    className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] font-bold text-sm hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                    title="Giảm thứ tự"
                  >
                    -
                  </button>
                )}
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  disabled={isView}
                  value={chapterOrder}
                  onChange={(e) => handleSetOrder(Number(e.target.value) || 1)}
                  className="flex-1 text-center font-bold text-sm px-3 py-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#985018] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
                {!isView && (
                  <button
                    type="button"
                    onClick={() => handleSetOrder(chapterOrder + 1)}
                    className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] font-bold text-sm hover:bg-[#F3E2CE] cursor-pointer transition-colors shrink-0"
                    title="Tăng thứ tự"
                  >
                    +
                  </button>
                )}
              </div>

              {!isView && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSetOrder(n)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        chapterOrder === n
                          ? "bg-[#985018] text-white border-[#985018]"
                          : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                      }`}
                    >
                      #{n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: TIÊU ĐỀ CHƯƠNG HỌC */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">2. Tiêu đề chương học</h3>
                <p className="text-xs text-[#7F6E60]">Tên chương hiển thị trên lộ trình học viên và chứng chỉ</p>
              </div>
            </div>

            {!isView && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#7F6E60]">Gắn tiền tố nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPrefix("chapter")}
                  className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                >
                  Chương {chapterOrder}:
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPrefix("topic")}
                  className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                >
                  Chuyên đề:
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPrefix("practical")}
                  className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                >
                  Thực hành:
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3E31] mb-1">
              Tiêu đề chương <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isView}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ví dụ: Chương ${chapterOrder}: Tên chương học...`}
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
            />
          </div>
        </div>

        {/* SECTION 3: MÔ TẢ & MỤC TIÊU BÀI HỌC */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">3. Mô tả chi tiết & Mục tiêu chương</h3>
              <p className="text-xs text-[#7F6E60]">Tóm tắt nội dung trọng tâm và kết quả học viên đạt được sau chương</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A3E31]">
                Nội dung mô tả (Tùy chọn)
              </label>
              {!isView && (
                <span className="text-[11px] text-[#7F6E60]">
                  {description.length} ký tự
                </span>
              )}
            </div>
            <textarea
              rows={3}
              disabled={isView}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả tóm tắt về nội dung học tập, tài liệu lý thuyết và bài thực hành trong chương này..."
              className="w-full text-xs p-3 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
            />
          </div>

        </div>

        {/* SECTION 4: SƠ ĐỒ LỘ TRÌNH KHÓA HỌC HIỆN TẠI */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <ListOrdered size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">4. Sơ đồ khung chương trình hiện tại</h3>
                <p className="text-xs text-[#7F6E60]">Vị trí của chương học trong toàn bộ giáo trình</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              {existingChapters.length} chương đã tạo
            </span>
          </div>

          {loadingChapters ? (
            <div className="text-xs text-[#7F6E60] py-4 text-center flex items-center justify-center gap-2">
              <LoaderCircle size={14} className="animate-spin text-[#985018]" />
              Đang tải lộ trình chương học...
            </div>
          ) : existingChapters.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#FAF0E4]/40 border border-[#E8DFD8] text-center text-xs text-[#7F6E60]">
              Khóa học này chưa có chương học nào. Chương này sẽ là <strong>Chương 1 khởi đầu</strong>! 🎉
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {existingChapters.map((ch) => {
                const isCurrent = !isCreate && ch.id === row.id;
                return (
                  <div
                    key={ch.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? "bg-[#FAF0E4] border-[#985018] text-[#985018] font-bold shadow-xs"
                        : "bg-[#FDFBF7] border-[#E8DFD8] text-[#4A3E31]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        isCurrent ? "bg-[#985018] text-white" : "bg-[#E8DFD8] text-[#4A3E31]"
                      }`}>
                        {ch.chapter_order}
                      </span>
                      <span className="font-semibold">{ch.title}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#985018] border border-[#E8DFD8]">
                          Đang sửa
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {isCreate && (
                <div className="p-2.5 rounded-lg border-2 border-dashed border-[#985018] bg-[#FAF0E4]/40 text-xs flex items-center gap-2.5 text-[#985018] font-bold">
                  <span className="w-6 h-6 rounded-md bg-[#985018] text-white flex items-center justify-center text-xs">
                    {chapterOrder}
                  </span>
                  <span>👉 {title || "Chương mới đang soạn thảo..."}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* 3. Footer */}
      <footer className="px-6 py-3.5 bg-white border-t border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div className="text-xs text-[#7F6E60]">
          {selectedCourse ? (
            <span>
              Khóa: <strong className="text-[#2C241E]">{selectedCourse.title}</strong> · Vị trí: <strong className="text-[#985018]">#{chapterOrder}</strong>
            </span>
          ) : (
            "Vui lòng chọn khóa học đào tạo"
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E8DFD8] text-[#4A3E31] hover:bg-[#FAF0E4] cursor-pointer transition-colors"
          >
            {isView ? "Đóng" : "Hủy bỏ"}
          </button>

          {!isView && isCreate && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-50 transition-colors"
              title="Lưu chương này và tiếp tục nhập chương tiếp theo"
            >
              {busy && saveAndAddMore ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Lưu & Thêm tiếp (+)
                </>
              )}
            </button>
          )}

          {!isView && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-[#985018] text-white hover:bg-[#7F3E10] shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              {busy && !saveAndAddMore ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isCreate ? "Lưu chương học" : "Lưu thay đổi"}
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
