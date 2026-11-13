import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminCommand, Listing, Row } from "../admin/api";
import "./TreatmentPackagesWorkspace.css";

export function TreatmentInventoryWorkspace() {
  const [stocks, setStocks] = useState<Row[]>([]),
    [jobs, setJobs] = useState<Row[]>([]),
    [branches, setBranches] = useState<Row[]>([]);
  const [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [revision, setRevision] = useState(0);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [count, setCount] = useState<Row>();
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminCommand<Listing>(`branch_material_stock?page=${page}&limit=25`),
      adminCommand<Listing>("treatment_inventory_outbox?page=1&limit=100"),
      adminCommand<Listing>("branches?page=1&limit=100"),
    ])
      .then(([stock, queue, locations]) => {
        if (active) {
          setStocks(stock.rows);
          setTotal(stock.total);
          setJobs(queue.rows);
          setBranches(locations.rows);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, revision]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!count || busy) return;
    setBusy(true);
    setError("");
    try {
      await adminCommand("treatment/inventory/count", count);
      setCount(undefined);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được kiểm kê.");
    } finally {
      setBusy(false);
    }
  }
  async function retry(id: string) {
    setBusy(true);
    setError("");
    try {
      const result = await adminCommand<{ synced: boolean; error?: string }>(
        `treatment/inventory/${id}/sync`,
        {},
      );
      if (!result.synced)
        setError(result.error || "Yêu cầu chưa được đồng bộ.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đồng bộ được kho.");
    } finally {
      setBusy(false);
    }
  }
  const location = (id: string) =>
    branches.find((b) => b.id === id)?.name || "Chi nhánh chưa tải được";
  return (
    <main className="treatment-workspace">
      <header>
        <div>
          <p className="tw-eyebrow">QUẢN LÝ LIỆU TRÌNH</p>
          <h1>Vật tư điều trị</h1>
          <p>
            Kiểm kê số tồn thực tế trước khi xuất kho. Hệ thống không tự tạo số
            dư ban đầu.
          </p>
        </div>
        <Link to="/manage/treatment_journal">Nhật ký điều trị</Link>
      </header>
      {error && (
        <div role="alert" className="tw-error">
          {error}
        </div>
      )}
      <section className="tw-panel">
        <h2>Tồn kho theo chi nhánh</h2>
        <button
          disabled={busy || loading}
          onClick={() => {
            setError("");
            setRevision((v) => v + 1);
          }}
        >
          Tải lại số tồn và hàng đợi
        </button>{" "}
        <Link to="/manage/treatment_stock_movements">Xem sổ biến động kho</Link>{" "}
        <button
          disabled={busy || loading}
          onClick={() =>
            setCount({
              branchId: "",
              materialName: "",
              unit: "",
              quantity: "",
              expectedQuantity: null,
              reason: "",
            })
          }
        >
          Ghi nhận vật tư đã kiểm kê
        </button>
        {loading ? (
          <p role="status">Đang tải tồn kho…</p>
        ) : (
          <>
            <div className="tw-table">
              <table>
                <thead>
                  <tr>
                    <th>Chi nhánh</th>
                    <th>Vật tư</th>
                    <th>Đơn vị</th>
                    <th>Tồn thực tế</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr key={s.id}>
                      <td>{location(s.branch_id)}</td>
                      <td>{s.material_name}</td>
                      <td>{s.unit}</td>
                      <td>{Number(s.quantity).toLocaleString("vi-VN")}</td>
                      <td>
                        <button
                          disabled={busy}
                          onClick={() =>
                            setCount({
                              branchId: s.branch_id,
                              materialName: s.material_name,
                              unit: s.unit,
                              quantity: s.quantity,
                              expectedQuantity: Number(s.quantity),
                              reason: "",
                            })
                          }
                        >
                          Đối chiếu kiểm kê
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!stocks.length && (
              <p>
                Chưa có vật tư được kiểm kê. Không thể xuất kho cho vật tư chưa
                có số tồn.
              </p>
            )}
            <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
              Trang trước
            </button>{" "}
            <span>
              Trang {page} / {Math.max(1, Math.ceil(total / 25))}
            </span>{" "}
            <button
              disabled={page * 25 >= total}
              onClick={() => setPage((v) => v + 1)}
            >
              Trang sau
            </button>
          </>
        )}
      </section>
      <section className="tw-panel">
        <h2>Yêu cầu xuất / hoàn kho gần nhất</h2>
        <p>
          Hiển thị tối đa 100 yêu cầu gần nhất. Yêu cầu thiếu tồn vẫn giữ lỗi để
          xử lý sau kiểm kê.
        </p>
        {jobs.map((j) => (
          <article key={j.id}>
            <strong>
              {location(j.branch_id)} ·{" "}
              {j.operation_type === "DEDUCT"
                ? "Xuất vật tư"
                : j.operation_type === "REVERSE_RESTORE"
                  ? "Hoàn vật tư"
                  : "Nghiệp vụ chưa xác định"}
            </strong>
            <p>
              {j.sync_status === "SYNCED"
                ? "Đã ghi sổ kho"
                : j.sync_status === "FAILED"
                  ? "Cần xử lý"
                  : "Chờ đồng bộ"}{" "}
              · {new Date(j.created_at).toLocaleString("vi-VN")}
            </p>
            {j.sync_error && <p>{j.sync_error}</p>}
            {j.sync_status !== "SYNCED" && (
              <button disabled={busy} onClick={() => retry(j.id)}>
                Đối chiếu và thử lại
              </button>
            )}
          </article>
        ))}
      </section>
      {count && (
        <div className="tw-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-count-title"
            className="tw-dialog"
          >
            <h2 id="stock-count-title">Ghi nhận kiểm kê thực tế</h2>
            {error && (
              <p role="alert" className="tw-error">
                {error}
              </p>
            )}
            <form onSubmit={save}>
              <label>
                Chi nhánh
                <select
                  required
                  disabled={count.expectedQuantity !== null || busy}
                  value={count.branchId}
                  onChange={(e) =>
                    setCount({ ...count, branchId: e.target.value })
                  }
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {[
                ["materialName", "Tên vật tư"],
                ["unit", "Đơn vị"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    disabled={count.expectedQuantity !== null || busy}
                    value={count[key]}
                    onChange={(e) =>
                      setCount({ ...count, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Số lượng đã kiểm đếm
                <input
                  required
                  type="number"
                  min="0"
                  step="0.001"
                  disabled={busy}
                  value={count.quantity}
                  onChange={(e) =>
                    setCount({ ...count, quantity: e.target.value })
                  }
                />
              </label>
              <label>
                Lý do điều chỉnh
                <textarea
                  required
                  minLength={5}
                  disabled={busy}
                  value={count.reason}
                  onChange={(e) =>
                    setCount({ ...count, reason: e.target.value })
                  }
                />
              </label>
              <p>
                Thao tác này ghi số tồn và bút toán kiểm kê. Nếu số tồn vừa thay
                đổi, cần tải lại để đối chiếu.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setCount(undefined)}
              >
                Hủy
              </button>
              <button type="submit" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu số kiểm kê"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
