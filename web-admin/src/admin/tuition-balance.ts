export function tuitionBalance(total: unknown, paid: unknown): number | null {
  if (total == null || paid == null || total === '' || paid === '') return null;
  const tuition = Number(total);
  const collected = Number(paid);
  if (!Number.isFinite(tuition) || !Number.isFinite(collected) || tuition <= 0 || collected < 0) return null;
  return Math.max(0, tuition - collected);
}
