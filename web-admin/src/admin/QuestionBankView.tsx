import React from "react";
import { Link } from "react-router-dom";
import { Row } from "./api";

function answerText(row: Row): string {
  let options = row.options;
  if (typeof options === "string") {
    try { options = JSON.parse(options); } catch { return "Không đọc được nội dung đáp án"; }
  }
  const key = String(row.correct_option || "").toUpperCase();
  return String((Array.isArray(options) ? options[key.charCodeAt(0) - 65] : options?.[key]) || "Chưa có nội dung đáp án");
}

export function QuestionBankView({ rows, quizzes, canEdit, canDelete, onOpen, onEdit, onDelete }: {
  rows: Row[]; quizzes: Row[]; canEdit: boolean; canDelete: boolean;
  onOpen: (row: Row) => void; onEdit: (row: Row) => void; onDelete: (row: Row) => void;
}) {
  if (!rows.length) return <div className="rounded-xl border bg-white px-6 py-12 text-center">
    <h3 className="font-semibold">Chưa có câu hỏi phù hợp</h3>
    <p className="mt-2 text-sm text-[#73675F]">Chọn đề khác hoặc xóa từ khóa. Để soạn câu mới, chọn “Thêm câu hỏi”.</p>
  </div>;
  return <div className="overflow-x-auto rounded-xl border border-[#EAD8C7] bg-white">
    <table className="admin-table w-full">
      <thead><tr><th>Câu</th><th>Nội dung câu hỏi</th><th>Đáp án đúng</th><th>Đề thi</th><th>Thao tác</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td className="font-semibold">{row.question_number}</td>
        <td style={{ whiteSpace: "normal", minWidth: 260, maxWidth: 480 }}>
          <button type="button" className="text-left font-semibold hover:underline" onClick={() => onOpen(row)}>{row.question_text}</button>
          <p className="mt-1 text-xs text-[#73675F]">{row.explanation ? "Có giải thích đáp án" : "Chưa có giải thích"}</p>
        </td>
        <td style={{ whiteSpace: "normal", minWidth: 170, maxWidth: 270 }}><span className="mr-2 rounded bg-[#E8F6ED] px-2 py-1 font-bold text-[#14734D]">{row.correct_option}</span>{answerText(row)}</td>
        <td style={{ whiteSpace: "normal", minWidth: 180, maxWidth: 300 }}>
          <Link className="text-[#985018] hover:underline" to={"/manage/course_quizzes?" + new URLSearchParams({ filter: JSON.stringify({ id: row.quiz_id }) })}>{quizzes.find(quiz => quiz.id === row.quiz_id)?.title || row.quiz_title || "Xem đề thi"}</Link>
        </td>
        <td><div className="flex flex-wrap gap-2">
          <button type="button" className="admin-secondary" onClick={() => onOpen(row)}>Xem</button>
          {canEdit && <button type="button" className="admin-secondary" onClick={() => onEdit(row)}>Sửa</button>}
          {canDelete && <button type="button" className="admin-secondary text-red-700" onClick={() => onDelete(row)}>Xóa</button>}
        </div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
