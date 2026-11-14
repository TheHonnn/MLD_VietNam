import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminPageShell,
  PageHeader,
  PageTabs,
  PageContent,
} from '../components/common';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { useAdmin } from '../admin/Auth';
import {
  Building2,
  Calendar,
  Receipt,
  Sparkles,
  GraduationCap,
  Smartphone,
  ShieldCheck,
  UserRound,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Printer,
  Lock,
  CreditCard,
  QrCode,
  Clock,
  ExternalLink,
} from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'general', label: 'Doanh nghiệp & Pháp nhân', icon: Building2 },
  { id: 'booking', label: 'Vận hành Lịch hẹn', icon: Calendar },
  { id: 'pos', label: 'Thu ngân & Mẫu in POS', icon: Receipt },
  { id: 'loyalty', label: 'Hội viên & Tích điểm', icon: Sparkles },
  { id: 'academy', label: 'Học viện & Đào tạo', icon: GraduationCap },
  { id: 'integrations', label: 'Tích hợp & Kết nối', icon: Smartphone },
  { id: 'security', label: 'Bảo mật & Phiên làm việc', icon: ShieldCheck },
  { id: 'profile', label: 'Tài khoản cá nhân', icon: UserRound },
];

export const W20_Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') || 'general') as any;
  const { user } = useAdmin();

  const {
    settings,
    loading,
    error,
    saving,
    testingZns,
    isCategoryDirty,
    updateField,
    saveCategory,
    resetCategory,
    reload,
    testZns,
    changePassword,
  } = useAdminSettings();

  // State cho đổi mật khẩu ở Tab Profile
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');

  // Hỗ trợ phím tắt Ctrl+S / Cmd+S để lưu cài đặt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isCategoryDirty(currentTab) && !saving && !loading && !error) {
          saveCategory(currentTab);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, isCategoryDirty, saving, loading, error, saveCategory]);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!oldPassword || !newPassword) {
      setPassError('Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }

    const success = await changePassword(oldPassword, newPassword);
    if (success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const isCurrentDirty = isCategoryDirty(currentTab);

  const needsSettings = currentTab !== 'profile' && currentTab !== 'loyalty';
  const blocked = needsSettings && (loading || Boolean(error));

  return (
    <AdminPageShell className="pb-24">
      {/* 1. Tiêu đề chuẩn trang cài đặt */}
      <PageHeader
        eyebrow="HỆ THỐNG QUẢN TRỊ"
        title="Cài đặt Vận hành & Cấu hình"
        subtitle="Quản lý tham số hoạt động, chính sách doanh nghiệp, mẫu in nhiệt 80mm và kết nối dịch vụ MLD Việt Nam."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reload()}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#7D431C] bg-white border border-[#D9C3AD] rounded-xl hover:bg-[#FAF3EA] transition-colors shadow-2xs cursor-pointer"
              title="Tải lại cài đặt"
            >
              <RefreshCw size={14} />
              <span>Làm mới</span>
            </button>
            {isCurrentDirty && !blocked && (
              <button
                type="button"
                onClick={() => saveCategory(currentTab)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#985018] hover:bg-[#804213] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Thanh Tabs chuẩn MLD */}
      <PageTabs
        tabs={SETTINGS_TABS}
        activeTab={currentTab}
        onChange={handleTabChange}
        variant="line"
        ariaLabel="Danh mục cài đặt hệ thống"
      />

      {/* 3. Nội dung chuyên biệt của từng Tab */}
      <PageContent>
        {blocked ? (
          <div className="rounded-2xl border border-[#E8DFD8] bg-white p-6" role={error ? "alert" : "status"}>
            <p>{error || "Đang tải cấu hình hệ thống…"}</p>
            {error && <button type="button" className="mt-3 underline" onClick={() => reload()}>Thử tải lại</button>}
          </div>
        ) : <>
        {/* ========================================================================= */}
        {/* TAB 1: DOANH NGHIỆP & THƯƠNG HIỆU */}
        {/* ========================================================================= */}
        {currentTab === 'general' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide">
                Hồ sơ Pháp nhân & Thương hiệu
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                Thông tin này được hiển thị công khai trên Portal, chân trang hóa đơn thanh toán và các chứng từ xuất bản.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Tên doanh nghiệp đầy đủ *</label>
                <input
                  type="text"
                  value={settings.general.company_name || ''}
                  onChange={(e) => updateField('general', 'company_name', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="CÔNG TY CỔ PHẦN CHĂM SÓC SỨC KHỎE MLD VIỆT NAM"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Tên viết tắt / Tên thương hiệu *</label>
                <input
                  type="text"
                  value={settings.general.short_name || ''}
                  onChange={(e) => updateField('general', 'short_name', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="MLD Healthcare & Spa"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Mã số thuế doanh nghiệp *</label>
                <input
                  type="text"
                  value={settings.general.tax_code || ''}
                  onChange={(e) => updateField('general', 'tax_code', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="0318889999"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Hotline hỗ trợ khách hàng *</label>
                <input
                  type="text"
                  value={settings.general.hotline || ''}
                  onChange={(e) => updateField('general', 'hotline', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="1900 8888 hoặc 096.7786.399"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Email liên hệ chính thức *</label>
                <input
                  type="email"
                  value={settings.general.email || ''}
                  onChange={(e) => updateField('general', 'email', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="contact@mldvietnam.vn"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Website chính thức</label>
                <input
                  type="text"
                  value={settings.general.website || ''}
                  onChange={(e) => updateField('general', 'website', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="https://mldvietnam.vn"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-[#2C241E]">Địa chỉ trụ sở chính *</label>
                <input
                  type="text"
                  value={settings.general.headquarters_address || ''}
                  onChange={(e) => updateField('general', 'headquarters_address', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="Số 123 Đường Ba Tháng Hai, Phường 11, Quận 10, TP. Hồ Chí Minh"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-[#2C241E]">Giấy phép hoạt động y tế / chứng nhận</label>
                <input
                  type="text"
                  value={settings.general.operating_license || ''}
                  onChange={(e) => updateField('general', 'operating_license', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="GPHĐ-08992/SYT-GCH"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VẬN HÀNH LỊCH HẸN & TRỊ LIỆU */}
        {/* ========================================================================= */}
        {currentTab === 'booking' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide">
                Chính sách Đặt lịch & Tiếp đón khách hàng
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                Các quy định về khung giờ mở cửa, số phút trễ tối đa và điều kiện hủy lịch tự động.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E] flex items-center gap-1.5">
                  <Clock size={14} className="text-[#985018]" />
                  <span>Giờ mở cửa đón khách (HH:mm)</span>
                </label>
                <input
                  type="time"
                  value={settings.booking.open_time || '08:30'}
                  onChange={(e) => updateField('booking', 'open_time', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E] flex items-center gap-1.5">
                  <Clock size={14} className="text-[#985018]" />
                  <span>Giờ đóng cửa ca cuối (HH:mm)</span>
                </label>
                <input
                  type="time"
                  value={settings.booking.close_time || '21:00'}
                  onChange={(e) => updateField('booking', 'close_time', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Bước nhảy khung giờ hẹn (Slot minutes)</label>
                <select
                  value={settings.booking.slot_duration_minutes || 30}
                  onChange={(e) => updateField('booking', 'slot_duration_minutes', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                >
                  <option value={15}>15 phút / ca hẹn</option>
                  <option value={30}>30 phút / ca hẹn (Chuẩn MLD)</option>
                  <option value={45}>45 phút / ca hẹn</option>
                  <option value={60}>60 phút / ca hẹn</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Thời gian trễ tối đa cho phép (phút)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={settings.booking.max_late_minutes || 15}
                  onChange={(e) => updateField('booking', 'max_late_minutes', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
                <span className="text-[11px] text-[#8C7A6B]">
                  Quá thời gian này, hệ thống sẽ gợi ý chuyển trạng thái thành No-Show hoặc nhường giường.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Khoảng đệm dọn phòng giữa 2 ca liên tiếp (phút)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={settings.booking.buffer_time_minutes || 10}
                  onChange={(e) => updateField('booking', 'buffer_time_minutes', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Hạn hủy lịch trước giờ hẹn không mất phí (giờ)</label>
                <input
                  type="number"
                  min={0}
                  max={48}
                  value={settings.booking.cancel_deadline_hours || 2}
                  onChange={(e) => updateField('booking', 'cancel_deadline_hours', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="md:col-span-2 pt-2 border-t border-[#F2ECE5]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.booking.allow_pick_technician)}
                    onChange={(e) => updateField('booking', 'allow_pick_technician', e.target.checked)}
                    className="w-4 h-4 rounded text-[#985018] focus:ring-[#985018] border-[#D9C3AD]"
                  />
                  <div>
                    <span className="font-bold text-[#2C241E] block">Cho phép khách chọn đích danh Kỹ thuật viên (KTV)</span>
                    <span className="text-[11px] text-[#73675F] block">
                      Nếu bật, khách hàng trên App có thể chỉ định chuyên viên quen thuộc khi đặt hẹn.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: THU NGÂN POS & MẪU IN HÓA ĐƠN NHIỆT 80MM (CÓ LIVE PREVIEW) */}
        {/* ========================================================================= */}
        {currentTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Form cấu hình POS */}
            <div className="lg:col-span-7 bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide flex items-center gap-2">
                  <CreditCard size={16} className="text-[#985018]" />
                  <span>Cấu hình Thanh toán & Mẫu In Biên lai</span>
                </h2>
                <p className="text-xs text-[#73675F] mt-1">
                  Tùy chỉnh các phương thức thanh toán tại quầy và nội dung in trên giấy in nhiệt 80mm.
                </p>
              </div>

              {/* Các phương thức thanh toán */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#2C241E] block">Phương thức thanh toán chấp nhận tại quầy:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] cursor-pointer hover:bg-white">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.enable_cash)}
                      onChange={(e) => updateField('pos', 'enable_cash', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">Tiền mặt tại quầy</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] cursor-pointer hover:bg-white">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.enable_vietqr)}
                      onChange={(e) => updateField('pos', 'enable_vietqr', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">Chuyển khoản VietQR</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] cursor-pointer hover:bg-white">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.enable_card_pos)}
                      onChange={(e) => updateField('pos', 'enable_card_pos', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">Quẹt thẻ POS ngân hàng</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] cursor-pointer hover:bg-white">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.enable_treatment_wallet)}
                      onChange={(e) => updateField('pos', 'enable_treatment_wallet', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">Trừ buổi gói liệu trình</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] cursor-pointer hover:bg-white sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.enable_loyalty_points)}
                      onChange={(e) => updateField('pos', 'enable_loyalty_points', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">Sử dụng điểm tích lũy thành viên</span>
                  </label>
                </div>
              </div>

              {/* Tùy chỉnh chữ trên mẫu in */}
              <div className="space-y-4 pt-3 border-t border-[#F2ECE5] text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C241E]">Tiêu đề đầu hóa đơn in nhiệt (Header text)</label>
                  <input
                    type="text"
                    value={settings.pos.receipt_header_text || ''}
                    onChange={(e) => updateField('pos', 'receipt_header_text', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                    placeholder="MLD HEALTHCARE & SPA - TRỊ LIỆU DẪN LƯU BẠCH HUYẾT"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C241E]">Lời nhắn chân trang biên lai (Footer note)</label>
                  <textarea
                    rows={3}
                    value={settings.pos.receipt_footer_note || ''}
                    onChange={(e) => updateField('pos', 'receipt_footer_note', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                    placeholder="Cảm ơn Quý khách đã tin tưởng dịch vụ MLD. Chúc Quý khách có một ngày thư thái!"
                  />
                  <span className="text-[11px] text-[#8C7A6B]">
                    Xuất hiện ở đáy giấy in nhiệt kèm mã QR tra cứu hoặc đánh giá dịch vụ.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.require_discount_reason)}
                      onChange={(e) => updateField('pos', 'require_discount_reason', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">
                      Bắt buộc thu ngân nhập lý do khi giảm giá thủ công
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.pos.auto_print_receipt_on_payment)}
                      onChange={(e) => updateField('pos', 'auto_print_receipt_on_payment', e.target.checked)}
                      className="w-4 h-4 text-[#985018] rounded"
                    />
                    <span className="font-medium text-[#2C241E]">
                      Tự động mở hộp thoại in nhiệt ngay sau khi bấm xác nhận thanh toán
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Cột phải: Live Preview Hóa đơn in nhiệt 80mm */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider flex items-center gap-1.5">
                  <Printer size={13} />
                  <span>Xem trước Mẫu In Nhiệt 80mm</span>
                </span>
                <span className="text-[11px] font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                  Live Preview
                </span>
              </div>

              {/* Thẻ mô phỏng cuộn giấy in nhiệt */}
              <div className="w-full max-w-[340px] bg-white border border-[#D9C3AD] rounded-xl shadow-lg p-5 font-mono text-[11px] text-[#1E1915] select-none space-y-3">
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-[#A8988B]">
                  <p className="font-bold text-xs uppercase tracking-tight">
                    {settings.pos.receipt_header_text || 'MLD HEALTHCARE & SPA'}
                  </p>
                  <p className="text-[10px] text-[#594E44]">Chi nhánh: Trụ sở MLD Việt Nam</p>
                  <p className="text-[10px] text-[#594E44]">Hotline: {settings.general.hotline || '1900 8888'}</p>
                </div>

                <div className="text-[10.5px] space-y-0.5 text-[#3D352E]">
                  <p className="flex justify-between">
                    <span>Số HĐ:</span>
                    <span className="font-bold">HD-SPA-2026-0001</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Thời gian:</span>
                    <span>14/11/2026 15:30</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Khách hàng:</span>
                    <span>Chị Nguyễn Thu Hằng</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Thu ngân:</span>
                    <span>Lê Mỹ Linh</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-dashed border-[#A8988B] space-y-1.5">
                  <div className="flex justify-between font-bold text-[10px] text-[#73675F] pb-1 border-b border-[#E8DFD8]">
                    <span>Dịch vụ / Hàng hóa</span>
                    <span>T.Tiền</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">Dẫn lưu bạch huyết toàn thân</p>
                      <p className="text-[9.5px] text-[#73675F]">1 x 750.000đ</p>
                    </div>
                    <span className="font-semibold">750.000đ</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">Tinh dầu trị liệu MLD Calm</p>
                      <p className="text-[9.5px] text-[#73675F]">1 x 250.000đ</p>
                    </div>
                    <span className="font-semibold">250.000đ</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-[#A8988B] space-y-1 text-right">
                  <div className="flex justify-between">
                    <span>Tổng tiền hàng:</span>
                    <span>1.000.000đ</span>
                  </div>
                  <div className="flex justify-between text-[#15803D]">
                    <span>Ưu đãi thành viên (Vàng):</span>
                    <span>-100.000đ</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-[#2C241E] pt-1 border-t border-[#E8DFD8]">
                    <span>TỔNG THANH TOÁN:</span>
                    <span>900.000đ</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#73675F]">
                    <span>Phương thức:</span>
                    <span>Chuyển khoản VietQR</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-dashed border-[#A8988B] text-center space-y-2">
                  <div className="w-20 h-20 mx-auto bg-[#FAF8F5] border border-[#D9C3AD] rounded-lg flex items-center justify-center p-1">
                    <QrCode size={64} className="text-[#2C241E]" />
                  </div>
                  <p className="text-[9.5px] text-[#594E44] leading-relaxed italic px-2">
                    {settings.pos.receipt_footer_note ||
                      'Cảm ơn Quý khách đã tin tưởng dịch vụ MLD. Chúc Quý khách có một ngày thư thái!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HỘI VIÊN, ĐIỂM & VOUCHER */}
        {/* ========================================================================= */}
        {currentTab === 'loyalty' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide">
                  Chính sách Hội viên & Điểm thưởng Loyalty
                </h2>
                <p className="text-xs text-[#73675F] mt-1">
                  Cấu hình tích lũy điểm khi sử dụng dịch vụ và quy tắc đổi thưởng cho khách hàng.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/manage/membership_tier_rules"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#8A4F23] bg-[#FAF3EA] border border-[#EAD8C7] rounded-xl hover:bg-[#F3E5D4] transition-colors"
                >
                  <span>Quy tắc thăng hạng</span>
                  <ExternalLink size={12} />
                </a>
                <a
                  href="/manage/voucher_distribution_rules"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#8A4F23] bg-[#FAF3EA] border border-[#EAD8C7] rounded-xl hover:bg-[#F3E5D4] transition-colors"
                >
                  <span>Phân phối voucher</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="p-4 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] space-y-2">
                <span className="font-bold text-[#2C241E] block">Tỷ lệ tích điểm</span>
                <p className="text-[#73675F] text-[11px]">Số tiền chi tiêu để nhận 1 điểm thưởng</p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    defaultValue={10000}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white font-semibold text-[#2C241E]"
                  />
                  <span className="font-bold text-[#8C7A6B]">VNĐ</span>
                </div>
                <span className="text-[10.5px] text-[#15803D] block">Tương đương 1% giá trị hóa đơn</span>
              </div>

              <div className="p-4 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] space-y-2">
                <span className="font-bold text-[#2C241E] block">Giá trị quy đổi</span>
                <p className="text-[#73675F] text-[11px]">Giá trị giảm giá của 1 điểm khi thanh toán</p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    defaultValue={100}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white font-semibold text-[#2C241E]"
                  />
                  <span className="font-bold text-[#8C7A6B]">VNĐ</span>
                </div>
                <span className="text-[10.5px] text-[#73675F] block">100 điểm = 10.000 VNĐ</span>
              </div>

              <div className="p-4 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] space-y-2">
                <span className="font-bold text-[#2C241E] block">Thời hạn sử dụng điểm</span>
                <p className="text-[#73675F] text-[11px]">Thời gian điểm hết hạn kể từ ngày tích lũy</p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    defaultValue={12}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white font-semibold text-[#2C241E]"
                  />
                  <span className="font-bold text-[#8C7A6B]">Tháng</span>
                </div>
                <span className="text-[10.5px] text-[#73675F] block">Tự động xóa sau 12 tháng</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: QUY CHUẨN HỌC VIỆN & ĐÀO TẠO MLD */}
        {/* ========================================================================= */}
        {currentTab === 'academy' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide flex items-center gap-2">
                <GraduationCap size={16} className="text-[#985018]" />
                <span>Quy chuẩn Đào tạo & Cấp chứng chỉ MLD Academy</span>
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                Thiết lập các tiêu chuẩn chuyên cần, bài thi trắc nghiệm và chữ ký trên chứng chỉ tốt nghiệp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Tỷ lệ điểm danh tối thiểu để đủ điều kiện thi (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={settings.academy.min_attendance_percent_to_graduate || 80}
                  onChange={(e) => updateField('academy', 'min_attendance_percent_to_graduate', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
                <span className="text-[11px] text-[#8C7A6B]">Học viên dưới mức này sẽ không được mở đề thi tốt nghiệp.</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Số buổi vắng tối đa cho phép</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={settings.academy.max_allowed_absences || 3}
                  onChange={(e) => updateField('academy', 'max_allowed_absences', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Điểm trắc nghiệm đạt chuẩn (Thang điểm 100)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={settings.academy.min_quiz_passing_score || 80}
                  onChange={(e) => updateField('academy', 'min_quiz_passing_score', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Số lần thi lại trắc nghiệm tối đa</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={settings.academy.max_quiz_retakes || 2}
                  onChange={(e) => updateField('academy', 'max_quiz_retakes', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Chức danh người ký trên chứng chỉ</label>
                <input
                  type="text"
                  value={settings.academy.certificate_signer_title || 'GIÁM ĐỐC ĐÀO TẠO HỌC VIỆN'}
                  onChange={(e) => updateField('academy', 'certificate_signer_title', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="GIÁM ĐỐC ĐÀO TẠO HỌC VIỆN"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Tiền tố sinh mã chứng chỉ (Prefix)</label>
                <input
                  type="text"
                  value={settings.academy.certificate_code_prefix || 'MLD-CERT'}
                  onChange={(e) => updateField('academy', 'certificate_code_prefix', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="MLD-CERT"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TÍCH HỢP & DỊCH VỤ NGOÀI (ZALO ZNS, CLOUD STORAGE) */}
        {/* ========================================================================= */}
        {currentTab === 'integrations' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide flex items-center gap-2">
                <Smartphone size={16} className="text-[#985018]" />
                <span>Cổng Zalo Cloud ZNS & Hạ tầng Lưu trữ</span>
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                Cấu hình kết nối thông báo tự động tới điện thoại khách hàng qua Zalo Notification Service và bộ nhớ đám mây.
              </p>
            </div>

            {/* Khối ZNS */}
            <div className="p-4 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#2C241E] text-sm block">Cổng gửi tin Zalo ZNS</span>
                  <span className="text-[#73675F]">
                    Gửi tin nhắc lịch hẹn, xác nhận đặt cọc và biên lai điện tử tự động.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.integrations.zns_enabled)}
                    onChange={(e) => updateField('integrations', 'zns_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803D]"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8DFD8]">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C241E]">Zalo Official Account (OA ID)</label>
                  <input
                    type="text"
                    value={settings.integrations.zns_oa_id || ''}
                    onChange={(e) => updateField('integrations', 'zns_oa_id', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                    placeholder="1424469774232439257"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C241E]">Zalo App ID</label>
                  <input
                    type="text"
                    value={settings.integrations.zns_app_id || ''}
                    onChange={(e) => updateField('integrations', 'zns_app_id', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                    placeholder="Nhập Zalo App ID..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#73675F]">
                  Trạng thái: {settings.integrations.zns_enabled ? 'Đang kích hoạt' : 'Đang tạm dừng'}
                </span>
                <button
                  type="button"
                  onClick={() => testZns()}
                  disabled={testingZns}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#985018] border border-[#EAD8C7] hover:bg-[#F3E2CE] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={testingZns ? 'animate-spin' : ''} />
                  <span>{testingZns ? 'Đang kiểm tra...' : 'Kiểm tra kết nối ZNS'}</span>
                </button>
              </div>
            </div>

            {/* Khối Cloud Storage */}
            <div className="p-4 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] space-y-4 text-xs">
              <span className="font-bold text-[#2C241E] text-sm block">Bộ nhớ lưu trữ tài liệu & hình ảnh (Cloud Storage)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C241E]">Hạ tầng lưu trữ</label>
                  <input
                    type="text"
                    disabled
                    value="Supabase Storage (Cloudflare S3 Compatible)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-[#F2ECE5] text-[#73675F]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C241E]">Tên bucket lưu trữ</label>
                  <input
                    type="text"
                    value={settings.integrations.cloud_storage_bucket || 'documents'}
                    onChange={(e) => updateField('integrations', 'cloud_storage_bucket', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD8] bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PHÂN QUYỀN, BẢO MẬT & PHIÊN LÀM VIỆC */}
        {/* ========================================================================= */}
        {currentTab === 'security' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#985018]" />
                <span>Chính sách Bảo mật Phiên làm việc & Tài khoản Quản trị</span>
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                Quy định độ phức tạp mật khẩu, thời hạn tự động đăng xuất và cơ chế bảo vệ phiên làm việc.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Độ dài mật khẩu tối thiểu cho tài khoản nội bộ</label>
                <input
                  type="number"
                  min={6}
                  max={32}
                  value={settings.security.min_password_length || 8}
                  onChange={(e) => updateField('security', 'min_password_length', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Thời hạn phiên làm việc (Session timeout - phút)</label>
                <input
                  type="number"
                  min={15}
                  max={1440}
                  value={settings.security.session_timeout_minutes || 240}
                  onChange={(e) => updateField('security', 'session_timeout_minutes', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
                <span className="text-[11px] text-[#8C7A6B]">
                  Hệ thống tự động đăng xuất sau {settings.security.session_timeout_minutes || 240} phút không thao tác.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Số lần thử đăng nhập sai tối đa trước khi tạm khóa</label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={settings.security.max_login_attempts || 5}
                  onChange={(e) => updateField('security', 'max_login_attempts', Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                />
              </div>

              <div className="space-y-2 pt-2 md:col-span-2 border-t border-[#F2ECE5]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.security.require_special_char)}
                    onChange={(e) => updateField('security', 'require_special_char', e.target.checked)}
                    className="w-4 h-4 text-[#985018] rounded"
                  />
                  <span className="font-medium text-[#2C241E]">
                    Bắt buộc mật khẩu có chứa ký tự đặc biệt (@, #, $, %) hoặc chữ số
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.security.enable_audit_logging)}
                    onChange={(e) => updateField('security', 'enable_audit_logging', e.target.checked)}
                    className="w-4 h-4 text-[#985018] rounded"
                  />
                  <span className="font-medium text-[#2C241E]">
                    Tự động ghi lại toàn bộ hành động nhạy cảm vào sổ nhật ký bảo mật Audit Trail
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: TÀI KHOẢN CÁ NHÂN & ĐỔI MẬT KHẨU */}
        {/* ========================================================================= */}
        {currentTab === 'profile' && (
          <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 shadow-xs space-y-6 max-w-2xl">
            <div>
              <h2 className="text-sm font-bold text-[#2C241E] uppercase tracking-wide flex items-center gap-2">
                <UserRound size={16} className="text-[#985018]" />
                <span>Tài khoản Quản trị & Đổi Mật khẩu</span>
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                Xem thông tin phiên làm việc hiện tại và cập nhật mật khẩu đăng nhập cá nhân.
              </p>
            </div>

            {/* Thông tin hồ sơ */}
            <div className="p-4 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Tài khoản đăng nhập:</span>
                <span className="font-bold text-[#2C241E]">{user?.phone || user?.email || 'Admin'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Họ và tên:</span>
                <span className="font-bold text-[#2C241E]">{user?.full_name || 'Quản trị viên'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Vai trò trong hệ thống:</span>
                <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-[#FAF0E4] text-[#985018] border border-[#EAD8C7]">
                  {user?.role || 'ADMIN'}
                </span>
              </div>
            </div>

            {/* Form đổi mật khẩu */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2 text-xs">
              <span className="font-bold text-[#2C241E] text-sm block flex items-center gap-1.5">
                <Lock size={15} className="text-[#985018]" />
                <span>Đổi mật khẩu tài khoản</span>
              </span>

              {passError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Mật khẩu hiện tại *</label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                    placeholder="Nhập mật khẩu đang dùng..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-2.5 text-[#A69788] hover:text-[#2C241E]"
                  >
                    {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Mật khẩu mới (Tối thiểu 8 ký tự) *</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                    placeholder="Nhập mật khẩu mới..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-[#A69788] hover:text-[#2C241E]"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2C241E]">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] text-[#2C241E]"
                  placeholder="Nhập lại mật khẩu mới..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 text-xs font-bold text-white bg-[#985018] hover:bg-[#804213] rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50 mt-2"
              >
                {saving ? 'Đang cập nhật mật khẩu...' : 'Xác nhận Đổi Mật khẩu'}
              </button>
            </form>
          </div>
        )}
        </>}
      </PageContent>

      {/* 4. Thanh nổi cố định khi có thay đổi chưa lưu (Sticky Action Bar) */}
      {isCurrentDirty && currentTab !== 'profile' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D9C3AD] shadow-2xl py-3.5 px-6 font-['Plus_Jakarta_Sans',sans-serif] transition-transform animate-in slide-in-from-bottom duration-200">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#7D431C]">
              <AlertCircle size={16} className="text-[#985018] shrink-0" />
              <span>
                Bạn có thay đổi chưa lưu trên nhóm <strong>{SETTINGS_TABS.find((t) => t.id === currentTab)?.label}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => resetCategory(currentTab)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#7D431C] bg-white border border-[#D9C3AD] hover:bg-[#FAF3EA] transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Hủy bỏ</span>
              </button>
              <button
                type="button"
                onClick={() => saveCategory(currentTab)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#985018] hover:bg-[#804213] transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>{saving ? 'Đang lưu vào máy chủ...' : 'Lưu cài đặt (Ctrl + S)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
};
