import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export interface AdminTabItem {
  id: string;
  label: string;
  count?: number | string;
  badge?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  href?: string;
  title?: string;
}

export interface AdminTabsProps {
  tabs: AdminTabItem[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'line' | 'pill';
  ariaLabel?: string;
  className?: string;
  autoScrollIntoView?: boolean;
}

/**
 * AdminTabs - Unified tab bar component for MLD Web-Admin.
 * Follows MLD Brand Design (warm sand canvas, signature brown accents #985018 / #8A4F23).
 * Ensures exact horizontal alignment with Page Header, Search/Filters, and Content Table.
 */
export const AdminTabs: React.FC<AdminTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
  ariaLabel = 'Điều hướng phân hệ',
  className = '',
  autoScrollIntoView = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLElement | null>(null);

  // Auto-scroll active tab into visible area
  useEffect(() => {
    if (!autoScrollIntoView || !activeTabRef.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const activeEl = activeTabRef.current;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab, autoScrollIntoView]);

  // Keyboard navigation handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (variant === 'line' || variant === 'pill') {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      if (enabledTabs.length <= 1) return;

      const currentIndex = enabledTabs.findIndex((t) => t.id === tabs[index]?.id);
      let targetTab: AdminTabItem | null = null;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (currentIndex + 1) % enabledTabs.length;
        targetTab = enabledTabs[nextIdx];
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
        targetTab = enabledTabs[prevIdx];
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetTab = enabledTabs[0];
      } else if (e.key === 'End') {
        e.preventDefault();
        targetTab = enabledTabs[enabledTabs.length - 1];
      }

      if (targetTab && onChange) {
        onChange(targetTab.id);
      }
    }
  };

  const isNavigation = tabs.some((t) => Boolean(t.href));

  const renderTabContent = (tab: AdminTabItem, isActive: boolean) => {
    const Icon = tab.icon;
    return (
      <>
        {Icon && (
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? variant === 'pill'
                  ? 'text-white'
                  : 'text-[#985018]'
                : 'text-[#8C7E72] group-hover:text-[#2C241E]'
            }`}
          />
        )}
        <span className="whitespace-nowrap">{tab.label}</span>
        {tab.count !== undefined && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
              isActive
                ? variant === 'pill'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#FAF0E4] text-[#8A4F23]'
                : 'bg-[#F4ECE3] text-[#73675F] group-hover:bg-[#EFE4D9]'
            }`}
          >
            {tab.count}
          </span>
        )}
        {tab.badge}
      </>
    );
  };

  const containerClasses =
    variant === 'line'
      ? 'w-full border-b border-[#E8DFD8] mb-5'
      : 'w-full border-b border-[#EFE4D9] pb-2.5 mb-4';

  const listClasses =
    variant === 'line'
      ? 'flex items-center gap-6 overflow-x-auto scroll-smooth scrollbar-none px-0 py-0 text-xs'
      : 'flex flex-wrap items-center gap-2 overflow-x-auto scroll-smooth scrollbar-none text-xs';

  const NavWrapper = isNavigation ? 'nav' : 'div';

  return (
    <NavWrapper
      className={`${containerClasses} ${className}`}
      aria-label={ariaLabel}
      {...(!isNavigation ? { role: 'tablist' } : {})}
    >
      <div
        ref={scrollContainerRef}
        className={listClasses}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTab;
          const tabRef = isActive ? (activeTabRef as React.RefObject<any>) : undefined;

          // Common style classes
          const lineClasses = `group relative inline-flex items-center gap-2 py-3 text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#985018]/40 rounded-t-md ${
            isActive
              ? 'text-[#985018] font-bold'
              : 'text-[#73675F] hover:text-[#2C241E]'
          } ${tab.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`;

          const pillClasses = `group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#985018]/40 ${
            isActive
              ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border-slate-200'
          } ${tab.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`;

          const itemClass = variant === 'line' ? lineClasses : pillClasses;

          if (tab.href) {
            return (
              <Link
                key={tab.id}
                ref={tabRef}
                to={tab.href}
                className={itemClass}
                title={tab.title || tab.label}
                aria-current={isActive ? 'page' : undefined}
                onKeyDown={(e) => handleKeyDown(e, idx)}
              >
                {renderTabContent(tab, isActive)}
                {variant === 'line' && isActive && (
                  <span
                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#985018] rounded-t-full transition-all"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              ref={tabRef}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`tabpanel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              className={itemClass}
              title={tab.title || tab.label}
              onClick={() => {
                if (!tab.disabled && onChange) {
                  onChange(tab.id);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {renderTabContent(tab, isActive)}
              {variant === 'line' && isActive && (
                <span
                  className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#985018] rounded-t-full transition-all"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </NavWrapper>
  );
};
