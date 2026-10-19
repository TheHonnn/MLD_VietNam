import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LoaderCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAdmin } from './Auth';

export const LoginPage: React.FC = () => {
  const { login } = useAdmin();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email quản trị.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Đăng nhập không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F1E8] flex flex-col justify-center items-center p-4 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#F3E2CE] selection:text-[#8A4F23]">
      {/* Background Decor Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#BA7E4C_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-[#EFE4D9] p-8 shadow-sm transition-all">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="border border-[#D8C4B2] rounded-2xl px-4 py-2 bg-white flex items-center justify-center h-[64px] w-[200px] shadow-xs mb-4">
              <img
                src="/logo.png"
                alt="MLD Vietnam - Cộng Đồng Dẫn Lưu Bạch Huyết Việt Nam"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF5EF] text-[#8A4F23] border border-[#EAE0D5] mb-2 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cổng Quản Trị Hệ Thống</span>
            </div>
            <h1 className="text-xl font-bold text-[#2C241E]">
              Đăng nhập tài khoản
            </h1>
            <p className="text-xs text-[#7A6D61] mt-1 max-w-[280px]">
              Hệ thống vận hành Spa & Học viện Đào tạo nghề MLD Việt Nam
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] flex items-start gap-2.5 text-xs text-[#9B1C1C] animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E02424]" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4A3E34] mb-1.5">
                Địa chỉ email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A69788]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Nhập địa chỉ email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C4B2] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#8A4F23] focus:ring-2 focus:ring-[#BA7E4C]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#4A3E34]">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A69788]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#D8C4B2] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#8A4F23] focus:ring-2 focus:ring-[#BA7E4C]/20 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A69788] hover:text-[#4A3E34] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#8A4F23] hover:bg-[#723E18] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Note */}
        <div className="text-center mt-6 text-[11px] text-[#8C7A6B]">
          <p>© 2026 MLD Vietnam Healthcare Admin. All rights reserved.</p>
          <p className="mt-1 text-[10px] text-[#A69788]">
            Được bảo vệ bởi cơ chế bảo mật Supabase Cloud & mã hóa phân quyền RBAC
          </p>
        </div>
      </div>
    </div>
  );
};
