// MLD Healthcare & Academy - W18 Portal Content Management & Automated Email Channel
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Mail,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Trash2,
  Pencil,
  Eye,
  Upload,
  Clipboard,
  X,
  Loader2,
  Download,
  BookOpen,
  Share2,
  Send,
  Lock,
  Unlock,
  Check,
  ChevronUp,
  ChevronDown,
  Star,
  Layers,
  ArrowUpDown,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react';
import { portalService, emailService } from '../services';
import {
  PortalContentItem,
  PortalContentKind,
  PortalContentStatus,
  DocumentAccessLevel,
  EmailTemplate,
  EmailLog,
} from '../types/shared_types';
import { toast } from '../components/common';

// ==========================================
// UPLOAD IMAGE COMPONENT (16:9 BANNER & THUMBNAIL)
// ==========================================
interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: '16:9' | '4:3' | '1:1';
  label?: string;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  aspectRatio = '16:9',
  label = 'Ảnh đại diện / Banner',
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageBlob = async (blob: Blob, nameHint = 'portal_img.png') => {
    const ext = nameHint.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'png';
    const cleanFileName = `portal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
    const KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

    let targetBucket = 'services';
    let res = await fetch(`${SUPABASE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': blob.type || 'image/png',
      },
      body: blob,
    });

    if (!res.ok) {
      targetBucket = 'avatars';
      res = await fetch(`${SUPABASE_URL}/storage/v1/object/${targetBucket}/${cleanFileName}`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': blob.type || 'image/png',
        },
        body: blob,
      });
    }

    if (!res.ok) throw new Error('Không thể tải ảnh lên Supabase Storage.');
    return `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${cleanFileName}`;
  };

  const handleProcessFile = async (file: File | Blob, nameHint?: string) => {
    setUploading(true);
    try {
      const publicUrl = await uploadImageBlob(file, nameHint || (file as File).name);
      onChange(publicUrl);
      toast.success('Tải ảnh thành công', 'Ảnh đã được lưu lên đám mây.');
    } catch (err: any) {
      toast.error('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleProcessFile(file, `pasted_${Date.now()}.${item.type.split('/')[1] || 'png'}`);
          return;
        }
      }
    }
  };

  const handlePasteButtonClick = async () => {
    if (!navigator.clipboard) {
      toast.warning('Bộ nhớ tạm', 'Nhấn Ctrl+V vào ô nhập để dán ảnh!');
      return;
    }
    try {
      setUploading(true);
      if (navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const imgType = item.types.find((t) => t.startsWith('image/'));
            if (imgType) {
              const blob = await item.getType(imgType);
              const url = await uploadImageBlob(blob, `pasted_${Date.now()}.${imgType.split('/')[1] || 'png'}`);
              onChange(url);
              setUploading(false);
              toast.success('Dán ảnh thành công', 'Đã lưu ảnh từ bộ nhớ tạm.');
              return;
            }
          }
        } catch {}
      }
      const text = await navigator.clipboard.readText();
      const trimmed = text ? text.trim() : '';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
        onChange(trimmed);
        setUploading(false);
        toast.success('Dán link thành công', 'Đã lưu đường dẫn ảnh.');
        return;
      }
      toast.warning('Không tìm thấy ảnh', 'Hãy sao chép ảnh hoặc chụp màn hình rồi bấm lại!');
    } catch {
      toast.warning('Bộ nhớ tạm', 'Nhấn phím Ctrl+V vào ô nhập link!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
          await handleProcessFile(files[0]);
        }
      }}
      className={`space-y-2 p-3 rounded-xl border transition-all ${
        isDragging ? 'bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/20' : 'bg-[#FAF8F5] border-[#E8DFD8]'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file);
        }}
      />
      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Preview box */}
        <div
          className={`relative w-full sm:w-44 ${
            aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'
          } rounded-xl overflow-hidden bg-white border border-[#E8DFD8] shrink-0 flex items-center justify-center group`}
        >
          {uploading ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF0E4] text-[#985018] gap-1 p-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#985018]" />
              <span className="text-[10px] font-bold">Đang tải ảnh...</span>
            </div>
          ) : value ? (
            <>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => onChange('')}
                title="Gỡ ảnh này"
                className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 size={15} />
                <span className="text-[9px] font-semibold mt-1">Gỡ ảnh</span>
              </button>
            </>
          ) : (
            <div className="w-full h-full bg-[#FAF0E4]/60 text-[#985018] flex flex-col items-center justify-center border border-dashed border-[#BA7E4C]/40 p-2 text-center">
              <ImageIcon className="w-6 h-6 stroke-[1.8] text-[#985018]" />
              <span className="text-[10px] font-bold text-[#8A4F23] mt-1">Chưa có ảnh</span>
              <span className="text-[9px] text-[#8C7A6B]">{aspectRatio}</span>
            </div>
          )}
        </div>

        {/* Input & Actions */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={value || ''}
              placeholder="Dán link ảnh (URL) hoặc nhấn Ctrl+V..."
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white text-[#2C241E] focus:outline-none focus:border-[#985018]"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-2 rounded-lg text-[#8C7A6B] hover:text-[#DC2626] hover:bg-white border border-[#E8DFD8]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#985018] text-white hover:bg-[#804213] cursor-pointer transition-colors shadow-2xs"
            >
              <Upload size={13} />
              <span>Tải từ máy</span>
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={handlePasteButtonClick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#985018] border border-[#BA7E4C]/40 hover:bg-[#FAF0E4] cursor-pointer transition-colors shadow-2xs"
            >
              <Clipboard size={13} />
              <span>Dán bộ nhớ tạm (Ctrl+V)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN PAGE COMPONENT: W18_PortalContent
// ==========================================
export const W18_PortalContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'documents' | 'community' | 'email'>('banners');
  const [isLoading, setIsLoading] = useState(true);

  // Content States
  const [banners, setBanners] = useState<PortalContentItem[]>([]);
  const [documents, setDocuments] = useState<PortalContentItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<PortalContentItem[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [accessFilter, setAccessFilter] = useState('ALL');

  // Modals
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<PortalContentItem> | null>(null);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<PortalContentItem> | null>(null);

  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<PortalContentItem | null>(null);

  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [selectedTemplateForTest, setSelectedTemplateForTest] = useState<EmailTemplate | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState('hocvien@gmail.com');
  const [testRecipientName, setTestRecipientName] = useState('Học viên MLD');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Load All Portal & Email Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bannerRes, docRes, commRes, tplRes, logRes] = await Promise.all([
        portalService.getContentList({ kind: 'BANNER' }),
        portalService.getContentList({ kind: 'DOCUMENT' }),
        portalService.getContentList({ kind: 'COMMUNITY' }),
        emailService.getTemplates(),
        emailService.getLogs(),
      ]);

      if (bannerRes.success && bannerRes.data) setBanners(bannerRes.data);
      if (docRes.success && docRes.data) setDocuments(docRes.data);
      if (commRes.success && commRes.data) setCommunityPosts(commRes.data);
      if (tplRes.success && tplRes.data) setEmailTemplates(tplRes.data);
      if (logRes.success && logRes.data) setEmailLogs(logRes.data);
    } catch (err) {
      console.error('Error loading portal content:', err);
      toast.error('Lỗi tải dữ liệu', 'Không thể kết nối đến cơ sở dữ liệu Portal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick stats
  const activeBannersCount = banners.filter((b) => b.status === 'PUBLISHED' || b.status === 'APPROVED').length;
  const totalDownloads = documents.reduce((sum, d) => sum + (d.downloadCount || 0), 0);
  const pendingPostsCount = communityPosts.filter((p) => p.status === 'PENDING').length;
  const totalEmailsSent = emailLogs.filter((l) => l.status === 'SENT').length;

  // ==========================================
  // HANDLERS: BANNER
  // ==========================================
  const handleOpenAddBanner = () => {
    setEditingBanner({
      kind: 'BANNER',
      title: '',
      summary: '',
      imageUrl: '',
      targetLink: '/academy',
      sortOrder: banners.length + 1,
      category: 'DAO_TAO',
      status: 'PUBLISHED',
      isFeatured: true,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title?.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tiêu đề chiến dịch Banner.');
      return;
    }

    try {
      if (editingBanner.id) {
        await portalService.updateContent(editingBanner.id, editingBanner);
        toast.success('Thành công', 'Đã cập nhật thông tin Banner.');
      } else {
        await portalService.createContent(editingBanner);
        toast.success('Thành công', 'Đã thêm Banner mới lên hệ thống.');
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      loadData();
    } catch {
      toast.error('Lỗi', 'Không thể lưu Banner vào lúc này.');
    }
  };

  const handleToggleBannerStatus = async (banner: PortalContentItem) => {
    const nextStatus: PortalContentStatus =
      banner.status === 'PUBLISHED' || banner.status === 'APPROVED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await portalService.setStatus(banner.id, nextStatus);
      toast.success(
        'Đã đổi trạng thái',
        `Banner "${banner.title}" đã chuyển sang: ${nextStatus === 'PUBLISHED' ? 'Hiển thị' : 'Tạm ẩn'}.`
      );
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, status: nextStatus } : b)));
    } catch {
      toast.error('Lỗi', 'Không thể đổi trạng thái Banner.');
    }
  };

  const handleDeleteBanner = async (id: string, title: string) => {
    if (!window.confirm(`Xác nhận xóa Banner "${title}" khỏi hệ thống?`)) return;
    try {
      await portalService.deleteContent(id);
      toast.success('Đã xóa', `Đã xóa Banner "${title}".`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Lỗi', 'Không thể xóa Banner.');
    }
  };

  // ==========================================
  // HANDLERS: DOCUMENTS (GIÁO TRÌNH PDF)
  // ==========================================
  const handleOpenAddDoc = () => {
    setEditingDoc({
      kind: 'DOCUMENT',
      title: '',
      summary: '',
      contentText: '',
      imageUrl: '',
      fileUrl: '',
      targetLink: '',
      category: 'GIAI_PHAU',
      accessLevel: 'MEMBERS_ONLY',
      status: 'PUBLISHED',
      isFeatured: false,
      authorName: 'Hội đồng Chuyên môn MLD',
      sortOrder: documents.length + 1,
    });
    setIsDocModalOpen(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.title?.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tên tài liệu giáo trình.');
      return;
    }

    try {
      if (editingDoc.id) {
        await portalService.updateContent(editingDoc.id, editingDoc);
        toast.success('Thành công', 'Đã cập nhật thông tin tài liệu PDF.');
      } else {
        await portalService.createContent(editingDoc);
        toast.success('Thành công', 'Đã đăng tài liệu mới lên thư viện.');
      }
      setIsDocModalOpen(false);
      setEditingDoc(null);
      loadData();
    } catch {
      toast.error('Lỗi', 'Không thể lưu tài liệu.');
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (!window.confirm(`Xác nhận xóa tài liệu "${title}"?`)) return;
    try {
      await portalService.deleteContent(id);
      toast.success('Đã xóa', `Đã xóa tài liệu "${title}".`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error('Lỗi', 'Không thể xóa tài liệu.');
    }
  };

  // ==========================================
  // HANDLERS: COMMUNITY POSTS
  // ==========================================
  const handleApprovePost = async (post: PortalContentItem) => {
    try {
      await portalService.setStatus(post.id, 'PUBLISHED');
      toast.success('Đã duyệt bài', `Bài viết "${post.title}" đã được hiển thị công khai trên ứng dụng.`);
      setCommunityPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: 'PUBLISHED' } : p)));
    } catch {
      toast.error('Lỗi', 'Không thể duyệt bài.');
    }
  };

  const handleRejectPost = async (post: PortalContentItem) => {
    try {
      await portalService.setStatus(post.id, 'REJECTED');
      toast.warning('Từ chối bài viết', `Đã chuyển bài viết "${post.title}" sang trạng thái từ chối.`);
      setCommunityPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: 'REJECTED' } : p)));
    } catch {
      toast.error('Lỗi', 'Không thể từ chối bài viết.');
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Xác nhận xóa bài viết "${title}"?`)) return;
    try {
      await portalService.deleteContent(id);
      toast.success('Đã xóa', 'Đã xóa bài viết khỏi diễn đàn cộng đồng.');
      setCommunityPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Lỗi', 'Không thể xóa bài viết.');
    }
  };

  // ==========================================
  // HANDLERS: EMAIL SENDING SIMULATOR
  // ==========================================
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateForTest) return;
    if (!testRecipientEmail.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập địa chỉ email người nhận.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const sampleVariables: Record<string, string> = {
        student_name: testRecipientName || 'Nguyễn Văn A',
        course_name: 'Khóa Chuyên gia Dẫn lưu Bạch huyết MLD Vodder Cấp độ 2',
        student_code: 'MLD-K15-089',
        start_date: '15/11/2026 lúc 08:30 sáng',
        branch_address: 'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
        paid_amount: '15.000.000',
        class_title: 'Thực hành băng ép đa lớp phù tay tại Phòng Lab VIP',
        time_slot: '14:00 - 17:00',
        study_date: 'Mai (27/10/2026)',
        room_name: 'Phòng Lab Thực hành 01',
        instructor_name: 'BS. CKI Lê Hoài An',
        expiry_date: '05/11/2026',
        theory_score: '96',
        practice_score: '92',
        certificate_code: 'MLD-GCN-2026-0889',
        issue_date: '26/10/2026',
        verification_url: 'https://mldvietnam.edu.vn/verify/MLD-GCN-2026-0889',
      };

      const res = await emailService.sendEmail({
        recipientEmail: testRecipientEmail,
        recipientName: testRecipientName,
        templateId: selectedTemplateForTest.id,
        variables: sampleVariables,
        metadata: { is_test: true, trigger_screen: 'W18_PortalContent' },
      });

      if (res.success) {
        toast.success('Gửi email thành công!', `Đã gửi mẫu "${selectedTemplateForTest.name}" tới ${testRecipientEmail}.`);
        setIsTestEmailModalOpen(false);
        const logRes = await emailService.getLogs();
        if (logRes.success && logRes.data) setEmailLogs(logRes.data);
      } else {
        toast.error('Lỗi gửi mail', res.message);
      }
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể gửi email thử nghiệm.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8DFD8] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#985018] mb-1">
            <Layers className="w-4 h-4" />
            <span>Hệ Thống & Truyền Thông Học Viện</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#2C241E]">
            Quản trị Nội dung Portal & Kênh Thông tin
          </h1>
          <p className="text-xs text-[#73675F] mt-1">
            Quản lý Banner trang chủ, Thư viện giáo trình PDF, Bài viết cộng đồng & Kênh Email đào tạo tự động
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] hover:bg-[#FAF8F5] transition-all cursor-pointer shadow-2xs"
            title="Tải lại dữ liệu"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'banners' && (
            <button
              type="button"
              onClick={handleOpenAddBanner}
              className="px-4 py-2.5 bg-[#985018] hover:bg-[#804213] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm Banner mới</span>
            </button>
          )}

          {activeTab === 'documents' && (
            <button
              type="button"
              onClick={handleOpenAddDoc}
              className="px-4 py-2.5 bg-[#985018] hover:bg-[#804213] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Đăng tải Giáo trình PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div
          onClick={() => setActiveTab('banners')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'banners'
              ? 'bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/15 shadow-sm'
              : 'bg-white border-[#E8DFD8] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">Banner Trang chủ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2C241E]">{banners.length}</span>
            <span className="text-xs font-semibold text-[#137333]">({activeBannersCount} đang hiển thị)</span>
          </div>
          <p className="text-[11px] text-[#8C7A6B] mt-1">Chuẩn tỉ lệ ngang 16:9 sắc nét</p>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => setActiveTab('documents')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/15 shadow-sm'
              : 'bg-white border-[#E8DFD8] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">Giáo trình & PDF</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2C241E]">{documents.length}</span>
            <span className="text-xs font-semibold text-[#0284c7]">({totalDownloads} lượt tải)</span>
          </div>
          <p className="text-[11px] text-[#8C7A6B] mt-1">Phân quyền học viên & đọc thử</p>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => setActiveTab('community')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'community'
              ? 'bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/15 shadow-sm'
              : 'bg-white border-[#E8DFD8] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">Cộng đồng & Hỏi đáp</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2C241E]">{communityPosts.length}</span>
            {pendingPostsCount > 0 ? (
              <span className="text-xs font-bold text-[#DC2626] bg-rose-50 px-2 py-0.5 rounded-full">
                {pendingPostsCount} chờ duyệt
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#137333]">Đã duyệt sạch</span>
            )}
          </div>
          <p className="text-[11px] text-[#8C7A6B] mt-1">Kiểm duyệt lâm sàng chuyên môn</p>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => setActiveTab('email')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'email'
              ? 'bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/15 shadow-sm'
              : 'bg-white border-[#E8DFD8] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">Kênh Email Đào tạo</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2C241E]">{emailTemplates.length}</span>
            <span className="text-xs font-semibold text-[#059669]">({totalEmailsSent} lượt gửi)</span>
          </div>
          <p className="text-[11px] text-[#8C7A6B] mt-1">Khai giảng, lịch học & chứng nhận</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD8] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'banners'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-[#73675F] hover:bg-[#FAF8F5] border border-[#E8DFD8]'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>1. Banner Trang Chủ ({banners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'documents'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-[#73675F] hover:bg-[#FAF8F5] border border-[#E8DFD8]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Thư viện Giáo trình PDF ({documents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'community'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-[#73675F] hover:bg-[#FAF8F5] border border-[#E8DFD8]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>3. Bài viết Cộng đồng ({communityPosts.length})</span>
          {pendingPostsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
              {pendingPostsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'email'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-[#73675F] hover:bg-[#FAF8F5] border border-[#E8DFD8]'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>4. Kênh Email Thông báo Đào tạo</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BANNERS TRANG CHỦ                                      */}
      {/* ============================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {banners.map((banner) => {
              const isLive = banner.status === 'PUBLISHED' || banner.status === 'APPROVED';
              return (
                <div
                  key={banner.id}
                  className="bg-white rounded-2xl border border-[#E8DFD8] overflow-hidden shadow-xs hover:border-[#BA7E4C] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* 16:9 Banner Image Preview */}
                    <div className="relative aspect-[16/9] bg-[#FAF8F5] overflow-hidden border-b border-[#E8DFD8]">
                      {banner.imageUrl ? (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#A69788]">
                          <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                          <span className="text-xs font-semibold mt-1">Chưa có ảnh banner</span>
                        </div>
                      )}

                      {/* Floating Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="bg-black/65 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono">
                          #{banner.sortOrder || 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-xs ${
                            isLive ? 'bg-emerald-600/90 text-white' : 'bg-neutral-800/80 text-neutral-300'
                          }`}
                        >
                          {isLive ? 'ĐANG HIỂN THỊ' : 'TẠM ẨN'}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DACB]">
                          {banner.category || 'DAO_TAO'}
                        </span>
                      </div>
                    </div>

                    {/* Banner Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-serif font-bold text-base text-[#2C241E] line-clamp-1">{banner.title}</h3>
                      <p className="text-xs text-[#73675F] line-clamp-2 leading-relaxed">
                        {banner.summary || 'Chương trình đào tạo và chăm sóc hệ bạch huyết chuẩn quốc tế MLD.'}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-[#8C7A6B]">
                        <span className="flex items-center gap-1 font-mono">
                          <ExternalLink className="w-3.5 h-3.5 text-[#985018]" />
                          <span className="truncate max-w-[200px]">{banner.targetLink || '/academy'}</span>
                        </span>
                        <span className="font-semibold text-[#554B42]">{banner.authorName || 'Ban Giám Đốc'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#E8DFD8] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleBannerStatus(banner)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isLive
                          ? 'bg-white border border-[#E8DFD8] text-[#73675F] hover:bg-neutral-100'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                    >
                      {isLive ? <Eye className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{isLive ? 'Tạm ẩn banner' : 'Bật hiển thị'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBanner({ ...banner });
                          setIsBannerModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] transition-colors cursor-pointer"
                        title="Chỉnh sửa Banner"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner.id, banner.title)}
                        className="p-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#8C7A6B] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                        title="Xóa Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {banners.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#D8C9BA] space-y-3">
              <ImageIcon className="w-10 h-10 text-[#A69788] mx-auto" />
              <p className="font-serif font-bold text-base text-[#2C241E]">Chưa có banner trang chủ nào</p>
              <button
                type="button"
                onClick={handleOpenAddBanner}
                className="px-4 py-2 bg-[#985018] text-white text-xs font-bold rounded-xl hover:bg-[#804213] cursor-pointer"
              >
                + Thêm Banner đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: THƯ VIỆN GIÁO TRÌNH & TÀI LIỆU PDF                      */}
      {/* ============================================================== */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#8C7A6B]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tài liệu, giáo trình giải phẫu, phác đồ..."
                className="w-full text-xs bg-transparent focus:outline-none placeholder:text-[#A69788]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                aria-label="Lọc theo phân quyền tài liệu"
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:outline-none font-medium cursor-pointer"
              >
                <option value="ALL">Tất cả phân quyền</option>
                <option value="MEMBERS_ONLY">Dành riêng học viên (Members Only)</option>
                <option value="FREE_TRIAL">Đọc thử miễn phí (Free Trial)</option>
                <option value="PUBLIC">Công khai (Public)</option>
              </select>

              <select
                aria-label="Lọc theo chuyên mục tài liệu"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-[#FAF8F5] focus:outline-none font-medium cursor-pointer"
              >
                <option value="ALL">Tất cả chuyên mục</option>
                <option value="GIAI_PHAU">Giải phẫu hệ mạch</option>
                <option value="LAM_SANG">Phác đồ lâm sàng</option>
                <option value="BANG_EP">Băng ép đa lớp</option>
                <option value="NGHIEN_CUU">Nghiên cứu khoa học</option>
              </select>
            </div>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents
              .filter((d) => {
                if (accessFilter !== 'ALL' && d.accessLevel !== accessFilter) return false;
                if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
                if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                return true;
              })
              .map((doc) => {
                const isMemberOnly = doc.accessLevel === 'MEMBERS_ONLY';
                const isFreeTrial = doc.accessLevel === 'FREE_TRIAL';

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-[#E8DFD8] p-4 flex flex-col justify-between shadow-xs hover:border-[#BA7E4C] transition-all group"
                  >
                    <div className="space-y-3">
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                              isMemberOnly
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : isFreeTrial
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {isMemberOnly ? <Lock size={10} /> : <Unlock size={10} />}
                            <span>
                              {isMemberOnly ? 'Học viên MLD' : isFreeTrial ? 'Đọc thử' : 'Công khai'}
                            </span>
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF0E4] text-[#8A4F23]">
                            {doc.category || 'GIÁO TRÌNH'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#2C241E] line-clamp-2 group-hover:text-[#985018] transition-colors">
                          {doc.title}
                        </h4>
                        <p className="text-xs text-[#73675F] mt-1.5 line-clamp-2 leading-relaxed">
                          {doc.summary || doc.contentText || 'Giáo trình đào tạo chuyên môn độc quyền từ Viện MLD.'}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="pt-2 border-t border-[#EFE4D9] flex items-center justify-between text-[11px] text-[#8C7A6B]">
                        <span className="font-medium">{doc.authorName || 'Hội đồng Chuyên môn'}</span>
                        <span className="flex items-center gap-1 text-[#0284c7] font-semibold">
                          <Download size={12} />
                          <span>{doc.downloadCount} lượt tải</span>
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 mt-3 border-t border-[#E8DFD8] flex items-center justify-between gap-2">
                      {doc.fileUrl || doc.targetLink ? (
                        <a
                          href={doc.fileUrl || doc.targetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#FAF0E4] text-[#985018] text-xs font-bold rounded-lg border border-[#E8DFD8] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Xem file PDF</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#A69788] italic">Chưa gắn link file</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc({ ...doc });
                            setIsDocModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] transition-colors cursor-pointer"
                          title="Sửa tài liệu"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                          className="p-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#8C7A6B] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BÀI VIẾT & HỎI ĐÁP CỘNG ĐỒNG                            */}
      {/* ============================================================== */}
      {activeTab === 'community' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] flex items-center justify-between gap-4 shadow-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#73675F]">Lọc trạng thái duyệt:</span>
              <div className="flex items-center gap-1.5">
                {['ALL', 'PENDING', 'PUBLISHED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#985018] text-white'
                        : 'bg-[#FAF8F5] text-[#73675F] hover:bg-[#FAF0E4] border border-[#E8DFD8]'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Tất cả'
                      : st === 'PENDING'
                      ? 'Chờ duyệt'
                      : st === 'PUBLISHED'
                      ? 'Đã duyệt'
                      : 'Đã từ chối'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-[#8C7A6B]">
              Hiển thị <strong>{communityPosts.length}</strong> bài viết chia sẻ kinh nghiệm
            </span>
          </div>

          <div className="space-y-3">
            {communityPosts
              .filter((p) => {
                if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
                return true;
              })
              .map((post) => {
                const isPending = post.status === 'PENDING';
                const isApproved = post.status === 'PUBLISHED' || post.status === 'APPROVED';

                return (
                  <div
                    key={post.id}
                    className="p-5 bg-white rounded-2xl border border-[#E8DFD8] shadow-xs hover:border-[#BA7E4C] transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE4D9] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#FAF0E4] text-[#985018] font-bold text-xs flex items-center justify-center">
                          {post.authorName?.charAt(0) || 'K'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#2C241E]">{post.authorName || 'KTV Ẩn danh'}</span>
                          <span className="text-[11px] text-[#8C7A6B] block">
                            Đăng lúc {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF0E4] text-[#8A4F23]">
                          {post.category || 'CHIA_SE_KINH_NGHIEM'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isApproved ? 'Đã duyệt công khai' : isPending ? 'Chờ kiểm duyệt' : 'Đã từ chối'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-serif font-bold text-base text-[#2C241E]">{post.title}</h4>
                      <p className="text-xs text-[#73675F] mt-1.5 leading-relaxed">
                        {post.summary || post.contentText}
                      </p>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-xs text-[#8C7A6B]">
                        <span>👍 {post.likesCount || 0} lượt thích</span>
                        <span>💬 {post.commentsCount || 0} bình luận</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprovePost(post)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={13} />
                              <span>Duyệt bài ngay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPost(post)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              <span>Từ chối</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id, post.title)}
                          className="p-1.5 text-[#8C7A6B] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors cursor-pointer"
                          title="Xóa bài viết"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: KÊNH EMAIL THÔNG BÁO ĐÀO TẠO                           */}
      {/* ============================================================== */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
            <h3 className="font-serif font-bold text-base text-[#2C241E] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#985018]" />
              <span>4 Mẫu Email Thông báo Đào tạo Tự động (Chuẩn Doanh nghiệp)</span>
            </h3>
            <p className="text-xs text-[#73675F] mt-1">
              Hệ thống tự động kích hoạt gửi các mẫu email HTML này tương ứng với các mốc đào tạo học viên MLD
            </p>
          </div>

          {/* Email Templates List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {emailTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-[#E8DFD8] p-5 flex flex-col justify-between shadow-xs hover:border-[#BA7E4C] transition-all space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF0E4] text-[#8A4F23]">
                      {template.id}
                    </span>
                    <span className="text-[11px] font-bold text-[#137333] flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>Sẵn sàng gửi</span>
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-sm text-[#2C241E]">{template.name}</h4>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs text-[#554B42]">
                    <span className="font-semibold text-[#8A4F23]">Tiêu đề: </span>
                    <span className="italic">{template.subject}</span>
                  </div>
                  <p className="text-xs text-[#73675F] leading-relaxed">{template.description}</p>
                </div>

                <div className="pt-3 border-t border-[#E8DFD8] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#8C7A6B]">
                    {template.variables?.length || 0} biến số động
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateForTest(template);
                      setIsTestEmailModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Thử nghiệm gửi Mail</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Email Logs Table */}
          <div className="bg-white rounded-2xl border border-[#E8DFD8] p-5 shadow-xs space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#2C241E] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#985018]" />
              <span>Nhật ký gửi Email đào tạo gần đây ({emailLogs.length})</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF8F5] text-[#73675F] uppercase tracking-wider text-[10px] border-b border-[#E8DFD8]">
                  <tr>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Người nhận</th>
                    <th className="py-2.5 px-3">Tiêu đề Email</th>
                    <th className="py-2.5 px-3">Mẫu áp dụng</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9]">
                  {emailLogs.slice(0, 5).map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#73675F]">
                        {new Date(log.sentAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#2C241E]">
                        {log.recipientName ? `${log.recipientName} (${log.recipientEmail})` : log.recipientEmail}
                      </td>
                      <td className="py-2.5 px-3 text-[#554B42] max-w-xs truncate">{log.subject}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-[#985018]">{log.templateId || 'Tùy biến'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {emailLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-[#A69788]">
                        Chưa có email đào tạo nào được gửi đi. Bấm nút "Thử nghiệm gửi Mail" ở trên để kiểm tra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: THÊM / SỬA BANNER                                     */}
      {/* ============================================================== */}
      {isBannerModalOpen && editingBanner && (
        <div className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#2C241E]">
                  {editingBanner.id ? 'Chỉnh sửa Banner' : 'Thêm Banner Trang Chủ Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBannerModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tiêu đề chiến dịch Banner *</label>
                <input
                  type="text"
                  required
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  placeholder="VD: Khóa Đào tạo Chuyên gia Dẫn lưu Bạch huyết MLD Khóa 15..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Mô tả tóm tắt (Phụ đề)</label>
                <textarea
                  rows={2}
                  value={editingBanner.summary || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, summary: e.target.value })}
                  placeholder="Mô tả nổi bật chương trình..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Ảnh Banner (Tỉ lệ chuẩn 16:9)</label>
                <ImageUploadInput
                  value={editingBanner.imageUrl || ''}
                  onChange={(url) => setEditingBanner({ ...editingBanner, imageUrl: url })}
                  aspectRatio="16:9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Link điều hướng khi bấm</label>
                  <input
                    type="text"
                    value={editingBanner.targetLink || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, targetLink: e.target.value })}
                    placeholder="/academy hoặc /services..."
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Thứ tự hiển thị (#1, #2...)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingBanner.sortOrder || 1}
                    onChange={(e) => setEditingBanner({ ...editingBanner, sortOrder: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Chuyên mục</label>
                  <select
                    value={editingBanner.category || 'DAO_TAO'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="DAO_TAO">Đào tạo Học viện</option>
                    <option value="DICH_VU">Dịch vụ Trị liệu</option>
                    <option value="KHUYEN_MAI">Ưu đãi / Chiến dịch</option>
                    <option value="SU_KIEN">Sự kiện Chuyên ngành</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Trạng thái hiển thị</label>
                  <select
                    value={editingBanner.status || 'PUBLISHED'}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, status: e.target.value as PortalContentStatus })
                    }
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="PUBLISHED">Hiển thị công khai (Active)</option>
                    <option value="DRAFT">Lưu nháp / Tạm ẩn</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: THÊM / SỬA GIÁO TRÌNH TÀI LIỆU PDF                   */}
      {/* ============================================================== */}
      {isDocModalOpen && editingDoc && (
        <div className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#2C241E]">
                  {editingDoc.id ? 'Chỉnh sửa Giáo trình PDF' : 'Đăng tải Giáo trình & Tài liệu PDF'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tên tài liệu giáo trình *</label>
                <input
                  type="text"
                  required
                  value={editingDoc.title || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  placeholder="VD: Giáo trình Giải phẫu & Sinh lý Hệ Bạch Huyết..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tóm tắt chuyên môn</label>
                <textarea
                  rows={2}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Mô tả mục tiêu và nội dung tài liệu..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Đường dẫn tải file PDF (URL) *</label>
                <input
                  type="url"
                  required
                  value={editingDoc.fileUrl || editingDoc.targetLink || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, fileUrl: e.target.value, targetLink: e.target.value })}
                  placeholder="https://.../giao-trinh.pdf"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Phân quyền học viên</label>
                  <select
                    value={editingDoc.accessLevel || 'MEMBERS_ONLY'}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, accessLevel: e.target.value as DocumentAccessLevel })
                    }
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="MEMBERS_ONLY">Chỉ học viên khóa học (Members Only)</option>
                    <option value="FREE_TRIAL">Cho phép đọc thử (Free Trial)</option>
                    <option value="PUBLIC">Mở công khai (Public)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Chuyên mục tài liệu</label>
                  <select
                    value={editingDoc.category || 'GIAI_PHAU'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="GIAI_PHAU">Giải phẫu hệ mạch</option>
                    <option value="LAM_SANG">Phác đồ lâm sàng</option>
                    <option value="BANG_EP">Băng ép đa lớp</option>
                    <option value="NGHIEN_CUU">Nghiên cứu y khoa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Tác giả / Hội đồng thẩm định</label>
                  <input
                    type="text"
                    value={editingDoc.authorName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, authorName: e.target.value })}
                    placeholder="Hội đồng Chuyên môn MLD"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Ảnh bìa giáo trình (Tùy chọn)</label>
                  <input
                    type="url"
                    value={editingDoc.imageUrl || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, imageUrl: e.target.value })}
                    placeholder="https://... ảnh bìa"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Giáo trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: THỬ NGHIỆM GỬI EMAIL                                 */}
      {/* ============================================================== */}
      {isTestEmailModalOpen && selectedTemplateForTest && (
        <div className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C241E]">Thử nghiệm Gửi Email Đào Tạo</h3>
                  <p className="text-[11px] text-[#73675F]">{selectedTemplateForTest.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTestEmailModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Email người nhận *</label>
                <input
                  type="email"
                  required
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  placeholder="vd: hocvien@gmail.com"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tên học viên</label>
                <input
                  type="text"
                  value={testRecipientName}
                  onChange={(e) => setTestRecipientName(e.target.value)}
                  placeholder="vd: Chị Minh Thư"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#EFE4D9] space-y-1.5 text-xs text-[#554B42]">
                <div className="font-bold text-[#8A4F23]">Xem trước tiêu đề Email:</div>
                <div className="italic text-[11px] text-[#73675F]">{selectedTemplateForTest.subject}</div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Hệ thống sẽ thay thế tự động toàn bộ biến số động chuẩn y khoa và ghi nhận kết quả gửi vào bảng nhật ký email.
                </span>
              </div>

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestEmailModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Bắt đầu gửi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
