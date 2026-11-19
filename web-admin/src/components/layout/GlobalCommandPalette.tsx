import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Compass,
  CreditCard,
  GraduationCap,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useAdmin } from '../../admin/Auth';
import type { Resource } from '../../admin/api';
import { loadResources } from '../../admin/loadResources';
import { getCommandNavigationEntries } from '../../admin/navigation';
import {
  commandSearchService,
  type CommandSearchResult,
} from '../../services/commandSearch.service';
import { matchSearch } from '../../utils/searchUtils';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteActionItem {
  key: string;
  section: string;
  title: string;
  subtitle: string;
  badge?: string;
  to: string;
  kind: 'nav' | 'customer' | 'invoice' | 'enrollment' | 'booking';
}

const EMPTY_SEARCH_DATA: CommandSearchResult = {
  query: '',
  customers: [],
  invoices: [],
  enrollments: [],
  bookings: [],
};

const resourcesCache = new Map<string, Resource[]>();

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user, authRevision } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchData, setSearchData] = useState<CommandSearchResult>(EMPTY_SEARCH_DATA);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const cacheKey = `${user?.id || ''}:${authRevision}`;

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSearchData(EMPTY_SEARCH_DATA);
    setSearchError('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const cached = resourcesCache.get(cacheKey);
    if (cached) {
      setResources(cached);
      return;
    }
    const controller = new AbortController();
    loadResources(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) {
          resourcesCache.set(cacheKey, list);
          setResources(list);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isOpen, user?.id, cacheKey]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchData(EMPTY_SEARCH_DATA);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError('');
    const debounceTimer = window.setTimeout(() => {
      commandSearchService
        .search(trimmed, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) {
            setSearchData(res);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted && err?.name !== 'AbortError') {
            setSearchError(err?.message || 'Không thể tìm kiếm dữ liệu.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 200);

    return () => {
      window.clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [isOpen, query]);

  const navEntries = useMemo(
    () => getCommandNavigationEntries(user?.role || '', resources),
    [user?.role, resources],
  );

  const items: PaletteActionItem[] = useMemo(() => {
    const trimmed = query.trim();
    const list: PaletteActionItem[] = [];

    for (const c of searchData.customers) {
      list.push({
        key: `customer-${c.id}`,
        section: 'Khách hàng',
        title: c.fullName || 'Khách hàng',
        subtitle: [c.phone, c.referralCode, c.email].filter(Boolean).join(' · '),
        badge: 'Hồ sơ KH',
        to: `/customer-detail?id=${c.id}`,
        kind: 'customer',
      });
    }

    for (const inv of searchData.invoices) {
      list.push({
        key: `invoice-${inv.id}`,
        section: 'Hóa đơn & Thu ngân',
        title: inv.invoiceCode,
        subtitle: `${inv.customerName} · ${Number(inv.totalAmount || 0).toLocaleString('vi-VN')}đ`,
        badge: inv.paymentStatus,
        to: `/cashier-pos?tab=receipts&invoice=${encodeURIComponent(inv.invoiceCode)}`,
        kind: 'invoice',
      });
    }

    for (const enr of searchData.enrollments) {
      list.push({
        key: `enrollment-${enr.id}`,
        section: 'Học viên & Ghi danh',
        title: `${enr.studentName}${enr.studentCode ? ` (${enr.studentCode})` : ''}`,
        subtitle: [enr.phone, enr.courseTitle].filter(Boolean).join(' · '),
        badge: enr.status,
        to: `/academy-enrollment?enrollmentId=${enr.id}`,
        kind: 'enrollment',
      });
    }

    for (const bk of searchData.bookings) {
      list.push({
        key: `booking-${bk.id}`,
        section: 'Lịch hẹn Spa',
        title: `${bk.bookingCode || bk.id} · ${bk.customerName || 'Khách hàng'}`,
        subtitle: `${bk.bookingDate} ${bk.startTime}`,
        badge: bk.status,
        to: `/staff-schedule?booking=${encodeURIComponent(bk.bookingCode || bk.id)}&date=${encodeURIComponent(bk.bookingDate || '')}`,
        kind: 'booking',
      });
    }

    const matchedNavs = (
      trimmed
        ? navEntries.filter((entry) =>
            matchSearch([entry.label, entry.group, entry.href], trimmed),
          )
        : navEntries
    ).slice(0, trimmed ? 6 : 8);

    for (const nav of matchedNavs) {
      list.push({
        key: `nav-${nav.href}-${nav.id}`,
        section: 'Đi tới phân hệ',
        title: nav.label,
        subtitle: nav.group,
        to: nav.href,
        kind: 'nav',
      });
    }

    return list;
  }, [query, searchData, navEntries]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, query]);

  if (!isOpen) return null;

  const selectItem = (item: PaletteActionItem) => {
    onClose();
    navigate(item.to);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        setActiveIndex((prev) => (prev + 1) % items.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[activeIndex];
      if (target) {
        selectItem(target);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const renderIcon = (kind: PaletteActionItem['kind']) => {
    if (kind === 'customer') return <User className="w-4 h-4 text-[#004890]" />;
    if (kind === 'invoice') return <CreditCard className="w-4 h-4 text-[#208C58]" />;
    if (kind === 'enrollment') return <GraduationCap className="w-4 h-4 text-[#0EA5E9]" />;
    if (kind === 'booking') return <Calendar className="w-4 h-4 text-[#004890]" />;
    return <Compass className="w-4 h-4 text-[#64748B]" />;
  };

  const groupedSections = items.reduce<{ title: string; entries: Array<{ item: PaletteActionItem; index: number }> }[]>(
    (acc, item, idx) => {
      const existing = acc.find((g) => g.title === item.section);
      if (existing) {
        existing.entries.push({ item, index: idx });
      } else {
        acc.push({ title: item.section, entries: [{ item, index: idx }] });
      }
      return acc;
    },
    [],
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm và điều hướng nhanh"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] bg-[#FFFFFF]">
          <Search className="w-4 h-4 text-[#004890] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Tìm khách hàng, hóa đơn (HD-POS-...), học viên (HV-...), lịch hẹn hoặc tên phân hệ..."
            className="flex-1 bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
          />
          {isSearching && (
            <span className="w-4 h-4 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng lệnh nhanh"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2 bg-[#FFFFFF]">
          {searchError && (
            <div className="px-3 py-2 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
              {searchError}
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#64748B]">
              {isSearching
                ? 'Đang tìm kiếm trên toàn hệ thống...'
                : 'Không tìm thấy kết quả phù hợp. Thử nhập SĐT, mã hóa đơn, mã học viên hoặc tên trang.'}
            </div>
          ) : (
            groupedSections.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  {group.title}
                </div>
                {group.entries.map(({ item, index }) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectItem(item)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#DEEAF6] text-[#004890]'
                          : 'hover:bg-[#F1F5F9] text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-white' : 'bg-[#EFF6EE]'
                          }`}
                        >
                          {renderIcon(item.kind)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] text-[#64748B] truncate">{item.subtitle}</div>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6EE] text-[#208C58] border border-[#CBD5E1]/60">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#EFF6EE]/60 flex items-center justify-between text-[11px] text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#004890]" />
            <span>Mở nhanh từ mọi trang bằng Ctrl+K</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 font-medium">
            <span>↑↓ Chọn</span>
            <span>·</span>
            <span>Enter Mở</span>
            <span>·</span>
            <span>Esc Đóng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
