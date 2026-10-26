import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Search,
  User,
  Clock,
  Calendar,
  Percent,
  TrendingUp,
  Stethoscope,
  Smile,
  ShieldCheck,
  Eye,
  Plus,
  Minus,
} from "lucide-react";
import { adminApi, Listing, Row } from "./api";

export interface AcademicRecordFormValues {
  enrollment_id: string;
  theory_score: number | string;
  practical_score: number | string;
  attended_sessions: number | string;
  total_batch_sessions: number | string;
  attendance_rate: number | string;
  feedback_theory: string;
  feedback_practical: string;
  feedback_attendance: string;
  feedback_attitude: string;
  is_graduated: boolean;
  graduation_date?: string | null;
}

interface StudentAcademicRecordFormEditorProps {
  values: AcademicRecordFormValues;
  onChange: (field: keyof AcademicRecordFormValues, val: any) => void;
  isCreate?: boolean;
}

// Tính điểm trung bình GPA (Lý thuyết 40%, Thực hành 60%)
export function calculateGPA(theory: number | string, practical: number | string): number {
  const t = Number(theory) || 0;
  const p = Number(practical) || 0;
  return Number((t * 0.4 + p * 0.6).toFixed(1));
}

// Xếp loại học tập
export function getGradeRank(gpa: number): { label: string; badgeClass: string; icon: string } {
  if (gpa >= 9.0) {
    return { label: "Xuất sắc", badgeClass: "bg-amber-100 text-amber-900 border-amber-300", icon: "🏆" };
  }
  if (gpa >= 8.0) {
    return { label: "Giỏi", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300", icon: "🎖️" };
  }
  if (gpa >= 7.0) {
    return { label: "Khá", badgeClass: "bg-blue-100 text-blue-900 border-blue-300", icon: "🌟" };
  }
  if (gpa >= 5.0) {
    return { label: "Đạt chuẩn", badgeClass: "bg-gray-100 text-gray-800 border-gray-300", icon: "✅" };
  }
  return { label: "Chưa đạt", badgeClass: "bg-red-100 text-red-800 border-red-300", icon: "❌" };
}

// Các mức điểm chọn nhanh
const SCORE_CHIPS = [6.0, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

// Gợi ý nhận xét nhanh 4 chiều
const FEEDBACK_THEORY_SUGGESTIONS = [
  "Nắm vững giải phẫu tuần hoàn và nguyên lý dẫn lưu bạch huyết Vodder.",
  "Hiểu sâu phác đồ giảm phù nề y khoa và xử lý các ca lâm sàng phức tạp.",
  "Nắm chắc lý thuyết chuyên môn, trả lời tốt câu hỏi tình huống.",
  "Hiểu các nguyên lý cơ bản, cần ôn tập thêm về phân loại giai đoạn phù.",
  "Cần đọc thêm tài liệu về chống chỉ định tuyệt đối và tương đối của MLD.",
];

const FEEDBACK_PRACTICAL_SUGGESTIONS = [
  "Kỹ thuật thao tác tay xoay tròn và bơm đẩy chuẩn xác tuyệt đối, lực tay < 30 mmHg.",
  "Thao tác thuần thục, tiếp xúc mô êm ái, đúng hướng dòng chảy hạch bạch huyết.",
  "Đạt chuẩn kỹ năng thực hành lâm sàng, thao tác nhịp nhàng, đúng tần số.",
  "Cần chú ý thả lỏng cổ tay và điều hòa nhịp thở khi thao tác vùng đầu mặt cổ.",
  "Lực tay còn hơi mạnh, cần rèn luyện thêm kỹ thuật xoay tĩnh và điều chỉnh áp lực mô.",
];

const FEEDBACK_ATTENDANCE_SUGGESTIONS = [
  "Tham gia đầy đủ 100% các buổi học lý thuyết và lab thực hành, luôn đúng giờ.",
  "Chuyên cần tốt, chấp hành nghiêm túc quy định giờ giấc của Viện đào tạo.",
  "Có ý thức tự giác học bù và hoàn thành đầy đủ các bài giảng thực hành.",
  "Đạt tỷ lệ chuyên cần tối thiểu theo quy định cấp chứng chỉ.",
  "Vắng quá số buổi quy định, cần tham gia học bổ sung trước khi sát hạch tốt nghiệp.",
];

const FEEDBACK_ATTITUDE_SUGGESTIONS = [
  "Thái độ học tập nghiêm túc, tích cực tương tác và hỗ trợ đồng môn trong các ca thực hành.",
  "Tác phong y tế chuẩn mực, chăm chỉ, cầu tiến và có tinh thần trách nhiệm cao.",
  "Hòa đồng, tiếp thu nhanh các góp ý sửa đổi từ giảng viên hướng dẫn.",
  "Tập trung trong giờ học, tích cực đặt câu hỏi chuyên môn.",
  "Cần tập trung hơn trong các buổi thực hành thao tác trên người mẫu thực tế.",
];

export const StudentAcademicRecordFormEditor: React.FC<StudentAcademicRecordFormEditorProps> = ({
  values,
  onChange,
  isCreate = true,
}) => {
  const [enrollments, setEnrollments] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [batches, setBatches] = useState<Row[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");

  // Tải danh sách hồ sơ ghi danh, học viên, khóa học và lớp học
  useEffect(() => {
    let active = true;
    setLoadingLookups(true);

    Promise.all([
      adminApi<Listing>("course_enrollments?limit=150&page=1").catch(() => null),
      adminApi<Listing>("users?limit=150&page=1").catch(() => null),
      adminApi<Listing>("courses?limit=100&page=1").catch(() => null),
      adminApi<Listing>("course_batches?limit=100&page=1").catch(() => null),
    ])
      .then(([enrollRes, usersRes, coursesRes, batchesRes]) => {
        if (!active) return;
        if (enrollRes?.rows) setEnrollments(enrollRes.rows);
        if (usersRes?.rows) setUsers(usersRes.rows);
        if (coursesRes?.rows) setCourses(coursesRes.rows);
        if (batchesRes?.rows) setBatches(batchesRes.rows);
      })
      .finally(() => {
        if (active) setLoadingLookups(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Tìm hồ sơ ghi danh hiện tại
  const selectedEnrollment = enrollments.find((e) => String(e.id) === String(values.enrollment_id));
  const studentUser = selectedEnrollment
    ? users.find((u) => String(u.id) === String(selectedEnrollment.student_id))
    : null;
  const courseRecord = selectedEnrollment
    ? courses.find((c) => String(c.id) === String(selectedEnrollment.course_id))
    : null;
  const batchRecord = selectedEnrollment
    ? batches.find((b) => String(b.id) === String(selectedEnrollment.batch_id))
    : null;

  // Lọc danh sách hồ sơ ghi danh phục vụ tìm kiếm
  const filteredEnrollments = enrollments.filter((e) => {
    if (!enrollmentSearch.trim()) return true;
    const term = enrollmentSearch.toLowerCase().trim();
    const u = users.find((x) => String(x.id) === String(e.student_id));
    const c = courses.find((x) => String(x.id) === String(e.course_id));
    const b = batches.find((x) => String(x.id) === String(e.batch_id));

    const nameMatch = u?.full_name?.toLowerCase().includes(term);
    const phoneMatch = u?.phone?.includes(term);
    const courseMatch = c?.title?.toLowerCase().includes(term) || c?.code?.toLowerCase().includes(term);
    const batchMatch = b?.batch_code?.toLowerCase().includes(term);
    const idMatch = String(e.id).toLowerCase().includes(term);

    return nameMatch || phoneMatch || courseMatch || batchMatch || idMatch;
  });

  // Khi chọn hồ sơ ghi danh mới
  const handleEnrollmentSelect = (enrollId: string) => {
    onChange("enrollment_id", enrollId);
    const e = enrollments.find((x) => String(x.id) === String(enrollId));
    if (e) {
      const c = courses.find((x) => String(x.id) === String(e.course_id));
      const totalLessons = Number(c?.total_lessons) || 10;
      if (!values.total_batch_sessions || Number(values.total_batch_sessions) === 0) {
        onChange("total_batch_sessions", totalLessons);
        onChange("attended_sessions", totalLessons);
        onChange("attendance_rate", 100);
      }
    }
  };

  // Tự động tính tỷ lệ chuyên cần khi thay đổi số buổi
  const handleAttendedChange = (attended: number | string) => {
    onChange("attended_sessions", attended);
    const att = Number(attended) || 0;
    const tot = Number(values.total_batch_sessions) || 10;
    if (tot > 0) {
      const rate = Math.min(100, Math.round((att / tot) * 100));
      onChange("attendance_rate", rate);
    }
  };

  const handleTotalSessionsChange = (total: number | string) => {
    onChange("total_batch_sessions", total);
    const att = Number(values.attended_sessions) || 0;
    const tot = Number(total) || 1;
    if (tot > 0) {
      const rate = Math.min(100, Math.round((att / tot) * 100));
      onChange("attendance_rate", rate);
    }
  };

  // Tự sinh 4 nhận xét theo mức điểm hiện tại
  const handleGenerateFeedbackByScores = () => {
    const gpa = calculateGPA(values.theory_score, values.practical_score);
    if (gpa >= 9.0) {
      onChange("feedback_theory", FEEDBACK_THEORY_SUGGESTIONS[0]);
      onChange("feedback_practical", FEEDBACK_PRACTICAL_SUGGESTIONS[0]);
      onChange("feedback_attendance", FEEDBACK_ATTENDANCE_SUGGESTIONS[0]);
      onChange("feedback_attitude", FEEDBACK_ATTITUDE_SUGGESTIONS[0]);
      onChange("is_graduated", true);
    } else if (gpa >= 8.0) {
      onChange("feedback_theory", FEEDBACK_THEORY_SUGGESTIONS[1]);
      onChange("feedback_practical", FEEDBACK_PRACTICAL_SUGGESTIONS[1]);
      onChange("feedback_attendance", FEEDBACK_ATTENDANCE_SUGGESTIONS[1]);
      onChange("feedback_attitude", FEEDBACK_ATTITUDE_SUGGESTIONS[1]);
      onChange("is_graduated", true);
    } else if (gpa >= 7.0) {
      onChange("feedback_theory", FEEDBACK_THEORY_SUGGESTIONS[2]);
      onChange("feedback_practical", FEEDBACK_PRACTICAL_SUGGESTIONS[2]);
      onChange("feedback_attendance", FEEDBACK_ATTENDANCE_SUGGESTIONS[3]);
      onChange("feedback_attitude", FEEDBACK_ATTITUDE_SUGGESTIONS[2]);
      onChange("is_graduated", true);
    } else {
      onChange("feedback_theory", FEEDBACK_THEORY_SUGGESTIONS[4]);
      onChange("feedback_practical", FEEDBACK_PRACTICAL_SUGGESTIONS[4]);
      onChange("feedback_attendance", FEEDBACK_ATTENDANCE_SUGGESTIONS[4]);
      onChange("feedback_attitude", FEEDBACK_ATTITUDE_SUGGESTIONS[4]);
      onChange("is_graduated", false);
    }
    if (!values.graduation_date && gpa >= 5.0) {
      onChange("graduation_date", new Date().toISOString().split("T")[0]);
    }
  };

  // Tính GPA và xếp hạng
  const currentGPA = calculateGPA(values.theory_score, values.practical_score);
  const currentRank = getGradeRank(currentGPA);
  const attendancePercent = Number(values.attendance_rate) || 0;

  return (
    <div className="space-y-6">
      {/* 1. CHỌN HỒ SƠ GHI DANH HỌC VIÊN */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <Users size={14} className="text-[#985018]" />
            Học viên & Hồ sơ ghi danh khóa học <b className="text-red-500">*</b>
          </label>
          {loadingLookups && (
            <span className="text-[11px] text-[#766554]">Đang nạp hồ sơ học viên...</span>
          )}
        </div>

        {/* Search bar for enrollment */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-[#766554]" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên, SĐT, tên khóa học hoặc mã lớp..."
            value={enrollmentSearch}
            onChange={(e) => setEnrollmentSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-[#FAF6F2] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:bg-white transition-all"
          />
        </div>

        {/* Enrollment Dropdown */}
        <select
          value={values.enrollment_id || ""}
          onChange={(e) => handleEnrollmentSelect(e.target.value)}
          required
          className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] focus:ring-1 focus:ring-[#B38A58] transition-all font-medium"
        >
          <option value="">-- Chọn hồ sơ ghi danh của học viên --</option>
          {filteredEnrollments.map((en) => {
            const u = users.find((x) => String(x.id) === String(en.student_id));
            const c = courses.find((x) => String(x.id) === String(en.course_id));
            const b = batches.find((x) => String(x.id) === String(en.batch_id));
            const uName = u ? u.full_name : "Học viên";
            const uPhone = u?.phone ? `(${u.phone})` : "";
            const cTitle = c ? c.title : "Khóa học MLD";
            const bCode = b?.batch_code ? `[Lớp ${b.batch_code}]` : "";
            return (
              <option key={en.id} value={en.id}>
                {uName} {uPhone} · {bCode} {cTitle}
              </option>
            );
          })}
        </select>

        {/* Thẻ học viên nổi bật khi được chọn */}
        {selectedEnrollment && (
          <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#E8DFD8] flex items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#985018] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {studentUser?.full_name ? studentUser.full_name.charAt(0).toUpperCase() : "HV"}
              </div>
              <div>
                <h5 className="text-xs font-bold text-[#2C241E] flex items-center gap-2">
                  <span>{studentUser?.full_name || "Học viên"}</span>
                  {studentUser?.phone && (
                    <span className="text-[10px] text-[#766554] font-normal">
                      · {studentUser.phone}
                    </span>
                  )}
                </h5>
                <p className="text-[11px] text-[#985018] font-medium">
                  {courseRecord?.title || "Khóa học MLD"} {batchRecord ? `· Lớp ${batchRecord.batch_code}` : ""}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white border border-[#E8DFD8] text-[10px] font-bold text-[#554536] rounded-lg shrink-0">
              Mã: {String(selectedEnrollment.id).substring(0, 8)}...
            </span>
          </div>
        )}
      </div>

      {/* 2. NHẬP ĐIỂM SỐ & TỔNG KẾT GPA */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DFD8]/60 pb-3">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <TrendingUp size={14} className="text-[#985018]" />
            Kết quả sát hạch chuyên môn (Thang điểm 10)
          </label>

          {/* Huy hiệu GPA tổng kết */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#766554]">Điểm TB (GPA):</span>
            <span className="text-sm font-black text-[#985018] bg-[#FAF6F2] px-2.5 py-0.5 rounded-lg border border-[#E8DFD8]">
              {currentGPA} / 10
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${currentRank.badgeClass}`}>
              {currentRank.icon} {currentRank.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ô 1: Điểm lý thuyết */}
          <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#E8DFD8] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
                <BookOpen size={13} className="text-[#985018]" />
                Điểm lý thuyết chuyên môn <b className="text-red-500">*</b>
              </label>
              <span className="text-sm font-black text-[#985018]">
                {values.theory_score !== "" ? Number(values.theory_score).toFixed(1) : "--"} / 10
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const curr = Number(values.theory_score) || 0;
                  onChange("theory_score", Math.max(0, Number((curr - 0.5).toFixed(1))));
                }}
                className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] flex items-center justify-center text-[#554536] hover:bg-[#FAF6F2] font-bold"
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={values.theory_score}
                onChange={(e) => onChange("theory_score", e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="flex-1 text-center font-black text-sm py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58]"
              />
              <button
                type="button"
                onClick={() => {
                  const curr = Number(values.theory_score) || 0;
                  onChange("theory_score", Math.min(10, Number((curr + 0.5).toFixed(1))));
                }}
                className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] flex items-center justify-center text-[#554536] hover:bg-[#FAF6F2] font-bold"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Chip chọn nhanh điểm lý thuyết */}
            <div className="flex flex-wrap gap-1 pt-1">
              {SCORE_CHIPS.map((sc) => (
                <button
                  type="button"
                  key={sc}
                  onClick={() => onChange("theory_score", sc)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                    Number(values.theory_score) === sc
                      ? "bg-[#985018] text-white border-[#985018] font-bold"
                      : "bg-white text-[#554536] border-[#E8DFD8] hover:border-[#B38A58]"
                  }`}
                >
                  {sc.toFixed(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Ô 2: Điểm thực hành */}
          <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#E8DFD8] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
                <Stethoscope size={13} className="text-[#985018]" />
                Điểm thực hành lâm sàng <b className="text-red-500">*</b>
              </label>
              <span className="text-sm font-black text-emerald-700">
                {values.practical_score !== "" ? Number(values.practical_score).toFixed(1) : "--"} / 10
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const curr = Number(values.practical_score) || 0;
                  onChange("practical_score", Math.max(0, Number((curr - 0.5).toFixed(1))));
                }}
                className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] flex items-center justify-center text-[#554536] hover:bg-[#FAF6F2] font-bold"
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={values.practical_score}
                onChange={(e) => onChange("practical_score", e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="flex-1 text-center font-black text-sm py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58]"
              />
              <button
                type="button"
                onClick={() => {
                  const curr = Number(values.practical_score) || 0;
                  onChange("practical_score", Math.min(10, Number((curr + 0.5).toFixed(1))));
                }}
                className="w-8 h-8 rounded-lg bg-white border border-[#E8DFD8] flex items-center justify-center text-[#554536] hover:bg-[#FAF6F2] font-bold"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Chip chọn nhanh điểm thực hành */}
            <div className="flex flex-wrap gap-1 pt-1">
              {SCORE_CHIPS.map((sc) => (
                <button
                  type="button"
                  key={sc}
                  onClick={() => onChange("practical_score", sc)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                    Number(values.practical_score) === sc
                      ? "bg-emerald-700 text-white border-emerald-700 font-bold"
                      : "bg-white text-[#554536] border-[#E8DFD8] hover:border-emerald-600"
                  }`}
                >
                  {sc.toFixed(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHUYÊN CẦN & SỐ BUỔI THAM DỰ */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DFD8]/60 pb-2.5">
          <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
            <Clock size={14} className="text-[#985018]" />
            Tỷ lệ chuyên cần & Điểm danh buổi học
          </label>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              attendancePercent >= 80
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-amber-50 text-amber-800 border-amber-300"
            }`}
          >
            Chuyên cần: {attendancePercent}% {attendancePercent >= 80 ? "(Đủ điều kiện dự thi)" : "(Cần học bù)"}
          </span>
        </div>

        {/* Thanh tiến trình chuyên cần */}
        <div className="w-full bg-[#E8DFD8] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              attendancePercent >= 80 ? "bg-emerald-600" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, attendancePercent))}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-[11px] text-[#766554] font-medium block mb-1">
              Số buổi tham dự:
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={values.attended_sessions}
              onChange={(e) => handleAttendedChange(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#766554] font-medium block mb-1">
              Tổng số buổi của khóa:
            </label>
            <input
              type="number"
              min="1"
              placeholder="10"
              value={values.total_batch_sessions}
              onChange={(e) => handleTotalSessionsChange(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#766554] font-medium block mb-1">
              Tỷ lệ chuyên cần (%):
            </label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="100"
              value={values.attendance_rate}
              onChange={(e) => onChange("attendance_rate", e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-xs px-3 py-2 bg-[#FAF6F2] border border-[#E8DFD8] rounded-xl text-[#985018] font-bold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. ĐÁNH GIÁ 4 CHIỀU & GỢI Ý NHANH */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DFD8]/60 pb-2.5">
          <div>
            <h4 className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
              <Award size={14} className="text-[#985018]" />
              Nhận xét đánh giá 4 chiều của Giảng viên
            </h4>
            <p className="text-[11px] text-[#766554]">
              Nhận xét toàn diện theo tiêu chuẩn Y khoa Dr. Vodder
            </p>
          </div>

          {/* Nút sinh nhận xét tự động theo điểm */}
          <button
            type="button"
            onClick={handleGenerateFeedbackByScores}
            className="text-xs px-3 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F5ECE2] text-[#985018] border border-[#E8DFD8] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Sparkles size={13} className="text-[#B38A58]" />
            ⚡ Điền nhận xét chuẩn theo điểm
          </button>
        </div>

        {/* 1. Nhận xét Lý thuyết */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#2C241E] flex items-center justify-between">
            <span>1. Nhận xét về Lý thuyết & Kiến thức chuyên môn</span>
            <span className="text-[10px] text-[#766554] font-normal">
              {values.feedback_theory?.length || 0} ký tự
            </span>
          </label>
          <textarea
            rows={2}
            value={values.feedback_theory || ""}
            onChange={(e) => onChange("feedback_theory", e.target.value)}
            placeholder="Nhận xét mức độ hiểu bài, kiến thức giải phẫu và xử lý tình huống..."
            className="w-full text-xs p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58]"
          />
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_THEORY_SUGGESTIONS.slice(0, 3).map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onChange("feedback_theory", s)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#FAF6F2] hover:bg-white border border-[#E8DFD8] text-[#554536] transition-colors"
              >
                + {s.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>

        {/* 2. Nhận xét Thực hành */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#2C241E] flex items-center justify-between">
            <span>2. Nhận xét về Thực hành Lâm sàng & Kỹ thuật tay nghề</span>
            <span className="text-[10px] text-[#766554] font-normal">
              {values.feedback_practical?.length || 0} ký tự
            </span>
          </label>
          <textarea
            rows={2}
            value={values.feedback_practical || ""}
            onChange={(e) => onChange("feedback_practical", e.target.value)}
            placeholder="Nhận xét thao tác tay, kiểm soát áp lực mô dưới 30 mmHg, độ êm ái..."
            className="w-full text-xs p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58]"
          />
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_PRACTICAL_SUGGESTIONS.slice(0, 3).map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onChange("feedback_practical", s)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#FAF6F2] hover:bg-white border border-[#E8DFD8] text-[#554536] transition-colors"
              >
                + {s.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>

        {/* 3. Nhận xét Chuyên cần */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#2C241E] flex items-center justify-between">
            <span>3. Nhận xét về Chuyên cần & Tỷ lệ tham gia</span>
            <span className="text-[10px] text-[#766554] font-normal">
              {values.feedback_attendance?.length || 0} ký tự
            </span>
          </label>
          <textarea
            rows={2}
            value={values.feedback_attendance || ""}
            onChange={(e) => onChange("feedback_attendance", e.target.value)}
            placeholder="Nhận xét thời gian tham gia lớp, đi học đúng giờ, tinh thần học bù..."
            className="w-full text-xs p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58]"
          />
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_ATTENDANCE_SUGGESTIONS.slice(0, 3).map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onChange("feedback_attendance", s)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#FAF6F2] hover:bg-white border border-[#E8DFD8] text-[#554536] transition-colors"
              >
                + {s.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>

        {/* 4. Nhận xét Thái độ */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#2C241E] flex items-center justify-between">
            <span>4. Nhận xét về Thái độ học tập & Tác phong nghề nghiệp</span>
            <span className="text-[10px] text-[#766554] font-normal">
              {values.feedback_attitude?.length || 0} ký tự
            </span>
          </label>
          <textarea
            rows={2}
            value={values.feedback_attitude || ""}
            onChange={(e) => onChange("feedback_attitude", e.target.value)}
            placeholder="Nhận xét tinh thần cầu tiến, tác phong chuẩn mực y khoa, tương tác bạn học..."
            className="w-full text-xs p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58]"
          />
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_ATTITUDE_SUGGESTIONS.slice(0, 3).map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onChange("feedback_attitude", s)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#FAF6F2] hover:bg-white border border-[#E8DFD8] text-[#554536] transition-colors"
              >
                + {s.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. XÁC NHẬN TỐT NGHIỆP & NGÀY CẤP */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-3 shadow-xs">
        <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
          <GraduationCap size={14} className="text-[#985018]" />
          Kết luận Tốt nghiệp & Cấp Giấy chứng nhận
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <button
            type="button"
            onClick={() => {
              const nextGrad = !values.is_graduated;
              onChange("is_graduated", nextGrad);
              if (nextGrad && !values.graduation_date) {
                onChange("graduation_date", new Date().toISOString().split("T")[0]);
              }
            }}
            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
              values.is_graduated
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-white border-[#E8DFD8]"
            }`}
          >
            <span
              className={`p-2 rounded-lg text-lg ${
                values.is_graduated ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              🎓
            </span>
            <div>
              <span className="text-xs font-bold text-[#2C241E] block">
                {values.is_graduated ? "Đủ điều kiện tốt nghiệp & Cấp chứng nhận" : "Chưa đủ điều kiện tốt nghiệp"}
              </span>
              <span className="text-[10px] text-[#766554]">
                {values.is_graduated
                  ? "Học viên đạt chuẩn kiến thức và thực hành lâm sàng"
                  : "Cần bổ sung chuyên cần hoặc thi lại thực hành"}
              </span>
            </div>
          </button>

          {/* Ngày tốt nghiệp */}
          <div>
            <label className="text-[11px] text-[#766554] font-medium block mb-1">
              Ngày công nhận tốt nghiệp:
            </label>
            <input
              type="date"
              value={values.graduation_date || ""}
              onChange={(e) => onChange("graduation_date", e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#B38A58] font-medium"
            />
          </div>
        </div>
      </div>

      {/* 6. XEM TRƯỚC BẢNG ĐIỂM THỜI GIAN THỰC (LIVE PREVIEW CARD) */}
      <div className="pt-2 border-t border-[#E8DFD8]">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Eye size={14} className="text-[#985018]" />
          <h4 className="text-xs font-bold text-[#2C241E]">
            Xem trước Bảng điểm (Hiển thị thực tế trên App Mobile & Web Học viên)
          </h4>
        </div>

        <div className="bg-gradient-to-br from-white to-[#FAF6F2] p-4 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DFD8]/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#985018] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {studentUser?.full_name ? studentUser.full_name.charAt(0).toUpperCase() : "HV"}
              </div>
              <div>
                <h5 className="text-xs font-bold text-[#2C241E]">
                  {studentUser?.full_name || "Học viên chưa chọn"}
                </h5>
                <p className="text-[10px] text-[#766554]">
                  {courseRecord?.title || "Khóa học MLD"} {batchRecord ? `· ${batchRecord.batch_code}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${currentRank.badgeClass}`}>
                {currentRank.icon} {currentRank.label} (GPA: {currentGPA})
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  values.is_graduated ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {values.is_graduated ? "🎓 Đạt tốt nghiệp" : "Chưa tốt nghiệp"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
              <span className="text-[10px] text-[#766554] block">Lý thuyết</span>
              <span className="text-sm font-black text-[#985018]">
                {values.theory_score !== "" ? Number(values.theory_score).toFixed(1) : "--"}
              </span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
              <span className="text-[10px] text-[#766554] block">Thực hành</span>
              <span className="text-sm font-black text-emerald-700">
                {values.practical_score !== "" ? Number(values.practical_score).toFixed(1) : "--"}
              </span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
              <span className="text-[10px] text-[#766554] block">Chuyên cần</span>
              <span className="text-sm font-black text-[#2C241E]">{attendancePercent}%</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
              <span className="text-[10px] text-[#766554] block">Buổi học</span>
              <span className="text-sm font-black text-[#554536]">
                {values.attended_sessions || 0}/{values.total_batch_sessions || 10}
              </span>
            </div>
          </div>

          {values.feedback_practical && (
            <p className="text-[11px] text-[#554536] italic bg-white p-2.5 rounded-xl border border-[#E8DFD8]/60">
              💬 <b>Nhận xét thực hành:</b> {values.feedback_practical}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
