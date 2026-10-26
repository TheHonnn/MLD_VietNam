import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  BadgeDollarSign,
  User,
  UserPlus,
  Check,
  Search,
  Clock,
  Sparkles,
  Save,
  Pencil,
  X,
  LoaderCircle,
  AlertCircle,
  Users,
  CheckCircle2,
  Percent,
  Layers,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface EnrollmentEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}

const STATUS_OPTIONS = [
  {
    value: "ENROLLED",
    label: "Đã ghi danh",
    desc: "Đã hoàn tất hồ sơ, sẵn sàng nhập học",
    badgeClass: "bg-[#EBF3FC] text-[#1E40AF] border-[#BFDBFE]",
    dotClass: "bg-[#2563EB]",
  },
  {
    value: "DEPOSITED",
    label: "Đã đặt cọc",
    desc: "Đã cọc giữ chỗ, chưa nộp đủ học phí",
    badgeClass: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
    dotClass: "bg-[#D97706]",
  },
  {
    value: "CONSULTING",
    label: "Tư vấn",
    desc: "Đang quan tâm và nhận tư vấn lộ trình",
    badgeClass: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
    dotClass: "bg-[#9CA3AF]",
  },
  {
    value: "STUDYING",
    label: "Đang học",
    desc: "Đang theo học các buổi trên lớp",
    badgeClass: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    dotClass: "bg-[#059669]",
  },
  {
    value: "GRADUATED",
    label: "Tốt nghiệp",
    desc: "Đã hoàn thành khóa và nhận chứng chỉ",
    badgeClass: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]",
    dotClass: "bg-[#9333EA]",
  },
  {
    value: "DROPPED",
    label: "Bảo lưu / Thôi học",
    desc: "Tạm dừng hoặc bảo lưu khóa học",
    badgeClass: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    dotClass: "bg-[#DC2626]",
  },
];

