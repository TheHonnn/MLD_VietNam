export interface SavedFilterPreset<T extends Record<string, unknown>> {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
}

const MAX_SAVED_PRESETS = 15;

export function buildPresetStorageKey(workspace: string, userId?: string | null): string {
  return `mld_saved_presets:${workspace}:${userId || 'default'}`;
}

export function filtersEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keys = Array.from(new Set([...Object.keys(a || {}), ...Object.keys(b || {})]));
  return keys.every((key) => String(a?.[key] ?? '') === String(b?.[key] ?? ''));
}

export function readSavedPresets<T extends Record<string, unknown>>(
  storageKey: string,
  storage?: Pick<Storage, 'getItem'>,
): SavedFilterPreset<T>[] {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!store) return [];
    const raw = store.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedFilterPreset<T> =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Boolean(item.filters) &&
        typeof item.filters === 'object',
    );
  } catch {
    return [];
  }
}

function persistPresets<T extends Record<string, unknown>>(
  storageKey: string,
  list: SavedFilterPreset<T>[],
  storage?: Pick<Storage, 'setItem'>,
): void {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    store?.setItem(storageKey, JSON.stringify(list));
  } catch {
  }
}

export function saveFilterPreset<T extends Record<string, unknown>>(
  storageKey: string,
  rawName: string,
  filters: T,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): SavedFilterPreset<T>[] {
  const cleanName = rawName.trim().slice(0, 60);
  const current = readSavedPresets<T>(storageKey, storage);
  if (!cleanName) return current;
  const filtered = current.filter(
    (item) => item.name.trim().toLowerCase() !== cleanName.toLowerCase(),
  );
  const nextItem: SavedFilterPreset<T> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
  const nextList = [nextItem, ...filtered].slice(0, MAX_SAVED_PRESETS);
  persistPresets(storageKey, nextList, storage);
  return nextList;
}

export function deleteSavedPreset<T extends Record<string, unknown>>(
  storageKey: string,
  presetId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): SavedFilterPreset<T>[] {
  const current = readSavedPresets<T>(storageKey, storage);
  const nextList = current.filter((item) => item.id !== presetId);
  persistPresets(storageKey, nextList, storage);
  return nextList;
}
