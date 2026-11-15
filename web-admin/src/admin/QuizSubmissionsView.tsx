import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  X,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
  Award,
} from "lucide-react";
import type { Row } from "./api";

export interface QuizSubmissionsViewProps {
  rows: Row[];
  loading?: boolean;
  error?: string | null;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  canViewEnrollment?: boolean;
  canViewQuiz?: boolean;
}

/** Formats date into Vietnamese standard: dd/MM/yyyy HH:mm */
function formatSubmissionDate(dateStr?: string | null): string {
  if (!dateStr) return "Chưa có dữ liệu";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
}

/** Extracts the canonical student name, prioritizing course_enrollments.student_name */
export function getStudentDisplayName(row: Row): string {
  const enrollmentName = row.student_name || row.course_enrollments?.student_name;
  if (enrollmentName && String(enrollmentName).trim()) {
    return String(enrollmentName).trim();
  }
  const userFullName = row.user_full_name || row.users?.full_name || row.student?.full_name;
  if (userFullName && String(userFullName).trim()) {
    return String(userFullName).trim();
  }
  return "Chưa có dữ liệu";
}

/** Formats the score accurately: 0 is rendered as 0 or 0.00, null/undefined as "Chưa có dữ liệu" */
export function formatScore(score: unknown): string {
  if (score === null || score === undefined || score === "") {
    return "Chưa có dữ liệu";
  }
  const num = Number(score);
  if (isNaN(num)) return String(score);
  return Number.isInteger(num) ? `${num}.00` : num.toFixed(2);
}

/** Formats correct questions: x/y if total_questions is reliable, else x */
export function formatCorrectCount(correctCount: unknown, totalQuestions: unknown): string {
  if (correctCount === null || correctCount === undefined || correctCount === "") {
    return "Chưa có dữ liệu";
  }
  const correct = Number(correctCount);
  const total = totalQuestions !== null && totalQuestions !== undefined && totalQuestions !== "" ? Number(totalQuestions) : null;
  if (total !== null && !isNaN(total) && total > 0) {
    return `${correct}/${total} câu`;
  }
  return `${correct} câu`;
}

