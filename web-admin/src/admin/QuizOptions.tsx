import React from "react";
import { Plus, Trash2 } from "lucide-react";

export function quizOptions(value: unknown): [string, string][] {
  if (Array.isArray(value))
    return value.map((text, index) => [
      String.fromCharCode(65 + index),
      String(text),
    ]);
  if (value && typeof value === "object")
    return Object.entries(value).map(([key, text]) => [key, String(text)]);
  return [
    ["A", ""],
    ["B", ""],
  ];
}
export function QuizOptions({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: Record<string, string>, removed?: boolean) => void;
}) {
  const entries = quizOptions(value);
  return (
    <fieldset className="admin-field-wide admin-answer-options">
      <legend>Các đáp án</legend>
      {entries.map(([key, text], index) => (
        <div className="admin-answer-row" key={key}>
          <label>
            <span>Đáp án {key}</span>
            <input
              value={text}
              required
              onChange={(event) =>
                onChange(
                  Object.fromEntries(
                    entries.map(([k, v], i) => [
                      k,
                      i === index ? event.target.value : v,
                    ]),
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="admin-icon admin-danger"
            title={`Xóa đáp án ${key}`}
            disabled={entries.length <= 2}
            onClick={() =>
              onChange(
                Object.fromEntries(entries.filter(([k]) => k !== key)),
                true,
              )
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="admin-secondary"
        disabled={entries.length >= 26}
        onClick={() => {
          const key = Array.from({ length: 26 }, (_, i) =>
            String.fromCharCode(65 + i),
          ).find((key) => !entries.some(([existing]) => existing === key));
          if (key) onChange(Object.fromEntries([...entries, [key, ""]]));
        }}
      >
        <Plus size={15} />
        Thêm đáp án
      </button>
    </fieldset>
  );
}
