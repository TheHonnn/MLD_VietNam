import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { zaloAuthService } from '@/api/zalo-auth-service';
import { UserProfile } from '@/core/types';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Activity,
  GraduationCap,
  Settings,
  ShieldCheck,
  Globe,
  PhoneCall,
  LogOut,
  Edit3,
  CheckCircle,
  FileText,
  Clock,
  ChevronRight,
  X,
  Award,
  LogIn,
} from 'lucide-react';

interface ProfileScreenProps {
  currentUser?: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  onNavigateTab: (tab: 'home' | 'services' | 'academy' | 'treatment' | 'profile') => void;
  onOpenAppointments: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onProfileUpdated,
  onNavigateTab,
  onOpenAppointments,
}) => {
  const [profile, setProfile] = useState<UserProfile>(currentUser || supabaseApi.getUserProfile());
  const [appointmentsCount, setAppointmentsCount] = useState(0);

  // Modals & Auth State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showManualPhoneModal, setShowManualPhoneModal] = useState(false);
  const [manualPhoneInput, setManualPhoneInput] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'vi' | 'en'>('vi');

  // Edit Form Fields
  const [editName, setEditName] = useState(profile.fullName);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editDob, setEditDob] = useState(profile.dateOfBirth || '1992-05-18');
  const [editGender, setEditGender] = useState(profile.gender || 'Nữ');

  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setEditName(currentUser.fullName);
      setEditPhone(currentUser.phone);
      setEditEmail(currentUser.email);
    } else {
      const p = supabaseApi.getUserProfile();
      setProfile(p);
      setEditName(p.fullName);
      setEditPhone(p.phone);
      setEditEmail(p.email);
    }
    const appts = supabaseApi.getAppointments();
    setAppointmentsCount(appts.length);
  }, [currentUser]);

  const handleZaloLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await zaloAuthService.loginWithZalo();
      if (result.success && result.user) {
        setProfile(result.user);
        onProfileUpdated?.(result.user);
      } else {
        setShowManualPhoneModal(true);
      }
    } catch (err: any) {
      console.warn('Zalo login prompt error:', err);
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
      const result = await zaloAuthService.loginWithZalo(manualPhoneInput.trim());
      if (result.success && result.user) {
        setProfile(result.user);
        onProfileUpdated?.(result.user);
        setShowManualPhoneModal(false);
        setManualPhoneInput('');
      } else {
        setLoginError(result.error || 'Không thể xác thực số điện thoại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất tài khoản? Ứng dụng sẽ chuyển về chế độ khách.')) {
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
      dateOfBirth: editDob,
      gender: editGender,
    });
    setProfile(updated);
    onProfileUpdated?.(updated);
    setIsEditModalOpen(false);
  };

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-5 rounded-b-2xl shadow-md">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <img
              src={profile.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'}
              alt={profile.fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/60 shadow"
            />
            {profile.isPhoneVerified && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 bg-white text-blue-600 p-1 rounded-full shadow hover:bg-blue-50 transition"
                title="Chỉnh sửa hồ sơ"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold truncate">
                {profile.isPhoneVerified ? profile.fullName : 'Khách hàng'}
              </h1>
              {profile.isPhoneVerified ? (
                <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-semibold flex items-center shrink-0">
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Đã xác thực
                </span>
              ) : (
                <span className="bg-white/20 text-blue-100 text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0">
                  Chế độ khách
                </span>
              )}
            </div>
            {profile.isPhoneVerified ? (
              <>
                <p className="text-xs text-blue-100 flex items-center mt-1 truncate">
                  <Phone className="w-3.5 h-3.5 mr-1 shrink-0 text-blue-200" />
                  {profile.phone}
                </p>
                {profile.email && (
                  <p className="text-xs text-blue-100 flex items-center mt-0.5 truncate">
                    <Mail className="w-3.5 h-3.5 mr-1 shrink-0 text-blue-200" />
                    {profile.email}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-blue-100/90 mt-1">
                Chưa kết nối tài khoản Zalo
              </p>
            )}
          </div>
        </div>

        {/* 3 Quick Stat Summary Cards */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div
            onClick={onOpenAppointments}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center cursor-pointer hover:bg-white/20 transition"
          >
            <span className="text-lg font-black block leading-none">{appointmentsCount}</span>
            <span className="text-[11px] text-blue-100 mt-1 block">Lịch hẹn</span>
          </div>

          <div
            onClick={() => onNavigateTab('treatment')}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center cursor-pointer hover:bg-white/20 transition"
          >
            <span className="text-lg font-black block leading-none">1</span>
            <span className="text-[11px] text-blue-100 mt-1 block">Liệu trình</span>
          </div>

          <div
            onClick={() => onNavigateTab('academy')}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center cursor-pointer hover:bg-white/20 transition"
          >
            <span className="text-lg font-black block leading-none">1</span>
            <span className="text-[11px] text-blue-100 mt-1 block">Khóa học</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Banner Đăng nhập Zalo 1-Chạm khi ở chế độ Khách */}
        {!profile.isPhoneVerified && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Đăng nhập tài khoản MLD</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Xác thực 1-chạm qua Zalo để đồng bộ lịch hẹn, mở khóa tiến độ học viện và nhận thông báo nhắc lịch trị liệu.
                </p>
                <button
                  type="button"
                  onClick={handleZaloLogin}
                  disabled={isLoggingIn}
                  className="mt-3 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  {isLoggingIn ? (
                    <span>Đang kết nối Zalo...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-1" />
                      <span>Đăng nhập bằng Zalo 1-chạm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Section 1: Dịch vụ & Trị liệu */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Dịch vụ & Trị liệu lâm sàng</span>
          </div>

          <div className="divide-y divide-slate-100">
            <div
              onClick={onOpenAppointments}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Lịch hẹn của tôi</span>
                  <span className="text-[11px] text-slate-500">Xem danh sách lịch sắp tới & lịch sử đặt</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => onNavigateTab('treatment')}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Gói liệu trình của tôi</span>
                  <span className="text-[11px] text-slate-500">Phác đồ Vodder đang điều trị & đo lường</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => onNavigateTab('treatment')}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Nhật ký dẫn lưu bạch huyết</span>
                  <span className="text-[11px] text-slate-500">Theo dõi chỉ số giảm phù nề chi tiết</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Section 2: Đào tạo MLD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Đào tạo & Học viện MLD</span>
          </div>

          <div className="divide-y divide-slate-100">
            <div
              onClick={() => onNavigateTab('academy')}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Khóa học đã đăng ký</span>
                  <span className="text-[11px] text-slate-500">Tiếp tục xem video bài giảng & thi đánh giá</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => onNavigateTab('academy')}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Chứng nhận hoàn thành</span>
                  <span className="text-[11px] text-slate-500">Chứng nhận y khoa chuẩn Vodder CHLB Đức</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Section 3: Cài đặt & Hỗ trợ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Cài đặt & Pháp lý</span>
          </div>

          <div className="divide-y divide-slate-100">
            <div
              onClick={() => setIsEditModalOpen(true)}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Chỉnh sửa hồ sơ cá nhân</span>
                  <span className="text-[11px] text-slate-500">Cập nhật họ tên, số điện thoại, ngày sinh</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => setIsLanguageModalOpen(true)}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Ngôn ngữ hiển thị</span>
                  <span className="text-[11px] text-slate-500">
                    {selectedLanguage === 'vi' ? 'Tiếng Việt' : 'English'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => setIsTermsModalOpen(true)}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Điều khoản & Bảo mật y khoa</span>
                  <span className="text-[11px] text-slate-500">Quy định về dữ liệu lâm sàng và bảo mật</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <a
              href="tel:0967786399"
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Hotline Chuyên gia: 096.7786.399</span>
                  <span className="text-[11px] text-slate-500">Tư vấn hỗ trợ lâm sàng 24/7</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>

            {/* Nút Đăng xuất - Chỉ hiển thị khi đã đăng nhập */}
            {profile.isPhoneVerified && (
              <div
                onClick={handleLogout}
                className="p-3.5 flex items-center justify-between hover:bg-rose-50 cursor-pointer transition text-rose-600 border-t border-slate-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Đăng xuất tài khoản</span>
                    <span className="text-[11px] text-slate-400">Trở về chế độ khách khám phá</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: F02 Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Chỉnh sửa hồ sơ cá nhân</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Giới tính</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: F08 Language Switcher Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Chọn ngôn ngữ / Select Language</h3>
              <button onClick={() => setIsLanguageModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage('vi');
                  setIsLanguageModalOpen(false);
                }}
                className={`w-full p-3 rounded-xl border text-xs font-semibold text-left flex items-center justify-between ${
                  selectedLanguage === 'vi' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <span>Tiếng Việt (Mặc định)</span>
                {selectedLanguage === 'vi' && <CheckCircle className="w-4 h-4 text-blue-600" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage('en');
                  setIsLanguageModalOpen(false);
                }}
                className={`w-full p-3 rounded-xl border text-xs font-semibold text-left flex items-center justify-between ${
                  selectedLanguage === 'en' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <span>English (International)</span>
                {selectedLanguage === 'en' && <CheckCircle className="w-4 h-4 text-blue-600" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: F10 Terms & Privacy Modal */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">Điều khoản & Bảo mật Y khoa (F10)</h3>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-600 space-y-3 leading-relaxed">
              <h4 className="font-bold text-slate-900">1. Bảo mật dữ liệu lâm sàng</h4>
              <p>
                Toàn bộ dữ liệu về chu vi mô, hình ảnh vùng trị liệu và lịch sử y khoa của quý khách chỉ được sử dụng cho mục đích theo dõi phác đồ dẫn lưu bạch huyết nội bộ tại MLD Vietnam và tuân thủ tiêu chuẩn bảo mật y tế.
              </p>
              <h4 className="font-bold text-slate-900">2. Bản quyền bài giảng & Video</h4>
              <p>
                Các bài giảng video và tài liệu đào tạo MLD Vodder trên ứng dụng thuộc bản quyền của MLD Vietnam. Mọi hành vi sao chép, quay lén hoặc phát tán trái phép đều bị xử lý theo pháp luật.
              </p>
              <h4 className="font-bold text-slate-900">3. Chính sách hủy / Đổi lịch</h4>
              <p>
                Quý khách vui lòng thông báo dời lịch trị liệu trước tối thiểu 4 tiếng để chuyên viên kịp thời sắp xếp phòng chức năng.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="py-2 px-5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                Tôi đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Manual Phone Modal (Dự phòng khi chạy ngoài Zalo hoặc SDK không hỗ trợ) */}
      {showManualPhoneModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Kết nối Số điện thoại Zalo</h3>
              </div>
              <button
                onClick={() => setShowManualPhoneModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Nhập số điện thoại Zalo của bạn để đồng bộ hồ sơ khách hàng và lưu trữ lịch hẹn:
            </p>

            <form onSubmit={handleManualPhoneSubmit} className="space-y-3">
              <div>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0967786399"
                  value={manualPhoneInput}
                  onChange={(e) => setManualPhoneInput(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-semibold"
                  autoFocus
                  required
                />
              </div>

              {loginError && (
                <p className="text-[11px] text-rose-600 font-medium">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Đang xác thực...' : 'Xác nhận kết nối'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

