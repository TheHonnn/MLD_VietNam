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
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  HelpCircle,
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

  // 3. Existing lessons in active chapter (for roadmap context and auto order)
  const [existingLessons, setExistingLessons] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // 4. Quizzes lookup for selected course (when lesson_type is QUIZ)
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");

  // 5. Form state
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

  // Optional video toggle for reading doc
  const [showOptionalVideo, setShowOptionalVideo] = useState<boolean>(Boolean(row.video_url));

  // 6. Goals & Attachments
  const [learningGoals, setLearningGoals] = useState<string[]>(() =>
    parseArrayField<string>(row.learning_goals)
  );
  const [newGoalInput, setNewGoalInput] = useState<string>("");

  const [attachments, setAttachments] = useState<AttachmentItem[]>(() =>
    parseArrayField<AttachmentItem>(row.attachments)
  );
  const [newAttachName, setNewAttachName] = useState<string>("");
  const [newAttachUrl, setNewAttachUrl] = useState<string>("");

  // 7. UI state
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

  // When selectedCourseId changes, fetch quizzes and update chapter
  useEffect(() => {
    if (!selectedCourseId) {
      setQuizzes([]);
      return;
    }
    let mounted = true;
    const fetchQuizzes = async () => {
      setLoadingQuizzes(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/course_quizzes?course_id=eq.${encodeURIComponent(
            selectedCourseId
          )}&select=id,course_id,title,total_questions,time_limit_minutes,passing_score&order=created_at.desc`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setQuizzes(data);
        }
      } catch (err) {
        console.warn("Lỗi tải danh sách đề thi trắc nghiệm:", err);
      } finally {
        if (mounted) setLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
    return () => {
      mounted = false;
    };
  }, [selectedCourseId]);

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

  // Handle switching lesson type and automatically adapting defaults
  const handleLessonTypeChange = (newType: string) => {
    if (isView) return;
    setLessonType(newType);

    // Adapt default duration based on type if still at a default number
    if (newType === "VIDEO") {
      if (durationMinutes === 10 || durationMinutes === 45 || durationMinutes === 15) {
        setDurationMinutes(18);
      }
    } else if (newType === "READING_DOC") {
      if (durationMinutes === 18 || durationMinutes === 45 || durationMinutes === 15) {
        setDurationMinutes(10);
      }
    } else if (newType === "PRACTICE_GUIDE") {
      if (durationMinutes === 18 || durationMinutes === 10 || durationMinutes === 15) {
        setDurationMinutes(45);
      }
    } else if (newType === "QUIZ") {
      if (durationMinutes === 18 || durationMinutes === 45 || durationMinutes === 10) {
        setDurationMinutes(15);
      }
    }
  };

  // YouTube / Video detection
  const embedUrl = useMemo(() => extractYouTubeEmbedUrl(videoUrl), [videoUrl]);
  const isDirectVideo = useMemo(() => {
    if (!videoUrl) return false;
    const clean = videoUrl.trim().toLowerCase();
    return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg");
  }, [videoUrl]);

  // Adaptive prefix options based on active lessonType
  const prefixOptions = useMemo(() => {
    if (lessonType === "VIDEO") {
      return [
        { label: `Bài ${lessonOrder}:`, prefix: `Bài ${lessonOrder}: ` },
        { label: "Video:", prefix: "Video: " },
        { label: "Lý thuyết:", prefix: "Lý thuyết: " },
      ];
    } else if (lessonType === "READING_DOC") {
      return [
        { label: `Bài ${lessonOrder}:`, prefix: `Bài ${lessonOrder}: ` },
        { label: "Tài liệu:", prefix: "Tài liệu: " },
        { label: "Giáo trình:", prefix: "Giáo trình: " },
        { label: "Chuyên đề:", prefix: "Chuyên đề: " },
      ];
    } else if (lessonType === "PRACTICE_GUIDE") {
      return [
        { label: `Bài ${lessonOrder}:`, prefix: `Bài ${lessonOrder}: ` },
        { label: "Thực hành:", prefix: "Thực hành: " },
        { label: "Quy trình:", prefix: "Quy trình: " },
        { label: "Thao tác:", prefix: "Thao tác: " },
      ];
    } else {
      // QUIZ
      return [
        { label: `Bài ${lessonOrder}:`, prefix: `Bài ${lessonOrder}: ` },
        { label: "Trắc nghiệm:", prefix: "Trắc nghiệm: " },
        { label: "Kiểm tra:", prefix: "Kiểm tra: " },
        { label: "Đánh giá:", prefix: "Đánh giá: " },
      ];
    }
  }, [lessonType, lessonOrder]);

  const handleApplyPrefix = (prefix: string) => {
    const clean = title
      .replace(
        /^(Bài\s*\d+:\s*|Video:\s*|Lý thuyết:\s*|Tài liệu:\s*|Giáo trình:\s*|Chuyên đề:\s*|Thực hành:\s*|Quy trình:\s*|Thao tác:\s*|Trắc nghiệm:\s*|Kiểm tra:\s*|Đánh giá:\s*)/i,
        ""
      )
      .trim();
    setTitle(`${prefix}${clean}`);
  };

  // Adaptive Duration metadata
  const durationMeta = useMemo(() => {
    if (lessonType === "VIDEO") {
      return {
        label: "Thời lượng video bài giảng (Phút)",
        chips: [10, 15, 18, 20, 30, 45],
      };
    } else if (lessonType === "READING_DOC") {
      return {
        label: "Thời gian đọc tài liệu dự kiến (Phút)",
        chips: [5, 10, 15, 20, 30],
      };
    } else if (lessonType === "PRACTICE_GUIDE") {
      return {
        label: "Thời lượng buổi thực hành lâm sàng (Phút)",
        chips: [30, 45, 60, 90, 120],
      };
    } else {
      return {
        label: "Thời gian làm bài thi trắc nghiệm (Phút)",
        chips: [10, 15, 20, 30, 45],
      };
    }
  }, [lessonType]);

  // Order change helper
  const handleSetOrder = (newOrder: number) => {
    const valid = Math.max(1, newOrder);
    setLessonOrder(valid);
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

  // Quiz selection sync
  const handleSelectQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    const q = quizzes.find((x) => x.id === quizId);
    if (q) {
      if (!title.trim() || title.startsWith("Bài")) {
        setTitle(`Bài ${lessonOrder}: Trắc nghiệm - ${q.title}`);
      }
      if (q.time_limit_minutes) {
        setDurationMinutes(Number(q.time_limit_minutes));
      }
      if (!contentText.trim()) {
        setContentText(
          `Đề thi: ${q.title}\nSố câu hỏi: ${q.total_questions} câu\nThời gian: ${q.time_limit_minutes} phút\nĐiểm đạt chuẩn: ${q.passing_score}/10`
        );
      }
    }
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
        video_url: lessonType === "QUIZ" ? null : videoUrl.trim() || null,
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
        // Add to existing lessons list locally
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

        // Advance to next lesson cleanly (keep course & chapter selected)
        const nextOrder = Number(lessonOrder) + 1;
        setLessonOrder(nextOrder);
        setTitle("");
        setVideoUrl("");
        setContentText("");
        setLearningGoals([]);
        setAttachments([]);
        setIsFreePreview(false);
        setSelectedQuizId("");
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
                    const typeIcon =
                      l.lesson_type === "QUIZ"
                        ? "📝"
                        : l.lesson_type === "PRACTICE_GUIDE"
                        ? "🩺"
                        : l.lesson_type === "READING_DOC"
                        ? "📄"
                        : "🎬";
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
                        <span>{typeIcon}</span>
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

        {/* SECTION 2: ĐỊNH DẠNG BÀI HỌC (ADAPTIVE TYPE PICKER) */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">2. Định dạng & Tiêu đề bài học</h3>
              <p className="text-xs text-[#7F6E60]">Lựa chọn hình thức bài giảng — Toàn bộ biểu mẫu bên dưới sẽ thích ứng theo định dạng đã chọn</p>
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
                  badgeColor: "text-[#985018] bg-[#FAF0E4] border-[#985018]",
                },
                {
                  id: "READING_DOC",
                  label: "Tài liệu chuyên môn",
                  icon: FileText,
                  desc: "Giáo trình & bài đọc PDF",
                  badgeColor: "text-[#1E40AF] bg-[#EFF6FF] border-[#3B82F6]",
                },
                {
                  id: "PRACTICE_GUIDE",
                  label: "Hướng dẫn thực hành",
                  icon: GraduationCap,
                  desc: "Thao tác lâm sàng MLD",
                  badgeColor: "text-[#065F46] bg-[#ECFDF5] border-[#10B981]",
                },
                {
                  id: "QUIZ",
                  label: "Trắc nghiệm ôn tập",
                  icon: Sparkles,
                  desc: "Đánh giá kiến thức bài học",
                  badgeColor: "text-[#6B21A8] bg-[#FAF5FF] border-[#A855F7]",
                },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = lessonType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isView}
                    onClick={() => handleLessonTypeChange(item.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? `${item.badgeColor} ring-2 ring-offset-1 ring-current font-bold shadow-xs`
                        : "bg-white border-[#E8DFD8] text-[#4A3E31] hover:bg-[#FAF0E4]/40"
                    } disabled:opacity-75 disabled:cursor-default`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <IconComponent size={20} className={isSelected ? "currentColor" : "text-[#7F6E60]"} />
                      {isSelected && <Check size={16} className="currentColor stroke-[2.5]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                      <div className="text-[10px] opacity-80 mt-1">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ADAPTIVE CONTEXT BANNER - Informs user how form adapts */}
            <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
              lessonType === "VIDEO"
                ? "bg-[#FAF0E4] border-[#E8DFD8] text-[#985018]"
                : lessonType === "READING_DOC"
                ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]"
                : lessonType === "PRACTICE_GUIDE"
                ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                : "bg-[#FAF5FF] border-[#E9D5FF] text-[#6B21A8]"
            }`}>
              <div className="p-1 rounded-md bg-white/70 shrink-0">
                {lessonType === "VIDEO" && <Video size={16} />}
                {lessonType === "READING_DOC" && <FileText size={16} />}
                {lessonType === "PRACTICE_GUIDE" && <GraduationCap size={16} />}
                {lessonType === "QUIZ" && <Sparkles size={16} />}
              </div>
              <div className="flex-1">
                {lessonType === "VIDEO" && (
                  <span>
                    <strong>Chế độ Video bài giảng:</strong> Biểu mẫu được cấu hình cho bài học xem qua video (YouTube/MP4). Bạn có thể dán link và phát kiểm tra trực tiếp.
                  </span>
                )}
                {lessonType === "READING_DOC" && (
                  <span>
                    <strong>Chế độ Tài liệu chuyên môn:</strong> Biểu mẫu tối ưu cho tài liệu đọc, giáo trình và file PDF tải về. Trình phát video được ẩn để tránh gây rối mắt.
                  </span>
                )}
                {lessonType === "PRACTICE_GUIDE" && (
                  <span>
                    <strong>Chế độ Hướng dẫn thực hành:</strong> Biểu mẫu tập trung vào quy trình các bước thao tác lâm sàng, tiêu chuẩn lực ép 30-40 mmHg và video động tác mẫu.
                  </span>
                )}
                {lessonType === "QUIZ" && (
                  <span>
                    <strong>Chế độ Trắc nghiệm ôn tập:</strong> Biểu mẫu được tối ưu để liên kết đề thi trắc nghiệm từ ngân hàng đề của khóa học. Trình phát video được loại bỏ hoàn toàn.
                  </span>
                )}
              </div>
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
                  {prefixOptions.map((opt) => (
                    <button
                      key={opt.prefix}
                      type="button"
                      onClick={() => handleApplyPrefix(opt.prefix)}
                      className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              required
              disabled={isView}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                lessonType === "VIDEO"
                  ? "Nhập tên bài giảng video (VD: Kỹ thuật dẫn lưu hệ bạch huyết vùng cổ vai gáy)"
                  : lessonType === "READING_DOC"
                  ? "Nhập tên tài liệu (VD: Giáo trình giải phẫu hệ tuần hoàn bạch huyết và hạch nông)"
                  : lessonType === "PRACTICE_GUIDE"
                  ? "Nhập tên bài thực hành (VD: Thực hành quy trình ép xả hạch nách và cánh tay)"
                  : "Nhập tên bài kiểm tra (VD: Bài trắc nghiệm đánh giá kiến thức cơ chế MLD)"
              }
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
            />
          </div>

          {/* Thời lượng & Học thử miễn phí */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#4A3E31] flex items-center gap-1.5">
                  <Clock size={13} className="text-[#985018]" />
                  {durationMeta.label}
                </label>
                {!isView && (
                  <div className="flex gap-1">
                    {durationMeta.chips.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(m)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
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
                      Học viên chưa ghi danh vẫn có thể xem được nội dung bài này
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

        {/* ------------------------------------------------------------- */}
        {/* DYNAMIC SECTION 3: ADAPTS ENTIRELY BASED ON LESSON TYPE */}
        {/* ------------------------------------------------------------- */}

        {/* CASE A: VIDEO BÀI GIẢNG */}
        {lessonType === "VIDEO" && (
          <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                  <Video size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">3. Video bài giảng & Trình phát kiểm tra</h3>
                  <p className="text-xs text-[#7F6E60]">Dán liên kết video bài giảng để học viên xem trên ứng dụng</p>
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
                Liên kết video bài giảng (URL)
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
                  Không thể hiển thị trình phát xem trước từ liên kết này. Vui lòng kiểm tra lại link hoặc bấm "Mở link" ở trên.
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* CASE B: TÀI LIỆU CHUYÊN MÔN (READING_DOC) - TÀI LIỆU ĐƯỢC ĐƯA LÊN TRỌNG TÂM */}
        {lessonType === "READING_DOC" && (
          <div className="bg-white rounded-xl border border-[#BFDBFE] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DBEAFE]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center font-bold">
                  <Paperclip size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E40AF]">3. Tệp tài liệu chuyên môn & Giáo trình đính kèm (Trọng tâm)</h3>
                  <p className="text-xs text-[#6B7280]">Đính kèm tệp PDF, Slide hoặc đường dẫn tài liệu cho học viên tải về đọc</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                {attachments.length} tệp tài liệu
              </span>
            </div>

            {/* Add Attachment Inputs */}
            {!isView && (
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newAttachName}
                    onChange={(e) => setNewAttachName(e.target.value)}
                    placeholder="Tên tài liệu (VD: Giao_trinh_Huyet_Dao_MLD.pdf)"
                    className="text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="url"
                    value={newAttachUrl}
                    onChange={(e) => setNewAttachUrl(e.target.value)}
                    placeholder="Đường dẫn xem / tải về (URL PDF)"
                    className="text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    disabled={!newAttachName.trim() || !newAttachUrl.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE] cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Plus size={14} />
                    Thêm tệp tài liệu
                  </button>
                </div>
              </div>
            )}

            {/* Attachments List */}
            {attachments.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] text-center">
                Chưa có tệp tài liệu nào được đính kèm. Bạn có thể thêm link tệp PDF hoặc giáo trình ở trên để học viên tải về.
              </div>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1E293B]"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-[#2563EB] shrink-0" />
                      <span className="font-semibold">{att.name}</span>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline flex items-center gap-0.5 text-[11px]"
                      >
                        (Mở tài liệu <ExternalLink size={11} />)
                      </a>
                    </div>
                    {!isView && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                        title="Xóa tệp này"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Optional video accordion for reading doc */}
            <div className="pt-2 border-t border-[#DBEAFE]">
              <button
                type="button"
                onClick={() => setShowOptionalVideo(!showOptionalVideo)}
                className="text-xs font-semibold text-[#1E40AF] hover:text-[#1D4ED8] inline-flex items-center gap-1 cursor-pointer"
              >
                {showOptionalVideo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showOptionalVideo ? "Thu gọn video tham khảo bổ trợ" : "+ Thêm video tham khảo bổ trợ (Nếu có)"}
              </button>

              {showOptionalVideo && (
                <div className="mt-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <label className="block text-xs font-bold text-[#475569]">
                    Liên kết video bổ trợ (Tùy chọn)
                  </label>
                  <input
                    type="url"
                    disabled={isView}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... hoặc link video tham khảo"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                  {embedUrl && (
                    <div className="rounded-lg overflow-hidden border border-[#E2E8F0] bg-black aspect-video relative max-w-sm mt-2">
                      <iframe
                        src={embedUrl}
                        title="Xem trước video bài đọc"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASE C: HƯỚNG DẪN THỰC HÀNH (PRACTICE_GUIDE) - TRỌNG TÂM QUY TRÌNH LÂM SÀNG */}
        {lessonType === "PRACTICE_GUIDE" && (
          <div className="bg-white rounded-xl border border-[#A7F3D0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1FAE5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#065F46] flex items-center justify-center font-bold">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#065F46]">3. Quy trình các bước thực hành lâm sàng (Trọng tâm)</h3>
                  <p className="text-xs text-[#6B7280]">Phác đồ kỹ thuật MLD: các bước thao tác, lực ép 30-40 mmHg và chiều vuốt dẫn lưu</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#065F46]">
                  Mô tả quy trình thao tác kỹ thuật <span className="text-[#DC2626]">*</span>
                </label>
                {!isView && (
                  <span className="text-[11px] text-[#6B7280]">
                    {contentText.length} ký tự
                  </span>
                )}
              </div>
              <textarea
                rows={6}
                disabled={isView}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder={`Nhập phác đồ thực hành lâm sàng chi tiết:
- Bước 1: Khởi động và thông hạch vùng cổ (Lực ép 30-40 mmHg, nhịp điệu chậm rãi)
- Bước 2: Thao tác xoay tròn tĩnh tại vùng hạch dưới hàm và sau tai
- Bước 3: Động tác bơm xả nhẹ nhàng, tuyệt đối không gây trượt rít da...`}
                className="w-full text-xs p-3 rounded-lg border border-[#A7F3D0] bg-white focus:outline-none focus:border-[#059669] disabled:bg-[#F3EFEA]"
              />
            </div>

            {/* Video minh họa động tác */}
            <div className="pt-2 border-t border-[#D1FAE5] space-y-2">
              <label className="block text-xs font-bold text-[#065F46]">
                Video minh họa động tác mẫu (Tùy chọn)
              </label>
              <div className="relative">
                <input
                  type="url"
                  disabled={isView}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Dán link video ngắn hướng dẫn thao tác mẫu (YouTube hoặc MP4)"
                  className="w-full text-xs pl-3 py-2 rounded-lg border border-[#A7F3D0] bg-white focus:outline-none focus:border-[#059669]"
                />
              </div>
              {embedUrl && (
                <div className="rounded-lg overflow-hidden border border-[#A7F3D0] bg-black aspect-video relative max-w-sm mt-2">
                  <iframe
                    src={embedUrl}
                    title="Xem trước video thực hành"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASE D: TRẮC NGHIỆM ÔN TẬP (QUIZ) - HOÀN TOÀN ẨN VIDEO & LIÊN KẾT ĐỀ THI */}
        {lessonType === "QUIZ" && (
          <div className="bg-white rounded-xl border border-[#E9D5FF] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3E8FF]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] text-[#6B21A8] flex items-center justify-center font-bold">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#6B21A8]">3. Thiết lập bài thi trắc nghiệm & Ngân hàng đề thi (Trọng tâm)</h3>
                  <p className="text-xs text-[#6B7280]">Liên kết bài học với đề thi trắc nghiệm đã tạo cho khóa học</p>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]">
                {quizzes.length} đề thi sẵn có
              </span>
            </div>

            {/* Chọn đề thi từ course_quizzes */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Chọn bài thi trắc nghiệm liên kết
              </label>
              {loadingQuizzes ? (
                <div className="text-xs text-[#6B7280] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#6B21A8]" />
                  Đang tải danh sách đề thi trắc nghiệm...
                </div>
              ) : quizzes.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#FAF5FF] border border-[#E9D5FF] text-xs text-[#6B21A8]">
                  Khóa học này chưa có bài trắc nghiệm nào trong ngân hàng đề. Bạn có thể nhập hướng dẫn làm bài bên dưới hoặc tạo đề thi mới tại mục <strong>"Trắc nghiệm khóa học"</strong>.
                </div>
              ) : (
                <select
                  disabled={isView}
                  value={selectedQuizId}
                  onChange={(e) => handleSelectQuiz(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-[#E9D5FF] bg-white focus:outline-none focus:border-[#7C3AED] disabled:bg-[#F3EFEA]"
                >
                  <option value="">-- Chọn đề thi trắc nghiệm liên kết --</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.total_questions || 20} câu hỏi · {q.time_limit_minutes || 30} phút · Điểm đạt: {q.passing_score || 8.0}/10)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Card tóm tắt đề thi đã chọn */}
            {selectedQuizId && (
              (() => {
                const q = quizzes.find((x) => x.id === selectedQuizId);
                if (!q) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-[#FAF5FF] border border-[#E9D5FF] text-xs text-[#581C87] space-y-2">
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      <ClipboardCheck size={16} className="text-[#7C3AED]" />
                      Đề thi: {q.title}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="p-2 bg-white rounded-lg border border-[#E9D5FF] text-center">
                        <span className="text-[#6B7280] block">Số câu hỏi:</span>
                        <strong className="text-sm text-[#7C3AED]">{q.total_questions || 20} câu</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-[#E9D5FF] text-center">
                        <span className="text-[#6B7280] block">Thời gian thi:</span>
                        <strong className="text-sm text-[#7C3AED]">{q.time_limit_minutes || 30} phút</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-[#E9D5FF] text-center">
                        <span className="text-[#6B7280] block">Điểm đạt chuẩn:</span>
                        <strong className="text-sm text-[#7C3AED]">{q.passing_score || 8.0}/10</strong>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DYNAMIC SECTION 4: NỘI DUNG VĂN BẢN / HƯỚNG DẪN */}
        {/* (Only shown for VIDEO, READING_DOC, and QUIZ; PRACTICE_GUIDE has it in Section 3) */}
        {/* ------------------------------------------------------------- */}
        {lessonType !== "PRACTICE_GUIDE" && (
          <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  {lessonType === "READING_DOC"
                    ? "4. Toàn văn nội dung giáo trình & Bài đọc chi tiết"
                    : lessonType === "QUIZ"
                    ? "4. Quy chế thi & Hướng dẫn làm bài cho học viên"
                    : "4. Tóm tắt nội dung bài học & Ghi chú"}
                </h3>
                <p className="text-xs text-[#7F6E60]">
                  {lessonType === "READING_DOC"
                    ? "Soạn thảo hoặc dán nội dung giáo trình lý thuyết cho học viên đọc trực tiếp"
                    : lessonType === "QUIZ"
                    ? "Số lần thi lại cho phép, lưu ý thời gian tự động nộp bài và điều kiện hoàn thành"
                    : "Ghi chú các điểm trọng tâm, timestamps hoặc hướng dẫn học viên"}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#4A3E31]">
                  {lessonType === "READING_DOC"
                    ? "Nội dung bài đọc (Văn bản)"
                    : lessonType === "QUIZ"
                    ? "Hướng dẫn làm bài thi"
                    : "Nội dung ghi chú (Tùy chọn)"}
                </label>
                {!isView && (
                  <span className="text-[11px] text-[#7F6E60]">
                    {contentText.length} ký tự
                  </span>
                )}
              </div>
              <textarea
                rows={lessonType === "READING_DOC" ? 8 : 4}
                disabled={isView}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder={
                  lessonType === "READING_DOC"
                    ? "Nhập toàn bộ nội dung bài đọc, giáo trình lý thuyết hoặc tài liệu chuyên khảo tại đây..."
                    : lessonType === "QUIZ"
                    ? "Nhập hướng dẫn làm bài thi (VD: Bài thi gồm 20 câu hỏi trắc nghiệm, thời gian 30 phút. Học viên cần đạt từ 8/10 điểm để được cấp chứng nhận hoàn thành chương)..."
                    : "Nhập tóm tắt các điểm chính trong video bài giảng hoặc ghi chú quan trọng..."
                }
                className="w-full text-xs p-3 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DYNAMIC SECTION 5: MỤC TIÊU / TIÊU CHUẨN ĐÁNH GIÁ */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  {lessonType === "PRACTICE_GUIDE"
                    ? "5. Tiêu chuẩn đánh giá kỹ thuật (Checklist đạt yêu cầu)"
                    : lessonType === "QUIZ"
                    ? "5. Kiến thức trọng tâm được kiểm tra"
                    : "5. Mục tiêu đạt được sau bài học"}
                </h3>
                <p className="text-xs text-[#7F6E60]">
                  {lessonType === "PRACTICE_GUIDE"
                    ? "Các tiêu chí giảng viên/học viên dùng để nghiệm thu kỹ năng thực hành"
                    : "Liệt kê các kỹ năng / kiến thức học viên sẽ làm chủ sau khi hoàn thành"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              {learningGoals.length} mục
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
                placeholder={
                  lessonType === "PRACTICE_GUIDE"
                    ? "Nhập một tiêu chuẩn kỹ thuật (VD: Đứng đúng tư thế, Đúng lực ép 30-40 mmHg) rồi nhấn Thêm..."
                    : "Nhập một mục tiêu bài học rồi nhấn Thêm (hoặc Enter)..."
                }
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                disabled={!newGoalInput.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-40 transition-colors shrink-0"
              >
                <Plus size={14} />
                Thêm
              </button>
            </div>
          )}

          {/* Goals List */}
          {learningGoals.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#FAF0E4]/30 border border-[#E8DFD8] text-[11px] text-[#7F6E60] text-center">
              Chưa có mục tiêu nào được thêm. Bạn có thể nhập từng mục tiêu ở trên để học viên theo dõi tiến độ.
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
                      title="Xóa mục này"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* DYNAMIC SECTION 6: TÀI LIỆU ĐÍNH KÈM */}
        {/* (Shown for VIDEO, PRACTICE_GUIDE, QUIZ; for READING_DOC it was Section 3) */}
        {/* ------------------------------------------------------------- */}
        {lessonType !== "READING_DOC" && (
          <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                  <Paperclip size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    {lessonType === "PRACTICE_GUIDE"
                      ? "6. Sơ đồ giải phẫu & Bảng kiểm đính kèm"
                      : lessonType === "QUIZ"
                      ? "6. Đề cương ôn tập & Tài liệu tham khảo đính kèm"
                      : "6. Tài liệu & File đính kèm"}
                  </h3>
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
        )}
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
