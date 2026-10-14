import React, { useState } from 'react';
import { Box, Text } from 'zmp-ui';
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  StarIcon,
  ChatBubbleIcon,
  BellIcon,
  ShieldIcon,
  CloseIcon,
  TagIcon,
  LocationIcon,
  FileTextIcon,
} from './Icons';

interface GroupDTreatmentProps {
  onOpenBooking: () => void;
  onClose: () => void;
  onOpenConsultation?: () => void;
  initialTab?: 'packages' | 'journal' | 'care_guide' | 'support' | 'notifications';
  treatmentPlans: any[];
}

export const GroupDTreatment: React.FC<GroupDTreatmentProps> = ({ onOpenBooking, onClose, initialTab = 'packages', treatmentPlans }) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'journal' | 'care_guide' | 'support' | 'notifications'>(initialTab);
  const [packageTab, setPackageTab] = useState<'active' | 'completed' | 'expired'>('active');
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [isPreServiceModalOpen, setIsPreServiceModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  // Pre-service survey state
  const [surveyPreferences, setSurveyPreferences] = useState({
    relaxBody: true,
    reduceStress: true,
    skinCare: false,
  });

  // Rating state
  const [overallRating, setOverallRating] = useState(5);
  const [serviceQualityRating, setServiceQualityRating] = useState(5);
  const [specialistAttitudeRating, setSpecialistAttitudeRating] = useState(5);

  // Notifications state
  const [notifFilter, setNotifFilter] = useState<'all' | 'appointment' | 'treatment' | 'academy'>('all');
  const [notifications, setNotifications] = useState([
    {
      id: 'nt_1',
      type: 'appointment',
      title: 'Nhắc lịch chăm sóc',
      desc: 'Bạn có lịch massage vào 09:00 ngày 15/10/2026 tại Chi nhánh Quận 3.',
      time: '08/10/2026 · 09:30',
      unread: true,
    },
    {
      id: 'nt_2',
      type: 'treatment',
      title: 'Cập nhật liệu trình',
      desc: 'Gói chăm sóc của bạn còn 6 buổi sử dụng. Hạn dùng đến 31/12/2026.',
      time: '08/10/2026 · 09:15',
      unread: true,
    },
    {
      id: 'nt_3',
      type: 'academy',
      title: 'Nhắc lịch học lý thuyết',
      desc: 'Lớp Kỹ thuật Massage có buổi thực hành tại lớp lúc 13:00 Thứ 6 này.',
      time: '07/10/2026 · 14:00',
      unread: false,
    },
  ]);

  // Chat consultation state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'user', text: 'Tôi muốn đặt lịch buổi tiếp theo của gói massage.', time: '09:42' },
    {
      sender: 'agent',
      text: 'Xin chào Minh Anh! Bạn có thể chọn lịch hẹn phù hợp trong phần quản lý liệu trình hoặc để trung tâm hỗ trợ xếp lịch ngay nhé.',
      time: '09:43',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const handleSendMessage = () => {
    if (!inputMsg.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: inputMsg,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputMsg('');
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const activePlans = treatmentPlans.filter((plan) => plan.status === 'active');
  const myPackage = activePlans[0] ? {
    ...activePlans[0],
    branch: activePlans[0].branch?.name || '',
    expiryDate: new Date(activePlans[0].expiryDate).toLocaleDateString('vi-VN'),
    purchaseDate: new Date(activePlans[0].purchaseDate).toLocaleDateString('vi-VN'),
    sessionsHistory: activePlans[0].sessions.map((session: any) => ({
      session: `Buổi ${String(session.sessionNumber).padStart(2, '0')}`,
      date: new Date(session.completedAt || session.scheduledAt || Date.now()).toLocaleDateString('vi-VN'),
      title: session.title,
      specialist: session.specialistName,
      completed: session.status === 'completed',
    })),
  } : {
    id: '', name: 'Chưa có gói liệu trình', branch: '', totalSessions: 0, usedSessions: 0,
    remainingSessions: 0, progressPercent: 0, expiryDate: '--', purchaseDate: '--', sessionsHistory: [],
  };

  return (
    <div className="space-y-3 px-3 pt-3 pb-20">
      <button onClick={onClose} aria-label="Quay lại" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button>
      {/* Top Navigation Tabs for Group D (Figma 04 D01 - D08) */}
      <div className="hidden">
        {[
          { id: 'packages', label: 'Gói liệu trình' },
          { id: 'journal', label: 'Nhật ký chăm sóc' },
          { id: 'care_guide', label: 'Hướng dẫn tại nhà' },
          { id: 'support', label: 'Tư vấn & hỗ trợ' },
          { id: 'notifications', label: 'Thông báo' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
              activeTab === tab.id
                ? 'bg-[#98501B] text-white shadow-sm shadow-[#98501B]/20'
                : 'bg-white text-[#7A685D] border border-[#EADECF] hover:bg-[#FAF6F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =========================================================================
          TAB 1: D01 GÓI LIỆU TRÌNH CỦA TÔI
      ========================================================================= */}
      {activeTab === 'packages' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h1 className="text-[21px] font-bold text-[#6F452C]">Gói liệu trình của tôi</h1>
            <p className="text-[11px] text-[#7A685D] mt-1">Quản lý các gói chăm sóc sức khỏe và liệu trình đã đăng ký.</p>
          </div>

          {/* Member Card Banner (Figma D01) */}
          <div className="rounded-[10px] p-4 bg-[#F3E2CE] border border-[#E5D3C1] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full bg-white text-[#A65317] flex items-center justify-center border border-[#E5D3C1]">
                <span className="text-lg">♙</span>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-[#40352F]">Nguyễn Minh Anh</span>
                  <span className="text-[10px] text-[#A65317]">Hội viên Vàng · Ví dụ</span>
                </div>
                <p className="text-[11px] text-[#7A685D] mt-0.5">
                  {activePlans.length} gói đang dùng • {activePlans.reduce((sum, plan) => sum + plan.remainingSessions, 0)} buổi còn lại • {activePlans.reduce((sum, plan) => sum + plan.usedSessions, 0)} đã dùng
                </p>
              </div>
            </div>
          </div>

          {/* 3 Status Filter Tabs: Đang sử dụng | Đã hoàn thành | Hết hạn */}
          <div className="flex rounded-[10px] bg-white p-1 border border-[#EADECF]">
            {[
              { id: 'active', label: 'Đang sử dụng' },
              { id: 'completed', label: 'Đã hoàn thành' },
              { id: 'expired', label: 'Hết hạn' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setPackageTab(st.id as any)}
                className={`flex-1 py-2 rounded-[8px] text-[11px] font-semibold transition active:scale-95 ${
                  packageTab === st.id ? 'bg-[#98501B] text-white shadow-xs' : 'text-[#7A685D] hover:text-[#40352F]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Package Card (Figma D01) */}
          {packageTab === 'active' && (
            <div className="bg-white rounded-[10px] border border-[#EFEAE3] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden space-y-3 p-3">
              <div className="relative rounded-[8px] overflow-hidden h-36">
                <img
                  src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80"
                  alt="Massage"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#98501B] shadow-xs">
                  ● Đang sử dụng
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#40352F]">{myPackage.name}</h3>
                <p className="text-xs text-[#7A685D]">{myPackage.branch}</p>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#FAF6F0] text-center">
                <div>
                  <div className="text-base font-extrabold text-[#98501B]">{myPackage.totalSessions}</div>
                  <div className="text-[10px] text-[#7A685D]">Tổng buổi</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#40352F]">{myPackage.usedSessions}</div>
                  <div className="text-[10px] text-[#7A685D]">Đã dùng</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-emerald-600">{myPackage.remainingSessions}</div>
                  <div className="text-[10px] text-[#7A685D]">Còn lại</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#7A685D]">
                  <span>Tiến độ hoàn thành</span>
                  <span className="font-bold text-[#98501B]">{myPackage.progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#FAF6F0] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#98501B] to-amber-500 rounded-full"
                    style={{ width: `${myPackage.progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#A09085]">Hạn sử dụng: {myPackage.expiryDate}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => setSelectedPackage(myPackage)}
                  className="flex-1 py-2.5 rounded-[8px] border border-[#98501B] text-[#98501B] text-[11px] font-bold hover:bg-[#FAF6F0] transition active:scale-95"
                >
                  Xem chi tiết gói
                </button>
                <button
                  onClick={onOpenBooking}
                  className="flex-1 py-2.5 rounded-[8px] bg-[#98501B] hover:bg-[#804215] text-white text-[11px] font-bold transition active:scale-95"
                >
                  Đặt lịch buổi tiếp theo
                </button>
              </div>
            </div>
          )}

          {packageTab !== 'active' && (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#EADECF] text-xs text-[#7A685D]">
              Không có gói liệu trình nào trong mục này.
            </div>
          )}

          <div className="space-y-2 pt-1">
            <h2 className="text-[13px] font-bold text-[#40352F]">Chăm sóc & hỗ trợ</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'journal', label: 'Nhật ký chăm sóc' },
                { id: 'care_guide', label: 'Hướng dẫn tại nhà' },
                { id: 'support', label: 'Tư vấn & hỗ trợ' },
                { id: 'notifications', label: 'Thông báo' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className="min-h-11 rounded-[8px] bg-white border border-[#EFEAE3] px-3 text-left text-[11px] font-semibold text-[#6F452C]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: D03 NHẬT KÝ CHĂM SÓC
      ========================================================================= */}
      {activeTab === 'journal' && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase text-[#A65317]">Chăm sóc · Minh họa</span>
            </div>
            <h1 className="mt-1 text-[21px] font-bold leading-tight text-[#6F452C]">Nhật ký chăm sóc</h1>
            <p className="mt-1 text-[10px] text-[#7A685D]">Theo dõi hành trình chăm sóc sức khỏe của bạn.</p>
          </div>

          <div className="rounded-[10px] bg-[#F3E2CE] px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4CDB6] bg-[#FFF9F3] text-[#A65317]">
                <span className="text-[15px]">♙</span>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[#40352F]">Nguyễn Minh Anh</p>
                <p className="text-[10px] font-medium text-[#A65317]">Gói Massage Thư Giãn 10 Buổi</p>
                <p className="mt-1 text-[9px] text-[#75685F]">4 buổi hoàn thành · Gần nhất 08/10/2026</p>
                <p className="mt-1 text-[9px] text-[#75685F]">Hồ sơ và liệu trình minh họa</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('care_guide')}
            className="h-11 w-full rounded-[8px] border border-[#A65317] bg-white text-[11px] font-bold text-[#A65317]"
          >
            Xem hướng dẫn chăm sóc
          </button>

          <p className="px-1 text-[9px] leading-relaxed text-[#7A685D]">
            Nhật ký minh họa · Ghi chú chăm sóc chung, không dùng ghi kết quả y khoa.
          </p>

          <div className="relative pl-7">
            <div className="absolute bottom-2 left-[9px] top-2 w-px bg-[#D7B28F]" />
            <div className="absolute left-[4px] top-1 h-[11px] w-[11px] rounded-full border-2 border-[#A65317] bg-[#FAF8F5]" />

            <article className="rounded-[10px] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-[8px] text-[#A65317]">Ngày 08/10/2026</p>
              <h3 className="mt-1 text-[10px] font-bold text-[#40352F]">Buổi 04 – Massage thư giãn toàn thân</h3>
              <div className="mt-2 space-y-1 text-[9px] leading-relaxed text-[#6F625B]">
                <p>Chuyên viên: Trần Minh Phương</p>
                <p>Chi nhánh mẫu 01 – Quận 3</p>
                <p>Khách hàng hoàn thành buổi chăm sóc theo lịch trình.</p>
              </div>

              <div className="mt-2 text-[9px] leading-relaxed">
                <p className="font-medium text-[#A65317]">Gợi ý sau buổi · Minh họa</p>
                <p className="mt-1 text-[#6F625B]">Dành thời gian nghỉ ngơi thoải mái sau buổi massage.</p>
              </div>

              <div className="mt-3 flex gap-2 border-t border-[#EFEAE3] pt-3">
                <button
                  onClick={() => setIsRatingModalOpen(true)}
                  className="h-9 flex-1 rounded-[8px] border border-[#A65317] bg-white text-[10px] font-bold text-[#A65317]"
                >
                  Đánh giá buổi này
                </button>
                <button
                  onClick={() => setIsPreServiceModalOpen(true)}
                  className="h-9 flex-1 rounded-[8px] bg-[#A65317] text-[10px] font-bold text-white"
                >
                  Phiếu chuẩn bị buổi 05
                </button>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: D06 HƯỚNG DẪN CHĂM SÓC TẠI NHÀ
      ========================================================================= */}
      {activeTab === 'care_guide' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h1 className="text-lg font-bold text-[#40352F]">Hướng dẫn chăm sóc tại nhà</h1>
            <p className="text-xs text-[#7A685D]">Những hướng dẫn hữu ích giúp duy trì thói quen chăm sóc bản thân.</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#EADECF] overflow-hidden shadow-sm space-y-3 p-4">
            <img
              src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80"
              alt="Care guide"
              className="w-full h-40 rounded-xl object-cover"
            />
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#98501B] text-[10px] font-bold border border-[#EADECF]">
              CHĂM SÓC CƠ THỂ • Bài viết • 4 phút
            </span>
            <h3 className="text-sm font-bold text-[#40352F]">Chăm sóc cơ thể sau buổi massage</h3>
            <p className="text-xs text-[#7A685D] leading-relaxed">
              Nghỉ ngơi thoải mái, vận động nhẹ và giữ nhịp sinh hoạt phù hợp. Tránh tắm nước lạnh ngay sau khi massage trị liệu để giữ ấm kinh lạc.
            </p>
            <button
              onClick={() => setIsArticleModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] transition"
            >
              Xem hướng dẫn chi tiết
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: D07 TƯ VẤN & HỖ TRỢ
      ========================================================================= */}
      {activeTab === 'support' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h1 className="text-lg font-bold text-[#40352F]">Tư vấn & hỗ trợ</h1>
            <p className="text-xs text-[#7A685D]">Chúng tôi luôn sẵn sàng đồng hành cùng bạn.</p>
          </div>

          {/* Quick topic chips (Figma D07) */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '1', label: 'Tư vấn dịch vụ' },
              { id: '2', label: 'Hỗ trợ đặt lịch' },
              { id: '3', label: 'Hỗ trợ liệu trình' },
              { id: '4', label: 'Hỗ trợ học viên' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setInputMsg(`Tôi cần hỗ trợ về: ${chip.label}`)}
                className="py-2.5 px-3 rounded-xl bg-white border border-[#EADECF] text-xs font-semibold text-[#40352F] hover:bg-[#FAF6F0] hover:border-[#98501B] transition text-left"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat box */}
          <div className="bg-white rounded-2xl border border-[#EADECF] shadow-sm p-3.5 space-y-3 flex flex-col h-72">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#98501B] text-white rounded-br-none'
                        : 'bg-[#FAF6F0] text-[#40352F] border border-[#EADECF] rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[#A09085] mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Input bar */}
            <div className="flex items-center space-x-2 pt-2 border-t border-[#FAF6F0]">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#EADECF] text-xs text-[#40352F] placeholder-[#A09085] focus:outline-none focus:border-[#98501B]"
              />
              <button
                onClick={handleSendMessage}
                className="px-3 py-2 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] transition"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: D08 THÔNG BÁO
      ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#40352F]">Thông báo</h1>
              <p className="text-xs text-[#7A685D]">Cập nhật lịch hẹn và hoạt động chăm sóc.</p>
            </div>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[#98501B] font-bold hover:underline"
            >
              Đánh dấu đã đọc
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'appointment', label: 'Lịch hẹn' },
              { id: 'treatment', label: 'Liệu trình' },
              { id: 'academy', label: 'Đào tạo' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setNotifFilter(f.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  notifFilter === f.id
                    ? 'bg-[#98501B] text-white'
                    : 'bg-white text-[#7A685D] border border-[#EADECF]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-2.5">
            {notifications
              .filter((n) => notifFilter === 'all' || n.type === notifFilter)
              .map((n) => (
                <div
                  key={n.id}
                  className={`bg-white rounded-2xl p-3.5 border transition ${
                    n.unread ? 'border-[#98501B]/40 bg-[#FAF6F0]/40 shadow-xs' : 'border-[#EADECF]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#98501B]" />
                      <h4 className="text-xs font-bold text-[#40352F]">{n.title}</h4>
                    </div>
                    <span className="text-[10px] text-[#A09085]">{n.time}</span>
                  </div>
                  <p className="text-xs text-[#7A685D] mt-1 leading-relaxed">{n.desc}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          DEDICATED FULL PAGE: D02 CHI TIẾT GÓI LIỆU TRÌNH
      ========================================================================= */}
      {selectedPackage && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setSelectedPackage(null)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#E7DDD3] flex items-center justify-center text-[#40352F] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h3 className="text-sm font-bold text-[#40352F]">Chi tiết gói liệu trình</h3>
            </div>
            <button
              onClick={() => setSelectedPackage(null)}
              className="text-xs text-[#98501B] font-bold"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            <div className="rounded-2xl overflow-hidden shadow-sm border border-[#EADECF]">
              <img
                src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80"
                alt="Package"
                className="w-full h-44 object-cover"
              />
              <div className="p-3 bg-white">
                <span className="text-[10px] font-bold text-[#98501B] uppercase tracking-wider">Gói cao cấp</span>
                <h4 className="text-base font-bold text-[#40352F] mt-0.5">{selectedPackage.name}</h4>
                <p className="text-xs text-[#7A685D] mt-0.5 flex items-center space-x-1">
                  <LocationIcon size={12} color="#7A685D" />
                  <span>{selectedPackage.branch}</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#EADECF] space-y-3">
              <div className="flex justify-between items-center border-b border-[#FAF6F0] pb-2">
                <h5 className="text-xs font-bold text-[#40352F]">Hành trình 10 buổi của bạn:</h5>
                <span className="text-[11px] font-bold text-[#98501B]">4/10 buổi đã thực hiện</span>
              </div>
              <div className="space-y-2">
                {selectedPackage.sessionsHistory.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF6F0] text-xs border border-[#EADECF]/50"
                  >
                    <div>
                      <span className="font-bold text-[#40352F]">{s.session}</span>: {s.title}
                      <div className="text-[10px] text-[#7A685D] mt-0.5">{s.specialist} • {s.date}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        s.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {s.completed ? '✓ Đã xong' : '⏳ Sắp tới'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-[#EADECF] shrink-0 shadow-lg">
            <button
              onClick={() => {
                setSelectedPackage(null);
                onOpenBooking();
              }}
              className="w-full py-3 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] transition shadow-md"
            >
              Đặt lịch buổi tiếp theo ngay
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEDICATED FULL PAGE: D04 PHIẾU THÔNG TIN TRƯỚC DỊCH VỤ
      ========================================================================= */}
      {isPreServiceModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="bg-white px-4 py-3 border-b border-[#EADECF] flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsPreServiceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-[#40352F]">Phiếu thông tin trước dịch vụ</h3>
                <p className="text-[10px] text-[#7A685D]">Chuẩn bị trải nghiệm phù hợp cho bạn</p>
              </div>
            </div>
            <button
              onClick={() => setIsPreServiceModalOpen(false)}
              className="text-xs text-[#98501B] font-bold"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            <div className="bg-white p-4 rounded-2xl border border-[#EADECF] space-y-3">
              <p className="text-xs font-bold text-[#40352F]">Mục tiêu trải nghiệm bạn mong muốn hôm nay?</p>
              {[
                { key: 'relaxBody', label: 'Thư giãn toàn thân, giảm căng cứng cơ bắp' },
                { key: 'reduceStress', label: 'Giảm cảm giác căng thẳng, thư giãn tâm trí' },
                { key: 'skinCare', label: 'Chăm sóc và phục hồi làn da chuyên sâu' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[#EADECF] hover:bg-[#FAF6F0] cursor-pointer text-xs transition"
                >
                  <span className="text-[#40352F] font-medium">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={(surveyPreferences as any)[item.key]}
                    onChange={(e) =>
                      setSurveyPreferences((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#98501B] rounded focus:ring-0 accent-[#98501B]"
                  />
                </label>
              ))}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#EADECF] space-y-2">
              <label className="text-xs font-bold text-[#40352F] block">Ghi chú hoặc vị trí cần lưu ý:</label>
              <textarea
                placeholder="VD: Đau mỏi vùng vai gáy, tránh lực mạnh ở thắt lưng..."
                className="w-full p-3 rounded-xl border border-[#EADECF] bg-[#FAF6F0] text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#98501B] h-24 resize-none"
              />
            </div>
          </div>

          <div className="p-4 bg-white border-t border-[#EADECF] shrink-0 shadow-lg">
            <button
              onClick={() => setIsPreServiceModalOpen(false)}
              className="w-full py-3 rounded-xl bg-[#98501B] text-white text-xs font-bold hover:bg-[#804215] transition shadow-md"
            >
              Lưu & Xác nhận thông tin khảo sát
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEDICATED FULL PAGE: D05 ĐÁNH GIÁ TRẢI NGHIỆM
      ========================================================================= */}
      {isRatingModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsRatingModalOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#E7DDD3] flex items-center justify-center text-[#40352F] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <div>
                <h3 className="text-[21px] leading-tight font-bold text-[#6F452C]">Đánh giá trải nghiệm</h3>
                <p className="text-[9px] text-[#7A685D]">Ý kiến của bạn giúp chúng tôi nâng cao chất lượng dịch vụ.</p>
              </div>
            </div>
              <span className="ml-auto text-[8px] uppercase text-[#A65317] font-semibold">Chăm sóc · Minh họa</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-24">
            <div className="flex items-center gap-3 rounded-[10px] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <img src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=220&auto=format&fit=crop&q=80" alt="Massage thư giãn" className="h-16 w-16 rounded-[8px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-[#40352F]">Massage thư giãn toàn thân</p>
                <p className="mt-1 text-[8px] text-[#7A685D]">Chi nhánh mẫu 01 – Quận 3</p>
                <p className="text-[8px] text-[#7A685D]">Trần Minh Phương</p>
              </div>
              <span className="self-end text-[8px] font-medium text-[#A65317]">Buổi 04</span>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-bold leading-snug text-[#6F452C]">Bạn hài lòng với trải nghiệm hôm nay chứ?</p>
              <div className="bg-[#F3E2CE] p-3 rounded-[10px] space-y-2">
              <div className="flex space-x-3 text-[24px]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setOverallRating(star)}
                    className={`transition active:scale-125 ${star <= overallRating ? 'text-amber-500' : 'text-stone-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#7A5A45] font-medium">{overallRating}/5 · {overallRating === 5 ? 'Rất hài lòng · Bản nhập chưa gửi' : 'Hài lòng'}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-3 text-[10px]">
              <h5 className="font-bold text-[#40352F]">Chi tiết mức độ hài lòng</h5>
              <div className="flex justify-between items-center py-1 border-b border-[#FAF6F0]">
                <span>Chất lượng trị liệu:</span>
                <span className="font-bold text-[#98501B]">5 / 5 sao ★</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#FAF6F0]">
                <span>Thái độ chuyên viên:</span>
                <span className="font-bold text-[#98501B]">5 / 5 sao ★</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Không gian & phòng trị liệu:</span>
                <span className="font-bold text-[#98501B]">5 / 5 sao ★</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-2">
              <label className="text-xs font-bold text-[#40352F] block">Góp ý thêm cho kỹ thuật viên:</label>
              <textarea
                placeholder="Chia sẻ cảm nhận chi tiết của bạn để chúng tôi phục vụ tốt hơn..."
                className="w-full p-3 rounded-[8px] border border-[#E4D3C2] bg-[#FFFDFC] text-[10px] text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#98501B] h-20 resize-none"
              />
            </div>
          </div>

          <div className="p-3 bg-white border-t border-[#EADECF] shrink-0">
            <button
              onClick={() => setIsRatingModalOpen(false)}
              className="w-full h-11 rounded-[8px] bg-[#A65317] text-white text-[11px] font-bold"
            >
              Gửi đánh giá
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEDICATED FULL PAGE: D06 BÀI VIẾT HƯỚNG DẪN CHI TIẾT
      ========================================================================= */}
      {isArticleModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsArticleModalOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-white border border-[#E7DDD3] flex items-center justify-center text-[#40352F] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h3 className="text-[18px] leading-tight font-bold text-[#6F452C]">Hướng dẫn chăm sóc tại nhà</h3>
            </div>
            <button
              onClick={() => setIsArticleModalOpen(false)}
              className="text-[8px] uppercase text-[#A65317] font-semibold"
            >
              Chăm sóc · Minh họa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-24">
            <img
              src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop&q=80"
              alt="Care"
              className="w-full h-44 rounded-[10px] object-cover border border-[#EADECF]"
            />

            <div className="bg-[#F3E2CE] p-3 rounded-[10px] space-y-2">
              <span className="text-[10px] font-bold text-[#98501B] uppercase tracking-wider">Hướng dẫn sau buổi massage</span>
              <h4 className="text-base font-bold text-[#40352F]">Chăm sóc cơ thể sau buổi massage thư giãn toàn thân</h4>
              <div className="text-xs text-[#7A685D] leading-relaxed space-y-2 pt-2 border-t border-[#FAF6F0]">
                <p>
                  <strong>1. Uống nước ấm:</strong> Sau khi kích thích tuần hoàn máu và hệ bạch huyết, cơ thể sẽ đào thải độc tố tự nhiên. Hãy uống 300 - 500ml nước ấm trong vòng 30 phút.
                </p>
                <p>
                  <strong>2. Giữ ấm cơ thể:</strong> Không nên tắm nước lạnh hoặc ngồi trực tiếp dưới luồng điều hòa lạnh trong vòng 2 giờ sau liệu trình.
                </p>
                <p>
                  <strong>3. Giữ tinh thần thư thái:</strong> Tránh làm việc căng thẳng ngay lập tức. Dành thời gian nghỉ ngơi hoặc đi dạo nhẹ nhàng.
                </p>
                <p>
                  <strong>4. Vận động nhẹ trước khi ngủ:</strong> Thực hiện các động tác xoay cổ và kéo giãn nhẹ nhàng để các cơ bắp duy trì trạng thái thả lỏng.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white border-t border-[#EADECF] shrink-0">
            <button
              onClick={() => setIsArticleModalOpen(false)}
              className="w-full h-11 rounded-[8px] bg-[#A65317] text-white text-[11px] font-bold"
            >
              Xem hướng dẫn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
