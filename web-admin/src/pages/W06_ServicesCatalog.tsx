import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ServicesCatalog.css';
import {
  Sparkles,
  Printer,
  Check,
  Share2,
  Layers,
  HeartPulse,
  CreditCard,
  Pencil,
  ArrowRight,
  RefreshCw,
  Flame,
  FileText,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { toast, AdminTabs } from '../components/common';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchSearch } from '../utils/searchUtils';
import { adminApi } from '../admin/api';

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  category_id?: string;
  duration_minutes: number;
  price: number;
  discount_price?: number;
  short_description?: string;
  full_description?: string;
  image_url?: string;
  steps?: string[] | any;
  benefits?: string[] | any;
  is_featured: boolean;
  is_active: boolean;
}

interface TreatmentPackageItem {
  id: string;
  name: string;
  service_id: string;
  total_sessions: number;
  price: number;
  discount_price?: number;
  validity_months: number;
  description?: string;
  image_url?: string;
  is_active: boolean;
}

export const W06_ServicesCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    'matrix' | 'services' | 'packages'
  >(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam === 'services' ||
      tabParam === 'packages' ||
      tabParam === 'matrix'
    ) {
      return tabParam;
    }
    return 'matrix';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam === 'services' ||
      tabParam === 'packages' ||
      tabParam === 'matrix'
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'matrix' | 'services' | 'packages') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<TreatmentPackageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [sessionFilter, setSessionFilter] = useState<
    'ALL' | '10' | '20' | '30'
  >('ALL');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState<string>('');
  const [editingItem, setEditingItem] = useState<{
    type: 'service' | 'package';
    id: string;
    name: string;
    price: number;
    sessions?: number;
    duration?: number;
    validityMonths?: number;
    description?: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Fetch live data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      setCatalogError('');
      const [srvRes, pkgRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .order('duration_minutes', { ascending: true }),
        supabase
          .from('treatment_packages')
          .select('*')
          .order('total_sessions', { ascending: true }),
      ]);

      if (srvRes.error || pkgRes.error) throw srvRes.error || pkgRes.error;

      if (srvRes.data) {
        setServices(srvRes.data);
      }
      if (pkgRes.data) {
        setPackages(pkgRes.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải bảng giá:', err);
      setCatalogError(
        'Không thể xác minh bảng giá hiện tại. Vui lòng tải lại.',
      );
      toast.error('Không thể tải dữ liệu bảng giá từ máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency
  const formatVND = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return '0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const activeServices = services.filter((service) => service.is_active);
  const activePackages = packages.filter((pkg) => pkg.is_active);
  const invalidPackages = packages.filter(
    (pkg) =>
      !pkg.service_id ||
      Number(pkg.price) <= 0 ||
      Number(pkg.total_sessions) <= 0 ||
      Number(pkg.validity_months) <= 0,
  );

  const openPackageInPos = (pkg?: TreatmentPackageItem) => {
    if (!pkg) {
      toast.error('Gói liệu trình chưa tồn tại trong dữ liệu niêm yết.');
      return;
    }
    if (!pkg.is_active) {
      toast.error('Gói đang tạm ngừng và chưa thể bán tại POS.');
      return;
    }
    if (
      !pkg.service_id ||
      Number(pkg.price) <= 0 ||
      Number(pkg.total_sessions) <= 0
    ) {
      toast.error('Gói chưa đủ dịch vụ, giá hoặc số buổi để mở bán.');
      return;
    }
    const query = new URLSearchParams({
      packageId: pkg.id,
      packageName: pkg.name,
      source: 'pricing-catalog',
    });
    navigate(`/cashier-pos?${query.toString()}`);
  };

  // Generate the share text from the currently published catalog. Never send stale hard-coded prices.
  const handleCopyPricing = () => {
    if (!activeServices.length) {
      toast.error('Chưa có dịch vụ đang hoạt động để chia sẻ bảng giá.');
      return;
    }
    const sections = activeServices.map((service, index) => {
      const servicePackages = activePackages
        .filter((pkg) => pkg.service_id === service.id)
        .sort((a, b) => a.total_sessions - b.total_sessions);
      const packageLines = servicePackages.map(
        (pkg) =>
          `• Gói ${pkg.total_sessions} buổi: ${formatVND(pkg.price)} VNĐ (${formatVND(Math.round(pkg.price / pkg.total_sessions))}đ/buổi, hiệu lực ${pkg.validity_months} tháng)`,
      );
      return `${index + 1}. ${service.name.toUpperCase()}\n• Buổi lẻ: ${formatVND(service.price)} VNĐ\n${packageLines.join('\n')}`;
    });
    const text = `MLD VIỆT NAM - BẢNG GIÁ DỊCH VỤ & GÓI LIỆU TRÌNH\n\n${sections.join('\n\n')}\n\nLưu ý: Giá đã bao gồm VAT 8%. Gói phù hợp được xác định sau khi tư vấn và đánh giá chuyên môn.`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    toast.success(
      'Đã sao chép bảng giá vào bộ nhớ tạm! Có thể dán gửi Zalo/Facebook.',
    );
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Print flyer
  const handlePrint = () => {
    handleTabChange('matrix');
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => window.print()),
    );
  };

  // Quick edit price handler
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      if (!editingItem.name.trim())
        throw new Error('Tên niêm yết không được để trống.');
      if (!Number.isFinite(editingItem.price) || editingItem.price <= 0)
        throw new Error('Giá niêm yết phải lớn hơn 0.');
      if (
        editingItem.type === 'service' &&
        (!editingItem.duration || editingItem.duration <= 0)
      )
        throw new Error('Thời lượng dịch vụ phải lớn hơn 0 phút.');
      if (
        editingItem.type === 'package' &&
        (!editingItem.sessions ||
          editingItem.sessions <= 0 ||
          !editingItem.validityMonths ||
          editingItem.validityMonths <= 0)
      ) {
        throw new Error('Số buổi và thời hạn gói phải lớn hơn 0.');
      }
      setSavingEdit(true);
      if (editingItem.type === 'service') {
        await adminApi('services/update', {
          key: { id: editingItem.id },
          values: {
            price: editingItem.price,
            discount_price: editingItem.price,
            name: editingItem.name.trim(),
            duration_minutes: editingItem.duration,
            full_description: editingItem.description,
          },
        });
        toast.success(`Đã cập nhật dịch vụ "${editingItem.name}" thành công!`);
      } else {
        await adminApi('treatment_packages/update', {
          key: { id: editingItem.id },
          values: {
            price: editingItem.price,
            discount_price: editingItem.price,
            name: editingItem.name.trim(),
            total_sessions: editingItem.sessions,
            validity_months: editingItem.validityMonths,
            description: editingItem.description,
          },
        });
        toast.success(
          `Đã cập nhật gói liệu trình "${editingItem.name}" thành công!`,
        );
      }

      setEditingItem(null);
      await fetchData();
    } catch (err: any) {
      console.error('Lỗi lưu cập nhật:', err);
      toast.error(err.message || 'Không thể lưu thay đổi');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (
        sessionFilter !== 'ALL' &&
        p.total_sessions !== parseInt(sessionFilter)
      ) {
        return false;
      }
      if (catalogSearchTerm.trim()) {
        return matchSearch(
          [p.name, p.description, p.total_sessions, p.price],
          catalogSearchTerm,
        );
      }
      return true;
    });
  }, [packages, sessionFilter, catalogSearchTerm]);

  if (loading || catalogError) {
    return (
      <div
        className="rounded-2xl border border-[#EFE4D9] bg-white p-6 text-[#2C241E]"
        role="status"
      >
        <h1 className="text-xl font-bold">Bảng giá & gói liệu trình</h1>
        <p className="mt-2 text-sm text-[#73675F]">
          {loading
            ? 'Đang tải bảng giá…'
            : catalogError ||
              'Bảng giá chưa đủ dữ liệu niêm yết. Vui lòng kiểm tra danh mục trước khi bán.'}
        </p>
        {!loading && (
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 rounded-lg bg-[#985018] px-4 py-2 text-sm font-semibold text-white"
          >
            Tải lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="services-catalog catalog-workspace space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E] pb-16">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #mld-pricing-matrix-sheet, #mld-pricing-matrix-sheet * {
            visibility: visible;
          }
          #mld-pricing-matrix-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #ffffff !important;
            box-shadow: none !important;
            border: 1px solid #EFE4D9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Page Header & Actions Bar */}
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#985018]" />
            Bảng giá & gói liệu trình
          </h1>
          <p className="text-xs text-[#73675F] mt-1 font-medium">
            Quản lý giá dịch vụ và các gói chăm sóc hệ bạch huyết MLD Việt Nam.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="In bảng giá tiêu chuẩn"
          >
            <Printer className="w-4 h-4 text-[#8A4F23]" />
            <span>In bảng giá</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPricing}
            className="px-3.5 py-2.5 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Sao chép văn bản gửi Zalo/Facebook"
          >
            {copySuccess ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4 text-[#8A4F23]" />
            )}
            <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép bảng giá'}</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] transition-all shadow-2xs cursor-pointer"
            title="Tải lại dữ liệu từ Supabase Cloud"
          >
            <RefreshCw
              className={`w-4 h-4 text-[#8A4F23] ${loading ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={() => navigate('/cashier-pos')}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Mở thu ngân</span>
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs (Pill style matching W07_CashierPOS) */}
      <AdminTabs
        ariaLabel="Chế độ xem bảng giá"
        variant="pill"
        className="no-print"
        activeTab={activeTab}
        onChange={(tabId) =>
          handleTabChange(tabId as 'matrix' | 'services' | 'packages')
        }
        tabs={[
          { id: 'matrix', label: 'Bảng giá tổng hợp', icon: FileText },
          {
            id: 'services',
            label: `Dịch vụ buổi lẻ · ${activeServices.length}`,
            icon: HeartPulse,
          },
          {
            id: 'packages',
            label: `Gói liệu trình · ${activePackages.length}`,
            icon: Layers,
          },
        ]}
      />

      <div className="catalog-status no-print">
        <span>
          <strong>{activeServices.length}</strong> dịch vụ đang bán
        </span>
        <span>
          <strong>{activePackages.length}</strong> gói đang bán
        </span>
        {invalidPackages.length > 0 && (
          <span className="catalog-warning">
            {invalidPackages.length} gói cần hoàn thiện thông tin
          </span>
        )}
        <details className="catalog-help">
          <summary>Hướng dẫn bán gói</summary>
          <div>
            <h2>Quy trình bán và kích hoạt liệu trình</h2>
            <ol>
              <li>
                <strong>Chuẩn hóa bảng giá</strong> — kiểm tra dịch vụ, giá, số
                buổi và thời hạn.
              </li>
              <li>
                <strong>Tư vấn chọn gói</strong> — chọn gói phù hợp với nhu cầu
                khách.
              </li>
              <li>
                <strong>Thu tiền tại POS</strong> — chọn khách và xác nhận thanh
                toán tại thu ngân.
              </li>
              <li>
                <strong>Kích hoạt & xếp buổi</strong> — theo dõi tại Liệu trình
                khách hàng.
              </li>
            </ol>
          </div>
        </details>
      </div>
      {/* ========================================================================= */}
      {/* TAB 1: PRICING MATRIX (LUXURY COHESIVE FLYER BOARD)                         */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <section
          id="mld-pricing-matrix-sheet"
          ref={printRef}
          className="catalog-comparison"
        >
          <div className="catalog-comparison-heading">
            <div>
              <h2>So sánh giá dịch vụ và gói</h2>
              <p>
                Chọn giá để chỉnh sửa, hoặc chọn Bán gói để chuyển sang thu
                ngân.
              </p>
            </div>
          </div>
          <div
            className="catalog-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Bảng so sánh giá"
          >
            <table className="catalog-comparison-table">
              <thead>
                <tr>
                  <th scope="col">Dịch vụ</th>
                  <th scope="col">Buổi lẻ</th>
                  {Array.from(
                    new Set(activePackages.map((p) => p.total_sessions)),
                  )
                    .sort((a, b) => a - b)
                    .map((count) => (
                      <th scope="col" key={count}>
                        Gói {count} buổi
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {activeServices.map((service) => (
                  <tr key={service.id}>
                    <th scope="row">
                      <strong>{service.name}</strong>
                      <span>{service.duration_minutes} phút / buổi</span>
                    </th>
                    <td>
                      <button
                        className="catalog-price-edit"
                        title="Sửa giá niêm yết"
                        aria-label={'Sửa giá ' + service.name}
                        onClick={() =>
                          setEditingItem({
                            type: 'service',
                            id: service.id,
                            name: service.name,
                            price: service.price,
                            duration: service.duration_minutes,
                            description: service.full_description,
                          })
                        }
                      >
                        {Number(service.price) > 0
                          ? formatVND(service.price) + 'đ'
                          : 'Chưa niêm yết'}
                        <Pencil className="no-print w-3.5 h-3.5" />
                      </button>
                    </td>
                    {Array.from(
                      new Set(activePackages.map((p) => p.total_sessions)),
                    )
                      .sort((a, b) => a - b)
                      .map((count) => (
                        <td key={count}>
                          {activePackages
                            .filter(
                              (p) =>
                                p.service_id === service.id &&
                                p.total_sessions === count,
                            )
                            .map((pkg) => (
                              <div
                                className="catalog-price-option"
                                key={pkg.id}
                              >
                                <button
                                  className="catalog-price-edit"
                                  aria-label={'Sửa giá ' + pkg.name}
                                  onClick={() =>
                                    setEditingItem({
                                      type: 'package',
                                      id: pkg.id,
                                      name: pkg.name,
                                      price: pkg.price,
                                      sessions: pkg.total_sessions,
                                      validityMonths: pkg.validity_months,
                                      description: pkg.description,
                                    })
                                  }
                                >
                                  {Number(pkg.price) > 0
                                    ? formatVND(pkg.price) + 'đ'
                                    : 'Chưa niêm yết'}
                                  <Pencil className="no-print w-3.5 h-3.5" />
                                </button>
                                <span>
                                  {pkg.validity_months} tháng ·{' '}
                                  {formatVND(
                                    Math.round(pkg.price / pkg.total_sessions),
                                  )}
                                  đ / buổi
                                </span>
                                <button
                                  className="catalog-sell no-print"
                                  aria-label={'Bán ' + pkg.name}
                                  onClick={() => openPackageInPos(pkg)}
                                >
                                  Bán gói <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          {!activePackages.some(
                            (p) =>
                              p.service_id === service.id &&
                              p.total_sessions === count,
                          ) && (
                            <span className="catalog-unavailable">
                              Chưa có gói
                            </span>
                          )}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!activeServices.length && (
            <p className="catalog-empty">
              Chưa có dịch vụ đang bán. Kiểm tra tab Dịch vụ để cập nhật danh
              mục.
            </p>
          )}
        </section>
      )}
      {/* ========================================================================= */}
      {/* TAB 2: 3 CORE SERVICES DETAIL CARDS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <section className="catalog-comparison">
          <div className="catalog-comparison-heading">
            <div>
              <h2>Dịch vụ buổi lẻ</h2>
              <p>Tra giá và cập nhật thông tin từng dịch vụ.</p>
            </div>
          </div>
          <div className="catalog-table-scroll">
            <table className="catalog-comparison-table">
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Thời lượng</th>
                  <th>Giá / buổi</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <th scope="row">
                      <strong>{service.name}</strong>
                      <span>
                        {service.is_active ? 'Đang bán' : 'Tạm ngừng'}
                      </span>
                    </th>
                    <td>{service.duration_minutes} phút</td>
                    <td>
                      <strong>{formatVND(service.price)}đ</strong>
                    </td>
                    <td>
                      <button
                        className="catalog-secondary"
                        onClick={() =>
                          setEditingItem({
                            type: 'service',
                            id: service.id,
                            name: service.name,
                            price: service.price,
                            duration: service.duration_minutes,
                            description: service.full_description,
                          })
                        }
                      >
                        Chỉnh sửa
                      </button>
                      <button className="catalog-secondary" disabled={!service.is_active} onClick={() => navigate('/cashier-pos')} style={{marginLeft:8}}>Bán dịch vụ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!services.length && (
            <p className="catalog-empty">Chưa có dịch vụ trong danh mục.</p>
          )}
        </section>
      )}
      {/* ========================================================================= */}
      {/* TAB 3: 9 TREATMENT PACKAGES LIST                                          */}
      {/* ========================================================================= */}
      {activeTab === 'packages' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Filter Toolbar (Search + Session count chips) */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#EFE4D9] shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={catalogSearchTerm}
                onChange={(e) => setCatalogSearchTerm(e.target.value)}
                placeholder="Tìm gói liệu trình theo tên, số buổi, mức giá..."
                className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs"
              />
              {catalogSearchTerm && (
                <button
                  type="button"
                  onClick={() => setCatalogSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Session Count Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-[#73675F]">
                Lọc số buổi:
              </span>
              <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EFE4D9]">
                <button
                  type="button"
                  onClick={() => setSessionFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === 'ALL'
                      ? 'bg-white text-[#8A4F23] shadow-xs'
                      : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  Tất cả ({packages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('10')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === '10'
                      ? 'bg-white text-[#8A4F23] shadow-xs'
                      : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  10 buổi
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('20')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === '20'
                      ? 'bg-white text-[#8A4F23] shadow-xs'
                      : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  20 buổi
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('30')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === '30'
                      ? 'bg-white text-[#8A4F23] shadow-xs'
                      : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  30 buổi
                </button>
              </div>
            </div>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPackages.map((pkg) => {
              const perSession = Math.round(pkg.price / pkg.total_sessions);
              const isRecommended =
                (pkg.total_sessions === 10 && pkg.name.includes('khu trú')) ||
                (pkg.total_sessions === 10 && pkg.name.includes('mở rộng')) ||
                (pkg.total_sessions === 10 && pkg.name.includes('toàn diện')) ||
                (pkg.total_sessions === 20 && pkg.name.includes('toàn diện')) ||
                (pkg.total_sessions === 30 && pkg.name.includes('mở rộng'));

              return (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all ${
                    isRecommended
                      ? 'border-[#985018]/40 ring-1 ring-[#985018]/20 bg-gradient-to-b from-[#FAF8F5]/60 to-white'
                      : 'border-[#EFE4D9]'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                        {pkg.total_sessions} BUỔI
                      </span>

                      {isRecommended && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F6ED] text-[#0D6832] border border-emerald-200 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-emerald-600" />
                          Khuyên dùng nhiều nhất
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-[#2C241E] mb-1">
                      {pkg.name}
                    </h4>

                    <p className="text-xs text-[#73675F] mb-4 line-clamp-2">
                      {pkg.description ||
                        'Liệu trình dẫn lưu hệ bạch huyết chuẩn y khoa Dr. Vodder.'}
                    </p>

                    {/* Pricing Block */}
                    <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EFE4D9] mb-4 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-[#73675F]">
                          Giá trọn gói:
                        </span>
                        <span className="text-xl font-black text-[#985018]">
                          {formatVND(pkg.price)}đ
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DFD8]/60">
                        <span className="text-[#73675F]">
                          Đơn giá mỗi buổi:
                        </span>
                        <span className="font-bold text-[#2C241E]">
                          {formatVND(perSession)}đ / buổi
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#73675F]">
                        <span>Hạn bảo lưu:</span>
                        <span className="font-semibold text-[#2C241E]">
                          {pkg.validity_months} tháng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[#EFE4D9]">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          type: 'package',
                          id: pkg.id,
                          name: pkg.name,
                          price: pkg.price,
                          sessions: pkg.total_sessions,
                          validityMonths: pkg.validity_months,
                          description: pkg.description,
                        })
                      }
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#8A4F23]" /> Sửa giá
                    </button>
                    <button
                      type="button"
                      onClick={() => openPackageInPos(pkg)}
                      disabled={
                        !pkg.is_active ||
                        !pkg.service_id ||
                        Number(pkg.price) <= 0
                      }
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:bg-[#B8ADA4]"
                    >
                      {pkg.is_active ? 'Bán gói này' : 'Gói đang tạm ngừng'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPackages.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-10 text-center space-y-2">
              <Layers className="w-9 h-9 text-[#8A4F23] mx-auto opacity-40" />
              <div className="text-xs font-bold text-[#2C241E]">
                Không tìm thấy gói liệu trình nào phù hợp
              </div>
              <p className="text-[11px] text-[#73675F]">
                Vui lòng thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc số
                buổi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCatalogSearchTerm('');
                  setSessionFilter('ALL');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] hover:bg-[#F3E2CE] transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK EDIT MODAL                                                          */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE4D9] animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE4D9]">
              <h3 className="text-base font-extrabold text-[#2C241E] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#985018]" />
                <span>Chỉnh Sửa Giá Niêm Yết</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-[#73675F] mt-2 mb-4">
              Cập nhật giá bán sẽ tự động đồng bộ tức thì lên hệ thống POS và
              Mobile App.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Tên{' '}
                  {editingItem.type === 'service'
                    ? 'dịch vụ'
                    : 'gói liệu trình'}
                  :
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E8DFD8] rounded-xl bg-white text-[#2C241E] font-medium focus:border-[#985018] focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Giá niêm yết (VNĐ - Đã bao gồm VAT 8%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-3 pr-12 py-2 text-sm font-bold border border-[#E8DFD8] rounded-xl bg-white text-[#985018] focus:border-[#985018] focus:outline-none shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C7A6B]">
                    VNĐ
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#8A4F23] mt-1 block">
                  Định dạng: {formatVND(editingItem.price)} VNĐ
                </span>
              </div>

              {editingItem.type === 'package' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1">
                      Tổng số buổi:
                    </label>
                    <input
                      type="number"
                      value={editingItem.sessions || 10}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          sessions: parseInt(e.target.value) || 10,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-[#E8DFD8] rounded-xl bg-white text-[#2C241E] font-medium focus:border-[#985018] focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1">
                      Hạn dùng (tháng):
                    </label>
                    <input
                      type="number"
                      value={editingItem.validityMonths || 3}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          validityMonths: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-[#E8DFD8] rounded-xl bg-white text-[#2C241E] font-medium focus:border-[#985018] focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Mô tả / Ghi chú:
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E8DFD8] rounded-xl bg-white text-[#2C241E] focus:border-[#985018] focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-[#EFE4D9]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-[#73675F] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Lưu Thay Đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
