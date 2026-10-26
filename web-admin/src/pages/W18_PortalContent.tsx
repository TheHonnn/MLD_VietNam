// MLD Healthcare & Academy - W18 Portal Content Management & Automated Email Channel
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Mail,
  Plus,
  Search,
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
  Send,
  Lock,
  Unlock,
  Check,
  ChevronUp,
  ChevronDown,
  Star,
  Layers,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  Code2,
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
// UPLOAD IMAGE / FILE INPUT COMPONENT
// ==========================================
interface MediaUploadInputProps {
  value: string;
  onChange: (url: string, fileSizeBytes?: number) => void;
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'auto';
  label?: string;
  accept?: string;
  isDocument?: boolean;
}

const MediaUploadInput: React.FC<MediaUploadInputProps> = ({
  value,
  onChange,
  aspectRatio = '16:9',
  label = 'Tệp tải lên',
  accept = 'image/*',
  isDocument = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File | Blob, nameHint?: string) => {
    setUploading(true);
    try {
      const publicUrl = await portalService.uploadFileToStorage(
        file,
        nameHint || (file as File).name || (isDocument ? 'document.pdf' : 'image.png')
      );
      const size = (file as File).size || 0;
      onChange(publicUrl, size);
      toast.success('Tải tệp thành công', isDocument ? 'Tài liệu đã được lưu trữ an toàn.' : 'Ảnh đã được lưu lên đám mây.');
    } catch (err: any) {
      toast.error('Lỗi tải tệp', err.message || 'Không thể tải tệp lên.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (isDocument) return;
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
              const url = await portalService.uploadFileToStorage(blob, `pasted_${Date.now()}.${imgType.split('/')[1] || 'png'}`);
              onChange(url, blob.size);
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
        toast.success('Dán link thành công', 'Đã lưu đường dẫn.');
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
        if (files && files[0]) {
          await handleProcessFile(files[0]);
        }
      }}
      className={`space-y-2 p-3.5 rounded-2xl border transition-all ${
        isDragging ? 'bg-[#FAF0E4] border-[#985018] ring-2 ring-[#985018]/20' : 'bg-[#FAF8F5] border-[#E8DFD8]'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file);
        }}
      />
      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Preview box */}
        {!isDocument ? (
          <div
            className={`relative w-full sm:w-44 ${
              aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'
            } rounded-xl overflow-hidden bg-white border border-[#E8DFD8] shrink-0 flex items-center justify-center group shadow-2xs`}
          >
            {uploading ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF0E4] text-[#985018] gap-1 p-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#985018]" />
                <span className="text-[10px] font-bold">Đang tải lên...</span>
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
                  <Trash2 size={16} />
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
        ) : (
          <div className="w-full sm:w-32 h-24 rounded-xl bg-white border border-[#E8DFD8] shrink-0 flex flex-col items-center justify-center text-center p-2 shadow-2xs">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#985018]" />
            ) : value ? (
              <div className="text-emerald-700 space-y-1">
                <FileCheck className="w-7 h-7 mx-auto" />
                <span className="text-[10px] font-bold block truncate max-w-[100px]">Đã có file</span>
              </div>
            ) : (
              <div className="text-[#8C7A6B] space-y-1">
                <FileText className="w-7 h-7 mx-auto text-[#BA7E4C]" />
                <span className="text-[10px] font-bold text-[#8A4F23] block">Chọn PDF / Doc</span>
              </div>
            )}
          </div>
        )}

        {/* Input & Actions */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={value || ''}
              placeholder={isDocument ? "Đường dẫn tải tài liệu PDF (URL) hoặc tải từ máy..." : "Dán link ảnh (URL) hoặc bấm Ctrl+V..."}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#E8DFD8] bg-white text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-2 rounded-xl text-[#8C7A6B] hover:text-[#DC2626] hover:bg-white border border-[#E8DFD8] transition-colors"
                title="Xóa link"
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#985018] text-white hover:bg-[#804213] cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
            >
              <Upload size={13} />
              <span>{isDocument ? 'Tải PDF từ máy' : 'Tải ảnh từ máy'}</span>
            </button>
            {!isDocument && (
              <button
                type="button"
                disabled={uploading}
                onClick={handlePasteButtonClick}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#985018] border border-[#BA7E4C]/40 hover:bg-[#FAF0E4] cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
              >
                <Clipboard size={13} />
                <span>Dán từ bộ nhớ tạm (Ctrl+V)</span>
              </button>
            )}
            <span className="text-[11px] text-[#8C7A6B]">
              {isDocument ? 'Hỗ trợ .pdf, .docx, .zip (tối đa 50MB)' : 'Kéo thả tệp vào đây'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: W18_PortalContent
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

  // Mini App Mockup Preview State for Tab 1
  const [showMobileMockup, setShowMobileMockup] = useState(false);
  const [currentMockupIndex, setCurrentMockupIndex] = useState(0);

  // Modals
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<PortalContentItem> | null>(null);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<PortalContentItem> | null>(null);

  const [isPreviewDocModalOpen, setIsPreviewDocModalOpen] = useState(false);
  const [previewingDoc, setPreviewingDoc] = useState<PortalContentItem | null>(null);

  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<PortalContentItem | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [newPostData, setNewPostData] = useState<Partial<PortalContentItem>>({
    kind: 'COMMUNITY',
    title: '',
    summary: '',
    contentText: '',
    category: 'CHIA_SE_KINH_NGHIEM',
    authorName: 'BS. Chuyên môn MLD',
    status: 'PUBLISHED',
  });

  // Email Template Edit Modal
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateEditorTab, setTemplateEditorTab] = useState<'html' | 'preview'>('preview');

  // Email Test Modal
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [selectedTemplateForTest, setSelectedTemplateForTest] = useState<EmailTemplate | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState('hocvien.mld@gmail.com');
  const [testRecipientName, setTestRecipientName] = useState('Chị Bùi Thảo Linh');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({
    student_name: 'Bùi Thảo Linh',
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
    theory_score: '96',
    practice_score: '92',
    certificate_code: 'MLD-GCN-2026-0889',
    verification_url: 'https://mldvietnam.edu.vn/verify/MLD-GCN-2026-0889',
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Email Log Detail Modal
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

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

  // Quick Stats
  const activeBanners = useMemo(
    () => banners.filter((b) => b.status === 'PUBLISHED' || b.status === 'APPROVED'),
    [banners]
  );
  const totalDownloads = useMemo(
    () => documents.reduce((sum, d) => sum + (d.downloadCount || 0), 0),
    [documents]
  );
  const pendingPostsCount = useMemo(
    () => communityPosts.filter((p) => p.status === 'PENDING').length,
    [communityPosts]
  );
  const totalEmailsSent = useMemo(
    () => emailLogs.filter((l) => l.status === 'SENT').length,
    [emailLogs]
  );

  // ==========================================
  // HANDLERS: BANNER ACTIONS & REORDERING
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
      authorName: 'Ban Giám Đốc MLD',
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

  const handleMoveBannerOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === banners.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentBanner = banners[index];
    const swapBanner = banners[targetIndex];

    const currentOrder = currentBanner.sortOrder || index + 1;
    const swapOrder = swapBanner.sortOrder || targetIndex + 1;

    try {
      await Promise.all([
        portalService.setSortOrder(currentBanner.id, swapOrder),
        portalService.setSortOrder(swapBanner.id, currentOrder),
      ]);

      const newBanners = [...banners];
      newBanners[index] = { ...swapBanner, sortOrder: currentOrder };
      newBanners[targetIndex] = { ...currentBanner, sortOrder: swapOrder };
      setBanners(newBanners);
      toast.success('Đã cập nhật thứ tự', `Banner "${currentBanner.title}" xếp vị trí #${swapOrder}`);
    } catch {
      toast.error('Lỗi', 'Không thể hoán đổi thứ tự banner.');
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
      fileSizeBytes: 0,
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

  const handleDownloadDoc = async (doc: PortalContentItem) => {
    try {
      await portalService.incrementDownloadCount(doc.id, doc.downloadCount);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d))
      );
      toast.success('Bắt đầu tải file', `Tài liệu "${doc.title}" đang được tải xuống.`);
      if (doc.fileUrl || doc.targetLink) {
        window.open(doc.fileUrl || doc.targetLink, '_blank');
      }
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật lượt tải.');
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
      if (viewingPost?.id === post.id) {
        setViewingPost({ ...viewingPost, status: 'PUBLISHED' });
      }
    } catch {
      toast.error('Lỗi', 'Không thể duyệt bài.');
    }
  };

  const handleRejectPost = async (post: PortalContentItem) => {
    try {
      await portalService.setStatus(post.id, 'REJECTED');
      toast.warning('Từ chối bài viết', `Đã chuyển bài viết "${post.title}" sang trạng thái từ chối.`);
      setCommunityPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: 'REJECTED' } : p)));
      if (viewingPost?.id === post.id) {
        setViewingPost({ ...viewingPost, status: 'REJECTED' });
      }
    } catch {
      toast.error('Lỗi', 'Không thể từ chối bài viết.');
    }
  };

  const handleSaveNewPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostData.title?.trim() || !newPostData.contentText?.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tiêu đề và nội dung bài viết.');
      return;
    }

    try {
      await portalService.createContent(newPostData);
      toast.success('Đã xuất bản', 'Bài viết chuyên môn mới đã được đăng lên cộng đồng.');
      setIsCreatePostModalOpen(false);
      setNewPostData({
        kind: 'COMMUNITY',
        title: '',
        summary: '',
        contentText: '',
        category: 'CHIA_SE_KINH_NGHIEM',
        authorName: 'BS. Chuyên môn MLD',
        status: 'PUBLISHED',
      });
      loadData();
    } catch {
      toast.error('Lỗi', 'Không thể tạo bài viết.');
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Xác nhận xóa bài viết "${title}"?`)) return;
    try {
      await portalService.deleteContent(id);
      toast.success('Đã xóa', 'Đã xóa bài viết khỏi diễn đàn cộng đồng.');
      setCommunityPosts((prev) => prev.filter((p) => p.id !== id));
      if (viewingPost?.id === id) setViewingPost(null);
    } catch {
      toast.error('Lỗi', 'Không thể xóa bài viết.');
    }
  };

  // ==========================================
  // HANDLERS: EMAIL TEMPLATES & SIMULATOR
  // ==========================================
  const handleOpenEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setTemplateEditorTab('preview');
    setIsEditTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      await emailService.updateTemplate(editingTemplate.id, editingTemplate);
      toast.success('Đã lưu mẫu Email', `Đã cập nhật nội dung mẫu "${editingTemplate.name}".`);
      setIsEditTemplateModalOpen(false);
      setEmailTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)));
    } catch {
      toast.error('Lỗi', 'Không thể lưu mẫu email.');
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateForTest) return;
    if (!testRecipientEmail.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập địa chỉ email người nhận.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await emailService.sendEmail({
        recipientEmail: testRecipientEmail,
        recipientName: testRecipientName,
        templateId: selectedTemplateForTest.id,
        variables: testVariables,
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

  const handleDeleteEmailLog = async (logId: string) => {
    if (!window.confirm('Xóa bản ghi nhật ký gửi email này?')) return;
    try {
      await emailService.deleteLog(logId);
      setEmailLogs((prev) => prev.filter((l) => l.id !== logId));
      if (selectedLog?.id === logId) setSelectedLog(null);
      toast.success('Đã xóa', 'Đã xóa bản ghi nhật ký.');
    } catch {
      toast.error('Lỗi', 'Không thể xóa nhật ký.');
    }
  };

  // Format File Size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Tài liệu PDF';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] pb-16">
      {/* 1. Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8DFD8] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#985018] mb-1">
            <Layers className="w-4 h-4" />
            <span>Hệ Thống & Truyền Thông Học Viện MLD</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#2C241E]">
            Quản trị Nội dung Portal & Kênh Thông tin
          </h1>
          <p className="text-xs text-[#73675F] mt-1">
            Quản trị Banner trang chủ, Thư viện giáo trình PDF, Bài viết cộng đồng & Kênh Email đào tạo tự động
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
            <>
              <button
                type="button"
                onClick={() => setShowMobileMockup(!showMobileMockup)}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  showMobileMockup
                    ? 'bg-[#FAF0E4] text-[#985018] border-[#BA7E4C]'
                    : 'bg-white text-[#73675F] border-[#E8DFD8] hover:border-[#BA7E4C]'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>{showMobileMockup ? 'Đóng xem trước App' : 'Xem trước App Mobile'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddBanner}
                className="px-4 py-2.5 bg-[#985018] hover:bg-[#804213] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Thêm Banner mới</span>
              </button>
            </>
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

          {activeTab === 'community' && (
            <button
              type="button"
              onClick={() => setIsCreatePostModalOpen(true)}
              className="px-4 py-2.5 bg-[#985018] hover:bg-[#804213] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Đăng bài viết mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-xs font-semibold text-[#137333]">({activeBanners.length} đang hiển thị)</span>
          </div>
          <p className="text-[11px] text-[#8C7A6B] mt-1">Chuẩn tỉ lệ ngang 16:9 sắc nét</p>
        </div>

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
          <p className="text-[11px] text-[#8C7A6B] mt-1">Khai giảng, lịch học & kết quả thi</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD8] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'email'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-[#73675F] hover:bg-[#FAF8F5] border border-[#E8DFD8]'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>4. Kênh Email Thông báo Đào tạo ({emailTemplates.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BANNERS TRANG CHỦ                                      */}
      {/* ============================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-5">
          {/* Mobile App Mockup Preview Section */}
          {showMobileMockup && (
            <div className="p-6 bg-gradient-to-br from-[#2C241E] to-[#1E1814] text-white rounded-3xl shadow-xl border border-[#BA7E4C]/30 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#BA7E4C]" />
                  <div>
                    <h3 className="font-serif font-bold text-sm">Xem trước Banner trên ứng dụng Mini App Khách hàng</h3>
                    <p className="text-[11px] text-neutral-300">Giao diện điện thoại thời gian thực</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileMockup(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {activeBanners.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Phone frame */}
                  <div className="w-[300px] h-[480px] bg-black rounded-[40px] p-3 border-4 border-neutral-700 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    {/* Speaker notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-b-xl z-20" />

                    {/* App Header */}
                    <div className="pt-5 px-3 pb-2 flex items-center justify-between border-b border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#BA7E4C] flex items-center justify-center text-[10px] font-bold">M</div>
                        <span className="text-[11px] font-bold tracking-wider">MLD VIETNAM</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">9:41 AM</span>
                    </div>

                    {/* Banner Carousel inside app */}
                    <div className="flex-1 py-4 flex flex-col justify-center">
                      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg border border-neutral-800">
                        <img
                          src={activeBanners[currentMockupIndex % activeBanners.length]?.imageUrl || ''}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                          <span className="text-[9px] font-bold bg-[#BA7E4C] text-white px-2 py-0.5 rounded-md w-fit mb-1">
                            {activeBanners[currentMockupIndex % activeBanners.length]?.category || 'ĐÀO TẠO'}
                          </span>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {activeBanners[currentMockupIndex % activeBanners.length]?.title}
                          </h4>
                        </div>
                      </div>

                      {/* Dots Indicator */}
                      <div className="flex items-center justify-center gap-1.5 mt-3">
                        {activeBanners.map((_, idx) => (
                          <div
                            key={idx}
                            onClick={() => setCurrentMockupIndex(idx)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === currentMockupIndex % activeBanners.length
                                ? 'w-5 bg-[#BA7E4C]'
                                : 'w-1.5 bg-neutral-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Mock Nav Bottom */}
                    <div className="py-2.5 px-4 bg-neutral-900/90 rounded-2xl flex items-center justify-between text-[9px] text-neutral-400 border border-neutral-800">
                      <span className="text-[#BA7E4C] font-bold">Trang chủ</span>
                      <span>Liệu trình</span>
                      <span>Học viện</span>
                      <span>Tài khoản</span>
                    </div>
                  </div>

                  {/* Mockup Controls & Info */}
                  <div className="max-w-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMockupIndex((prev) => (prev > 0 ? prev - 1 : activeBanners.length - 1))
                        }
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"
                        title="Banner trước"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-mono font-bold">
                        Banner { (currentMockupIndex % activeBanners.length) + 1 } / { activeBanners.length }
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentMockupIndex((prev) => (prev + 1) % activeBanners.length)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"
                        title="Banner tiếp"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1 text-xs">
                      <span className="text-neutral-400 block text-[10px]">Tiêu đề:</span>
                      <p className="font-bold text-white line-clamp-2">
                        {activeBanners[currentMockupIndex % activeBanners.length]?.title}
                      </p>
                      <span className="text-neutral-400 block text-[10px] mt-2">Liên kết điều hướng:</span>
                      <code className="text-[#BA7E4C] text-[11px] font-mono">
                        {activeBanners[currentMockupIndex % activeBanners.length]?.targetLink || '/academy'}
                      </code>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Chưa có banner nào ở trạng thái "Hiển thị". Vui lòng bật hiển thị ít nhất 1 banner để xem trước.
                </div>
              )}
            </div>
          )}

          {/* Banner Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {banners.map((banner, index) => {
              const isLive = banner.status === 'PUBLISHED' || banner.status === 'APPROVED';
              return (
                <div
                  key={banner.id}
                  className="bg-white rounded-3xl border border-[#E8DFD8] overflow-hidden shadow-xs hover:border-[#BA7E4C] transition-all flex flex-col justify-between group"
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
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg font-mono">
                          #{banner.sortOrder || index + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-xs ${
                            isLive ? 'bg-emerald-600/90 text-white' : 'bg-neutral-800/80 text-neutral-300'
                          }`}
                        >
                          {isLive ? 'ĐANG HIỂN THỊ' : 'TẠM ẨN'}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DACB]">
                          {banner.category || 'DAO_TAO'}
                        </span>
                      </div>
                    </div>

                    {/* Banner Info */}
                    <div className="p-5 space-y-2.5">
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
                  <div className="px-5 py-3.5 bg-[#FAF8F5] border-t border-[#E8DFD8] flex items-center justify-between gap-2">
                    {/* Status & Reorder */}
                    <div className="flex items-center gap-1.5">
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
                        <span>{isLive ? 'Tạm ẩn' : 'Bật hiển thị'}</span>
                      </button>

                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveBannerOrder(index, 'up')}
                        className="p-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] disabled:opacity-30 cursor-pointer"
                        title="Đẩy lên trước"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === banners.length - 1}
                        onClick={() => handleMoveBannerOrder(index, 'down')}
                        className="p-1.5 rounded-lg border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] disabled:opacity-30 cursor-pointer"
                        title="Đẩy xuống sau"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBanner({ ...banner });
                          setIsBannerModalOpen(true);
                        }}
                        className="p-2 rounded-xl border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] transition-colors cursor-pointer"
                        title="Chỉnh sửa Banner"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner.id, banner.title)}
                        className="p-2 rounded-xl border border-[#E8DFD8] bg-white text-[#8C7A6B] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
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
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#D8C9BA] space-y-3">
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
                    className="bg-white rounded-3xl border border-[#E8DFD8] p-5 flex flex-col justify-between shadow-xs hover:border-[#BA7E4C] transition-all group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
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

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#FAF0E4] text-[#8A4F23]">
                            {doc.category || 'GIÁO TRÌNH'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#2C241E] line-clamp-2 group-hover:text-[#985018] transition-colors leading-snug">
                          {doc.title}
                        </h4>
                        <p className="text-xs text-[#73675F] mt-1.5 line-clamp-2 leading-relaxed">
                          {doc.summary || doc.contentText || 'Giáo trình đào tạo chuyên môn độc quyền từ Viện MLD.'}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="pt-2.5 border-t border-[#EFE4D9] flex items-center justify-between text-[11px] text-[#8C7A6B]">
                        <span className="font-medium truncate max-w-[130px]">{doc.authorName || 'Hội đồng Chuyên môn'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#73675F]">{formatFileSize(doc.fileSizeBytes)}</span>
                          <span className="flex items-center gap-1 text-[#0284c7] font-semibold">
                            <Download size={12} />
                            <span>{doc.downloadCount}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3.5 mt-3.5 border-t border-[#E8DFD8] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewingDoc(doc);
                            setIsPreviewDocModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#FAF0E4] text-[#985018] text-xs font-bold rounded-xl border border-[#E8DFD8] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Xem trước</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc)}
                          className="p-1.5 rounded-xl border border-[#E8DFD8] bg-white text-[#0284c7] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Tải xuống tài liệu"
                        >
                          <Download size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc({ ...doc });
                            setIsDocModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl border border-[#E8DFD8] bg-white text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] transition-colors cursor-pointer"
                          title="Sửa tài liệu"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                          className="p-1.5 rounded-xl border border-[#E8DFD8] bg-white text-[#8C7A6B] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#985018] text-white shadow-2xs'
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

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8C7A6B]">
                Hiển thị <strong>{communityPosts.length}</strong> bài viết chia sẻ kinh nghiệm
              </span>
            </div>
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
                    className="p-5 bg-white rounded-3xl border border-[#E8DFD8] shadow-xs hover:border-[#BA7E4C] transition-all space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE4D9] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#FAF0E4] text-[#985018] font-bold text-xs flex items-center justify-center border border-[#BA7E4C]/30 shadow-2xs">
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
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-[#FAF0E4] text-[#8A4F23]">
                          {post.category || 'CHIA_SE_KINH_NGHIEM'}
                        </span>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
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

                    <div
                      onClick={() => setViewingPost(post)}
                      className="cursor-pointer group"
                    >
                      <h4 className="font-serif font-bold text-base text-[#2C241E] group-hover:text-[#985018] transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-[#73675F] mt-1.5 leading-relaxed line-clamp-3">
                        {post.summary || post.contentText}
                      </p>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-4 text-xs text-[#8C7A6B]">
                        <span>👍 {post.likesCount || 0} lượt thích</span>
                        <span>💬 {post.commentsCount || 0} bình luận</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingPost(post)}
                          className="px-3 py-1.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-bold text-[#73675F] hover:bg-[#FAF0E4] hover:text-[#985018] transition-colors"
                        >
                          Xem chi tiết ca bệnh
                        </button>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprovePost(post)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={13} />
                              <span>Duyệt bài</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPost(post)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              <span>Từ chối</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id, post.title)}
                          className="p-1.5 text-[#8C7A6B] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer"
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
          <div className="bg-white p-6 rounded-3xl border border-[#E8DFD8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#2C241E] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#985018]" />
                <span>4 Mẫu Email Thông báo Đào tạo Tự động (Chuẩn Doanh nghiệp MLD)</span>
              </h3>
              <p className="text-xs text-[#73675F] mt-1">
                Tự động cá nhân hóa nội dung và biến số gửi tới học viên: Xác nhận đăng ký, Nhắc lịch thực hành, Kết quả thi, Chứng chỉ điện tử.
              </p>
            </div>
          </div>

          {/* Email Templates List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {emailTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-3xl border border-[#E8DFD8] p-6 flex flex-col justify-between shadow-xs hover:border-[#BA7E4C] transition-all space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#FAF0E4] text-[#8A4F23]">
                      {template.id}
                    </span>
                    <span className="text-[11px] font-bold text-[#137333] flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>Sẵn sàng gửi</span>
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-base text-[#2C241E]">{template.name}</h4>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] text-xs text-[#554B42]">
                    <span className="font-semibold text-[#8A4F23]">Tiêu đề: </span>
                    <span className="italic">{template.subject}</span>
                  </div>
                  <p className="text-xs text-[#73675F] leading-relaxed line-clamp-2">{template.description}</p>

                  {/* Variables pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {template.variables?.map((v) => (
                      <span key={v} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-neutral-100 text-[#554B42]">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8DFD8] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTemplate(template)}
                    className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#73675F] rounded-xl text-xs font-bold border border-[#E8DFD8] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Code2 size={13} />
                    <span>Sửa mã HTML</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateForTest(template);
                      setIsTestEmailModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Thử nghiệm gửi Mail</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Email Logs Table */}
          <div className="bg-white rounded-3xl border border-[#E8DFD8] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-serif font-bold text-base text-[#2C241E] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#985018]" />
                <span>Nhật ký gửi Email đào tạo gần đây ({emailLogs.length})</span>
              </h4>
              <span className="text-xs text-[#8C7A6B]">Tự động ghi nhận log mỗi lần gửi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF8F5] text-[#73675F] uppercase tracking-wider text-[10px] border-b border-[#E8DFD8]">
                  <tr>
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3">Người nhận</th>
                    <th className="py-3 px-3">Tiêu đề Email</th>
                    <th className="py-3 px-3">Mẫu áp dụng</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9]">
                  {emailLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-[#73675F] whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#2C241E]">
                        {log.recipientName ? `${log.recipientName} (${log.recipientEmail})` : log.recipientEmail}
                      </td>
                      <td className="py-3 px-3 text-[#554B42] max-w-xs truncate">{log.subject}</td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[#985018]">{log.templateId || 'Tùy biến'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg text-[#73675F] hover:text-[#985018] hover:bg-white border border-[#E8DFD8]"
                            title="Xem chi tiết nội dung email đã gửi"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmailLog(log.id)}
                            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#DC2626] hover:bg-rose-50"
                            title="Xóa nhật ký này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {emailLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#A69788]">
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
                <MediaUploadInput
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
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Tải lên file tài liệu PDF / DOC *</label>
                <MediaUploadInput
                  value={editingDoc.fileUrl || editingDoc.targetLink || ''}
                  onChange={(url, size) =>
                    setEditingDoc({
                      ...editingDoc,
                      fileUrl: url,
                      targetLink: url,
                      fileSizeBytes: size || editingDoc.fileSizeBytes || 0,
                    })
                  }
                  accept=".pdf,.doc,.docx,.zip"
                  isDocument={true}
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
      {/* MODAL 2.1: XEM TRƯỚC GIÁO TRÌNH PDF                            */}
      {/* ============================================================== */}
      {isPreviewDocModalOpen && previewingDoc && (
        <div className="fixed inset-0 bg-[#2C241E]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E8DFD8] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#E8DFD8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C241E] line-clamp-1">{previewingDoc.title}</h3>
                  <span className="text-[11px] text-[#73675F]">Tài liệu chuyên môn nội bộ MLD Academy</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewDocModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Document Overview Header */}
              <div className="p-4 bg-[#FAF0E4]/60 rounded-2xl border border-[#BA7E4C]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#985018]">Phân loại:</span>
                  <div className="font-bold text-sm text-[#2C241E] mt-0.5">{previewingDoc.category}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#985018]">Quyền đọc:</span>
                  <div className="font-bold text-sm text-[#2C241E] mt-0.5">{previewingDoc.accessLevel}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#985018]">Lượt tải:</span>
                  <div className="font-bold text-sm text-[#0284c7] mt-0.5">{previewingDoc.downloadCount} lượt</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#73675F] mb-1">Tóm tắt nội dung</h4>
                <p className="text-xs text-[#2C241E] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8DFD8]">
                  {previewingDoc.summary || previewingDoc.contentText || 'Giáo trình đào tạo chuyên sâu phương pháp dẫn lưu bạch huyết.'}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Tài liệu đã được kiểm định chuyên khoa</span>
                    <span className="text-[11px] text-emerald-700">Tác giả: {previewingDoc.authorName || 'Hội đồng Khoa học MLD'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewingDoc)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Download size={13} />
                  <span>Tải file về</span>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-[#E8DFD8] bg-[#FAF8F5] flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewDocModalOpen(false)}
                className="px-5 py-2 bg-white border border-[#E8DFD8] text-xs font-bold rounded-xl text-[#73675F] hover:bg-[#FAF0E4]"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: XEM CHI TIẾT BÀI VIẾT CỘNG ĐỒNG                      */}
      {/* ============================================================== */}
      {viewingPost && (
        <div className="fixed inset-0 bg-[#2C241E]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E8DFD8] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#E8DFD8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C241E]">Chi tiết Ca lâm sàng / Bài chia sẻ</h3>
                  <span className="text-[11px] text-[#73675F]">Tác giả: {viewingPost.authorName || 'KTV'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPost(null)}
                className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23]">
                  {viewingPost.category || 'CHIA_SE_KINH_NGHIEM'}
                </span>
                <h3 className="font-serif font-bold text-lg text-[#2C241E]">{viewingPost.title}</h3>
                <span className="text-[11px] text-[#8C7A6B] block">
                  Đăng ngày {new Date(viewingPost.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              {viewingPost.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-[#E8DFD8] aspect-[16/9]">
                  <img src={viewingPost.imageUrl} alt={viewingPost.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="text-xs text-[#2C241E] leading-relaxed space-y-2 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8DFD8]">
                <p className="whitespace-pre-line">{viewingPost.contentText || viewingPost.summary}</p>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-[#8C7A6B] border-t border-[#EFE4D9]">
                <span>Lượt thích: {viewingPost.likesCount || 0}</span>
                <span>Bình luận: {viewingPost.commentsCount || 0}</span>
                <span className="font-bold text-[#985018]">Trạng thái: {viewingPost.status}</span>
              </div>
            </div>

            <div className="p-4 border-t border-[#E8DFD8] bg-[#FAF8F5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeletePost(viewingPost.id, viewingPost.title)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-bold hover:bg-rose-100"
              >
                Xóa bài viết
              </button>

              <div className="flex items-center gap-2">
                {viewingPost.status !== 'PUBLISHED' && viewingPost.status !== 'APPROVED' ? (
                  <button
                    type="button"
                    onClick={() => handleApprovePost(viewingPost)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                  >
                    Duyệt bài công khai
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRejectPost(viewingPost)}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                  >
                    Tạm gỡ bài này
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingPost(null)}
                  className="px-4 py-2 bg-white border border-[#E8DFD8] text-xs font-bold rounded-xl text-[#73675F]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3.1: ĐĂNG BÀI VIẾT CHIA SẺ MỚI (TỪ ADMIN / GIẢNG VIÊN)   */}
      {/* ============================================================== */}
      {isCreatePostModalOpen && (
        <div className="fixed inset-0 bg-[#2C241E]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#2C241E]">Đăng Bài Viết Chuyên Môn Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePostModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPost} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tiêu đề bài chia sẻ / Ca lâm sàng *</label>
                <input
                  type="text"
                  required
                  value={newPostData.title || ''}
                  onChange={(e) => setNewPostData({ ...newPostData, title: e.target.value })}
                  placeholder="VD: Hướng dẫn kỹ thuật dẫn lưu bạch huyết sau phẫu thuật hút mỡ..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tác giả bài viết</label>
                <input
                  type="text"
                  value={newPostData.authorName || ''}
                  onChange={(e) => setNewPostData({ ...newPostData, authorName: e.target.value })}
                  placeholder="BS. CKI Lê Hoài An - Trưởng bộ môn"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Nội dung chi tiết ca bệnh / kỹ thuật *</label>
                <textarea
                  rows={5}
                  required
                  value={newPostData.contentText || ''}
                  onChange={(e) => setNewPostData({ ...newPostData, contentText: e.target.value, summary: e.target.value.slice(0, 150) })}
                  placeholder="Nhập nội dung chia sẻ kinh nghiệm, lưu ý thao tác tay, phác đồ điều trị..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Ảnh minh họa ca lâm sàng (Tùy chọn)</label>
                <MediaUploadInput
                  value={newPostData.imageUrl || ''}
                  onChange={(url) => setNewPostData({ ...newPostData, imageUrl: url })}
                  aspectRatio="16:9"
                />
              </div>

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePostModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Đăng bài ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CHỈNH SỬA MẪU EMAIL HTML                             */}
      {/* ============================================================== */}
      {isEditTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-[#2C241E]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-3xl w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C241E]">Chỉnh sửa Mẫu Email Đào tạo</h3>
                  <span className="text-[11px] text-[#73675F]">{editingTemplate.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditTemplateModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle editor / preview */}
            <div className="px-5 pt-3 flex items-center gap-2 border-b border-[#E8DFD8] bg-white shrink-0">
              <button
                type="button"
                onClick={() => setTemplateEditorTab('preview')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  templateEditorTab === 'preview'
                    ? 'border-[#985018] text-[#985018]'
                    : 'border-transparent text-[#73675F]'
                }`}
              >
                Xem trước trực quan (Live HTML)
              </button>
              <button
                type="button"
                onClick={() => setTemplateEditorTab('html')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  templateEditorTab === 'html'
                    ? 'border-[#985018] text-[#985018]'
                    : 'border-transparent text-[#73675F]'
                }`}
              >
                Chỉnh sửa mã HTML
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tiêu đề Email (Subject) *</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              {/* Clickable Variables List */}
              <div className="p-3 bg-white rounded-2xl border border-[#E8DFD8] space-y-1.5">
                <span className="text-[11px] font-bold text-[#73675F] block">Biến số có sẵn (bấm để copy):</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {editingTemplate.variables?.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${v}}}`);
                        toast.success('Đã sao chép', `Biến {{${v}}} đã được lưu vào bộ nhớ tạm.`);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#FAF0E4] text-[#8A4F23] hover:bg-[#985018] hover:text-white transition-colors cursor-pointer"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {templateEditorTab === 'html' ? (
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Mã HTML mẫu</label>
                  <textarea
                    rows={12}
                    value={editingTemplate.bodyHtml}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyHtml: e.target.value })}
                    className="w-full font-mono text-[11px] p-3 bg-neutral-900 text-emerald-400 rounded-xl border border-[#E8DFD8] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#2C241E]">Hiển thị thực tế trong hòm thư học viên</label>
                  <div
                    className="p-4 bg-white rounded-2xl border border-[#E8DFD8] shadow-xs max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: editingTemplate.bodyHtml
                        .replace(/{{student_name}}/g, 'Bùi Thảo Linh')
                        .replace(/{{course_name}}/g, 'Khóa Chuyên gia Dẫn lưu Bạch huyết MLD Vodder Cấp độ 2')
                        .replace(/{{student_code}}/g, 'MLD-K15-089')
                        .replace(/{{start_date}}/g, '15/11/2026')
                        .replace(/{{branch_address}}/g, '186 Nam Kỳ Khởi Nghĩa, Q.3, TP.HCM')
                        .replace(/{{paid_amount}}/g, '15.000.000')
                        .replace(/{{class_title}}/g, 'Thực hành Băng ép đa lớp')
                        .replace(/{{study_date}}/g, '27/10/2026')
                        .replace(/{{time_slot}}/g, '14:00 - 17:00')
                        .replace(/{{room_name}}/g, 'Phòng Lab 01')
                        .replace(/{{instructor_name}}/g, 'BS. CKI Lê Hoài An')
                        .replace(/{{theory_score}}/g, '96')
                        .replace(/{{practice_score}}/g, '92')
                        .replace(/{{certificate_code}}/g, 'MLD-GCN-2026-0889')
                        .replace(/{{verification_url}}/g, '#'),
                    }}
                  />
                </div>
              )}

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditTemplateModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu mẫu Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: THỬ NGHIỆM GỬI EMAIL THÔNG MINH                       */}
      {/* ============================================================== */}
      {isTestEmailModalOpen && selectedTemplateForTest && (
        <div className="fixed inset-0 bg-[#2C241E]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
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

            <form onSubmit={handleSendTestEmail} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Email người nhận *</label>
                  <input
                    type="email"
                    required
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    placeholder="hocvien@gmail.com"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Tên học viên</label>
                  <input
                    type="text"
                    value={testRecipientName}
                    onChange={(e) => {
                      setTestRecipientName(e.target.value);
                      setTestVariables((prev) => ({ ...prev, student_name: e.target.value }));
                    }}
                    placeholder="vd: Bùi Thảo Linh"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              {/* Dynamic Variables Inputs based on template */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8DFD8] space-y-3">
                <span className="text-xs font-bold text-[#8A4F23] flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Tùy chỉnh biến số nội suy cho email này:</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedTemplateForTest.variables?.slice(0, 6).map((variable) => (
                    <div key={variable}>
                      <label className="block text-[11px] font-mono text-[#73675F] mb-0.5">{`{{${variable}}}`}</label>
                      <input
                        type="text"
                        value={testVariables[variable] || ''}
                        onChange={(e) =>
                          setTestVariables({ ...testVariables, [variable]: e.target.value })
                        }
                        className="w-full text-xs px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-[#2C241E] focus:outline-none focus:border-[#985018]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Hệ thống tự động thay thế toàn bộ biến số trên, gửi và ghi nhận lịch sử vào bảng Nhật ký Email.
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

      {/* ============================================================== */}
      {/* MODAL 6: XEM CHI TIẾT NHẬT KÝ EMAIL ĐÃ GỬI                     */}
      {/* ============================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 bg-[#2C241E]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E8DFD8] shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#E8DFD8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C241E]">Chi tiết Email Đã Gửi</h3>
                  <span className="text-[11px] text-[#73675F]">
                    Gửi lúc {new Date(selectedLog.sentAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-[#8C7A6B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#73675F] w-24">Người nhận:</span>
                  <span className="font-semibold text-[#2C241E]">
                    {selectedLog.recipientName ? `${selectedLog.recipientName} <${selectedLog.recipientEmail}>` : selectedLog.recipientEmail}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#73675F] w-24">Tiêu đề:</span>
                  <span className="font-semibold text-[#985018]">{selectedLog.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#73675F] w-24">Mã Template:</span>
                  <span className="font-mono text-[#554B42]">{selectedLog.templateId || 'Tùy biến'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#73675F] w-24">Trạng thái:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#73675F] block mb-2">Nội dung HTML thực tế:</span>
                <div
                  className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8DFD8] text-xs max-h-80 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedLog.bodyHtml }}
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#E8DFD8] bg-[#FAF8F5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteEmailLog(selectedLog.id)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-bold hover:bg-rose-100"
              >
                Xóa bản ghi này
              </button>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-white border border-[#E8DFD8] text-xs font-bold rounded-xl text-[#73675F]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
