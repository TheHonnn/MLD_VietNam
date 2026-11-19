import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, Check, RotateCcw, X } from 'lucide-react';
import {
  deleteSavedPreset,
  filtersEqual,
  readSavedPresets,
  saveFilterPreset,
  type SavedFilterPreset,
} from '../../utils/savedFilterPresets';

export interface BuiltInFilterPreset<T extends Record<string, unknown>> {
  id: string;
  name: string;
  filters: T;
}

interface SavedFilterPresetsBarProps<T extends Record<string, unknown>> {
  storageKey: string;
  builtInPresets: BuiltInFilterPreset<T>[];
  currentFilters: T;
  hasActiveFilters: boolean;
  onApplyFilters: (filters: T) => void;
  onResetFilters: () => void;
}

export function SavedFilterPresetsBar<T extends Record<string, unknown>>({
  storageKey,
  builtInPresets,
  currentFilters,
  hasActiveFilters,
  onApplyFilters,
  onResetFilters,
}: SavedFilterPresetsBarProps<T>) {
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset<T>[]>(() =>
    readSavedPresets<T>(storageKey),
  );
  const [isAdding, setIsAdding] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    setSavedPresets(readSavedPresets<T>(storageKey));
  }, [storageKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;
    const next = saveFilterPreset<T>(storageKey, presetName, currentFilters);
    setSavedPresets(next);
    setPresetName('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const next = deleteSavedPreset<T>(storageKey, id);
    setSavedPresets(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
      <span className="inline-flex items-center gap-1 text-[#64748B] font-semibold mr-1">
        <Bookmark className="w-3.5 h-3.5 text-[#004890]" />
        <span>Bộ lọc nhanh:</span>
      </span>

      {builtInPresets.map((preset) => {
        const active = filtersEqual(currentFilters, preset.filters);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyFilters(preset.filters)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-full border font-semibold transition-colors cursor-pointer ${
              active
                ? 'bg-[#004890] text-white border-[#004890]'
                : 'bg-[#EFF6EE] text-[#004890] border-[#CBD5E1] hover:bg-[#DEEAF6]'
            }`}
          >
            {preset.name}
          </button>
        );
      })}

      {savedPresets.map((preset) => {
        const active = filtersEqual(currentFilters, preset.filters);
        return (
          <div
            key={preset.id}
            className={`inline-flex items-center rounded-full border transition-colors ${
              active
                ? 'bg-[#208C58] text-white border-[#208C58]'
                : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#004890]'
            }`}
          >
            <button
              type="button"
              onClick={() => onApplyFilters(preset.filters)}
              aria-pressed={active}
              className="pl-2.5 pr-1.5 py-1 text-[11.5px] font-semibold cursor-pointer"
            >
              {preset.name}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(preset.id)}
              aria-label={`Xóa bộ lọc ${preset.name}`}
              className={`pr-2 pl-0.5 py-1 rounded-r-full cursor-pointer ${
                active ? 'text-white/85 hover:text-white' : 'text-[#94A3B8] hover:text-rose-600'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {isAdding ? (
        <form onSubmit={handleSave} className="inline-flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Tên bộ lọc..."
            maxLength={60}
            className="w-36 px-2.5 py-1 rounded-full border border-[#004890] bg-white text-[11.5px] text-[#0F172A] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!presetName.trim()}
            aria-label="Xác nhận lưu bộ lọc"
            className="p-1 rounded-full bg-[#208C58] text-white hover:bg-[#197247] disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setPresetName('');
            }}
            aria-label="Hủy lưu bộ lọc"
            className="p-1 rounded-full bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-[#004890]/50 text-[#004890] hover:bg-[#DEEAF6]/60 font-semibold cursor-pointer"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>Lưu bộ lọc</span>
        </button>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Xóa bộ lọc</span>
        </button>
      )}
    </div>
  );
}
