import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Building2,
  Briefcase,
  BadgeDollarSign,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  X,
  Save,
  Pencil,
  LoaderCircle,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { adminApi, Row } from "./api";
import { SUPABASE_URL, getSupabaseHeaders } from "../services/supabaseClient";

export interface StaffProfileEditorSheetProps {
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
  onSwitchMode?: (newMode: "create" | "update" | "view", targetRow?: Row) => void;
}

const DEPARTMENTS = [
  { value: "THERAPY_MASSAGE", label: "Kỹ thuật trị liệu / Dẫn lưu Vodder (MLD)", short: "Trị liệu MLD" },
  { value: "RECEPTION", label: "Lễ tân & Đón tiếp", short: "Lễ tân" },
  { value: "CASHIER", label: "Thu ngân & Kế toán", short: "Thu ngân" },
  { value: "SKINCARE", label: "Chăm sóc da & Thẩm mỹ", short: "Chăm sóc da" },
  { value: "ACADEMY_TRAINING", label: "Đào tạo & Giảng dạy học viện", short: "Đào tạo" },
  { value: "CUSTOMER_SERVICE", label: "Chăm sóc khách hàng (CSKH)", short: "CSKH" },
  { value: "ADMINISTRATION", label: "Hành chính & Quản trị", short: "Hành chính" },
];

const ROLES = [
  { value: "TECHNICIAN", label: "Kỹ thuật viên trị liệu (Chuyên viên MLD)" },
  { value: "RECEPTIONIST", label: "Lễ tân tiếp đón" },
  { value: "CASHIER", label: "Thu ngân & POS" },
  { value: "INSTRUCTOR", label: "Giảng viên đào tạo" },
  { value: "BRANCH_MANAGER", label: "Quản lý cơ sở / Chi nhánh" },
  { value: "ADMIN", label: "Quản trị viên hệ thống" },
];

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Toàn thời gian (Chính thức)" },
  { value: "PART_TIME", label: "Bán thời gian (Part-time)" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "INTERN", label: "Thực tập sinh" },
];

const POPULAR_BANKS = [
  "Vietcombank (VCB)",
  "Techcombank (TCB)",
  "MB Bank (Quân Đội)",
  "BIDV",
  "VietinBank",
  "Agribank",
  "ACB (Á Châu)",
  "VPBank",
  "TPBank",
  "VIB",
  "Sacombank",
  "HDBank",
];

