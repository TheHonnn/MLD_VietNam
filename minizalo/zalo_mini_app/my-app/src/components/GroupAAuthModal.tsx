import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { User } from '../../../../backend/src/data/database';
import {
  LeafIcon,
  CloseIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SmartPhoneIcon,
  ShieldIcon,
  CameraIcon,
  CheckIcon,
  HeartIcon,
  NavAcademyIcon,
  StarIcon,
} from '@/components/Icons';

interface GroupAAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialStep?: 'splash' | 'onboarding' | 'login' | 'otp' | 'profile' | 'interests';
  canClose?: boolean;
}

export const GroupAAuthModal: React.FC<GroupAAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialStep = 'splash',
  canClose = false,
}) => {
  const [step, setStep] = useState<'splash' | 'onboarding' | 'login' | 'otp' | 'profile' | 'interests'>(initialStep);

  // Form states
  const [phone, setPhone] = useState('0912345678');
  const [otp, setOtp] = useState(['2', '4', '6', '8', '', '']);
  const [timer, setTimer] = useState(45);
  const [fullName, setFullName] = useState('Nguyễn Minh Anh');
  const [dob, setDob] = useState('15/08/1998');
  const [gender, setGender] = useState<'Nữ' | 'Nam'>('Nữ');
  const [email, setEmail] = useState('minh.anh@example.com');
  const [selectedInterest, setSelectedInterest] = useState<'wellness' | 'academy' | 'both'>('both');
  const [onboardingSlide, setOnboardingSlide] = useState(0);

  // Reset to initialStep whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setOnboardingSlide(0);
    }
  }, [isOpen, initialStep]);

  // Splash auto-transition after 2.2s
  useEffect(() => {
    let splashTimer: any;
    if (isOpen && step === 'splash') {
      splashTimer = setTimeout(() => {
        setStep('onboarding');
      }, 2200);
    }
    return () => clearTimeout(splashTimer);
  }, [isOpen, step]);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  // Onboarding slides
  const slides = [
    {
      title: 'Chăm sóc sức khỏe mỗi ngày',
      desc: 'Trải nghiệm các dịch vụ spa, thư giãn và chăm sóc sức khỏe chuyên nghiệp.',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Đào tạo nghề spa chuẩn y khoa',
      desc: 'Học nghề thực chiến, cấp chứng chỉ quốc gia và đồng hành phát triển sự nghiệp.',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Dẫn lưu bạch huyết MLD Vodder',
      desc: 'Công nghệ phục hồi và thải độc hệ miễn dịch độc quyền chuẩn Châu Âu.',
      image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&auto=format&fit=crop&q=80',
    },
  ];

  // Handlers
  const handleSendOtp = async () => {
    await apiClient.sendOtp(phone);
    setTimer(45);
    setStep('otp');
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    const res = await apiClient.verifyOtp(phone, code);
    if (res?.user) {
      setStep('profile');
    } else {
      setStep('profile');
    }
  };

  const handleSaveProfile = async () => {
    await apiClient.updateProfile({
      name: fullName,
      dob,
      gender,
      email,
    });
    setStep('interests');
  };

  const handleFinish = () => {
    const mockUser: User = {
      id: `usr_${Date.now()}`,
      name: fullName,
      phone,
      email,
      role: selectedInterest === 'academy' ? 'student' : 'patient',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      tier: 'Gold',
      points: 2450,
      dob,
      gender,
      address: '123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh',
    };
    onLoginSuccess(mockUser);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in">
      <div className="w-full h-full bg-[#FAF6F0] flex flex-col overflow-y-auto no-scrollbar">
        {canClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-white/90 shadow-sm border border-stone-200 flex items-center justify-center text-stone-700 transition"
            title="Đóng"
          >
            <CloseIcon size={14} color="#40352F" />
          </button>
        )}

        {/* 1. SCREEN A01: SPLASH SCREEN */}
        {step === 'splash' && (
          <div className="p-6 flex-1 flex flex-col justify-between items-center text-center bg-gradient-to-b from-[#FBF8F5] to-[#F5ECE1] relative">
            <div className="w-full flex justify-end">
              <button onClick={() => setStep('onboarding')} className="text-xs text-stone-500 font-semibold underline">
                Bỏ qua
              </button>
            </div>

            <div className="my-auto space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white shadow-lg p-3 flex items-center justify-center border border-[#98501B]/20">
                <LeafIcon size={40} color="#98501B" />
              </div>
              <div className="inline-block bg-[#98501B]/10 px-3 py-1 rounded-full text-[11px] font-bold text-[#98501B] uppercase tracking-wider">
                MLD Vietnam
              </div>
              <div className="text-xs text-stone-500 font-medium tracking-wide">
                CỘNG ĐỒNG DẪN LƯU BẠCH HUYẾT VIỆT NAM
              </div>
              <h2 className="text-xl font-bold text-[#98501B] uppercase tracking-wide">
                Chăm Sóc Sức Khỏe & Đào Tạo Nghề
              </h2>
              <p className="text-xs text-stone-600 italic">
                Tận tâm chăm sóc – Đồng hành phát triển
              </p>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-center space-x-2 text-xs text-stone-500">
                <div className="w-4 h-4 border-2 border-[#98501B] border-t-transparent rounded-full animate-spin"></div>
                <span>Đang chuẩn bị trải nghiệm...</span>
              </div>
              <button
                onClick={() => setStep('onboarding')}
                className="w-full py-3 bg-[#98501B] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#884218] transition"
              >
                Bắt đầu khám phá
              </button>
            </div>
          </div>
        )}

        {/* 2. SCREEN A02: ONBOARDING CAROUSEL */}
        {step === 'onboarding' && (
          <div className="p-6 flex-1 flex flex-col justify-between bg-[#FAF6F0]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-500 tracking-wider">CHĂM SÓC & PHÁT TRIỂN</span>
              <button onClick={() => setStep('login')} className="text-xs text-[#98501B] font-bold">
                Bỏ qua
              </button>
            </div>

            {/* Arch photo container */}
            <div className="my-4">
              <div className="h-56 w-full rounded-t-full rounded-b-3xl overflow-hidden shadow-lg border-2 border-[#98501B]/20 relative">
                <img
                  src={slides[onboardingSlide].image}
                  alt="Spa Onboarding"
                  className="w-full h-full object-cover transition-all duration-500"
                />
              </div>

              {/* Dots */}
              <div className="flex justify-center space-x-2 mt-4">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setOnboardingSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === onboardingSlide ? 'w-6 bg-[#98501B]' : 'w-2 bg-stone-300'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-bold text-stone-900">{slides[onboardingSlide].title}</h3>
                <p className="text-xs text-stone-600 mt-2 px-2 leading-relaxed">
                  {slides[onboardingSlide].desc}
                </p>
              </div>
            </div>

            <div>
              {onboardingSlide < slides.length - 1 ? (
                <button
                  onClick={() => setOnboardingSlide((prev) => prev + 1)}
                  className="w-full py-3.5 bg-[#98501B] text-white font-bold rounded-2xl text-sm shadow-md hover:bg-[#884218] transition"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  onClick={() => setStep('login')}
                  className="w-full py-3.5 bg-[#98501B] text-white font-bold rounded-2xl text-sm shadow-md hover:bg-[#884218] transition"
                >
                  Đăng nhập / Đăng ký
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. SCREEN A03: WELCOME & PHONE LOGIN */}
        {step === 'login' && (
          <div className="p-6 flex-1 flex flex-col justify-between bg-[#FAF6F0]">
            <div>
              <div className="flex items-center space-x-2.5 mb-6">
                <div className="w-9 h-9 rounded-xl bg-white shadow flex items-center justify-center border border-[#98501B]/20">
                  <LeafIcon size={20} color="#98501B" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#98501B]">MLD Vietnam</div>
                  <div className="text-[10px] text-stone-500">Cộng Đồng Dẫn Lưu Bạch Huyết</div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-stone-900 leading-tight">Chào mừng bạn!</h2>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Đăng nhập để trải nghiệm dịch vụ chăm sóc sức khỏe và các khóa đào tạo nghề.
              </p>

              {/* Phone input */}
              <div className="mt-6">
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">Số điện thoại</label>
                <div className="flex border border-stone-300 rounded-2xl bg-white overflow-hidden focus-within:border-[#98501B] shadow-sm">
                  <div className="px-3.5 py-3 bg-stone-100 text-xs font-bold text-stone-700 border-r border-stone-200 flex items-center">
                    +84
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="912 345 678"
                    className="flex-1 px-3 py-3 text-sm font-semibold text-stone-800 outline-none bg-transparent"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-2">
                  Chúng tôi sẽ gửi mã OTP để xác thực số điện thoại của bạn.
                </p>
              </div>

              <button
                onClick={handleSendOtp}
                className="w-full mt-5 py-3.5 bg-[#98501B] text-white font-bold rounded-2xl text-sm shadow-md hover:bg-[#884218] transition flex items-center justify-center space-x-2"
              >
                <span>Tiếp tục</span>
                <ArrowRightIcon size={14} color="#FFFFFF" />
              </button>

              {/* Security info card */}
              <div className="mt-4 p-3 bg-stone-200/50 rounded-2xl flex items-start space-x-2.5 border border-stone-200">
                <ShieldIcon size={16} color="#98501B" className="shrink-0 mt-0.5" />
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Thông tin của bạn được bảo mật và sử dụng để hỗ trợ trải nghiệm.
                </p>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-stone-200 mt-4">
              <span className="text-xs text-[#98501B] font-semibold cursor-pointer">Cần hỗ trợ?</span>
              <p className="text-[10px] text-stone-500 mt-1">
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <span className="underline cursor-pointer">Điều khoản dịch vụ</span> |{' '}
                <span className="underline cursor-pointer">Chính sách bảo mật</span>
              </p>
            </div>
          </div>
        )}

        {/* 4. SCREEN A04: OTP VERIFICATION */}
        {step === 'otp' && (
          <div className="p-6 flex-1 flex flex-col justify-between bg-[#FAF6F0]">
            <div>
              <button
                onClick={() => setStep('login')}
                className="text-stone-600 hover:text-stone-900 flex items-center space-x-1.5 text-xs mb-4"
              >
                <ArrowLeftIcon size={14} color="#40352F" />
                <span>Quay lại</span>
              </button>

              <div className="w-12 h-12 rounded-2xl bg-[#98501B]/10 text-[#98501B] flex items-center justify-center mb-4">
                <SmartPhoneIcon size={24} color="#98501B" />
              </div>

              <h2 className="text-xl font-bold text-stone-900">Xác thực số điện thoại</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Nhập mã OTP đã được gửi đến số điện thoại của bạn:
                <br />
                <span className="font-bold text-stone-900">+84 {phone}</span>
              </p>

              {/* OTP 6 Boxes */}
              <div className="flex justify-between space-x-2 mt-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newOtp = [...otp];
                      newOtp[index] = val;
                      setOtp(newOtp);
                    }}
                    className="w-11 h-13 text-center text-lg font-bold bg-white border border-stone-300 rounded-xl focus:border-[#98501B] outline-none shadow-sm"
                  />
                ))}
              </div>

              <div className="mt-4 text-center">
                {timer > 0 ? (
                  <p className="text-xs text-stone-500 font-medium">
                    Gửi lại mã sau <span className="font-bold text-[#98501B]">00:{timer < 10 ? `0${timer}` : timer}</span>
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      setTimer(45);
                      setOtp(['2', '4', '6', '8', '0', '0']);
                    }}
                    className="text-xs text-[#98501B] font-bold underline"
                  >
                    Gửi lại mã OTP
                  </button>
                )}
                <button
                  onClick={() => setStep('login')}
                  className="block mx-auto mt-2 text-xs text-stone-500 underline"
                >
                  Thay đổi số điện thoại
                </button>
              </div>

              {/* Demo note */}
              <div className="mt-4 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                <span>Bản minh họa giao diện. Mã OTP mặc định: <b>246800</b></span>
              </div>
            </div>

            <div>
              <button
                onClick={handleVerifyOtp}
                className="w-full py-3.5 bg-[#98501B] text-white font-bold rounded-2xl text-sm shadow-md hover:bg-[#884218] transition"
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}

        {/* 5. SCREEN A05: COMPLETE PROFILE */}
        {step === 'profile' && (
          <div className="p-6 flex-1 flex flex-col justify-between bg-[#FAF6F0] overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setStep('otp')} className="text-stone-600 text-xs flex items-center space-x-1">
                  <ArrowLeftIcon size={12} color="#40352F" />
                  <span>Quay lại</span>
                </button>
                <span className="text-xs font-bold text-stone-500 tracking-wider">HỒ SƠ CÁ NHÂN</span>
              </div>

              <h2 className="text-xl font-bold text-stone-900">Hoàn thiện hồ sơ</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Vui lòng cập nhật thông tin để chúng tôi phục vụ bạn tốt hơn.
              </p>

              {/* Avatar Uploader */}
              <div className="mt-4 flex items-center space-x-4 p-3 bg-white rounded-2xl border border-stone-200 shadow-sm">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center">
                    <CameraIcon size={24} color="#8C7E74" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#98501B] text-white rounded-full flex items-center justify-center text-[10px] shadow">
                    <CameraIcon size={10} color="#FFFFFF" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#98501B]">Thêm ảnh đại diện</div>
                  <div className="text-[10px] text-stone-500">Có thể cập nhật sau</div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-stone-300 rounded-xl outline-none focus:border-[#98501B] font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Số điện thoại</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={phone}
                      className="w-full px-3 py-2.5 text-xs bg-stone-100 border border-stone-200 rounded-xl text-stone-600 font-semibold"
                    />
                    <span className="absolute right-3 top-2.5 text-emerald-600">
                      <CheckIcon size={14} color="#2E8B57" />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Ngày sinh</label>
                    <input
                      type="text"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-stone-300 rounded-xl outline-none focus:border-[#98501B]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Giới tính</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-stone-300 rounded-xl outline-none focus:border-[#98501B]"
                    >
                      <option value="Nữ">Nữ</option>
                      <option value="Nam">Nam</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-stone-300 rounded-xl outline-none focus:border-[#98501B]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-stone-500 mt-3 italic">
                * Bắt buộc. Ngày sinh, giới tính và email là tùy chọn.
              </p>
            </div>

            <div className="mt-4">
              <button
                onClick={handleSaveProfile}
                className="w-full py-3.5 bg-[#98501B] text-white font-bold rounded-2xl text-sm shadow-md hover:bg-[#884218] transition"
              >
                Lưu và tiếp tục
              </button>
            </div>
          </div>
        )}

        {/* 6. SCREEN A06: INTEREST SELECTION */}
        {step === 'interests' && (
          <div className="p-6 flex-1 flex flex-col justify-between bg-[#FAF6F0]">
            <div>
              <button onClick={() => setStep('profile')} className="text-stone-600 text-xs mb-3 flex items-center space-x-1">
                <ArrowLeftIcon size={12} color="#40352F" />
                <span>Quay lại</span>
              </button>

              <h2 className="text-xl font-bold text-stone-900 leading-tight">Bạn quan tâm đến điều gì?</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Chọn nhu cầu của bạn để chúng tôi mang đến trải nghiệm phù hợp nhất.
              </p>

              {/* 3 Interest Cards */}
              <div className="mt-5 space-y-3">
                {/* Option 1: Chăm sóc sức khỏe */}
                <div
                  onClick={() => setSelectedInterest('wellness')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    selectedInterest === 'wellness'
                      ? 'border-[#98501B] bg-amber-50/70 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#98501B] flex items-center justify-center shrink-0">
                    <HeartIcon size={20} color="#98501B" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-stone-900">Chăm sóc sức khỏe</div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Đặt lịch spa, chăm sóc cơ thể, theo dõi liệu trình và nhận ưu đãi.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedInterest === 'wellness' ? 'border-[#98501B] bg-[#98501B]' : 'border-stone-300'
                    }`}
                  >
                    {selectedInterest === 'wellness' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                </div>

                {/* Option 2: Học nghề spa */}
                <div
                  onClick={() => setSelectedInterest('academy')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    selectedInterest === 'academy'
                      ? 'border-[#98501B] bg-amber-50/70 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <NavAcademyIcon size={20} color="#1D4ED8" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-stone-900">Học nghề spa</div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Khám phá khóa học, đăng ký đào tạo và theo dõi quá trình học tập.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedInterest === 'academy' ? 'border-[#98501B] bg-[#98501B]' : 'border-stone-300'
                    }`}
                  >
                    {selectedInterest === 'academy' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                </div>

                {/* Option 3: Cả hai */}
                <div
                  onClick={() => setSelectedInterest('both')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    selectedInterest === 'both'
                      ? 'border-[#98501B] bg-amber-50/70 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#98501B] flex items-center justify-center shrink-0">
                    <StarIcon size={18} color="#98501B" filled />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-stone-900">Cả hai</div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Trải nghiệm đầy đủ dịch vụ chăm sóc sức khỏe và chương trình đào tạo nghề.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedInterest === 'both' ? 'border-[#98501B] bg-[#98501B]' : 'border-stone-300'
                    }`}
                  >
                    {selectedInterest === 'both' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-stone-500 mt-3 text-center">
                Bạn có thể thay đổi lựa chọn này bất cứ lúc nào trong hồ sơ.
              </p>
            </div>

            <div>
              <button
                onClick={handleFinish}
                className="w-full py-3.5 bg-[#98501B] text-white font-bold rounded-2xl text-sm shadow-md hover:bg-[#884218] transition flex items-center justify-center space-x-2"
              >
                <span>Khám phá ứng dụng</span>
                <ArrowRightIcon size={14} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