const formatVND = (amount: number | string | undefined | null): string => {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

export const EnrollmentEditorSheet: React.FC<EnrollmentEditorSheetProps> = ({
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
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Student selection / input
  const initialStudentId = row.student_id || (row.student?.id ?? "");
  const [useExistingStudent, setUseExistingStudent] = useState<boolean>(!isCreate || Boolean(initialStudentId));
  const [studentId, setStudentId] = useState<string>(initialStudentId);
  const [fullName, setFullName] = useState<string>(row.full_name || row.student?.full_name || row.student_name || "");
  const [phone, setPhone] = useState<string>(row.phone || row.student?.phone || row.student_phone || "");
  const [email, setEmail] = useState<string>(row.email || row.student?.email || row.student_email || "");

  // Search existing students
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [existingStudents, setExistingStudents] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState<boolean>(false);
  const [selectedStudentObj, setSelectedStudentObj] = useState<any>(row.student || null);

  // Course & Batch state
  const [courseId, setCourseId] = useState<string>(row.course_id || "");
  const [batchId, setBatchId] = useState<string>(row.batch_id || "");
  const [status, setStatus] = useState<string>(row.status || "ENROLLED");

  // Tuition & Payment state
  const [tuitionTotal, setTuitionTotal] = useState<number>(
    row.tuition_total !== undefined && row.tuition_total !== null ? Number(row.tuition_total) : 0
  );
  const [amountPaid, setAmountPaid] = useState<number>(
    row.amount_paid !== undefined && row.amount_paid !== null ? Number(row.amount_paid) : 0
  );
  const [tuitionManuallyEdited, setTuitionManuallyEdited] = useState<boolean>(!isCreate);

  // Dates & Progress
  const formatDatetimeLocal = (val?: string | Date | null) => {
    if (!val) return new Date().toISOString().slice(0, 16);
    try {
      const d = new Date(val);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  };

  const [enrolledAt, setEnrolledAt] = useState<string>(
    row.enrolled_at ? formatDatetimeLocal(row.enrolled_at) : formatDatetimeLocal(new Date())
  );
  const [completedLessons, setCompletedLessons] = useState<number>(
    row.completed_lessons_count !== undefined ? Number(row.completed_lessons_count) : 0
  );
  const [progressPercent, setProgressPercent] = useState<number>(
    row.progress_percent !== undefined ? Number(row.progress_percent) : 0
  );

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneMatchHint, setPhoneMatchHint] = useState<string | null>(null);

  // 1. Fetch Courses and Batches
  useEffect(() => {
    let mounted = true;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [cRes, bRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/courses?select=id,title,code,tuition_fee,deposit_amount,total_hours,is_active&order=title.asc`, {
            headers: getSupabaseHeaders(),
          }),
          fetch(`${SUPABASE_URL}/rest/v1/course_batches?select=id,course_id,batch_code,start_date,schedule_text,max_students,enrolled_count&order=start_date.desc`, {
            headers: getSupabaseHeaders(),
          }),
        ]);

        const [cData, bData] = await Promise.all([cRes.json(), bRes.json()]);

        if (mounted) {
          if (Array.isArray(cData)) setCourses(cData);
          if (Array.isArray(bData)) setBatches(bData);

          // If creating and courses exist and no course selected, default to the first active course
          if (isCreate && !row.course_id && Array.isArray(cData) && cData.length > 0) {
            const first = cData.find((c) => c.is_active) || cData[0];
            setCourseId(first.id);
            if (!tuitionManuallyEdited) {
              setTuitionTotal(Number(first.tuition_fee) || 0);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải danh sách khóa học / lớp học:", err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    fetchLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Filter batches by selected course
  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course_id === courseId);
  }, [batches, courseId]);

  // Selected Course details
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === courseId);
  }, [courses, courseId]);

  // 3. Handle Course change
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const c = courses.find((item) => item.id === newCourseId);
    if (c) {
      if (!tuitionManuallyEdited || tuitionTotal === 0) {
        setTuitionTotal(Number(c.tuition_fee) || 0);
      }
    }
    // Check if current batch belongs to new course; if not, reset batch
    if (batchId) {
      const match = batches.find((b) => b.id === batchId && b.course_id === newCourseId);
      if (!match) setBatchId("");
    }
  };

  // 4. Handle Batch change
  const handleBatchChange = (newBatchId: string) => {
    setBatchId(newBatchId);
    if (newBatchId) {
      const b = batches.find((item) => item.id === newBatchId);
      if (b && b.course_id && b.course_id !== courseId) {
        handleCourseChange(b.course_id);
      }
    }
  };

  // 5. Existing Student search
  useEffect(() => {
    if (!useExistingStudent && !studentSearchTerm.trim()) return;
    let mounted = true;
    const fetchStudents = async () => {
      setSearchingStudents(true);
      try {
        const query = studentSearchTerm.trim()
          ? `or=(full_name.ilike.*${encodeURIComponent(studentSearchTerm)}*,phone.ilike.*${encodeURIComponent(studentSearchTerm)}*)`
          : "order=full_name.asc";
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/users?select=id,full_name,phone,email,role,membership_tier&limit=25&${query}`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setExistingStudents(data);
        }
      } catch (err) {
        console.warn("Lỗi tìm kiếm học viên:", err);
      } finally {
        if (mounted) setSearchingStudents(false);
      }
    };

    const timer = setTimeout(fetchStudents, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [useExistingStudent, studentSearchTerm]);

  // 6. Check phone number while typing in new student mode
  useEffect(() => {
    if (useExistingStudent || !phone.trim() || phone.trim().length < 9) {
      setPhoneMatchHint(null);
      return;
    }
    let mounted = true;
    const checkPhone = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone.trim())}&select=id,full_name,phone,membership_tier,role&limit=1`,
          { headers: getSupabaseHeaders() }
        );
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          const u = data[0];
          setPhoneMatchHint(`Tìm thấy tài khoản có sẵn: ${u.full_name} (${u.phone}) - Hạng: ${u.membership_tier || "Thành viên"}`);
        } else if (mounted) {
          setPhoneMatchHint(null);
        }
      } catch {
        if (mounted) setPhoneMatchHint(null);
      }
    };
    const timer = setTimeout(checkPhone, 400);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [phone, useExistingStudent]);

  const handleSelectExistingStudent = (u: any) => {
    setStudentId(u.id);
    setSelectedStudentObj(u);
    setFullName(u.full_name || "");
    setPhone(u.phone || "");
    setEmail(u.email || "");
  };

  // Payment Calculations
  const balanceDue = Math.max(0, tuitionTotal - amountPaid);
  const paymentRatio = tuitionTotal > 0 ? Math.min(100, Math.round((amountPaid / tuitionTotal) * 100)) : 0;
  const courseDeposit = selectedCourse ? Number(selectedCourse.deposit_amount) || 0 : 0;

  // Quick payment presets
  const handleApplyPaymentPreset = (type: "zero" | "deposit" | "half" | "full") => {
    if (type === "zero") {
      setAmountPaid(0);
      setStatus("CONSULTING");
    } else if (type === "deposit") {
      const depositVal = courseDeposit > 0 ? courseDeposit : Math.round(tuitionTotal * 0.2);
      setAmountPaid(depositVal);
      setStatus("DEPOSITED");
    } else if (type === "half") {
      setAmountPaid(Math.round(tuitionTotal * 0.5));
      if (status === "CONSULTING") setStatus("ENROLLED");
    } else if (type === "full") {
      setAmountPaid(tuitionTotal);
      if (status === "CONSULTING" || status === "DEPOSITED") setStatus("ENROLLED");
    }
  };

  // Save handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (useExistingStudent) {
      if (!studentId) {
        setError("Vui lòng chọn học viên từ danh sách.");
        return;
      }
    } else {
      if (!fullName.trim()) {
        setError("Vui lòng nhập Họ và tên học viên.");
        return;
      }
      if (!phone.trim()) {
        setError("Vui lòng nhập Số điện thoại học viên.");
        return;
      }
    }

    if (!courseId) {
      setError("Vui lòng chọn Khóa học đăng ký.");
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, any> = {
        course_id: courseId,
        batch_id: batchId || null,
        status: status,
        tuition_total: tuitionTotal,
        amount_paid: amountPaid,
        enrolled_at: enrolledAt ? new Date(enrolledAt).toISOString() : new Date().toISOString(),
        completed_lessons_count: completedLessons,
        progress_percent: progressPercent,
      };

      if (useExistingStudent) {
        payload.student_id = studentId;
      } else {
        payload.full_name = fullName.trim();
        payload.phone = phone.trim();
        payload.email = email.trim() || null;
      }

      if (isCreate) {
        await adminApi("course_enrollments/create", { values: payload });
      } else {
        const key = { id: row.id };
        if (studentId) payload.student_id = studentId;
        payload.full_name = fullName.trim();
        payload.phone = phone.trim();
        payload.email = email.trim() || null;
        await adminApi("course_enrollments/update", { key, values: payload });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi lưu hồ sơ ghi danh. Vui lòng kiểm tra lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-[#FDFBF7] text-[#2C241E] rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Header */}
      <header className="px-6 py-4 bg-white border-b border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
              <GraduationCap size={13} />
              Học viện MLD · Đào tạo nghề Vodder
            </span>
            <span className="text-xs text-[#7F6E60]">
              {isCreate ? "Ghi danh mới" : isView ? "Xem chi tiết" : "Chỉnh sửa"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#2C241E] mt-1">
            {isCreate
              ? "Đăng ký ghi danh học viên mới"
              : isView
              ? `Hồ sơ ghi danh: ${fullName || row.student_name || "Học viên"}`
              : `Cập nhật ghi danh: ${fullName || row.student_name || "Học viên"}`}
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
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* SECTION 1: THÔNG TIN HỌC VIÊN */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE4]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">1. Thông tin học viên</h3>
                <p className="text-xs text-[#7F6E60]">Chọn tài khoản có sẵn hoặc điền thông tin để tạo học viên mới</p>
              </div>
            </div>

            {!isView && (
              <div className="inline-flex p-0.5 rounded-lg bg-[#FAF0E4] border border-[#E8DFD8]">
                <button
                  type="button"
                  onClick={() => {
                    setUseExistingStudent(false);
                    setStudentId("");
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                    !useExistingStudent
                      ? "bg-white text-[#985018] shadow-xs"
                      : "text-[#7F6E60] hover:text-[#2C241E]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UserPlus size={12} />
                    Học viên mới
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseExistingStudent(true)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                    useExistingStudent
                      ? "bg-white text-[#985018] shadow-xs"
                      : "text-[#7F6E60] hover:text-[#2C241E]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Search size={12} />
                    Chọn có sẵn
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* MODE A: Chọn học viên có sẵn */}
          {useExistingStudent ? (
            <div className="space-y-3">
              {!isView && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#A69788]" />
                  <input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Tìm theo Tên học viên hoặc Số điện thoại..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-[#E8DFD8] bg-[#FDFBF7] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                  {searchingStudents && (
                    <LoaderCircle size={14} className="absolute right-3 top-2.5 animate-spin text-[#985018]" />
                  )}
                </div>
              )}

              {/* Student Picker list */}
              {!isView && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-[#E8DFD8] bg-[#FDFBF7] divide-y divide-[#E8DFD8]/60 text-xs">
                  {existingStudents.length === 0 ? (
                    <div className="p-3 text-center text-[#7F6E60]">
                      {searchingStudents ? "Đang tìm kiếm..." : "Không tìm thấy học viên nào phù hợp."}
                    </div>
                  ) : (
                    existingStudents.map((u) => {
                      const isSelected = u.id === studentId;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectExistingStudent(u)}
                          className={`w-full p-2.5 text-left flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? "bg-[#FAF0E4] text-[#985018] font-bold" : "hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#E8DFD8] text-[#4A3E31] font-bold text-xs flex items-center justify-center">
                              {(u.full_name || "HV").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[#2C241E] flex items-center gap-2">
                                <span>{u.full_name || "Chưa đặt tên"}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#7F6E60] border border-[#E8DFD8]">
                                  {u.role || "STUDENT"}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#7F6E60]">{u.phone || "Không có SĐT"} · {u.email || "Không có email"}</div>
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="text-[#985018]" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Selected Student Card */}
              {studentId && (
                <div className="p-3 rounded-lg bg-[#FAF0E4]/60 border border-[#E8DFD8] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#985018] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {(fullName || "HV").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[#2C241E] text-sm flex items-center gap-2">
                        <span>{fullName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#985018] border border-[#E8DFD8]">
                          {selectedStudentObj?.membership_tier || "Học viên"}
                        </span>
                      </div>
                      <div className="text-[#7F6E60] flex items-center gap-3 mt-0.5">
                        <span>📱 {phone || "Chưa có SĐT"}</span>
                        {email && <span>✉️ {email}</span>}
                      </div>
                    </div>
                  </div>
                  {!isView && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentId("");
                        setSelectedStudentObj(null);
                        setFullName("");
                        setPhone("");
                        setEmail("");
                      }}
                      className="text-xs text-[#DC2626] hover:underline cursor-pointer font-medium"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* MODE B: Nhập thông tin học viên mới */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                  Họ và tên học viên <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isView}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                  Số điện thoại <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  disabled={isView}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                  Email (Tùy chọn)
                </label>
                <input
                  type="email"
                  disabled={isView}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ví dụ: hocvien@gmail.com"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
              </div>

              {phoneMatchHint && (
                <div className="col-span-full p-2.5 rounded-lg bg-[#FAF0E4] border border-[#E8DFD8] text-[#985018] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} />
                    <span>{phoneMatchHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseExistingStudent(true)}
                    className="font-bold underline cursor-pointer hover:text-[#7F3E10]"
                  >
                    Chuyển sang chọn tài khoản này
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: KHÓA HỌC & LỚP HỌC PHÂN BỔ */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">2. Khóa học & Lớp học phân bổ</h3>
              <p className="text-xs text-[#7F6E60]">Lựa chọn khóa học chuyên ngành và lớp đào tạo phù hợp</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Khóa học */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Khóa học đăng ký <span className="text-[#DC2626]">*</span>
              </label>
              {loadingLookups ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải danh sách khóa học...
                </div>
              ) : (
                <select
                  required
                  disabled={isView}
                  value={courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">-- Chọn khóa học --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ""}{c.title} ({formatVND(c.tuition_fee)})
                    </option>
                  ))}
                </select>
              )}

              {selectedCourse && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#FAF0E4]/60 border border-[#E8DFD8] text-[11px] text-[#4A3E31] flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <strong>Mã:</strong> {selectedCourse.code || "—"}
                  </span>
                  <span>
                    <strong>Thời lượng:</strong> {selectedCourse.total_hours || 0} giờ
                  </span>
                  <span>
                    <strong>Học phí chuẩn:</strong> {formatVND(selectedCourse.tuition_fee)}
                  </span>
                  {selectedCourse.deposit_amount && (
                    <span>
                      <strong>Mức cọc tối thiểu:</strong> {formatVND(selectedCourse.deposit_amount)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Lớp học (Batch) */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Lớp học / Đợt đào tạo (Batch)
              </label>
              {loadingLookups ? (
                <div className="text-xs text-[#7F6E60] py-2 flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin text-[#985018]" />
                  Đang tải danh sách lớp học...
                </div>
              ) : (
                <select
                  disabled={isView}
                  value={batchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                >
                  <option value="">-- Chưa xếp lớp / Chờ khai giảng khóa sau --</option>
                  {availableBatches.map((b) => {
                    const startStr = b.start_date
                      ? new Date(b.start_date).toLocaleDateString("vi-VN")
                      : "Chưa định ngày";
                    return (
                      <option key={b.id} value={b.id}>
                        {b.batch_code} · Bắt đầu {startStr} · {b.schedule_text || "Lịch học linh hoạt"} (Sĩ số: {b.enrolled_count || 0}/{b.max_students || 30})
                      </option>
                    );
                  })}
                </select>
              )}

              <p className="text-[11px] text-[#7F6E60] mt-1.5">
                {availableBatches.length === 0
                  ? "Chưa có lớp nào mở cho khóa học này. Học viên có thể ghi danh trước và xếp lớp sau."
                  : `Đang có ${availableBatches.length} lớp học phù hợp với khóa học đã chọn.`}
              </p>
            </div>

            {/* Trạng thái học tập */}
            <div className="col-span-full md:col-span-1">
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Trạng thái học tập & Tuyển sinh <span className="text-[#DC2626]">*</span>
              </label>
              <select
                disabled={isView}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA] font-medium"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: HỌC PHÍ & TÌNH TRẠNG THANH TOÁN */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <BadgeDollarSign size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">3. Học phí & Thanh toán</h3>
              <p className="text-xs text-[#7F6E60]">Quản lý mức học phí, tiền cọc và tỷ lệ hoàn tất nghĩa vụ tài chính</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tổng học phí */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Tổng học phí khóa học (VNĐ) <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="500000"
                  required
                  disabled={isView}
                  value={tuitionTotal}
                  onChange={(e) => {
                    setTuitionManuallyEdited(true);
                    setTuitionTotal(Number(e.target.value) || 0);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#7F6E60] mt-1">
                <span>Thành tiền: <strong>{formatVND(tuitionTotal)}</strong></span>
                {selectedCourse && tuitionTotal !== Number(selectedCourse.tuition_fee) && (
                  <button
                    type="button"
                    onClick={() => setTuitionTotal(Number(selectedCourse.tuition_fee) || 0)}
                    className="text-[#985018] hover:underline cursor-pointer font-medium"
                  >
                    Khôi phục giá niêm yết
                  </button>
                )}
              </div>
            </div>

            {/* Số tiền đã thu */}
            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Số tiền thực tế đã thu (VNĐ) <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="500000"
                  max={tuitionTotal || undefined}
                  required
                  disabled={isView}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
              </div>
              <div className="text-[11px] text-[#7F6E60] mt-1">
                Đã thu: <strong>{formatVND(amountPaid)}</strong>
              </div>
            </div>

            {/* Quick Payment Preset Chips */}
            {!isView && (
              <div className="col-span-full pt-1">
                <span className="block text-[11px] font-bold text-[#7F6E60] mb-1.5 uppercase tracking-wider">
                  ⚡ Chọn nhanh mức thanh toán:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPaymentPreset("zero")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      amountPaid === 0
                        ? "bg-[#2C241E] text-white border-[#2C241E]"
                        : "bg-[#FAF0E4] text-[#7F3E10] border-[#E8DFD8] hover:bg-[#F3E2CE]"
                    }`}
                  >
                    0 đ · Chưa thu
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPaymentPreset("deposit")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      amountPaid > 0 && amountPaid === (courseDeposit || Math.round(tuitionTotal * 0.2))
                        ? "bg-[#985018] text-white border-[#985018]"
                        : "bg-[#FAF0E4] text-[#985018] border-[#E8DFD8] hover:bg-[#F3E2CE]"
                    }`}
                  >
                    Đặt cọc: {formatVND(courseDeposit > 0 ? courseDeposit : Math.round(tuitionTotal * 0.2))}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPaymentPreset("half")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      amountPaid > 0 && amountPaid === Math.round(tuitionTotal * 0.5)
                        ? "bg-[#985018] text-white border-[#985018]"
                        : "bg-[#FAF0E4] text-[#985018] border-[#E8DFD8] hover:bg-[#F3E2CE]"
                    }`}
                  >
                    Đóng đợt 1 (50%): {formatVND(Math.round(tuitionTotal * 0.5))}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPaymentPreset("full")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      amountPaid > 0 && amountPaid === tuitionTotal
                        ? "bg-[#0D6832] text-white border-[#0D6832]"
                        : "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] hover:bg-[#D1FAE5]"
                    }`}
                  >
                    Thu đủ 100%: {formatVND(tuitionTotal)}
                  </button>
                </div>
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="col-span-full p-4 rounded-xl bg-[#FAF0E4]/70 border border-[#E8DFD8] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                <span className="font-bold text-[#4A3E31]">Tỷ lệ hoàn tất học phí:</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#985018]">{paymentRatio}%</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    balanceDue === 0
                      ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
                      : amountPaid > 0
                      ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                      : "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
                  }`}>
                    {balanceDue === 0
                      ? "✓ Đã thu đủ 100%"
                      : amountPaid > 0
                      ? `Còn nợ ${formatVND(balanceDue)}`
                      : "Chưa thanh toán"}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-[#E8DFD8] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    paymentRatio >= 100 ? "bg-[#059669]" : paymentRatio > 0 ? "bg-[#D97706]" : "bg-transparent"
                  }`}
                  style={{ width: `${paymentRatio}%` }}
                />
              </div>

              <div className="flex flex-wrap justify-between text-[11px] text-[#7F6E60] pt-0.5">
                <span>Đã thu: <strong className="text-[#2C241E]">{formatVND(amountPaid)}</strong></span>
                <span>Tổng học phí: <strong className="text-[#2C241E]">{formatVND(tuitionTotal)}</strong></span>
                <span>Số tiền còn lại: <strong className={balanceDue > 0 ? "text-[#DC2626]" : "text-[#059669]"}>{formatVND(balanceDue)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: THỜI GIAN GHI DANH & TIẾN ĐỘ HỌC TẬP */}
        <div className="bg-white rounded-xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE4]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">4. Thời gian ghi danh & Tiến độ</h3>
              <p className="text-xs text-[#7F6E60]">Ghi nhận thời điểm đăng ký và theo dõi quá trình học tập</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#4A3E31]">
                  Ngày ghi danh <span className="text-[#DC2626]">*</span>
                </label>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => setEnrolledAt(formatDatetimeLocal(new Date()))}
                    className="text-[10px] text-[#985018] hover:underline font-bold cursor-pointer"
                  >
                    Bây giờ
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                required
                disabled={isView}
                value={enrolledAt}
                onChange={(e) => setEnrolledAt(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Số bài học đã hoàn thành
              </label>
              <input
                type="number"
                min="0"
                disabled={isView}
                value={completedLessons}
                onChange={(e) => setCompletedLessons(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3E31] mb-1">
                Tiến độ học tập (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={isView}
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018] disabled:bg-[#F3EFEA]"
                />
                <span className="text-xs font-bold text-[#7F6E60]">%</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 3. Footer */}
      <footer className="px-6 py-3.5 bg-white border-t border-[#E8DFD8] flex items-center justify-between shrink-0">
        <div className="text-xs text-[#7F6E60]">
          Học viên: <strong className="text-[#2C241E]">{fullName || "Chưa nhập"}</strong>
          {selectedCourse && (
            <span> · Khóa: <strong className="text-[#2C241E]">{selectedCourse.title}</strong></span>
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
          {!isView && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-[#985018] text-white hover:bg-[#7F3E10] shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              {busy ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isCreate ? "Lưu hồ sơ ghi danh" : "Lưu thay đổi"}
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
