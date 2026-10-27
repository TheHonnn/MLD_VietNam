import React, { useState, useEffect, useMemo } from "react";
import {
  ListChecks,
  Plus,
  Save,
  Pencil,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Trash2,
  Layers,
  Sparkles,
  ArrowRight,
  Calculator,
  Percent,
  Check,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface QuizEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}

interface QuizQuestionItem {
  id?: string;
  quiz_id?: string;
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string;
}

// Quick presets for clean selection (no pre-filled text or dummy titles!)
const PRESET_QUESTION_COUNTS = [10, 15, 20, 25, 30, 40];
const PRESET_DURATIONS = [15, 20, 30, 45, 60, 90];
const PRESET_PASSING_SCORES = [
  { score: 7.0, label: "7.0 (Khá)" },
  { score: 8.0, label: "8.0 (Chuẩn MLD)" },
  { score: 8.5, label: "8.5 (Giỏi)" },
  { score: 9.0, label: "9.0 (Xuất sắc)" },
];

export const QuizEditorSheet: React.FC<QuizEditorSheetProps> = ({
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

  // Active Tab
  const [activeTab, setActiveTab] = useState<"settings" | "questions">(
    isCreate ? "settings" : "settings"
  );

  // Lookups data (courses)
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Form State (Clean inputs, NO pre-filled dummy templates!)
  const [courseId, setCourseId] = useState<string>(row.course_id || "");
  const [title, setTitle] = useState<string>(row.title || "");
  const [totalQuestions, setTotalQuestions] = useState<number>(
    row.total_questions !== undefined && row.total_questions !== null
      ? Number(row.total_questions)
      : 20
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(
    row.time_limit_minutes !== undefined && row.time_limit_minutes !== null
      ? Number(row.time_limit_minutes)
      : 30
  );
  const [passingScore, setPassingScore] = useState<number>(
    row.passing_score !== undefined && row.passing_score !== null
      ? Number(row.passing_score)
      : 8.0
  );

  // Questions Bank State
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string>(row.id || "");

  // Inline Question Form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qNumber, setQNumber] = useState<number>(1);
  const [qText, setQText] = useState<string>("");
  const [optA, setOptA] = useState<string>("");
  const [optB, setOptB] = useState<string>("");
  const [optC, setOptC] = useState<string>("");
  const [optD, setOptD] = useState<string>("");
  const [correctOption, setCorrectOption] = useState<string>("A");
  const [explanation, setExplanation] = useState<string>("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // Submit / UI State
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // 1. Fetch courses lookup
  useEffect(() => {
    let mounted = true;
    const fetchCourses = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/courses?select=id,title,code,level&order=title.asc`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setCourses(data);
          // Auto select if row has course_id or only 1 course exists
          if (!courseId && data.length > 0) {
            setCourseId(data[0].id);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh mục khóa học:", err);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    };

    fetchCourses();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch existing questions if quiz exists
  const fetchQuestions = async (quizIdToFetch: string) => {
    if (!quizIdToFetch) return;
    setLoadingQuestions(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/quiz_questions?quiz_id=eq.${encodeURIComponent(
          quizIdToFetch
        )}&select=*&order=question_number.asc`,
        { headers: getSupabaseHeaders() }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        const parsedQuestions: QuizQuestionItem[] = data.map((q: any) => {
          let opts: Record<string, string> = { A: "", B: "", C: "", D: "" };
          if (q.options) {
            if (typeof q.options === "object" && !Array.isArray(q.options)) {
              opts = { ...opts, ...q.options };
            } else if (Array.isArray(q.options)) {
              opts.A = q.options[0] || "";
              opts.B = q.options[1] || "";
              opts.C = q.options[2] || "";
              opts.D = q.options[3] || "";
            }
          }
          return {
            id: q.id,
            quiz_id: q.quiz_id,
            question_number: Number(q.question_number) || 1,
            question_text: q.question_text || "",
            options: opts,
            correct_option: q.correct_option || "A",
            explanation: q.explanation || "",
          };
        });
        setQuestions(parsedQuestions);
      }
    } catch (err) {
      console.warn("Lỗi tải câu hỏi trắc nghiệm:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (currentQuizId) {
      fetchQuestions(currentQuizId);
    }
  }, [currentQuizId]);

  // Selected course object
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === courseId);
  }, [courses, courseId]);

  // Calculated Real-Time Metrics
  const metrics = useMemo(() => {
    const totalQ = Math.max(1, Number(totalQuestions) || 1);
    const timeMins = Math.max(1, Number(timeLimitMinutes) || 1);
    const passScore = Math.min(10, Math.max(0, Number(passingScore) || 0));

    const totalSeconds = timeMins * 60;
    const secondsPerQuestion = Math.round(totalSeconds / totalQ);
    const passPercentage = Math.round((passScore / 10) * 100);
    const requiredCorrect = Math.ceil((passScore / 10) * totalQ);
    const pointsPerQuestion = (10 / totalQ).toFixed(2);

    let paceAssessment = "Cân đối tiêu chuẩn";
    let paceBadge = "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
    if (secondsPerQuestion < 45) {
      paceAssessment = "Thời gian làm bài khá nhanh";
      paceBadge = "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
    } else if (secondsPerQuestion > 120) {
      paceAssessment = "Thời gian dư dả, phù hợp câu hỏi lâm sàng";
      paceBadge = "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    }

    return {
      secondsPerQuestion,
      passPercentage,
      requiredCorrect,
      pointsPerQuestion,
      paceAssessment,
      paceBadge,
    };
  }, [totalQuestions, timeLimitMinutes, passingScore]);

  // Quick prefix helpers (dynamically formats what user types, NO dummy templates!)
  const handleApplyPrefix = (prefixType: "test" | "eval" | "final" | "practice") => {
    const clean = title
      .replace(
        /^(Kiểm tra:\s*|Đánh giá:\s*|Thi hết môn:\s*|Sát hạch:\s*|Bài trắc nghiệm:\s*)/i,
        ""
      )
      .trim();

    if (prefixType === "test") {
      setTitle(`Kiểm tra: ${clean}`);
    } else if (prefixType === "eval") {
      setTitle(`Đánh giá: ${clean}`);
    } else if (prefixType === "final") {
      setTitle(`Thi hết môn: ${clean}`);
    } else if (prefixType === "practice") {
      setTitle(`Sát hạch: ${clean}`);
    }
  };

  // Save Quiz
  const handleSaveQuiz = async (
    e?: React.FormEvent,
    andSwitchToQuestions: boolean = false
  ) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessBanner(null);

    if (!courseId) {
      setError("Vui lòng chọn khóa học áp dụng bài trắc nghiệm.");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề bài trắc nghiệm.");
      return;
    }
    if (totalQuestions < 1) {
      setError("Số câu hỏi phải lớn hơn hoặc bằng 1.");
      return;
    }
    if (timeLimitMinutes < 1) {
      setError("Thời gian làm bài phải lớn hơn hoặc bằng 1 phút.");
      return;
    }

    setBusy(true);

    try {
      const payload: Record<string, any> = {
        course_id: courseId,
        title: title.trim(),
        total_questions: Number(totalQuestions),
        time_limit_minutes: Number(timeLimitMinutes),
        passing_score: Number(passingScore),
      };

      let savedId = currentQuizId;

      if (isCreate) {
        const created: any = await adminApi("course_quizzes/create", {
          values: payload,
        });
        if (created && created.id) {
          savedId = created.id;
          setCurrentQuizId(created.id);
        }
      } else {
        const key = { id: row.id };
        await adminApi("course_quizzes/update", { key, values: payload });
      }

      onSaved();

      if (andSwitchToQuestions && savedId) {
        setSuccessBanner("✓ Đã lưu bài trắc nghiệm! Hãy bắt đầu soạn câu hỏi bên dưới.");
        setActiveTab("questions");
        setShowQuestionForm(true);
        setQNumber(questions.length + 1);
        if (onSwitchMode) {
          onSwitchMode("update", { ...row, id: savedId, ...payload });
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Có lỗi xảy ra khi lưu bài trắc nghiệm. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setBusy(false);
    }
  };

  // Open inline Question form
  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQNumber(questions.length + 1);
    setQText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectOption("A");
    setExplanation("");
    setQuestionError("");
    setShowQuestionForm(true);
  };

  const handleEditQuestion = (item: QuizQuestionItem) => {
    setEditingQuestionId(item.id || null);
    setQNumber(item.question_number);
    setQText(item.question_text);
    setOptA(item.options.A || "");
    setOptB(item.options.B || "");
    setOptC(item.options.C || "");
    setOptD(item.options.D || "");
    setCorrectOption(item.correct_option || "A");
    setExplanation(item.explanation || "");
    setQuestionError("");
    setShowQuestionForm(true);
  };

  // Save Inline Question
  const handleSaveQuestion = async (e: React.FormEvent, andAddAnother = false) => {
    e.preventDefault();
    setQuestionError("");

    if (!qText.trim()) {
      setQuestionError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    if (!optA.trim() || !optB.trim()) {
      setQuestionError("Cần ít nhất 2 đáp án (A và B).");
      return;
    }
    if (!currentQuizId) {
      setQuestionError("Vui lòng lưu thông tin chung bài trắc nghiệm trước khi soạn câu hỏi.");
      return;
    }

    setSavingQuestion(true);

    try {
      const optionsObj: Record<string, string> = {
        A: optA.trim(),
        B: optB.trim(),
      };
      if (optC.trim()) optionsObj.A_C = optC.trim(); // keep clean
      if (optC.trim()) optionsObj.C = optC.trim();
      if (optD.trim()) optionsObj.D = optD.trim();

      const qPayload = {
        quiz_id: currentQuizId,
        question_number: Number(qNumber),
        question_text: qText.trim(),
        options: optionsObj,
        correct_option: correctOption,
        explanation: explanation.trim() || null,
      };

      if (editingQuestionId) {
        // Update
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/quiz_questions?id=eq.${encodeURIComponent(
            editingQuestionId
          )}`,
          {
            method: "PATCH",
            headers: getSupabaseHeaders({
              "Content-Type": "application/json",
              Prefer: "return=representation",
            }),
            body: JSON.stringify(qPayload),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || "Không thể cập nhật câu hỏi.");
        }
      } else {
        // Create
        const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_questions`, {
          method: "POST",
          headers: getSupabaseHeaders({
            "Content-Type": "application/json",
            Prefer: "return=representation",
          }),
          body: JSON.stringify(qPayload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || "Không thể thêm câu hỏi.");
        }
      }

      await fetchQuestions(currentQuizId);

      if (andAddAnother) {
        setEditingQuestionId(null);
        setQNumber((prev) => prev + 1);
        setQText("");
        setOptA("");
        setOptB("");
        setOptC("");
        setOptD("");
        setCorrectOption("A");
        setExplanation("");
        setQuestionError("");
      } else {
        setShowQuestionForm(false);
      }
    } catch (err: any) {
      setQuestionError(err?.message || "Lỗi khi lưu câu hỏi.");
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi không?")) {
      return;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/quiz_questions?id=eq.${encodeURIComponent(qId)}`,
        {
          method: "DELETE",
          headers: getSupabaseHeaders(),
        }
      );
      if (!res.ok) throw new Error("Không thể xóa câu hỏi.");
      if (currentQuizId) {
        await fetchQuestions(currentQuizId);
      }
    } catch (err: any) {
      alert("Lỗi khi xóa câu hỏi: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-[#FDFBF7] text-[#2C241E] rounded-xl overflow-hidden shadow-2xl">
      {/* 1. HEADER */}
      <header className="px-6 py-4 bg-white border-b border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              <ListChecks size={13} />
              MLD Academy · Khảo thí & Bài kiểm tra
            </span>
            <span className="text-xs text-[#7F6E60]">
              {isCreate
                ? "Tạo đề thi mới"
                : isView
                ? "Xem chi tiết"
                : "Chỉnh sửa bài thi"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#2C241E] mt-1">
            {isCreate
              ? "Thêm mới bài kiểm tra trắc nghiệm"
              : isView
              ? title || "Chi tiết bài trắc nghiệm"
              : `Chỉnh sửa: ${title || "Bài trắc nghiệm"}`}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Mode Button */}
          {isView && onSwitchMode && (
            <button
              type="button"
              onClick={() => onSwitchMode("update", row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF0E4] text-xs font-semibold text-[#985018] hover:bg-[#F3E2CE] cursor-pointer transition-colors"
            >
              <Pencil size={13} />
              Chuyển sang Chỉnh sửa
            </button>
          )}

          {!isView && onSwitchMode && !isCreate && (
            <button
              type="button"
              onClick={() => onSwitchMode("view", row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DFD8] bg-white text-xs font-semibold text-[#7F6E60] hover:bg-[#FAF0E4] cursor-pointer transition-colors"
            >
              Xem chi tiết
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7F6E60] hover:text-[#2C241E] hover:bg-[#FAF0E4] transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* TABS (For non-create or after created) */}
      {!isCreate && (
        <div className="px-6 bg-white border-b border-[#E8DFD8] flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "border-[#985018] text-[#985018]"
                : "border-transparent text-[#7F6E60] hover:text-[#2C241E]"
            }`}
          >
            <Layers size={14} />
            Cấu hình bài thi
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "questions"
                ? "border-[#985018] text-[#985018]"
                : "border-transparent text-[#7F6E60] hover:text-[#2C241E]"
            }`}
          >
            <HelpCircle size={14} />
            Ngân hàng câu hỏi
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                questions.length >= totalQuestions
                  ? "bg-[#ECFDF5] text-[#047857]"
                  : "bg-[#FAF0E4] text-[#985018]"
              }`}
            >
              {questions.length}/{totalQuestions}
            </span>
          </button>
        </div>
      )}

      {/* 2. BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Success Banner */}
        {successBanner && (
          <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center gap-2.5 text-xs text-[#065F46] font-medium shadow-xs">
            <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
            <div className="flex-1">{successBanner}</div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-[#059669] hover:text-[#047857] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center gap-2.5 text-xs text-[#991B1B] font-medium shadow-xs">
            <AlertCircle size={16} className="text-[#DC2626] shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* TAB 1: SETTINGS / GENERAL FORM */}
        {activeTab === "settings" && (
          <form id="quiz-form" onSubmit={(e) => handleSaveQuiz(e, false)} className="space-y-6">
            {/* SECTION 1: KHÓA HỌC ÁP DỤNG */}
            <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    1. Khóa đào tạo liên kết
                  </h3>
                  <p className="text-xs text-[#7F6E60]">
                    Chọn chương trình đào tạo áp dụng bài kiểm tra này
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                  Khóa học đào tạo <span className="text-[#DC2626]">*</span>
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
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                  >
                    <option value="">-- Chọn khóa học áp dụng --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `[${c.code}] ` : ""}
                        {c.title}
                        {c.level ? ` (${c.level})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedCourse && (
                <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EFE8DF] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#985018]">
                      {selectedCourse.code || "MLD-COURSE"}:
                    </span>{" "}
                    <span className="text-[#2C241E] font-medium">
                      {selectedCourse.title}
                    </span>
                  </div>
                  {selectedCourse.level && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-[#E8DFD8] text-[#7F6E60]">
                      Trình độ: {selectedCourse.level}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: TIÊU ĐỀ BÀI KIỂM TRA (CLEAN, NO DUMMY PRE-FILLED TEMPLATES) */}
            <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                    <ListChecks size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2C241E]">
                      2. Tiêu đề bài trắc nghiệm
                    </h3>
                    <p className="text-xs text-[#7F6E60]">
                      Đặt tên bài kiểm tra rõ ràng để học viên dễ theo dõi trong lộ trình
                    </p>
                  </div>
                </div>

                {!isView && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#7F6E60]">Gắn tiền tố:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPrefix("test")}
                      className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                    >
                      Kiểm tra:
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPrefix("eval")}
                      className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                    >
                      Đánh giá:
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPrefix("final")}
                      className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                    >
                      Thi hết môn:
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPrefix("practice")}
                      className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] hover:bg-[#F3E2CE] text-[11px] font-semibold border border-[#E8DFD8] cursor-pointer"
                    >
                      Sát hạch:
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                  Tiêu đề đề thi <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isView}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Kiểm tra kiến thức Module 1 - Giải phẫu & Kỹ thuật Vodder"
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
              </div>
            </div>

            {/* SECTION 3: CẤU HÌNH QUY CHUẨN THI (EASY STEPPERS & PRESET CHIPS) */}
            <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                  <Calculator size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    3. Thiết lập số lượng, thời gian & ngưỡng điểm đạt
                  </h3>
                  <p className="text-xs text-[#7F6E60]">
                    Các chỉ số làm bài giúp hệ thống chấm điểm tự động và xếp loại tốt nghiệp
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Số câu hỏi */}
                <div className="p-3.5 rounded-xl border border-[#E8DFD8] bg-[#FDFBF7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#4A3E31]">
                      Số lượng câu hỏi
                    </label>
                    <span className="text-[11px] font-bold text-[#985018] bg-[#FAF0E4] px-2 py-0.5 rounded">
                      {totalQuestions} câu
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isView && (
                      <button
                        type="button"
                        onClick={() =>
                          setTotalQuestions((prev) => Math.max(1, prev - 5))
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] text-[#985018] font-bold hover:bg-[#FAF0E4] cursor-pointer shrink-0 transition-colors"
                      >
                        -5
                      </button>
                    )}
                    <input
                      type="number"
                      min="1"
                      max="200"
                      required
                      disabled={isView}
                      value={totalQuestions}
                      onChange={(e) =>
                        setTotalQuestions(
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      }
                      className="w-full text-center font-bold text-sm px-2 py-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#985018] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                    />
                    {!isView && (
                      <button
                        type="button"
                        onClick={() => setTotalQuestions((prev) => prev + 5)}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] text-[#985018] font-bold hover:bg-[#FAF0E4] cursor-pointer shrink-0 transition-colors"
                      >
                        +5
                      </button>
                    )}
                  </div>

                  {!isView && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {PRESET_QUESTION_COUNTS.map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setTotalQuestions(cnt)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            totalQuestions === cnt
                              ? "bg-[#985018] text-white border-[#985018]"
                              : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                          }`}
                        >
                          {cnt} câu
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Thời gian làm bài */}
                <div className="p-3.5 rounded-xl border border-[#E8DFD8] bg-[#FDFBF7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#4A3E31] flex items-center gap-1">
                      <Clock size={13} className="text-[#985018]" />
                      Thời gian làm bài
                    </label>
                    <span className="text-[11px] font-bold text-[#985018] bg-[#FAF0E4] px-2 py-0.5 rounded">
                      {timeLimitMinutes} phút
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isView && (
                      <button
                        type="button"
                        onClick={() =>
                          setTimeLimitMinutes((prev) => Math.max(5, prev - 5))
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] text-[#985018] font-bold hover:bg-[#FAF0E4] cursor-pointer shrink-0 transition-colors"
                      >
                        -5
                      </button>
                    )}
                    <input
                      type="number"
                      min="1"
                      max="240"
                      required
                      disabled={isView}
                      value={timeLimitMinutes}
                      onChange={(e) =>
                        setTimeLimitMinutes(
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      }
                      className="w-full text-center font-bold text-sm px-2 py-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#985018] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                    />
                    {!isView && (
                      <button
                        type="button"
                        onClick={() => setTimeLimitMinutes((prev) => prev + 5)}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] text-[#985018] font-bold hover:bg-[#FAF0E4] cursor-pointer shrink-0 transition-colors"
                      >
                        +5
                      </button>
                    )}
                  </div>

                  {!isView && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {PRESET_DURATIONS.map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setTimeLimitMinutes(dur)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            timeLimitMinutes === dur
                              ? "bg-[#985018] text-white border-[#985018]"
                              : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                          }`}
                        >
                          {dur}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Điểm đạt chuẩn */}
                <div className="p-3.5 rounded-xl border border-[#E8DFD8] bg-[#FDFBF7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#4A3E31] flex items-center gap-1">
                      <Percent size={13} className="text-[#985018]" />
                      Điểm đạt chuẩn
                    </label>
                    <span className="text-[11px] font-bold text-[#985018] bg-[#FAF0E4] px-2 py-0.5 rounded">
                      {passingScore.toFixed(1)} / 10
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isView && (
                      <button
                        type="button"
                        onClick={() =>
                          setPassingScore((prev) =>
                            Math.max(1, Number((prev - 0.5).toFixed(1)))
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] text-[#985018] font-bold hover:bg-[#FAF0E4] cursor-pointer shrink-0 transition-colors"
                      >
                        -
                      </button>
                    )}
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      required
                      disabled={isView}
                      value={passingScore}
                      onChange={(e) =>
                        setPassingScore(
                          Math.min(
                            10,
                            Math.max(0, parseFloat(e.target.value) || 0)
                          )
                        )
                      }
                      className="w-full text-center font-bold text-sm px-2 py-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#985018] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                    />
                    {!isView && (
                      <button
                        type="button"
                        onClick={() =>
                          setPassingScore((prev) =>
                            Math.min(10, Number((prev + 0.5).toFixed(1)))
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] text-[#985018] font-bold hover:bg-[#FAF0E4] cursor-pointer shrink-0 transition-colors"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {!isView && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {PRESET_PASSING_SCORES.map((p) => (
                        <button
                          key={p.score}
                          type="button"
                          onClick={() => setPassingScore(p.score)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                            Math.abs(passingScore - p.score) < 0.05
                              ? "bg-[#985018] text-white border-[#985018]"
                              : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: BẢNG TÍNH TOÁN & THỐNG KÊ TRỰC QUAN (LIVE EXAM METRICS) */}
            <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0EAE4]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2C241E]">
                      4. Tóm tắt quy chuẩn đề thi & Độ khó
                    </h3>
                    <p className="text-xs text-[#7F6E60]">
                      Thông số tự động tính toán dựa trên cấu hình bạn vừa thiết lập
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${metrics.paceBadge}`}
                >
                  {metrics.paceAssessment}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EFE8DF] text-center">
                  <span className="block text-[11px] text-[#7F6E60]">
                    Thời gian TB / câu
                  </span>
                  <span className="block text-base font-bold text-[#985018] mt-0.5">
                    {metrics.secondsPerQuestion} giây
                  </span>
                  <span className="text-[10px] text-[#9C8B7D]">
                    ({(metrics.secondsPerQuestion / 60).toFixed(1)} phút/câu)
                  </span>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EFE8DF] text-center">
                  <span className="block text-[11px] text-[#7F6E60]">
                    Tỉ lệ làm đúng tối thiểu
                  </span>
                  <span className="block text-base font-bold text-[#047857] mt-0.5">
                    {metrics.passPercentage}%
                  </span>
                  <span className="text-[10px] text-[#9C8B7D]">
                    Ngưỡng đạt chứng chỉ
                  </span>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EFE8DF] text-center">
                  <span className="block text-[11px] text-[#7F6E60]">
                    Số câu đúng cần đạt
                  </span>
                  <span className="block text-base font-bold text-[#2C241E] mt-0.5">
                    {metrics.requiredCorrect} / {totalQuestions}
                  </span>
                  <span className="text-[10px] text-[#9C8B7D]">
                    Câu hỏi tối thiểu
                  </span>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EFE8DF] text-center">
                  <span className="block text-[11px] text-[#7F6E60]">
                    Trọng số mỗi câu
                  </span>
                  <span className="block text-base font-bold text-[#2C241E] mt-0.5">
                    {metrics.pointsPerQuestion} đ
                  </span>
                  <span className="text-[10px] text-[#9C8B7D]">
                    Thang điểm 10
                  </span>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: QUESTIONS BANK (NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM) */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            {/* Header / Stats */}
            <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    Danh sách câu hỏi trong đề thi ({questions.length}/{totalQuestions})
                  </h3>
                  {questions.length >= totalQuestions ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Đã soạn đủ chỉ tiêu
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                      Còn thiếu {totalQuestions - questions.length} câu
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7F6E60] mt-0.5">
                  Học viên sẽ làm các câu hỏi này khi tham gia bài thi trắc nghiệm
                </p>

                {/* Progress bar */}
                <div className="w-full sm:w-64 h-2 bg-[#EFE8DF] rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#985018] transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (questions.length / Math.max(1, totalQuestions)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {!isView && !showQuestionForm && (
                <button
                  type="button"
                  onClick={handleOpenAddQuestion}
                  className="px-4 py-2 rounded-lg bg-[#985018] hover:bg-[#7D3E10] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus size={15} />
                  + Thêm câu hỏi mới
                </button>
              )}
            </div>

            {/* INLINE QUESTION CREATION / EDITING FORM */}
            {showQuestionForm && (
              <form
                onSubmit={(e) => handleSaveQuestion(e, false)}
                className="bg-white rounded-xl border-2 border-[#985018] p-5 shadow-md space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold text-xs">
                      #{qNumber}
                    </span>
                    <h4 className="text-sm font-bold text-[#2C241E]">
                      {editingQuestionId
                        ? `Chỉnh sửa câu hỏi số ${qNumber}`
                        : `Soạn câu hỏi số ${qNumber}`}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuestionForm(false)}
                    className="text-[#7F6E60] hover:text-[#2C241E] p-1 rounded hover:bg-[#FAF0E4] cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {questionError && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] font-medium flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{questionError}</span>
                  </div>
                )}

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                    Nội dung câu hỏi <span className="text-[#DC2626]">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Nhập nội dung câu hỏi trắc nghiệm (Ví dụ: Áp lực chuẩn khi thực hiện kỹ thuật miết Vodder là bao nhiêu?)..."
                    className="w-full text-xs p-3 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                {/* 4 Options with Radio selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#4A3E31]">
                    Các phương án trả lời & Chọn đáp án đúng:
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* Option A */}
                    <div
                      className={`p-2.5 rounded-lg border flex items-center gap-2 transition-colors ${
                        correctOption === "A"
                          ? "bg-[#F0FDF4] border-[#86EFAC]"
                          : "bg-[#FAF8F5] border-[#E8DFD8]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption("A")}
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                          correctOption === "A"
                            ? "bg-[#16A34A] text-white"
                            : "bg-white text-[#7F6E60] border border-[#D1C5B8]"
                        }`}
                        title="Chọn A làm đáp án đúng"
                      >
                        A
                      </button>
                      <input
                        type="text"
                        required
                        value={optA}
                        onChange={(e) => setOptA(e.target.value)}
                        placeholder="Nội dung đáp án A..."
                        className="flex-1 text-xs px-2.5 py-1.5 rounded border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                      />
                      {correctOption === "A" && (
                        <span className="text-[10px] font-bold text-[#16A34A] shrink-0">
                          Đúng
                        </span>
                      )}
                    </div>

                    {/* Option B */}
                    <div
                      className={`p-2.5 rounded-lg border flex items-center gap-2 transition-colors ${
                        correctOption === "B"
                          ? "bg-[#F0FDF4] border-[#86EFAC]"
                          : "bg-[#FAF8F5] border-[#E8DFD8]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption("B")}
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                          correctOption === "B"
                            ? "bg-[#16A34A] text-white"
                            : "bg-white text-[#7F6E60] border border-[#D1C5B8]"
                        }`}
                        title="Chọn B làm đáp án đúng"
                      >
                        B
                      </button>
                      <input
                        type="text"
                        required
                        value={optB}
                        onChange={(e) => setOptB(e.target.value)}
                        placeholder="Nội dung đáp án B..."
                        className="flex-1 text-xs px-2.5 py-1.5 rounded border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                      />
                      {correctOption === "B" && (
                        <span className="text-[10px] font-bold text-[#16A34A] shrink-0">
                          Đúng
                        </span>
                      )}
                    </div>

                    {/* Option C */}
                    <div
                      className={`p-2.5 rounded-lg border flex items-center gap-2 transition-colors ${
                        correctOption === "C"
                          ? "bg-[#F0FDF4] border-[#86EFAC]"
                          : "bg-[#FAF8F5] border-[#E8DFD8]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption("C")}
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                          correctOption === "C"
                            ? "bg-[#16A34A] text-white"
                            : "bg-white text-[#7F6E60] border border-[#D1C5B8]"
                        }`}
                        title="Chọn C làm đáp án đúng"
                      >
                        C
                      </button>
                      <input
                        type="text"
                        value={optC}
                        onChange={(e) => setOptC(e.target.value)}
                        placeholder="Nội dung đáp án C (Không bắt buộc)..."
                        className="flex-1 text-xs px-2.5 py-1.5 rounded border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                      />
                      {correctOption === "C" && (
                        <span className="text-[10px] font-bold text-[#16A34A] shrink-0">
                          Đúng
                        </span>
                      )}
                    </div>

                    {/* Option D */}
                    <div
                      className={`p-2.5 rounded-lg border flex items-center gap-2 transition-colors ${
                        correctOption === "D"
                          ? "bg-[#F0FDF4] border-[#86EFAC]"
                          : "bg-[#FAF8F5] border-[#E8DFD8]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption("D")}
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                          correctOption === "D"
                            ? "bg-[#16A34A] text-white"
                            : "bg-white text-[#7F6E60] border border-[#D1C5B8]"
                        }`}
                        title="Chọn D làm đáp án đúng"
                      >
                        D
                      </button>
                      <input
                        type="text"
                        value={optD}
                        onChange={(e) => setOptD(e.target.value)}
                        placeholder="Nội dung đáp án D (Không bắt buộc)..."
                        className="flex-1 text-xs px-2.5 py-1.5 rounded border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                      />
                      {correctOption === "D" && (
                        <span className="text-[10px] font-bold text-[#16A34A] shrink-0">
                          Đúng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                    Giải thích đáp án / Ghi chú chuyên môn (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Giải thích vì sao đáp án đúng để học viên học hỏi sau khi làm bài..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>

                {/* Actions inside form */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EAE4]">
                  <button
                    type="button"
                    onClick={() => setShowQuestionForm(false)}
                    disabled={savingQuestion}
                    className="px-3 py-1.5 rounded-lg border border-[#E8DFD8] text-xs font-semibold text-[#7F6E60] hover:bg-[#FAF0E4] cursor-pointer"
                  >
                    Hủy
                  </button>

                  {!editingQuestionId && (
                    <button
                      type="button"
                      onClick={(e) => handleSaveQuestion(e, true)}
                      disabled={savingQuestion}
                      className="px-3.5 py-1.5 rounded-lg border border-[#985018] bg-[#FAF0E4] text-xs font-bold text-[#985018] hover:bg-[#F3E2CE] cursor-pointer flex items-center gap-1.5"
                    >
                      {savingQuestion ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <Plus size={13} />
                      )}
                      Lưu & Thêm câu tiếp theo
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={savingQuestion}
                    className="px-4 py-1.5 rounded-lg bg-[#985018] hover:bg-[#7D3E10] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {savingQuestion ? (
                      <LoaderCircle size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    {editingQuestionId ? "Cập nhật câu hỏi" : "Lưu câu hỏi"}
                  </button>
                </div>
              </form>
            )}

            {/* List of existing questions */}
            {loadingQuestions ? (
              <div className="p-8 text-center text-xs text-[#7F6E60] flex items-center justify-center gap-2">
                <LoaderCircle size={16} className="animate-spin text-[#985018]" />
                Đang tải danh sách câu hỏi...
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E8DFD8] p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FAF0E4] text-[#985018] flex items-center justify-center mx-auto">
                  <HelpCircle size={24} />
                </div>
                <h4 className="text-sm font-bold text-[#2C241E]">
                  Chưa có câu hỏi nào trong đề thi này
                </h4>
                <p className="text-xs text-[#7F6E60] max-w-md mx-auto">
                  Hãy bấm nút "+ Thêm câu hỏi mới" ở trên để bắt đầu soạn thảo ngân hàng
                  câu hỏi trắc nghiệm A/B/C/D cho bài thi này.
                </p>
                {!isView && !showQuestionForm && (
                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#985018] text-white text-xs font-bold hover:bg-[#7D3E10] cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus size={15} />
                    Soạn câu hỏi đầu tiên
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="bg-white rounded-xl border border-[#E8DFD8] p-4 shadow-xs space-y-3 hover:border-[#D1C5B8] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-[#FAF0E4] text-[#985018] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {q.question_number || idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#2C241E] leading-relaxed">
                            {q.question_text}
                          </p>
                        </div>
                      </div>

                      {!isView && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="p-1.5 rounded text-[#7F6E60] hover:text-[#985018] hover:bg-[#FAF0E4] cursor-pointer transition-colors"
                            title="Sửa câu hỏi"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => q.id && handleDeleteQuestion(q.id)}
                            className="p-1.5 rounded text-[#7F6E60] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer transition-colors"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                      {Object.entries(q.options || {}).map(([key, val]) => {
                        const isCorrect = q.correct_option === key;
                        return (
                          <div
                            key={key}
                            className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                              isCorrect
                                ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534] font-semibold"
                                : "bg-[#FAF8F5] border-[#E8DFD8] text-[#4A3E31]"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? "bg-[#16A34A] text-white"
                                  : "bg-white text-[#7F6E60] border border-[#D1C5B8]"
                              }`}
                            >
                              {key}
                            </span>
                            <span className="flex-1 truncate">{val}</span>
                            {isCorrect && (
                              <CheckCircle2 size={14} className="text-[#16A34A] shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="ml-8 p-2 rounded-lg bg-[#FAF8F5] border border-[#EFE8DF] text-[11px] text-[#7F6E60]">
                        <span className="font-semibold text-[#985018]">
                          Giải thích:{" "}
                        </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. FOOTER */}
      <footer className="px-6 py-3.5 bg-white border-t border-[#E8DFD8] flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-4 py-2 rounded-lg border border-[#E8DFD8] text-xs font-semibold text-[#7F6E60] hover:bg-[#FAF0E4] hover:text-[#2C241E] cursor-pointer transition-colors"
        >
          Đóng
        </button>

        <div className="flex items-center gap-2">
          {isCreate && activeTab === "settings" && (
            <button
              type="button"
              onClick={(e) => handleSaveQuiz(e, true)}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-[#985018] bg-[#FAF0E4] text-xs font-bold text-[#985018] hover:bg-[#F3E2CE] cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              Lưu & Soạn câu hỏi ngay
            </button>
          )}

          {!isView && (
            <button
              type="button"
              onClick={(e) => handleSaveQuiz(e, false)}
              disabled={busy}
              className="px-5 py-2 rounded-lg bg-[#985018] hover:bg-[#7D3E10] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {busy ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isCreate ? "Lưu bài trắc nghiệm" : "Lưu thay đổi"}
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
