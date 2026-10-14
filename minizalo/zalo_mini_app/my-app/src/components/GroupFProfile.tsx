import React, { useEffect, useState } from 'react';
import { Box, Text } from 'zmp-ui';
import { apiClient } from '@/api/client';
import { User, Voucher } from '../../../../backend/src/data/database';
import {
  CreditCardIcon,
  CheckIcon,
  UserCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CloseIcon,
  TagIcon,
  ShieldIcon,
  BellIcon,
  CameraIcon,
  CalendarIcon,
  NavAcademyIcon,
  HeartIcon,
  FileTextIcon,
  StarIcon,
  ClockIcon,
  LocationIcon,
} from './Icons';

interface GroupFProfileProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onOpenAppointments: () => void;
  onOpenPackages: () => void;
  onOpenAcademy: () => void;
  onOpenCourseCatalog: () => void;
  onOpenOnboarding: () => void;
  vouchers: Voucher[];
  onVouchersUpdated: (vouchers: Voucher[]) => void;
  summary: { upcomingBookings: number; remainingTreatmentSessions: number; activeCourses: number };
}

export const GroupFProfile: React.FC<GroupFProfileProps> = ({
  user,
  onUserUpdated,
  onOpenAppointments,
  onOpenPackages,
  onOpenAcademy,
  onOpenCourseCatalog,
  onOpenOnboarding,
  vouchers,
  onVouchersUpdated,
  summary,
}) => {
  // Modal states for F02 - F08 screens
  const [activeModal, setActiveModal] = useState<
    'edit_profile' | 'digital_card' | 'points' | 'vouchers' | 'payments' | 'referral' | 'settings' | null
  >(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Profile data (Figma F01)
  const [userProfile, setUserProfile] = useState({
    name: user.name,
    phone: user.phone,
    verified: true,
    tier: user.tier === 'Gold' ? 'Hội viên Vàng' : `Hội viên ${user.tier}`,
    cardCode: 'WM-000128',
    points: user.points,
    targetDiamondPoints: 3000,
    dob: user.dob,
    gender: user.gender,
    email: user.email,
    address: user.address,
    preferredBranch: user.preferredBranch || 'Chi nhánh 01 — Quận 3, TP.HCM',
    skinType: user.skinType || '',
    healthNotes: user.healthNotes || '',
    emergencyContactName: user.emergencyContactName || '',
    emergencyContactPhone: user.emergencyContactPhone || '',
    avatar: user.avatar,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [transactions, setTransactions] = useState<{ invoices: any[]; pointTransactions: any[]; totalSpent: number }>({ invoices: [], pointTransactions: [], totalSpent: 0 });

  useEffect(() => {
    apiClient.getTransactions().then((result) => {
      if (result?.invoices) setTransactions(result);
    });
  }, []);

  const selectAvatarFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn một tệp ảnh.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Ảnh phải nhỏ hơn 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return;
        const sourceSize = Math.min(image.width, image.height);
        context.drawImage(image, (image.width - sourceSize) / 2, (image.height - sourceSize) / 2, sourceSize, sourceSize, 0, 0, size, size);
        setUserProfile((current) => ({ ...current, avatar: canvas.toDataURL('image/jpeg', 0.78) }));
        showToast('Đã chọn ảnh. Nhấn Lưu để cập nhật hồ sơ.');
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setUserProfile((current) => ({
      ...current,
      name: user.name,
      phone: user.phone,
      email: user.email,
      dob: user.dob,
      gender: user.gender,
      address: user.address,
      avatar: user.avatar,
      points: user.points,
      preferredBranch: user.preferredBranch || current.preferredBranch,
      skinType: user.skinType || '',
      healthNotes: user.healthNotes || '',
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactPhone: user.emergencyContactPhone || '',
    }));
  }, [user]);

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    const response = await apiClient.updateProfile(userProfile);
    setSavingProfile(false);
    if (response?.user) {
      onUserUpdated(response.user);
      setActiveModal(null);
      showToast('Đã lưu hồ sơ vào hệ thống.');
      return;
    }
    showToast(response?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
  };

  // Edit Profile sub-tab
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'health'>('personal');

  // Digital Card Barcode/QR toggle
  const [cardCodeType, setCardCodeType] = useState<'qr' | 'barcode'>('qr');

  // Points sub-tab
  const [pointsTab, setPointsTab] = useState<'rewards' | 'tiers' | 'history'>('rewards');

  // Vouchers state & sub-tab
  const [voucherTab, setVoucherTab] = useState<'available' | 'used' | 'expired'>('available');
  const [voucherInput, setVoucherInput] = useState('');
  const normalizeVouchers = (items: Voucher[]) => items.map((item) => ({
    ...item,
    status: item.status || (new Date(item.expiryDate).getTime() < Date.now() ? 'expired' as const : 'available' as const),
  }));
  const [vouchersList, setVouchersList] = useState<Voucher[]>(normalizeVouchers(vouchers));
  useEffect(() => setVouchersList(normalizeVouchers(vouchers)), [vouchers]);

  // Invoice detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Settings toggles (Figma F08)
  const [settings, setSettings] = useState({
    notifAppointment: true,
    notifTreatment: true,
    notifCourse: true,
    notifPromotion: false,
    biometrics: true,
    language: 'vi',
  });

  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedVoucher(text);
    showToast(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedVoucher(null), 2000);
  };

  const voucherLabel = (voucher: Voucher) => {
    if (voucher.discountType === 'percent') return `GIẢM ${voucher.discountValue}%`;
    const amount = voucher.discountValue ?? voucher.discountAmount ?? 0;
    return `GIẢM ${amount.toLocaleString('vi-VN')} đ`;
  };

  const voucherExpiry = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
  };

  const useVoucher = (voucher: Voucher) => {
    localStorage.setItem('mld_pending_voucher', JSON.stringify({ code: voucher.code, scope: voucher.scope }));
    setActiveModal(null);
    if (voucher.scope === 'course') onOpenCourseCatalog();
    else onOpenAppointments();
  };

  const handleApplyNewVoucher = async () => {
    const clean = voucherInput.trim().toUpperCase();
    if (!clean) return;
    if (vouchersList.some((v) => v.code === clean)) {
      showToast('Mã voucher này đã có trong ví của bạn!');
      return;
    }
    const response = await apiClient.claimVoucher(clean);
    if (!response?.voucher) {
      showToast(response?.error || 'Không thể thêm mã ưu đãi.');
      return;
    }
    const next = [response.voucher, ...vouchersList];
    setVouchersList(next);
    onVouchersUpdated(next);
    setVoucherInput('');
    showToast(response.message || `Đã thêm mã ${clean} vào ví ưu đãi!`);
  };

  const handleRedeemReward = (rewardName: string, costPoints: number) => {
    if (userProfile.points < costPoints) {
      showToast('Bạn không đủ điểm để đổi quà này!');
      return;
    }
    setUserProfile((prev) => ({ ...prev, points: prev.points - costPoints }));
    showToast(`Đổi thành công: ${rewardName}!`);
  };

  return (
    <div className="space-y-3 px-3 pt-3 pb-20 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#40352F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckIcon size={14} color="#E8B878" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          F01: TÀI KHOẢN CỦA TÔI (PROFILE HOME FIGMA 100%)
      ========================================================================= */}
      {/* User Header Profile Card (Matching Figma F01) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={userProfile.avatar}
            alt="Avatar"
            className="w-12 h-12 rounded-full object-cover border border-[#EADECF]"
          />
          <div>
            <h2 className="text-sm font-bold text-[#40352F]">{userProfile.name}</h2>
            <p className="text-[11px] text-[#7A685D] mt-0.5">{userProfile.phone} · Đã xác thực</p>
            <span className="inline-block px-2 py-0.5 rounded-full bg-[#FAF1E6] text-[#98501B] text-[10px] font-semibold mt-1">
              {userProfile.tier}
            </span>
          </div>
        </div>
        <button
          onClick={() => setActiveModal('edit_profile')}
          className="w-8 h-8 rounded-full bg-white border border-[#EADECF] flex items-center justify-center text-[#7A685D] hover:text-[#40352F] shadow-xs transition active:scale-95"
          title="Chỉnh sửa thông tin"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>

      {/* VIP Gold Card Preview (Figma F01) */}
      <div
        onClick={() => setActiveModal('digital_card')}
        className="rounded-[10px] p-4 text-white bg-[#9C4F1B] cursor-pointer transition active:scale-[0.99] relative overflow-hidden"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-[10px] font-medium text-white/70">{userProfile.tier}</h3>
          </div>
          <span className="text-lg">👑</span>
        </div>

        <div className="my-3">
          <p className="text-[22px] font-bold text-white">{userProfile.points.toLocaleString()} điểm</p>
          <p className="mt-1 text-[9px] text-white/75">Mã hội viên · {userProfile.cardCode}</p>
        </div>

        <div className="flex justify-between items-center text-[9px] text-white border-t border-white/20 pt-2">
          <span>▦ &nbsp; Xem thẻ hội viên</span>
          <span>→</span>
        </div>
        <p className="mt-3 text-[8px] text-white/70">Dữ liệu minh họa</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { value: String(summary.upcomingBookings), label: 'Lịch hẹn', sub: 'sắp tới', action: onOpenAppointments },
          { value: String(summary.remainingTreatmentSessions), label: 'Liệu trình', sub: 'buổi còn lại', action: onOpenPackages },
          { value: String(summary.activeCourses), label: 'Khóa học', sub: 'đang học', action: onOpenAcademy },
        ].map((item) => (
          <button key={item.label} onClick={item.action} className="min-h-[78px] rounded-[10px] bg-white p-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <span className="text-[17px] font-bold text-[#A65317]">{item.value}</span>
            <span className="mt-1 block text-[9px] font-medium text-[#40352F]">{item.label}</span>
            <span className="block text-[8px] text-[#8A7D74]">{item.sub}</span>
          </button>
        ))}
      </div>

      {/* Menu Group 1: Dịch vụ của bạn (Figma F01) */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-[#40352F]">
          Dịch vụ của tôi
        </div>
        <div className="bg-white rounded-[10px] border border-[#EFEAE3] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#FAF6F0]">
          <div
            onClick={onOpenAppointments}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <CalendarIcon size={16} className="text-[#98501B]" />
              <span className="font-semibold text-[#40352F]">Lịch hẹn của tôi</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>

          <div
            onClick={onOpenPackages}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <HeartIcon size={16} className="text-[#98501B]" />
              <span className="font-semibold text-[#40352F]">Gói liệu trình</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>

          <div
            onClick={onOpenAcademy}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <NavAcademyIcon size={16} className="text-[#98501B]" />
              <span className="font-semibold text-[#40352F]">Khóa học & Chứng nhận của tôi</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>
        </div>
      </div>

      {/* Menu Group 2: Tài khoản & Quyền lợi (Figma F01) */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-[#40352F]">
          Tài khoản & Quyền lợi hội viên
        </div>
        <div className="bg-white rounded-[10px] border border-[#EFEAE3] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#FAF6F0]">
          <div
            onClick={() => setActiveModal('vouchers')}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#98501B]"><TagIcon size={17} /></span>
              <span className="font-semibold text-[#40352F]">Ưu đãi của tôi ({vouchersList.filter(v => v.status === 'available').length} voucher)</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>

          <div
            onClick={() => setActiveModal('points')}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#98501B]"><StarIcon size={17} filled={false} /></span>
              <span className="font-semibold text-[#40352F]">Điểm tích lũy & Hạng hội viên</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>

          <div
            onClick={() => setActiveModal('payments')}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#98501B]"><FileTextIcon size={17} /></span>
              <span className="font-semibold text-[#40352F]">Lịch sử thanh toán & Hóa đơn điện tử</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>

          <div
            onClick={() => setActiveModal('referral')}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#98501B]"><UserCheckIcon size={17} /></span>
              <span className="font-semibold text-[#40352F]">Giới thiệu bạn bè (Nhận 100.000 ₫)</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>

          <div
            onClick={() => setActiveModal('settings')}
            className="flex items-center justify-between p-3.5 hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
          >
            <div className="flex items-center space-x-2.5">
              <span className="flex h-7 w-7 items-center justify-center text-[#98501B]"><ShieldIcon size={17} /></span>
              <span className="font-semibold text-[#40352F]">Cài đặt tài khoản & Bảo mật</span>
            </div>
            <span className="text-[#A09085]">&gt;</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREEN F02: CHUYÊN TRANG THÔNG TIN CÁ NHÂN & EMR PROFILE
      ========================================================================= */}
      {activeModal === 'edit_profile' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EADECF] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-[#40352F]">Hồ sơ cá nhân & Y tế</h2>
                <span className="text-[10px] text-emerald-600 font-bold">● Đã xác thực OTP</span>
              </div>
            </div>
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="text-xs font-bold text-[#98501B] px-2.5 py-1 rounded-lg bg-[#FAF1E6] hover:bg-[#F3E2CE]"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>

          {/* Sub tabs */}
          <div className="flex border-b border-[#EADECF] bg-white px-4 shrink-0">
            <button
              onClick={() => setProfileSubTab('personal')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                profileSubTab === 'personal'
                  ? 'border-[#98501B] text-[#98501B]'
                  : 'border-transparent text-[#7A685D]'
              }`}
            >
              Thông tin liên hệ
            </button>
            <button
              onClick={() => setProfileSubTab('health')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                profileSubTab === 'health'
                  ? 'border-[#98501B] text-[#98501B]'
                  : 'border-transparent text-[#7A685D]'
              }`}
            >
              Thể trạng & EMR Notes
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {profileSubTab === 'personal' ? (
              <>
                {/* Avatar Picker */}
                <div className="bg-white p-4 rounded-2xl border border-[#EADECF] shadow-xs text-center space-y-2.5">
                  <img
                    src={userProfile.avatar}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[#98501B] shadow-sm"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#40352F]">Chọn ảnh đại diện phong cách Spa:</p>
                    <div className="flex justify-center space-x-2.5 mt-2">
                      {[
                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
                      ].map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt="Avt opt"
                          onClick={() => {
                            setUserProfile({ ...userProfile, avatar: imgUrl });
                            showToast('Đã đổi ảnh đại diện!');
                          }}
                          className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition hover:scale-105 ${
                            userProfile.avatar === imgUrl ? 'border-[#98501B]' : 'border-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                    <label htmlFor="profile-avatar-file" className="mx-auto mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#98501B] bg-white text-xs font-bold text-[#98501B]">
                      <CameraIcon size={17} /> Chọn ảnh từ thiết bị
                    </label>
                    <input id="profile-avatar-file" type="file" accept="image/*" onChange={selectAvatarFile} className="hidden" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="bg-white p-4 rounded-2xl border border-[#EADECF] shadow-xs space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Giới tính</label>
                    <div className="flex space-x-2">
                      {['Nữ', 'Nam', 'Khác'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setUserProfile({ ...userProfile, gender: g })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                            userProfile.gender === g
                              ? 'bg-[#98501B] text-white border-[#98501B]'
                              : 'bg-white text-stone-700 border-[#EADECF]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Số điện thoại đã xác thực</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        disabled
                        value={userProfile.phone}
                        className="flex-1 p-2.5 rounded-xl border border-[#EADECF] bg-[#FAF6F0] text-xs font-medium text-[#7A685D]"
                      />
                      <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-lg">Đã kích hoạt</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Email liên hệ</label>
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Ngày sinh</label>
                    <input
                      type="text"
                      value={userProfile.dob}
                      onChange={(e) => setUserProfile({ ...userProfile, dob: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Địa chỉ sinh sống</label>
                    <input
                      type="text"
                      value={userProfile.address}
                      onChange={(e) => setUserProfile({ ...userProfile, address: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Chi nhánh MLD yêu thích</label>
                    <select
                      value={userProfile.preferredBranch}
                      onChange={(e) => setUserProfile({ ...userProfile, preferredBranch: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none bg-white cursor-pointer"
                    >
                      <option>Chi nhánh 01 — Quận 3, TP.HCM</option>
                      <option>Chi nhánh 02 — Quận Tân Bình, TP.HCM</option>
                      <option>Chi nhánh 03 — Quận Bình Thạnh, TP.HCM</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Health & EMR Notes */}
                <div className="bg-white p-4 rounded-2xl border border-[#EADECF] shadow-xs space-y-3.5">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <p className="font-bold text-amber-900">🛡 Bảo mật hồ sơ y khoa EMR</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Thông tin thể trạng giúp kỹ thuật viên điều chỉnh lực bấm và loại tinh dầu phù hợp nhất.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">Đặc điểm làn da</label>
                    <input
                      type="text"
                      value={userProfile.skinType}
                      onChange={(e) => setUserProfile({ ...userProfile, skinType: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#7A685D] block mb-1">
                      Lưu ý thể trạng & Vùng cơ cần chăm sóc đặc biệt
                    </label>
                    <textarea
                      value={userProfile.healthNotes}
                      onChange={(e) => setUserProfile({ ...userProfile, healthNotes: e.target.value })}
                      rows={3}
                      className="w-full p-2.5 rounded-xl border border-[#EADECF] text-xs font-medium focus:border-[#98501B] outline-none resize-none"
                    />
                  </div>

                  <div className="border-t border-[#EADECF] pt-3">
                    <h4 className="text-xs font-bold text-[#40352F] mb-2">Người thân liên hệ khẩn cấp:</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-[#7A685D] block mb-0.5">Họ tên người thân</label>
                        <input
                          type="text"
                          value={userProfile.emergencyContactName}
                          onChange={(e) => setUserProfile({ ...userProfile, emergencyContactName: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#EADECF] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#7A685D] block mb-0.5">Số điện thoại khẩn cấp</label>
                        <input
                          type="text"
                          value={userProfile.emergencyContactPhone}
                          onChange={(e) => setUserProfile({ ...userProfile, emergencyContactPhone: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#EADECF] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full py-3 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] shadow-md transition active:scale-95"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F03: CHUYÊN TRANG THẺ HỘI VIÊN ĐIỆN TỬ VIP
      ========================================================================= */}
      {activeModal === 'digital_card' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EADECF] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h2 className="text-sm font-bold text-[#40352F]">Thẻ hội viên VIP điện tử</h2>
            </div>
            <button
              onClick={() => showToast('Đã chia sẻ thẻ hội viên!')}
              className="text-xs font-bold text-[#98501B] px-2 py-1"
            >
              Chia sẻ
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* VIP Card */}
            <div className="rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-[#6A3916] via-[#52290D] to-[#3B1C08] border border-[#8C4E20]/60 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8B878]">
                    MLD VIETNAM
                  </span>
                  <h4 className="text-sm font-bold text-[#E8B878] mt-0.5">{userProfile.tier.toUpperCase()}</h4>
                </div>
                <span className="text-2xl">👑</span>
              </div>

              <div className="my-4">
                <p className="text-sm uppercase font-bold text-white tracking-wide">{userProfile.name}</p>
                <p className="text-[11px] text-[#D2A066] mt-0.5">
                  MÃ HỘI VIÊN: {userProfile.cardCode}
                </p>
              </div>

              <div className="flex justify-between items-end text-[10px] text-white/80 border-t border-[#8C4E20]/40 pt-2">
                <span>{userProfile.points.toLocaleString()} điểm khả dụng</span>
                <span>Hạn thẻ: 31/12/2026</span>
              </div>
            </div>

            {/* Code switcher */}
            <div className="p-4 rounded-2xl bg-white border border-[#EADECF] text-center space-y-3 shadow-xs">
              <div className="flex justify-center space-x-2 border-b border-[#EADECF] pb-2">
                <button
                  onClick={() => setCardCodeType('qr')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    cardCodeType === 'qr' ? 'bg-[#FAF1E6] text-[#98501B]' : 'text-stone-500'
                  }`}
                >
                  Mã QR xác thực
                </button>
                <button
                  onClick={() => setCardCodeType('barcode')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    cardCodeType === 'barcode' ? 'bg-[#FAF1E6] text-[#98501B]' : 'text-stone-500'
                  }`}
                >
                  Mã vạch Kiosk
                </button>
              </div>

              {cardCodeType === 'qr' ? (
                <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl border border-[#EADECF] flex items-center justify-center shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=MLD-VIP-${userProfile.cardCode}`}
                    alt="QR"
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-full py-6 bg-white p-2 rounded-2xl border border-[#EADECF] flex flex-col items-center justify-center">
                  <div className="font-mono text-3xl tracking-widest font-black text-black select-none">
                    ||| | |||| | ||| ||||
                  </div>
                  <p className="font-mono text-xs font-bold text-stone-600 mt-2">MLD-WM-000128</p>
                </div>
              )}

              <p className="font-mono text-sm font-bold text-[#98501B]">{userProfile.cardCode}</p>
              <p className="text-[11px] text-[#7A685D]">Xuất trình mã này cho lễ tân để tự động tích lũy điểm và áp dụng giảm giá VIP</p>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => showToast('Đã lưu mã thẻ vào Apple Wallet / Google Pay!')}
                  className="flex-1 py-2 rounded-xl bg-[#FAF1E6] text-[#98501B] text-xs font-bold hover:bg-[#F3E2CE]"
                >
                  Lưu vào Ví điện tử
                </button>
                <button
                  onClick={() => handleCopy(userProfile.cardCode)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200"
                >
                  Sao chép mã thẻ
                </button>
              </div>
            </div>

            {/* VIP Benefits */}
            <div className="bg-white p-4 rounded-2xl border border-[#EADECF] space-y-2.5 text-xs">
              <h4 className="font-bold text-[#40352F] flex items-center space-x-1.5">
                <span>👑</span>
                <span>Đặc quyền Hội viên Vàng:</span>
              </h4>
              <div className="space-y-2 text-stone-600 text-[11px]">
                <div className="flex items-start space-x-2">
                  <span className="text-[#98501B] font-bold">✓</span>
                  <span>Giảm 15% tất cả dịch vụ massage, trị liệu & chăm sóc da</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#98501B] font-bold">✓</span>
                  <span>Ưu tiên chỉ định Kỹ thuật viên trưởng không phụ thu</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#98501B] font-bold">✓</span>
                  <span>Miễn phí 01 lần soi da và tư vấn phác đồ chuyên sâu mỗi tháng</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#98501B] font-bold">✓</span>
                  <span>Tặng voucher sinh nhật 500.000 ₫ trong tháng sinh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F04: CHUYÊN TRANG ĐIỂM TÍCH LŨY & TIẾN TRÌNH LÊN HẠNG
      ========================================================================= */}
      {activeModal === 'points' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EADECF] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h2 className="text-sm font-bold text-[#40352F]">Điểm tích lũy & Hạng hội viên</h2>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="text-xs font-bold text-[#7A685D] hover:text-[#98501B] px-2 py-1"
            >
              Đóng
            </button>
          </div>

          <div className="flex border-b border-[#EADECF] bg-white px-4 shrink-0">
            <button
              onClick={() => setPointsTab('rewards')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                pointsTab === 'rewards' ? 'border-[#98501B] text-[#98501B]' : 'border-transparent text-[#7A685D]'
              }`}
            >
              Đổi quà từ điểm
            </button>
            <button
              onClick={() => setPointsTab('tiers')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                pointsTab === 'tiers' ? 'border-[#98501B] text-[#98501B]' : 'border-transparent text-[#7A685D]'
              }`}
            >
              Bảng hạng hội viên
            </button>
            <button
              onClick={() => setPointsTab('history')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                pointsTab === 'history' ? 'border-[#98501B] text-[#98501B]' : 'border-transparent text-[#7A685D]'
              }`}
            >
              Lịch sử điểm
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Points Summary Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#EADECF] shadow-xs text-center space-y-1">
              <span className="text-[11px] font-semibold text-[#7A685D]">Điểm thưởng khả dụng</span>
              <div className="text-3xl font-black text-[#98501B]">{userProfile.points.toLocaleString()} điểm</div>
              <p className="text-[11px] text-[#A09085]">+350 điểm tích trong tháng 10 · 500 điểm đã đổi</p>

              {/* Progress to Diamond */}
              <div className="pt-3 border-t border-[#FAF6F0] space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#40352F]">💎 Hướng tới hạng Kim Cương</span>
                  <span className="font-bold text-[#98501B]">
                    {userProfile.points} / {userProfile.targetDiamondPoints}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#FAF6F0] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (userProfile.points / userProfile.targetDiamondPoints) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#7A685D]">
                  Còn <strong>{Math.max(0, userProfile.targetDiamondPoints - userProfile.points)} điểm</strong> để thăng hạng Kim Cương và nhận giảm giá 25% trọn đời.
                </p>
              </div>
            </div>

            {pointsTab === 'rewards' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#40352F]">Voucher & Quà tặng đổi bằng điểm:</h4>
                {[
                  { title: 'Voucher Giảm 50.000 ₫ Dịch Vụ', points: 300, desc: 'Áp dụng cho hóa đơn từ 300k' },
                  { title: 'Voucher Giảm 100.000 ₫ Trị Liệu', points: 600, desc: 'Áp dụng cho massage hoặc chăm sóc da' },
                  { title: '01 Suất Gội Đầu Thảo Dược Miễn Phí', points: 1200, desc: 'Trị giá 250.000 ₫ tại chi nhánh Quận 3' },
                  { title: 'Set Tinh Dầu Trị Liệu MLD Cao Cấp', points: 2000, desc: 'Bộ 3 lọ tinh dầu hoa cúc & oải hương' },
                ].map((rw, i) => (
                  <div key={i} className="p-3.5 bg-white rounded-2xl border border-[#EADECF] flex justify-between items-center shadow-xs">
                    <div>
                      <p className="text-xs font-bold text-[#40352F]">{rw.title}</p>
                      <p className="text-[10px] text-[#7A685D] mt-0.5">{rw.desc}</p>
                      <span className="text-[11px] font-black text-[#98501B] mt-1 inline-block">
                        ⭐ {rw.points.toLocaleString()} điểm
                      </span>
                    </div>
                    <button
                      onClick={() => handleRedeemReward(rw.title, rw.points)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                        userProfile.points >= rw.points
                          ? 'bg-[#98501B] text-white hover:bg-[#804215]'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      Đổi ngay
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pointsTab === 'tiers' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#40352F]">Các cấp hạng hội viên MLD:</h4>
                {[
                  { name: 'Hội viên Bạc (Silver)', req: '0 - 1.999 điểm', discount: 'Giảm 5%', active: false },
                  { name: 'Hội viên Vàng (Gold)', req: '2.000 - 2.999 điểm', discount: 'Giảm 15% + Quà sinh nhật', active: true },
                  { name: 'Hội viên Kim Cương (Diamond)', req: '3.000+ điểm', discount: 'Giảm 25% + Phòng VIP riêng', active: false },
                ].map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                      t.active ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-[#EADECF]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#40352F]">{t.name}</span>
                      {t.active && <span className="text-[10px] bg-[#98501B] text-white font-bold px-2 py-0.5 rounded-full">Hạng hiện tại</span>}
                    </div>
                    <p className="text-[11px] text-[#7A685D]">Yêu cầu: {t.req}</p>
                    <p className="text-[11px] font-semibold text-[#98501B]">Ưu đãi: {t.discount}</p>
                  </div>
                ))}
              </div>
            )}

            {pointsTab === 'history' && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#40352F]">Lịch sử giao dịch điểm:</h4>
                {transactions.pointTransactions.map((h) => (
                  <div key={h.id} className="p-3 bg-white rounded-xl border border-[#EADECF] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#40352F]">{h.description}</p>
                      <p className="text-[10px] text-[#7A685D] mt-0.5">{new Date(h.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <span className={`font-black ${h.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {h.points >= 0 ? '+' : ''}{h.points.toLocaleString('vi-VN')} điểm
                    </span>
                  </div>
                ))}
                {!transactions.pointTransactions.length && <p className="py-8 text-center text-xs text-[#7A685D]">Chưa có giao dịch điểm.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F05: CHUYÊN TRANG ƯU ĐÃI & KHO VOUCHER
      ========================================================================= */}
      {activeModal === 'vouchers' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EADECF] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h2 className="text-sm font-bold text-[#40352F]">Kho ưu đãi & Mã giảm giá</h2>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="text-xs font-bold text-[#7A685D] hover:text-[#98501B] px-2 py-1"
            >
              Đóng
            </button>
          </div>

          {/* Add voucher input bar */}
          <div className="p-3.5 bg-white border-b border-[#EADECF] flex items-center space-x-2 shrink-0">
            <input
              type="text"
              placeholder="Nhập mã voucher (VD: MLD2026)..."
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              className="flex-1 p-2.5 rounded-xl border border-[#EADECF] bg-[#FAF6F0] text-xs font-mono uppercase font-bold outline-none focus:border-[#98501B]"
            />
            <button
              onClick={handleApplyNewVoucher}
              className="px-4 py-2.5 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] active:scale-95 transition"
            >
              Áp dụng
            </button>
          </div>

          {/* Voucher Tabs */}
          <div className="flex border-b border-[#EADECF] bg-white px-4 shrink-0">
            {[
              { id: 'available', label: `Khả dụng (${vouchersList.filter(v => v.status === 'available').length})` },
              { id: 'used', label: `Đã dùng (${vouchersList.filter(v => v.status === 'used').length})` },
              { id: 'expired', label: `Hết hạn (${vouchersList.filter(v => v.status === 'expired').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVoucherTab(tab.id as any)}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition ${
                  voucherTab === tab.id ? 'border-[#98501B] text-[#98501B]' : 'border-transparent text-[#7A685D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-24">
            {vouchersList
              .filter((v) => v.status === voucherTab)
              .map((vc, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-[#EADECF] shadow-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold text-[#98501B] bg-[#FAF6F0] px-2.5 py-1 rounded-md border border-[#EADECF]">
                      {voucherLabel(vc)}
                    </span>
                    <span className="text-[11px] text-[#7A685D]">HSD: {voucherExpiry(vc.expiryDate)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#40352F]">{vc.title}</h4>
                  <p className="text-[11px] text-[#7A685D] leading-relaxed">{vc.description}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-[#EADECF]">
                    <span className="font-mono text-xs font-black text-[#98501B]">{vc.code}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCopy(vc.code)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FAF6F0] text-stone-700 text-[11px] font-bold border border-[#EADECF]"
                      >
                        {copiedVoucher === vc.code ? 'Đã chép ✓' : 'Sao chép'}
                      </button>
                      {vc.status === 'available' && (
                        <button
                          onClick={() => useVoucher(vc)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#98501B] text-white text-[11px] font-bold hover:bg-[#804215]"
                        >
                          Dùng ngay &gt;
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F06: CHUYÊN TRANG LỊCH SỬ GIAO DỊCH & HÓA ĐƠN ĐIỆN TỬ
      ========================================================================= */}
      {activeModal === 'payments' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EADECF] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h2 className="text-sm font-bold text-[#40352F]">Lịch sử giao dịch & Hóa đơn</h2>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="text-xs font-bold text-[#7A685D] hover:text-[#98501B] px-2 py-1"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Total Expense Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#EADECF] shadow-xs text-center space-y-1">
              <span className="text-[11px] font-semibold text-[#7A685D]">Tổng chi tiêu tích lũy</span>
              <div className="text-2xl font-black text-[#98501B]">{transactions.totalSpent.toLocaleString('vi-VN')} ₫</div>
              <p className="text-[11px] text-[#A09085]">{transactions.invoices.filter((item) => item.status === 'paid').length} giao dịch hoàn tất</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#40352F]">Hóa đơn chi tiết các buổi trị liệu:</h4>
              {transactions.invoices.map((item) => {
                const inv = { id: item.code, service: item.title, branch: item.description || 'MLD Vietnam', date: new Date(item.paidAt || item.createdAt).toLocaleString('vi-VN'), method: item.paymentMethod, price: `${item.finalAmount.toLocaleString('vi-VN')} ₫`, vat: 'Theo quy định hóa đơn', status: item.status === 'paid' ? 'Đã thanh toán' : item.status };
                return <div key={item.id} className="p-4 rounded-2xl border border-[#EADECF] bg-white shadow-xs space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-stone-400 font-bold block">{inv.id}</span>
                      <p className="font-bold text-[#40352F] text-xs mt-0.5">{inv.service}</p>
                    </div>
                    <span className="font-black text-[#98501B] text-sm">{inv.price}</span>
                  </div>

                  <div className="text-[11px] text-[#7A685D] space-y-0.5">
                    <p>📍 {inv.branch}</p>
                    <p>⏱ {inv.date} · {inv.method}</p>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#FAF6F0]">
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                      ● {inv.status}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] text-[#98501B] text-[11px] font-bold border border-[#EADECF]"
                      >
                        Hóa đơn VAT
                      </button>
                      <button
                        onClick={() => {
                          setActiveModal(null);
                          onOpenAppointments();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#98501B] text-white text-[11px] font-bold"
                      >
                        Đặt lại
                      </button>
                    </div>
                  </div>
                </div>;
              })}
              {!transactions.invoices.length && <p className="py-8 text-center text-xs text-[#7A685D]">Chưa có hóa đơn.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal Overlay */}
      {selectedInvoice && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EADECF] flex items-center justify-center text-[#40352F]"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h3 className="text-sm font-bold text-[#40352F]">Hóa đơn điện tử VAT</h3>
            </div>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="text-xs text-[#98501B] font-bold"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
            <div className="bg-white p-5 rounded-2xl border border-[#EADECF] shadow-sm space-y-3 text-xs">
              <div className="border-b border-[#FAF6F0] pb-2 text-center">
                <h4 className="font-black text-sm text-[#40352F]">CÔNG TY CỔ PHẦN CHĂM SÓC MLD VIỆT NAM</h4>
                <p className="text-[10px] text-stone-500 mt-0.5">MST: 0317889922 · Chuỗi Clinic & Spa Trị Liệu</p>
                <p className="font-mono text-xs font-bold text-[#98501B] mt-1">Số: {selectedInvoice.id}</p>
              </div>

              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Khách hàng:</span>
                  <span className="font-bold text-stone-900">{userProfile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số điện thoại:</span>
                  <span className="font-bold text-stone-900">{userProfile.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dịch vụ thực hiện:</span>
                  <span className="font-bold text-[#40352F]">{selectedInvoice.service}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian lập:</span>
                  <span>{selectedInvoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phương thức:</span>
                  <span>{selectedInvoice.method}</span>
                </div>
              </div>

              <div className="border-t border-[#FAF6F0] pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Tiền dịch vụ:</span>
                  <span className="font-bold">{selectedInvoice.price}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Thuế GTGT (VAT 8%):</span>
                  <span>{selectedInvoice.vat}</span>
                </div>
                <div className="flex justify-between text-[#98501B] font-black text-sm pt-1 border-t border-dashed border-stone-200">
                  <span>TỔNG THANH TOÁN:</span>
                  <span>{selectedInvoice.price}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => showToast('Đang tải hóa đơn điện tử định dạng PDF...')}
              className="w-full py-3 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] shadow-md transition"
            >
              Tải hóa đơn điện tử PDF
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F07: CHUYÊN TRANG GIỚI THIỆU BẠN BÈ
      ========================================================================= */}
      {activeModal === 'referral' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="shrink-0 px-3 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#EADECF] flex items-center justify-center text-[#40352F] active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <span className="text-[8px] text-[#8A7D74]">Dữ liệu minh họa</span>
            </div>
            <h2 className="mt-2 text-[21px] font-bold text-[#6F452C]">Giới thiệu bạn bè</h2>
            <p className="mt-1 text-[10px] text-[#7A685D]">Chia sẻ trải nghiệm tốt đẹp và nhận thêm quyền lợi.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-24">
            <div className="overflow-hidden rounded-[10px] bg-white">
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&auto=format&fit=crop&q=85" alt="Mời bạn cùng trải nghiệm" className="h-[145px] w-full object-cover" />
              <div className="p-3">
                <h4 className="text-[13px] font-bold text-[#6F452C]">Mời bạn cùng trải nghiệm</h4>
                <p className="mt-2 text-[9px] leading-relaxed text-[#7A685D]">Chia sẻ ứng dụng với bạn bè để cùng tận hưởng những quyền lợi dành cho hội viên.</p>
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-[#F3E2CE] space-y-3">
              <span className="text-[9px] text-[#7A685D]">Mã giới thiệu của bạn</span>
              <p className="text-[13px] font-bold text-[#A65317]">MINHANH128</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleCopy('MINHANH128')}
                  className="flex-1 h-10 rounded-[8px] bg-white text-[#A65317] text-[10px] font-bold border border-[#A65317]"
                >
                  {copiedVoucher === 'MINHANH128' ? 'Đã sao chép ✓' : 'Sao chép mã'}
                </button>
                <button
                  onClick={() => showToast('Đang mở Zalo để gửi link mời bạn bè...')}
                  className="flex-1 h-10 rounded-[8px] bg-white text-[#A65317] text-[10px] font-bold border border-[#A65317]"
                >
                  Chia sẻ
                </button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-[10px] border border-[#EADECF] space-y-2.5 text-xs">
              <h5 className="font-bold text-[#6F452C]">Quyền lợi giới thiệu</h5>
              <div className="space-y-2">
                {[
                  { name: 'Nguyễn Thúy Lan', status: 'Đã hoàn thành lịch · +100k', done: true },
                  { name: 'Trần Văn Hùng', status: 'Đã hoàn thành lịch · +100k', done: true },
                  { name: 'Phạm Phương Thảo', status: 'Đã đăng ký · Chờ trải nghiệm', done: false },
                  { name: 'Lê Minh Tuấn', status: 'Đã hoàn thành lịch · +100k', done: true },
                ].map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-[#FAF6F0] text-[11px]">
                    <span className="font-semibold text-stone-900">{f.name}</span>
                    <span className={f.done ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-[#EADECF] bg-white p-3">
            <button onClick={() => showToast('Đang mở Zalo để chia sẻ...')} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white">Chia sẻ ngay</button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN F08: CHUYÊN TRANG CÀI ĐẶT & THÔNG BÁO & BẢO MẬT
      ========================================================================= */}
      {activeModal === 'settings' && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="shrink-0 px-3 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#EADECF] flex items-center justify-center text-[#40352F] active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <span className="text-[8px] text-[#8A7D74]">Dữ liệu minh họa</span>
            </div>
            <h2 className="mt-2 text-[21px] font-bold text-[#6F452C]">Cài đặt tài khoản</h2>
            <p className="mt-1 text-[10px] text-[#7A685D]">Quản lý trải nghiệm, bảo mật và các tùy chọn của bạn.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-24">
            <div>
              <h3 className="mb-2 text-[13px] font-bold text-[#6F452C]">Tài khoản</h3>
              <div className="overflow-hidden rounded-[10px] bg-white divide-y divide-[#EFEAE3]">
                {['Thông tin cá nhân', 'Bảo mật tài khoản', 'Số điện thoại liên kết'].map((label, index) => (
                  <button key={label} onClick={() => index === 0 && setActiveModal('edit_profile')} className="flex min-h-11 w-full items-center justify-between px-3 text-left">
                    <span className="text-[10px] text-[#40352F]">{label}{index === 2 && <small className="block text-[8px] text-[#8A7D74]">0912 345 678 · Đã xác thực</small>}</span><span className="text-[#A09085]">›</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[13px] font-bold text-[#6F452C]">Thông báo</h3>
              <div className="bg-white p-2 rounded-[10px] divide-y divide-[#EFEAE3] text-xs">
              {[
                { key: 'notifAppointment', label: 'Thông báo lịch hẹn' },
                { key: 'notifTreatment', label: 'Thông báo liệu trình' },
                { key: 'notifCourse', label: 'Thông báo khóa học' },
                { key: 'notifPromotion', label: 'Chương trình ưu đãi' },
              ].map((st) => (
                <label key={st.key} className="flex justify-between items-center p-2 cursor-pointer">
                  <span className="text-[10px] text-[#40352F]">{st.label}<small className="block text-[8px] text-[#8A7D74]">Đang bật</small></span>
                  <input
                    type="checkbox"
                    checked={(settings as any)[st.key]}
                    onChange={(e) => setSettings({ ...settings, [st.key]: e.target.checked })}
                    className="h-5 w-9 appearance-none rounded-full bg-[#DDC8B7] checked:bg-[#A65317] relative cursor-pointer after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition checked:after:translate-x-4"
                  />
                </label>
              ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#EADECF] shadow-xs space-y-3 text-xs">
              <h4 className="font-bold text-[#40352F]">Bảo mật & Hệ thống:</h4>
              <label className="flex justify-between items-center p-3 rounded-xl border border-[#EADECF] cursor-pointer hover:bg-[#FAF6F0]">
                <div>
                  <p className="font-medium text-[#40352F]">Mở khóa bằng Face ID / Vân tay</p>
                  <p className="text-[10px] text-stone-400">Bảo mật khi mở hồ sơ bệnh án EMR</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.biometrics}
                  onChange={(e) => setSettings({ ...settings, biometrics: e.target.checked })}
                  className="w-4 h-4 text-[#98501B] rounded cursor-pointer accent-[#98501B]"
                />
              </label>

              <button
                onClick={() => showToast('Đã làm sạch 48.5 MB bộ nhớ đệm cache!')}
                className="w-full py-2.5 rounded-xl border border-[#EADECF] text-xs font-bold text-stone-700 hover:bg-stone-50 text-left px-3 flex justify-between items-center"
              >
                <span>Xóa bộ nhớ đệm ứng dụng</span>
                <span className="text-[10px] text-stone-400">48.5 MB</span>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  showToast('Đã đăng xuất tài khoản!');
                  onOpenOnboarding();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition"
              >
                Đăng xuất tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
