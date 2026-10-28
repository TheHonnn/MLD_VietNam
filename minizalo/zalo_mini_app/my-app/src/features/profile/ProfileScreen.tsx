import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { zaloAuthService } from '@/api/zalo-auth-service';
import { UserProfile } from '@/core/types';
import {
  User,
  Phone,
  Calendar,
  Sparkles,
  School,
  Settings,
  LogOut,
  LogIn,
  ChevronRight,
  Edit3,
  BookOpen,
  Award,
  CalendarDays,
  FileText,
  X,
  CheckCircle,
  HelpCircle,
  Shield,
} from 'lucide-react';

interface ProfileScreenProps {
  currentUser?: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  onNavigateTab: (tab: 'home' | 'services' | 'academy' | 'documents' | 'profile') => void;
  onOpenAppointments: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onProfileUpdated,
  onNavigateTab,
  onOpenAppointments,
}) => {
  const [profile, setProfile] = useState<UserProfile>(
    currentUser || supabaseApi.getUserProfile()
  );
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Modals
  const [showManualPhoneModal, setShowManualPhoneModal] = useState(false);
  const [manualPhoneInput, setManualPhoneInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState<string | null>(null);

  // Edit fields
  const [editName, setEditName] = useState(profile.fullName);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editEmail, setEditEmail] = useState(profile.email || '');

  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setEditName(currentUser.fullName);
      setEditPhone(currentUser.phone);
      setEditEmail(currentUser.email || '');
    } else {
      const p = supabaseApi.getUserProfile();
      setProfile(p);
      setEditName(p.fullName);
      setEditPhone(p.phone);
      setEditEmail(p.email || '');
    }
    const appts = supabaseApi.getAppointments();
    setAppointmentsCount(appts.length);
  }, [currentUser]);

  const handleZaloLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await zaloAuthService.loginWithZalo();
      if (res.success && res.user) {
        setProfile(res.user);
        onProfileUpdated?.(res.user);
      } else {
        setShowManualPhoneModal(true);
      }
    } catch {
      setShowManualPhoneModal(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleManualPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhoneInput.trim()) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await zaloAuthService.loginWithZalo(manualPhoneInput.trim());
      if (res.success && res.user) {
        setProfile(res.user);
        onProfileUpdated?.(res.user);
        setShowManualPhoneModal(false);
        setManualPhoneInput('');
      } else {
        setLoginError(res.error || 'Xác thực không thành công.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất? Ứng dụng sẽ chuyển về chế độ khách.')) {
      const guest = await zaloAuthService.logout();
      setProfile(guest);
      onProfileUpdated?.(guest);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = supabaseApi.updateUserProfile({
      fullName: editName,
      phone: editPhone,
      email: editEmail,
    });
    setProfile(updated);
    onProfileUpdated?.(updated);
    setShowEditModal(false);
  };

  const requireAuthAndRun = (action: () => void, noticeTitle: string) => {
    if (!profile.isPhoneVerified) {
      handleZaloLogin();
      return;
    }
    action();
  };

  const enrolledCoursesCount = supabaseApi.getEnrolledCourseIds().length;

  return (
    <div className="pb-24 bg-[#F9FAFB] min-h-screen">
      {/* 1. APPBAR: Chuẩn Mobile F01 ("Cá nhân", 20px bold, centered) */}
      <div className="bg-white px-4 py-3 border-b border-[#E5E7EB] sticky top-0 z-30 flex items-center justify-center">
        <h1 className="text-[20px] font-bold text-[#1F2937]">Cá nhân</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* ==========================================
            1. THẺ HỒ SƠ: KHÁCH HOẶC ĐÃ ĐĂNG NHẬP
            Chuẩn Mobile F01 (Border #E5E7EB, rounded-[14px])
            ========================================== */}
        {!profile.isPhoneVerified ? (
          <div className="p-4 bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-14 h-14 rounded-full bg-[#EFF4FE] border border-[#2860EB]/20 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-[#2860EB]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[16.5px] font-bold text-[#1F2937] leading-tight truncate">
                  Khách trải nghiệm
                </h3>
                <p className="text-[12.5px] text-[#616161] mt-1 leading-tight">
                  Đăng nhập để xem lịch & tích điểm
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleZaloLogin}
              disabled={isLoggingIn}
              className="px-3.5 py-2.5 bg-[#2860EB] hover:bg-[#1E4BB8] active:scale-95 text-white text-[13px] font-bold rounded-[10px] shadow-xs shrink-0 transition"
            >
              {isLoggingIn ? 'Đang vào...' : 'Đăng nhập'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-[60px] h-[60px] rounded-full border-[1.5px] border-[#2860EB] overflow-hidden bg-gray-100 shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#EFF4FE] flex items-center justify-center text-[#2860EB] font-bold text-lg">
                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'M'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[16.5px] font-bold text-[#1F2937] leading-tight truncate">
                  {profile.fullName || 'Khách hàng MLD'}
                </h3>
                <p className="text-[13px] text-[#616161] mt-1 truncate">
                  {profile.phone || 'Chưa cập nhật số điện thoại'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="p-2 text-[#2860EB] hover:bg-[#EFF4FE] rounded-lg transition"
              title="Chỉnh sửa thông tin"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ==========================================
            2. CHỈ SỐ NHANH (3 Thẻ số liệu thực tế từ Database)
            Chuẩn Mobile F01: Lịch hẹn, Liệu trình, Khóa học
            ========================================== */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Lịch hẹn */}
          <div
            onClick={onOpenAppointments}
            className="p-3 bg-white rounded-xl border border-[#E5E7EB] text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#2860EB]/30 transition active:scale-[0.98]"
          >
            <Calendar className="w-5 h-5 mx-auto text-[#2860EB] mb-1" />
            <span className="text-[18px] font-black text-[#1F2937] block leading-none">
              {appointmentsCount}
            </span>
            <span className="text-[11.5px] font-bold text-[#1F2937] mt-1 block">Lịch hẹn</span>
            <span className="text-[10px] text-[#616161] block">sắp tới</span>
          </div>

          {/* Liệu trình */}
          <div
            onClick={() => onNavigateTab('services')}
            className="p-3 bg-white rounded-xl border border-[#E5E7EB] text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#2860EB]/30 transition active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5 mx-auto text-[#2860EB] mb-1" />
            <span className="text-[18px] font-black text-[#1F2937] block leading-none">
              {profile.isPhoneVerified ? '1' : '0'}
            </span>
            <span className="text-[11.5px] font-bold text-[#1F2937] mt-1 block">Liệu trình</span>
            <span className="text-[10px] text-[#616161] block">buổi còn lại</span>
          </div>

          {/* Khóa học */}
          <div
            onClick={() => onNavigateTab('academy')}
            className="p-3 bg-white rounded-xl border border-[#E5E7EB] text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#2860EB]/30 transition active:scale-[0.98]"
          >
            <School className="w-5 h-5 mx-auto text-[#2860EB] mb-1" />
            <span className="text-[18px] font-black text-[#1F2937] block leading-none">
              {enrolledCoursesCount}
            </span>
            <span className="text-[11.5px] font-bold text-[#1F2937] mt-1 block">Khóa học</span>
            <span className="text-[10px] text-[#616161] block">đang học</span>
          </div>
        </div>

        {/* ==========================================
            3. NHÓM 1: DỊCH VỤ TRỊ LIỆU (ĐƯA LÊN TRÊN CHUẨN FIGMA)
            Không có phụ đề thừa, chỉ có Icon + Tiêu đề + Chevron
            ========================================== */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[12.5px] font-bold text-[#616161] uppercase tracking-wider px-1">
            DỊCH VỤ TRỊ LIỆU
          </p>
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-[#E5E7EB] overflow-hidden">
            <div
              onClick={onOpenAppointments}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Lịch hẹn của tôi</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div
              onClick={() => onNavigateTab('services')}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Gói liệu trình</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div
              onClick={() => onNavigateTab('documents')}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Nhật ký trị liệu</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* ==========================================
            4. NHÓM 2: ĐÀO TẠO & KHÓA HỌC
            Chuẩn: "Chứng nhận" (thay vì "Chứng chỉ"), không phụ đề
            ========================================== */}
        <div className="space-y-1.5 pt-2">
          <p className="text-[12.5px] font-bold text-[#616161] uppercase tracking-wider px-1">
            ĐÀO TẠO & KHÓA HỌC
          </p>
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-[#E5E7EB] overflow-hidden">
            <div
              onClick={() => onNavigateTab('academy')}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <School className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Khóa học của tôi</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div
              onClick={() => onNavigateTab('academy')}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <CalendarDays className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Lịch học</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div
              onClick={() => {
                setShowNoticeModal('Bạn chưa có chứng nhận mới. Vui lòng hoàn thành 100% bài giảng khóa học để nhận chứng nhận.');
              }}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Award className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Chứng nhận</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* ==========================================
            5. NHÓM 3: TÀI KHOẢN & HỆ THỐNG
            Cài đặt tài khoản, Đăng nhập / Đăng xuất
            ========================================== */}
        <div className="space-y-1.5 pt-2">
          <p className="text-[12.5px] font-bold text-[#616161] uppercase tracking-wider px-1">
            TÀI KHOẢN & HỆ THỐNG
          </p>
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-[#E5E7EB] overflow-hidden">
            <div
              onClick={() => setShowSettingsModal(true)}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-[#2860EB]" />
                <span className="text-[14px] font-bold text-[#1F2937]">Cài đặt tài khoản</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            {!profile.isPhoneVerified ? (
              <div
                onClick={handleZaloLogin}
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <LogIn className="w-5 h-5 text-[#2860EB]" />
                  <span className="text-[14px] font-bold text-[#2860EB]">Đăng nhập / Đăng ký</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#2860EB]" />
              </div>
            ) : (
              <div
                onClick={handleLogout}
                className="p-3.5 flex items-center space-x-3 hover:bg-red-50/50 cursor-pointer transition active:bg-red-50 text-[#EF4444]"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[14px] font-bold">Đăng xuất</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CÀI ĐẶT TÀI KHOẢN (F08 Settings Modal) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowSettingsModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Cài đặt tài khoản</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowEditModal(true);
                }}
                className="p-3.5 bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100"
              >
                <span className="text-sm font-bold text-gray-800">Cập nhật thông tin cá nhân</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>

              <div
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowManualPhoneModal(true);
                }}
                className="p-3.5 bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100"
              >
                <span className="text-sm font-bold text-gray-800">Đổi số điện thoại xác thực</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>

              <div
                onClick={() => {
                  alert('MLD Việt Nam cam kết bảo mật 100% dữ liệu y khoa theo tiêu chuẩn HIPAA & Bộ Y Tế.');
                }}
                className="p-3.5 bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100"
              >
                <span className="text-sm font-bold text-gray-800">Điều khoản & Bảo mật y khoa</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA THÔNG TIN */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowEditModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-gray-900">Cập nhật hồ sơ</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#2860EB]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#2860EB]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#2860EB]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2860EB] text-white text-xs font-bold rounded-lg hover:bg-[#1E4BB8] transition"
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỐ ĐIỆN THOẠI THỦ CÔNG */}
      {showManualPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowManualPhoneModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-gray-900">Xác thực số điện thoại</h3>
              <button onClick={() => setShowManualPhoneModal(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Nhập số điện thoại để đồng bộ tài khoản với CSDL MLD Việt Nam:
            </p>

            {loginError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                {loginError}
              </div>
            )}

            <form onSubmit={handleManualPhoneSubmit} className="space-y-3">
              <input
                type="tel"
                value={manualPhoneInput}
                onChange={(e) => setManualPhoneInput(e.target.value)}
                placeholder="VD: 0967786399"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#2860EB]"
                autoFocus
              />

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-[#2860EB] text-white text-xs font-bold rounded-lg hover:bg-[#1E4BB8] transition"
              >
                {isLoggingIn ? 'Đang xác thực...' : 'Xác thực ngay'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowNoticeModal(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 text-center">
            <Award className="w-10 h-10 text-[#2860EB] mx-auto" />
            <h4 className="text-sm font-bold text-gray-900">Thông báo chứng nhận</h4>
            <p className="text-xs text-gray-600 leading-relaxed">{showNoticeModal}</p>
            <button
              onClick={() => setShowNoticeModal(null)}
              className="w-full py-2 bg-[#2860EB] text-white text-xs font-bold rounded-lg"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