export const StaffProfileEditorSheet: React.FC<StaffProfileEditorSheetProps> = ({
  row,
  mode,
  onClose,
  onSaved,
  onSwitchMode,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

  // Form State
  const [fullName, setFullName] = useState(row.full_name || row.users?.full_name || "");
  const [phone, setPhone] = useState(row.phone || row.users?.phone || "");
  const [email, setEmail] = useState(row.email || row.users?.email || "");
  const [role, setRole] = useState(row.role || row.user_role || row.users?.role || "TECHNICIAN");
  const [employeeCode, setEmployeeCode] = useState(
    row.employee_code || (isCreate ? `NV-${Math.floor(1000 + Math.random() * 9000)}` : "")
  );

  // Existing user link toggle
  const [linkExistingUser, setLinkExistingUser] = useState(false);
  const [userId, setUserId] = useState(row.user_id || "");
  const [existingUsers, setExistingUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Assignment
  const [branchId, setBranchId] = useState(row.branch_id || "");
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [department, setDepartment] = useState(row.department || "THERAPY_MASSAGE");
  const [position, setPosition] = useState(row.position || (isCreate ? "Chuyên viên MLD" : ""));
  const [employmentType, setEmploymentType] = useState(row.employment_type || "FULL_TIME");

  // Compensation
  const [baseSalary, setBaseSalary] = useState(
    row.base_salary !== undefined && row.base_salary !== null ? String(row.base_salary) : "8000000"
  );
  const [commissionRate, setCommissionRate] = useState(
    row.commission_rate !== undefined && row.commission_rate !== null ? String(row.commission_rate) : "5"
  );
  const [hireDate, setHireDate] = useState(
    row.hire_date ? String(row.hire_date).slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [resignationDate, setResignationDate] = useState(
    row.resignation_date ? String(row.resignation_date).slice(0, 10) : ""
  );

  // Identity & Bank
  const [idCardNumber, setIdCardNumber] = useState(row.id_card_number || "");
  const [bankName, setBankName] = useState(row.bank_name || "Vietcombank (VCB)");
  const [bankAccountNumber, setBankAccountNumber] = useState(row.bank_account_number || "");
  const [isActive, setIsActive] = useState(row.is_active !== undefined ? Boolean(row.is_active) : true);

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Fetch branches
  useEffect(() => {
    let mounted = true;
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/branches?select=id,name,code,is_active&order=name.asc`, {
          headers: getSupabaseHeaders(),
        });
        if (!res.ok) throw new Error("Không thể tải danh sách chi nhánh.");
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setBranches(data);
          if (!branchId && data.length > 0) {
            setBranchId(data[0].id);
          }
        }
      } catch (err) {
        console.warn("Lỗi load chi nhánh:", err);
      } finally {
        if (mounted) setLoadingBranches(false);
      }
    };
    fetchBranches();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch users for linking if toggled
  useEffect(() => {
    if (!linkExistingUser) return;
    let mounted = true;
    const fetchUsers = async () => {
      setSearchingUsers(true);
      try {
        const query = userSearchTerm.trim()
          ? `or=(full_name.ilike.*${encodeURIComponent(userSearchTerm)}*,phone.ilike.*${encodeURIComponent(userSearchTerm)}*)`
          : "order=full_name.asc";
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,full_name,phone,email,role&limit=30&${query}`, {
          headers: getSupabaseHeaders(),
        });
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setExistingUsers(data);
        }
      } catch (err) {
        console.warn("Lỗi load users:", err);
      } finally {
        if (mounted) setSearchingUsers(false);
      }
    };
    const t = setTimeout(fetchUsers, 300);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [linkExistingUser, userSearchTerm]);

  const handleSelectExistingUser = (u: any) => {
    setUserId(u.id);
    setFullName(u.full_name || "");
    setPhone(u.phone || "");
    setEmail(u.email || "");
    if (u.role && u.role !== "CUSTOMER") {
      setRole(u.role);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Vui lòng nhập Họ và tên nhân viên.");
      return;
    }
    if (!phone.trim()) {
      setError("Vui lòng nhập Số điện thoại nhân viên để liên hệ và cấp tài khoản.");
      return;
    }
    if (!branchId) {
      setError("Vui lòng chọn Cơ sở / Chi nhánh làm việc.");
      return;
    }
    if (!position.trim()) {
      setError("Vui lòng nhập Chức vụ / Vị trí cụ thể (ví dụ: Chuyên viên MLD, Lễ tân...).");
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, any> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        role: role,
        employee_code: employeeCode.trim() || `NV-${Math.floor(1000 + Math.random() * 9000)}`,
        branch_id: branchId,
        department,
        position: position.trim(),
        employment_type: employmentType,
        base_salary: isNaN(Number(baseSalary)) ? 0 : Number(baseSalary),
        commission_rate: isNaN(Number(commissionRate)) ? 0 : Number(commissionRate),
        hire_date: hireDate || new Date().toISOString().slice(0, 10),
        resignation_date: resignationDate || null,
        id_card_number: idCardNumber.trim() || null,
        bank_name: bankName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        is_active: isActive,
      };

      if (linkExistingUser && userId) {
        payload.user_id = userId;
      }

      if (isCreate) {
        await adminApi("staff_profiles/create", { values: payload });
      } else {
        await adminApi("staff_profiles/update", {
          key: { id: row.id, user_id: row.user_id },
          values: payload,
          expectedUpdatedAt: row.updated_at,
        });
      }

      onSaved();
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi lưu hồ sơ nhân viên. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] bg-[#FCFBF9]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#E8DFD8] flex items-center justify-between bg-white shrink-0">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-[#B38A58]">
            MLD Spa & Clinic · Hồ sơ nhân sự
          </p>
          <h2 className="text-lg font-bold text-[#2C241E] flex items-center gap-2 mt-0.5">
            {isCreate ? (
              <>
                <Sparkles size={18} className="text-[#B38A58]" />
                Thêm mới hồ sơ nhân viên
              </>
            ) : isView ? (
              <>
                <ShieldCheck size={18} className="text-[#059669]" />
                Hồ sơ: {fullName || employeeCode || "Nhân viên"}
              </>
            ) : (
              <>
                <Pencil size={18} className="text-[#B38A58]" />
                Chỉnh sửa hồ sơ: {fullName || employeeCode || "Nhân viên"}
              </>
            )}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#766554] hover:bg-[#FAF8F5] hover:text-[#2C241E] transition-colors"
          title="Đóng"
        >
          <X size={18} />
        </button>
      </header>

      {/* Body Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Thông tin cá nhân & Tài khoản */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F4EFEA] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
                <User size={15} className="text-[#B38A58]" />
                Thông tin cá nhân & Tài khoản đăng nhập
              </h3>
            </div>
            {isCreate && (
              <label className="flex items-center gap-2 text-xs text-[#766554] cursor-pointer hover:text-[#2C241E]">
                <input
                  type="checkbox"
                  checked={linkExistingUser}
                  onChange={(e) => setLinkExistingUser(e.target.checked)}
                  className="rounded border-[#E8DFD8] text-[#B38A58] focus:ring-[#B38A58]"
                />
                <span className="flex items-center gap-1">
                  <LinkIcon size={12} />
                  Chọn tài khoản đã có sẵn
                </span>
              </label>
            )}
          </div>

          {linkExistingUser && isCreate && (
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl space-y-2">
              <span className="text-xs font-semibold text-[#766554]">
                Tìm kiếm tài khoản người dùng theo tên hoặc số điện thoại:
              </span>
              <input
                type="text"
                placeholder="Nhập tên hoặc số điện thoại để tìm..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#B38A58]"
              />
              <div className="max-h-36 overflow-y-auto border border-[#E8DFD8] rounded-lg bg-white divide-y divide-[#F4EFEA]">
                {searchingUsers ? (
                  <div className="p-3 text-center text-xs text-[#766554]">Đang tìm kiếm...</div>
                ) : existingUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#766554]">
                    Không tìm thấy tài khoản phù hợp. Bạn có thể tự nhập thông tin bên dưới để tạo mới.
                  </div>
                ) : (
                  existingUsers.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => handleSelectExistingUser(u)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#FAF8F5] transition-colors ${
                        userId === u.id ? "bg-[#FAF3EA] font-semibold text-[#B38A58]" : "text-[#2C241E]"
                      }`}
                    >
                      <div>
                        <span className="font-medium">{u.full_name || "Chưa đặt tên"}</span>
                        <span className="text-[#766554] ml-2">· {u.phone}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {u.role || "CUSTOMER"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Họ và tên nhân viên <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  disabled={isView}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Số điện thoại liên hệ & đăng nhập <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  disabled={isView}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Email công việc / cá nhân
              </label>
              <input
                type="email"
                placeholder="Ví dụ: mai.nguyen@mldspa.vn"
                disabled={isView}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Mã nhân viên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: NV-102"
                disabled={isView}
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] font-mono focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Vai trò tài khoản hệ thống <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isView}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#766554] mt-1">
                Phân quyền quyết định các chức năng nhân viên được phép truy cập trên hệ thống Web Admin / KTV Mobile.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Vị trí công tác & Phân bổ chi nhánh */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F4EFEA] pb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
              <Building2 size={15} className="text-[#B38A58]" />
              Vị trí công tác & Chi nhánh
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Cơ sở / Chi nhánh làm việc <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isView || loadingBranches}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
                required
              >
                <option value="">-- Chọn cơ sở làm việc --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code || "MLD"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Bộ phận phụ trách <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isView}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Chức vụ / Vị trí cụ thể <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: KTV Vodder Cấp 2 / Trưởng ca"
                disabled={isView}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Hình thức làm việc <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isView}
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Chế độ đãi ngộ & Thông tin thanh toán */}
        <div className="bg-white border border-[#E8DFD8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F4EFEA] pb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FAF3EA] text-[#B38A58] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-1.5">
              <BadgeDollarSign size={15} className="text-[#B38A58]" />
              Chế độ đãi ngộ, Lương thưởng & Thanh toán
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Lương cơ bản (VNĐ / tháng)
              </label>
              <input
                type="number"
                step="500000"
                placeholder="Ví dụ: 8000000"
                disabled={isView}
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Tỷ lệ hoa hồng dịch vụ (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder="Ví dụ: 5"
                disabled={isView}
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Ngày vào làm
              </label>
              <input
                type="date"
                disabled={isView}
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Ngày nghỉ việc (nếu có)
              </label>
              <input
                type="date"
                disabled={isView}
                value={resignationDate}
                onChange={(e) => setResignationDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Số Căn cước công dân / CMND
              </label>
              <input
                type="text"
                placeholder="Nhập 12 số CCCD"
                disabled={isView}
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Ngân hàng thụ hưởng
              </label>
              <input
                type="text"
                list="bank-suggestions"
                placeholder="Chọn hoặc nhập tên ngân hàng"
                disabled={isView}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
              <datalist id="bank-suggestions">
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C241E] mb-1.5">
                Số tài khoản ngân hàng
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 0011001234567"
                disabled={isView}
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-lg text-[#2C241E] font-mono focus:outline-none focus:border-[#B38A58] disabled:bg-[#F9F7F5] disabled:text-[#766554]"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isView}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8DFD8] text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs font-bold text-[#2C241E]">
                  Đang làm việc tại MLD Spa & Clinic (Kích hoạt)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="pt-3 border-t border-[#E8DFD8] flex items-center justify-end gap-3 sticky bottom-0 bg-[#FCFBF9]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-[#E8DFD8] text-xs font-semibold text-[#766554] bg-white hover:bg-[#FAF8F5] transition-colors"
          >
            Đóng
          </button>
          {isView ? (
            <button
              type="button"
              onClick={() => onSwitchMode && onSwitchMode("update", row)}
              className="px-4 py-2 rounded-lg bg-[#B38A58] text-xs font-bold text-white hover:bg-[#967143] transition-colors flex items-center gap-1.5"
            >
              <Pencil size={14} />
              Chỉnh sửa hồ sơ
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-lg bg-[#B38A58] text-xs font-bold text-white hover:bg-[#967143] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              {isCreate ? "Tạo hồ sơ nhân viên" : "Lưu thay đổi"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
};
