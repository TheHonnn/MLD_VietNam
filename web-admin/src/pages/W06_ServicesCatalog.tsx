import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ServicesCatalog.css';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Share2,
  Layers,
  HeartPulse,
  Info,
  Calendar,
  CreditCard,
  TrendingUp,
  Tag,
  Pencil,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Percent,
  SlidersHorizontal,
  Flame,
  Award,
  FileText,
  Search,
  X,
  BadgePercent,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { toast } from '../components/common';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchSearch } from '../utils/searchUtils';

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
  const [activeTab, setActiveTab] = useState<'matrix' | 'services' | 'packages'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'services' || tabParam === 'packages' || tabParam === 'matrix') {
      return tabParam;
    }
    return 'matrix';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'services' || tabParam === 'packages' || tabParam === 'matrix') {
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
  const [sessionFilter, setSessionFilter] = useState<'ALL' | '10' | '20' | '30'>('ALL');
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
      setCatalogError('Không thể xác minh bảng giá hiện tại. Vui lòng tải lại.');
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

  // Identify core 3 services by duration or name
  const serviceKhuTru: ServiceItem = services.find(
    (s) => s.duration_minutes === 45 || s.name.toLowerCase().includes('khu trú')
  ) || {
    id: '11111111-2222-3333-4444-000000000001',
    name: "Chăm sóc khu trú (45')",
    slug: 'cham-soc-khu-tru-45',
    duration_minutes: 45,
    price: 500000,
    discount_price: 500000,
    full_description: 'Chương trình chăm sóc khu trú 45 phút chuẩn Vodder quốc tế.',
    is_featured: true,
    is_active: true,
  };

  const serviceMoRong: ServiceItem = services.find(
    (s) => s.duration_minutes === 60 || s.name.toLowerCase().includes('mở rộng')
  ) || {
    id: '235166f2-66c9-4231-bbe1-af91b48fc67c',
    name: "Chăm sóc mở rộng (60')",
    slug: 'cham-soc-mo-rong-60',
    duration_minutes: 60,
    price: 900000,
    discount_price: 900000,
    full_description: 'Chương trình chăm sóc mở rộng 60 phút bao quát phạm vi liên kết rộng hơn trên cơ thể.',
    is_featured: true,
    is_active: true,
  };

  const serviceToanDien: ServiceItem = services.find(
    (s) => s.duration_minutes === 90 || s.name.toLowerCase().includes('toàn diện')
  ) || {
    id: '11111111-2222-3333-4444-000000000003',
    name: "Chăm sóc toàn diện (90')",
    slug: 'cham-soc-toan-dien-90',
    duration_minutes: 90,
    price: 1700000,
    discount_price: 1700000,
    full_description: 'Chương trình chăm sóc toàn diện 90 phút phục hồi tối đa hệ bạch huyết toàn thân.',
    is_featured: true,
    is_active: true,
  };

  // Find package by service and session count
  const getPackage = (serviceId: string, sessions: number) => {
    return packages.find(
      (p) =>
        (p.service_id === serviceId ||
          (sessions === 10 && serviceId === serviceKhuTru.id && p.name.includes('khu trú')) ||
          (sessions === 10 && serviceId === serviceMoRong.id && p.name.includes('mở rộng')) ||
          (sessions === 10 && serviceId === serviceToanDien.id && p.name.includes('toàn diện')) ||
          (sessions === 20 && serviceId === serviceKhuTru.id && p.name.includes('khu trú')) ||
          (sessions === 20 && serviceId === serviceMoRong.id && p.name.includes('mở rộng')) ||
          (sessions === 20 && serviceId === serviceToanDien.id && p.name.includes('toàn diện')) ||
          (sessions === 30 && serviceId === serviceKhuTru.id && p.name.includes('khu trú')) ||
          (sessions === 30 && serviceId === serviceMoRong.id && p.name.includes('mở rộng')) ||
          (sessions === 30 && serviceId === serviceToanDien.id && p.name.includes('toàn diện'))) &&
        p.total_sessions === sessions
    );
  };

  // Specific packages according to the flyer
  const pkgKhuTru10 = getPackage(serviceKhuTru.id, 10);
  const pkgKhuTru20 = getPackage(serviceKhuTru.id, 20);
  const pkgKhuTru30 = getPackage(serviceKhuTru.id, 30);

  const pkgMoRong10 = getPackage(serviceMoRong.id, 10);
  const pkgMoRong20 = getPackage(serviceMoRong.id, 20);
  const pkgMoRong30 = getPackage(serviceMoRong.id, 30);

  const pkgToanDien10 = getPackage(serviceToanDien.id, 10);
  const pkgToanDien20 = getPackage(serviceToanDien.id, 20);
  const pkgToanDien30 = getPackage(serviceToanDien.id, 30);

  // Copy pricing text for Zalo / Message sharing
  const handleCopyPricing = () => {
    const text = `🌸 MLD VIỆT NAM - BẢNG GIÁ DỊCH VỤ & GÓI LIỆU TRÌNH CHUẨN Y KHOA VODDER
(Bao gồm chăm sóc cả hệ bạch huyết sâu và hệ bạch huyết nông)

1️⃣ CHĂM SÓC KHU TRÚ (45'):
• Buổi lẻ: 500.000 VNĐ
• Gói 10 buổi: 4.800.000 VNĐ (480k/buổi - Tiết kiệm 200k) ⭐
• Gói 20 buổi: 9.200.000 VNĐ (460k/buổi - Tiết kiệm 800k)
• Gói 30 buổi: 13.200.000 VNĐ (440k/buổi - Tiết kiệm 1.8M)

2️⃣ CHĂM SÓC MỞ RỘNG (60'):
• Buổi lẻ: 900.000 VNĐ
• Gói 10 buổi: 8.600.000 VNĐ (860k/buổi - Tiết kiệm 400k) ⭐
• Gói 20 buổi: 16.400.000 VNĐ (820k/buổi - Tiết kiệm 1.6M)
• Gói 30 buổi: 23.400.000 VNĐ (780k/buổi - Tiết kiệm 3.6M) ⭐

3️⃣ CHĂM SÓC TOÀN DIỆN (90'):
• Buổi lẻ: 1.700.000 VNĐ
• Gói 10 buổi: 16.200.000 VNĐ (1.620k/buổi - Tiết kiệm 800k) ⭐
• Gói 20 buổi: 30.800.000 VNĐ (1.540k/buổi - Tiết kiệm 3.2M) ⭐
• Gói 30 buổi: 43.800.000 VNĐ (1.460k/buổi - Tiết kiệm 7.2M)

📌 Lưu ý: Đơn vị VNĐ. Giá dịch vụ đã bao gồm thuế VAT 8% theo quy định áp dụng. Phạm vi chăm sóc và số buổi đề xuất dựa trên kết quả đánh giá chuyên môn, tình trạng sức khỏe và mục tiêu theo dõi của từng khách hàng.`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    toast.success('Đã sao chép bảng giá vào bộ nhớ tạm! Có thể dán gửi Zalo/Facebook.');
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Print flyer
  const handlePrint = () => {
    window.print();
  };

  // Quick edit price handler
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      setSavingEdit(true);
      if (editingItem.type === 'service') {
        const { data, error } = await supabase
          .from('services')
          .update({
            price: editingItem.price,
            discount_price: editingItem.price,
            name: editingItem.name,
            duration_minutes: editingItem.duration,
            full_description: editingItem.description,
          })
          .eq('id', editingItem.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Dịch vụ không còn tồn tại hoặc bạn không có quyền sửa.');
        toast.success(`Đã cập nhật dịch vụ "${editingItem.name}" thành công!`);
      } else {
        const { data, error } = await supabase
          .from('treatment_packages')
          .update({
            price: editingItem.price,
            discount_price: editingItem.price,
            name: editingItem.name,
            total_sessions: editingItem.sessions,
            validity_months: editingItem.validityMonths,
            description: editingItem.description,
          })
          .eq('id', editingItem.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Gói liệu trình không còn tồn tại hoặc bạn không có quyền sửa.');
        toast.success(`Đã cập nhật gói liệu trình "${editingItem.name}" thành công!`);
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
      if (sessionFilter !== 'ALL' && p.total_sessions !== parseInt(sessionFilter)) {
        return false;
      }
      if (catalogSearchTerm.trim()) {
        return matchSearch([p.name, p.description, p.total_sessions, p.price], catalogSearchTerm);
      }
      return true;
    });
  }, [packages, sessionFilter, catalogSearchTerm]);

  if (loading || catalogError || services.length < 3 || packages.length < 9) {
    return <div className="rounded-2xl border border-[#EFE4D9] bg-white p-6 text-[#2C241E]" role="status">
      <h1 className="text-xl font-bold">Bảng giá & gói liệu trình</h1>
      <p className="mt-2 text-sm text-[#73675F]">{loading ? 'Đang tải bảng giá…' : catalogError || 'Bảng giá chưa đủ dữ liệu niêm yết. Vui lòng kiểm tra danh mục trước khi bán.'}</p>
      {!loading && <button type="button" onClick={fetchData} className="mt-4 rounded-lg bg-[#985018] px-4 py-2 text-sm font-semibold text-white">Tải lại</button>}
    </div>;
  }

  return (
    <div className="services-catalog space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E] pb-16">
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
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8A4F23]" /> Chuẩn Dr. Vodder Quốc Tế
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F6ED] text-[#0D6832] border border-emerald-200 flex items-center gap-1 shadow-2xs">
              <Percent className="w-3 h-3 text-[#0D6832]" /> VAT 8% Đã Niêm Yết
            </span>
          </div>
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
            <span>{copySuccess ? 'Đã sao chép!' : 'Gửi Zalo'}</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] transition-all shadow-2xs cursor-pointer"
            title="Tải lại dữ liệu từ Supabase Cloud"
          >
            <RefreshCw className={`w-4 h-4 text-[#8A4F23] ${loading ? 'animate-spin' : ''}`} />
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

      {/* 2. Metric Summary Cards */}
      <div className="catalog-metrics no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-semibold">Dịch vụ buổi lẻ</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center font-bold">
              <HeartPulse className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#2C241E] tracking-tight">3 chương trình</div>
          <div className="text-[11px] text-[#73675F]">Khu trú 45' • Mở rộng 60' • Toàn diện 90'</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-semibold">Gói liệu trình tiết kiệm</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#2C241E] tracking-tight">9 gói liệu trình</div>
          <div className="text-[11px] text-[#73675F]">10 buổi (3 thg) • 20 buổi (6 thg) • 30 buổi (12 thg)</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-semibold">Chiết khấu cao nhất</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F6ED] text-[#0D6832] flex items-center justify-center font-bold">
              <BadgePercent className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0D6832] tracking-tight">7,2 triệu đồng</div>
          <div className="text-[11px] text-[#73675F]">Áp dụng cho gói 30 buổi toàn diện 90'</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-semibold">Quy chuẩn dịch vụ</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF2FA] text-[#1E5D9B] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E5D9B] tracking-tight">Dr. Vodder</div>
          <div className="text-[11px] text-[#73675F]">Đã bao gồm VAT 8% • Minh bạch & cam kết</div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Pill style matching W07_CashierPOS) */}
      <div className="catalog-tabs no-print flex flex-wrap items-center gap-2 border-b border-[#EFE4D9] pb-3" aria-label="Chế độ xem bảng giá">
        <button
          type="button"
          onClick={() => handleTabChange('matrix')}
          aria-pressed={activeTab === 'matrix'}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bảng giá tổng hợp</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('services')}
          aria-pressed={activeTab === 'services'}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'services'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Dịch vụ buổi lẻ · 3</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('packages')}
          aria-pressed={activeTab === 'packages'}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'packages'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Gói liệu trình · 9</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRICING MATRIX (LUXURY COHESIVE FLYER BOARD)                         */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Context Notice Banner */}
          <div className="catalog-notice no-print bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[#2C241E]">
                  So sánh giá và chọn gói phù hợp
                </p>
                <p className="text-[#73675F] mt-0.5">
                  Nhấn biểu tượng bút chì để sửa giá hoặc chọn <span className="font-bold text-[#985018]">Bán gói</span> để chuyển đến thu ngân.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleTabChange('packages')}
                className="text-xs font-bold text-[#8A4F23] hover:text-[#5C3214] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem các gói liệu trình</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* THE LUXURY PRICING MATRIX BOARD */}
          <div
            id="mld-pricing-matrix-sheet"
            ref={printRef}
            className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden w-full"
          >
            {/* Board Header Banner */}
            <div className="catalog-board-header">
              <div>
                <p className="catalog-eyebrow">MLD VIỆT NAM · DR. VODDER</p>
                <h2>Giá dịch vụ & gói liệu trình</h2>
                <p>Chăm sóc hệ bạch huyết sâu và nông</p>
              </div>
              <span className="catalog-tax-note">
                <ShieldCheck className="w-4 h-4" /> Giá đã bao gồm VAT 8%
              </span>
            </div>

            {/* Board Table Body */}
            <div className="catalog-board-body">
              <div className="catalog-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Bảng so sánh giá dịch vụ và gói liệu trình">
                <table className="catalog-price-table w-full text-left border-collapse text-xs">
                  <caption className="sr-only">Giá buổi lẻ và gói 10, 20, 30 buổi cho ba chương trình chăm sóc. Giá tính bằng đồng Việt Nam.</caption>
                  <thead>
                    <tr className="border-b border-[#EFE4D9]">
                      {/* Column 1 Header: 3 Chương trình chăm sóc */}
                      <th className="w-1/4 pb-5 pr-4 align-top">
                        <div className="border-l-4 border-[#985018] pl-3 py-1">
                          <h3 className="text-sm sm:text-base font-extrabold text-[#3E200C] uppercase tracking-wide leading-tight">
                            Chương trình chăm sóc
                          </h3>
                          <p className="text-[11px] text-[#73675F] font-medium mt-1 leading-relaxed">
                            Chọn buổi lẻ hoặc gói 10, 20, 30 buổi
                          </p>
                        </div>
                      </th>

                      {/* Column 2 Header: Chăm sóc khu trú (45') */}
                      <th className="w-1/4 pb-5 px-2.5 text-center align-top">
                        <div className="bg-[#FAF0E4] border border-[#E8DFD8] text-[#8A4F23] py-2.5 px-3 rounded-2xl shadow-2xs">
                          <span className="text-xs sm:text-sm font-extrabold tracking-wide block uppercase">
                            CHĂM SÓC KHU TRÚ
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold block opacity-90">
                            (45 Phút)
                          </span>
                        </div>
                        <span className="text-[11px] text-[#73675F] mt-1.5 block font-medium">
                          Vùng can thiệp tập trung
                        </span>
                      </th>

                      {/* Column 3 Header: Chăm sóc mở rộng (60') */}
                      <th className="w-1/4 pb-5 px-2.5 text-center align-top">
                        <div className="bg-[#985018] text-white py-2.5 px-3 rounded-2xl shadow-xs relative">
                          <span className="catalog-popular-label absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-200 text-[#5C3214] text-[9px] font-black uppercase tracking-wider px-2 py-0.2 rounded-full shadow-2xs whitespace-nowrap">
                            Phổ biến nhất
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold tracking-wide block uppercase">
                            CHĂM SÓC MỞ RỘNG
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold block opacity-90">
                            (60 Phút)
                          </span>
                        </div>
                        <span className="text-[11px] text-[#73675F] mt-1.5 block font-medium">
                          Nhiều vùng liên kết
                        </span>
                      </th>

                      {/* Column 4 Header: Chăm sóc toàn diện (90') */}
                      <th className="w-1/4 pb-5 pl-2.5 text-center align-top">
                        <div className="bg-[#FAF0E4] border border-[#E8DFD8] text-[#8A4F23] py-2.5 px-3 rounded-2xl shadow-2xs relative">
                          <span className="text-xs sm:text-sm font-extrabold tracking-wide block uppercase">
                            CHĂM SÓC TOÀN DIỆN
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold block opacity-90">
                            (90 Phút)
                          </span>
                        </div>
                        <span className="text-[11px] text-[#73675F] mt-1.5 block font-medium">
                          Toàn thân & nội tạng
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F2ECE6] text-[#2C241E]">
                    {/* ROW 1: GIÁ BUỔI LẺ */}
                    <tr className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="font-bold text-sm text-[#2C241E]">Giá buổi lẻ</div>
                        <div className="text-[11px] text-[#73675F]">Thanh toán theo từng buổi chăm sóc</div>
                      </td>

                      {/* Buổi lẻ khu trú */}
                      <td className="py-4 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-base sm:text-lg font-black text-[#2C241E]">
                            {formatVND(serviceKhuTru.price)}đ
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingItem({
                                type: 'service',
                                id: serviceKhuTru.id,
                                name: serviceKhuTru.name,
                                price: serviceKhuTru.price,
                                duration: 45,
                                description: serviceKhuTru.full_description,
                              })
                            }
                            className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                            title="Sửa giá niêm yết"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="no-print mt-1">
                          <button
                            type="button"
                            onClick={() => navigate('/cashier-pos')}
                            className="text-[10px] font-bold text-[#8A4F23] hover:underline cursor-pointer"
                          >
                            Bán tại POS →
                          </button>
                        </div>
                      </td>

                      {/* Buổi lẻ mở rộng */}
                      <td className="py-4 px-2.5 text-center bg-[#FAF6F0]/40">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-base sm:text-lg font-black text-[#2C241E]">
                            {formatVND(serviceMoRong.price)}đ
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingItem({
                                type: 'service',
                                id: serviceMoRong.id,
                                name: serviceMoRong.name,
                                price: serviceMoRong.price,
                                duration: 60,
                                description: serviceMoRong.full_description,
                              })
                            }
                            className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                            title="Sửa giá niêm yết"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="no-print mt-1">
                          <button
                            type="button"
                            onClick={() => navigate('/cashier-pos')}
                            className="text-[10px] font-bold text-[#8A4F23] hover:underline cursor-pointer"
                          >
                            Bán tại POS →
                          </button>
                        </div>
                      </td>

                      {/* Buổi lẻ toàn diện */}
                      <td className="py-4 pl-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-base sm:text-lg font-black text-[#2C241E]">
                            {formatVND(serviceToanDien.price)}đ
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingItem({
                                type: 'service',
                                id: serviceToanDien.id,
                                name: serviceToanDien.name,
                                price: serviceToanDien.price,
                                duration: 90,
                                description: serviceToanDien.full_description,
                              })
                            }
                            className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                            title="Sửa giá niêm yết"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="no-print mt-1">
                          <button
                            type="button"
                            onClick={() => navigate('/cashier-pos')}
                            className="text-[10px] font-bold text-[#8A4F23] hover:underline cursor-pointer"
                          >
                            Bán tại POS →
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ROW 2: GIÁ LIỆU TRÌNH 10 BUỔI (KHUYÊN DÙNG NHIỀU NHẤT) */}
                    <tr className="bg-[#FAF0E4]/30 hover:bg-[#FAF0E4]/50 transition-colors border-l-2 border-l-[#985018]">
                      <td className="py-4 pr-4 pl-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-[#3E200C]">
                            Giá liệu trình 10 buổi
                          </span>
                          <span className="no-print px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                            Hot
                          </span>
                        </div>
                        <span className="block text-[11px] text-[#73675F]">Hạn dùng 3 tháng • Phổ biến</span>
                      </td>

                      {/* 10 buổi khu trú: 4.800.000đ */}
                      <td className="py-4 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-lg sm:text-xl text-[#985018] tracking-tight">
                            {formatVND(pkgKhuTru10?.price || 4800000)}đ
                          </span>
                          {pkgKhuTru10 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgKhuTru10.id,
                                  name: pkgKhuTru10.name,
                                  price: pkgKhuTru10.price,
                                  sessions: 10,
                                  validityMonths: pkgKhuTru10.validity_months,
                                  description: pkgKhuTru10.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 200k
                          </span>
                          <span className="text-[10px] text-[#73675F]">480k/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgKhuTru10
                                  ? `/cashier-pos?packageId=${pkgKhuTru10.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#985018] hover:bg-[#854412] text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói này
                          </button>
                        </div>
                      </td>

                      {/* 10 buổi mở rộng: 8.600.000đ */}
                      <td className="py-4 px-2.5 text-center bg-[#FAF6F0]/60">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-lg sm:text-xl text-[#985018] tracking-tight">
                            {formatVND(pkgMoRong10?.price || 8600000)}đ
                          </span>
                          {pkgMoRong10 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgMoRong10.id,
                                  name: pkgMoRong10.name,
                                  price: pkgMoRong10.price,
                                  sessions: 10,
                                  validityMonths: pkgMoRong10.validity_months,
                                  description: pkgMoRong10.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 400k
                          </span>
                          <span className="text-[10px] text-[#73675F]">860k/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgMoRong10
                                  ? `/cashier-pos?packageId=${pkgMoRong10.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#985018] hover:bg-[#854412] text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói này
                          </button>
                        </div>
                      </td>

                      {/* 10 buổi toàn diện: 16.200.000đ */}
                      <td className="py-4 pl-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-lg sm:text-xl text-[#985018] tracking-tight">
                            {formatVND(pkgToanDien10?.price || 16200000)}đ
                          </span>
                          {pkgToanDien10 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgToanDien10.id,
                                  name: pkgToanDien10.name,
                                  price: pkgToanDien10.price,
                                  sessions: 10,
                                  validityMonths: pkgToanDien10.validity_months,
                                  description: pkgToanDien10.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 800k
                          </span>
                          <span className="text-[10px] text-[#73675F]">1.62M/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgToanDien10
                                  ? `/cashier-pos?packageId=${pkgToanDien10.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#985018] hover:bg-[#854412] text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói này
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ROW 3: GIÁ LIỆU TRÌNH 20 BUỔI */}
                    <tr className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="font-bold text-sm text-[#2C241E]">Giá liệu trình 20 buổi</div>
                        <div className="text-[11px] text-[#73675F]">Hạn dùng 6 tháng • Phục hồi chuyên sâu</div>
                      </td>

                      {/* 20 buổi khu trú: 9.200.000đ */}
                      <td className="py-4 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-extrabold text-base sm:text-lg text-[#2C241E]">
                            {formatVND(pkgKhuTru20?.price || 9200000)}đ
                          </span>
                          {pkgKhuTru20 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgKhuTru20.id,
                                  name: pkgKhuTru20.name,
                                  price: pkgKhuTru20.price,
                                  sessions: 20,
                                  validityMonths: pkgKhuTru20.validity_months,
                                  description: pkgKhuTru20.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 800k
                          </span>
                          <span className="text-[10px] text-[#73675F]">460k/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgKhuTru20
                                  ? `/cashier-pos?packageId=${pkgKhuTru20.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói
                          </button>
                        </div>
                      </td>

                      {/* 20 buổi mở rộng: 16.400.000đ */}
                      <td className="py-4 px-2.5 text-center bg-[#FAF6F0]/40">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-extrabold text-base sm:text-lg text-[#2C241E]">
                            {formatVND(pkgMoRong20?.price || 16400000)}đ
                          </span>
                          {pkgMoRong20 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgMoRong20.id,
                                  name: pkgMoRong20.name,
                                  price: pkgMoRong20.price,
                                  sessions: 20,
                                  validityMonths: pkgMoRong20.validity_months,
                                  description: pkgMoRong20.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 1.6M
                          </span>
                          <span className="text-[10px] text-[#73675F]">820k/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgMoRong20
                                  ? `/cashier-pos?packageId=${pkgMoRong20.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói
                          </button>
                        </div>
                      </td>

                      {/* 20 buổi toàn diện: 30.800.000đ */}
                      <td className="py-4 pl-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-extrabold text-base sm:text-lg text-[#2C241E]">
                            {formatVND(pkgToanDien20?.price || 30800000)}đ
                          </span>
                          {pkgToanDien20 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgToanDien20.id,
                                  name: pkgToanDien20.name,
                                  price: pkgToanDien20.price,
                                  sessions: 20,
                                  validityMonths: pkgToanDien20.validity_months,
                                  description: pkgToanDien20.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 3.2M
                          </span>
                          <span className="text-[10px] text-[#73675F]">1.54M/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgToanDien20
                                  ? `/cashier-pos?packageId=${pkgToanDien20.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ROW 4: GIÁ LIỆU TRÌNH 30 BUỔI */}
                    <tr className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="font-bold text-sm text-[#2C241E]">Giá liệu trình 30 buổi</div>
                        <div className="text-[11px] text-[#73675F]">Hạn dùng 12 tháng • Liệu trình toàn khóa</div>
                      </td>

                      {/* 30 buổi khu trú: 13.200.000đ */}
                      <td className="py-4 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-extrabold text-base sm:text-lg text-[#2C241E]">
                            {formatVND(pkgKhuTru30?.price || 13200000)}đ
                          </span>
                          {pkgKhuTru30 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgKhuTru30.id,
                                  name: pkgKhuTru30.name,
                                  price: pkgKhuTru30.price,
                                  sessions: 30,
                                  validityMonths: pkgKhuTru30.validity_months,
                                  description: pkgKhuTru30.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 1.8M
                          </span>
                          <span className="text-[10px] text-[#73675F]">440k/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgKhuTru30
                                  ? `/cashier-pos?packageId=${pkgKhuTru30.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói
                          </button>
                        </div>
                      </td>

                      {/* 30 buổi mở rộng: 23.400.000đ */}
                      <td className="py-4 px-2.5 text-center bg-[#FAF6F0]/40">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-extrabold text-base sm:text-lg text-[#2C241E]">
                            {formatVND(pkgMoRong30?.price || 23400000)}đ
                          </span>
                          {pkgMoRong30 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgMoRong30.id,
                                  name: pkgMoRong30.name,
                                  price: pkgMoRong30.price,
                                  sessions: 30,
                                  validityMonths: pkgMoRong30.validity_months,
                                  description: pkgMoRong30.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 3.6M
                          </span>
                          <span className="text-[10px] text-[#73675F]">780k/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgMoRong30
                                  ? `/cashier-pos?packageId=${pkgMoRong30.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói
                          </button>
                        </div>
                      </td>

                      {/* 30 buổi toàn diện: 43.800.000đ */}
                      <td className="py-4 pl-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-extrabold text-base sm:text-lg text-[#2C241E]">
                            {formatVND(pkgToanDien30?.price || 43800000)}đ
                          </span>
                          {pkgToanDien30 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  type: 'package',
                                  id: pkgToanDien30.id,
                                  name: pkgToanDien30.name,
                                  price: pkgToanDien30.price,
                                  sessions: 30,
                                  validityMonths: pkgToanDien30.validity_months,
                                  description: pkgToanDien30.description,
                                })
                              }
                              className="no-print p-1 hover:bg-[#FAF0E4] rounded-lg text-[#8C7A6B] hover:text-[#985018] transition-colors cursor-pointer"
                              title="Sửa giá gói"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-[#E8F6ED] px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                            Tiết kiệm 7.2M
                          </span>
                          <span className="text-[10px] text-[#73675F]">1.46M/b</span>
                        </div>
                        <div className="no-print mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                pkgToanDien30
                                  ? `/cashier-pos?packageId=${pkgToanDien30.id}`
                                  : '/cashier-pos'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs"
                          >
                            Bán gói
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Board Footer Notice */}
              <div className="mt-7 pt-5 border-t border-[#EFE4D9]">
                <div className="border-l-4 border-[#985018] pl-3.5 py-1 text-[#73675F] text-xs leading-relaxed bg-[#FAF8F5] p-3 rounded-r-xl">
                  <p>
                    <strong className="text-[#2C241E] font-bold">Đơn vị: VNĐ.</strong> Giá dịch vụ{' '}
                    <strong className="text-[#2C241E] font-bold">đã bao gồm thuế VAT 8%</strong> theo quy định áp dụng.
                    Phạm vi chăm sóc và số buổi đề xuất dựa trên kết quả thăm khám chuyên môn, tình trạng phù nề thực tế và
                    mục tiêu theo dõi của từng khách hàng. Khách hàng{' '}
                    <strong className="text-[#2C241E] font-bold">
                      được giải thích chuyên sâu và đồng thuận với kế hoạch trước khi thực hiện.
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Consultation CTA */}
          <div className="no-print bg-white border border-[#EFE4D9] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center shrink-0 font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2C241E]">
                  Tư vấn phác đồ điều trị cá nhân hóa
                </h4>
                <p className="text-xs text-[#73675F]">
                  Gợi ý gói 10 - 20 - 30 buổi phù hợp theo mức độ phù nề và giai đoạn phục hồi của từng khách hàng.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/treatment-management')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#2C241E] bg-white border border-[#E8DFD8] hover:bg-[#FAF6F0] transition-colors cursor-pointer shadow-2xs"
              >
                Hồ sơ phác đồ MLD
              </button>
              <button
                type="button"
                onClick={() => navigate('/cashier-pos')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#985018] hover:bg-[#854412] transition-colors shadow-xs cursor-pointer"
              >
                Tạo đơn bán gói tại POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 3 CORE SERVICES DETAIL CARDS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Chăm sóc khu trú (45') */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
              <div className="relative h-44 bg-[#FAF8F5]">
                <img
                  src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80"
                  alt="Chăm sóc khu trú"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#2C1E14]/90 backdrop-blur-xs text-[#EBD5B3] text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                  45 PHÚT
                </div>
                <div className="absolute top-3 right-3 bg-white/95 text-[#0D6832] text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs border border-emerald-100">
                  VAT 8%
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-[#2C241E] mb-1">
                  Chăm sóc khu trú (45')
                </h3>

                <p className="text-xs text-[#73675F] mb-4 line-clamp-2">
                  Tập trung vào vùng chỉ định (mặt, cổ vai gáy, hoặc chi dưới) nhằm giải tỏa ứ trệ và giảm sưng nề nhanh.
                </p>

                <div className="mb-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9]">
                  <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-0.5">
                    Giá niêm yết (Buổi lẻ)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#2C241E]">
                      {formatVND(serviceKhuTru.price)}đ
                    </span>
                    <span className="text-xs text-[#73675F]">/ buổi</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-2 mb-5 flex-1 border-t border-[#EFE4D9] pt-3 text-xs">
                  <span className="font-bold text-[#2C241E] block">
                    Đặc điểm lâm sàng:
                  </span>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Kích hoạt hệ bạch huyết nông và sâu vùng can thiệp</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Giảm sưng đau, căng tức phù nề tức thì</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Thích hợp phục hồi chuyên biệt sau phẫu thuật</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#EFE4D9]">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        type: 'service',
                        id: serviceKhuTru.id,
                        name: serviceKhuTru.name,
                        price: serviceKhuTru.price,
                        duration: 45,
                        description: serviceKhuTru.full_description,
                      })
                    }
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#8A4F23]" /> Sửa giá
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/cashier-pos')}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    Bán dịch vụ
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Chăm sóc mở rộng (60') */}
            <div className="bg-white rounded-2xl border-2 border-[#985018]/50 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col relative">
              <div className="absolute top-2.5 right-2.5 z-10 bg-[#985018] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                Phổ biến nhất
              </div>

              <div className="relative h-44 bg-[#FAF8F5]">
                <img
                  src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80"
                  alt="Chăm sóc mở rộng"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#2C1E14]/90 backdrop-blur-xs text-[#EBD5B3] text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                  60 PHÚT
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-[#2C241E] mb-1">
                  Chăm sóc mở rộng (60')
                </h3>

                <p className="text-xs text-[#73675F] mb-4 line-clamp-2">
                  Bao quát phạm vi liên kết rộng hơn trên cơ thể, giúp kích hoạt đồng bộ cả hệ bạch huyết sâu và nông liên vùng.
                </p>

                <div className="mb-4 p-3 bg-[#FAF0E4]/40 rounded-xl border border-[#E8DFD8]">
                  <span className="text-[10px] font-bold text-[#8A4F23] uppercase tracking-wider block mb-0.5">
                    Giá niêm yết (Buổi lẻ)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#985018]">
                      {formatVND(serviceMoRong.price)}đ
                    </span>
                    <span className="text-xs text-[#73675F]">/ buổi</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-2 mb-5 flex-1 border-t border-[#EFE4D9] pt-3 text-xs">
                  <span className="font-bold text-[#2C241E] block">
                    Đặc điểm lâm sàng:
                  </span>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Đả thông dòng chảy bạch huyết đa tầng sâu - nông</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Tối ưu tiêu sưng nề và bầm tím diện rộng</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Củng cố tuần hoàn và hệ miễn dịch tự nhiên</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#EFE4D9]">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        type: 'service',
                        id: serviceMoRong.id,
                        name: serviceMoRong.name,
                        price: serviceMoRong.price,
                        duration: 60,
                        description: serviceMoRong.full_description,
                      })
                    }
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#8A4F23]" /> Sửa giá
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/cashier-pos')}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    Bán dịch vụ
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Chăm sóc toàn diện (90') */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
              <div className="relative h-44 bg-[#FAF8F5]">
                <img
                  src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
                  alt="Chăm sóc toàn diện"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#2C1E14]/90 backdrop-blur-xs text-[#EBD5B3] text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                  90 PHÚT
                </div>
                <div className="absolute top-3 right-3 bg-white/95 text-[#0D6832] text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs border border-emerald-100">
                  VAT 8%
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-[#2C241E] mb-1">
                  Chăm sóc toàn diện (90')
                </h3>

                <p className="text-xs text-[#73675F] mb-4 line-clamp-2">
                  Phục hồi tối đa hệ bạch huyết toàn thân, kết nối tuần hoàn nông dưới da & bạch huyết nội tạng.
                </p>

                <div className="mb-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9]">
                  <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-0.5">
                    Giá niêm yết (Buổi lẻ)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#2C241E]">
                      {formatVND(serviceToanDien.price)}đ
                    </span>
                    <span className="text-xs text-[#73675F]">/ buổi</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-2 mb-5 flex-1 border-t border-[#EFE4D9] pt-3 text-xs">
                  <span className="font-bold text-[#2C241E] block">
                    Đặc điểm lâm sàng:
                  </span>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Dẫn lưu toàn bộ trạm hạch chính: cổ, nách, bụng, bẹn</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Kết nối tuần hoàn nông dưới da & bạch huyết nội tạng</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#73675F]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6832] shrink-0" />
                    <span>Hồi sinh năng lượng, thải độc tế bào cấp độ sâu nhất</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#EFE4D9]">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        type: 'service',
                        id: serviceToanDien.id,
                        name: serviceToanDien.name,
                        price: serviceToanDien.price,
                        duration: 90,
                        description: serviceToanDien.full_description,
                      })
                    }
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-white hover:bg-[#FAF6F0] text-[#2C241E] border border-[#E8DFD8] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#8A4F23]" /> Sửa giá
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/cashier-pos')}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    Bán dịch vụ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
              <span className="text-xs font-bold text-[#73675F]">Lọc số buổi:</span>
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
                      {pkg.description || 'Liệu trình dẫn lưu hệ bạch huyết chuẩn y khoa Dr. Vodder.'}
                    </p>

                    {/* Pricing Block */}
                    <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EFE4D9] mb-4 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-[#73675F]">Giá trọn gói:</span>
                        <span className="text-xl font-black text-[#985018]">
                          {formatVND(pkg.price)}đ
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DFD8]/60">
                        <span className="text-[#73675F]">Đơn giá mỗi buổi:</span>
                        <span className="font-bold text-[#2C241E]">
                          {formatVND(perSession)}đ / buổi
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#73675F]">
                        <span>Hạn bảo lưu:</span>
                        <span className="font-semibold text-[#2C241E]">{pkg.validity_months} tháng</span>
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
                      onClick={() => navigate(`/cashier-pos?packageId=${pkg.id}`)}
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#985018] hover:bg-[#854412] text-white transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      Bán gói này
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
                Vui lòng thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc số buổi.
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
              Cập nhật giá bán sẽ tự động đồng bộ tức thì lên hệ thống POS và Mobile App.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Tên {editingItem.type === 'service' ? 'dịch vụ' : 'gói liệu trình'}:
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
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
                      setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-3 pr-12 py-2 text-sm font-bold border border-[#E8DFD8] rounded-xl bg-white text-[#985018] focus:border-[#985018] focus:outline-none shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C7A6B]">VNĐ</span>
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
                        setEditingItem({ ...editingItem, sessions: parseInt(e.target.value) || 10 })
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
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
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
