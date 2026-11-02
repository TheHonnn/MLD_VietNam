import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  Phone,
  MapPin,
  Calendar,
  Clock,
  User,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  HeartHandshake,
  MessageCircle,
} from 'lucide-react';
import { exportElementToPdf } from '../utils/pdfExport';
import { supabase } from '../services/supabaseClient';

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface JournalData {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  treatmentStartTime?: string | null;
  treatmentEndTime?: string | null;
  conditionBefore?: string | null;
  conditionAfter?: string | null;
  treatmentNotes?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  specialistAdvice?: string | null;
  customerSignatureUrl?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  technician?: {
    id: string;
    fullName: string;
    title?: string | null;
  } | null;
  package?: {
    id: string;
    name: string;
    totalSessions?: number;
    completedSessions?: number;
  } | null;
  branch?: {
    id: string;
    name: string;
    address?: string | null;
    district?: string | null;
    city?: string | null;
    hotline?: string | null;
  } | null;
  roomName?: string | null;
}

export const PublicTreatmentJournal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [journal, setJournal] = useState<JournalData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadJournal() {
      if (!token) {
        setErrorMsg('Liên kết nhật ký không hợp lệ.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        let loadedData: JournalData | null = null;
        const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
        if (apiBase && !apiBase.includes('127.0.0.1') && !apiBase.includes('localhost')) {
          try {
            const response = await fetch(`${apiBase}/treatment/shared-journal/${encodeURIComponent(token)}`);
            const payload = await response.json().catch(() => null);
            if (response.ok && payload?.data) {
              loadedData = payload.data as JournalData;
            }
          } catch (_) {}
        }

        if (!loadedData) {
          const tokenHash = await sha256Hex(token);
          const { data: row, error } = await supabase
            .from('treatment_journal')
            .select(`
              *,
              customer:users!customer_id(id, full_name, phone, avatar_url),
              technician:technicians!technician_id(id, full_name, title),
              booking:bookings!booking_id(branch_id, booking_code, branches(id, name, address, phone))
            `)
            .eq('share_token_hash', tokenHash)
            .gt('share_expires_at', new Date().toISOString())
            .is('share_revoked_at', null)
            .maybeSingle();

          if (error || !row) {
            throw new Error('Liên kết nhật ký không hợp lệ, đã bị thu hồi hoặc đã hết hạn.');
          }

          const beforePhotos = Array.isArray(row.before_photos)
            ? row.before_photos
            : (typeof row.before_photos === 'string' && row.before_photos ? [row.before_photos] : []);
          const afterPhotos = Array.isArray(row.after_photos)
            ? row.after_photos
            : (typeof row.after_photos === 'string' && row.after_photos ? [row.after_photos] : []);

          loadedData = {
            id: row.id,
            sessionNumber: Number(row.session_number || 1),
            sessionDate: row.session_date || new Date(row.created_at).toISOString().slice(0, 10),
            treatmentStartTime: row.treatment_start_time,
            treatmentEndTime: row.treatment_end_time,
            conditionBefore: row.condition_before,
            conditionAfter: row.condition_after,
            treatmentNotes: row.treatment_notes,
            beforePhotos,
            afterPhotos,
            specialistAdvice: row.specialist_advice,
            customerSignatureUrl: row.customer_signature_url,
            createdAt: row.created_at,
            customer: row.customer ? {
              id: row.customer.id,
              fullName: row.customer.full_name || 'Khách hàng',
              phone: row.customer.phone,
              avatarUrl: row.customer.avatar_url,
            } : null,
            technician: row.technician ? {
              id: row.technician.id,
              fullName: row.technician.full_name || 'Kỹ thuật viên MLD',
              title: row.technician.title || 'Chuyên viên Trị liệu MLD',
            } : null,
            package: {
              id: row.user_package_id || 'pkg-default',
              name: 'Liệu trình Trị liệu Dẫn lưu bạch huyết MLD',
              totalSessions: 10,
              completedSessions: Number(row.session_number || 1),
            },
            branch: row.booking?.branches ? {
              id: row.booking.branches.id,
              name: row.booking.branches.name,
              address: row.booking.branches.address,
              hotline: row.booking.branches.phone || '1900 6868',
            } : {
              id: 'aaaaaaaa-0001-0001-0001-000000000001',
              name: 'Trụ sở Viện MLD Việt Nam',
              address: 'Số 260 Bùi Xương Trạch, Khương Đình, Hà Nội',
              hotline: '1900 6868',
            },
          };
        }

        if (isMounted && loadedData) {
          setJournal(loadedData);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Lỗi khi tải thông tin nhật ký.');
          setIsLoading(false);
        }
      }
    }

    loadJournal();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Mask phone number for public privacy (e.g., 0912345678 -> 0912 ••• 678)
  const maskPhone = (phone?: string | null) => {
    if (!phone) return '—';
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 8) return clean;
    return `${clean.slice(0, 4)} ••• ${clean.slice(-3)}`;
  };

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: `Nhật ký điều trị MLD - Buổi ${journal?.sessionNumber || 1}`,
      text: `Phiếu theo dõi chăm sóc & nhật ký trị liệu MLD Vietnam của ${journal?.customer?.fullName || 'Khách hàng'}.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadPdf = async () => {
    if (!journal) return;
    setIsExportingPdf(true);
    try {
      const fileName = `MLD_Nhat_Ky_Dieu_Tri_Buoi_${journal.sessionNumber}_${journal.customer?.fullName ? journal.customer.fullName.replace(/\s+/g, '_') : 'KH'}`;
      await exportElementToPdf('treatment-journal-printable', {
        fileName,
        orientation: 'portrait',
        format: 'a4',
        scale: 2.5,
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      // Fallback to browser print
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-[#4A3B32]">
        <div className="w-12 h-12 border-3 border-[#EFE4D9] border-t-[#8A4F23] rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-bold text-[#2C241E]">Đang tải hồ sơ nhật ký điều trị MLD...</h3>
        <p className="text-xs text-[#8A796B] mt-1">Hệ thống hồ sơ y khoa & chăm sóc da MLD Vietnam</p>
      </div>
    );
  }

  if (errorMsg || !journal) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-[#4A3B32]">
        <div className="w-16 h-16 bg-[#FFF4EB] border border-[#FAD8C3] rounded-2xl flex items-center justify-center text-[#C05621] mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-[#2C241E] text-center">Không tìm thấy hồ sơ</h2>
        <p className="text-xs text-[#8A796B] max-w-sm text-center mt-2">
          {errorMsg || 'Đường link nhật ký điều trị này không tồn tại hoặc đã bị gỡ khỏi hệ thống.'}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <a
            href="tel:19006868"
            className="px-4 py-2 bg-[#8A4F23] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" /> Hotline 1900 6868
          </a>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-[#EFE4D9] bg-white text-[#73675F] text-xs font-semibold rounded-xl hover:bg-[#FAF8F5]"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4ECE3] text-[#2C241E] pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. STICKY TOP TOOLBAR (Hidden in print) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EFE4D9] shadow-xs px-4 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="MLD Vietnam" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-xs font-extrabold text-[#3E200C] leading-none tracking-tight">
                MLD VIETNAM
              </div>
              <div className="text-[10px] text-[#8A796B] mt-0.5 font-medium hidden sm:block">
                Hệ thống Viện Trị liệu & Đào tạo Thẩm mỹ Y khoa
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3ECE4] border border-[#EFE4D9] rounded-xl text-xs font-semibold text-[#695A4E] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sao chép link gửi cho khách hàng"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-[#2E7D32]" /> : <Copy className="w-3.5 h-3.5 text-[#8A4F23]" />}
              <span className="hidden sm:inline">{isCopied ? 'Đã chép link' : 'Chép link'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3ECE4] border border-[#EFE4D9] rounded-xl text-xs font-semibold text-[#695A4E] flex items-center gap-1.5 transition-all cursor-pointer sm:hidden"
              title="Chia sẻ"
            >
              <Share2 className="w-3.5 h-3.5 text-[#8A4F23]" />
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-[#8A4F23] hover:bg-[#723F1A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải PDF / In</span>
                </>
              )}
            </button>

            <a
              href="tel:19006868"
              className="px-3 py-1.5 bg-[#2E7D32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold hidden md:flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>1900 6868</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. MAIN DOCUMENT CONTAINER */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-5">
        <div
          id="treatment-journal-printable"
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8DFD8] shadow-sm p-5 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none"
        >
          {/* HEADER BRANDING */}
          <div className="pb-5 border-b border-[#EFE4D9] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="MLD Vietnam" className="w-14 h-14 object-contain" />
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#3E200C] tracking-tight uppercase">
                  MLD VIETNAM MEDICAL HEALTHCARE & SPA
                </h1>
                <p className="text-[11px] text-[#8A796B] font-medium leading-relaxed">
                  Viện Trị liệu Dưỡng sinh Y khoa & Đào tạo Thẩm mỹ Chuẩn Quốc tế
                </p>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10.5px] text-[#695A4E] mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#8A4F23]" />
                    {journal.branch?.name || 'Trụ sở MLD Việt Nam'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#2E7D32]">
                    <Phone className="w-3 h-3" />
                    Hotline: {journal.branch?.hotline || '1900 6868'}
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:text-right bg-[#FDFBF7] p-2.5 sm:p-3 rounded-xl border border-[#EFE4D9] shrink-0">
              <div className="text-[10px] font-bold text-[#8A796B] uppercase tracking-wider">Mã chứng từ hồ sơ</div>
              <div className="text-sm font-black text-[#8A4F23] font-mono mt-0.5">
                PK-DT-{journal.id.slice(-6).toUpperCase()}
              </div>
              <div className="text-[10px] text-[#695A4E] mt-1">
                Ngày thực hiện: <strong className="text-[#2C241E]">{journal.sessionDate}</strong>
              </div>
            </div>
          </div>

          {/* DOCUMENT TITLE & SESSION BADGE */}
          <div className="text-center py-2 space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF0E6] text-[#8A4F23] border border-[#EADAC9]">
              <Sparkles className="w-3.5 h-3.5" />
              BUỔI TRỊ LIỆU {String(journal.sessionNumber).padStart(2, '0')}
              {journal.package?.totalSessions ? ` / ${journal.package.totalSessions} BUỔI` : ''}
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-[#2C241E] tracking-tight uppercase">
              PHIẾU THEO DÕI NHẬT KÝ ĐIỀU TRỊ SPA
            </h2>
            <p className="text-xs text-[#73675F] max-w-lg mx-auto">
              Hồ sơ lâm sàng ghi nhận tình trạng, kết quả buổi chăm sóc và phác đồ phục hồi chuyên sâu MLD.
            </p>
          </div>

          {/* GRID 1: THÔNG TIN KHÁCH HÀNG & BUỔI ĐIỀU TRỊ */}
          <div className="bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] p-4 sm:p-5">
            <div className="text-xs font-extrabold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4" /> 1. Thông tin khách hàng & Buổi thực hiện
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <div className="space-y-0.5">
                <span className="text-[#8A796B] text-[11px] block">Khách hàng</span>
                <span className="font-bold text-[#2C241E] text-sm">
                  {journal.customer?.fullName || 'Khách hàng vãng lai'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#8A796B] text-[11px] block">Số điện thoại</span>
                <span className="font-bold text-[#2C241E]">
                  {maskPhone(journal.customer?.phone)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#8A796B] text-[11px] block">Gói liệu trình</span>
                <span className="font-bold text-[#8A4F23]">
                  {journal.package?.name || 'Gói liệu trình chăm sóc chuyên sâu'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#8A796B] text-[11px] block">Thời gian trị liệu</span>
                <span className="font-semibold text-[#2C241E] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8A4F23]" />
                  {journal.treatmentStartTime ? journal.treatmentStartTime.slice(0, 5) : '09:00'}
                  {journal.treatmentEndTime ? ` – ${journal.treatmentEndTime.slice(0, 5)}` : ' – 10:30'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#8A796B] text-[11px] block">Chuyên viên phụ trách</span>
                <span className="font-bold text-[#2C241E]">
                  {journal.technician?.fullName || 'Chuyên viên kỹ thuật MLD'}
                </span>
                {journal.technician?.title && (
                  <span className="text-[10px] text-[#73675F] block">{journal.technician.title}</span>
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-[#8A796B] text-[11px] block">Phòng trị liệu</span>
                <span className="font-semibold text-[#2C241E]">
                  {journal.roomName || 'Phòng Trị Liệu Tiêu Chuẩn VIP'}
                </span>
              </div>
            </div>
          </div>

          {/* GRID 2: DIỄN BIẾN LÂM SÀNG & NỘI DUNG ĐIỀU TRỊ */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-[#8A4F23] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" /> 2. Diễn biến lâm sàng & Quy trình thực hiện
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tình trạng trước điều trị */}
              <div className="bg-[#FFF8F2] border border-[#F6E1D3] rounded-2xl p-4 space-y-1.5">
                <div className="text-[11px] font-bold text-[#A7541D] uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#A7541D]" /> Trước buổi trị liệu
                </div>
                <p className="text-xs text-[#4A3B32] leading-relaxed whitespace-pre-line">
                  {journal.conditionBefore || 'Da khô sần, cơ vùng cổ vai gáy căng cứng, vi tuần hoàn kém.'}
                </p>
              </div>

              {/* Nội dung thực hiện */}
              <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl p-4 space-y-1.5 md:col-span-1">
                <div className="text-[11px] font-bold text-[#2B3A42] uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#8A4F23]" /> Phác đồ thực hiện
                </div>
                <p className="text-xs text-[#4A3B32] leading-relaxed whitespace-pre-line">
                  {journal.treatmentNotes || 'Thực hiện kỹ thuật lưu dẫn hệ bạch huyết Vodder, giải cơ chuyên sâu, đắp mặt nạ phục hồi sinh học.'}
                </p>
              </div>

              {/* Tình trạng sau điều trị */}
              <div className="bg-[#F2F8F4] border border-[#D3EADB] rounded-2xl p-4 space-y-1.5">
                <div className="text-[11px] font-bold text-[#23683E] uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#23683E]" /> Sau buổi trị liệu
                </div>
                <p className="text-xs text-[#4A3B32] leading-relaxed whitespace-pre-line">
                  {journal.conditionAfter || 'Cơ vai gáy mềm rõ rệt, da ngậm nước căng bóng, giảm căng thẳng 85%.'}
                </p>
              </div>
            </div>
          </div>

          {/* GRID 3: ĐỐI CHIẾU HÌNH ẢNH TRƯỚC VÀ SAU (BEFORE & AFTER) */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-[#8A4F23] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 3. Đối chiếu hình ảnh minh chứng thực tế
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cột Trước */}
              <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#A7541D] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#A7541D]" /> ẢNH TRƯỚC TRỊ LIỆU
                  </span>
                  <span className="text-[10px] font-semibold text-[#8A796B]">
                    {journal.beforePhotos.length} ảnh
                  </span>
                </div>

                {journal.beforePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {journal.beforePhotos.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedPhoto(url)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-[#E8DFD8] bg-white group cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Trước trị liệu ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                          Xem to
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-[#DFD5CB] bg-white/60 flex flex-col items-center justify-center text-[#8C7A6B] text-xs">
                    <span className="text-[11px]">Chưa đính kèm ảnh trước</span>
                  </div>
                )}
              </div>

              {/* Cột Sau */}
              <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#23683E] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#23683E]" /> ẢNH SAU TRỊ LIỆU
                  </span>
                  <span className="text-[10px] font-semibold text-[#8A796B]">
                    {journal.afterPhotos.length} ảnh
                  </span>
                </div>

                {journal.afterPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {journal.afterPhotos.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedPhoto(url)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-[#E8DFD8] bg-white group cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Sau trị liệu ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                          Xem to
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-[#DFD5CB] bg-white/60 flex flex-col items-center justify-center text-[#8C7A6B] text-xs">
                    <span className="text-[11px]">Chưa đính kèm ảnh sau</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GRID 4: LỜI DẶN DÒ CỦA CHUYÊN VIÊN CHĂM SÓC TẠI NHÀ */}
          <div className="bg-[#F6F9F5] border border-[#DDE8DA] rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="text-xs font-extrabold text-[#23683E] uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[#2E7D32]" /> 4. Lời dặn chuyên viên chăm sóc tại nhà
            </div>
            <p className="text-xs text-[#2E4233] leading-relaxed whitespace-pre-line font-medium">
              {journal.specialistAdvice ||
                '1. Uống tối thiểu 1.5L - 2L nước ấm trong ngày để hỗ trợ hệ bạch huyết đào thải độc tố.\n2. Tránh tắm nước quá nóng hoặc dùng xà phòng tẩy rửa mạnh trong 6 giờ đầu.\n3. Duy trì bôi kem phục hồi ẩm và chống nắng kỹ trước khi ra ngoài.\n4. Đặt lịch tái khám hoặc thực hiện buổi kế tiếp sau 3-5 ngày để tối ưu hiệu quả liệu trình.'}
            </p>
          </div>

          {/* GRID 5: XÁC NHẬN CHỮ KÝ ĐÔI BÊN */}
          <div className="pt-4 border-t border-[#EFE4D9] grid grid-cols-2 gap-6 text-center text-xs">
            <div className="space-y-2">
              <div className="font-bold text-[#695A4E] uppercase tracking-wider text-[11px]">
                Đại diện Chuyên viên MLD
              </div>
              <div className="h-20 flex flex-col items-center justify-center">
                <div className="px-3 py-1.5 rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ĐÃ XÁC THỰC Y KHOA
                </div>
                <span className="text-[11px] font-bold text-[#2C241E] mt-1">
                  {journal.technician?.fullName || 'Chuyên viên kỹ thuật'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-[#695A4E] uppercase tracking-wider text-[11px]">
                Khách hàng xác nhận
              </div>
              <div className="h-20 flex flex-col items-center justify-center">
                {journal.customerSignatureUrl ? (
                  <img
                    src={journal.customerSignatureUrl}
                    alt="Chữ ký khách hàng"
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="px-3 py-1.5 rounded-lg border border-[#EADAC9] bg-[#FAF8F5] text-[#8A4F23] text-[10px] font-semibold">
                    Đã đồng thuận phác đồ
                  </div>
                )}
                <span className="text-[11px] font-bold text-[#2C241E] mt-1">
                  {journal.customer?.fullName || 'Khách hàng'}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER NOTICE */}
          <div className="pt-4 border-t border-[#F5EDE5] text-center text-[10.5px] text-[#8A796B] space-y-1">
            <p>
              Tài liệu được trích xuất từ Hệ thống Quản trị Y khoa & Trị liệu MLD Vietnam. Mọi thông tin được bảo mật theo tiêu chuẩn y tế.
            </p>
            <p className="font-semibold text-[#8A4F23]">
              Tổng đài tư vấn & CSKH: 1900 6868 · Website: mldvietnam.vn · Email: cskh@mldvietnam.vn
            </p>
          </div>
        </div>
      </main>

      {/* 3. LIGHTBOX IMAGE PREVIEW MODAL */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <img src={selectedPhoto} alt="Minh chứng chi tiết" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white px-3 py-1 rounded-full text-xs font-bold"
            >
              Đóng [X]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

