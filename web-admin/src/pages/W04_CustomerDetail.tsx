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
  X,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  customerService,
  bookingService,
  treatmentService,
  academyService,
} from '../services';
import { toast } from '../components/common';
import {
  User,
  Booking,
  UserPackage,
  TreatmentPackage,
  TreatmentJournal,
  CourseEnrollment,
  MemberTier,
  PurposeInterest,
  PackageStatus,
} from '../types/shared_types';

import { useSearchParams, useNavigate } from 'react-router-dom';

const getNextTierInfo = (tier?: MemberTier, spent: number = 0) => {
  const TIER_THRESHOLDS = [
    { tier: MemberTier.STANDARD, target: 10_000_000, nextName: 'Bạc' },
    { tier: MemberTier.SILVER, target: 25_000_000, nextName: 'Vàng' },
    { tier: MemberTier.GOLD, target: 50_000_000, nextName: 'Bạch Kim' },
    { tier: MemberTier.PLATINUM, target: 100_000_000, nextName: 'Kim Cương' },
  ];
  const current = TIER_THRESHOLDS.find((t) => t.tier === tier);
  if (!current) {
    return { isMax: true, percent: 100, remaining: 0, nextName: 'Kim Cương' };
  }
  const percent = Math.min(100, Math.round((spent / current.target) * 100));
  const remaining = Math.max(0, current.target - spent);
  return { isMax: false, percent, remaining, nextName: current.nextName, target: current.target };
};

