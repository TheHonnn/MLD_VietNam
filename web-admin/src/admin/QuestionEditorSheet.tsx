import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HelpCircle,
  Plus,
  Save,
  Pencil,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  BookOpen,
  ListChecks,
  Check,
  ChevronRight,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";
import { ExcelQuizImportModal } from "./ExcelQuizImportModal";

export interface QuestionEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}

// Safely parse options field from DB
function parseOptionsFromRow(rawOpts: any): { A: string; B: string; C: string; D: string } {
  const result = { A: "", B: "", C: "", D: "" };
  if (!rawOpts) return result;

  if (typeof rawOpts === "object" && !Array.isArray(rawOpts)) {
    if (rawOpts.A) result.A = String(rawOpts.A);
    if (rawOpts.B) result.B = String(rawOpts.B);
    if (rawOpts.C) result.C = String(rawOpts.C);
    if (rawOpts.D) result.D = String(rawOpts.D);
    return result;
  }

  if (Array.isArray(rawOpts)) {
    if (rawOpts[0]) result.A = String(rawOpts[0]);
    if (rawOpts[1]) result.B = String(rawOpts[1]);
    if (rawOpts[2]) result.C = String(rawOpts[2]);
    if (rawOpts[3]) result.D = String(rawOpts[3]);
    return result;
  }

  if (typeof rawOpts === "string") {
    try {
      const parsed = JSON.parse(rawOpts);
      return parseOptionsFromRow(parsed);
    } catch {
      return result;
    }
  }

  return result;
}

