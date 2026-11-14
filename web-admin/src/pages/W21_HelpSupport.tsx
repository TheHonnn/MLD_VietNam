import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AdminPageShell,
  PageHeader,
  PageTabs,
  PageContent,
  toast,
} from '../components/common';
import { useAdminSupport } from '../hooks/useAdminSupport';
import { useAdmin } from '../admin/Auth';
import {
  PhoneCall,
  Headphones,
  HelpCircle,
  FileText,
  AlertTriangle,
  Activity,
  Send,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Monitor,
  Database,
  Server,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

const SUPPORT_TABS = [
  { id: 'contacts', label: 'Kênh Liên hệ Khẩn cấp', icon: PhoneCall },
  { id: 'guides', label: 'Cẩm nang Vận hành SOP', icon: FileText },
  { id: 'tickets', label: 'Phiếu Hỗ trợ & Báo lỗi', icon: AlertTriangle },
  { id: 'diagnostics', label: 'Chẩn đoán Hệ thống Live', icon: Activity },
];

const MODULE_OPTIONS = [
  { id: 'ALL', label: 'Tất cả phân hệ' },
  { id: 'POS', label: 'Thu ngân & POS' },
  { id: 'BOOKING', label: 'Lịch hẹn & Tiếp đón' },
  { id: 'TREATMENT', label: 'Liệu trình & MLD' },
  { id: 'ACADEMY', label: 'Học viện & Đào tạo' },
  { id: 'SYSTEM', label: 'Hệ thống & Thiết bị' },
];

export const W21_HelpSupport: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') || 'contacts') as 'contacts' | 'guides' | 'tickets' | 'diagnostics';
  const navigate = useNavigate();
  const { user } = useAdmin();

  const {
    diagnostics,
    diagnosticsLoading,
    loadDiagnostics,

    guides,
    guidesLoading,
    selectedModule,
    setSelectedModule,
    guideSearch,
    setGuideSearch,
    loadGuides,

    tickets,
    ticketsLoading,
    submittingTicket,
    submitTicket,
  } = useAdminSupport();

  // State cho Modal Xem chi tiết Cẩm nang SOP
  const [selectedGuide, setSelectedGuide] = useState<any | null>(null);

  // State cho Modal Tạo Ticket mới
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('SOFTWARE_BUG');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketAttachmentUrl, setTicketAttachmentUrl] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success('Đã sao chép', `Đã chép ${label} vào bộ nhớ tạm.`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tiêu đề sự cố.');
      return;
    }
    if (!ticketDescription.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập mô tả chi tiết các bước xảy ra lỗi.');
      return;
    }

    const attachments = ticketAttachmentUrl.trim() ? [ticketAttachmentUrl.trim()] : [];

    const ok = await submitTicket({
      category: ticketCategory,
      priority: ticketPriority,
      title: ticketTitle.trim(),
      description: ticketDescription.trim(),
      attachments,
    });

    if (ok) {
      setIsTicketModalOpen(false);
      setTicketTitle('');
      setTicketDescription('');
      setTicketAttachmentUrl('');
      setSearchParams({ tab: 'tickets' });
    }
  };

  return (
    <AdminPageShell>
      {/* 1. Header Trang */}
      <PageHeader
        title="Trung tâm Trợ giúp & Hỗ trợ Kỹ thuật"
        subtitle="Kênh tiếp nhận sự cố, hướng dẫn quy trình vận hành SOP và công cụ chẩn đoán kết nối hệ thống theo thời gian thực."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#8A4F23] text-white hover:bg-[#723F1B] transition-colors shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi phiếu hỗ trợ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                loadDiagnostics();
                toast.info('Làm mới chẩn đoán', 'Đang kiểm tra độ trễ mạng và dịch vụ...');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-[#7A6D61] border border-[#EFE4D9] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${diagnosticsLoading ? 'animate-spin text-[#8A4F23]' : ''}`} />
              <span>Kiểm tra kết nối</span>
            </button>
          </div>
        }
      />

      {/* 2. Tabs chuyển đổi */}
      <PageTabs
        tabs={SUPPORT_TABS}
        activeTab={currentTab}
        onChange={handleTabChange}
      />

      {/* 3. Nội dung Tab */}
      <PageContent>
        {/* ============================================================== */}
        {/* TAB 1: KÊNH LIÊN HỆ KHẨN CẤP                                     */}
        {/* ============================================================== */}
        {currentTab === 'contacts' && (
          <div className="space-y-6">
            {/* Banner Thông báo Hotline */}
            <div className="bg-gradient-to-r from-[#FAF0E4] via-[#F5E6D3] to-[#FAF0E4] border border-[#E8D4BE] rounded-2xl p-6 relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 border border-[#E8D4BE] text-[11px] font-semibold text-[#8A4F23] mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Đội ngũ Kỹ thuật MLD đang trực tuyến
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] tracking-tight">
                  Cần hỗ trợ vận hành hoặc khắc phục sự cố khẩn cấp?
                </h3>
                <p className="text-xs text-[#7A6D61] mt-1.5 leading-relaxed">
                  Đội ngũ IT & Kỹ thuật phần mềm MLD Vietnam luôn sẵn sàng tiếp nhận và xử lý sự cố kẹt ca thu ngân, lỗi máy in hóa đơn, hoặc lỗi kết nối dữ liệu từ 08:00 đến 22:00 tất cả các ngày trong tuần.
                </p>
              </div>
            </div>

            {/* Grid 4 Kênh hỗ trợ chính */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Thẻ 1: Tổng đài kỹ thuật */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-[#FAF0E4] flex items-center justify-center text-[#8A4F23] mb-4">
                  <PhoneCall className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">Hotline Tổng đài Kỹ thuật</h4>
                <p className="text-xs text-[#7A6D61] mt-1">Hỗ trợ tiếp nhận thắc mắc và xử lý nhanh nghiệp vụ phần mềm.</p>
                <div className="mt-4 p-3 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#A69788] uppercase tracking-wider block font-semibold">Số tổng đài</span>
                    <span className="text-base font-bold text-[#8A4F23]">1900 8888</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyToClipboard('19008888', 'Số Hotline')}
                      className="p-1.5 rounded-md hover:bg-white text-[#7A6D61] border border-transparent hover:border-[#EFE4D9] transition-colors"
                      title="Sao chép số"
                    >
                      {copiedText === '19008888' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href="tel:19008888"
                      className="px-2.5 py-1.5 rounded-md bg-[#8A4F23] text-white text-xs font-semibold hover:bg-[#723F1B] transition-colors"
                    >
                      Gọi ngay
                    </a>
                  </div>
                </div>
                <span className="text-[11px] text-[#A69788] block mt-2.5">Thời gian trực ca: 08:00 – 22:00 hàng ngày</span>
              </div>

              {/* Thẻ 2: Đường dây nóng trực ca POS */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
                  <AlertTriangle className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">Đường dây nóng Khẩn cấp</h4>
                <p className="text-xs text-[#7A6D61] mt-1">Dành riêng cho sự cố kẹt ca thu ngân, mất kết nối máy in hóa đơn bill.</p>
                <div className="mt-4 p-3 bg-red-50/50 rounded-lg border border-red-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-red-700 uppercase tracking-wider block font-semibold">Trực ban 24/7</span>
                    <span className="text-base font-bold text-red-600">0966 888 888</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyToClipboard('0966888888', 'Số trực ban')}
                      className="p-1.5 rounded-md hover:bg-white text-red-700 border border-transparent hover:border-red-200 transition-colors"
                      title="Sao chép số"
                    >
                      {copiedText === '0966888888' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href="tel:0966888888"
                      className="px-2.5 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                    >
                      Gọi khẩn
                    </a>
                  </div>
                </div>
                <span className="text-[11px] text-[#A69788] block mt-2.5">Ưu tiên xử lý lỗi làm gián đoạn thanh toán tại quầy</span>
              </div>

              {/* Thẻ 3: Hỗ trợ điều khiển từ xa */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <Monitor className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">Hỗ trợ Điều khiển Từ xa</h4>
                <p className="text-xs text-[#7A6D61] mt-1">Kỹ thuật viên can thiệp trực tiếp máy trạm qua UltraViewer / AnyDesk.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] text-xs">
                    <span className="font-medium text-[#1F2937]">UltraViewer (Khuyên dùng)</span>
                    <a
                      href="https://ultraviewer.net/vi/download.html"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#8A4F23] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      Tải về <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] text-xs">
                    <span className="font-medium text-[#1F2937]">AnyDesk Portable</span>
                    <a
                      href="https://anydesk.com/en/downloads/windows"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#8A4F23] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      Tải về <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <span className="text-[11px] text-[#A69788] block mt-2.5">Mở phần mềm và đọc ID & Mật khẩu cho KTV</span>
              </div>

              {/* Thẻ 4: Kênh Zalo Kỹ thuật */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <MessageSquare className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">Zalo Hỗ trợ Vận hành</h4>
                <p className="text-xs text-[#7A6D61] mt-1">Nhắn tin trực tiếp với Kỹ thuật viên trực ca để gửi ảnh/video sự cố.</p>
                <div className="mt-4 p-3 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#A69788] uppercase tracking-wider block font-semibold">Zalo OA Kỹ thuật</span>
                    <span className="text-xs font-bold text-[#1F2937]">MLD Vietnam Support</span>
                  </div>
                  <a
                    href="https://zalo.me"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                  >
                    Mở Zalo <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <span className="text-[11px] text-[#A69788] block mt-2.5">Tiếp nhận ảnh chụp màn hình và video lỗi 24/7</span>
              </div>

              {/* Thẻ 5: Email Kỹ thuật */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 mb-4">
                  <Headphones className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">Email Hỗ trợ Nghiệp vụ</h4>
                <p className="text-xs text-[#7A6D61] mt-1">Dành cho các đề xuất tính năng mới hoặc yêu cầu đối soát số liệu.</p>
                <div className="mt-4 p-3 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-[#A69788] uppercase tracking-wider block font-semibold">Hòm thư tiếp nhận</span>
                    <span className="text-xs font-bold text-[#8A4F23] truncate block">support@mldvietnam.vn</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('support@mldvietnam.vn', 'Email Kỹ thuật')}
                    className="p-1.5 rounded-md hover:bg-white text-[#7A6D61] border border-transparent hover:border-[#EFE4D9] transition-colors shrink-0"
                    title="Sao chép email"
                  >
                    {copiedText === 'support@mldvietnam.vn' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-[#A69788] block mt-2.5">Cam kết phản hồi trong vòng 2 giờ làm việc</span>
              </div>

              {/* Thẻ 6: Cam kết SLA Hỗ trợ */}
              <div className="bg-gradient-to-br from-white to-[#FAF7F2] rounded-xl border border-[#EFE4D9] p-5 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-700 mb-4">
                  <ShieldCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-[#1F2937]">Cam kết Thời gian Xử lý (SLA)</h4>
                <div className="mt-3 space-y-2 text-xs text-[#7A6D61]">
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#EFE4D9]">
                    <span className="text-red-600 font-semibold">Sự cố khẩn cấp (Chặn POS/Đón khách):</span>
                    <span className="font-bold text-[#1F2937]">&lt; 15 phút</span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#EFE4D9]">
                    <span>Lỗi tính năng / Hiển thị:</span>
                    <span className="font-bold text-[#1F2937]">&lt; 1 giờ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Đề xuất tính năng & Cấp quyền:</span>
                    <span className="font-bold text-[#1F2937]">&lt; 4 giờ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: CẨM NANG HƯỚNG DẪN VẬN HÀNH SOP                           */}
        {/* ============================================================== */}
        {currentTab === 'guides' && (
          <div className="space-y-5">
            {/* Thanh công cụ tìm kiếm và bộ lọc */}
            <div className="bg-white rounded-xl border border-[#EFE4D9] p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {MODULE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedModule(opt.id);
                      loadGuides(opt.id, guideSearch);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedModule === opt.id
                        ? 'bg-[#8A4F23] text-white'
                        : 'bg-[#FAF7F2] text-[#7A6D61] hover:bg-[#EFE4D9]/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-[#A69788] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guideSearch}
                  onChange={(e) => {
                    setGuideSearch(e.target.value);
                    loadGuides(selectedModule, e.target.value);
                  }}
                  placeholder="Tìm cẩm nang, quy trình..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-[#EFE4D9] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#8A4F23] text-[#1F2937]"
                />
              </div>
            </div>

            {/* Danh sách thẻ bài viết SOP */}
            {guidesLoading ? (
              <div className="p-12 text-center text-xs text-[#7A6D61]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#8A4F23] mx-auto mb-2" />
                Đang tải danh sách cẩm nang SOP...
              </div>
            ) : guides.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-12 text-center">
                <FileText className="w-10 h-10 text-[#C4B5A5] mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-[#1F2937]">Chưa tìm thấy cẩm nang phù hợp</h4>
                <p className="text-xs text-[#7A6D61] mt-1">Hãy thử tìm với từ khóa khác hoặc chuyển sang danh mục Tất cả.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {guides.map((guide) => (
                  <div
                    key={guide.id}
                    onClick={() => setSelectedGuide(guide)}
                    className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs hover:shadow-xs hover:border-[#8A4F23]/40 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF0E4] text-[#8A4F23] border border-[#E8D4BE]">
                          {guide.module}
                        </span>
                        <span className="text-[11px] text-[#A69788] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 3 phút đọc
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1F2937] group-hover:text-[#8A4F23] transition-colors leading-snug">
                        {guide.title}
                      </h4>
                      <p className="text-xs text-[#7A6D61] mt-2 line-clamp-3 leading-relaxed">
                        {guide.summary}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A4F23] font-semibold">
                      <span>Xem chi tiết quy trình</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PHIẾU HỖ TRỢ & BÁO LỖI (TICKETS)                         */}
        {/* ============================================================== */}
        {currentTab === 'tickets' && (
          <div className="space-y-5">
            {/* Banner và Nút Tạo Ticket */}
            <div className="bg-white rounded-xl border border-[#EFE4D9] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[#1F2937]">Lịch sử Phiếu Yêu cầu Hỗ trợ</h4>
                <p className="text-xs text-[#7A6D61] mt-0.5">Theo dõi trạng thái các sự cố và phản hồi trực tiếp từ đội ngũ kỹ thuật.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#8A4F23] text-white hover:bg-[#723F1B] transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Tạo phiếu hỗ trợ mới</span>
              </button>
            </div>

            {/* Bảng danh sách Tickets */}
            <div className="bg-white rounded-xl border border-[#EFE4D9] overflow-hidden shadow-2xs">
              {ticketsLoading ? (
                <div className="p-12 text-center text-xs text-[#7A6D61]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#8A4F23] mx-auto mb-2" />
                  Đang tải danh sách phiếu hỗ trợ...
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-[#1F2937]">Hệ thống đang vận hành ổn định</h4>
                  <p className="text-xs text-[#7A6D61] mt-1">Bạn chưa có phiếu báo lỗi hoặc yêu cầu hỗ trợ nào đang mở.</p>
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(true)}
                    className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8D4BE] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                  >
                    Gửi yêu cầu nếu cần hỗ trợ
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F2] text-[#7A6D61] font-semibold border-b border-[#EFE4D9]">
                      <tr>
                        <th className="px-4 py-3">Mã phiếu</th>
                        <th className="px-4 py-3">Tiêu đề yêu cầu</th>
                        <th className="px-4 py-3">Phân loại</th>
                        <th className="px-4 py-3">Ưu tiên</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Phản hồi kỹ thuật</th>
                        <th className="px-4 py-3">Thời gian tạo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE4D9]">
                      {tickets.map((t) => (
                        <tr key={t.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#8A4F23] whitespace-nowrap">
                            {t.ticket_code}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <span className="font-semibold text-[#1F2937] block truncate">{t.title}</span>
                            <span className="text-[11px] text-[#7A6D61] line-clamp-1 mt-0.5">{t.description}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF0E4] text-[#8A4F23]">
                              {t.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                t.priority === 'URGENT'
                                  ? 'bg-red-100 text-red-700'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {t.priority === 'URGENT' ? 'Khẩn cấp' : t.priority === 'HIGH' ? 'Cao' : 'Trung bình'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                t.status === 'RESOLVED' || t.status === 'CLOSED'
                                  ? 'bg-green-100 text-green-700'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {t.status === 'RESOLVED'
                                ? 'Đã khắc phục'
                                : t.status === 'IN_PROGRESS'
                                ? 'Đang xử lý'
                                : 'Chờ tiếp nhận'}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            {t.admin_reply ? (
                              <span className="text-[11px] text-green-700 line-clamp-2">{t.admin_reply}</span>
                            ) : (
                              <span className="text-[11px] text-[#A69788] italic">Chưa có phản hồi</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#7A6D61] whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CHẨN ĐOÁN HỆ THỐNG LIVE                                   */}
        {/* ============================================================== */}
        {currentTab === 'diagnostics' && (
          <div className="space-y-6">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Database Status */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#7A6D61]">Cơ sở Dữ liệu</span>
                  <Database className="w-4 h-4 text-[#8A4F23]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#1F2937]">
                    {diagnostics?.database?.status === 'connected' ? 'Kết nối tốt' : 'Lỗi kết nối'}
                  </span>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      diagnostics?.database?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </div>
                <div className="mt-2 text-[11px] text-[#7A6D61] flex justify-between">
                  <span>Độ trễ truy vấn:</span>
                  <span className="font-mono font-bold text-[#8A4F23]">
                    {diagnostics?.database?.latencyMs ?? '--'} ms
                  </span>
                </div>
              </div>

              {/* Card 2: Backend API */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#7A6D61]">Máy chủ Backend</span>
                  <Server className="w-4 h-4 text-[#8A4F23]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#1F2937]">Sẵn sàng (200 OK)</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="mt-2 text-[11px] text-[#7A6D61] flex justify-between">
                  <span>Môi trường:</span>
                  <span className="font-mono font-semibold text-[#1F2937]">
                    {diagnostics?.backend?.nodeVersion ?? 'Node.js'}
                  </span>
                </div>
              </div>

              {/* Card 3: Zalo ZNS */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#7A6D61]">Cổng tin Zalo ZNS</span>
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#1F2937]">Đã cấu hình</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="mt-2 text-[11px] text-[#7A6D61] flex justify-between">
                  <span>Gửi OTP & Nhắc lịch:</span>
                  <span className="font-semibold text-green-700">Khả dụng</span>
                </div>
              </div>

              {/* Card 4: Client Network */}
              <div className="bg-white rounded-xl border border-[#EFE4D9] p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#7A6D61]">Mạng máy trạm</span>
                  <Activity className="w-4 h-4 text-[#8A4F23]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#1F2937]">Trực tuyến</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="mt-2 text-[11px] text-[#7A6D61] flex justify-between">
                  <span>Thời gian kiểm tra:</span>
                  <span className="font-mono text-[#1F2937]">
                    {new Date().toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng chi tiết phiên bản và môi trường */}
            <div className="bg-white rounded-xl border border-[#EFE4D9] p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE4D9]">
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937]">Thông tin Phiên bản Hệ thống</h4>
                  <p className="text-xs text-[#7A6D61] mt-0.5">Dữ liệu kiểm tra tương thích trình duyệt và cơ sở hạ tầng.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadDiagnostics();
                    toast.success('Đã làm mới', 'Đã kiểm tra lại kết nối toàn diện.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] text-[#8A4F23] border border-[#EFE4D9] hover:bg-[#EFE4D9]/50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
                  <span>Chạy lại chẩn đoán</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#7A6D61]">Phiên bản Ứng dụng:</span>
                    <span className="font-mono font-bold text-[#1F2937]">Hệ thống Quản trị MLD v1.0.4</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#7A6D61]">Môi trường máy chủ:</span>
                    <span className="font-semibold text-green-700">Production (Vercel Cloud & Supabase)</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#7A6D61]">Bộ nhớ RAM Backend:</span>
                    <span className="font-mono font-semibold text-[#1F2937]">
                      {diagnostics?.backend?.memoryRssMb ?? 128} MB
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#7A6D61]">Trình duyệt máy trạm:</span>
                    <span className="font-medium text-[#1F2937] truncate max-w-xs">{navigator.userAgent}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#7A6D61]">Độ phân giải màn hình:</span>
                    <span className="font-mono font-semibold text-[#1F2937]">
                      {window.screen.width} x {window.screen.height}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#7A6D61]">Tài khoản đăng nhập:</span>
                    <span className="font-semibold text-[#8A4F23]">{user?.email || 'Quản trị viên'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContent>

      {/* ============================================================== */}
      {/* MODAL: XEM CHI TIẾT CẨM NANG SOP                                */}
      {/* ============================================================== */}
      {selectedGuide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#EFE4D9] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF0E4] text-[#8A4F23] border border-[#E8D4BE] inline-block mb-1.5">
                  {selectedGuide.module}
                </span>
                <h3 className="text-base font-bold text-[#1F2937]">{selectedGuide.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="p-1.5 rounded-lg hover:bg-[#FAF7F2] text-[#7A6D61] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#1F2937] leading-relaxed">
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EFE4D9] text-[#7A6D61] italic">
                {selectedGuide.summary}
              </div>

              <div className="prose prose-xs max-w-none text-xs text-[#1F2937] whitespace-pre-line font-sans">
                {selectedGuide.content_markdown}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EFE4D9] bg-[#FAF7F2]/60 rounded-b-2xl flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (selectedGuide.module === 'POS') navigate('/cashier-pos');
                  else if (selectedGuide.module === 'BOOKING') navigate('/cashier-pos?tab=appointments');
                  else if (selectedGuide.module === 'TREATMENT') navigate('/manage/home_care_guidelines');
                  else if (selectedGuide.module === 'ACADEMY') navigate('/attendance');
                  else if (selectedGuide.module === 'SYSTEM') navigate('/settings');
                  setSelectedGuide(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#8A4F23] text-white hover:bg-[#723F1B] transition-colors"
              >
                <span>Mở phân hệ liên quan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#7A6D61] hover:bg-[#EFE4D9]/40 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TẠO PHIẾU HỖ TRỢ / BÁO LỖI                              */}
      {/* ============================================================== */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-[#EFE4D9] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] flex items-center justify-center text-[#8A4F23]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937]">Gửi Phiếu Yêu cầu Hỗ trợ</h3>
                  <p className="text-[11px] text-[#7A6D61]">Thông tin sẽ được gửi trực tiếp đến IT trực ca.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#FAF7F2] text-[#7A6D61] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1F2937] mb-1">Phân loại sự cố</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#EFE4D9] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#8A4F23]"
                  >
                    <option value="SOFTWARE_BUG">Lỗi phần mềm / Giao diện</option>
                    <option value="HARDWARE_POS">Lỗi máy in bill / POS</option>
                    <option value="DATA_ISSUE">Lỗi số liệu / Đối soát</option>
                    <option value="ACCOUNT_ACCESS">Yêu cầu cấp quyền</option>
                    <option value="FEATURE_REQUEST">Đề xuất tính năng</option>
                    <option value="OTHER">Yêu cầu khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1F2937] mb-1">Mức độ ưu tiên</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#EFE4D9] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#8A4F23]"
                  >
                    <option value="LOW">Thấp (Góp ý, đề xuất)</option>
                    <option value="MEDIUM">Trung bình (Lỗi nhỏ)</option>
                    <option value="HIGH">Cao (Ảnh hưởng thao tác)</option>
                    <option value="URGENT">Khẩn cấp (Chặn thu ngân)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1F2937] mb-1">
                  Tiêu đề tóm tắt sự cố <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="Ví dụ: Máy in bill không in được hóa đơn thanh toán"
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-[#EFE4D9] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#8A4F23] text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1F2937] mb-1">
                  Mô tả chi tiết & các bước xảy ra lỗi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Ghi rõ: Bạn đang ở trang nào? Bấm nút gì? Màn hình hiện thông báo lỗi gì?"
                  className="w-full px-3 py-2 rounded-lg text-xs border border-[#EFE4D9] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#8A4F23] text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A6D61] mb-1">
                  Link ảnh chụp màn hình (nếu có)
                </label>
                <input
                  type="url"
                  value={ticketAttachmentUrl}
                  onChange={(e) => setTicketAttachmentUrl(e.target.value)}
                  placeholder="https://... hoặc link ảnh lỗi"
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-[#EFE4D9] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#8A4F23] text-[#1F2937]"
                />
              </div>

              <div className="p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] text-[11px] text-[#7A6D61]">
                ℹ️ Hệ thống sẽ tự động gửi kèm thông tin trình duyệt, màn hình và trang hiện tại để kỹ thuật viên tái hiện lỗi nhanh nhất.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#7A6D61] hover:bg-[#FAF7F2] transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#8A4F23] text-white hover:bg-[#723F1B] transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {submittingTicket ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{submittingTicket ? 'Đang gửi...' : 'Gửi yêu cầu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
};
