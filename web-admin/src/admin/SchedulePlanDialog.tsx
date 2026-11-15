import { useEffect, useState } from "react";
import { adminApi, Listing, Row } from "./api";

type Preview = { sessions: { date: string; existing: boolean }[]; created: number; saved: boolean };

export function SchedulePlanDialog({ batchId, onSaved, onOpenWeek }: {
  batchId: string;
  onSaved: () => void;
  onOpenWeek: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState<Row>();
  const [rooms, setRooms] = useState<Row[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("11:30");
  const [roomId, setRoomId] = useState("");
  const [isPractice, setIsPractice] = useState(false);
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedPlan, setSavedPlan] = useState<{ batchId: string; count: number; firstDate?: string }>();
  useEffect(() => {
    if (!open) return;
    let active = true;
    setBatch(undefined); setPreview(undefined); setError(""); setRoomId("");
    Promise.all([
      adminApi<Listing>("course_batches?limit=1&filter=" + encodeURIComponent(JSON.stringify({ id: batchId }))),
      adminApi<Listing>("branch_rooms?limit=500"),
    ]).then(([batches, roomList]) => {
      if (active) { setBatch(batches.rows[0]); setRooms(roomList.rows); }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [open, batchId]);
  const change = () => { setPreview(undefined); setError(""); };
  async function submit(save: boolean) {
    if (busy || !batch) return;
    setBusy(true); setError("");
    try {
      const result = await adminApi<Preview>("academy/batches/" + batchId + "/schedule-plan", {
        days, startTime, endTime, roomId: roomId || undefined, isPractice, save,
      });
      if (save && result.saved) {
        const firstDate = result.sessions.filter(session => !session.existing).map(session => session.date).sort()[0];
        setSavedPlan({ batchId, count: result.created, firstDate });
        setOpen(false);
        onSaved();
      }
      else setPreview(result);
    } catch (err: any) { setPreview(undefined); setError(err.message || "Không kiểm tra được lịch học."); }
    finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap items-center gap-3">
      <button className="admin-secondary" onClick={() => setOpen(true)}>Tạo buổi từ lịch dự kiến</button>
      {savedPlan?.batchId === batchId && <>
        <span role="status" className="text-sm">{savedPlan.count ? `Đã lưu ${savedPlan.count} buổi học` : "Các buổi học đã có trong thời khóa biểu."}</span>
        {savedPlan.firstDate && <button className="admin-secondary" onClick={() => onOpenWeek(savedPlan.firstDate!)}>Mở tuần có lịch mới</button>}
      </>}
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section role="dialog" aria-modal="true" aria-label="Tạo buổi học theo lịch dự kiến" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Tạo buổi học theo lịch dự kiến</h2>
        {batch ? <p className="text-sm">{batch.batch_code} · {String(batch.start_date).slice(0,10)} – {String(batch.end_date).slice(0,10)}<br />Lịch dự kiến của lớp · {batch.schedule_text || "Chưa có"}<br />Chọn các thứ và giờ học để kiểm tra. Hệ thống bổ sung buổi từ hôm nay đến hết lớp, giữ các buổi đã tồn tại.</p> : <p>Đang tải lớp…</p>}
        <fieldset disabled={busy} className="space-y-4">
          <legend className="font-semibold">Ngày học trong tuần</legend>
          <div className="flex flex-wrap gap-3">{[1,2,3,4,5,6,0].map(day => <label key={day} className="flex items-center gap-1">
            <input type="checkbox" checked={days.includes(day)} onChange={e => { change(); setDays(e.target.checked ? [...days,day] : days.filter(d=>d!==day)); }} />
            {day === 0 ? "Chủ nhật" : "Thứ " + (day+1)}
          </label>)}</div>
          <div className="grid grid-cols-2 gap-3">
            <label>Giờ bắt đầu<input className="admin-input block w-full" type="time" value={startTime} onChange={e=>{change();setStartTime(e.target.value);}} /></label>
            <label>Giờ kết thúc<input className="admin-input block w-full" type="time" value={endTime} onChange={e=>{change();setEndTime(e.target.value);}} /></label>
          </div>
          <label className="block">Phòng học<select className="admin-input block w-full" value={roomId} onChange={e=>{change();setRoomId(e.target.value);}}>
            <option value="">Chưa phân phòng</option>
            {rooms.filter(r=>r.branch_id===batch?.branch_id && r.is_available && !/^\[ARCHIVED\]/i.test(r.name)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select></label>
          <label className="flex gap-2"><input type="checkbox" checked={isPractice} onChange={e=>{change();setIsPractice(e.target.checked);}} />Buổi thực hành</label>
        </fieldset>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {preview && <div className="rounded-xl border p-3">
          <p className="font-semibold">{preview.created} buổi sẽ bổ sung · {preview.sessions.length-preview.created} buổi đã có</p>
          <ul className="max-h-40 overflow-auto text-sm">{preview.sessions.map(s=><li key={s.date}>{s.date.split("-").reverse().join("/")} · {startTime} – {endTime} · {s.existing ? "Đã có" : "Bổ sung"}</li>)}</ul>
          <p className="text-xs mt-2">Đã kiểm tra xung đột. Khi lưu, hệ thống kiểm tra lại toàn bộ lịch.</p>
        </div>}
        <div className="flex justify-end gap-2">
          <button className="admin-secondary" disabled={busy} onClick={()=>setOpen(false)}>Đóng</button>
          <button className="admin-secondary" disabled={busy || !batch || !days.length} onClick={()=>submit(false)}>{busy ? "Đang kiểm tra…" : "Xem trước & kiểm tra"}</button>
          {preview && preview.created > 0 && <button className="admin-primary" disabled={busy} onClick={()=>submit(true)}>Lưu {preview.created} buổi</button>}
        </div>
      </section>
    </div>}
  </>;
}
