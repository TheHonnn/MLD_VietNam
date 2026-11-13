import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageCircle,
  Share2,
  Clock,
  MapPin,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { PortalContacts } from '../../types/shared_types';
import { portalService } from '../../services';

export const PortalContactsTab: React.FC = () => {
  const [contacts, setContacts] = useState<PortalContacts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const res = await portalService.getContacts();
      if (res.data) {
        setContacts(res.data);
      }
    } catch (err) {
      console.error('Error loading portal contacts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contacts) return;

    setIsSaving(true);
    try {
      const res = await portalService.updateContacts(contacts);
      if (res.success && res.data) {
        setContacts(res.data);
        showToast('Cập nhật thông tin liên hệ và mạng xã hội thành công!', 'success');
      } else {
        showToast(res.message || 'Lỗi khi lưu thông tin liên hệ.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (isLoading || !contacts) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 text-[#985018] animate-spin" />
        <span className="text-xs text-[#73675F] font-medium">Đang tải thông tin liên hệ hệ thống...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold shadow-sm transition-all ${
            toastType === 'success'
              ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: 60% Form Settings - 40% Live App Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8DFD8] p-6 shadow-xs space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                <Phone className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-[#2C241E]">Kênh liên hệ & Mạng xã hội toàn hệ thống</h3>
            </div>
            <p className="text-xs text-[#73675F]">
              Cấu hình hotline, các liên kết mạng xã hội chính thức để đồng bộ lên nút Gọi, Chat Zalo/Messenger trên App Flutter.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Group 1: Hotline Tổng đài */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#985018]">
                <Phone className="w-3.5 h-3.5" />
                <span>1. TỔNG ĐÀI & HOTLINE 24/7</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">
                    Hotline CSKH & Đặt lịch <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={contacts.hotlineSupport}
                      onChange={(e) => setContacts({ ...contacts, hotlineSupport: e.target.value })}
                      placeholder="096.7786.399"
                      className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] font-semibold"
                    />
                    <a
                      href={`tel:${contacts.hotlineSupport.replace(/\D/g, '')}`}
                      className="px-2.5 py-2 bg-[#FAF0E4] hover:bg-[#EFE4D9] text-[#985018] rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                      title="Gọi thử nghiệm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Hotline Đào tạo & Tuyển sinh</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={contacts.hotlineTraining}
                      onChange={(e) => setContacts({ ...contacts, hotlineTraining: e.target.value })}
                      placeholder="096.7786.399"
                      className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                    <a
                      href={`tel:${contacts.hotlineTraining.replace(/\D/g, '')}`}
                      className="px-2.5 py-2 bg-[#FAF0E4] hover:bg-[#EFE4D9] text-[#985018] rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                      title="Gọi thử nghiệm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: Chat & Mạng xã hội */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#985018]">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>2. KÊNH TRÒ CHUYỆN & MẠNG XÃ HỘI (ZALO, MESSENGER, TIKTOK)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Đường dẫn Zalo Official Account (OA) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    required
                    value={contacts.zaloOaUrl}
                    onChange={(e) => setContacts({ ...contacts, zaloOaUrl: e.target.value })}
                    placeholder="https://zalo.me/1424469774232439257?src=qr"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                  {contacts.zaloOaUrl && (
                    <a
                      href={contacts.zaloOaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-2 bg-[#FAF0E4] hover:bg-[#EFE4D9] text-[#985018] rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                      title="Mở Zalo kiểm tra"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Đường dẫn Messenger Fanpage (m.me) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    required
                    value={contacts.messengerUrl}
                    onChange={(e) => setContacts({ ...contacts, messengerUrl: e.target.value })}
                    placeholder="https://m.me/hebachhuyet.mldvietnam"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                  {contacts.messengerUrl && (
                    <a
                      href={contacts.messengerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-2 bg-[#FAF0E4] hover:bg-[#EFE4D9] text-[#985018] rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                      title="Mở Messenger kiểm tra"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Link Facebook Fanpage</label>
                  <input
                    type="url"
                    value={contacts.fanpageUrl}
                    onChange={(e) => setContacts({ ...contacts, fanpageUrl: e.target.value })}
                    placeholder="https://facebook.com/hebachhuyet.mldvietnam"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Kênh TikTok Official</label>
                  <input
                    type="url"
                    value={contacts.tiktokUrl}
                    onChange={(e) => setContacts({ ...contacts, tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@mldvietnam"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Thông tin Vận hành & Địa chỉ */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#985018]">
                <Clock className="w-3.5 h-3.5" />
                <span>3. THỜI GIAN LÀM VIỆC & ĐỊA CHỈ TRỤ SỞ CHÍNH</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Khung giờ phục vụ hiển thị</label>
                  <input
                    type="text"
                    value={contacts.workingHours}
                    onChange={(e) => setContacts({ ...contacts, workingHours: e.target.value })}
                    placeholder="09:00 – 20:00 hàng ngày"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Nhãn Huy hiệu tư vấn y khoa</label>
                  <input
                    type="text"
                    value={contacts.consultationBadgeText}
                    onChange={(e) => setContacts({ ...contacts, consultationBadgeText: e.target.value })}
                    placeholder="TƯ VẤN Y KHOA MLD"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Địa chỉ Trụ sở chính & Viện đào tạo</label>
                <textarea
                  rows={2}
                  value={contacts.headquartersAddress}
                  onChange={(e) => setContacts({ ...contacts, headquartersAddress: e.target.value })}
                  placeholder="Chi nhánh Quận 3, 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#985018] hover:bg-[#804213] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Đang lưu thiết lập...' : 'Lưu & Đồng bộ toàn hệ thống'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Preview: 5 cols (Live Phone Mockup of Popup Liên hệ) */}
        <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFE4D9]">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#985018]" />
              <h4 className="text-xs font-bold text-[#2C241E]">Xem trước Thẻ Liên hệ trên App</h4>
            </div>
            <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] font-bold px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              Realtime Sync
            </span>
          </div>

          <p className="text-[11px] text-[#73675F] leading-relaxed">
            Mô phỏng hộp thoại hiển thị ở giữa màn hình khi người dùng bấm nút <span className="font-semibold text-[#00693F]">"Liên hệ"</span> tại trang Dịch vụ / Sản phẩm MLD.
          </p>

          {/* Phone Dialog Frame */}
          <div className="max-w-[320px] mx-auto bg-white rounded-3xl p-5 shadow-md border border-slate-200 text-center space-y-4">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F6ED] text-[#00693F] rounded-full text-[11px] font-bold tracking-tight">
              <Sparkles className="w-3 h-3 text-[#00693F]" />
              <span>{contacts.consultationBadgeText || 'TƯ VẤN Y KHOA MLD'}</span>
            </div>

            {/* Avatar Consultant */}
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-[#004890] to-[#0EA5E9] flex items-center justify-center text-white shadow-sm ring-4 ring-[#E8F6ED]">
              <Phone className="w-6 h-6" />
            </div>

            <div>
              <h5 className="text-sm font-bold text-slate-800">Liên hệ Chuyên viên Y khoa</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">Phục hồi phù bạch huyết chuẩn Vodder</p>
            </div>

            {/* Channel Buttons */}
            <div className="space-y-2 text-left">
              {/* Zalo Button */}
              <div className="p-2.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0068FF] text-white flex items-center justify-center font-bold text-[10px]">
                    Zalo
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Zalo Official Account</div>
                    <div className="text-[10px] text-slate-500">Phản hồi trong 1-3 phút</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#00693F] bg-white px-2 py-1 rounded-lg border border-[#BBF7D0]">
                  Chat ngay
                </span>
              </div>

              {/* Messenger Button */}
              <div className="p-2.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0084FF] text-white flex items-center justify-center font-bold text-[10px]">
                    FB
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Messenger Fanpage</div>
                    <div className="text-[10px] text-slate-500">Tư vấn liệu trình miễn phí</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#004890] bg-white px-2 py-1 rounded-lg border border-[#BFDBFE]">
                  Nhắn tin
                </span>
              </div>
            </div>

            {/* Hotline Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-[#004890]">
              <Phone className="w-3.5 h-3.5 text-[#00693F]" />
              <span>Hotline: {contacts.hotlineSupport || '096.7786.399'}</span>
            </div>

            <div className="text-[10px] text-slate-400">
              Giờ làm việc: {contacts.workingHours || '09:00 – 20:00 hàng ngày'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
