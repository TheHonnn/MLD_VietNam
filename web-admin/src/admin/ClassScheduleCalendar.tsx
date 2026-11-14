import { Link } from "react-router-dom";
import type { Row } from "./api";
import { academyClassLink } from "./navigation";

export function calendarDate(day: string, offset: number) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function calendarMonday(day: string) {
  const parsed = new Date(day + "T00:00:00Z");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(parsed.getTime()) && parsed.getUTCFullYear() > 1900
    ? parsed : new Date(Date.now() + 7 * 3600000);
  return calendarDate(date.toISOString().slice(0, 10), 1 - (date.getUTCDay() || 7));
}

const shortDate = (day: string) => day.slice(5).split("-").reverse().join("/");

export function ClassScheduleCalendar({ week, today, rows, onOpen, onEdit, canAttend }: {
  week: string;
  today: string;
  rows: Row[];
  onOpen: (row: Row) => void;
  onEdit?: (row: Row) => void;
  canAttend: boolean;
}) {
  const days = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"]
    .map((label, index) => ({ label, date: calendarDate(week, index) }));
  const sessions = new Map<string, Row[]>();
  for (const row of rows) {
    const day = String(row.session_date ?? "").slice(0, 10);
    const entries = sessions.get(day) ?? [];
    entries.push(row);
    sessions.set(day, entries);
  }
  return <section aria-label="Lịch học theo tuần" className="overflow-hidden rounded-xl border border-[#EAD8C7] bg-white">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE4D9] px-4 py-3">
      <h2 className="text-sm font-semibold">Lịch tuần · {shortDate(week)} – {shortDate(days[6].date)}/{days[6].date.slice(0, 4)}</h2>
      <span className="text-xs text-[#73675F]">{rows.length} buổi học</span>
    </header>
    <div className="grid grid-cols-1 gap-px bg-[#EFE4D9] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map(({ label, date }) => {
        const entries = [...(sessions.get(date) ?? [])].sort((a, b) =>
          String(a.start_time ?? "").localeCompare(String(b.start_time ?? "")));
        return <section key={date} className="min-w-0 bg-white">
          <h3 className={`flex items-center justify-between gap-2 border-b border-[#EFE4D9] px-3 py-2 text-sm font-semibold ${date === today ? "bg-[#F4E3D2] text-[#743A15]" : "bg-[#FAF6F0]"}`}>
            {label} <span aria-current={date === today ? "date" : undefined} className="tabular-nums">{shortDate(date)}</span>
          </h3>
          <div className="space-y-2 p-2.5">
            {!entries.length && <p className="px-1 py-2 text-xs text-[#73675F]">Không có lịch</p>}
            {entries.map(row => <article key={row.id} className={`space-y-1.5 rounded-lg border border-l-4 px-2.5 py-2 ${row.is_practice_lab === true ? "border-[#C9DBD1] border-l-[#42745C] bg-[#F2F8F4]" : "border-[#EFE4D9] border-l-[#AD713D] bg-[#FFFCF8]"}`}>
              <div className="text-xs font-semibold tabular-nums text-[#5E3C24]">{String(row.start_time ?? "").slice(0, 5)} – {String(row.end_time ?? "").slice(0, 5)}</div>
              <button type="button" onClick={() => onOpen(row)} className="w-full break-words text-left text-sm font-semibold leading-snug text-[#30251C] hover:underline">{row.topic || "Xem buổi học"}</button>
              <p className="break-words text-xs text-[#66594F]">{[row.batch_code || row.course_batches?.batch_code, row.assigned_room_name || row.assigned_room?.name || row.branch_rooms?.name || (row.assigned_room_id ? "Chưa tải được tên phòng" : "Chưa xếp phòng"), row.is_practice_lab === true && "Thực hành"].filter(Boolean).join(" · ")}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs font-semibold text-[#854519]">
                {canAttend && row.batch_id && <Link className="hover:underline" to={academyClassLink("/attendance", row.batch_id) + "&schedule_id=" + encodeURIComponent(row.id)}>Điểm danh</Link>}
                {onEdit && <button type="button" className="hover:underline" onClick={() => onEdit(row)}>Sửa</button>}
              </div>
            </article>)}
          </div>
        </section>;
      })}
    </div>
  </section>;
}
