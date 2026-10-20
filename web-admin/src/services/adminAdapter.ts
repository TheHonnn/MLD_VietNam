import { adminApi, Listing } from "../admin/api";
import { ApiResponse } from "../types/shared_types";
export const camelRow = (row: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      value,
    ]),
  );
export const snakeRow = (row: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(row)
      .filter(
        ([key, value]) =>
          value !== undefined &&
          !["id", "createdAt", "updatedAt"].includes(key),
      )
      .map(([key, value]) => [
        key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
        value,
      ]),
  );
export async function legacyRead<T>(table: string): Promise<T[]> {
  const result: T[] = [];
  for (let page = 1; ; page++) {
    const data = await adminApi<Listing>(`${table}?limit=100&page=${page}`);
    result.push(...data.rows.map((r) => camelRow(r) as T));
    if (result.length >= data.total) break;
  }
  return result;
}
export async function legacyWrite<T>(
  table: string,
  values: Record<string, any>,
  id?: string,
): Promise<ApiResponse<T>> {
  let expectedUpdatedAt: string | undefined;
  if (id) {
    const data = await adminApi<Listing>(
      `${table}?filter=${encodeURIComponent(JSON.stringify({ id }))}`,
    );
    if (!data.rows.length) throw new Error("Không tìm thấy bản ghi.");
    expectedUpdatedAt = data.rows[0].updated_at;
  }
  const saved = await adminApi<Record<string, any>>(
    `${table}/${id ? "update" : "create"}`,
    {
      values: snakeRow(values),
      ...(id ? { key: { id }, expectedUpdatedAt } : {}),
    },
  );
  return {
    success: true,
    statusCode: id ? 200 : 201,
    message: "Đã lưu vào database chung",
    data: camelRow(saved) as T,
  };
}
