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
  Plus,
  Pencil,
  Trash2,
  X,
  Globe,
  Play,
  Send,
  Check,
} from 'lucide-react';
import { PortalContacts, PortalTaxonomyItem } from '../../types/shared_types';
import { portalService } from '../../services';

export const PortalContactsTab: React.FC = () => {
  const [contacts, setContacts] = useState<PortalContacts | null>(null);
  const [channels, setChannels] = useState<PortalTaxonomyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PortalTaxonomyItem | null>(null);
  const [channelForm, setChannelForm] = useState({
    name: '',
    code: 'HOTLINE',
    iconName: 'phone',
    description: '',
    sortOrder: 1,
    isActive: true,
  });
  const [isSavingChannel, setIsSavingChannel] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoadError('');
    setIsLoading(true);
    try {
      const [resContacts, resChannels] = await Promise.all([
        portalService.getContacts(),
        portalService.getTaxonomies('CONTACT_CHANNEL'),
      ]);
      if (resContacts.data) {
        setContacts(resContacts.data);
      }
      if (resChannels.data) {
        setChannels(resChannels.data);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContacts = async (e: React.FormEvent) => {
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

  const handleOpenAddChannel = () => {
    setEditingChannel(null);
    setChannelForm({
      name: '',
      code: 'HOTLINE',
      iconName: 'phone',
      description: '',
      sortOrder: channels.length + 1,
      isActive: true,
    });
    setIsChannelModalOpen(true);
  };

  const handleOpenEditChannel = (channel: PortalTaxonomyItem) => {
    setEditingChannel(channel);
    setChannelForm({
      name: channel.name,
      code: channel.code,
      iconName: channel.iconName || 'phone',
      description: channel.description || '',
      sortOrder: channel.sortOrder,
      isActive: channel.isActive,
    });
    setIsChannelModalOpen(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.name.trim() || !channelForm.description.trim()) {
      showToast('Vui lòng nhập tên kênh và đường dẫn hoặc số điện thoại.', 'error');
      return;
    }

    setIsSavingChannel(true);
    try {
      const payload: Partial<PortalTaxonomyItem> = {
        type: 'CONTACT_CHANNEL',
        code: channelForm.code.trim().toUpperCase(),
        name: channelForm.name.trim(),
        description: channelForm.description.trim(),
        iconName: channelForm.iconName.trim(),
        sortOrder: Number(channelForm.sortOrder) || 1,
        isActive: Boolean(channelForm.isActive),
      };
      if (editingChannel?.id) {
        payload.id = editingChannel.id;
      }

      const res = await portalService.saveTaxonomy(payload);
      if (res.success && res.data) {
        if (editingChannel?.id) {
          setChannels(channels.map((c) => (c.id === editingChannel.id ? res.data! : c)));
          showToast(`Cập nhật kênh "${res.data.name}" thành công!`, 'success');
        } else {
          setChannels([...channels, res.data]);
          showToast(`Thêm mới kênh "${res.data.name}" thành công!`, 'success');
        }
        setIsChannelModalOpen(false);
      } else {
        showToast(res.message || 'Lỗi khi lưu kênh liên hệ.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu kênh liên hệ.', 'error');
    } finally {
      setIsSavingChannel(false);
    }
  };

  const handleDeleteChannel = async (channel: PortalTaxonomyItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kênh "${channel.name}" không?`)) {
      return;
    }
    try {
      const res = await portalService.deleteTaxonomy(channel.id);
      if (res.success) {
        setChannels(channels.filter((c) => c.id !== channel.id));
        showToast(`Đã xóa kênh "${channel.name}" thành công!`, 'success');
      } else {
        showToast(res.message || 'Lỗi khi xóa kênh liên hệ.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa kênh liên hệ.', 'error');
    }
  };

  const handleToggleChannelActive = async (channel: PortalTaxonomyItem) => {
    try {
      const nextActive = !channel.isActive;
      const res = await portalService.saveTaxonomy({
        id: channel.id,
        type: 'CONTACT_CHANNEL',
        code: channel.code,
        name: channel.name,
        description: channel.description,
        iconName: channel.iconName,
        sortOrder: channel.sortOrder,
        isActive: nextActive,
      });
      if (res.success && res.data) {
        setChannels(channels.map((c) => (c.id === channel.id ? res.data! : c)));
        showToast(`Đã ${nextActive ? 'bật' : 'tắt'} hiển thị kênh "${channel.name}".`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi đổi trạng thái kênh.', 'error');
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const renderChannelIcon = (iconName?: string, code?: string) => {
    const key = (iconName || code || '').toLowerCase();
    if (key.includes('phone') || key.includes('hotline')) {
      return <Phone className="w-4 h-4 text-emerald-600" />;
    }
    if (key.includes('youtube')) {
      return <Play className="w-4 h-4 text-rose-600 fill-rose-600" />;
    }
    if (key.includes('globe') || key.includes('web')) {
      return <Globe className="w-4 h-4 text-sky-600" />;
    }
    if (key.includes('zalo')) {
      return <span className="w-4 h-4 rounded bg-[#0068FF] text-white font-bold text-[9px] flex items-center justify-center">Z</span>;
    }
    if (key.includes('facebook') || key.includes('fanpage')) {
      return <span className="w-4 h-4 rounded bg-[#1877F2] text-white font-bold text-[9px] flex items-center justify-center">f</span>;
    }
    if (key.includes('messenger')) {
      return <Send className="w-4 h-4 text-[#0084FF]" />;
    }
    if (key.includes('tiktok')) {
      return <span className="w-4 h-4 rounded bg-black text-white font-bold text-[9px] flex items-center justify-center">Tk</span>;
    }
    return <Share2 className="w-4 h-4 text-[#985018]" />;
  };

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <p>{loadError}</p>
        <button className="mt-2 underline" type="button" onClick={loadAllData}>
          Thử tải lại
        </button>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8DFD8] p-6 shadow-xs space-y-6">
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

            <form onSubmit={handleSaveContacts} className="space-y-5">
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

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#985018]">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>2. KÊNH TRÒ CHUYỆN & MẠNG XÃ HỘI (ZALO, MESSENGER, TIKTOK, YOUTUBE)</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1">Kênh YouTube Official</label>
                    <input
                      type="url"
                      value={contacts.youtubeUrl || ''}
                      onChange={(e) => setContacts({ ...contacts, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/@mldvietnam"
                      className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1">Website Trang chủ chính thức</label>
                    <input
                      type="url"
                      value={(contacts as any).websiteUrl || 'https://mldvietnam.com'}
                      onChange={(e) => setContacts({ ...contacts, websiteUrl: e.target.value } as any)}
                      placeholder="https://mldvietnam.com"
                      className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                </div>
              </div>

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

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#804213] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? 'Đang lưu thiết lập...' : 'Lưu & Đồng bộ thông tin cơ bản'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8DFD8] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                    <Share2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-[#2C241E]">Danh mục Kênh liên hệ tùy biến (Thêm, Sửa, Xóa)</h3>
                </div>
                <p className="text-xs text-[#73675F] mt-0.5">
                  Thêm không giới hạn các kênh liên hệ, hotline chi nhánh, mạng xã hội để hiển thị trực tiếp trên Mobile App.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddChannel}
                className="px-3.5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm kênh liên hệ</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {channels.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#E8DFD8] rounded-xl">
                  <span className="text-xs text-[#73675F]">Chưa có kênh liên hệ tùy biến nào. Bấm nút phía trên để thêm mới.</span>
                </div>
              ) : (
                channels.map((ch) => (
                  <div
                    key={ch.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      ch.isActive
                        ? 'bg-white border-[#E8DFD8] shadow-2xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] border border-[#EFE4D9] flex items-center justify-center shrink-0">
                        {renderChannelIcon(ch.iconName, ch.code)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2C241E] truncate">{ch.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                            {ch.code}
                          </span>
                          <span className="text-[10px] text-[#73675F]">Thứ tự: {ch.sortOrder}</span>
                        </div>
                        <div className="text-[11px] text-[#73675F] truncate max-w-[320px] font-mono mt-0.5">
                          {ch.description || 'Chưa cài đặt liên kết'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleChannelActive(ch)}
                        title={ch.isActive ? 'Tắt hiển thị trên App' : 'Bật hiển thị trên App'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          ch.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {ch.isActive ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditChannel(ch)}
                        title="Chỉnh sửa kênh"
                        className="p-1.5 rounded-lg text-[#985018] hover:bg-[#FAF0E4] border border-[#E8DFD8] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(ch)}
                        title="Xóa kênh"
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl border border-[#E8DFD8] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFE4D9]">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#985018]" />
              <h4 className="text-xs font-bold text-[#2C241E]">Xem trước Kênh liên hệ trên App Mobile</h4>
            </div>
            <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] font-bold px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              Realtime Sync
            </span>
          </div>

          <p className="text-[11px] text-[#73675F] leading-relaxed">
            Mô phỏng hiển thị các kênh liên hệ và mạng xã hội trên trang chủ và hộp thoại tư vấn khi người dùng tương tác trên Mobile App.
          </p>

          <div className="max-w-[320px] mx-auto bg-white rounded-3xl p-5 shadow-md border border-slate-200 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F6ED] text-[#00693F] rounded-full text-[11px] font-bold tracking-tight">
              <Sparkles className="w-3 h-3 text-[#00693F]" />
              <span>{contacts.consultationBadgeText || 'TƯ VẤN Y KHOA MLD'}</span>
            </div>

            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-[#004890] to-[#0EA5E9] flex items-center justify-center text-white shadow-sm ring-4 ring-[#E8F6ED]">
              <Phone className="w-6 h-6" />
            </div>

            <div>
              <h5 className="text-sm font-bold text-slate-800">Liên hệ Chuyên viên Y khoa</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">Phục hồi phù bạch huyết chuẩn Vodder</p>
            </div>

            <div className="space-y-2 text-left">
              {channels
                .filter((c) => c.isActive)
                .slice(0, 4)
                .map((ch) => (
                  <div key={ch.id} className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        {renderChannelIcon(ch.iconName, ch.code)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{ch.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{ch.description}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#985018] bg-white px-2 py-1 rounded-lg border border-[#E8DFD8] shrink-0">
                      Mở ngay
                    </span>
                  </div>
                ))}
            </div>

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

      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8DFD8] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE4D9]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                  <Share2 className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-[#2C241E]">
                  {editingChannel ? 'Chỉnh sửa Kênh liên hệ' : 'Thêm Kênh liên hệ mới'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChannel} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Tên hiển thị kênh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  placeholder="VD: Hotline Chi nhánh Hà Nội, Zalo Bác sĩ Trưởng..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Mã phân loại</label>
                  <select
                    value={channelForm.code}
                    onChange={(e) => {
                      const nextCode = e.target.value;
                      let defaultIcon = 'phone';
                      if (nextCode === 'ZALO') defaultIcon = 'zalo';
                      else if (nextCode === 'FACEBOOK') defaultIcon = 'facebook';
                      else if (nextCode === 'MESSENGER') defaultIcon = 'messenger';
                      else if (nextCode === 'TIKTOK') defaultIcon = 'tiktok';
                      else if (nextCode === 'YOUTUBE') defaultIcon = 'youtube';
                      else if (nextCode === 'WEBSITE') defaultIcon = 'globe';
                      else if (nextCode === 'INSTAGRAM') defaultIcon = 'instagram';
                      else if (nextCode === 'TELEGRAM') defaultIcon = 'chat';
                      setChannelForm({ ...channelForm, code: nextCode, iconName: defaultIcon });
                    }}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="HOTLINE">HOTLINE (Điện thoại)</option>
                    <option value="ZALO">ZALO (Chat Zalo)</option>
                    <option value="FACEBOOK">FACEBOOK (Fanpage)</option>
                    <option value="MESSENGER">MESSENGER (Chat FB)</option>
                    <option value="TIKTOK">TIKTOK (Video ngắn)</option>
                    <option value="YOUTUBE">YOUTUBE (Video dài)</option>
                    <option value="WEBSITE">WEBSITE (Trang web)</option>
                    <option value="INSTAGRAM">INSTAGRAM (Hình ảnh)</option>
                    <option value="TELEGRAM">TELEGRAM (Hỗ trợ)</option>
                    <option value="OTHER">KHÁC (Tùy biến)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Icon đại diện</label>
                  <select
                    value={channelForm.iconName}
                    onChange={(e) => setChannelForm({ ...channelForm, iconName: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="phone">Điện thoại (Phone)</option>
                    <option value="zalo">Zalo Icon</option>
                    <option value="facebook">Facebook Icon</option>
                    <option value="messenger">Messenger Icon</option>
                    <option value="tiktok">TikTok Icon</option>
                    <option value="youtube">YouTube Icon</option>
                    <option value="globe">Website (Globe)</option>
                    <option value="instagram">Instagram</option>
                    <option value="chat">Tin nhắn (Chat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Đường dẫn (URL) hoặc Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={channelForm.description}
                  onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                  placeholder="VD: 096.7786.399 hoặc https://zalo.me/..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="1"
                    value={channelForm.sortOrder}
                    onChange={(e) => setChannelForm({ ...channelForm, sortOrder: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2C241E]">
                    <input
                      type="checkbox"
                      checked={channelForm.isActive}
                      onChange={(e) => setChannelForm({ ...channelForm, isActive: e.target.checked })}
                      className="rounded text-[#985018] focus:ring-[#985018]"
                    />
                    <span>Kích hoạt hiển thị</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingChannel}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  {isSavingChannel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingChannel ? 'Lưu cập nhật' : 'Thêm kênh'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
