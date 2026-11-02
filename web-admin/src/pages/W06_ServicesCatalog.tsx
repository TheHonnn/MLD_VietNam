import React, { useState, useEffect, useRef } from 'react';
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
  DollarSign,
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
  BadgePercent,
  FileText,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { toast } from '../components/common';
import { useNavigate } from 'react-router-dom';

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
  const [activeTab, setActiveTab] = useState<'matrix' | 'services' | 'packages'>('matrix');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<TreatmentPackageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [sessionFilter, setSessionFilter] = useState<'ALL' | '10' | '20' | '30'>('ALL');
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

      if (srvRes.data) {
        setServices(srvRes.data);
      }
      if (pkgRes.data) {
        setPackages(pkgRes.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải bảng giá:', err);
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
        const { error } = await supabase
          .from('services')
          .update({
            price: editingItem.price,
            discount_price: editingItem.price,
            name: editingItem.name,
            duration_minutes: editingItem.duration,
            full_description: editingItem.description,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success(`Đã cập nhật dịch vụ "${editingItem.name}" thành công!`);
      } else {
        const { error } = await supabase
          .from('treatment_packages')
          .update({
            price: editingItem.price,
            discount_price: editingItem.price,
            name: editingItem.name,
            total_sessions: editingItem.sessions,
            validity_months: editingItem.validityMonths,
            description: editingItem.description,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
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
  const filteredPackages = packages.filter((p) => {
    if (sessionFilter === 'ALL') return true;
    return p.total_sessions === parseInt(sessionFilter);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
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
            background: #fbf7ee !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner / Navigation */}
      <div className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Chuẩn Dr. Vodder Quốc Tế
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  VAT 8% Niêm Yết
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                Bảng Giá & Gói Liệu Trình MLD Việt Nam
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                3 Chương trình chăm sóc hệ bạch huyết sâu và nông • Đồng bộ dữ liệu xuyên suốt Admin, POS & Mobile App
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                title="In mẫu bảng giá tờ rơi"
              >
                <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>In bảng giá</span>
              </button>

              <button
                onClick={handleCopyPricing}
                className="px-3.5 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                title="Sao chép văn bản gửi Zalo/Facebook"
              >
                {copySuccess ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                )}
                <span>{copySuccess ? 'Đã sao chép!' : 'Gửi Zalo'}</span>
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                title="Tải lại dữ liệu từ Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
              </button>

              <button
                onClick={() => navigate('/cashier-pos')}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-all shadow-sm hover:shadow"
              >
                <DollarSign className="w-4 h-4" />
                <span>Mở Thu Ngân POS</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 gap-6">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'matrix'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Bảng Giá Niêm Yết Chuẩn (Pricing Matrix)
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'services'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              3 Chương Trình Chăm Sóc Buổi Lẻ
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'packages'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              9 Gói Liệu Trình Trị Liệu (10 / 20 / 30 Buổi)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* TAB 1: PRICING MATRIX (Exact Flyer Replica) */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            {/* Context Notice */}
            <div className="no-print bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Bản sao chuẩn xác của bảng giá tờ rơi MLD Vietnam
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                    Các con số in đậm màu xanh dương là các gói được khách hàng lựa chọn nhiều nhất. Bạn có thể nhấn trực tiếp vào biểu tượng bút chì để chỉnh sửa nhanh giá bán niêm yết.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate('/manage/treatment_packages')}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                >
                  Xem bảng CSDL <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* THE PRICING MATRIX FLYER CARD */}
            <div
              id="mld-pricing-matrix-sheet"
              ref={printRef}
              className="bg-[#fbf7ee] text-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-amber-900/20 max-w-5xl mx-auto"
            >
              {/* Flyer Header Banner */}
              <div className="relative bg-[#1c1a17] text-white py-12 px-8 sm:px-12 overflow-hidden border-b-2 border-amber-700/40">
                {/* Background decorative spa image overlay */}
                <div
                  className="absolute inset-0 opacity-35 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1c1a17] via-[#241e17]/85 to-[#1c1a17]/70" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  {/* Brand & Subtitle */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 p-0.5 shadow-lg flex items-center justify-center shrink-0">
                      <div className="w-full h-full bg-[#1c1a17] rounded-[14px] flex flex-col items-center justify-center p-1">
                        <Sparkles className="w-7 h-7 text-amber-400" />
                        <span className="text-[9px] font-black tracking-widest text-amber-300">MLD</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                          VIETNAM ACADEMY & CLINICAL SPA
                        </span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5 uppercase">
                        BẢNG GIÁ DỊCH VỤ
                      </h2>
                      <p className="text-sm font-semibold tracking-widest text-amber-200/90 uppercase mt-0.5">
                        PRICING • CHUẨN Y KHOA DR. VODDER
                      </p>
                    </div>
                  </div>

                  {/* Badge Guarantee */}
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Chuẩn hóa Quốc tế
                    </span>
                    <span className="text-xs text-amber-200/70 mt-1">
                      Hệ bạch huyết Sâu & Nông
                    </span>
                  </div>
                </div>
              </div>

              {/* Flyer Body Matrix Table */}
              <div className="p-6 sm:p-10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        {/* Column 1 Header */}
                        <th className="w-1/4 pb-6 pr-4 align-top">
                          <div className="border-l-4 border-[#783c1d] pl-3 py-1">
                            <h3 className="text-base sm:text-lg font-black text-[#783c1d] uppercase tracking-wide leading-tight">
                              3 CHƯƠNG TRÌNH
                              <br />
                              CHĂM SÓC
                            </h3>
                            <p className="text-xs text-[#8c5a3c] font-medium mt-1 leading-relaxed">
                              (Bao gồm chăm sóc cả hệ bạch huyết sâu và hệ bạch huyết nông)
                            </p>
                          </div>
                        </th>

                        {/* Column 2 Header: Chăm sóc khu trú (45') */}
                        <th className="w-1/4 pb-6 px-3 text-center align-top">
                          <div className="bg-[#6b3519] text-white py-2.5 px-3 rounded-full shadow-md">
                            <span className="text-xs sm:text-sm font-black tracking-wide block uppercase">
                              CHĂM SÓC
                            </span>
                            <span className="text-xs sm:text-sm font-black tracking-wide block uppercase">
                              KHU TRÚ (45')
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1.5 block">Vùng can thiệp tập trung</span>
                        </th>

                        {/* Column 3 Header: Chăm sóc mở rộng (60') */}
                        <th className="w-1/4 pb-6 px-3 text-center align-top">
                          <div className="bg-[#6b3519] text-white py-2.5 px-3 rounded-full shadow-md">
                            <span className="text-xs sm:text-sm font-black tracking-wide block uppercase">
                              CHĂM SÓC
                            </span>
                            <span className="text-xs sm:text-sm font-black tracking-wide block uppercase">
                              MỞ RỘNG (60')
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1.5 block">Nhiều vùng liên kết</span>
                        </th>

                        {/* Column 4 Header: Chăm sóc toàn diện (90') */}
                        <th className="w-1/4 pb-6 pl-3 text-center align-top">
                          <div className="bg-[#6b3519] text-white py-2.5 px-3 rounded-full shadow-md">
                            <span className="text-xs sm:text-sm font-black tracking-wide block uppercase">
                              CHĂM SÓC
                            </span>
                            <span className="text-xs sm:text-sm font-black tracking-wide block uppercase">
                              TOÀN DIỆN (90')
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1.5 block">Toàn thân & nội tạng</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-amber-900/15 text-slate-800">
                      {/* Row 1: Giá buổi lẻ */}
                      <tr className="hover:bg-amber-100/50 transition-colors">
                        <td className="py-4 pr-4 font-semibold text-slate-800 text-sm sm:text-base">
                          Giá buổi lẻ
                        </td>
                        <td className="py-4 px-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                          <div className="flex items-center justify-center gap-1 group">
                            <span>{formatVND(serviceKhuTru.price)}</span>
                            <button
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
                              className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                              title="Chỉnh sửa giá"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                          <div className="flex items-center justify-center gap-1 group">
                            <span>{formatVND(serviceMoRong.price)}</span>
                            <button
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
                              className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                              title="Chỉnh sửa giá"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 pl-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                          <div className="flex items-center justify-center gap-1 group">
                            <span>{formatVND(serviceToanDien.price)}</span>
                            <button
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
                              className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                              title="Chỉnh sửa giá"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Row 2: Giá liệu trình 10 buổi */}
                      <tr className="hover:bg-amber-100/50 transition-colors">
                        <td className="py-4 pr-4 font-semibold text-slate-800 text-sm sm:text-base">
                          Giá liệu trình 10 buổi
                          <span className="block text-[11px] text-slate-500 font-normal">Hạn dùng 3 tháng</span>
                        </td>
                        {/* 10 buổi khu trú: 4.800.000 (Bold Blue) */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-extrabold text-[#0055b8] text-lg sm:text-xl tracking-tight">
                              {formatVND(pkgKhuTru10?.price || 4800000)}
                            </span>
                            {pkgKhuTru10 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 200k
                          </span>
                        </td>

                        {/* 10 buổi mở rộng: 8.600.000 (Bold Blue) */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-extrabold text-[#0055b8] text-lg sm:text-xl tracking-tight">
                              {formatVND(pkgMoRong10?.price || 8600000)}
                            </span>
                            {pkgMoRong10 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 400k
                          </span>
                        </td>

                        {/* 10 buổi toàn diện: 16.200.000 (Bold Blue) */}
                        <td className="py-4 pl-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-extrabold text-[#0055b8] text-lg sm:text-xl tracking-tight">
                              {formatVND(pkgToanDien10?.price || 16200000)}
                            </span>
                            {pkgToanDien10 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 800k
                          </span>
                        </td>
                      </tr>

                      {/* Row 3: Giá liệu trình 20 buổi */}
                      <tr className="hover:bg-amber-100/50 transition-colors">
                        <td className="py-4 pr-4 font-semibold text-slate-800 text-sm sm:text-base">
                          Giá liệu trình 20 buổi
                          <span className="block text-[11px] text-slate-500 font-normal">Hạn dùng 6 tháng</span>
                        </td>

                        {/* 20 buổi khu trú: 9.200.000 */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-bold text-slate-900 text-base sm:text-lg">
                              {formatVND(pkgKhuTru20?.price || 9200000)}
                            </span>
                            {pkgKhuTru20 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 800k
                          </span>
                        </td>

                        {/* 20 buổi mở rộng: 16.400.000 */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-bold text-slate-900 text-base sm:text-lg">
                              {formatVND(pkgMoRong20?.price || 16400000)}
                            </span>
                            {pkgMoRong20 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 1.6M
                          </span>
                        </td>

                        {/* 20 buổi toàn diện: 30.800.000 (Bold Blue) */}
                        <td className="py-4 pl-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-extrabold text-[#0055b8] text-lg sm:text-xl tracking-tight">
                              {formatVND(pkgToanDien20?.price || 30800000)}
                            </span>
                            {pkgToanDien20 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 3.2M
                          </span>
                        </td>
                      </tr>

                      {/* Row 4: Giá liệu trình 30 buổi */}
                      <tr className="hover:bg-amber-100/50 transition-colors">
                        <td className="py-4 pr-4 font-semibold text-slate-800 text-sm sm:text-base">
                          Giá liệu trình 30 buổi
                          <span className="block text-[11px] text-slate-500 font-normal">Hạn dùng 12 tháng</span>
                        </td>

                        {/* 30 buổi khu trú: 13.200.000 */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-bold text-slate-900 text-base sm:text-lg">
                              {formatVND(pkgKhuTru30?.price || 13200000)}
                            </span>
                            {pkgKhuTru30 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 1.8M
                          </span>
                        </td>

                        {/* 30 buổi mở rộng: 23.400.000 (Bold Blue) */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-extrabold text-[#0055b8] text-lg sm:text-xl tracking-tight">
                              {formatVND(pkgMoRong30?.price || 23400000)}
                            </span>
                            {pkgMoRong30 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 3.6M
                          </span>
                        </td>

                        {/* 30 buổi toàn diện: 43.800.000 */}
                        <td className="py-4 pl-3 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <span className="font-bold text-slate-900 text-base sm:text-lg">
                              {formatVND(pkgToanDien30?.price || 43800000)}
                            </span>
                            {pkgToanDien30 && (
                              <button
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
                                className="no-print opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200/60 rounded text-slate-500 hover:text-amber-800 transition-opacity"
                                title="Chỉnh sửa giá gói"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Tiết kiệm 7.2M
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Notice matching the flyer */}
                <div className="mt-8 pt-6 border-t border-amber-900/15">
                  <div className="border-l-4 border-[#783c1d] pl-4 py-1 text-slate-700 text-xs sm:text-sm leading-relaxed">
                    <p>
                      <strong className="text-slate-900 font-bold">Đơn vị: VNĐ.</strong> Giá dịch vụ{' '}
                      <strong className="text-slate-900 font-bold">đã bao gồm thuế VAT 8%</strong> theo quy định áp dụng.
                      Phạm vi chăm sóc và số buổi đề xuất dựa trên kết quả đánh giá chuyên môn, tình trạng sức khỏe và
                      mục tiêu theo dõi của từng khách hàng. Khách hàng{' '}
                      <strong className="text-slate-900 font-bold">
                        được giải thích và đồng thuận với kế hoạch trước khi thực hiện.
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Consultation CTA */}
            <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Tư vấn phác đồ điều trị cá nhân hóa
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Gợi ý gói 10 - 20 - 30 buổi phù hợp theo mức độ phù nề và giai đoạn phục hồi của từng khách hàng.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/medical-records')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Hồ sơ phác đồ MLD
                </button>
                <button
                  onClick={() => navigate('/cashier-pos')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Tạo đơn bán gói
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 3 CORE SERVICES DETAIL CARDS */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Chăm sóc khu trú (45') */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80"
                    alt="Chăm sóc khu trú"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#6b3519] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    45 PHÚT
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-md shadow">
                    VAT 8%
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Chăm sóc khu trú (45')
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    Tập trung vào vùng chỉ định (mặt, cổ vai gáy, hoặc chi dưới) nhằm giải tỏa ứ trệ và giảm sưng nề nhanh.
                  </p>

                  <div className="mb-4">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Giá niêm yết (Buổi lẻ)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatVND(serviceKhuTru.price)}
                      </span>
                      <span className="text-xs text-slate-500">VNĐ / buổi</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2 mb-5 flex-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Điểm nổi bật:
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Kích hoạt cả hệ bạch huyết nông và sâu vùng can thiệp</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Giảm sưng đau, phù nề tức thì sau điều trị</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Thích hợp chăm sóc vùng sau phẫu thuật</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
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
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Sửa giá
                    </button>
                    <button
                      onClick={() => navigate('/cashier-pos')}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      Bán dịch vụ
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Chăm sóc mở rộng (60') */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-500/50 dark:border-amber-500/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col relative">
                <div className="absolute top-2 right-2 z-10 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow">
                  Phổ biến nhất
                </div>

                <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80"
                    alt="Chăm sóc mở rộng"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#6b3519] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    60 PHÚT
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-md shadow">
                    VAT 8%
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Chăm sóc mở rộng (60')
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    Bao quát phạm vi liên kết rộng hơn trên cơ thể, giúp kích hoạt đồng bộ cả hệ bạch huyết sâu và nông liên vùng.
                  </p>

                  <div className="mb-4">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Giá niêm yết (Buổi lẻ)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {formatVND(serviceMoRong.price)}
                      </span>
                      <span className="text-xs text-slate-500">VNĐ / buổi</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2 mb-5 flex-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Điểm nổi bật:
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Đả thông dòng chảy bạch huyết đa tầng sâu - nông</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Tối ưu tiêu sưng nề và bầm tím diện rộng</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Củng cố hệ miễn dịch tự nhiên của cơ thể</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
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
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Sửa giá
                    </button>
                    <button
                      onClick={() => navigate('/cashier-pos')}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      Bán dịch vụ
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Chăm sóc toàn diện (90') */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                    alt="Chăm sóc toàn diện"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#6b3519] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    90 PHÚT
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-md shadow">
                    VAT 8%
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Chăm sóc toàn diện (90')
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    Phác đồ đỉnh cao dẫn lưu tuần tự trên toàn bộ mạch bạch huyết và trạm hạch toàn thân từ gốc đến ngọn.
                  </p>

                  <div className="mb-4">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Giá niêm yết (Buổi lẻ)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatVND(serviceToanDien.price)}
                      </span>
                      <span className="text-xs text-slate-500">VNĐ / buổi</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2 mb-5 flex-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Điểm nổi bật:
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Dẫn lưu toàn bộ trạm hạch chính: cổ, nách, bụng, bẹn</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Kết nối tuần hoàn nông dưới da & bạch huyết nội tạng</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Hồi sinh năng lượng, thải độc tế bào cấp độ sâu nhất</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
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
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Sửa giá
                    </button>
                    <button
                      onClick={() => navigate('/cashier-pos')}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      Bán dịch vụ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 9 TREATMENT PACKAGES LIST */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Lọc theo số buổi:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setSessionFilter('ALL')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      sessionFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Tất cả (9 gói)
                  </button>
                  <button
                    onClick={() => setSessionFilter('10')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      sessionFilter === '10'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    10 buổi
                  </button>
                  <button
                    onClick={() => setSessionFilter('20')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      sessionFilter === '20'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    20 buổi
                  </button>
                  <button
                    onClick={() => setSessionFilter('30')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      sessionFilter === '30'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    30 buổi
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Đang hiển thị <strong>{filteredPackages.length}</strong> / {packages.length} gói liệu trình
              </div>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all ${
                      isRecommended
                        ? 'border-blue-400 dark:border-blue-700 ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {pkg.total_sessions} BUỔI
                        </span>

                        {isRecommended && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Đề xuất cao
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        {pkg.name}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                        {pkg.description}
                      </p>

                      {/* Pricing block */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl mb-4 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Trọn gói:</span>
                          <span className="text-xl font-extrabold text-[#0055b8] dark:text-blue-400">
                            {formatVND(pkg.price)} VNĐ
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span>Đơn giá mỗi buổi:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatVND(perSession)} VNĐ / buổi
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Hạn bảo lưu:</span>
                          <span>{pkg.validity_months} tháng</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
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
                        className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa giá
                      </button>
                      <button
                        onClick={() => navigate('/cashier-pos')}
                        className="flex-1 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        Bán gói này
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* QUICK EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" />
              Chỉnh Sửa Giá Niêm Yết
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Cập nhật giá bán sẽ tự động đồng bộ tức thì lên hệ thống POS và Mobile App.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên {editingItem.type === 'service' ? 'dịch vụ' : 'gói liệu trình'}
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Giá niêm yết (VNĐ - Đã bao gồm VAT 8%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-3 pr-12 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">VNĐ</span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
                  Định dạng: {formatVND(editingItem.price)} VNĐ
                </span>
              </div>

              {editingItem.type === 'package' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tổng số buổi
                    </label>
                    <input
                      type="number"
                      value={editingItem.sessions || 10}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, sessions: parseInt(e.target.value) || 10 })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hạn dùng (tháng)
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
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả / Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm flex items-center gap-1.5"
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
