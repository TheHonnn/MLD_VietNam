import React from 'react';

export type DualFilterSide = 'left' | 'right';

export interface DualFilterBarProps {
  leftLabel: string;
  rightLabel: string;
  isLeftSelected: boolean;
  isRightSelected: boolean;
  expandedSide: DualFilterSide | null;
  leftPanelTitle: string;
  rightPanelTitle: string;
  leftOptions: Array<{ value: string; label: string }>;
  rightOptions: Array<{ value: string; label: string }>;
  selectedLeftValue: string;
  selectedRightValue: string;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onSelectLeft: (value: string) => void;
  onSelectRight: (value: string) => void;
}

export function DualFilterBar({
  leftLabel,
  rightLabel,
  isLeftSelected,
  isRightSelected,
  expandedSide,
  leftPanelTitle,
  rightPanelTitle,
  leftOptions,
  rightOptions,
  selectedLeftValue,
  selectedRightValue,
  onToggleLeft,
  onToggleRight,
  onSelectLeft,
  onSelectRight,
}: DualFilterBarProps) {
  const activeOptions = expandedSide === 'left' ? leftOptions : rightOptions;
  const activeValue = expandedSide === 'left' ? selectedLeftValue : selectedRightValue;
  const panelTitle = expandedSide === 'left' ? leftPanelTitle : rightPanelTitle;
  const onSelect = expandedSide === 'left' ? onSelectLeft : onSelectRight;

  return (
    <div className="dual-filter-wrap">
      <div className="dual-filter-row">
        <button
          type="button"
          className={`dual-filter-pill ${expandedSide === 'left' ? 'is-expanded' : ''} ${isLeftSelected ? 'is-selected' : ''}`}
          aria-expanded={expandedSide === 'left'}
          onClick={onToggleLeft}
        >
          <span>{leftLabel}</span>
          <span aria-hidden="true" className="dual-filter-chevron">
            {expandedSide === 'left' ? '▴' : '▾'}
          </span>
        </button>
        <button
          type="button"
          className={`dual-filter-pill ${expandedSide === 'right' ? 'is-expanded' : ''} ${isRightSelected ? 'is-selected' : ''}`}
          aria-expanded={expandedSide === 'right'}
          onClick={onToggleRight}
        >
          <span>{rightLabel}</span>
          <span aria-hidden="true" className="dual-filter-chevron">
            {expandedSide === 'right' ? '▴' : '▾'}
          </span>
        </button>
      </div>
      {expandedSide && (
        <div className="dual-filter-panel" role="region" aria-label={panelTitle}>
          <div className="dual-filter-panel-title">{panelTitle}</div>
          <div className="dual-filter-options">
            {activeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`dual-filter-option ${opt.value === activeValue ? 'is-active' : ''}`}
                aria-pressed={opt.value === activeValue}
                onClick={() => onSelect(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
