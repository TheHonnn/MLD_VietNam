import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Eye,
  X,
  ExternalLink,
  AlertTriangle,
  Info,
  PlayCircle,
  FolderOpen,
} from "lucide-react";
import type { Row } from "./api";

export interface LessonProgressViewProps {
  rows: Row[];
  loading?: boolean;
  error?: string | null;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  canViewEnrollment?: boolean;
  canViewLesson?: boolean;
}

/** Formats seconds into readable Vietnamese text (e.g. "12 phút 30 giây", "45 giây") */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(Number(seconds))) {
    return "Chưa có dữ liệu";
  }
  const s = Math.max(0, Math.floor(Number(seconds)));
  if (s === 0) return "0 giây";
  const m = Math.floor(s / 60);
  const remainingS = s % 60;
  if (m === 0) return `${remainingS} giây`;
  if (remainingS === 0) return `${m} phút`;
  return `${m} phút ${remainingS} giây`;
}

/** Formats date into Vietnamese standard: dd/MM/yyyy HH:mm */
export function formatProgressDate(dateStr?: string | null): string {
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

export interface ProgressCalculation {
  percent: number | null;
  percentLabel: string;
  isAnomaly: boolean;
  rawPercent: number | null;
}

/**
 * Calculates progress percentage against valid duration_minutes.
 * Caps display at 100% and flags anomaly if watched_seconds > duration.
 * If duration is missing, returns null with "Chưa có thời lượng".
 */
export function calculateProgress(
  watchedSeconds: number | null | undefined,
  durationMinutes: number | null | undefined
): ProgressCalculation {
  if (
    durationMinutes === null ||
    durationMinutes === undefined ||
    isNaN(Number(durationMinutes)) ||
    Number(durationMinutes) <= 0
  ) {
    return {
      percent: null,
      percentLabel: "Chưa có thời lượng",
      isAnomaly: false,
      rawPercent: null,
    };
  }
  const totalSeconds = Number(durationMinutes) * 60;
  const watched = Math.max(0, Number(watchedSeconds) || 0);
  const raw = (watched / totalSeconds) * 100;
  const isAnomaly = watched > totalSeconds;
  const capped = Math.min(100, Math.round(raw));
  return {
    percent: capped,
    percentLabel: `${capped}%`,
    isAnomaly,
    rawPercent: Math.round(raw * 10) / 10,
  };
}

export function LessonProgressView({
  rows,
  loading = false,
  error = null,
  hasFilters = false,
  onClearFilters,
  canViewEnrollment = true,
  canViewLesson = true,
}: LessonProgressViewProps) {
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#EAD8C7] bg-white p-12 text-center shadow-xs">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#D9A373] border-t-[#8A4F23]" />
        <p className="mt-4 text-sm font-medium text-[#73675F]">Đang tải tiến độ học bài…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#F8D7DA] bg-[#FFF5F5] p-8 text-center shadow-xs">
        <AlertTriangle className="mx-auto h-8 w-8 text-[#DC2626]" />
        <h3 className="mt-2 text-base font-bold text-[#991B1B]">Không thể tải tiến độ học</h3>
        <p className="mt-1 text-sm text-[#7F1D1D]">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    if (hasFilters) {
      return (
        <div className="rounded-2xl border border-[#EAD8C7] bg-white px-6 py-14 text-center shadow-xs">
          <HelpCircle className="mx-auto h-10 w-10 text-[#C4A482]" />
          <h3 className="mt-3 text-base font-bold text-[#2C241E]">Không tìm thấy tiến độ phù hợp</h3>
          <p className="mt-1 text-xs text-[#73675F] max-w-md mx-auto">
            Không có bản ghi tiến độ nào khớp với bộ lọc và từ khóa hiện tại. Hãy thử thay đổi bộ lọc hoặc xóa bộ lọc.
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
        <h3 className="mt-3 text-base font-bold text-[#2C241E]">Chưa nhận được dữ liệu tiến độ từ ứng dụng</h3>
        <p className="mt-1 text-xs text-[#73675F] max-w-md mx-auto">
          Dữ liệu tiến độ chỉ xuất hiện tại đây khi học viên xem bài học và ứng dụng đồng bộ vị trí video lên máy chủ. Thiếu bản ghi không đồng nghĩa học viên chưa học.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-table-wrap overflow-x-auto rounded-2xl border border-[#EAD8C7] bg-white shadow-xs">
        <table className="admin-table w-full text-left">
          <caption className="sr-only">Danh sách tiến độ bài học đã đồng bộ</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[20%]">Học viên / Mã hồ sơ</th>
              <th scope="col" className="w-[30%]">Khóa học / Chương / Bài học</th>
              <th scope="col" className="w-[18%]">Thời lượng đã ghi nhận</th>
              <th scope="col" className="w-[12%] text-center">Trạng thái</th>
              <th scope="col" className="w-[14%]">Lần cập nhật</th>
              <th scope="col" className="w-[6%] text-right pr-4">Thao tác</th>
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
              const orderCode = row.order_code || row.course_enrollments?.order_code;
              const phone = row.student_phone || row.course_enrollments?.student_phone || row.users?.phone;

              // Lesson and course metadata
              const lessonTitle = row.lesson_title || row.course_lessons?.title || "Chưa có dữ liệu";
              const chapterTitle = row.chapter_title || row.course_lessons?.course_chapters?.title;
              const courseTitle =
                row.enrollment_course_title ||
                row.course_enrollments?.courses?.title ||
                row.lesson_course_title ||
                row.course_lessons?.course_chapters?.courses?.title;
              const durationMinutes = row.duration_minutes ?? row.course_lessons?.duration_minutes;
              const watchedSeconds = row.watched_seconds;
              const isCompleted = Boolean(row.is_completed);

              // Warnings
              const isCourseMismatch = Boolean(row.course_mismatch);
              const isMissingEnrollment = Boolean(row.missing_enrollment);
              const isMissingLesson = Boolean(row.missing_lesson);

              const progress = calculateProgress(watchedSeconds, durationMinutes);

              return (
                <tr key={String(row.id)} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  {/* Học viên / Mã hồ sơ */}
                  <td className="py-3.5">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setSelectedRow(row)}
                        className="text-left font-bold text-[#8A4F23] hover:underline flex items-center gap-1.5"
                      >
                        <User size={14} className="shrink-0 text-[#C4A482]" />
                        <span>{studentName}</span>
                      </button>
                      {orderCode && (
                        <span className="text-[11px] font-mono text-[#73675F] ml-5">
                          Mã: #{orderCode}
                        </span>
                      )}
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
                      {isMissingEnrollment && (
                        <span className="mt-1 ml-5 inline-flex items-center gap-1 text-[10px] font-medium text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded border border-[#FCA5A5] max-w-fit">
                          <AlertTriangle size={10} /> Không tìm thấy hồ sơ
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Khóa học / Chương / Bài học */}
                  <td className="py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[#2C241E] line-clamp-2" title={lessonTitle}>
                        {lessonTitle}
                      </span>
                      {chapterTitle && (
                        <span className="text-[11px] text-[#73675F] flex items-center gap-1 truncate" title={`Chương: ${chapterTitle}`}>
                          <FolderOpen size={11} className="shrink-0 text-[#C4A482]" />
                          <span>{chapterTitle}</span>
                        </span>
                      )}
                      {courseTitle && (
                        <span className="text-[11px] text-[#8A4F23] flex items-center gap-1 truncate" title={`Khóa: ${courseTitle}`}>
                          <BookOpen size={11} className="shrink-0 text-[#C4A482]" />
                          <span>{courseTitle}</span>
                        </span>
                      )}
                      {isCourseMismatch && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FDE68A] max-w-fit" title="Bài học không thuộc khóa học của hồ sơ ghi danh này">
                          <AlertTriangle size={10} /> Khóa học không khớp
                        </span>
                      )}
                      {isMissingLesson && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded border border-[#FCA5A5] max-w-fit">
                          <AlertTriangle size={10} /> Không tìm thấy bài học
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Thời lượng đã ghi nhận */}
                  <td className="py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-[#2C241E]">
                        {formatDuration(watchedSeconds)}
                      </span>
                      {progress.percent !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-[#EAD8C7] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#8A4F23]"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#8A4F23]">
                            {progress.percentLabel}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#A8988C] italic">
                          {progress.percentLabel}
                        </span>
                      )}
                      {progress.isAnomaly && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FDE68A] max-w-fit"
                          title={`Vị trí đã xem (${watchedSeconds}s) vượt thời lượng bài học (${Number(durationMinutes) * 60}s)`}
                        >
                          <AlertTriangle size={10} /> Vượt thời lượng
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3.5 text-center">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF7EE] px-2.5 py-1 text-xs font-semibold text-[#1B6E32] border border-[#BDE3C4]">
                        <CheckCircle2 size={12} />
                        Đã hoàn thành
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2.5 py-1 text-xs font-semibold text-[#9A3412] border border-[#FFEDD5]">
                        <Clock size={12} />
                        Đang học
                      </span>
                    )}
                  </td>

                  {/* Lần cập nhật */}
                  <td className="py-3.5">
                    <div className="flex flex-col text-xs text-[#73675F]">
                      {row.completed_at ? (
                        <>
                          <span className="font-medium text-[#2C241E]">
                            {formatProgressDate(row.completed_at)}
                          </span>
                          <span className="text-[10px] text-[#A8988C]">Hoàn thành</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#A8988C] italic">Chưa hoàn thành</span>
                      )}
                    </div>
                  </td>

                  {/* Thao tác */}
                  <td className="py-3.5 text-right pr-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRow(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#EAD8C7] bg-[#FAF7F2] px-2.5 py-1 text-xs font-semibold text-[#8A4F23] hover:bg-[#F3ECE4] hover:border-[#D9A373] transition-colors"
                    >
                      <Eye size={13} />
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Xem chi tiết tiến độ học (Chỉ đọc) */}
      {selectedRow && (
        <LessonProgressDetailModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          canViewEnrollment={canViewEnrollment}
          canViewLesson={canViewLesson}
        />
      )}
    </>
  );
}

interface DetailModalProps {
  row: Row;
  onClose: () => void;
  canViewEnrollment?: boolean;
  canViewLesson?: boolean;
}

function LessonProgressDetailModal({
  row,
  onClose,
  canViewEnrollment = true,
  canViewLesson = true,
}: DetailModalProps) {
  const studentName = getStudentDisplayName(row);
  const userAccountName = row.user_full_name || row.users?.full_name || row.student?.full_name;
  const isRegisteredForOther = Boolean(
    userAccountName &&
    studentName !== "Chưa có dữ liệu" &&
    studentName.toLowerCase() !== String(userAccountName).trim().toLowerCase()
  );

  const orderCode = row.order_code || row.course_enrollments?.order_code;
  const phone = row.student_phone || row.course_enrollments?.student_phone || row.users?.phone;
  const email = row.student_email || row.course_enrollments?.student_email || row.users?.email;
  const enrolledAt = row.enrolled_at || row.course_enrollments?.enrolled_at;

  const lessonTitle = row.lesson_title || row.course_lessons?.title || "Chưa có dữ liệu";
  const chapterTitle = row.chapter_title || row.course_lessons?.course_chapters?.title;
  const enrollmentCourseTitle = row.enrollment_course_title || row.course_enrollments?.courses?.title;
  const lessonCourseTitle = row.lesson_course_title || row.course_lessons?.course_chapters?.courses?.title;
  const durationMinutes = row.duration_minutes ?? row.course_lessons?.duration_minutes;
  const watchedSeconds = row.watched_seconds;
  const isCompleted = Boolean(row.is_completed);
  const completedAt = row.completed_at;
  const studentNotes = row.student_notes;

  const isCourseMismatch = Boolean(row.course_mismatch);
  const isMissingEnrollment = Boolean(row.missing_enrollment);
  const isMissingLesson = Boolean(row.missing_lesson);

  const progress = calculateProgress(watchedSeconds, durationMinutes);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-progress-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl border border-[#EAD8C7] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAD8C7] bg-[#FAF7F2] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8A4F23] text-white">
              <PlayCircle size={20} />
            </div>
            <div>
              <h2 id="lesson-progress-modal-title" className="text-base font-bold text-[#2C241E]">
                Chi tiết tiến độ bài học
              </h2>
              <p className="text-xs text-[#73675F]">
                Dữ liệu đồng bộ từ ứng dụng học viên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-[#73675F] hover:bg-[#EAD8C7]/50 hover:text-[#2C241E] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cảnh báo nếu có sai lệch dữ liệu */}
        {isCourseMismatch && (
          <div className="border-b border-[#FDE68A] bg-[#FEF3C7] px-6 py-3 text-xs text-[#92400E] flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#B45309]" />
            <div>
              <p className="font-bold">Cảnh báo bất thường: Khóa học không khớp</p>
              <p className="mt-0.5">
                Học viên ghi danh vào khóa <strong>{enrollmentCourseTitle || "Chưa rõ"}</strong>, nhưng bài học này thuộc khóa <strong>{lessonCourseTitle || "Chưa rõ"}</strong>. Vui lòng kiểm tra lại cấu hình phân bổ bài học.
              </p>
            </div>
          </div>
        )}

        {isMissingEnrollment && (
          <div className="border-b border-[#FCA5A5] bg-[#FEE2E2] px-6 py-3 text-xs text-[#991B1B] flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#DC2626]" />
            <div>
              <p className="font-bold">Không tìm thấy hồ sơ ghi danh tương ứng</p>
              <p className="mt-0.5">
                Mã hồ sơ (enrollment_id: <code className="font-mono">{String(row.enrollment_id)}</code>) không tồn tại trong bảng ghi danh của hệ thống.
              </p>
            </div>
          </div>
        )}

        {isMissingLesson && (
          <div className="border-b border-[#FCA5A5] bg-[#FEE2E2] px-6 py-3 text-xs text-[#991B1B] flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#DC2626]" />
            <div>
              <p className="font-bold">Không tìm thấy bài học tương ứng</p>
              <p className="mt-0.5">
                Mã bài học (lesson_id: <code className="font-mono">{String(row.lesson_id)}</code>) không tồn tại trong danh mục bài học.
              </p>
            </div>
          </div>
        )}

        {progress.isAnomaly && (
          <div className="border-b border-[#FDE68A] bg-[#FEF3C7] px-6 py-3 text-xs text-[#92400E] flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#B45309]" />
            <div>
              <p className="font-bold">Cảnh báo: Thời lượng xem vượt độ dài bài học</p>
              <p className="mt-0.5">
                Vị trí xem video được ghi nhận là <strong>{formatDuration(watchedSeconds)}</strong> ({watchedSeconds} giây), trong khi độ dài bài học được thiết lập là <strong>{durationMinutes} phút</strong> ({Number(durationMinutes) * 60} giây) — tỷ lệ thực tế {progress.rawPercent}%. Hệ thống hiển thị tối đa 100%.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Thông tin học viên & Hồ sơ ghi danh */}
          <section className="rounded-xl border border-[#EAD8C7] bg-[#FAF7F2] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5">
                <User size={14} />
                Thông tin học viên & Hồ sơ
              </h3>
              {canViewEnrollment && orderCode && (
                <Link
                  to={`/manage/course_enrollments?q=${encodeURIComponent(orderCode)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A4F23] hover:underline"
                >
                  Mở hồ sơ ghi danh
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#73675F]">Học viên thực học:</span>
                <p className="font-bold text-[#2C241E] text-sm mt-0.5">{studentName}</p>
              </div>

              <div>
                <span className="text-[#73675F]">Mã hồ sơ ghi danh:</span>
                <p className="font-mono font-bold text-[#2C241E] mt-0.5">
                  {orderCode ? `#${orderCode}` : "Chưa có dữ liệu"}
                </p>
              </div>

              {phone && (
                <div>
                  <span className="text-[#73675F]">Số điện thoại:</span>
                  <p className="text-[#2C241E] font-medium mt-0.5">{phone}</p>
                </div>
              )}

              {email && (
                <div>
                  <span className="text-[#73675F]">Email:</span>
                  <p className="text-[#2C241E] font-medium mt-0.5">{email}</p>
                </div>
              )}

              {enrolledAt && (
                <div>
                  <span className="text-[#73675F]">Ngày ghi danh:</span>
                  <p className="text-[#2C241E] font-medium mt-0.5">{formatProgressDate(enrolledAt)}</p>
                </div>
              )}

              {isRegisteredForOther && (
                <div className="col-span-full rounded-lg bg-[#FAF0E4] border border-[#EAD8C7] p-2.5">
                  <span className="text-[11px] text-[#8A4F23] font-semibold">Tài khoản ứng dụng đăng ký hộ:</span>
                  <p className="text-xs text-[#2C241E] font-medium mt-0.5">
                    {userAccountName} (Học viên trên lớp khác với chủ tài khoản ứng dụng)
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Thông tin Bài học & Khóa học */}
          <section className="rounded-xl border border-[#EAD8C7] bg-[#FAF7F2] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5">
                <BookOpen size={14} />
                Bài học & Khóa đào tạo
              </h3>
              {canViewLesson && lessonTitle !== "Chưa có dữ liệu" && (
                <Link
                  to={`/manage/course_lessons?q=${encodeURIComponent(lessonTitle)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A4F23] hover:underline"
                >
                  Xem nội dung bài học
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="col-span-full">
                <span className="text-[#73675F]">Bài học:</span>
                <p className="font-bold text-[#2C241E] text-sm mt-0.5">{lessonTitle}</p>
              </div>

              {chapterTitle && (
                <div>
                  <span className="text-[#73675F]">Chương / Chuyên đề:</span>
                  <p className="font-semibold text-[#2C241E] mt-0.5">{chapterTitle}</p>
                </div>
              )}

              <div>
                <span className="text-[#73675F]">Khóa đào tạo:</span>
                <p className="font-semibold text-[#8A4F23] mt-0.5">
                  {enrollmentCourseTitle || lessonCourseTitle || "Chưa có dữ liệu"}
                </p>
              </div>

              <div>
                <span className="text-[#73675F]">Thời lượng thiết kế bài học:</span>
                <p className="font-semibold text-[#2C241E] mt-0.5">
                  {durationMinutes && Number(durationMinutes) > 0
                    ? `${durationMinutes} phút (${Number(durationMinutes) * 60} giây)`
                    : "Chưa có thời lượng"}
                </p>
              </div>

              {row.course_lessons?.lesson_type && (
                <div>
                  <span className="text-[#73675F]">Hình thức bài học:</span>
                  <p className="font-semibold text-[#2C241E] mt-0.5 uppercase">
                    {String(row.course_lessons.lesson_type)}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Dữ liệu tiến độ ghi nhận */}
          <section className="rounded-xl border border-[#EAD8C7] bg-white p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] flex items-center gap-1.5 mb-3">
              <Clock size={14} />
              Dữ liệu tiến độ ghi nhận
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-[#EAD8C7] bg-[#FAF7F2] p-3">
                <span className="text-[#73675F]">Vị trí video đã ghi nhận:</span>
                <p className="text-base font-bold text-[#2C241E] mt-1">
                  {formatDuration(watchedSeconds)}
                </p>
                <p className="text-[11px] text-[#A8988C] mt-0.5">
                  ({watchedSeconds ?? 0} giây trên trình phát)
                </p>
              </div>

              <div className="rounded-lg border border-[#EAD8C7] bg-[#FAF7F2] p-3">
                <span className="text-[#73675F]">Tỷ lệ hoàn thành:</span>
                <p className="text-base font-bold text-[#8A4F23] mt-1">
                  {progress.percentLabel}
                </p>
                {progress.percent !== null && (
                  <div className="mt-2 h-2 w-full rounded-full bg-[#EAD8C7] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#8A4F23]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[#EAD8C7] bg-[#FAF7F2] p-3">
                <span className="text-[#73675F]">Trạng thái hoàn thành:</span>
                <div className="mt-1">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF7EE] px-2.5 py-1 text-xs font-semibold text-[#1B6E32] border border-[#BDE3C4]">
                      <CheckCircle2 size={12} />
                      Đã hoàn thành
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2.5 py-1 text-xs font-semibold text-[#9A3412] border border-[#FFEDD5]">
                      <Clock size={12} />
                      Đang học
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#EAD8C7] bg-[#FAF7F2] p-3">
                <span className="text-[#73675F]">Thời điểm hoàn thành:</span>
                <p className="text-sm font-semibold text-[#2C241E] mt-1">
                  {completedAt ? formatProgressDate(completedAt) : "Chưa hoàn thành"}
                </p>
              </div>
            </div>

            {studentNotes && (
              <div className="mt-3 rounded-lg border border-[#EAD8C7] bg-[#FAF7F2] p-3 text-xs">
                <span className="text-[#73675F] font-semibold">Ghi chú của học viên:</span>
                <p className="text-[#2C241E] mt-1 whitespace-pre-wrap">{studentNotes}</p>
              </div>
            )}
          </section>
        </div>

        {/* Footer (Chỉ đọc, nút Đóng) */}
        <div className="flex items-center justify-between border-t border-[#EAD8C7] bg-[#FAF7F2] px-6 py-3.5">
          <span className="text-xs text-[#73675F]">
            Chế độ chỉ đọc. Tiến độ được cập nhật tự động khi học viên học trên ứng dụng.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#EAD8C7] bg-white px-4 py-2 text-xs font-semibold text-[#2C241E] hover:bg-[#FAF7F2] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
