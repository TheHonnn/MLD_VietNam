import React from "react";
import { Link } from "react-router-dom";
import { CircleHelp, ListChecks, Video } from "lucide-react";

export function TrainingActions() {
  return (
    <div
      className="flex flex-wrap justify-end gap-2 mb-4"
      aria-label="Quản lý nội dung đào tạo"
    >
      {[
        {
          title: "Thêm video",
          to: "/manage/course_lessons?create=1&lesson_type=VIDEO",
          icon: Video,
        },
        {
          title: "Thêm bài trắc nghiệm",
          to: "/manage/course_quizzes?create=1",
          icon: ListChecks,
        },
        {
          title: "Thêm câu hỏi",
          to: "/manage/quiz_questions?create=1",
          icon: CircleHelp,
        },
      ].map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D8C4B2] bg-white text-xs font-semibold text-[#8A4F23] hover:bg-[#FAF7F2]"
        >
          <action.icon className="w-4 h-4" />
          {action.title}
        </Link>
      ))}
    </div>
  );
}