export function QuizSubmissionsView({
  rows,
  loading = false,
  error = null,
  hasFilters = false,
  onClearFilters,
  canViewEnrollment = true,
  canViewQuiz = true,
}: QuizSubmissionsViewProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Row | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#EAD8C7] bg-white p-12 text-center shadow-xs">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#D9A373] border-t-[#8A4F23]" />
        <p className="mt-4 text-sm font-medium text-[#73675F]">Đang tải danh sách bài đã nộp…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#F8D7DA] bg-[#FFF5F5] p-8 text-center shadow-xs">
        <AlertTriangle className="mx-auto h-8 w-8 text-[#DC2626]" />
        <h3 className="mt-2 text-base font-bold text-[#991B1B]">Không thể tải danh sách bài nộp</h3>
        <p className="mt-1 text-sm text-[#7F1D1D]">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    if (hasFilters) {
      return (
        <div className="rounded-2xl border border-[#EAD8C7] bg-white px-6 py-14 text-center shadow-xs">
          <HelpCircle className="mx-auto h-10 w-10 text-[#C4A482]" />
          <h3 className="mt-3 text-base font-bold text-[#2C241E]">Không tìm thấy bài nộp phù hợp</h3>
          <p className="mt-1 text-xs text-[#73675F] max-w-md mx-auto">
            Không có bài nộp nào khớp với điều kiện tìm kiếm và bộ lọc hiện tại. Hãy thử chọn khóa học, đề thi khác hoặc đặt lại bộ lọc.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#EAD8C7] bg-[#FAF7F2] px-4 py-2 text-xs font-semibold text-[#8A4F23] hover:bg-[#F3ECE4] transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-[#EAD8C7] bg-white px-6 py-14 text-center shadow-xs">
        <FileText className="mx-auto h-10 w-10 text-[#C4A482]" />
        <h3 className="mt-3 text-base font-bold text-[#2C241E]">Chưa có bài thi nào được nộp</h3>
        <p className="mt-1 text-xs text-[#73675F] max-w-md mx-auto">
          Hệ thống sẽ tự động lưu và hiển thị kết quả tại đây ngay khi học viên hoàn thành bài kiểm tra trắc nghiệm trên ứng dụng.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-table-wrap overflow-x-auto rounded-2xl border border-[#EAD8C7] bg-white shadow-xs">
        <table className="admin-table w-full text-left">
          <caption className="sr-only">Danh sách bài kiểm tra đã nộp</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[22%]">Học viên</th>
              <th scope="col" className="w-[30%]">Đề thi / Khóa học</th>
              <th scope="col" className="w-[14%]">Ngày nộp</th>
              <th scope="col" className="w-[10%] text-center">Điểm</th>
              <th scope="col" className="w-[11%] text-center">Số câu đúng</th>
              <th scope="col" className="w-[10%] text-center">Kết quả</th>
              <th scope="col" className="w-[3%] text-right pr-4">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const studentName = getStudentDisplayName(row);
              const userAccountName = row.user_full_name || row.users?.full_name || row.student?.full_name;
              const isRegisteredForOther = Boolean(
                userAccountName &&
                studentName !== "Chưa có dữ liệu" &&
                studentName.toLowerCase() !== String(userAccountName).trim().toLowerCase()
              );
              const phone = row.student_phone || row.course_enrollments?.student_phone || row.users?.phone;
              const quizTitle = row.quiz_title || row.course_quizzes?.title || "Chưa có dữ liệu";
              const courseTitle = row.course_title || row.course_enrollments?.courses?.title;
              const totalQuestions = row.total_questions || row.course_quizzes?.total_questions;
              const isPassed = row.passed;

              return (
                <tr key={String(row.id)} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  {/* Cột Học viên */}
                  <td className="py-3.5">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmission(row)}
                        className="text-left font-bold text-[#8A4F23] hover:underline flex items-center gap-1.5"
                      >
                        <User size={14} className="shrink-0 text-[#C4A482]" />
                        <span>{studentName}</span>
                      </button>
                      {phone && (
                        <span className="text-[11px] text-[#73675F] ml-5">{phone}</span>
                      )}
                      {isRegisteredForOther && (
                        <span
                          className="mt-1 ml-5 inline-block text-[10px] text-[#8A4F23] bg-[#FAF0E4] px-1.5 py-0.5 rounded border border-[#EAD8C7] max-w-fit"
                          title={`Tài khoản ứng dụng đăng ký hộ: ${userAccountName}`}
                        >
                          Đăng ký bởi: {userAccountName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cột Đề thi / Khóa học */}
                  <td className="py-3.5">
                    <div className="flex flex-col max-w-[340px]">
                      <span
                        className="font-medium text-[#2C241E] line-clamp-2 leading-snug cursor-help"
                        title={quizTitle}
                      >
                        {quizTitle}
                      </span>
                      {courseTitle ? (
                        <span
                          className="mt-1 text-[11px] text-[#73675F] line-clamp-1 flex items-center gap-1"
                          title={courseTitle}
                        >
                          <BookOpen size={11} className="shrink-0 text-[#C4A482]" />
                          <span>{courseTitle}</span>
                        </span>
                      ) : (
                        <span className="mt-1 text-[11px] text-[#A69788] italic">Khóa học chưa liên kết</span>
                      )}
                    </div>
                  </td>

                  {/* Cột Ngày nộp */}
                  <td className="py-3.5 text-xs text-[#73675F] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="shrink-0 text-[#C4A482]" />
                      <span>{formatSubmissionDate(row.submitted_at)}</span>
                    </div>
                  </td>

                  {/* Cột Điểm */}
                  <td className="py-3.5 text-center">
                    <span className="font-bold text-sm text-[#2C241E]">
                      {formatScore(row.score)}
                    </span>
                  </td>

                  {/* Cột Số câu đúng */}
                  <td className="py-3.5 text-center text-xs text-[#73675F]">
                    {formatCorrectCount(row.correct_count, totalQuestions)}
                  </td>

                  {/* Cột Kết quả */}
                  <td className="py-3.5 text-center">
                    {isPassed === true ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F6ED] px-2.5 py-1 text-[11px] font-bold text-[#14734D] border border-[#BDE8CF]">
                        <CheckCircle2 size={12} className="shrink-0" />
                        Đạt
                      </span>
                    ) : isPassed === false ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF2F2] px-2.5 py-1 text-[11px] font-bold text-[#DC2626] border border-[#FECACA]">
                        <XCircle size={12} className="shrink-0" />
                        Chưa đạt
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#F3ECE4] px-2.5 py-1 text-[11px] font-medium text-[#73675F]">
                        Chưa có dữ liệu
                      </span>
                    )}
                  </td>

                  {/* Cột Thao tác: Chỉ nút Xem bài */}
                  <td className="py-3.5 text-right pr-4">
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(row)}
                      className="admin-secondary inline-flex items-center gap-1.5 !px-3 !py-1 text-xs whitespace-nowrap hover:bg-[#FAF0E4] hover:text-[#8A4F23] transition-colors"
                      title="Xem chi tiết kết quả bài nộp"
                    >
                      <Eye size={13} />
                      <span>Xem bài</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal / Dialog Chi tiết bài nộp */}
      {selectedSubmission && (
        <QuizSubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          canViewEnrollment={canViewEnrollment}
          canViewQuiz={canViewQuiz}
        />
      )}
    </>
  );
}

/** Component Modal chi tiết bài nộp (Chỉ đọc) */
function QuizSubmissionDetailModal({
  submission,
  onClose,
  canViewEnrollment,
  canViewQuiz,
}: {
  submission: Row;
  onClose: () => void;
  canViewEnrollment: boolean;
  canViewQuiz: boolean;
}) {
  const studentName = getStudentDisplayName(submission);
  const userAccountName = submission.user_full_name || submission.users?.full_name || submission.student?.full_name;
  const isRegisteredForOther = Boolean(
    userAccountName &&
    studentName !== "Chưa có dữ liệu" &&
    studentName.toLowerCase() !== String(userAccountName).trim().toLowerCase()
  );
  const phone = submission.student_phone || submission.course_enrollments?.student_phone || submission.users?.phone;
  const email = submission.student_email || submission.course_enrollments?.student_email || submission.users?.email;
  const quizTitle = submission.quiz_title || submission.course_quizzes?.title || "Chưa có dữ liệu";
  const courseTitle = submission.course_title || submission.course_enrollments?.courses?.title;
  const totalQuestions = submission.total_questions || submission.course_quizzes?.total_questions;
  const passingScore = submission.passing_score || submission.course_quizzes?.passing_score;
  const enrollmentId = submission.enrollment_id;
  const quizId = submission.quiz_id;

  // Answers breakdown
  let parsedAnswers: Record<string, string> = {};
  if (submission.submitted_answers) {
    if (typeof submission.submitted_answers === "object") {
      parsedAnswers = submission.submitted_answers as Record<string, string>;
    } else if (typeof submission.submitted_answers === "string") {
      try {
        parsedAnswers = JSON.parse(submission.submitted_answers);
      } catch {
        parsedAnswers = {};
      }
    }
  }
  const answerEntries = Object.entries(parsedAnswers).sort(([a], [b]) => {
    const na = Number(a);
    const nb = Number(b);
    return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-submission-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-[#EAD8C7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAD8C7] bg-[#FAF7F2] px-6 py-4">
          <div>
            <h2 id="quiz-submission-modal-title" className="text-base font-bold text-[#2C241E] flex items-center gap-2">
              <FileText size={18} className="text-[#8A4F23]" />
              Chi tiết bài nộp #{String(submission.id).slice(0, 8)}
            </h2>
            <p className="text-xs text-[#73675F] mt-0.5">
              Thời gian nộp: {formatSubmissionDate(submission.submitted_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#73675F] hover:bg-[#F3ECE4] hover:text-[#2C241E] transition-colors"
            title="Đóng cửa sổ"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card 1: Học viên & Hồ sơ */}
          <div className="rounded-xl border border-[#EAD8C7] bg-[#FFFDF9] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5 mb-3">
              <User size={14} />
              Thông tin học viên
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#73675F] block">Tên học viên:</span>
                <span className="font-bold text-[#2C241E] text-sm">{studentName}</span>
                {isRegisteredForOther && (
                  <div className="mt-1 text-[11px] text-[#8A4F23] bg-[#FAF0E4] px-2 py-0.5 rounded border border-[#EAD8C7]">
                    Tài khoản đăng ký: <strong>{userAccountName}</strong>
                  </div>
                )}
              </div>
              <div>
                <span className="text-[#73675F] block">Liên hệ:</span>
                <span className="font-medium text-[#2C241E]">
                  {phone || "Chưa có SĐT"} {email ? `· ${email}` : ""}
                </span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-[#F0E6DC] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[#73675F] mr-2">Mã hồ sơ ghi danh:</span>
                  <span className="font-mono font-medium text-[#2C241E]">
                    {submission.order_code || (enrollmentId ? `#${String(enrollmentId).slice(0, 8)}` : "Chưa có")}
                  </span>
                </div>
                {enrollmentId && canViewEnrollment && (
                  <Link
                    to={`/manage/course_enrollments?filter=${encodeURIComponent(JSON.stringify({ id: String(enrollmentId) }))}`}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#8A4F23] hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Mở hồ sơ ghi danh</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Đề thi & Khóa học */}
          <div className="rounded-xl border border-[#EAD8C7] bg-[#FFFDF9] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5 mb-3">
              <BookOpen size={14} />
              Đề thi &amp; Khóa học
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <span className="text-[#73675F] block">Tên đề thi:</span>
                <span className="font-bold text-[#2C241E] text-sm">{quizTitle}</span>
              </div>
              <div>
                <span className="text-[#73675F] block">Khóa học đào tạo:</span>
                <span className="font-medium text-[#2C241E]">{courseTitle || "Chưa liên kết khóa học"}</span>
              </div>
              <div>
                <span className="text-[#73675F] block">Ngưỡng điểm đạt:</span>
                <span className="font-medium text-[#2C241E]">
                  {passingScore ? `${passingScore} điểm` : "Chưa có dữ liệu"}
                </span>
              </div>
              {quizId && canViewQuiz && (
                <div className="sm:col-span-2 pt-2 border-t border-[#F0E6DC] text-right">
                  <Link
                    to={`/manage/course_quizzes?filter=${encodeURIComponent(JSON.stringify({ id: String(quizId) }))}`}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#8A4F23] hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Mở chi tiết đề thi</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Kết quả bài nộp */}
          <div className="rounded-xl border border-[#EAD8C7] bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5 mb-3">
              <Award size={14} />
              Kết quả bài thi
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-[#FAF7F2] p-3 border border-[#EAD8C7]">
                <span className="text-[11px] text-[#73675F] block">Điểm số</span>
                <span className="text-xl font-black text-[#2C241E] mt-0.5 block">
                  {formatScore(submission.score)}
                </span>
              </div>
              <div className="rounded-lg bg-[#FAF7F2] p-3 border border-[#EAD8C7]">
                <span className="text-[11px] text-[#73675F] block">Số câu đúng</span>
                <span className="text-xl font-black text-[#2C241E] mt-0.5 block">
                  {formatCorrectCount(submission.correct_count, totalQuestions)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-lg bg-[#FAF7F2] p-3 border border-[#EAD8C7] flex flex-col justify-center items-center">
                <span className="text-[11px] text-[#73675F] block mb-1">Xếp loại</span>
                {submission.passed === true ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F6ED] px-3 py-1 text-xs font-bold text-[#14734D] border border-[#BDE8CF]">
                    <CheckCircle2 size={13} />
                    ĐẠT
                  </span>
                ) : submission.passed === false ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF2F2] px-3 py-1 text-xs font-bold text-[#DC2626] border border-[#FECACA]">
                    <XCircle size={13} />
                    CHƯA ĐẠT
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[#73675F]">Chưa có dữ liệu</span>
                )}
              </div>
            </div>

            {/* Nhận xét giảng viên */}
            <div className="mt-4 pt-3 border-t border-[#F0E6DC]">
              <span className="text-xs font-bold text-[#73675F] block mb-1">
                Nhận xét của giảng viên:
              </span>
              {submission.instructor_feedback ? (
                <div className="rounded-lg bg-[#FAF7F2] p-3 text-xs text-[#2C241E] italic border-l-3 border-[#8A4F23]">
                  “{submission.instructor_feedback}”
                </div>
              ) : (
                <p className="text-xs text-[#A69788] italic">Chưa có nhận xét cho bài nộp này.</p>
              )}
            </div>
          </div>

          {/* Card 4: Chi tiết lựa chọn câu hỏi */}
          <div className="rounded-xl border border-[#EAD8C7] bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5 mb-2">
              <Clock size={14} />
              Lựa chọn của học viên ({answerEntries.length} câu đã trả lời)
            </h3>

            {/* Banner thông báo giới hạn dữ liệu snapshot lịch sử */}
            <div className="mb-4 rounded-lg bg-[#FAF7F2] p-3 text-xs text-[#73675F] border border-[#EAD8C7] flex items-start gap-2">
              <Info size={15} className="shrink-0 text-[#8A4F23] mt-0.5" />
              <div>
                <strong>Lưu ý về dữ liệu lịch sử:</strong> Hệ thống lưu giữ kết quả và các phương án học viên đã chọn tại thời điểm nộp bài. Do hệ thống không lưu bản chụp (snapshot) nội dung đề thi lịch sử, giao diện không đối chiếu với ngân hàng câu hỏi hiện tại để tránh làm sai lệch dữ liệu lịch sử.
              </div>
            </div>

            {answerEntries.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {answerEntries.map(([questionIdx, chosenAnswer]) => {
                  const qNum = Number(questionIdx) + 1;
                  return (
                    <div
                      key={questionIdx}
                      className="rounded-lg border border-[#EAD8C7] bg-[#FFFDF9] p-2 text-center"
                    >
                      <span className="block text-[11px] font-semibold text-[#73675F]">
                        Câu {!isNaN(qNum) ? qNum : questionIdx}
                      </span>
                      <span className="mt-1 inline-block rounded bg-[#FAF0E4] px-2.5 py-0.5 text-xs font-bold text-[#8A4F23]">
                        {String(chosenAnswer)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#A69788] italic text-center py-2">
                Không có dữ liệu chi tiết các câu trả lời.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#EAD8C7] bg-[#FAF7F2] px-6 py-3 flex justify-between items-center">
          <span className="text-[11px] text-[#A69788]">
            Chế độ chỉ đọc · MLD Vietnam Academy
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#EAD8C7] bg-white px-4 py-2 text-xs font-semibold text-[#2C241E] hover:bg-[#FAF0E4] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
