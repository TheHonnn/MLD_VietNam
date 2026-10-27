import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Video,
  FileText,
  Save,
  Pencil,
  X,
  LoaderCircle,
  AlertCircle,
  Plus,
  CheckCircle2,
  GraduationCap,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
  Paperclip,
  Check,
  Play,
  Layers,
  Eye,
  ListOrdered,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface LessonEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}

interface AttachmentItem {
  name: string;
  url: string;
}

// Safely parse JSON/array helpers
function parseArrayField<T>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

// Extract YouTube embed URL
function extractYouTubeEmbedUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export const LessonEditorSheet: React.FC<LessonEditorSheetProps> = ({
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

  // 1. Lookups data
  const [courses, setCourses] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // 2. Cascading selections
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>(row.chapter_id || "");

  // 3. Existing lessons in the active chapter (for roadmap context and auto order)
  const [existingLessons, setExistingLessons] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // 4. Form state (clean, no dummy pre-filled templates!)
  const [lessonOrder, setLessonOrder] = useState<number>(
    row.lesson_order !== undefined && row.lesson_order !== null ? Number(row.lesson_order) : 1
  );
  const [title, setTitle] = useState<string>(row.title || "");
  const [lessonType, setLessonType] = useState<string>(row.lesson_type || "VIDEO");
  const [durationMinutes, setDurationMinutes] = useState<number>(
    row.duration_minutes !== undefined && row.duration_minutes !== null ? Number(row.duration_minutes) : 18
  );
  const [videoUrl, setVideoUrl] = useState<string>(row.video_url || "");
  const [contentText, setContentText] = useState<string>(row.content_text || "");
  const [isFreePreview, setIsFreePreview] = useState<boolean>(Boolean(row.is_free_preview));

  // 5. Goals & Attachments
  const [learningGoals, setLearningGoals] = useState<string[]>(() =>
    parseArrayField<string>(row.learning_goals)
  );
  const [newGoalInput, setNewGoalInput] = useState<string>("");

  const [attachments, setAttachments] = useState<AttachmentItem[]>(() =>
    parseArrayField<AttachmentItem>(row.attachments)
  );
  const [newAttachName, setNewAttachName] = useState<string>("");
  const [newAttachUrl, setNewAttachUrl] = useState<string>("");

  // 6. UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveAndAddMore, setSaveAndAddMore] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // A. Load all courses and chapters on mount
  useEffect(() => {
    let mounted = true;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [cRes, chRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/courses?select=id,title,code,is_active&order=title.asc`,
            { headers: getSupabaseHeaders() }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/course_chapters?select=id,course_id,chapter_order,title&order=chapter_order.asc`,
            { headers: getSupabaseHeaders() }
          ),
        ]);

        const [cData, chData] = await Promise.all([cRes.json(), chRes.json()]);

        if (!mounted) return;

        const loadedCourses = Array.isArray(cData) ? cData : [];
        const loadedChapters = Array.isArray(chData) ? chData : [];

        setCourses(loadedCourses);
        setChapters(loadedChapters);

        // Identify initial course & chapter
        let initialChapterId = row.chapter_id || "";
        let initialCourseId = "";

        if (initialChapterId) {
          const matchChapter = loadedChapters.find((ch) => ch.id === initialChapterId);
          if (matchChapter) {
            initialCourseId = matchChapter.course_id;
          }
        }

        // If not found, default to first active course and its first chapter
        if (!initialCourseId && loadedCourses.length > 0) {
          const firstCourse = loadedCourses.find((c) => c.is_active) || loadedCourses[0];
          initialCourseId = firstCourse.id;
          const firstChapter = loadedChapters.find((ch) => ch.course_id === initialCourseId);
          if (firstChapter) {
            initialChapterId = firstChapter.id;
          }
        }

        setSelectedCourseId(initialCourseId);
        setChapterId(initialChapterId);
      } catch (err) {
        console.warn("Lỗi tải thông tin khóa học/chương học:", err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    fetchLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter chapters by selected course
  const filteredChapters = useMemo(() => {
    if (!selectedCourseId) return [];
    return chapters.filter((ch) => ch.course_id === selectedCourseId);
  }, [chapters, selectedCourseId]);

  // Selected course and chapter objects
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const selectedChapter = useMemo(() => {
    return chapters.find((ch) => ch.id === chapterId);
  }, [chapters, chapterId]);

  // When selectedCourseId changes, auto-select first chapter of that course if current chapter doesn't belong to it
  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    const related = chapters.filter((ch) => ch.course_id === newCourseId);
    if (related.length > 0) {
      setChapterId(related[0].id);
    } else {
      setChapterId("");
    }
  };

  // B. Fetch existing lessons when chapterId changes
  useEffect(() => {
    if (!chapterId) {
      setExistingLessons([]);
      return;
    }

    let mounted = true;
    const fetchLessons = async () => {
      setLoadingLessons(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/course_lessons?chapter_id=eq.${encodeURIComponent(
            chapterId
          )}&select=id,chapter_id,lesson_order,title,lesson_type,duration_minutes&order=lesson_order.asc`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setExistingLessons(data);

          // If creating new lesson, auto-calculate next logical order
          if (isCreate && (!row.lesson_order || row.lesson_order === 1)) {
            const maxOrder = data.reduce(
              (max, l) => Math.max(max, Number(l.lesson_order) || 0),
              0
            );
            setLessonOrder(maxOrder + 1);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh sách bài học:", err);
      } finally {
        if (mounted) setLoadingLessons(false);
      }
    };

    fetchLessons();
    return () => {
      mounted = false;
    };
  }, [chapterId]);

  // YouTube / Video detection
  const embedUrl = useMemo(() => extractYouTubeEmbedUrl(videoUrl), [videoUrl]);
  const isDirectVideo = useMemo(() => {
    if (!videoUrl) return false;
    const clean = videoUrl.trim().toLowerCase();
    return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg");
  }, [videoUrl]);

  // Quick prefix helper (without dummy templates - dynamically formats what user types)
  const handleApplyPrefix = (prefixType: "lesson" | "practice" | "theory" | "quiz") => {
    const clean = title
      .replace(/^(Bài\s*\d+:\s*|Thực hành:\s*|Lý thuyết:\s*|Trắc nghiệm:\s*)/i, "")
      .trim();

    if (prefixType === "lesson") {
      setTitle(`Bài ${lessonOrder}: ${clean}`);
    } else if (prefixType === "practice") {
      setTitle(`Thực hành: ${clean}`);
    } else if (prefixType === "theory") {
      setTitle(`Lý thuyết: ${clean}`);
    } else if (prefixType === "quiz") {
      setTitle(`Trắc nghiệm: ${clean}`);
    }
  };

  // Order change helper
  const handleSetOrder = (newOrder: number) => {
    const valid = Math.max(1, newOrder);
    setLessonOrder(valid);
    // If title already starts with "Bài X:", update to new number
    if (/^Bài\s*\d+:/i.test(title)) {
      const rest = title.replace(/^Bài\s*\d+:\s*/i, "");
      setTitle(`Bài ${valid}: ${rest}`);
    }
  };

  // Learning goals helpers
  const handleAddGoal = () => {
    const trimmed = newGoalInput.trim();
    if (!trimmed) return;
    if (!learningGoals.includes(trimmed)) {
      setLearningGoals([...learningGoals, trimmed]);
    }
    setNewGoalInput("");
  };

  const handleRemoveGoal = (index: number) => {
    setLearningGoals(learningGoals.filter((_, i) => i !== index));
  };

  // Attachments helpers
  const handleAddAttachment = () => {
    const name = newAttachName.trim();
    const url = newAttachUrl.trim();
    if (!name || !url) return;
    setAttachments([...attachments, { name, url }]);
    setNewAttachName("");
    setNewAttachUrl("");
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, andAddMore = false) => {
    e.preventDefault();
    setError("");
    setSuccessBanner(null);

    if (!chapterId) {
      setError("Vui lòng chọn Chương học cho bài giảng.");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập Tiêu đề bài học.");
      return;
    }
    if (lessonOrder < 1) {
      setError("Thứ tự bài học phải lớn hơn hoặc bằng 1.");
      return;
    }

    setBusy(true);
    setSaveAndAddMore(andAddMore);

    try {
      const payload: Record<string, any> = {
        chapter_id: chapterId,
        lesson_order: Number(lessonOrder),
        title: title.trim(),
        lesson_type: lessonType,
        duration_minutes: Number(durationMinutes) || 0,
        video_url: videoUrl.trim() || null,
        content_text: contentText.trim() || null,
        attachments: attachments,
        learning_goals: learningGoals,
        is_free_preview: Boolean(isFreePreview),
      };

      if (isCreate) {
        await adminApi("course_lessons/create", { values: payload });
      } else {
        const key = { id: row.id };
        await adminApi("course_lessons/update", { key, values: payload });
      }

      onSaved();

      if (isCreate && andAddMore) {
        // Add to existing lessons list locally for immediate feedback
        setExistingLessons((prev) =>
          [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              chapter_id: chapterId,
              lesson_order: lessonOrder,
              title: title.trim(),
              lesson_type: lessonType,
              duration_minutes: durationMinutes,
            },
          ].sort((a, b) => a.lesson_order - b.lesson_order)
        );

        setSuccessBanner(
          `✓ Đã lưu thành công "${title.trim()}". Sẵn sàng nhập bài tiếp theo!`
        );

        // Advance to next lesson cleanly (keep course & chapter selected, NO dummy templates!)
        const nextOrder = Number(lessonOrder) + 1;
        setLessonOrder(nextOrder);
        setTitle("");
        setVideoUrl("");
        setContentText("");
        setLearningGoals([]);
        setAttachments([]);
        setIsFreePreview(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi lưu bài học. Vui lòng kiểm tra lại thông tin.");
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
              MLD Academy · Giáo trình đào tạo & Bài giảng
            </span>
            <span className="text-xs text-[#7F6E60]">
              {isCreate ? "Tạo bài học mới" : isView ? "Xem chi tiết" : "Chỉnh sửa bài học"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#2C241E] mt-1">
            {isCreate
              ? "Thêm mới bài học vào chương trình đào tạo"
              : isView
              ? `Bài ${lessonOrder}: ${title || "Chi tiết bài học"}`
              : `Cập nhật bài ${lessonOrder}: ${title || "Bài học"}`}
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

      {/* 2. Scrollable Body */}
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

        {/* SECTION 1: KHÓA HỌC -> CHƯƠNG HỌC -> THỨ TỰ BÀI */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">1. Phân loại Khóa học & Vị trí bài giảng</h3>
              <p className="text-xs text-[#7F6E60]">Chọn khóa học, chương học và vị trí hiển thị bài học trong giáo trình</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Khóa học */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Khóa học áp dụng <span className="text-[#DC2626]">*</span>
              </label>
              {loadingLookups ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải khóa học...
                </div>
              ) : (
                <select
                  disabled={isView}
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">-- Chọn khóa đào tạo --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ""}{c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Chương học */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Chương học <span className="text-[#DC2626]">*</span>
              </label>
              {loadingLookups ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải chương...
                </div>
              ) : (
                <select
                  required
                  disabled={isView || filteredChapters.length === 0}
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">
                    {filteredChapters.length === 0
                      ? "-- Khóa học này chưa có chương --"
                      : "-- Chọn chương học --"}
                  </option>
                  {filteredChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Chương {ch.chapter_order}: {ch.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Thứ tự bài học */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Thứ tự bài học <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-center gap-2">
                {!isView && (
                  <button
                    type="button"
                    onClick={() => handleSetOrder(lessonOrder - 1)}
                    disabled={lessonOrder <= 1}
                    className="w-9 h-9 rounded-lg bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] font-bold text-sm hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                    title="Giảm thứ tự"
                  >
                    -
                  </button>
                )}
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  disabled={isView}
                  value={lessonOrder}
                  onChange={(e) => handleSetOrder(Number(e.target.value) || 1)}
                  className="flex-1 text-center font-bold text-sm px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white text-[#985018] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
                {!isView && (
                  <button
                    type="button"
                    onClick={() => handleSetOrder(lessonOrder + 1)}
                    className="w-9 h-9 rounded-lg bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] font-bold text-sm hover:bg-[#F3E2CE] cursor-pointer transition-colors shrink-0"
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
                        lessonOrder === n
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

          {/* Sơ đồ bài học hiện có trong chương */}
          {chapterId && (
            <div className="pt-2 border-t border-[#F0EAE4]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#4A3E31] flex items-center gap-1.5">
                  <ListOrdered size={13} className="text-[#985018]" />
                  Các bài học đã có trong chương này ({existingLessons.length} bài):
                </span>
                {selectedChapter && (
                  <span className="text-[11px] text-[#7F6E60]">
                    Chương {selectedChapter.chapter_order}: {selectedChapter.title}
                  </span>
                )}
              </div>

              {loadingLessons ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải danh sách bài học...
                </div>
              ) : existingLessons.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-[#FAF0E4]/30 border border-[#E8DFD8] text-[11px] text-[#7F6E60]">
                  Chương này chưa có bài học nào. Bài này sẽ là <strong>Bài #1 khởi đầu</strong>! 🎉
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {existingLessons.map((l) => {
                    const isCurrent = !isCreate && l.id === row.id;
                    return (
                      <span
                        key={l.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border ${
                          isCurrent
                            ? "bg-[#985018] text-white border-[#985018] font-bold"
                            : "bg-[#FDFBF7] text-[#4A3E31] border-[#E8DFD8]"
                        }`}
                      >
                        <span className="font-bold">#{l.lesson_order}</span>
                        <span className="max-w-[140px] truncate">{l.title}</span>
                        <span className="text-[10px] opacity-75">({l.duration_minutes || 0}')</span>
                      </span>
                    );
                  })}
                  {isCreate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-[#FAF0E4] text-[#985018] border border-dashed border-[#985018] font-bold">
                      👉 #{lessonOrder} {title ? `(${title})` : "(Bài mới đang soạn)"}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: ĐỊNH DẠNG BÀI HỌC & TIÊU ĐỀ */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">2. Định dạng & Tiêu đề bài học</h3>
              <p className="text-xs text-[#7F6E60]">Chọn hình thức giảng dạy và đặt tên rõ ràng cho bài học</p>
            </div>
          </div>

          {/* Lesson Type segmented picker */}
          <div>
            <label className="block text-xs font-bold text-[#4A3E31] mb-2">
              Hình thức bài giảng <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                {
                  id: "VIDEO",
                  label: "Video bài giảng",
                  icon: Video,
                  desc: "Video lý thuyết / thực hành",
                },
                {
                  id: "READING_DOC",
                  label: "Tài liệu chuyên môn",
                  icon: FileText,
                  desc: "Giáo trình & bài đọc",
                },
                {
                  id: "PRACTICE_GUIDE",
                  label: "Hướng dẫn thực hành",
                  icon: GraduationCap,
                  desc: "Thao tác lâm sàng MLD",
                },
                {
                  id: "QUIZ",
                  label: "Trắc nghiệm ôn tập",
                  icon: Sparkles,
                  desc: "Đánh giá kiến thức bài học",
                },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = lessonType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isView}
                    onClick={() => setLessonType(item.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#FAF0E4] border-[#985018] text-[#985018] ring-1 ring-[#985018] shadow-xs"
                        : "bg-white border-[#E8DFD8] text-[#4A3E31] hover:bg-[#FAF0E4]/40"
                    } disabled:opacity-75 disabled:cursor-default`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <IconComponent size={18} className={isSelected ? "text-[#985018]" : "text-[#7F6E60]"} />
                      {isSelected && <Check size={14} className="text-[#985018]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-[#7F6E60] mt-0.5">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tiêu đề bài học */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A3E31]">
                Tiêu đề bài học <span className="text-[#DC2626]">*</span>
              </label>
              {!isView && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#7F6E60]">
                  <span>Gắn tiền tố nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPrefix("lesson")}
                    className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                  >
                    Bài {lessonOrder}:
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPrefix("theory")}
                    className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                  >
                    Lý thuyết:
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPrefix("practice")}
                    className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                  >
                    Thực hành:
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              required
              disabled={isView}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên bài học (VD: Bài 1: Kỹ thuật dẫn lưu hệ bạch huyết vùng cổ vai gáy)"
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
            />
          </div>

          {/* Thời lượng & Học thử miễn phí */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#4A3E31] flex items-center gap-1.5">
                  <Clock size={13} className="text-[#985018]" />
                  Thời lượng bài học (Phút)
                </label>
                {!isView && (
                  <div className="flex gap-1">
                    {[15, 20, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(m)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                          durationMinutes === m
                            ? "bg-[#985018] text-white border-[#985018]"
                            : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                        }`}
                      >
                        {m}'
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                min="0"
                max="600"
                disabled={isView}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
              />
            </div>

            {/* Toggle Cho phép học thử */}
            <div className="flex flex-col justify-end">
              <label
                className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${
                  isFreePreview
                    ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                    : "bg-[#FDFBF7] border-[#E8DFD8] text-[#4A3E31]"
                } ${isView ? "" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  <Eye size={16} className={isFreePreview ? "text-[#059669]" : "text-[#7F6E60]"} />
                  <div>
                    <div className="text-xs font-bold">Cho phép học thử miễn phí</div>
                    <div className="text-[10px] text-[#7F6E60]">
                      Học viên chưa đăng ký khóa học vẫn có thể xem bài này
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={isView}
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  className="w-4 h-4 text-[#059669] rounded border-gray-300 focus:ring-[#059669] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: LIÊN KẾT VIDEO & XEM TRƯỚC TRỰC TIẾP */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <Video size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">3. Video bài giảng & Trình phát kiểm tra</h3>
                <p className="text-xs text-[#7F6E60]">Dán liên kết YouTube hoặc video bài giảng để học viên xem trên ứng dụng</p>
              </div>
            </div>

            {embedUrl && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                <CheckCircle2 size={13} className="text-[#059669]" />
                Đã nhận diện video YouTube
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3E31] mb-1">
              Liên kết video (URL)
            </label>
            <div className="relative">
              <input
                type="url"
                disabled={isView}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/... hoặc link video trực tiếp .mp4"
                className="w-full text-xs pl-3.5 pr-20 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
              />
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-[#985018] hover:text-[#7F3E10] px-2 py-1 rounded hover:bg-[#FAF0E4]"
                  title="Mở liên kết trong tab mới"
                >
                  <ExternalLink size={12} />
                  Mở link
                </a>
              )}
            </div>
            <p className="text-[11px] text-[#7F6E60] mt-1">
              Hỗ trợ đầy đủ liên kết YouTube (dạng chuẩn, rút gọn youtu.be, shorts) và video định dạng MP4/WebM.
            </p>
          </div>

          {/* Video Player Preview */}
          {embedUrl ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#4A3E31]">
                <span className="flex items-center gap-1.5">
                  <Play size={13} className="text-[#985018]" />
                  Xem trước trình phát video bài giảng:
                </span>
                <span className="text-[11px] text-[#7F6E60]">Tỉ lệ 16:9 chuẩn HD</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#E8DFD8] bg-black aspect-video relative shadow-xs">
                <iframe
                  src={embedUrl}
                  title="Xem trước video bài học"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          ) : isDirectVideo ? (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#4A3E31] flex items-center gap-1.5">
                <Play size={13} className="text-[#985018]" />
                Xem trước video trực tiếp:
              </div>
              <div className="rounded-xl overflow-hidden border border-[#E8DFD8] bg-black aspect-video relative shadow-xs">
                <video src={videoUrl} controls className="w-full h-full" />
              </div>
            </div>
          ) : videoUrl.trim() ? (
            <div className="p-3 rounded-lg bg-[#FAF0E4]/50 border border-[#E8DFD8] text-xs text-[#7F6E60] flex items-center gap-2">
              <AlertCircle size={15} className="text-[#985018] shrink-0" />
              <span>
                Không thể hiển thị trình phát xem trước trực tiếp từ liên kết này. Vui lòng kiểm tra lại link hoặc bấm "Mở link" ở trên để xem thử.
              </span>
            </div>
          ) : null}
        </div>

        {/* SECTION 4: NỘI DUNG CHI TIẾT & HƯỚNG DẪN */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">4. Nội dung bài giảng & Ghi chú thực hành</h3>
              <p className="text-xs text-[#7F6E60]">Nội dung giáo trình văn bản, lưu ý lâm sàng hoặc bài đọc bổ trợ</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A3E31]">
                Nội dung chi tiết (Tùy chọn)
              </label>
              {!isView && (
                <span className="text-[11px] text-[#7F6E60]">
                  {contentText.length} ký tự
                </span>
              )}
            </div>
            <textarea
              rows={4}
              disabled={isView}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Nhập tóm tắt lý thuyết, các bước thao tác thực hành lâm sàng, hoặc lưu ý kỹ thuật cho học viên..."
              className="w-full text-xs p-3 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
            />
          </div>
        </div>

        {/* SECTION 5: MỤC TIÊU BÀI HỌC (LEARNING GOALS) */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">5. Mục tiêu đạt được sau bài học</h3>
                <p className="text-xs text-[#7F6E60]">Liệt kê các kỹ năng / kiến thức học viên sẽ làm chủ sau khi hoàn thành</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              {learningGoals.length} mục tiêu
            </span>
          </div>

          {/* Add Goal Input */}
          {!isView && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddGoal();
                  }
                }}
                placeholder="Nhập một mục tiêu bài học rồi nhấn Thêm (hoặc Enter)..."
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                disabled={!newGoalInput.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-40 transition-colors shrink-0"
              >
                <Plus size={14} />
                Thêm mục tiêu
              </button>
            </div>
          )}

          {/* Goals List */}
          {learningGoals.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#FAF0E4]/30 border border-[#E8DFD8] text-[11px] text-[#7F6E60] text-center">
              Chưa có mục tiêu nào được thêm. Bạn có thể thêm mục tiêu kiến thức ở trên để học viên theo dõi tiến độ.
            </div>
          ) : (
            <div className="space-y-1.5">
              {learningGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FDFBF7] border border-[#E8DFD8] text-xs text-[#4A3E31]"
                >
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#059669] shrink-0" />
                    <span>{goal}</span>
                  </div>
                  {!isView && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(idx)}
                      className="p-1 rounded text-[#7F6E60] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                      title="Xóa mục tiêu này"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 6: TÀI LIỆU ĐÍNH KÈM (ATTACHMENTS) */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <Paperclip size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">6. Tài liệu & File đính kèm</h3>
                <p className="text-xs text-[#7F6E60]">Tài liệu PDF, sơ đồ huyệt đạo, slide bài giảng cho học viên tải về</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              {attachments.length} tệp
            </span>
          </div>

          {/* Add Attachment Inputs */}
          {!isView && (
            <div className="p-3 rounded-lg bg-[#FAF0E4]/40 border border-[#E8DFD8] space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newAttachName}
                  onChange={(e) => setNewAttachName(e.target.value)}
                  placeholder="Tên tệp (VD: Giao_trinh_MLD_Chuyen_sau.pdf)"
                  className="text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                />
                <input
                  type="url"
                  value={newAttachUrl}
                  onChange={(e) => setNewAttachUrl(e.target.value)}
                  placeholder="Đường dẫn tải về (URL)"
                  className="text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  disabled={!newAttachName.trim() || !newAttachUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-40 transition-colors"
                >
                  <Plus size={14} />
                  Thêm tệp đính kèm
                </button>
              </div>
            </div>
          )}

          {/* Attachments List */}
          {attachments.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#FAF0E4]/30 border border-[#E8DFD8] text-[11px] text-[#7F6E60] text-center">
              Chưa có tệp đính kèm nào cho bài học này.
            </div>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FDFBF7] border border-[#E8DFD8] text-xs text-[#4A3E31]"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} className="text-[#985018] shrink-0" />
                    <span className="font-medium">{att.name}</span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#985018] hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      (Mở xem <ExternalLink size={11} />)
                    </a>
                  </div>
                  {!isView && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1 rounded text-[#7F6E60] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                      title="Xóa tệp đính kèm này"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* 3. Footer */}
      <footer className="px-6 py-3.5 bg-white border-t border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div className="text-xs text-[#7F6E60] truncate max-w-[45%]">
          {selectedChapter ? (
            <span>
              Chương: <strong className="text-[#2C241E]">{selectedChapter.title}</strong> · Vị trí: <strong className="text-[#985018]">Bài #{lessonOrder}</strong>
            </span>
          ) : (
            "Vui lòng chọn chương học đào tạo"
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
              title="Lưu bài này và tiếp tục nhập bài tiếp theo trong cùng chương"
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
                  {isCreate ? "Lưu bài học" : "Lưu thay đổi"}
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