export const QuestionEditorSheet: React.FC<QuestionEditorSheetProps> = ({
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  // 1. Lookups data
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Cascading selections
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [quizId, setQuizId] = useState<string>(row.quiz_id || "");

  // Existing questions of the active quiz (for order calculation and roadmap context)
  const [existingQuestions, setExistingQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // 2. Form state (Clean inputs, NO dummy pre-filled templates!)
  const [questionNumber, setQuestionNumber] = useState<number>(
    row.question_number !== undefined && row.question_number !== null
      ? Number(row.question_number)
      : 1
  );
  const [questionText, setQuestionText] = useState<string>(row.question_text || "");

  const initialOpts = parseOptionsFromRow(row.options);
  const [optA, setOptA] = useState<string>(initialOpts.A);
  const [optB, setOptB] = useState<string>(initialOpts.B);
  const [optC, setOptC] = useState<string>(initialOpts.C);
  const [optD, setOptD] = useState<string>(initialOpts.D);

  const [numOptions, setNumOptions] = useState<number>(
    initialOpts.D ? 4 : initialOpts.C ? 3 : 4
  );

  const [correctOption, setCorrectOption] = useState<string>(
    row.correct_option ? String(row.correct_option).toUpperCase() : "A"
  );
  const [explanation, setExplanation] = useState<string>(row.explanation || "");

  // Submit / UI State
  const [busy, setBusy] = useState(false);
  const [saveAndAddMore, setSaveAndAddMore] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);

  // A. Fetch courses and quizzes
  useEffect(() => {
    let mounted = true;
    const fetchLookups = async () => {
      try {
        const [cRes, qRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/courses?select=id,title,code&order=title.asc`, {
            headers: getSupabaseHeaders(),
          }),
          fetch(
            `${SUPABASE_URL}/rest/v1/course_quizzes?select=id,course_id,title,total_questions,time_limit_minutes&order=created_at.desc`,
            { headers: getSupabaseHeaders() }
          ),
        ]);

        const [cData, qData] = await Promise.all([cRes.json(), qRes.json()]);

        if (mounted) {
          if (Array.isArray(cData)) setCourses(cData);
          if (Array.isArray(qData)) {
            setQuizzes(qData);

            // If editing or pre-selected quiz_id exists, match course
            const targetQuizId = row.quiz_id || quizId;
            if (targetQuizId) {
              const matched = qData.find((q: any) => q.id === targetQuizId);
              if (matched) {
                setSelectedCourseId(matched.course_id || "");
                setQuizId(matched.id);
              }
            } else if (qData.length > 0) {
              // Default to first quiz
              setSelectedCourseId(qData[0].course_id || "");
              setQuizId(qData[0].id);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh mục khóa học & đề thi:", err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    fetchLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter quizzes by selected course
  const filteredQuizzes = useMemo(() => {
    if (!selectedCourseId) return quizzes;
    return quizzes.filter((q) => q.course_id === selectedCourseId);
  }, [quizzes, selectedCourseId]);

  // Selected Quiz object
  const selectedQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === quizId);
  }, [quizzes, quizId]);

  // Selected Course object
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // When course changes, update quiz selection
  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    const related = quizzes.filter((q) => q.course_id === newCourseId);
    if (related.length > 0) {
      setQuizId(related[0].id);
    } else {
      setQuizId("");
    }
  };

  // B. Fetch existing questions when quizId changes
  useEffect(() => {
    if (!quizId) {
      setExistingQuestions([]);
      return;
    }

    let mounted = true;
    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/quiz_questions?quiz_id=eq.${encodeURIComponent(
            quizId
          )}&select=id,question_number,question_text,correct_option&order=question_number.asc`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setExistingQuestions(data);

          // If creating new question, auto-calculate next logical order
          if (isCreate && (!row.question_number || row.question_number === 1)) {
            const maxOrder = data.reduce(
              (max, q) => Math.max(max, Number(q.question_number) || 0),
              0
            );
            setQuestionNumber(maxOrder + 1);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh sách câu hỏi của đề thi:", err);
      } finally {
        if (mounted) setLoadingQuestions(false);
      }
    };

    fetchQuestions();
    return () => {
      mounted = false;
    };
  }, [quizId]);

  // Handle Save
  const handleSave = async (e: React.FormEvent, andAddMore = false) => {
    e.preventDefault();
    setError("");
    setSuccessBanner(null);

    if (!quizId) {
      setError("Vui lòng chọn bài kiểm tra trắc nghiệm.");
      return;
    }
    if (!questionText.trim()) {
      setError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    if (!optA.trim() || !optB.trim()) {
      setError("Cần nhập ít nhất 2 đáp án (A và B).");
      return;
    }
    if (numOptions >= 3 && !optC.trim()) {
      setError("Vui lòng nhập nội dung cho đáp án C hoặc giảm số lượng đáp án.");
      return;
    }
    if (numOptions >= 4 && !optD.trim()) {
      setError("Vui lòng nhập nội dung cho đáp án D hoặc giảm số lượng đáp án.");
      return;
    }

    // Ensure correctOption is valid
    if (numOptions === 2 && !["A", "B"].includes(correctOption)) {
      setCorrectOption("A");
    }
    if (numOptions === 3 && !["A", "B", "C"].includes(correctOption)) {
      setCorrectOption("A");
    }

    setBusy(true);
    setSaveAndAddMore(andAddMore);

    try {
      const optionsObj: Record<string, string> = {
        A: optA.trim(),
        B: optB.trim(),
      };
      if (numOptions >= 3 && optC.trim()) {
        optionsObj.C = optC.trim();
      }
      if (numOptions >= 4 && optD.trim()) {
        optionsObj.D = optD.trim();
      }

      const payload: Record<string, any> = {
        quiz_id: quizId,
        question_number: Number(questionNumber),
        question_text: questionText.trim(),
        options: optionsObj,
        correct_option: correctOption,
        explanation: explanation.trim() || null,
      };

      if (isCreate) {
        await adminApi("quiz_questions/create", { values: payload });
      } else {
        const key = { id: row.id };
        await adminApi("quiz_questions/update", { key, values: payload });
      }

      onSaved();

      if (isCreate && andAddMore) {
        // Add to existing questions locally
        setExistingQuestions((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            question_number: questionNumber,
            question_text: questionText.trim(),
            correct_option: correctOption,
          },
        ]);

        setSuccessBanner(
          `✓ Đã lưu thành công câu hỏi số ${questionNumber}! Sẵn sàng nhập câu tiếp theo.`
        );

        // Advance to next question cleanly (keep course & quiz selected, NO dummy templates!)
        const nextNum = Number(questionNumber) + 1;
        setQuestionNumber(nextNum);
        setQuestionText("");
        setOptA("");
        setOptB("");
        setOptC("");
        setOptD("");
        setCorrectOption("A");
        setExplanation("");

        // Focus back to question input
        setTimeout(() => {
          questionInputRef.current?.focus();
        }, 100);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Có lỗi xảy ra khi lưu câu hỏi trắc nghiệm. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setBusy(false);
      setSaveAndAddMore(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-[#FDFBF7] text-[#2C241E] rounded-xl overflow-hidden shadow-2xl">
      {/* 1. HEADER */}
      <header className="px-6 py-4 bg-white border-b border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              <HelpCircle size={13} />
              Học viện MLD · Ngân hàng câu hỏi trắc nghiệm
            </span>
            <span className="text-xs text-[#7F6E60]">
              {isCreate
                ? "Thêm câu hỏi mới"
                : isView
                ? "Xem chi tiết câu hỏi"
                : "Chỉnh sửa câu hỏi"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#2C241E] mt-1">
            {isCreate
              ? `Thêm mới câu hỏi #${questionNumber} vào đề thi`
              : isView
              ? `Chi tiết câu hỏi #${questionNumber}`
              : `Chỉnh sửa câu hỏi #${questionNumber}`}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Import Excel button */}
          {!isView && (
            <button
              type="button"
              onClick={() => setShowExcelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] text-xs font-bold text-[#15803D] hover:bg-[#DCFCE7] cursor-pointer transition-colors shadow-xs"
            >
              <FileSpreadsheet size={13} className="text-[#16A34A]" />
              Nhập từ file Excel
            </button>
          )}

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

      {/* 2. BODY CONTENT */}
      <form
        id="question-form"
        onSubmit={(e) => handleSave(e, false)}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
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

        {/* SECTION 1: KHÓA HỌC & ĐỀ THI LIÊN KẾT */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">
                1. Khóa đào tạo & Đề thi trắc nghiệm
              </h3>
              <p className="text-xs text-[#7F6E60]">
                Xác định bài kiểm tra trắc nghiệm áp dụng câu hỏi này
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lọc theo khóa học */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Khóa đào tạo
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
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">-- Tất cả khóa học --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ""}
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Chọn đề thi trắc nghiệm */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Bài kiểm tra trắc nghiệm <span className="text-[#DC2626]">*</span>
              </label>
              {loadingLookups ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải đề thi...
                </div>
              ) : (
                <select
                  required
                  disabled={isView || filteredQuizzes.length === 0}
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">
                    {filteredQuizzes.length === 0
                      ? "-- Chưa có đề thi nào trong khóa này --"
                      : "-- Chọn bài kiểm tra trắc nghiệm --"}
                  </option>
                  {filteredQuizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.total_questions || 20} câu / {q.time_limit_minutes || 30}p)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Quiz Stats Summary */}
          {selectedQuiz && (
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EFE8DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#985018]">Đề thi:</span>
                <span className="text-[#2C241E] font-medium">{selectedQuiz.title}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7F6E60]">
                <span className="px-2 py-0.5 rounded bg-white border border-[#E8DFD8]">
                  Chỉ tiêu: {selectedQuiz.total_questions || 20} câu
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
                  Đã soạn: {existingQuestions.length} câu
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: SỐ THỨ TỰ & NỘI DUNG CÂU HỎI */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <ListOrdered size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  2. Thứ tự & Nội dung câu hỏi
                </h3>
                <p className="text-xs text-[#7F6E60]">
                  Soạn nội dung câu hỏi rõ ràng, chính xác theo chuyên môn đào tạo
                </p>
              </div>
            </div>

            {/* Stepper for question number */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#7F6E60]">Câu số:</span>
              {!isView && (
                <button
                  type="button"
                  onClick={() => setQuestionNumber((prev) => Math.max(1, prev - 1))}
                  disabled={questionNumber <= 1}
                  className="w-7 h-7 rounded-lg bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] font-bold text-xs hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-40 transition-colors"
                >
                  -
                </button>
              )}
              <input
                type="number"
                min="1"
                max="200"
                required
                disabled={isView}
                value={questionNumber}
                onChange={(e) =>
                  setQuestionNumber(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-14 text-center font-bold text-sm px-2 py-1 rounded-lg border border-[#E8DFD8] bg-white text-[#985018] focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
              />
              {!isView && (
                <button
                  type="button"
                  onClick={() => setQuestionNumber((prev) => prev + 1)}
                  className="w-7 h-7 rounded-lg bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8] font-bold text-xs hover:bg-[#F3E2CE] cursor-pointer transition-colors"
                >
                  +
                </button>
              )}
            </div>
          </div>

          {/* Quick chips for order */}
          {!isView && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-[#7F6E60] mr-1">Gán nhanh:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionNumber(n)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    questionNumber === n
                      ? "bg-[#985018] text-white border-[#985018]"
                      : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                  }`}
                >
                  #{n}
                </button>
              ))}
            </div>
          )}

          {/* Question Textarea (Clean, no pre-filled dummy text!) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A3E31]">
                Nội dung câu hỏi <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-[11px] text-[#7F6E60]">
                {questionText.length} ký tự
              </span>
            </div>
            <textarea
              ref={questionInputRef}
              rows={3}
              required
              disabled={isView}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Nhập nội dung câu hỏi trắc nghiệm (Ví dụ: Thao tác nào sau đây là chống chỉ định tuyệt đối trong điều trị phù bạch huyết?)..."
              className="w-full text-xs p-3.5 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA] leading-relaxed"
            />
          </div>
        </div>

        {/* SECTION 3: CÁC ĐÁP ÁN & CHỌN ĐÁP ÁN ĐÚNG TRỰC TIẾP */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <ListChecks size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  3. Các phương án trả lời & Chọn đáp án đúng
                </h3>
                <p className="text-xs text-[#7F6E60]">
                  Nhập các đáp án và bấm trực tiếp vào chữ cái để chọn phương án đúng
                </p>
              </div>
            </div>

            {/* Toggle number of options */}
            {!isView && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#7F6E60]">Số đáp án:</span>
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setNumOptions(num);
                      if (num === 2 && !["A", "B"].includes(correctOption)) {
                        setCorrectOption("A");
                      }
                      if (num === 3 && !["A", "B", "C"].includes(correctOption)) {
                        setCorrectOption("A");
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                      numOptions === num
                        ? "bg-[#985018] text-white border-[#985018]"
                        : "bg-white text-[#7F6E60] border-[#E8DFD8] hover:bg-[#FAF0E4]"
                    }`}
                  >
                    {num} phương án
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* OPTION A */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                correctOption === "A"
                  ? "bg-[#F0FDF4] border-[#86EFAC] shadow-xs"
                  : "bg-[#FAF8F5] border-[#E8DFD8]"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isView}
                  onClick={() => setCorrectOption("A")}
                  className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 ${
                    correctOption === "A"
                      ? "bg-[#16A34A] text-white shadow-xs"
                      : "bg-white text-[#7F6E60] border border-[#D1C5B8] hover:border-[#16A34A] hover:text-[#16A34A]"
                  }`}
                  title="Nhấn để chọn A làm đáp án đúng"
                >
                  A
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    disabled={isView}
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Nhập nội dung phương án A..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                  />
                </div>
                {correctOption === "A" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0">
                    <Check size={12} />
                    Đáp án đúng
                  </span>
                )}
              </div>
            </div>

            {/* OPTION B */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                correctOption === "B"
                  ? "bg-[#F0FDF4] border-[#86EFAC] shadow-xs"
                  : "bg-[#FAF8F5] border-[#E8DFD8]"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isView}
                  onClick={() => setCorrectOption("B")}
                  className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 ${
                    correctOption === "B"
                      ? "bg-[#16A34A] text-white shadow-xs"
                      : "bg-white text-[#7F6E60] border border-[#D1C5B8] hover:border-[#16A34A] hover:text-[#16A34A]"
                  }`}
                  title="Nhấn để chọn B làm đáp án đúng"
                >
                  B
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    disabled={isView}
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Nhập nội dung phương án B..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                  />
                </div>
                {correctOption === "B" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0">
                    <Check size={12} />
                    Đáp án đúng
                  </span>
                )}
              </div>
            </div>

            {/* OPTION C (If numOptions >= 3) */}
            {numOptions >= 3 && (
              <div
                className={`p-3 rounded-xl border transition-all ${
                  correctOption === "C"
                    ? "bg-[#F0FDF4] border-[#86EFAC] shadow-xs"
                    : "bg-[#FAF8F5] border-[#E8DFD8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isView}
                    onClick={() => setCorrectOption("C")}
                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 ${
                      correctOption === "C"
                        ? "bg-[#16A34A] text-white shadow-xs"
                        : "bg-white text-[#7F6E60] border border-[#D1C5B8] hover:border-[#16A34A] hover:text-[#16A34A]"
                    }`}
                    title="Nhấn để chọn C làm đáp án đúng"
                  >
                    C
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      disabled={isView}
                      value={optC}
                      onChange={(e) => setOptC(e.target.value)}
                      placeholder="Nhập nội dung phương án C..."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                    />
                  </div>
                  {correctOption === "C" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0">
                      <Check size={12} />
                      Đáp án đúng
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* OPTION D (If numOptions >= 4) */}
            {numOptions >= 4 && (
              <div
                className={`p-3 rounded-xl border transition-all ${
                  correctOption === "D"
                    ? "bg-[#F0FDF4] border-[#86EFAC] shadow-xs"
                    : "bg-[#FAF8F5] border-[#E8DFD8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isView}
                    onClick={() => setCorrectOption("D")}
                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 ${
                      correctOption === "D"
                        ? "bg-[#16A34A] text-white shadow-xs"
                        : "bg-white text-[#7F6E60] border border-[#D1C5B8] hover:border-[#16A34A] hover:text-[#16A34A]"
                    }`}
                    title="Nhấn để chọn D làm đáp án đúng"
                  >
                    D
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      disabled={isView}
                      value={optD}
                      onChange={(e) => setOptD(e.target.value)}
                      placeholder="Nhập nội dung phương án D..."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                    />
                  </div>
                  {correctOption === "D" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0">
                      <Check size={12} />
                      Đáp án đúng
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: GIẢI THÍCH ĐÁP ÁN (OPTIONAL) */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">
                4. Giải thích đáp án & Ghi chú chuyên môn (Tùy chọn)
              </h3>
              <p className="text-xs text-[#7F6E60]">
                Hiển thị cho học viên sau khi nộp bài để đối chiếu kiến thức
              </p>
            </div>
          </div>

          <textarea
            rows={2}
            disabled={isView}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Giải thích vì sao đáp án trên là đúng, trích dẫn tài liệu hoặc lưu ý lâm sàng thực tế..."
            className="w-full text-xs p-3 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
          />
        </div>

        {/* SECTION 5: DANH SÁCH CÂU HỎI HIỆN TẠI TRONG ĐỀ THI (ROADMAP / CONTEXT) */}
        {existingQuestions.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EAE4]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                  <ListChecks size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    5. Các câu hỏi đã có trong đề thi này
                  </h3>
                  <p className="text-xs text-[#7F6E60]">
                    Xem nhanh câu hỏi đã soạn để tránh trùng lặp nội dung
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
                {existingQuestions.length} câu đã soạn
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {existingQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EFE8DF] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-[#FAF0E4] text-[#985018] font-bold text-[11px] flex items-center justify-center shrink-0">
                      #{q.question_number}
                    </span>
                    <span className="text-[#2C241E] font-medium truncate">
                      {q.question_text}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] shrink-0">
                    Đúng: {q.correct_option}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

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
          {!isView && (
            <button
              type="button"
              onClick={() => setShowExcelModal(true)}
              className="px-3.5 py-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] text-xs font-bold text-[#15803D] hover:bg-[#DCFCE7] cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet size={14} className="text-[#16A34A]" />
              Nhập từ file Excel
            </button>
          )}

          {isCreate && (
            <button
              type="button"
              onClick={(e) => handleSave(e, true)}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-[#985018] bg-[#FAF0E4] text-xs font-bold text-[#985018] hover:bg-[#F3E2CE] cursor-pointer transition-colors flex items-center gap-1.5"
            >
              {busy && saveAndAddMore ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Lưu & Thêm câu tiếp theo
            </button>
          )}

          {!isView && (
            <button
              type="submit"
              form="question-form"
              disabled={busy}
              className="px-5 py-2 rounded-lg bg-[#985018] hover:bg-[#7D3E10] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {busy && !saveAndAddMore ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isCreate ? "Lưu câu hỏi" : "Lưu thay đổi"}
                </>
              )}
            </button>
          )}
        </div>
      </footer>

      {/* EXCEL IMPORT MODAL */}
      <ExcelQuizImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        quizId={quizId || undefined}
        onImportSuccess={(count) => {
          setSuccessBanner(`✓ Đã nhập thành công ${count} câu hỏi từ file Excel!`);
          onSaved();
          onClose();
        }}
      />
    </div>
  );
};
