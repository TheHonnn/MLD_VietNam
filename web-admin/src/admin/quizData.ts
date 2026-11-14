import { adminCommand, Listing, Row } from "./api";

export async function loadQuestionRows(table: "courses" | "course_quizzes" | "quiz_questions", filter?: Record<string, string>, signal?: AbortSignal): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({ page: String(page), limit: "100", sort: table === "quiz_questions" ? "question_number" : "title", direction: "asc" });
    if (filter) query.set("filter", JSON.stringify(filter));
    const result = await adminCommand<Listing>(table + "?" + query, undefined, signal);
    rows.push(...result.rows);
    if (!result.rows.length || rows.length >= result.total) return rows;
  }
}