export const W04_CustomerDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<UserPackage[]>([]);
  const [journals, setJournals] = useState<TreatmentJournal[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assign Package Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<TreatmentPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isAssigningPackage, setIsAssigningPackage] = useState(false);

  // Edit Profile Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferredTech, setPreferredTech] = useState<string>('Trần Lan Anh');
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    'Ưu tiên kỹ thuật Vodder lực nhẹ, chườm ấm cổ vai gáy, phòng yên tĩnh có tinh dầu sả chanh.'
  );

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'FEMALE' as 'MALE' | 'FEMALE' | 'OTHER',
    dateOfBirth: '',
    membershipTier: MemberTier.GOLD,
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    purpose: PurposeInterest.BEAUTY_SPA,
    preferredTechnician: 'Trần Lan Anh',
    clinicalNotes: 'Ưu tiên kỹ thuật Vodder lực nhẹ, chườm ấm cổ vai gáy, phòng yên tĩnh có tinh dầu sả chanh.',
  });

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

        if (custId) {
          const localCache = localStorage.getItem(`mld_cust_${custId}`);
          if (localCache) {
            try {
              const parsed = JSON.parse(localCache);
              if (parsed.preferredTechnician) setPreferredTech(parsed.preferredTechnician);
              if (parsed.clinicalNotes) setClinicalNotes(parsed.clinicalNotes);
              if (custData) custData = { ...custData, ...parsed };
            } catch {}
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

  const [isProcessingSession, setIsProcessingSession] = useState(false);
  const handleCompleteSession = async (pkg: UserPackage) => {
    if (!customer?.id) return;

    // CUST-05: Chốt chặn FSM ngăn vượt quá tổng số buổi của gói
    if (pkg.completedSessions >= pkg.totalSessions) {
      toast.warning(
        'Gói đã hoàn tất',
        'Tất cả các buổi trong gói liệu trình này đã được ghi nhận hoàn thành 100%.'
      );
      return;
    }

    setIsProcessingSession(true);
    try {
      const res = await treatmentService.completePackageSession(
        pkg.id,
        pkg.completedSessions,
        pkg.totalSessions,
        {
          customerId: customer.id,
          conditionBefore: 'Theo dõi liệu trình định kỳ',
          conditionAfter: 'Hoàn tất buổi chăm sóc theo phác đồ',
          specialistAdvice: 'Uống đủ 2 lít nước ấm, giữ ấm vùng cổ vai gáy',
        }
      );
      if (res.success) {
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id === pkg.id) {
              const nextCount = p.completedSessions + 1;
              return {
                ...p,
                completedSessions: nextCount,
                status: nextCount >= p.totalSessions ? PackageStatus.COMPLETED : p.status,
              };
            }
            return p;
          })
        );
        toast.success(
          'Ghi nhận buổi trị liệu',
          `Đã hoàn thành buổi #${pkg.completedSessions + 1} cho gói "${pkg.package?.name || 'Liệu trình'}"!`
        );
      } else {
        toast.error('Lỗi', res.message || 'Không thể ghi nhận buổi trị liệu');
      }
    } catch (err) {
      toast.error('Lỗi', 'Không thể hoàn tất thao tác.');
    } finally {
      setIsProcessingSession(false);
    }
  };

  const handleOpenAssignPackageModal = async () => {
    setIsAssignModalOpen(true);
    try {
      const res = await treatmentService.getTreatmentPackages();
      if (res.success && res.data) {
        setAvailablePackages(res.data);
        if (res.data.length > 0) {
          setSelectedPackageId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load treatment packages:', err);
    }
  };

  const handleAssignPackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    const targetPkg = availablePackages.find((p) => p.id === selectedPackageId) || availablePackages[0];
    if (!targetPkg) {
      toast.warning('Chưa chọn gói', 'Vui lòng chọn một gói liệu trình để gán cho khách hàng.');
      return;
    }

    setIsAssigningPackage(true);
    try {
      const res = await treatmentService.assignPackageToCustomer({
        customerId: customer.id,
        packageId: targetPkg.id,
        packageName: targetPkg.name,
        totalSessions: targetPkg.totalSessions,
        price: targetPkg.discountPrice || targetPkg.price,
        validityMonths: targetPkg.validityMonths || 6,
      });

      if (res.success && res.data) {
        setPackages((prev) => [res.data, ...prev]);
        const addedPrice = targetPkg.discountPrice || targetPkg.price;
        setCustomer((prev) => prev ? { ...prev, totalSpent: (prev.totalSpent || 0) + addedPrice } : prev);
        toast.success(
          'Đăng ký gói thành công',
          `Đã kích hoạt gói "${targetPkg.name}" (${targetPkg.totalSessions} buổi) cho khách hàng ${customer.fullName}.`
        );
        setIsAssignModalOpen(false);
      } else {
        toast.error('Lỗi gán gói', res.message || 'Không thể đăng ký gói liệu trình');
      }
    } catch (err) {
      console.error('Lỗi khi gán gói liệu trình:', err);
      toast.error('Lỗi hệ thống', 'Không thể hoàn tất gán gói liệu trình.');
    } finally {
      setIsAssigningPackage(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!customer) return;
    setFormData({
      fullName: customer.fullName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gender: (customer.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'FEMALE',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
      membershipTier: customer.membershipTier || MemberTier.GOLD,
      address: customer.address || '',
      emergencyContactName: customer.emergencyContactName || '',
      emergencyContactPhone: customer.emergencyContactPhone || '',
      purpose: customer.purpose || PurposeInterest.BEAUTY_SPA,
      preferredTechnician: preferredTech,
      clinicalNotes: clinicalNotes,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const cleanName = formData.fullName.trim();
    const cleanPhone = formData.phone.trim();
    const cleanPhoneDigits = cleanPhone.replace(/[\s.\-()]/g, '');
    const cleanEmail = formData.email.trim();
    const cleanEmergencyPhone = formData.emergencyContactPhone.trim().replace(/[\s.\-()]/g, '');

    if (!cleanName) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!cleanPhone) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập số điện thoại khách hàng.');
      return;
    }

    // CUST-03: Kiểm tra định dạng số điện thoại Việt Nam
    const phonePattern = /^(0|\+84)[0-9]{8,10}$|^1[89]00[0-9]{4}$/;
    if (!phonePattern.test(cleanPhoneDigits)) {
      toast.error(
        'Số điện thoại không hợp lệ',
        'Vui lòng nhập đúng định dạng số điện thoại (VD: 0988123456, 02839301234).'
      );
      return;
    }

    // CUST-03: Kiểm tra định dạng email nếu có nhập
    if (cleanEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(cleanEmail)) {
        toast.error('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email (VD: khachhang@gmail.com).');
        return;
      }
    }

    // CUST-04: Kiểm tra ngày sinh không vượt quá ngày hiện tại
    if (formData.dateOfBirth) {
      const dobDate = new Date(formData.dateOfBirth).getTime();
      if (dobDate > Date.now()) {
        toast.error('Ngày sinh không hợp lệ', 'Ngày sinh không thể diễn ra trong tương lai.');
        return;
      }
    }

    // CUST-09: Cảnh báo số điện thoại liên hệ khẩn cấp
    if (cleanEmergencyPhone && cleanEmergencyPhone === cleanPhoneDigits) {
      toast.warning(
        'Lưu ý liên hệ khẩn cấp',
        'Số ĐT khẩn cấp không nên trùng với số điện thoại chính của khách hàng.'
      );
    }

    // CUST-02: Kiểm tra trùng số điện thoại với khách hàng khác
    try {
      const allRes = await customerService.getCustomers();
      if (allRes.success && allRes.data) {
        const isDuplicate = allRes.data.some(
          (c) => c.id !== customer.id && c.phone.replace(/[\s.\-()]/g, '') === cleanPhoneDigits
        );
        if (isDuplicate) {
          toast.warning(
            'Trùng số điện thoại',
            `Số điện thoại "${cleanPhone}" đã được sử dụng bởi một khách hàng khác trên hệ thống.`
          );
          return;
        }
      }
    } catch {}

    setIsSubmitting(true);
    try {
      const updatedFields: Partial<User> = {
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail || null,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
        membershipTier: formData.membershipTier,
        address: formData.address.trim() || null,
        emergencyContactName: formData.emergencyContactName.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
        purpose: formData.purpose,
      };

      // Call customerService
      const res = await customerService.updateCustomer(customer.id, updatedFields);

      // Local state update
      const newCustomerState: User = {
        ...customer,
        ...updatedFields,
        ...(res.success && res.data ? res.data : {}),
      };
      setCustomer(newCustomerState);
      setPreferredTech(formData.preferredTechnician.trim() || 'Trần Lan Anh');
      setClinicalNotes(formData.clinicalNotes.trim());

      // Save to localStorage for instant local reactivity & reload preservation
      localStorage.setItem(`mld_cust_${customer.id}`, JSON.stringify({
        ...updatedFields,
        preferredTechnician: formData.preferredTechnician.trim(),
        clinicalNotes: formData.clinicalNotes.trim(),
      }));

      toast.success(
        'Cập nhật thành công',
        `Hồ sơ của khách hàng ${formData.fullName} đã được lưu lại.`
      );
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi cập nhật hồ sơ khách hàng:', err);
      toast.error('Có lỗi xảy ra', 'Không thể lưu hồ sơ khách hàng vào lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierInfo = getNextTierInfo(customer?.membershipTier, customer?.totalSpent || 0);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Hồ sơ khách hàng
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Khách hàng / {customer?.fullName || 'Nguyễn Mỹ Duyên'} · {customer?.referralCode || 'MLD-VIP-01'}
          </p>
        </div>
        <button
          onClick={() => {
            const customerName = customer?.fullName || 'Nguyễn Mỹ Duyên';
            const params = new URLSearchParams({
              create: 'true',
              customer: customerName,
            });
            if (customer?.id) params.set('customerId', customer.id);
            if (customer?.phone) params.set('phone', customer.phone);
            navigate(`/staff-schedule?${params.toString()}`);
          }}
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        >
          Tạo lịch hẹn
        </button>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs whitespace-nowrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
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
                    {customer?.fullName || 'Nguyễn Mỹ Duyên'}
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
                onClick={handleOpenEditModal}
                title="Chỉnh sửa hồ sơ"
                className="p-1 rounded-lg text-[#8A4F23] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
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
                  {customer ? `${(customer.rewardPoints || 0).toLocaleString('vi-VN')} điểm` : '2.450 điểm'}
                </div>
                <div className="text-[11px] text-[#F3E2CE]/80 mt-1.5 font-medium">
                  Mã hội viên · {customer?.referralCode || 'MLD-VIP-01'}
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-white/20 relative z-10">
                <button
                  onClick={() => toast.success('Thẻ hội viên QR', `Mã thẻ: ${customer?.referralCode || 'MLD-VIP-01'} · Hạng thẻ: ${customer?.membershipTier || 'KIM CƯƠNG'}`)}
                  className="w-full flex items-center justify-between text-xs font-bold text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#F3E2CE]" />
                    <span>Xem thẻ hội viên QR</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
                {/* Thanh tiến trình nâng hạng hội viên VIP */}
                <div className="mt-3 pt-2.5 border-t border-white/15 text-[10.5px]">
                  <div className="flex justify-between items-center text-[#F3E2CE]/90 mb-1 font-medium gap-1 whitespace-nowrap">
                    <span className="shrink-0">Chi tiêu: {(customer?.totalSpent || 0).toLocaleString('vi-VN')}đ</span>
                    <span className="font-bold shrink-0 text-right">
                      {tierInfo.isMax ? 'Hạng VVIP tối đa' : `Cần +${tierInfo.remaining.toLocaleString('vi-VN')}đ lên ${tierInfo.nextName}`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F3E2CE] to-white rounded-full transition-all duration-500"
                      style={{ width: `${tierInfo.percent}%` }}
                    />
                  </div>
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
              onClick={handleOpenEditModal}
              className="w-full py-2.5 bg-white border border-[#D7BBA6] text-[#8A4F23] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          </div>

          {/* Card: Sở thích & ghi chú điều trị */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#3E200C]">Sở thích & ghi chú lâm sàng</h3>
              <button
                onClick={handleOpenEditModal}
                title="Sửa ghi chú"
                className="text-[#8A4F23] hover:text-[#985018] p-1 rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-[#4A3E34] leading-relaxed">
              {clinicalNotes}
            </p>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                Kỹ thuật viên phụ trách: {preferredTech}
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
          {/* Medical Safety Alert Banner */}
          <div className="p-4 rounded-2xl border border-[#F3C7A8] bg-[#FDF6F0] flex items-start gap-3 text-xs shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] flex items-center justify-center text-[#985018] shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#3E200C]">Lưu ý an toàn trị liệu & Phác đồ MLD Vodder</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                  Tiêu chuẩn lâm sàng
                </span>
              </div>
              <p className="text-[11.5px] text-[#5C5046] mt-1 leading-relaxed">
                {clinicalNotes || 'Khách hàng đáp ứng tốt với kỹ thuật Vodder chuẩn y khoa. Cần theo dõi phản ứng sau 24h.'}
              </p>
            </div>
          </div>

          {/* TAB 1: Lịch hẹn (hiển thị khi chọn 'Tổng quan' hoặc 'Lịch hẹn') */}
          {(activeTab === 'Tổng quan' || activeTab === 'Lịch hẹn') && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Lịch hẹn của khách hàng ({bookings.length})
                </h3>
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3E2CE] text-[#8A4F23]">
                  {bookings.length > 0 ? 'Dữ liệu lịch hẹn thực tế' : 'Chưa có lịch hẹn mới'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#F3E2CE] text-[#73675F] text-[11.5px] font-medium whitespace-nowrap">
                    <tr>
                      <th className="py-3 px-5 font-medium whitespace-nowrap">Ngày & giờ</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Mã lịch hẹn</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Phòng / Giường</th>
                      <th className="py-3 px-5 font-medium whitespace-nowrap">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE4D9] whitespace-nowrap">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#8C7A6B]">
                          Chưa ghi nhận lịch hẹn nào cho khách hàng này.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((app) => (
                        <tr key={app.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="font-medium text-[#2C241E] whitespace-nowrap">{app.bookingDate}</div>
                            <div className="text-[11px] text-[#8C7A6B] mt-0.5 whitespace-nowrap">
                              {app.startTime.slice(0, 5)}–{app.endTime.slice(0, 5)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-[#2C241E] whitespace-nowrap">{app.bookingCode}</div>
                            <div className="text-[11px] text-[#8C7A6B] mt-0.5 whitespace-nowrap">
                              {app.checkinNotes || 'Dịch vụ spa'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-[#2C241E] whitespace-nowrap">Phòng VIP 01</div>
                            <div className="text-[11px] text-[#8C7A6B] mt-0.5 whitespace-nowrap">
                              Giường {app.assignedBedNumber || '01'}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Liệu trình & Gói chăm sóc (hiển thị khi chọn 'Tổng quan' hoặc 'Liệu trình') */}
          {(activeTab === 'Tổng quan' || activeTab === 'Liệu trình') && (
            <>
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    Gói liệu trình sở hữu ({packages.length})
                  </h3>
                  <p className="text-[11px] text-[#73675F]">
                    Quản lý phác đồ điều trị và số buổi chăm sóc của khách hàng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAssignPackageModal}
                  className="px-3.5 py-1.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Đăng ký gói liệu trình</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.length === 0 ? (
                  <div className="col-span-2 bg-white rounded-2xl border border-[#EFE4D9] p-6 text-center text-xs text-[#8C7A6B]">
                    Khách hàng chưa đăng ký gói combo liệu trình dài hạn nào.
                  </div>
                ) : (
                  packages.map((pkg) => {
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
                        <div className="flex items-center justify-between text-xs whitespace-nowrap">
                          <span className="text-[#73675F] whitespace-nowrap">Tổng / đã dùng / còn lại</span>
                          <span className="font-semibold text-[#2C241E] whitespace-nowrap">
                            {pkg.totalSessions} / {pkg.completedSessions} / {remaining} buổi
                          </span>
                        </div>
                        <div className="pt-1">
                          <div className="text-xs font-semibold text-[#2C241E] mb-1.5 whitespace-nowrap">
                            Đã sử dụng {percent}%
                          </div>
                          <div className="w-full h-1.5 bg-[#EBD8C7] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#985018] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-[#73675F] pt-1 whitespace-nowrap">
                          Hạn dùng: {pkg.expiresAt?.split('T')[0] || '12/2026'} · Chi nhánh Quận 3
                        </p>

                        {remaining > 0 ? (
                          <button
                            type="button"
                            disabled={isProcessingSession}
                            onClick={() => handleCompleteSession(pkg)}
                            className="w-full mt-2 py-2 px-3 bg-[#FAF3EC] hover:bg-[#F3E2CE] text-[#8A4F23] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isProcessingSession ? 'Đang ghi nhận...' : 'Ghi nhận thực hiện 1 buổi'}</span>
                          </button>
                        ) : (
                          <div className="mt-2 py-1.5 px-3 bg-[#E8F6ED] text-[#0D6832] rounded-xl text-xs font-bold text-center border border-[#C2E8D1] whitespace-nowrap">
                            ✓ Đã hoàn tất 100% phác đồ
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Nhật ký trị liệu lâm sàng */}
              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Nhật ký điều trị lâm sàng ({journals.length} buổi)
                </h3>
                <div className="space-y-3">
                  {journals.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8C7A6B]">
                      Chưa có nhật ký lâm sàng nào được ghi nhận.
                    </div>
                  ) : (
                    journals.map((j) => (
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
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: Học tập (hiển thị khi chọn 'Học tập') */}
          {activeTab === 'Học tập' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Hồ sơ học viên & Khóa học đào tạo ({enrollments.length})
                </h3>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                  Học viện MLD Academy
                </span>
              </div>
              {enrollments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8C7A6B]">
                  Khách hàng hiện chưa đăng ký tham gia khóa học nào tại Học viện MLD.
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((e) => (
                    <div key={e.id} className="p-4 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] space-y-2">
                      <div className="flex items-center justify-between font-bold text-xs text-[#2C241E]">
                        <span>{e.course?.title || 'Khóa học Dẫn Lưu Bạch Huyết MLD'}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#E8EFE5] text-[#526D51]">
                          {e.status || 'Đang theo học'}
                        </span>
                      </div>
                      <div className="text-xs text-[#73675F] flex justify-between">
                        <span>Lớp: {e.batch?.batchCode || 'MLD-K18-HCM'}</span>
                        <span>Học phí: {e.tuitionTotal?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Giao dịch (hiển thị khi chọn 'Giao dịch') */}
          {activeTab === 'Giao dịch' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Lịch sử thanh toán & Hóa đơn thu ngân
                </h3>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                  Ví MLD Pay & VietQR
                </span>
              </div>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#2C241E]">Thanh toán gói dịch vụ Massage Thư Giãn</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">12/10/2026 · Chuyển khoản VietQR MB Bank</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#8E4002]">+450.000đ</div>
                    <span className="text-[10px] text-[#2E7D32] font-semibold">Hoàn tất</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#2C241E]">Đặt cọc liệu trình Chăm sóc da Hydrafacial</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">08/10/2026 · Tiền mặt tại quầy</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#8E4002]">+150.000đ</div>
                    <span className="text-[10px] text-[#2E7D32] font-semibold">Hoàn tất</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Ghi chú (hiển thị khi chọn 'Ghi chú') */}
          {activeTab === 'Ghi chú' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Lưu ý phục vụ & Hồ sơ cá nhân hóa
                </h3>
                <button
                  onClick={handleOpenEditModal}
                  className="px-3 py-1.5 rounded-xl border border-[#D7BBA6] text-[#8A4F23] text-xs font-bold hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Cập nhật ghi chú</span>
                </button>
              </div>
              <div className="p-4 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] text-xs text-[#5C5046] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#2C241E]">Ghi chú chuyên môn của KTV phụ trách ({preferredTech}):</p>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-bold">
                    Hồ sơ VIP
                  </span>
                </div>
                <p className="leading-relaxed">{clinicalNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal Chỉnh Sửa Hồ Sơ Khách Hàng */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3E2CE] flex items-center justify-center text-[#8A4F23] shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#3E200C]">Chỉnh sửa hồ sơ khách hàng</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                      MLD VIP Client
                    </span>
                  </div>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Cập nhật thông tin định danh cá nhân, phân hạng VIP và ghi chú lâm sàng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProfile} className="overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* PHẦN 1: THÔNG TIN ĐỊNH DANH & LIÊN HỆ */}
              <div>
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>1. Thông tin định danh & liên hệ</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Họ và tên <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Ví dụ: Nguyễn Mỹ Duyên"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Số điện thoại <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ví dụ: 0988123456"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Email liên hệ
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Ngày sinh
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Giới tính
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'FEMALE', label: 'Nữ' },
                      { key: 'MALE', label: 'Nam' },
                      { key: 'OTHER', label: 'Khác' },
                    ].map((g) => {
                      const isSel = formData.gender === g.key;
                      return (
                        <button
                          type="button"
                          key={g.key}
                          onClick={() => setFormData({ ...formData, gender: g.key as any })}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#FAF0E4] border-[#985018] text-[#985018] ring-1 ring-[#985018]'
                              : 'bg-white border-[#E8DFD8] text-[#73675F] hover:border-[#D7BBA6]'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PHẦN 2: PHÂN HẠNG HỘI VIÊN & MỤC ĐÍCH */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>2. Hạng thẻ hội viên VIP & Nhu cầu</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Hạng thẻ thành viên
                    </label>
                    <select
                      value={formData.membershipTier}
                      onChange={(e) => setFormData({ ...formData, membershipTier: e.target.value as MemberTier })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs font-bold text-[#8A4F23] focus:outline-none focus:border-[#985018] cursor-pointer"
                    >
                      <option value={MemberTier.STANDARD}>STANDARD · Hạng Tiêu Chuẩn</option>
                      <option value={MemberTier.SILVER}>SILVER · Hội viên Bạc</option>
                      <option value={MemberTier.GOLD}>GOLD · Hội viên Vàng (VIP)</option>
                      <option value={MemberTier.PLATINUM}>PLATINUM · Bạch Kim</option>
                      <option value={MemberTier.DIAMOND}>DIAMOND · Kim Cương (VVIP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Mục đích quan tâm chính
                    </label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value as PurposeInterest })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                    >
                      <option value={PurposeInterest.BEAUTY_SPA}>Trị liệu Spa & Thẩm mỹ</option>
                      <option value={PurposeInterest.ACADEMY}>Đào tạo Học viện Academy</option>
                      <option value={PurposeInterest.BOTH}>Cả Trị liệu Spa & Đào tạo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PHẦN 3: ĐỊA CHỈ & LIÊN HỆ KHẨN CẤP */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>3. Địa chỉ & Thông tin liên hệ khẩn cấp</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Địa chỉ liên hệ thường trú
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Ví dụ: 15/2 Đặng Thai Mai, Phường 7, Phú Nhuận, TP.HCM"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                        Người liên hệ khẩn cấp
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        placeholder="Họ tên người thân"
                        className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                        Số ĐT liên hệ khẩn cấp
                      </label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        placeholder="SĐT người thân"
                        className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN 4: KỸ THUẬT VIÊN & GHI CHÚ LÂM SÀNG */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>4. Chuyên môn & Ghi chú dịch vụ cá nhân hóa</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Kỹ thuật viên phụ trách ưu tiên
                    </label>
                    <input
                      type="text"
                      value={formData.preferredTechnician}
                      onChange={(e) => setFormData({ ...formData, preferredTechnician: e.target.value })}
                      placeholder="Ví dụ: Trần Lan Anh"
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Sở thích & Ghi chú lâm sàng
                    </label>
                    <textarea
                      rows={3}
                      value={formData.clinicalNotes}
                      onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
                      placeholder="Ghi chú sở thích khách hàng, tiền sử dị ứng hoặc yêu cầu trị liệu đặc biệt..."
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Lưu thay đổi hồ sơ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Đăng ký / Gán Gói Liệu Trình Mới */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3E2CE] flex items-center justify-center text-[#8A4F23] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#3E200C]">Đăng ký gói liệu trình</h2>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Gán gói phác đồ điều trị cho khách hàng {customer?.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignPackageSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Chọn gói liệu trình
                </label>
                <div className="space-y-2">
                  {availablePackages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const displayPrice = pkg.discountPrice || pkg.price;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#FAF0E4] border-[#985018] ring-1 ring-[#985018]'
                            : 'bg-white border-[#E8DFD8] hover:border-[#D7BBA6]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#2C241E] flex items-center gap-2">
                            <span>{pkg.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3E2CE] text-[#8A4F23]">
                              {pkg.totalSessions} buổi
                            </span>
                          </div>
                          <div className="text-[11px] text-[#73675F]">
                            Hạn dùng: {pkg.validityMonths || 6} tháng · Phác đồ MLD Vodder
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-sm text-[#8E4002]">
                            {displayPrice.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isAssigningPackage || availablePackages.length === 0}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isAssigningPackage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kích hoạt...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Kích hoạt gói ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

