import React, { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  HelpCircle,
  Check,
  Trash2,
  Sparkles,
  BookOpen,
  ListChecks,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface ParsedExcelQuestion {
  tempId: string;
  question_number: number;
  question_text: string;
  options: {
    A: string;
    B: string;
    C?: string;
    D?: string;
  };
  correct_option: string;
  explanation?: string;
  isValid: boolean;
  errors: string[];
}

export interface ExcelQuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If imported within an existing quiz
  quizId?: string;
  quizTitle?: string;
  // If imported within a new quiz that has not been saved to DB yet
  onStagedQuestions?: (questions: any[]) => void;
  // Callback when questions are successfully saved to DB
  onImportSuccess?: (count: number) => void;
}

export const ExcelQuizImportModal: React.FC<ExcelQuizImportModalProps> = ({
  isOpen,
  onClose,
  quizId: initialQuizId,
  quizTitle: initialQuizTitle,
  onStagedQuestions,
  onImportSuccess,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps: 'upload' -> 'preview' -> 'done'
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");

  // Lookups: existing quizzes & courses (if no quizId provided)
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Target Quiz Selection State
  const [targetMode, setTargetMode] = useState<"existing" | "new">(
    initialQuizId ? "existing" : "new"
  );
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId || "");
  const [newQuizCourseId, setNewQuizCourseId] = useState<string>("");
  const [newQuizTitle, setNewQuizTitle] = useState<string>("");
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState<number>(30);
  const [newQuizPassingScore, setNewQuizPassingScore] = useState<number>(8.0);

  // Parsed File Data
  const [fileName, setFileName] = useState<string>("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedExcelQuestion[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "invalid">("all");

  // UI / Status
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importedCount, setImportedCount] = useState<number>(0);

  // Load courses and quizzes if standalone
  useEffect(() => {
    let mounted = true;
    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [cRes, qRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/courses?select=id,title,code&order=title.asc`, {
            headers: getSupabaseHeaders(),
          }),
          fetch(
            `${SUPABASE_URL}/rest/v1/course_quizzes?select=id,title,course_id,total_questions,courses(title,code)&order=created_at.desc`,
            { headers: getSupabaseHeaders() }
          ),
        ]);

        const [cData, qData] = await Promise.all([cRes.json(), qRes.json()]);
        if (mounted) {
          if (Array.isArray(cData)) {
            setCourses(cData);
            if (!newQuizCourseId && cData.length > 0) {
              setNewQuizCourseId(cData[0].id);
            }
          }
          if (Array.isArray(qData)) {
            setQuizzes(qData);
            if (!selectedQuizId && qData.length > 0 && !initialQuizId) {
              setSelectedQuizId(qData[0].id);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải thông tin khóa học / đề thi:", err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    loadLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // 1. GENERATE & DOWNLOAD SAMPLE EXCEL FILE
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          STT: 1,
          "Nội dung câu hỏi":
            "Kỹ thuật dẫn lưu bạch huyết bằng tay (MLD) Vodder tác động chủ yếu lên tầng cấu trúc nào?",
          "Đáp án A": "Lớp cơ sâu và hệ gân xương",
          "Đáp án B": "Hệ mao mạch bạch huyết nông ngay dưới lớp biểu bì da",
          "Đáp án C": "Lớp mỡ nội tạng khoang bụng",
          "Đáp án D": "Màng xương và các khớp sụn",
          "Đáp án đúng (A/B/C/D)": "B",
          "Giải thích chi tiết (Tùy chọn)":
            "Phương pháp Vodder chuẩn y khoa tác động nhẹ nhàng lên mao mạch bạch huyết ban đầu ở trung bì với áp lực nhẹ 30-40 mmHg.",
        },
        {
          STT: 2,
          "Nội dung câu hỏi":
            "Áp lực chuẩn khi thực hiện kỹ thuật miết dẫn lưu bạch huyết Vodder là bao nhiêu?",
          "Đáp án A": "30 - 40 mmHg (nhẹ như vuốt cánh hoa)",
          "Đáp án B": "80 - 100 mmHg (áp lực massage thư giãn thông thường)",
          "Đáp án C": "120 - 140 mmHg (áp lực bấm huyệt sâu)",
          "Đáp án D": "Không cần kiểm soát áp lực",
          "Đáp án đúng (A/B/C/D)": "A",
          "Giải thích chi tiết (Tùy chọn)":
            "Áp lực 30-40 mmHg là ngưỡng tối ưu để mở van vi thể mao mạch bạch huyết mà không làm xẹp lòng mạch.",
        },
        {
          STT: 3,
          "Nội dung câu hỏi":
            "Trường hợp nào sau đây là CHỐNG CHỈ ĐỊNH tuyệt đối của kỹ thuật dẫn lưu bạch huyết?",
          "Đáp án A": "Phù nề nhẹ chi dưới sau sinh 1 tháng",
          "Đáp án B": "Viêm nhiễm cấp tính kèm sốt cao hoặc huyết khối tĩnh mạch sâu (DVT)",
          "Đáp án C": "Căng thẳng mệt mỏi sau ngày làm việc",
          "Đáp án D": "Khách hàng muốn săn chắc da toàn thân",
          "Đáp án đúng (A/B/C/D)": "B",
          "Giải thích chi tiết (Tùy chọn)":
            "Viêm cấp tính và DVT có nguy cơ làm lan rộng ổ nhiễm trùng hoặc bong cục máu đông gây thuyên tắc phổi.",
        },
        {
          STT: 4,
          "Nội dung câu hỏi":
            "Hạch bạch huyết vùng nào tiếp nhận dòng dẫn lưu từ phần lớn tuyến vú và chi trên?",
          "Đáp án A": "Hạch bẹn (Inguinal lymph nodes)",
          "Đáp án B": "Hạch nách (Axillary lymph nodes)",
          "Đáp án C": "Hạch cổ nông (Cervical lymph nodes)",
          "Đáp án D": "Hạch mạc treo ruột",
          "Đáp án đúng (A/B/C/D)": "B",
          "Giải thích chi tiết (Tùy chọn)":
            "Khoảng 75% lượng bạch huyết từ tuyến vú và toàn bộ cánh tay dẫn lưu về cụm hạch nách.",
        },
        {
          STT: 5,
          "Nội dung câu hỏi":
            "Tốc độ nhịp xoa miết Vodder lý tưởng trong điều trị phù bạch huyết là?",
          "Đáp án A": "Rất nhanh, trên 60 nhịp/phút",
          "Đáp án B": "Chậm rãi, nhịp nhàng khoảng 10 - 12 nhịp/phút theo nhịp co bóp sinh học lymphangion",
          "Đáp án C": "Càng chậm càng tốt, 1 nhịp/phút",
          "Đáp án D": "Tùy ý kỹ thuật viên",
          "Đáp án đúng (A/B/C/D)": "B",
          "Giải thích chi tiết (Tùy chọn)":
            "Hệ thống lymphangion co bóp tự nhiên khoảng 10-12 lần/phút trong trạng thái nghỉ ngơi.",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);

      // Auto-fit column widths
      worksheet["!cols"] = [
        { wch: 6 }, // STT
        { wch: 50 }, // Câu hỏi
        { wch: 30 }, // A
        { wch: 30 }, // B
        { wch: 30 }, // C
        { wch: 30 }, // D
        { wch: 15 }, // Đáp án đúng
        { wch: 45 }, // Giải thích
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "NganHangCauHoi");
      XLSX.writeFile(workbook, "Mau_Cau_Hoi_Trac_Nghiem_MLD.xlsx");
    } catch (err: any) {
      alert("Lỗi khi tạo file mẫu Excel: " + err.message);
    }
  };

  // 2. PARSE EXCEL / CSV FILE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    setIsProcessingFile(true);
    setErrorMessage("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Read rows as array of objects
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: "",
        });

        if (rawRows.length === 0) {
          setErrorMessage("File Excel không có dữ liệu hoặc bảng tính bị trống.");
          setIsProcessingFile(false);
          return;
        }

        // Helper to match column names flexibly
        const findVal = (rowObj: Record<string, any>, patterns: string[]): string => {
          for (const key of Object.keys(rowObj)) {
            const cleanKey = key.trim().toLowerCase();
            for (const p of patterns) {
              if (cleanKey.includes(p.toLowerCase())) {
                return String(rowObj[key] ?? "").trim();
              }
            }
          }
          return "";
        };

        const parsed: ParsedExcelQuestion[] = rawRows.map((rowObj, index) => {
          const qNum =
            Number(findVal(rowObj, ["stt", "số tt", "no", "number", "câu số"])) ||
            index + 1;
          const qText = findVal(rowObj, ["nội dung", "câu hỏi", "question", "content"]);
          const optA = findVal(rowObj, ["đáp án a", "phương án a", "a.", "opt_a", "option a", "a"]);
          const optB = findVal(rowObj, ["đáp án b", "phương án b", "b.", "opt_b", "option b", "b"]);
          const optC = findVal(rowObj, ["đáp án c", "phương án c", "c.", "opt_c", "option c", "c"]);
          const optD = findVal(rowObj, ["đáp án d", "phương án d", "d.", "opt_d", "option d", "d"]);
          const rawCorrect = findVal(rowObj, ["đáp án đúng", "đúng", "correct", "key", "answer"]);
          const explanation = findVal(rowObj, ["giải thích", "ghi chú", "lời giải", "explanation", "note"]);

          // Extract correct option A/B/C/D
          let cleanCorrect = "";
          const matchCorrect = rawCorrect.toUpperCase().match(/[A-D]/);
          if (matchCorrect) {
            cleanCorrect = matchCorrect[0];
          }

          const errors: string[] = [];
          if (!qText || qText.length < 3) {
            errors.push("Thiếu nội dung câu hỏi");
          }
          if (!optA || !optB) {
            errors.push("Cần có ít nhất 2 đáp án (A và B)");
          }
          if (!cleanCorrect) {
            errors.push(`Đáp án đúng không hợp lệ (nhận '${rawCorrect || "trống"}', yêu cầu A, B, C, hoặc D)`);
          }

          const options: { A: string; B: string; C?: string; D?: string } = {
            A: optA,
            B: optB,
          };
          if (optC) options.C = optC;
          if (optD) options.D = optD;

          return {
            tempId: `excel-q-${index + 1}-${Date.now()}`,
            question_number: qNum,
            question_text: qText,
            options,
            correct_option: cleanCorrect || "A",
            explanation: explanation || undefined,
            isValid: errors.length === 0,
            errors,
          };
        });

        // Auto sort by question_number
        parsed.sort((a, b) => a.question_number - b.question_number);

        setParsedQuestions(parsed);
        setStep("preview");

        // Set default title for new quiz if empty
        if (!newQuizTitle && file.name) {
          const cleanName = file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ")
            .trim();
          setNewQuizTitle(`Bài trắc nghiệm: ${cleanName}`);
        }
      } catch (err: any) {
        console.error("Lỗi khi đọc file Excel:", err);
        setErrorMessage("Không thể đọc định dạng file. Vui lòng đảm bảo file là .xlsx, .xls hoặc .csv chuẩn.");
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Lỗi khi tải file từ thiết bị.");
      setIsProcessingFile(false);
    };

    reader.readAsBinaryString(file);
  };

  // Delete a parsed question from preview
  const handleDeleteParsedQuestion = (tempId: string) => {
    setParsedQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  };

  // Metrics
  const validQuestions = parsedQuestions.filter((q) => q.isValid);
  const invalidQuestions = parsedQuestions.filter((q) => !q.isValid);
  const displayedQuestions =
    filterTab === "all"
      ? parsedQuestions
      : filterTab === "valid"
      ? validQuestions
      : invalidQuestions;

  // 3. EXECUTE IMPORT
  const handleConfirmImport = async () => {
    if (validQuestions.length === 0) {
      setErrorMessage("Không có câu hỏi hợp lệ nào để nhập vào hệ thống.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // SCENARIO 1: Staging inside an unsaved QuizEditorSheet form
      if (onStagedQuestions && !initialQuizId && targetMode === "new") {
        onStagedQuestions(
          validQuestions.map((q, idx) => ({
            id: undefined,
            question_number: idx + 1,
            question_text: q.question_text,
            options: q.options,
            correct_option: q.correct_option,
            explanation: q.explanation || "",
          }))
        );
        setImportedCount(validQuestions.length);
        setStep("done");
        if (onImportSuccess) onImportSuccess(validQuestions.length);
        return;
      }

      let activeQuizId = initialQuizId || selectedQuizId;

      // SCENARIO 2: Create a NEW Quiz right now in Supabase
      if (targetMode === "new" || !activeQuizId) {
        if (!newQuizCourseId) {
          throw new Error("Vui lòng chọn khóa học đào tạo áp dụng cho bài thi.");
        }
        if (!newQuizTitle.trim()) {
          throw new Error("Vui lòng nhập tên / tiêu đề bài trắc nghiệm.");
        }

        const quizPayload = {
          course_id: newQuizCourseId,
          title: newQuizTitle.trim(),
          total_questions: validQuestions.length,
          time_limit_minutes: Number(newQuizTimeLimit) || 30,
          passing_score: Number(newQuizPassingScore) || 8.0,
        };

        const createQuizRes = await fetch(`${SUPABASE_URL}/rest/v1/course_quizzes`, {
          method: "POST",
          headers: getSupabaseHeaders({
            "Content-Type": "application/json",
            Prefer: "return=representation",
          }),
          body: JSON.stringify(quizPayload),
        });

        if (!createQuizRes.ok) {
          const errData = await createQuizRes.json().catch(() => null);
          throw new Error(errData?.message || "Không thể tạo bài trắc nghiệm mới trên cơ sở dữ liệu.");
        }

        const createdQuiz = await createQuizRes.json();
        if (Array.isArray(createdQuiz) && createdQuiz[0]?.id) {
          activeQuizId = createdQuiz[0].id;
        } else {
          throw new Error("Phản hồi tạo bài thi không hợp lệ từ máy chủ.");
        }
      }

      if (!activeQuizId) {
        throw new Error("Chưa xác định được bài trắc nghiệm mục tiêu.");
      }

      // Batch insert valid questions into quiz_questions
      const questionsPayload = validQuestions.map((q, idx) => ({
        quiz_id: activeQuizId,
        question_number: idx + 1,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation || null,
      }));

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/quiz_questions`, {
        method: "POST",
        headers: getSupabaseHeaders({
          "Content-Type": "application/json",
          Prefer: "return=representation",
        }),
        body: JSON.stringify(questionsPayload),
      });

      if (!insertRes.ok) {
        const errData = await insertRes.json().catch(() => null);
        throw new Error(errData?.message || "Không thể lưu danh sách câu hỏi vào cơ sở dữ liệu.");
      }

      // Update total_questions in the quiz to reflect newly added questions
      try {
        const countRes = await fetch(
          `${SUPABASE_URL}/rest/v1/quiz_questions?quiz_id=eq.${encodeURIComponent(
            activeQuizId
          )}&select=id`,
          { headers: getSupabaseHeaders() }
        );
        const countData = await countRes.json();
        if (Array.isArray(countData)) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/course_quizzes?id=eq.${encodeURIComponent(
              activeQuizId
            )}`,
            {
              method: "PATCH",
              headers: getSupabaseHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({ total_questions: countData.length }),
            }
          );
        }
      } catch (e) {
        console.warn("Không thể cập nhật lại tổng số câu hỏi của bài thi:", e);
      }

      setImportedCount(validQuestions.length);
      setStep("done");
      if (onImportSuccess) {
        onImportSuccess(validQuestions.length);
      }
    } catch (err: any) {
      console.error("Lỗi khi nhập câu hỏi từ Excel:", err);
      setErrorMessage(err.message || "Đã xảy ra lỗi trong quá trình nhập dữ liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FDFBF7] rounded-2xl border border-[#E8DFD8] w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-[#2C241E]">
        {/* HEADER */}
        <header className="px-6 py-4 bg-white border-b border-[#E8DFD8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0E4] text-[#985018] flex items-center justify-center border border-[#E8DFD8] shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#985018] bg-[#FAF0E4] px-2 py-0.5 rounded-full border border-[#E8DFD8]">
                  Excel Import Tool
                </span>
                <span className="text-xs text-[#7F6E60]">
                  {step === "upload"
                    ? "Bước 1: Tải file dữ liệu"
                    : step === "preview"
                    ? "Bước 2: Kiểm tra & Xác nhận"
                    : "Hoàn tất nhập liệu"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C241E] mt-0.5">
                Nhập câu hỏi trắc nghiệm từ file Excel (.xlsx)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#7F6E60] hover:text-[#2C241E] hover:bg-[#FAF0E4] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center gap-2.5 text-xs text-[#991B1B] font-medium shadow-xs">
              <AlertCircle size={16} className="text-[#DC2626] shrink-0" />
              <div className="flex-1">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-6">
              {/* Template guidance box */}
              <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#2C241E] flex items-center gap-2">
                      <Download size={16} className="text-[#985018]" />
                      1. Tải mẫu Excel chuẩn y khoa của Học viện MLD
                    </h4>
                    <p className="text-xs text-[#7F6E60] leading-relaxed">
                      Sử dụng file mẫu có sẵn cấu trúc: STT, Nội dung câu hỏi, 4 đáp án (A, B, C, D), Đáp án đúng và Giải thích chi tiết.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2.5 rounded-xl bg-[#FAF0E4] hover:bg-[#F3E2D0] border border-[#E8DFD8] text-[#985018] text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer shrink-0 transition-all"
                  >
                    <Download size={15} />
                    Tải file Excel mẫu (.xlsx)
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F0EAE4] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#7F6E60]">
                  <div className="bg-[#FAF8F5] p-2 rounded-lg border border-[#EFE8DF]">
                    <span className="font-bold text-[#2C241E] block mb-0.5">Cột A: STT</span>
                    Số thứ tự câu hỏi trong đề
                  </div>
                  <div className="bg-[#FAF8F5] p-2 rounded-lg border border-[#EFE8DF]">
                    <span className="font-bold text-[#2C241E] block mb-0.5">Cột B: Câu hỏi</span>
                    Nội dung câu hỏi trắc nghiệm
                  </div>
                  <div className="bg-[#FAF8F5] p-2 rounded-lg border border-[#EFE8DF]">
                    <span className="font-bold text-[#2C241E] block mb-0.5">Cột C–F: Đáp án</span>
                    Lựa chọn A, B, C, D
                  </div>
                  <div className="bg-[#FAF8F5] p-2 rounded-lg border border-[#EFE8DF]">
                    <span className="font-bold text-[#2C241E] block mb-0.5">Cột G: Đáp án đúng</span>
                    Chữ cái A, B, C, hoặc D
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D4C3B3] hover:border-[#985018] bg-white hover:bg-[#FAF5EF] rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-full bg-[#FAF0E4] text-[#985018] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-xs">
                  {isProcessingFile ? (
                    <LoaderCircle size={28} className="animate-spin text-[#985018]" />
                  ) : (
                    <Upload size={28} />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#2C241E]">
                    {isProcessingFile
                      ? "Đang phân tích cú pháp câu hỏi trong file..."
                      : "Kéo thả file Excel vào đây hoặc nhấp để chọn file"}
                  </h4>
                  <p className="text-xs text-[#7F6E60] mt-1">
                    Hỗ trợ định dạng: Microsoft Excel (.xlsx, .xls) hoặc tệp phân tách (.csv)
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FAF8F5] text-[#985018] border border-[#EFE8DF]">
                  <Sparkles size={12} />
                  Tự động kiểm tra tính hợp lệ & định dạng câu hỏi
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & TARGET QUIZ ASSIGNMENT */}
          {step === "preview" && (
            <div className="space-y-6">
              {/* Target Quiz Binding */}
              <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-[#985018]" />
                    <h4 className="text-sm font-bold text-[#2C241E]">
                      Đích đến: Bài trắc nghiệm sẽ nhận câu hỏi
                    </h4>
                  </div>

                  {initialQuizTitle && (
                    <span className="text-xs font-bold text-[#985018] bg-[#FAF0E4] px-2.5 py-1 rounded-full border border-[#E8DFD8]">
                      Đang gắn với: {initialQuizTitle}
                    </span>
                  )}
                </div>

                {!initialQuizId && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targetMode"
                          checked={targetMode === "new"}
                          onChange={() => setTargetMode("new")}
                          className="accent-[#985018]"
                        />
                        <span>Tạo bài trắc nghiệm mới và nhập ngay</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targetMode"
                          checked={targetMode === "existing"}
                          onChange={() => setTargetMode("existing")}
                          className="accent-[#985018]"
                        />
                        <span>Nhập vào bài trắc nghiệm đã có sẵn</span>
                      </label>
                    </div>

                    {targetMode === "new" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                            Khóa học áp dụng <span className="text-[#DC2626]">*</span>
                          </label>
                          <select
                            required
                            value={newQuizCourseId}
                            onChange={(e) => setNewQuizCourseId(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
                          >
                            <option value="">-- Chọn khóa học đào tạo --</option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code ? `[${c.code}] ` : ""}
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                            Tiêu đề bài trắc nghiệm <span className="text-[#DC2626]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newQuizTitle}
                            onChange={(e) => setNewQuizTitle(e.target.value)}
                            placeholder="Nhập tên bài thi (ví dụ: Thi hết môn MLD Level 0)..."
                            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                            Thời gian làm bài (Phút)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="180"
                            value={newQuizTimeLimit}
                            onChange={(e) => setNewQuizTimeLimit(Number(e.target.value) || 30)}
                            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                            Điểm đạt chuẩn (Thang 10)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="10"
                            value={newQuizPassingScore}
                            onChange={(e) => setNewQuizPassingScore(Number(e.target.value) || 8.0)}
                            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                          Chọn đề thi nhận câu hỏi <span className="text-[#DC2626]">*</span>
                        </label>
                        <select
                          required
                          value={selectedQuizId}
                          onChange={(e) => setSelectedQuizId(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#E8DFD8] bg-white font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
                        >
                          <option value="">-- Chọn bài trắc nghiệm --</option>
                          {quizzes.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.title} ({q.courses?.code || "Khóa học"} · Hiện có {q.total_questions || 0} câu)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8DFD8] shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7F6E60]">File:</span>
                  <span className="text-xs font-bold text-[#2C241E] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#EFE8DF] flex items-center gap-1.5">
                    <FileSpreadsheet size={13} className="text-[#985018]" />
                    {fileName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      filterTab === "all"
                        ? "bg-[#2C241E] text-white"
                        : "bg-[#FAF8F5] text-[#7F6E60] hover:bg-[#F0EAE4]"
                    }`}
                  >
                    Tất cả ({parsedQuestions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterTab("valid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      filterTab === "valid"
                        ? "bg-[#047857] text-white"
                        : "bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]"
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    Hợp lệ ({validQuestions.length})
                  </button>

                  {invalidQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTab("invalid")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        filterTab === "invalid"
                          ? "bg-[#DC2626] text-white"
                          : "bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]"
                      }`}
                    >
                      <AlertCircle size={13} />
                      Lỗi ({invalidQuestions.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="bg-white rounded-xl border border-[#E8DFD8] overflow-hidden shadow-xs">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAF5EF] text-[#4A3E31] font-bold sticky top-0 z-10 border-b border-[#E8DFD8]">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">STT</th>
                        <th className="py-3 px-4 min-w-[240px]">Nội dung câu hỏi</th>
                        <th className="py-3 px-4 min-w-[200px]">Các đáp án lựa chọn</th>
                        <th className="py-3 px-3 w-24 text-center">Đáp án đúng</th>
                        <th className="py-3 px-4 min-w-[160px]">Giải thích</th>
                        <th className="py-3 px-3 w-28 text-center">Trạng thái</th>
                        <th className="py-3 px-2 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE4]">
                      {displayedQuestions.map((q) => (
                        <tr
                          key={q.tempId}
                          className={`hover:bg-[#FAF8F5] transition-colors ${
                            !q.isValid ? "bg-[#FFF5F5]" : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-bold text-[#7F6E60]">
                            #{q.question_number}
                          </td>

                          <td className="py-3 px-4 font-semibold text-[#2C241E] align-top">
                            {q.question_text || (
                              <span className="italic text-[#DC2626]">Chưa có nội dung</span>
                            )}
                          </td>

                          <td className="py-3 px-4 space-y-1 align-top text-[11px]">
                            <div
                              className={`px-2 py-0.5 rounded ${
                                q.correct_option === "A"
                                  ? "bg-[#ECFDF5] font-bold text-[#047857] border border-[#A7F3D0]"
                                  : "text-[#4A3E31]"
                              }`}
                            >
                              <span className="font-bold">A:</span> {q.options.A || "---"}
                            </div>
                            <div
                              className={`px-2 py-0.5 rounded ${
                                q.correct_option === "B"
                                  ? "bg-[#ECFDF5] font-bold text-[#047857] border border-[#A7F3D0]"
                                  : "text-[#4A3E31]"
                              }`}
                            >
                              <span className="font-bold">B:</span> {q.options.B || "---"}
                            </div>
                            {q.options.C && (
                              <div
                                className={`px-2 py-0.5 rounded ${
                                  q.correct_option === "C"
                                    ? "bg-[#ECFDF5] font-bold text-[#047857] border border-[#A7F3D0]"
                                    : "text-[#4A3E31]"
                                }`}
                              >
                                <span className="font-bold">C:</span> {q.options.C}
                              </div>
                            )}
                            {q.options.D && (
                              <div
                                className={`px-2 py-0.5 rounded ${
                                  q.correct_option === "D"
                                    ? "bg-[#ECFDF5] font-bold text-[#047857] border border-[#A7F3D0]"
                                    : "text-[#4A3E31]"
                                }`}
                              >
                                <span className="font-bold">D:</span> {q.options.D}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center align-top">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                                q.correct_option
                                  ? "bg-[#985018] text-white"
                                  : "bg-[#FEE2E2] text-[#DC2626]"
                              }`}
                            >
                              {q.correct_option || "?"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-[#7F6E60] text-[11px] align-top">
                            {q.explanation || (
                              <span className="italic text-[#9C8B7D]">Không có</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center align-top">
                            {q.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                                <CheckCircle2 size={11} />
                                Hợp lệ
                              </span>
                            ) : (
                              <div className="space-y-0.5 text-left">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                                  <AlertCircle size={11} />
                                  Lỗi
                                </span>
                                <div className="text-[10px] text-[#DC2626] leading-tight">
                                  {q.errors.join(", ")}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center align-top">
                            <button
                              type="button"
                              onClick={() => handleDeleteParsedQuestion(q.tempId)}
                              className="text-[#9C8B7D] hover:text-[#DC2626] p-1 rounded hover:bg-[#FAF0E4] cursor-pointer"
                              title="Xóa câu này khỏi danh sách nhập"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DONE */}
          {step === "done" && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center mx-auto border-2 border-[#A7F3D0] shadow-sm animate-in zoom-in-75 duration-200">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#2C241E]">
                  Nhập thành công {importedCount} câu hỏi trắc nghiệm!
                </h4>
                <p className="text-xs text-[#7F6E60] max-w-md mx-auto mt-1 leading-relaxed">
                  Toàn bộ câu hỏi đã được nạp chuẩn xác vào hệ thống khảo thí của Học viện MLD. Học viên có thể tham gia làm bài ngay.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#985018] hover:bg-[#7D3E10] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="px-6 py-4 bg-white border-t border-[#E8DFD8] flex items-center justify-between shrink-0">
          <div>
            {step === "preview" && (
              <button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setParsedQuestions([]);
                }}
                className="px-4 py-2 rounded-xl border border-[#E8DFD8] bg-white text-[#7F6E60] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                Chọn file khác
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8DFD8] bg-white text-[#7F6E60] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>

            {step === "preview" && (
              <button
                type="button"
                disabled={isSubmitting || validQuestions.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl bg-[#985018] hover:bg-[#7D3E10] text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    Đang nạp câu hỏi vào bài thi...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Xác nhận nhập ({validQuestions.length} câu hợp lệ)
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
