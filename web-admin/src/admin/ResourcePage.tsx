import React, { useEffect, useRef, useState } from "react";
import { TrainingActions } from "./TrainingActions";
import { QuizOptions, quizOptions } from "./QuizOptions";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Eye,
  Check,
  Play,
  LogOut,
  Send,
  Ban,
  Save,
  AlertCircle,
  Upload,
} from "lucide-react";
import {
  adminApi,
  Column,
  Listing,
  recordLabel,
  Resource,
  Row,
  rowKey,
} from "./api";
import { DEFAULT_RESOURCES } from "./defaultResources";
import { display, enums, label } from "./labels";

function formatCell(row: Row, c: Column): React.ReactNode {
  if (c.name === "branch_id") {
    return row.branch_name || row.branches?.name || row.branches?.code || display(row[c.name]);
  }
  if (c.name === "user_id") {
    return row.full_name || row.users?.full_name || display(row[c.name]);
  }
  if (c.name === "customer_id") {
    return row.customer_name || row.customer?.full_name || row.users?.full_name || display(row[c.name]);
  }
  if (c.name === "technician_id") {
    return row.technician_name || row.technicians?.full_name || display(row[c.name]);
  }
  if (c.name === "service_id") {
    return row.service_name || row.services?.name || display(row[c.name]);
  }
  if (c.name === "booking_id") {
    return row.booking_code || row.bookings?.booking_code || display(row[c.name]);
  }
  if (c.name === "primary_instructor_id" || c.name === "instructor_id") {
    return row.instructor_name || row.instructor?.full_name || display(row[c.name]);
  }
  if (c.name === "rating") {
    const val = Number(row[c.name]);
    if (!isNaN(val) && val > 0) {
      return `⭐ ${val} / 5`;
    }
  }
  if (c.name === "reward_points") {
    const val = Number(row[c.name]);
    if (!isNaN(val)) {
      return val.toLocaleString("vi-VN") + " điểm";
    }
  }
  if (c.name === "total_spent") {
    const val = Number(row[c.name]);
    if (!isNaN(val)) {
      return val.toLocaleString("vi-VN") + " đ";
    }
  }
  if (c.name === "base_salary") {
    const val = Number(row[c.name]);
    if (!isNaN(val) && val > 0) {
      return val.toLocaleString("vi-VN") + " đ";
    }
  }
  if (c.name === "commission_rate") {
    const val = Number(row[c.name]);
    if (!isNaN(val) && val > 0) {
      return val + " %";
    }
  }
  if (c.name === "avatar_url" && row[c.name]) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={row[c.name]}
          alt=""
          className="w-7 h-7 rounded-full object-cover border border-[#EFE4D9] bg-[#FAF8F5] shrink-0"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
        <span className="text-xs text-[#7A6D61] truncate max-w-[130px]">{row[c.name]}</span>
      </div>
    );
  }
  if (Array.isArray(row[c.name])) {
    return row[c.name].length > 0 ? row[c.name].join(", ") : "—";
  }
  return display(row[c.name]);
}

