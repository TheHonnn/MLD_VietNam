import { Prisma } from '@prisma/client';
import { ApiError } from './errors.js';
import type { Store } from './store.js';

async function historyAvailable(store: Store) {
  const [row] = await store.query(Prisma.sql`SELECT count(*)::int AS count FROM information_schema.columns
    WHERE table_schema='public' AND table_name='miniapp_search_history'
    AND column_name IN ('id','user_id','query','query_key','search_count','last_searched_at')`);
  return Number(row?.count) === 6;
}

async function requireHistory(store: Store) {
  if (!await historyAvailable(store)) throw new ApiError(503,'Lịch sử tìm kiếm chưa được cấu hình trên máy chủ.');
}

export function searchText(value: unknown) {
  if (typeof value !== 'string') throw new ApiError(400,'Từ khóa tìm kiếm không hợp lệ.');
  const text = value.normalize('NFC').replace(/\s+/gu,' ').trim();
  if (!text || [...text].length > 160 || /[\x00-\x1f\x7f]/.test(text)) throw new ApiError(400,'Từ khóa cần từ 1 đến 160 ký tự.');
  return text;
}

export async function searchHistory(store: Store, userId: string) {
  await requireHistory(store);
  return store.query(Prisma.sql`SELECT id,query,last_searched_at FROM miniapp_search_history
    WHERE user_id=${userId}::uuid ORDER BY last_searched_at DESC,id DESC LIMIT 20`);
}

export async function saveSearch(store: Store, userId: string, value: unknown) {
  const query = searchText(value), key = query.toLocaleLowerCase('vi');
  await requireHistory(store);
  return store.transaction(async tx => {
    // Serialize one customer's saves/deletes without trusting a client owner ID.
    await tx.query(Prisma.sql`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`);
    const [entry] = await tx.query(Prisma.sql`INSERT INTO miniapp_search_history(user_id,query,query_key)
      VALUES(${userId}::uuid,${query},${key}) ON CONFLICT(user_id,query_key) DO UPDATE
      SET query=EXCLUDED.query,search_count=miniapp_search_history.search_count+1,last_searched_at=CURRENT_TIMESTAMP
      RETURNING id,query,last_searched_at`);
    await tx.query(Prisma.sql`DELETE FROM miniapp_search_history WHERE user_id=${userId}::uuid AND id NOT IN
      (SELECT id FROM miniapp_search_history WHERE user_id=${userId}::uuid ORDER BY last_searched_at DESC,id DESC LIMIT 20) RETURNING id`);
    return entry;
  });
}

export async function deleteSearch(store: Store, userId: string, id: string | null) {
  await requireHistory(store);
  return store.transaction(async tx => {
    await tx.query(Prisma.sql`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`);
    const entries = await tx.query(Prisma.sql`DELETE FROM miniapp_search_history WHERE user_id=${userId}::uuid
      AND (${id}::uuid IS NULL OR id=${id}::uuid) RETURNING id`);
    if (id && !entries.length) throw new ApiError(404,'Không tìm thấy mục tìm kiếm.');
    return { deleted:true };
  });
}

export async function popularSearches(store: Store) {
  if (!await historyAvailable(store)) return [];
  // Never publish arbitrary private queries: only existing, public catalog titles.
  return store.query(Prisma.sql`WITH catalog AS (
    SELECT s.name AS title FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active
    UNION SELECT c.title FROM courses c JOIN course_categories cat ON cat.id=c.category_id WHERE c.is_active AND cat.is_active
    UNION SELECT name FROM branches WHERE is_active
    UNION SELECT t.full_name FROM technicians t JOIN branches b ON b.id=t.branch_id WHERE t.is_active AND b.is_active
  ) SELECT min(c.title) AS query FROM catalog c JOIN miniapp_search_history h ON h.query_key=lower(c.title)
    GROUP BY lower(c.title) ORDER BY sum(h.search_count) DESC,max(h.last_searched_at) DESC,lower(c.title) LIMIT 8`);
}
