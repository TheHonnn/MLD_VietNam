import React, { useEffect, useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Mail,
  Printer,
  Download,
  Calendar,
  Sparkles,
  Phone,
} from 'lucide-react';
import { toast } from '../common/Toast';
import { getAdminAuthToken } from '../../services/supabaseClient';

export interface ShareJournalItem {
  id: string;
  sessionNumber?: number | string;
  sessionDate?: string;
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  serviceName?: string;
  branchName?: string;
  technicianName?: string;
}

export interface ShareJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: ShareJournalItem | null;
}

export const ShareJournalModal: React.FC<ShareJournalModalProps> = ({
  isOpen,
  onClose,
  journal,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [linkExpiresAt, setLinkExpiresAt] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  useEffect(() => {
    if (!isOpen || !journal) {
      setPublicUrl('');
      return;
    }
    let active = true;
    const createLink = async () => {
      const token = getAdminAuthToken();
      if (!token) {
        setPublicUrl('');
        return;
      }
      setIsCreatingLink(true);
      try {
        const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '');
        const response = await fetch(`${apiBase}/admin/treatment-journals/${encodeURIComponent(journal.id)}/share-link`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.data?.token) throw new Error(payload?.message || 'Không thể tạo liên kết chia sẻ.');
        if (active) {
          setPublicUrl(`${origin}/treatment-journal/${payload.data.token}`);
          setLinkExpiresAt(payload.data.expiresAt);
        }
      } catch (error: any) {
        if (active) {
          setPublicUrl('');
          toast.error('Không thể tạo liên kết', error?.message || 'Vui lòng thử lại.');
        }
      } finally {
        if (active) setIsCreatingLink(false);
      }
    };
    setPublicUrl('');
    void createLink();
    return () => { active = false; };
  }, [isOpen, journal?.id, origin]);

  if (!isOpen || !journal) return null;

  const defaultMessage = `Kính gửi Quý khách ${journal.customerName || ''},\nMLD Vietnam xin gửi Quý khách Phiếu theo dõi Nhật ký chăm sóc & kết quả buổi trị liệu (Buổi ${journal.sessionNumber || 1}) ngày ${journal.sessionDate || 'vừa qua'}.\nQuý khách có thể xem chi tiết hình ảnh đối chiếu Trước - Sau và Lời dặn chuyên viên tại đường link:\n${publicUrl}\n\nHotline hỗ trợ MLD Vietnam: 1900 6868. Chúc Quý khách một ngày nhiều niềm vui!`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedLink(true);
      toast.success('Đã sao chép link nhật ký điều trị!', 'Bạn có thể dán link vào Zalo, SMS hoặc Email.');
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(defaultMessage).then(() => {
      setCopiedMessage(true);
      toast.success('Đã sao chép nội dung tin nhắn!', 'Nội dung đã được định dạng sẵn kèm link.');
      setTimeout(() => setCopiedMessage(false), 2500);
    });
  };

  const handleOpenPublicView = () => {
    if (publicUrl) window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRevokeLink = async () => {
    const token = getAdminAuthToken();
    if (!token) return;
    const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '');
    try {
      const response = await fetch(`${apiBase}/admin/treatment-journals/${encodeURIComponent(journal.id)}/revoke-share-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'Không thể thu hồi liên kết.');
      setPublicUrl('');
      setLinkExpiresAt('');
      toast.success('Đã thu hồi liên kết nhật ký.');
    } catch (error: any) {
      toast.error('Lỗi thu hồi liên kết', error?.message || 'Vui lòng thử lại.');
    }
  };

  const handleOpenZaloChat = () => {
    if (journal.customerPhone) {
      const cleanPhone = journal.customerPhone.replace(/\D/g, '');
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
    } else {
      handleCopyMessage();
      toast.info('Chưa có SĐT khách hàng', 'Đã sao chép tin nhắn để bạn dán vào Zalo thủ công.');
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(
      `[MLD Vietnam] Phiếu kết quả Nhật ký điều trị - Buổi ${journal.sessionNumber || 1}`
    );
    const body = encodeURIComponent(defaultMessage);
    const email = journal.customerEmail || '';
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER */}
        <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF0E6] border border-[#EADAC9] flex items-center justify-center text-[#8A4F23]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#2C241E]">
                Chia sẻ & Xuất Phiếu Nhật Ký Điều Trị
              </h3>
              <p className="text-[11px] text-[#8A796B] mt-0.5">
                Buổi {journal.sessionNumber || 1} · {journal.customerName || 'Khách hàng'} · {journal.sessionDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#EFE4D9] text-[#73675F] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4 text-xs">
          {/* 1. PUBLIC LINK BOX */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#2C241E] flex items-center justify-between">
              <span>Liên kết riêng, tự hết hạn sau 30 ngày:</span>
              <button
                type="button"
                onClick={handleOpenPublicView}
                disabled={!publicUrl}
                className="text-[#8A4F23] hover:underline disabled:opacity-40 flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
              >
                Mở xem <ExternalLink className="w-3 h-3" />
              </button>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={isCreatingLink ? 'Đang tạo liên kết bảo mật...' : publicUrl || 'Chưa có liên kết hoạt động'}
                className="w-full px-3 py-2 bg-[#F9F6F2] border border-[#E8DFD8] rounded-xl text-xs font-mono text-[#5C4D42] select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!publicUrl}
                className="px-3.5 py-2 bg-[#8A4F23] hover:bg-[#723F1A] text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Đã chép' : 'Chép link'}</span>
              </button>
            </div>
            {linkExpiresAt && <div className="flex items-center justify-between text-[10px] text-[#73675F]">
              <span>Hết hạn: {new Date(linkExpiresAt).toLocaleString('vi-VN')}</span>
              <button type="button" onClick={handleRevokeLink} className="text-red-700 hover:underline">Thu hồi liên kết</button>
            </div>}
          </div>

          {/* 2. PRE-FORMATTED MESSAGE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#2C241E]">
                Mẫu tin nhắn gửi kèm link (SMS / Zalo):
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[#8A4F23] hover:underline flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-[#2E7D32]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'Đã sao chép' : 'Sao chép tin nhắn'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              readOnly
              value={defaultMessage}
              className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[11.5px] text-[#4A3B32] leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* 3. MULTI-CHANNEL ACTIONS */}
          <div className="space-y-2 pt-1">
            <span className="font-bold text-[#2C241E] block">Kênh gửi & Xuất bản mềm:</span>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Zalo OA / Chat */}
              <button
                type="button"
                onClick={handleOpenZaloChat}
                className="p-2.5 rounded-xl border border-[#D5E4F5] bg-[#F2F7FD] hover:bg-[#E6F0FA] text-[#1D63B8] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Gửi qua Zalo OA/Chat</span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={handleSendEmail}
                className="p-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] hover:bg-[#F3ECE4] text-[#4A3B32] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-[#8A4F23]" />
                <span>Gửi qua Email</span>
              </button>

              {/* View / Print PDF */}
              <button
                type="button"
                onClick={handleOpenPublicView}
                className="p-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] hover:bg-[#F3ECE4] text-[#4A3B32] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer col-span-2"
              >
                <Printer className="w-4 h-4 text-[#8A4F23]" />
                <span>Xem bản in & Tải file PDF trực tiếp</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-[#EFE4D9] bg-[#FAF8F5] flex items-center justify-between text-xs">
          <span className="text-[#8A796B] text-[11px]">
            Hệ thống MLD tự động ghi nhận nhật ký vào hồ sơ y khoa.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl font-bold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