function ReferenceInput({
  column,
  value,
  onChange,
  required,
}: {
  column: Column;
  value: string;
  onChange: (v: string) => void;
  required: boolean;
}) {
  const [search, setSearch] = useState(""),
    [rows, setRows] = useState<Row[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      adminApi<Listing>(
        `${column.reference!.table}?limit=25&page=${page}&search=${encodeURIComponent(search)}`,
        undefined,
        controller.signal,
      )
        .then((data) => {
          setRows(data.rows);
          setTotal(data.total);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [column.reference!.table, search, page]);
  return (
    <div className="admin-reference">
      <input
        type="search"
        aria-label={`Tìm ${label(column.name)}`}
        placeholder="Tìm bản ghi liên kết…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <select
        aria-label={label(column.name)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={busy}
      >
        <option value="">{busy ? "Đang tải…" : "Chưa chọn"}</option>
        {value &&
          !rows.some((r) => String(r[column.reference!.column]) === value) && (
            <option value={value}>{value}</option>
          )}
        {rows.map((r, i) => (
          <option
            key={String(r[column.reference!.column]) + "-" + i}
            value={r[column.reference!.column]}
          >
            {recordLabel(r)}
            {r.phone ? " · " + r.phone : ""}
            {r.full_name || r.name || r.title
              ? " · " + String(r[column.reference!.column]).slice(0, 8)
              : ""}
          </option>
        ))}
      </select>
      {error && <span className="admin-field-error">{error}</span>}
      {total > 25 && (
        <div className="admin-reference-pages">
          <button
            type="button"
            title="Trang trước"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {page} / {Math.ceil(total / 25)}
          </span>
          <button
            type="button"
            title="Trang sau"
            disabled={page * 25 >= total || busy}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ImageUploadInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSearchEngineUrl =
    typeof value === "string" &&
    (value.includes("bing.com/images") ||
      value.includes("google.com/search") ||
      value.includes("google.com/imgres") ||
      value.includes("yandex.com/images"));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLoadError(false);
    try {
      const ext = file.name.split(".").pop() || "png";
      const cleanFileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const SUPABASE_URL = "https://wstvwushpwcdsmhpunvh.supabase.co";
      const KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE";

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${cleanFileName}`,
        {
          method: "POST",
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            "Content-Type": file.type || "image/png",
          },
          body: file,
        },
      );
      if (!res.ok) {
        throw new Error("Không thể tải ảnh lên kho lưu trữ Supabase.");
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${cleanFileName}`;
      onChange(publicUrl);
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải ảnh");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="url"
          style={{ flex: 1 }}
          placeholder="https://... (dán link ảnh trực tiếp đuôi .jpg, .png hoặc tải từ máy)"
          value={value}
          onChange={(e) => {
            setLoadError(false);
            onChange(e.target.value.trim());
          }}
          required={required}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="admin-secondary"
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            cursor: "pointer",
          }}
          title="Tải ảnh trực tiếp từ máy tính"
        >
          {uploading ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          <span>{uploading ? "Đang tải..." : "Tải từ máy"}</span>
        </button>
      </div>

      {isSearchEngineUrl && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#FEF3C7",
            border: "1px solid #FCD34D",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#92400E",
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <b>Lưu ý link tìm kiếm:</b> Đường dẫn này là trang tìm kiếm Bing/Google, không phải file ảnh trực tiếp nên trình duyệt không thể hiển thị ảnh.
            <br />
            👉 <b>Cách làm:</b> Chuột phải vào bức ảnh trên Bing/Google &gt; chọn <b>"Sao chép địa chỉ hình ảnh" (Copy image address)</b> rồi dán lại, hoặc bấm nút <b>"Tải từ máy"</b> ở trên.
          </div>
        </div>
      )}

      {value && !isSearchEngineUrl && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 10px",
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              overflow: "hidden",
              backgroundColor: "#FFF",
              border: "1px solid #D1D5DB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {loadError ? (
              <AlertCircle size={20} color="#EF4444" />
            ) : (
              <img
                src={value}
                alt="Xem trước ảnh chân dung"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setLoadError(true)}
              />
            )}
          </div>
          <div style={{ fontSize: "12px" }}>
            {loadError ? (
              <span style={{ color: "#DC2626", fontWeight: 500 }}>
                ⚠️ Không tải được ảnh từ link này. Vui lòng kiểm tra lại đường dẫn ảnh trực tiếp.
              </span>
            ) : (
              <span style={{ color: "#059669", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Check size={14} /> Ảnh hợp lệ (Xem trước trực tiếp)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordDialog({
  resource,
  columns,
  row,
  mode,
  onClose,
  onSaved,
}: {
  resource: Resource;
  columns: Column[];
  row: Row;
  mode: "create" | "update" | "view";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Row>(() =>
      mode === "create" ? { ...row } : {},
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const generated =
    resource.name === "users"
      ? ["referral_code"]
      : resource.name === "student_certificates"
        ? ["qr_verification_code"]
        : [];
  const fields = columns.filter(
    (c) =>
      mode === "view" ||
      (c.writable &&
        !generated.includes(c.name) &&
        !(mode === "update" && c.primary)),
  );
  const set = (name: string, value: any) =>
    setValues((old) => ({ ...old, [name]: value }));

  const formatDatetimeForInput = (val: any) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val).slice(0, 16);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const formatDateForInput = (val: any) => {
    if (!val) return "";
    return String(val).slice(0, 10);
  };

  const current = (c: Column) => {
    if (values[c.name] !== undefined) return values[c.name];
    if (mode === "create") {
      if (c.type === "bool") return c.defaultValue === "true" || c.name.startsWith("is_");
      if (c.name === "valid_from") {
        return formatDatetimeForInput(new Date());
      }
      if (c.name === "valid_to") {
        return formatDatetimeForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      }
      if (c.name === "booking_date" || c.name === "session_date" || c.name === "start_date") {
        return formatDateForInput(new Date());
      }
      return "";
    }
    const val = row[c.name];
    if (val === null || val === undefined) return "";
    if (c.type === "timestamptz" || c.type === "timestamp") {
      return formatDatetimeForInput(val);
    }
    if (c.type === "date") {
      return formatDateForInput(val);
    }
    return val;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: Row = {};
      const mergedValues: Row = { ...values };

      // Ensure fields with create defaults are populated
      if (mode === "create") {
        for (const c of fields) {
          if (mergedValues[c.name] === undefined) {
            const defVal = current(c);
            if (defVal !== "" && defVal !== undefined) {
              mergedValues[c.name] = defVal;
            }
          }
        }
      }

      for (const [name, value] of Object.entries(mergedValues)) {
        const c = columns.find((x) => x.name === name);
        if (name === "password") {
          if (value) payload.password = value;
          continue;
        }
        if (!c) continue;
        if (value === "") {
          if (mode === "update" || !c.hasDefault) payload[name] = null;
          continue;
        }
        if (["numeric", "int2", "int4", "int8", "float4", "float8"].includes(c.type)) {
          payload[name] = isNaN(Number(value)) ? value : Number(value);
        } else if (["timestamptz", "timestamp"].includes(c.type) && typeof value === "string") {
          try {
            payload[name] = new Date(value).toISOString();
          } catch {
            payload[name] = value;
          }
        } else if (["json", "jsonb"].includes(c.type) || c.type.startsWith("_")) {
          payload[name] = typeof value === "string" ? JSON.parse(value) : value;
        } else {
          payload[name] = value;
        }
      }
      await adminApi(`${resource.name}/${mode}`, {
        values: payload,
        ...(mode === "update"
          ? { key: rowKey(columns, row), expectedUpdatedAt: row.updated_at }
          : {}),
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Nội dung JSON chưa hợp lệ."
          : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      className="admin-dialog"
      ref={dialog}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="record-heading"
    >
      <form onSubmit={save}>
        <header>
          <div>
            <p className="admin-eyebrow">{resource.title}</p>
            <h2 id="record-heading">
              {mode === "view"
                ? "Chi tiết"
                : mode === "create"
                  ? "Thêm mới"
                  : "Chỉnh sửa"}
            </h2>
          </div>
          <button
            type="button"
            className="admin-icon"
            title="Đóng"
            onClick={onClose}
            disabled={busy}
          >
            <X />
          </button>
        </header>
        <div className="admin-form-grid">
          {fields.map((c) => {
            const value = current(c),
              structured =
                ["json", "jsonb"].includes(c.type) || c.type.startsWith("_");
            const required = c.required && !c.hasDefault && mode === "create";
            const text =
              structured && typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value);
            if (
              resource.name === "quiz_questions" &&
              c.name === "options" &&
              mode !== "view"
            )
              return (
                <QuizOptions
                  key={c.name}
                  value={value}
                  onChange={(options, removed) => {
                    set("options", options);
                    if (removed) set("correct_option", "");
                  }}
                />
              );
            return (
              <label
                key={c.name}
                className={
                  structured || c.type === "text" ? "admin-field-wide" : ""
                }
              >
                <span>
                  {label(c.name)}
                  {required && <b className="admin-required"> *</b>}
                </span>
                {mode === "view" ? (
                  <div className="admin-detail-value">
                    {formatCell(row, c)}
                  </div>
                ) : resource.name === "quiz_questions" &&
                  c.name === "correct_option" ? (
                  <select
                    value={value}
                    required
                    onChange={(e) => set(c.name, e.target.value)}
                  >
                    <option value="">Chọn đáp án đúng</option>
                    {quizOptions(
                      current(
                        columns.find((column) => column.name === "options")!,
                      ),
                    ).map(([key]) => (
                      <option key={key} value={key}>
                        Đáp án {key}
                      </option>
                    ))}
                  </select>
                ) : c.reference ? (
                  <ReferenceInput
                    column={c}
                    value={String(value)}
                    onChange={(v) => set(c.name, v)}
                    required={required}
                  />
                ) : c.options.length ? (
                  <select
                    value={value}
                    onChange={(e) => set(c.name, e.target.value)}
                    required={required}
                  >
                    <option value="">
                      {c.hasDefault ? "Theo cấu hình database" : "Chưa chọn"}
                    </option>
                    {c.options.map((o) => (
                      <option key={o} value={o}>
                        {enums[o] || o}
                      </option>
                    ))}
                  </select>
                ) : c.type === "bool" ? (
                  <span className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => set(c.name, e.target.checked)}
                    />
                    {value ? "Có" : "Không"}
                  </span>
                ) : c.name === "avatar_url" || c.name === "image_url" || c.name.endsWith("_image_url") ? (
                  <ImageUploadInput
                    value={String(value || "")}
                    onChange={(v) => set(c.name, v)}
                    required={required}
                  />
                ) : c.name === "video_url" ? (
                  <input
                    type="url"
                    value={text}
                    onChange={(e) => set(c.name, e.target.value)}
                    required={
                      required ||
                      current(
                        columns.find(
                          (column) => column.name === "lesson_type",
                        )!,
                      ) === "VIDEO"
                    }
                  />
                ) : structured || c.type === "text" ? (
                  <textarea
                    rows={structured ? 5 : 3}
                    value={text}
                    onChange={(e) => set(c.name, e.target.value)}
                    required={required}
                    spellCheck={false}
                  />
                ) : (
                  <input
                    type={
                      c.type === "date"
                        ? "date"
                        : c.type === "timestamptz" || c.type === "timestamp"
                          ? "datetime-local"
                          : c.type === "time"
                            ? "time"
                            : [
                                  "numeric",
                                  "int2",
                                  "int4",
                                  "int8",
                                  "float4",
                                  "float8",
                                ].includes(c.type)
                              ? "number"
                              : c.name === "email"
                                ? "email"
                                : "text"
                    }
                    step={
                      c.type === "numeric" || c.type.startsWith("float")
                        ? "0.01"
                        : c.type === "time"
                          ? "1"
                          : undefined
                    }
                    value={
                      c.type === "date"
                        ? String(value).slice(0, 10)
                        : c.type === "timestamptz" || c.type === "timestamp"
                          ? value
                            ? new Date(
                                new Date(value).getTime() -
                                  new Date(value).getTimezoneOffset() * 60000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                          : value
                    }
                    onChange={(e) =>
                      set(
                        c.name,
                        (c.type === "timestamp" || c.type === "timestamptz") &&
                          e.target.value
                          ? new Date(e.target.value).toISOString()
                          : e.target.value,
                      )
                    }
                    required={required}
                    maxLength={c.maxLength || undefined}
                  />
                )}
              </label>
            );
          })}
          {resource.name === "users" && mode !== "view" && (
            <label>
              <span>
                {mode === "create" ? "Mật khẩu đăng nhập" : "Mật khẩu mới"}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                value={values.password || ""}
                onChange={(e) => set("password", e.target.value)}
              />
            </label>
          )}
        </div>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="admin-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Đóng
          </button>
          {mode !== "view" && (
            <button
              className="admin-primary"
              disabled={
                busy || (mode === "update" && !Object.keys(values).length)
              }
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Save />}Lưu
              thay đổi
            </button>
          )}
        </footer>
      </form>
    </dialog>
  );
}

function availableActions(table: string, row: Row) {
  if (table === "bookings")
    return row.status === "CONFIRMED"
      ? [{ key: "checkin", title: "Check-in", icon: Check }]
      : row.status === "CHECKED_IN"
        ? [{ key: "start", title: "Bắt đầu dịch vụ", icon: Play }]
        : row.status === "IN_SERVICE"
          ? [{ key: "checkout", title: "Check-out", icon: LogOut }]
          : [];
  if (
    ["invoices", "tuition_transactions"].includes(table) &&
    ["UNPAID", "PENDING"].includes(row.payment_status)
  )
    return row.transaction_type === "REFUND"
      ? [
          {
            key: "confirm-refund",
            title: "Xác nhận đã hoàn học phí",
            icon: Check,
          },
        ]
      : [
          {
            key: "confirm-payment",
            title: "Xác nhận đã nhận tiền",
            icon: Check,
          },
        ];
  if (table === "invoices" && row.payment_status === "PAID")
    return [{ key: "refund", title: "Hoàn toàn bộ hóa đơn", icon: Ban }];
  if (table === "student_certificates")
    return row.status === "DRAFT"
      ? [{ key: "issue", title: "Phát hành", icon: Send }]
      : row.status === "ISSUED"
        ? [{ key: "revoke", title: "Thu hồi", icon: Ban }]
        : [];
  return [];
}

export function ResourcePage({ table: fixedTable }: { table?: string }) {
  const { table: routeTable } = useParams(),
    table = fixedTable || routeTable || "";
  const [params, setParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>(DEFAULT_RESOURCES),
    [listing, setListing] = useState<Listing | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0),
    [pending, setPending] = useState(false);
  const [edit, setEdit] = useState<{
      row: Row;
      mode: "create" | "update" | "view";
    } | null>(null),
    [confirmation, setConfirmation] = useState<{
      row: Row;
      action: string;
      title: string;
    } | null>(null),
    [reason, setReason] = useState("");
  const [search, setSearch] = useState(params.get("search") || "");
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const page = Number(params.get("page")) || 1;
  const resource = resources.find((r) => r.name === table);
  useEffect(() => {
    const c = new AbortController();
    adminApi<Resource[]>("resources", undefined, c.signal)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setResources(res);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get("search") || "")) {
        const next = new URLSearchParams(params);
        search ? next.set("search", search) : next.delete("search");
        next.delete("page");
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, params, setParams]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListing(null);
    setError("");
    setEdit(null);
    setConfirmation(null);
    setNotice("");
    adminApi<Listing>(
      `${table}?${params.toString()}`,
      undefined,
      controller.signal,
    )
      .then(setListing)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [table, params.toString(), version]);
  useEffect(() => {
    if (confirmation) confirmDialog.current?.showModal();
  }, [confirmation]);
  useEffect(() => {
    if (
      !listing ||
      !resource?.actions?.includes("create") ||
      params.get("create") !== "1"
    )
      return;
    setEdit({
      mode: "create",
      row:
        table === "course_lessons" && params.get("lesson_type") === "VIDEO"
          ? { lesson_type: "VIDEO" }
          : {},
    });
  }, [listing, resource, table, params]);
  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(name, value) : next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next);
  };
  let filter: Row = {};
  try {
    filter = JSON.parse(params.get("filter") || "{}");
  } catch {}
  const filterColumns =
    listing?.columns.filter((c) => c.options.length || c.type === "bool") || [];
  const preferred = [
    "name",
    "full_name",
    "title",
    "booking_code",
    "invoice_code",
    "transaction_code",
    "certificate_code",
    "employee_code",
    "batch_code",
    "code",
    "phone",
    "email",
    "booking_date",
    "session_date",
    "start_time",
    "price",
    "amount",
    "total_amount",
    "tuition_total",
    "amount_paid",
    "status",
    "payment_status",
    "is_active",
    "is_published",
  ];
  const columnOrder: Record<string, string[]> = {
    coupons: [
      "code",
      "title",
      "discount_percent",
      "discount_amount",
      "valid_from",
      "valid_to",
      "usage_limit",
      "used_count",
      "is_active",
    ],
    branches: ["name", "code", "phone", "address", "city", "is_active"],
    branch_rooms: ["name", "branch_id", "room_type", "bed_capacity", "is_available"],
    services: ["name", "code", "category_id", "price", "duration_minutes", "is_active"],
    treatment_packages: ["name", "code", "total_sessions", "price", "is_active"],
    bookings: ["booking_code", "customer_id", "branch_id", "booking_date", "start_time", "status", "payment_status"],
    users: [
      "full_name",
      "phone",
      "email",
      "role",
      "membership_tier",
      "reward_points",
      "total_spent",
      "is_active",
    ],
    consultation_surveys: [
      "customer_id",
      "booking_id",
      "focus_areas",
      "pressure_pref",
      "has_sensitive_skin",
      "special_requests",
      "created_at",
    ],
    reviews: [
      "customer_id",
      "service_id",
      "technician_id",
      "rating",
      "comment",
      "branch_reply",
      "created_at",
    ],
    support_tickets: [
      "customer_id",
      "subject",
      "message",
      "status",
      "admin_reply",
      "created_at",
    ],
    support_faqs: [
      "category",
      "question",
      "answer",
      "display_order",
      "is_active",
    ],
    staff_profiles: [
      "full_name",
      "employee_code",
      "department",
      "position",
      "branch_id",
      "phone",
      "is_active",
    ],
    course_lessons: [
      "title",
      "lesson_type",
      "lesson_order",
      "duration_minutes",
      "video_url",
    ],
    course_quizzes: [
      "title",
      "total_questions",
      "time_limit_minutes",
      "passing_score",
    ],
    quiz_questions: [
      "question_text",
      "question_number",
      "correct_option",
      "quiz_id",
    ],
  };
  const visible = listing
    ? columnOrder[table]
      ? columnOrder[table].flatMap((name) =>
          listing.columns.find((c) => c.name === name)
            ? [listing.columns.find((c) => c.name === name)!]
            : [],
        )
      : listing.columns.filter((c) => preferred.includes(c.name)).slice(0, 7)
    : [];
  if (listing && visible.length < 3)
    for (const c of listing.columns) {
      if (!visible.includes(c) && !["jsonb", "text"].includes(c.type))
        visible.push(c);
      if (visible.length >= 5) break;
    }
  const done = () => {
    setEdit(null);
    if (params.has("create")) {
      const next = new URLSearchParams(params);
      next.delete("create");
      next.delete("lesson_type");
      setParams(next, { replace: true });
    } else setVersion((v) => v + 1);
  };
  return (
    <section className="admin-resource">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{resource?.group || "QUẢN TRỊ"}</p>
          <h1>{resource?.title || "Đang tải phân hệ…"}</h1>
        </div>
        <div className="admin-toolbar-actions">
          <button
            className="admin-icon"
            title="Tải lại"
            onClick={() => setVersion((v) => v + 1)}
            disabled={loading}
          >
            <RefreshCw size={18} />
          </button>
          {resource?.actions?.includes("create") && listing && (
            <button
              className="admin-primary"
              onClick={() => setEdit({ row: {}, mode: "create" })}
            >
              <Plus />
              Thêm mới
            </button>
          )}
        </div>
      </div>
      {[
        "course_lessons",
        "course_quizzes",
        "quiz_questions",
        "course_chapters",
      ].includes(table) && <TrainingActions />}
      <nav className="admin-related-tabs" aria-label="Phân hệ liên quan">
        {resources
          .filter((r) => r.group === resource?.group)
          .map((r) => (
            <Link
              key={r.name}
              to={`/manage/${r.name}`}
              aria-current={r.name === table ? "page" : undefined}
            >
              {r.title}
            </Link>
          ))}
      </nav>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Tìm kiếm…"
            aria-label="Tìm kiếm bản ghi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterColumns.slice(0, 3).map((c) => (
          <select
            key={c.name}
            aria-label={`Lọc ${label(c.name)}`}
            value={filter[c.name] === undefined ? "" : String(filter[c.name])}
            onChange={(e) => {
              const next = { ...filter };
              if (e.target.value === "") delete next[c.name];
              else
                next[c.name] =
                  c.type === "bool"
                    ? e.target.value === "true"
                    : e.target.value;
              updateParam(
                "filter",
                Object.keys(next).length ? JSON.stringify(next) : "",
              );
            }}
          >
            <option value="">{label(c.name)} · Tất cả</option>
            {(c.options.length ? c.options : ["true", "false"]).map((v) => (
              <option key={v} value={v}>
                {enums[v] ||
                  (v === "true" ? "Có" : v === "false" ? "Không" : v)}
              </option>
            ))}
          </select>
        ))}
        {Object.keys(filter).length > 0 && (
          <button
            className="admin-secondary"
            onClick={() => updateParam("filter", "")}
          >
            <X size={14} />
            Xóa bộ lọc
          </button>
        )}
      </div>
      {error ? (
        <div className="admin-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setVersion((v) => v + 1)}>Thử lại</button>
        </div>
      ) : loading ? (
        <div className="admin-empty">
          <LoaderCircle className="animate-spin" />
          <p>Đang tải dữ liệu…</p>
        </div>
      ) : (
        listing && (
          <>
            {notice && (
              <p className="admin-notice" role="status">
                {notice}
              </p>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {visible.map((c) => (
                      <th key={c.name}>
                        <button
                          onClick={() => {
                            const next = new URLSearchParams(params);
                            next.set("sort", c.name);
                            next.set(
                              "direction",
                              params.get("sort") === c.name &&
                                params.get("direction") === "asc"
                                ? "desc"
                                : "asc",
                            );
                            next.delete("page");
                            setParams(next);
                          }}
                        >
                          {label(c.name)}
                          {params.get("sort") === c.name
                            ? params.get("direction") === "asc"
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </button>
                      </th>
                    ))}
                    <th className="admin-row-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.rows.map((row, i) => (
                    <tr key={JSON.stringify(rowKey(listing.columns, row)) || i}>
                      {visible.map((c, j) => (
                        <td key={c.name}>
                          {j === 0 ? (
                            <button
                              className="admin-record-link"
                              onClick={() => setEdit({ row, mode: "view" })}
                            >
                              {formatCell(row, c)}
                            </button>
                          ) : (
                            <span
                              className={
                                c.name === "status" ||
                                c.name === "payment_status"
                                  ? "admin-status"
                                  : ""
                              }
                            >
                              {formatCell(row, c)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="admin-row-actions">
                          <button
                            className="admin-icon"
                            title="Xem chi tiết"
                            onClick={() => setEdit({ row, mode: "view" })}
                          >
                            <Eye size={16} />
                          </button>
                          {resource?.actions?.includes("update") && (
                            <button
                              className="admin-icon"
                              title="Chỉnh sửa"
                              onClick={() => setEdit({ row, mode: "update" })}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {resource?.actions?.includes("delete") && (
                            <button
                              className="admin-icon admin-danger"
                              title="Xóa"
                              onClick={() => {
                                setReason("");
                                setConfirmation({
                                  row,
                                  action: "delete",
                                  title: "Xóa bản ghi",
                                });
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {resource?.actions?.includes("action") &&
                            availableActions(table, row).map((a) => (
                              <button
                                key={a.key}
                                className="admin-icon"
                                title={a.title}
                                onClick={() => {
                                  setReason("");
                                  setConfirmation({
                                    row,
                                    action: a.key,
                                    title: a.title,
                                  });
                                }}
                              >
                                <a.icon size={16} />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!listing.rows.length && (
                <div className="admin-empty">
                  <p>
                    {params.get("search") || params.get("filter")
                      ? "Không có kết quả phù hợp."
                      : "Chưa có dữ liệu."}
                  </p>
                </div>
              )}
            </div>
            <div className="admin-pagination">
              <span>{listing.total.toLocaleString("vi-VN")} bản ghi</span>
              <div>
                <select
                  aria-label="Số bản ghi mỗi trang"
                  value={params.get("limit") || "25"}
                  onChange={(e) => updateParam("limit", e.target.value)}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / trang
                    </option>
                  ))}
                </select>
                <button
                  className="admin-icon"
                  title="Trang trước"
                  disabled={page <= 1}
                  onClick={() => updateParam("page", String(page - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  {page} /{" "}
                  {Math.max(1, Math.ceil(listing.total / listing.limit))}
                </span>
                <button
                  className="admin-icon"
                  title="Trang sau"
                  disabled={page * listing.limit >= listing.total}
                  onClick={() => updateParam("page", String(page + 1))}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )
      )}
      {resource && listing && edit && (
        <RecordDialog
          key={table + edit.mode + JSON.stringify(edit.row)}
          resource={resource}
          columns={listing.columns}
          row={edit.row}
          mode={edit.mode}
          onClose={() => {
            setEdit(null);
            if (params.has("create")) {
              const next = new URLSearchParams(params);
              next.delete("create");
              next.delete("lesson_type");
              setParams(next, { replace: true });
            }
          }}
          onSaved={done}
        />
      )}
      {confirmation && listing && (
        <dialog
          ref={confirmDialog}
          className="admin-dialog admin-confirm"
          onCancel={(e) => {
            if (pending) e.preventDefault();
            else setConfirmation(null);
          }}
          aria-labelledby="confirm-heading"
        >
          <header>
            <h2 id="confirm-heading">{confirmation.title}</h2>
          </header>
          <p>{recordLabel(confirmation.row)}</p>
          <p>
            {confirmation.action === "delete"
              ? "Bản ghi sẽ bị xóa khỏi database chung."
              : confirmation.action === "confirm-payment"
                ? "Chỉ xác nhận khi thực tế đã nhận đủ tiền mặt hoặc kiểm tra giao dịch chuyển khoản."
                : ["refund", "confirm-refund"].includes(confirmation.action)
                  ? "Chỉ xác nhận sau khi thực tế đã hoàn tiền cho khách hàng."
                  : "Thay đổi sẽ được lưu vào database chung."}
          </p>
          {["revoke", "refund", "confirm-refund"].includes(
            confirmation.action,
          ) && (
            <label>
              Lý do
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
              />
            </label>
          )}
          <footer>
            <button
              className="admin-secondary"
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              Hủy
            </button>
            <button
              className="admin-primary"
              disabled={
                pending ||
                (["revoke", "refund", "confirm-refund"].includes(
                  confirmation.action,
                ) &&
                  !reason.trim())
              }
              onClick={async () => {
                setPending(true);
                try {
                  await adminApi(
                    `${table}/${confirmation.action === "delete" ? "delete" : "action"}`,
                    {
                      key: rowKey(listing.columns, confirmation.row),
                      action: confirmation.action,
                      reason,
                      expectedUpdatedAt: confirmation.row.updated_at,
                    },
                  );
                  setConfirmation(null);
                  setVersion((v) => v + 1);
                } catch (err) {
                  setConfirmation(null);
                  setError((err as Error).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
              Xác nhận
            </button>
          </footer>
        </dialog>
      )}
    </section>
  );
}
