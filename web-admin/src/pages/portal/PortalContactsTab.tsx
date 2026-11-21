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
  const [timeSlots, setTimeSlots] = useState<PortalTaxonomyItem[]>([]);
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

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<PortalTaxonomyItem | null>(null);
  const [slotForm, setSlotForm] = useState({
    startTime: '12:00',
    endTime: '13:00',
    description: '',
    isActive: true,
  });
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const sortTimeSlotList = (list: PortalTaxonomyItem[]) => {
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  };

  const loadAllData = async () => {
    setLoadError('');
    setIsLoading(true);
    try {
      const [resContacts, resChannels, resSlots] = await Promise.all([
        portalService.getContacts(),
        portalService.getTaxonomies('CONTACT_CHANNEL'),
        portalService.getTaxonomies('BOOKING_TIME_SLOT'),
      ]);
      if (resContacts.data) {
        setContacts(resContacts.data);
      }
      if (resChannels.data) {
        setChannels(resChannels.data);
      }
      if (resSlots.data) {
        setTimeSlots(sortTimeSlotList(resSlots.data));
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

  const buildUniqueChannelCode = (baseCode: string, excludeId?: string) => {
    const cleanBase = baseCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') || 'CUSTOM';
    const existingCodes = new Set(
      channels.filter((c) => c.id !== excludeId).map((c) => c.code.trim().toUpperCase())
    );
    if (!existingCodes.has(cleanBase)) return cleanBase;
    let index = 2;
    while (existingCodes.has(`${cleanBase}_${index}`)) {
      index += 1;
    }
    return `${cleanBase}_${index}`;
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.name.trim() || !channelForm.description.trim()) {
      showToast('Vui lòng nhập tên kênh và đường dẫn hoặc số điện thoại.', 'error');
      return;
    }

    setIsSavingChannel(true);
    try {
      const normalizedCode = editingChannel?.id
        ? editingChannel.code
        : buildUniqueChannelCode(channelForm.code);
      const payload: Partial<PortalTaxonomyItem> = {
        type: 'CONTACT_CHANNEL',
        code: normalizedCode,
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

  const parseSlotRange = (rawName: string): { startTime: string; endTime: string } => {
    const cleaned = rawName.replace('–', '-');
    const parts = cleaned.split('-').map((p) => p.trim().slice(0, 5));
    return {
      startTime: /^\d{2}:\d{2}$/.test(parts[0] || '') ? parts[0] : '12:00',
      endTime: /^\d{2}:\d{2}$/.test(parts[1] || '') ? parts[1] : '13:00',
    };
  };

  const timeToSortMinutes = (startTime: string): number => {
    const [hStr, mStr] = startTime.split(':');
    const h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  };

  const buildSlotCode = (startTime: string, endTime: string, excludeId?: string): string => {
    const base = `SLOT_${startTime.replace(':', '')}_${endTime.replace(':', '')}`;
    const existing = new Set(timeSlots.filter((s) => s.id !== excludeId).map((s) => s.code.toUpperCase()));
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}_${index}`)) {
      index += 1;
    }
    return `${base}_${index}`;
  };

  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setSlotForm({
      startTime: '12:00',
      endTime: '13:00',
      description: '',
      isActive: true,
    });
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: PortalTaxonomyItem) => {
    const { startTime, endTime } = parseSlotRange(slot.name);
    setEditingSlot(slot);
    setSlotForm({
      startTime,
      endTime,
      description: slot.description || '',
      isActive: slot.isActive,
    });
    setIsSlotModalOpen(true);
  };

  const saveBookingSlot = async (
    startTime: string,
    endTime: string,
    description: string,
    isActive: boolean,
    existing?: PortalTaxonomyItem | null
  ): Promise<boolean> => {
    const s1 = startTime.slice(0, 5);
    const s2 = endTime.slice(0, 5);
    if (!s1 || !s2 || s1 >= s2) {
      showToast('Giờ bắt đầu phải nhỏ hơn giờ kết thúc!', 'error');
      return false;
    }
    const label = `${s1} - ${s2}`;
    if (!existing && timeSlots.some((s) => s.name.trim() === label)) {
      showToast(`Khung giờ "${label}" đã tồn tại.`, 'error');
      return false;
    }
    const payload: Partial<PortalTaxonomyItem> = {
      type: 'BOOKING_TIME_SLOT',
      code: existing?.id ? existing.code : buildSlotCode(s1, s2),
      name: label,
      description: description.trim(),
      iconName: 'schedule',
      sortOrder: timeToSortMinutes(s1),
      isActive: Boolean(isActive),
    };
    if (existing?.id) {
      payload.id = existing.id;
    }
    const res = await portalService.saveTaxonomy(payload);
    if (res.success && res.data) {
      if (existing?.id) {
        setTimeSlots((prev) => sortTimeSlotList(prev.map((s) => (s.id === existing.id ? res.data! : s))));
        showToast(`Đã cập nhật khung giờ "${res.data.name}".`, 'success');
      } else {
        setTimeSlots((prev) => sortTimeSlotList([...prev, res.data!]));
        showToast(`Đã thêm khung giờ "${res.data.name}".`, 'success');
      }
      return true;
    }
    showToast(res.message || 'Lỗi khi lưu khung giờ đặt lịch.', 'error');
    return false;
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSlot(true);
    try {
      const ok = await saveBookingSlot(
        slotForm.startTime,
        slotForm.endTime,
        slotForm.description,
        slotForm.isActive,
        editingSlot
      );
      if (ok) {
        setIsSlotModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu khung giờ đặt lịch.', 'error');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleQuickAddSlot = async (startTime: string, endTime: string, description = '') => {
    setIsSavingSlot(true);
    try {
      await saveBookingSlot(startTime, endTime, description, true, null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thêm nhanh khung giờ.', 'error');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleSeedDefaultSlots = async () => {
    const defaults: Array<[string, string]> = [
      ['08:00', '09:00'],
      ['09:00', '10:00'],
      ['10:00', '11:00'],
      ['11:00', '12:00'],
      ['12:00', '13:00'],
      ['13:00', '14:00'],
      ['14:00', '15:00'],
      ['15:00', '16:00'],
      ['16:00', '17:00'],
      ['17:00', '18:00'],
      ['18:00', '19:00'],
      ['19:00', '20:00'],
    ];
    setIsSavingSlot(true);
    try {
      let addedCount = 0;
      const existingNames = new Set(timeSlots.map((s) => s.name.trim()));
      const created: PortalTaxonomyItem[] = [];
      for (const [s1, s2] of defaults) {
        const label = `${s1} - ${s2}`;
        if (existingNames.has(label)) continue;
        const res = await portalService.saveTaxonomy({
          type: 'BOOKING_TIME_SLOT',
          code: buildSlotCode(s1, s2),
          name: label,
          description: '',
          iconName: 'schedule',
          sortOrder: timeToSortMinutes(s1),
          isActive: true,
        });
        if (res.success && res.data) {
          created.push(res.data);
          existingNames.add(label);
          addedCount += 1;
        }
      }
      if (created.length > 0) {
        setTimeSlots((prev) => sortTimeSlotList([...prev, ...created]));
        showToast(`Đã khởi tạo ${addedCount} khung giờ đặt lịch chuẩn.`, 'success');
      } else {
        showToast('Tất cả khung giờ chuẩn đã có sẵn.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi khởi tạo khung giờ chuẩn.', 'error');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleToggleSlotActive = async (slot: PortalTaxonomyItem) => {
    try {
      const nextActive = !slot.isActive;
      const res = await portalService.saveTaxonomy({
        id: slot.id,
        type: 'BOOKING_TIME_SLOT',
        code: slot.code,
        name: slot.name,
        description: slot.description,
        iconName: slot.iconName || 'schedule',
        sortOrder: slot.sortOrder,
        isActive: nextActive,
      });
      if (res.success && res.data) {
        setTimeSlots((prev) => sortTimeSlotList(prev.map((s) => (s.id === slot.id ? res.data! : s))));
        showToast(`Đã ${nextActive ? 'bật' : 'ẩn'} khung giờ "${slot.name}" trên App Mobile.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi đổi trạng thái khung giờ.', 'error');
    }
  };

  const handleDeleteSlot = async (slot: PortalTaxonomyItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khung giờ "${slot.name}" không?`)) {
      return;
    }
    try {
      const res = await portalService.deleteTaxonomy(slot.id);
      if (res.success) {
        setTimeSlots((prev) => prev.filter((s) => s.id !== slot.id));
        showToast(`Đã xóa khung giờ "${slot.name}"!`, 'success');
      } else {
        showToast(res.message || 'Lỗi khi xóa khung giờ.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa khung giờ.', 'error');
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
    if (key.includes('instagram')) {
      return <span className="w-4 h-4 rounded bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white font-bold text-[9px] flex items-center justify-center">Ig</span>;
    }
    if (key.includes('telegram')) {
      return <Send className="w-4 h-4 text-[#229ED9]" />;
    }
    if (key.includes('threads')) {
      return <span className="w-4 h-4 rounded bg-neutral-900 text-white font-bold text-[9px] flex items-center justify-center">@</span>;
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

          <div className="bg-white rounded-2xl border border-[#E8DFD8] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                    <Clock className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-[#2C241E]">Khung giờ dự hẹn đặt lịch (Thêm, Sửa, Xóa)</h3>
                </div>
                <p className="text-xs text-[#73675F] mt-0.5">
                  Quản lý các khung giờ khách được chọn khi đặt lịch trị liệu &amp; thăm khám trên App Mobile (VD: 12:00 - 13:00, 13:00 - 14:00).
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddSlot}
                className="px-3.5 py-2 bg-[#985018] hover:bg-[#804213] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm khung giờ</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9]">
              <span className="text-[11px] font-bold text-[#985018]">Thêm nhanh:</span>
              <button
                type="button"
                disabled={isSavingSlot}
                onClick={() => handleQuickAddSlot('12:00', '13:00', 'Ca trưa')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF0E4] border border-[#E8DFD8] text-[11px] font-bold text-[#2C241E] transition-colors cursor-pointer disabled:opacity-50"
              >
                + 12:00 - 13:00
              </button>
              <button
                type="button"
                disabled={isSavingSlot}
                onClick={() => handleQuickAddSlot('13:00', '14:00', 'Đầu giờ chiều')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF0E4] border border-[#E8DFD8] text-[11px] font-bold text-[#2C241E] transition-colors cursor-pointer disabled:opacity-50"
              >
                + 13:00 - 14:00
              </button>
              <button
                type="button"
                disabled={isSavingSlot}
                onClick={handleSeedDefaultSlots}
                className="px-2.5 py-1 rounded-lg bg-[#FAF0E4] hover:bg-[#EFE4D9] border border-[#DFCBB5] text-[11px] font-bold text-[#985018] transition-colors cursor-pointer disabled:opacity-50"
              >
                + Bộ khung chuẩn (08:00 - 20:00)
              </button>
            </div>

            <div className="space-y-2">
              {timeSlots.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#E8DFD8] rounded-xl">
                  <span className="text-xs text-[#73675F]">
                    Chưa có khung giờ tùy chỉnh trên Portal. App đang dùng cấu hình mặc định theo chi nhánh. Bấm &quot;Thêm khung giờ&quot; hoặc nút thêm nhanh ở trên để đồng bộ.
                  </span>
                </div>
              ) : (
                timeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      slot.isActive
                        ? 'bg-white border-[#E8DFD8] shadow-2xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] border border-[#EFE4D9] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#985018]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2C241E]">{slot.name}</span>
                          {slot.description && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF0E4] text-[#985018] font-semibold truncate max-w-[160px]">
                              {slot.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSlotActive(slot)}
                        title={slot.isActive ? 'Ẩn khung giờ trên App' : 'Hiện khung giờ trên App'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          slot.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {slot.isActive ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditSlot(slot)}
                        title="Sửa khung giờ"
                        className="p-1.5 rounded-lg text-[#985018] hover:bg-[#FAF0E4] border border-[#E8DFD8] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot)}
                        title="Xóa khung giờ"
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
              <h4 className="text-xs font-bold text-[#2C241E]">Xem trước Kênh MXH &amp; Giờ đặt lịch trên App</h4>
            </div>
            <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] font-bold px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              Realtime Sync
            </span>
          </div>

          <p className="text-[11px] text-[#73675F] leading-relaxed">
            Mô phỏng hiển thị các kênh liên hệ, mạng xã hội và khung giờ đặt lịch thực tế đồng bộ xuống Mobile App.
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
                .slice(0, 6)
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

            {timeSlots.filter((s) => s.isActive).length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-left space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Khung giờ đặt lịch trên App ({timeSlots.filter((s) => s.isActive).length})
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {timeSlots
                    .filter((s) => s.isActive)
                    .slice(0, 6)
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className="px-2 py-1 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[10px] font-bold text-[#004890] text-center"
                      >
                        {slot.name}
                      </div>
                    ))}
                </div>
              </div>
            )}

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

      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8DFD8] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE4D9]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#FAF0E4] text-[#985018]">
                  <Clock className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-[#2C241E]">
                  {editingSlot ? 'Chỉnh sửa Khung giờ đặt lịch' : 'Thêm Khung giờ đặt lịch mới'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">
                    Giờ bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">
                    Giờ kết thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Nhãn ghi chú (tùy chọn)</label>
                <input
                  type="text"
                  value={slotForm.description}
                  onChange={(e) => setSlotForm({ ...slotForm, description: e.target.value })}
                  placeholder="VD: Ca trưa, Khung giờ cao điểm..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2C241E]">
                <input
                  type="checkbox"
                  checked={slotForm.isActive}
                  onChange={(e) => setSlotForm({ ...slotForm, isActive: e.target.checked })}
                  className="rounded text-[#985018] focus:ring-[#985018]"
                />
                <span>Hiển thị trên App Mobile để khách đặt lịch</span>
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingSlot}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#804213] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  {isSavingSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingSlot ? 'Lưu cập nhật' : 'Thêm khung giờ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      else if (nextCode === 'TELEGRAM') defaultIcon = 'telegram';
                      else if (nextCode === 'THREADS') defaultIcon = 'threads';
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
                    <option value="THREADS">THREADS (Mạng xã hội)</option>
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
                    <option value="telegram">Telegram</option>
                    <option value="threads">Threads</option>
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
