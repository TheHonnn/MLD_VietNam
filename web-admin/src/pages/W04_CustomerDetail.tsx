import React, { useState, useEffect } from 'react';
import {
  Crown,
  Pencil,
  QrCode,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  customerService,
  bookingService,
  treatmentService,
  academyService,
} from '../services';
import {
  User,
  Booking,
  UserPackage,
  TreatmentJournal,
  CourseEnrollment,
} from '../types/shared_types';

import { useSearchParams } from 'react-router-dom';

export const W04_CustomerDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<UserPackage[]>([]);
  const [journals, setJournals] = useState<TreatmentJournal[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    'Tổng quan',
    'Lịch hẹn',
    'Liệu trình',
    'Học tập',
    'Giao dịch',
    'Ghi chú',
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        let custId = targetId;
        let custData: User | undefined;

        if (custId) {
          const custRes = await customerService.getCustomerById(custId);
          if (custRes.success) custData = custRes.data;
        }

        if (!custData) {
          const listRes = await customerService.getCustomers();
          if (listRes.success && listRes.data.length > 0) {
            custData = listRes.data[0];
            custId = custData.id;
          }
        }

        setCustomer(custData);

        if (custId) {
          const [bkRes, pkgRes, jrnRes, enrRes] = await Promise.all([
            bookingService.getBookings({ customerId: custId }),
            treatmentService.getUserPackagesByCustomer(custId),
            treatmentService.getTreatmentJournalsByCustomer(custId),
            academyService.getEnrollments(),
          ]);
          if (bkRes.success) setBookings(bkRes.data);
          if (pkgRes.success) setPackages(pkgRes.data);
          if (jrnRes.success) setJournals(jrnRes.data);
          if (enrRes.success) setEnrollments((enrRes.data || []).filter((e) => e.studentId === custId));
        }
      } catch (err) {
        console.error('Failed to load customer profile details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [targetId]);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Hồ sơ khách hàng
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Khách hàng / {customer?.fullName || 'Lê Minh Anh'} · {customer?.referralCode || 'MLD-MINHANH92'} · Dữ liệu từ Service Layer
          </p>
        </div>
        <button
          onClick={() => alert('Chức năng tạo lịch hẹn')}
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
        >
          Tạo lịch hẹn
        </button>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#F3E2CE] text-[#8A4F23] shadow-xs'
                  : 'text-[#73675F] hover:text-[#2C241E] hover:bg-white/60'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. Main Content: Left Column (Profile & Specs) vs Right Column (Appointments & History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (approx 4 / 12 cols = 33.3%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Profile & VIP Gold Membership Card */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
            {/* User Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={customer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt={customer?.fullName || 'Khách hàng'}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#E0D7CC]"
                />
                <div>
                  <div className="text-sm font-bold text-[#2C241E]">
                    {customer?.fullName || 'Lê Minh Anh'}
                  </div>
                  <div className="text-[11px] text-[#73675F] mt-0.5">
                    {customer?.phone || '0988123456'} · Đã xác thực
                  </div>
                  <div className="text-[10.5px] font-semibold text-[#8A4F23] mt-0.5">
                    Hội viên {customer?.membershipTier || 'GOLD'}
                  </div>
                </div>
              </div>
              <button
                title="Chỉnh sửa"
                className="p-1 rounded-lg text-[#8A4F23] hover:bg-[#FAF8F5] transition-colors"
              >
                <Pencil className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* VIP Digital Membership Card */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-[#854412] via-[#924A12] to-[#985018] text-white relative overflow-hidden shadow-sm">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full border border-white/15 pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-semibold text-[#F3E2CE]">
                  Hội viên {customer?.membershipTier || 'GOLD'}
                </span>
                <Crown className="w-4 h-4 text-[#F3E2CE] stroke-[2]" />
              </div>

              <div className="mt-3.5 relative z-10">
                <div className="text-[26px] font-extrabold text-white tracking-tight leading-none">
                  {customer ? `${customer.rewardPoints.toLocaleString('vi-VN')} điểm` : '2.450 điểm'}
                </div>
                <div className="text-[11px] text-[#F3E2CE]/80 mt-1.5 font-medium">
                  Mã hội viên · {customer?.referralCode || 'MLD-MINHANH92'}
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-white/20 relative z-10">
                <button
                  onClick={() => alert('Xem mã thẻ điện tử')}
                  className="w-full flex items-center justify-between text-xs font-bold text-white hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#F3E2CE]" />
                    <span>Xem thẻ hội viên QR</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
                <div className="text-[10px] text-[#F3E2CE]/70 mt-2.5">
                  Tổng chi tiêu: {customer?.totalSpent.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* Preferred Branch Specs */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex items-center justify-between py-1">
                <span className="text-[#73675F]">Chi nhánh thường ghé</span>
                <span className="font-bold text-[#2C241E]">MLD Quận 3 (TP.HCM)</span>
              </div>
              <p className="text-[11px] text-[#73675F] leading-relaxed">
                Địa chỉ: {customer?.address || '15/2 Đặng Thai Mai, Phường 7, Phú Nhuận'}
              </p>
            </div>

            <button
              onClick={() => alert('Chỉnh sửa thông tin khách hàng')}
              className="w-full py-2.5 bg-white border border-[#D7BBA6] text-[#8A4F23] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs"
            >
              Chỉnh sửa hồ sơ
            </button>
          </div>

          {/* Card: Sở thích & ghi chú điều trị */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#3E200C]">Sở thích & ghi chú lâm sàng</h3>
            <p className="text-xs text-[#4A3E34] leading-relaxed">
              Ưu tiên kỹ thuật Vodder lực nhẹ, chườm ấm cổ vai gáy, phòng yên tĩnh có tinh dầu sả chanh.
            </p>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                Kỹ thuật viên phụ trách: Trần Minh Phương
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#73675F]">Số buổi điều trị đã ghi nhận</span>
              <span className="font-bold text-[#2C241E]">{journals.length} buổi</span>
            </div>
          </div>
        </div>

        {/* Right Column (approx 8 / 12 cols = 66.6%) */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. Table Card: Lịch hẹn sắp tới */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2C241E]">
                Lịch hẹn của khách hàng ({bookings.length})
              </h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3E2CE] text-[#8A4F23]">
                Live Booking Data
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3E2CE] text-[#73675F] text-[11.5px] font-medium">
                  <tr>
                    <th className="py-3 px-5 font-medium">Ngày & giờ</th>
                    <th className="py-3 px-4 font-medium">Mã lịch hẹn</th>
                    <th className="py-3 px-4 font-medium">Phòng / Giường</th>
                    <th className="py-3 px-5 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9]">
                  {bookings.map((app) => (
                    <tr key={app.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-[#2C241E]">{app.bookingDate}</div>
                        <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                          {app.startTime.slice(0, 5)}–{app.endTime.slice(0, 5)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#2C241E]">{app.bookingCode}</div>
                        <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                          {app.checkinNotes || 'Dịch vụ spa'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#2C241E]">Phòng VIP 01</div>
                        <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                          Giường {app.assignedBedNumber || '01'}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                            app.status === 'CHECKED_IN'
                              ? 'bg-[#E8EFE5] text-[#526D51]'
                              : 'bg-[#F5E9DB] text-[#8A4F23]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 stroke-[2]" />
                          <span>{app.status === 'CHECKED_IN' ? 'Đã check-in' : 'Chờ xác nhận'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Middle Row: Treatment Package Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packages.map((pkg) => {
              const remaining = pkg.totalSessions - pkg.completedSessions;
              const percent = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-2.5"
                >
                  <h3 className="text-sm font-bold text-[#3E200C]">
                    {pkg.package?.name || 'Gói chăm sóc phục hồi'}
                  </h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#73675F]">Tổng / đã dùng / còn lại</span>
                    <span className="font-semibold text-[#2C241E]">
                      {pkg.totalSessions} / {pkg.completedSessions} / {remaining} buổi
                    </span>
                  </div>
                  <div className="pt-1">
                    <div className="text-xs font-semibold text-[#2C241E] mb-1.5">
                      Đã sử dụng {percent}%
                    </div>
                    <div className="w-full h-1.5 bg-[#EBD8C7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#985018] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#73675F] pt-1">
                    Hạn dùng: {pkg.expiresAt.split('T')[0]} · Chi nhánh Quận 3
                  </p>
                </div>
              );
            })}
          </div>

          {/* 3. Bottom Card: Nhật ký trị liệu lâm sàng (Treatment Journals) */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-[#2C241E]">
              Nhật ký điều trị lâm sàng ({journals.length} buổi)
            </h3>
            <div className="space-y-3">
              {journals.map((j) => (
                <div
                  key={j.id}
                  className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-bold text-[#2C241E]">
                    <span>Buổi #{j.sessionNumber} · Ngày {j.sessionDate}</span>
                    <span className="text-[#985018]">Đã hoàn thành</span>
                  </div>
                  <p className="text-[#5C5046]">
                    <span className="font-semibold">Tình trạng trước:</span> {j.conditionBefore}
                  </p>
                  <p className="text-[#5C5046]">
                    <span className="font-semibold">Sau trị liệu:</span> {j.conditionAfter}
                  </p>
                  <p className="text-[11px] text-[#8A796B] italic">
                    Lời dặn: {j.specialistAdvice}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
