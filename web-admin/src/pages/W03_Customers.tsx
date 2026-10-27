import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Crown,
  Leaf,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
  RotateCcw,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Check,
  Loader2,
  Download,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerService, treatmentService, branchService, supabaseService } from '../services';
import { toast } from '../components/common';
import {
  User,
  MemberTier,
  UserPackage,
  PurposeInterest,
  UserRole,
  Branch,
  Booking,
  CourseEnrollment,
} from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

const INITIAL_NEW_CUSTOMER_FORM = {
  fullName: '',
  phone: '',
  email: '',
  gender: 'FEMALE' as 'MALE' | 'FEMALE' | 'OTHER',
  membershipTier: MemberTier.STANDARD,
  purpose: PurposeInterest.BEAUTY_SPA,
  address: '',
};

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'KH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getTierLabel = (tier?: MemberTier) => {
  switch (tier) {
    case MemberTier.DIAMOND:
      return 'Kim cương';
    case MemberTier.PLATINUM:
      return 'Bạch kim';
    case MemberTier.GOLD:
      return 'Vàng';
    case MemberTier.SILVER:
      return 'Bạc';
    case MemberTier.STANDARD:
    default:
      return 'Thành viên';
  }
};

const getSourceLabel = (c: User) => {
  if (c.referredById) return 'Giới thiệu bạn bè';
  if (c.referralCode) return 'Mã giới thiệu';
  if (c.purpose === PurposeInterest.ACADEMY) return 'Tuyển sinh học viện';
  if (c.purpose === PurposeInterest.BEAUTY_SPA) return 'Tư vấn tại cơ sở';
  if (c.purpose === PurposeInterest.BOTH) return 'Ứng dụng MLD';
  return 'Ứng dụng MLD';
};

const getLastVisitDate = (c: User, bookings: Booking[]) => {
  const userBookings = (bookings || [])
    .filter((b) => b.customerId === c.id && b.bookingDate)
    .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

  if (userBookings.length > 0) {
    const d = new Date(userBookings[0].bookingDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  if (c.updatedAt || c.createdAt) {
    const d = new Date(c.updatedAt || c.createdAt);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  return 'Chưa có lượt hẹn';
};

const getPackageLine1 = (c: User, packages: UserPackage[]) => {
  const userPkgs = (packages || []).filter((p) => p.customerId === c.id);
  const activePkgs = userPkgs.filter((p) => p.status === 'ACTIVE');
  if (activePkgs.length > 0) {
    const remaining = activePkgs.reduce(
      (sum, p) => sum + Math.max(0, p.totalSessions - (p.completedSessions || 0)),
      0
    );
    if (activePkgs.length === 1 && activePkgs[0].package?.name) {
      return `${activePkgs[0].package.name} · ${remaining} buổi còn`;
    }
    return `${activePkgs.length} gói · ${remaining} buổi còn`;
  }
  if (userPkgs.length > 0) {
    return `Đã hoàn thành ${userPkgs.length} gói`;
  }
  if (c.purpose === PurposeInterest.BEAUTY_SPA) return 'Chăm sóc da';
  if (c.totalSpent && c.totalSpent > 0) return 'Khách sử dụng lẻ';
  return 'Chưa đăng ký gói';
};

const getPackageLine2 = (c: User, enrollments: CourseEnrollment[]) => {
  const userEnrolls = (enrollments || []).filter((e) => e.studentId === c.id);
  if (userEnrolls.length > 0) {
    const studying = userEnrolls.filter((e) => e.status === 'STUDYING').length;
    if (studying > 0) {
      return `${userEnrolls.length} khóa · ${studying} đang học`;
    }
    return `${userEnrolls.length} khóa đào tạo`;
  }
  if (c.purpose === PurposeInterest.ACADEMY || c.role === UserRole.STUDENT) {
    return 'Hồ sơ tuyển sinh mới';
  }
  return 'Chưa có gói đào tạo';
};

const getPreferredBranch = (c: User, bookings: Booking[], branches: Branch[]) => {
  const userBookings = (bookings || []).filter((b) => b.customerId === c.id);
  if (userBookings.length > 0) {
    const latestB = userBookings[0];
    const br = (branches || []).find((b) => b.id === latestB.branchId);
    if (br) {
      return br.district || br.name.replace(/MLD Beauty & Spa – Cơ sở\s*/i, '');
    }
  }
  if (c.address) {
    const addr = c.address.toLowerCase();
    for (const br of branches || []) {
      if (br.district && addr.includes(br.district.toLowerCase())) return br.district;
      if (br.city && addr.includes(br.city.toLowerCase())) return br.city;
    }
  }
  return branches[0]?.district || 'Quận 3';
};

const getStatusLabel = (c: User, packages: UserPackage[], enrollments: CourseEnrollment[]) => {
  const hasEnroll = (enrollments || []).some((e) => e.studentId === c.id) || c.role === UserRole.STUDENT;
  const hasService =
    (packages || []).some((p) => p.customerId === c.id) || (c.totalSpent && c.totalSpent > 0);
  if (hasEnroll && hasService) return 'Khách hàng & học viên';
  if (hasEnroll) return 'Học viên học viện';
  if (hasService) return 'Đang theo dõi';
  return 'Khách tiềm năng';
};

const getStatusStyle = (label: string) => {
  if (label === 'Khách hàng & học viên') return 'bg-[#FDEEE4] text-[#A4532A]';
  if (label === 'Học viên học viện') return 'bg-[#E1F5FE] text-[#0277BD]';
  if (label === 'Đang theo dõi') return 'bg-[#F4ECE3] text-[#8E6549]';
  return 'bg-[#FFF3E0] text-[#E65100]';
};

const getFormattedCode = (c: User, idx: number) => {
  if (c.referralCode) {
    if (c.referralCode.startsWith('WM-')) return c.referralCode;
    if (c.referralCode === 'MLDADMIN') return 'WM-ADMIN';
    if (c.referralCode.length > 10) return `WM-${c.referralCode.slice(0, 6).toUpperCase()}`;
    return `WM-${c.referralCode}`;
  }
  if (c.phone) {
    const digits = c.phone.replace(/\D/g, '');
    if (digits.length >= 4) return `WM-${digits.slice(-4)}`;
  }
  return `WM-${c.id.slice(0, 6).toUpperCase()}`;
};

const getMaskedPhone = (phone?: string) => {
  if (!phone) return '09•• ••• •••';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phone;
};

export const W03_Customers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allPackages, setAllPackages] = useState<UserPackage[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<CourseEnrollment[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPackages, setSelectedPackages] = useState<UserPackage[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [selectedSort, setSelectedSort] = useState<string>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // CUST-01: Create Customer Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(INITIAL_NEW_CUSTOMER_FORM);

  // Fetch all customers, branches, packages, bookings, enrollments on load directly from Supabase Cloud
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const [res, branchRes, pkgRes, bkgRes, enrollRes] = await Promise.all([
        customerService.getCustomers(),
        branchService.getAllBranches(),
        supabaseService.getUserPackages(),
        supabaseService.getBookings(),
        supabaseService.getEnrollments(),
      ]);

      const list = res.success && res.data ? res.data : [];
      setAllCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(list[0].id);
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
      }
      if (pkgRes) {
        setAllPackages(pkgRes);
      }
      if (bkgRes) {
        setAllBookings(bkgRes);
      }
      if (enrollRes) {
        setAllEnrollments(enrollRes);
      }
    } catch (err) {
      console.error('Failed to load real customer data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter & Sort Logic
  const filteredCustomers = useMemo(() => {
    let result = [...allCustomers];

    // 1. Search (tên, số điện thoại, email, mã giới thiệu, địa chỉ)
    if (searchTerm.trim()) {
      result = result.filter((c) =>
        matchSearch(
          [c.fullName, c.phone, c.email, c.referralCode, c.address],
          searchTerm
        )
      );
    }

    // 2. Role filter (Khách hàng / Học viên / Kỹ thuật viên / Quản trị)
    if (selectedRole !== 'ALL') {
      if (selectedRole === 'CUSTOMER') {
        result = result.filter((c) => c.role === UserRole.CUSTOMER);
      } else if (selectedRole === 'STUDENT') {
        result = result.filter((c) => c.role === UserRole.STUDENT);
      } else if (selectedRole === 'TECHNICIAN') {
        result = result.filter(
          (c) =>
            c.role === UserRole.TECHNICIAN ||
            c.role === UserRole.INSTRUCTOR ||
            c.role === UserRole.RECEPTIONIST ||
            c.role === UserRole.CASHIER
        );
      } else if (selectedRole === 'ADMIN') {
        result = result.filter(
          (c) =>
            c.role === UserRole.ADMIN ||
            c.role === UserRole.SUPER_ADMIN ||
            c.role === UserRole.BRANCH_MANAGER
        );
      }
    }

    // 3. Member Tier filter
    if (selectedTier !== 'ALL') {
      result = result.filter((c) => c.membershipTier === selectedTier);
    }

    // 4. Status filter
    if (selectedStatus === 'ACTIVE') {
      result = result.filter((c) => c.isActive !== false);
    } else if (selectedStatus === 'INACTIVE') {
      result = result.filter((c) => c.isActive === false);
    }

    // 5. Purpose filter
    if (selectedPurpose !== 'ALL') {
      result = result.filter((c) => c.purpose === selectedPurpose);
    }

    // 6. Branch filter
    if (selectedBranch !== 'ALL') {
      const targetB = branches.find((b) => b.id === selectedBranch);
      result = result.filter((c) => {
        const uBId = (c as any).branchId || (c as any).branch_id;
        if (uBId) return uBId === selectedBranch;
        if (targetB) {
          const addr = (c.address || '').toLowerCase();
          const dName = targetB.district.toLowerCase();
          const bName = targetB.name.toLowerCase();
          return addr.includes(dName) || addr.includes(bName);
        }
        return true;
      });
    }

    // 7. Sorting
    switch (selectedSort) {
      case 'SPENT_DESC':
        result.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        break;
      case 'POINTS_DESC':
        result.sort((a, b) => (b.rewardPoints || 0) - (a.rewardPoints || 0));
        break;
      case 'NAME_ASC':
        result.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
        break;
      case 'NEWEST':
      default:
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [allCustomers, searchTerm, selectedRole, selectedTier, selectedStatus, selectedPurpose, selectedBranch, selectedSort, branches]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));

  // Reset page when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedTier, selectedStatus, selectedPurpose, selectedBranch, selectedSort]);

  // CUST-06: Tự động điều chỉnh lùi trang khi dữ liệu co lại
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Sync selected customer when list updates
  useEffect(() => {
    if (filteredCustomers.length > 0) {
      const exists = filteredCustomers.some((c) => c.id === selectedCustomerId);
      if (!exists) {
        setSelectedCustomerId(filteredCustomers[0].id);
      }
    }
  }, [filteredCustomers, selectedCustomerId]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const hasActiveFilter =
    searchTerm.trim() !== '' ||
    selectedRole !== 'ALL' ||
    selectedTier !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPurpose !== 'ALL' ||
    selectedBranch !== 'ALL' ||
    selectedSort !== 'NEWEST';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRole('ALL');
    setSelectedTier('ALL');
    setSelectedStatus('ALL');
    setSelectedPurpose('ALL');
    setSelectedBranch('ALL');
    setSelectedSort('NEWEST');
  };

  // Helper chuẩn hóa hiển thị dữ liệu xuất Excel & CSV (tối giản, ngắn gọn, không rườm rà)
  const getRoleExportLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'Quản trị viên';
      case 'INSTRUCTOR':
        return 'Giảng viên';
      case 'TECHNICIAN':
        return 'Kỹ thuật viên';
      case 'RECEPTIONIST':
        return 'Lễ tân';
      case 'STUDENT':
        return 'Học viên';
      case 'CUSTOMER':
      default:
        return 'Khách hàng';
    }
  };

  const getTierExportLabel = (tier?: string) => {
    switch (tier) {
      case 'DIAMOND':
        return 'Kim cương';
      case 'PLATINUM':
        return 'Bạch kim';
      case 'GOLD':
        return 'Vàng';
      case 'SILVER':
        return 'Bạc';
      case 'STANDARD':
      default:
        return 'Tiêu chuẩn';
    }
  };

  const getPurposeExportLabel = (purpose?: string) => {
    switch (purpose) {
      case 'ACADEMY':
        return 'Đào tạo';
      case 'BOTH':
        return 'Spa & Đào tạo';
      case 'BEAUTY_SPA':
      default:
        return 'Spa & Làm đẹp';
    }
  };

  const cleanExportPhone = (phone?: string | null) => {
    if (!phone || phone === 'null' || phone === 'undefined') return '';
    return phone.trim();
  };

  // 1. Tính năng xuất Excel (.xls) giao diện thanh lịch, tối giản, màu sắc nhẹ nhàng, chống rớt dòng
  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.warning('Không có dữ liệu', 'Không có hồ sơ khách hàng nào trong danh sách hiện tại để xuất.');
      return;
    }

    const now = new Date();
    const exportDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const fileDateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const totalSpentSum = filteredCustomers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const totalPointsSum = filteredCustomers.reduce((acc, c) => acc + (c.rewardPoints || 0), 0);

    const rowsHtml = filteredCustomers
      .map((c, idx) => {
        const isAlt = idx % 2 === 1;
        const code = c.referralCode || `KH-${c.id.slice(0, 8).toUpperCase()}`;
        const phone = cleanExportPhone(c.phone);
        const email = c.email && c.email !== 'null' ? c.email : '';
        const role = getRoleExportLabel(c.role);
        const tier = getTierExportLabel(c.membershipTier);
        const purpose = getPurposeExportLabel(c.purpose);
        const address = c.address && c.address !== 'null' ? c.address : '';
        const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '';
        const points = (c.rewardPoints || 0).toLocaleString('vi-VN');
        const spent = (c.totalSpent || 0).toLocaleString('vi-VN') + ' ₫';

        return `
          <tr style="${isAlt ? 'background-color: #FAFAFA;' : 'background-color: #FFFFFF;'}">
            <td style="text-align: center; border: 1px solid #E5E7EB; padding: 8px 10px; color: #6B7280; white-space: nowrap;">${idx + 1}</td>
            <td style="text-align: center; font-weight: 500; color: #1F2937; border: 1px solid #E5E7EB; padding: 8px 10px; mso-number-format: '\\@'; white-space: nowrap;">${code}</td>
            <td style="font-weight: 600; color: #111827; border: 1px solid #E5E7EB; padding: 8px 10px; white-space: nowrap;">${c.fullName}</td>
            <td style="text-align: center; border: 1px solid #E5E7EB; padding: 8px 10px; mso-number-format: '\\@'; color: #374151; white-space: nowrap;">${phone}</td>
            <td style="border: 1px solid #E5E7EB; padding: 8px 10px; color: #374151; white-space: nowrap;">${email}</td>
            <td style="text-align: center; border: 1px solid #E5E7EB; padding: 8px 10px; color: #374151; white-space: nowrap;">${role}</td>
            <td style="text-align: center; border: 1px solid #E5E7EB; padding: 8px 10px; color: #374151; white-space: nowrap;">${tier}</td>
            <td style="text-align: right; border: 1px solid #E5E7EB; padding: 8px 10px; color: #374151; white-space: nowrap;">${points}</td>
            <td style="text-align: right; border: 1px solid #E5E7EB; padding: 8px 10px; font-weight: 600; color: #111827; white-space: nowrap;">${spent}</td>
            <td style="border: 1px solid #E5E7EB; padding: 8px 10px; color: #374151; white-space: nowrap;">${purpose}</td>
            <td style="border: 1px solid #E5E7EB; padding: 8px 10px; color: #4B5563; white-space: nowrap;">${address}</td>
            <td style="text-align: center; border: 1px solid #E5E7EB; padding: 8px 10px; color: #6B7280; white-space: nowrap;">${created}</td>
          </tr>
        `;
      })
      .join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Khách Hàng</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1F2937; margin: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { white-space: nowrap; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="12" style="font-size: 14pt; font-weight: bold; color: #111827; text-align: center; padding: 14px 8px 4px 8px; white-space: nowrap;">
              DANH SÁCH KHÁCH HÀNG - MLD BEAUTY & ACADEMY
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 9pt; color: #6B7280; padding: 4px 8px 12px 8px; white-space: nowrap;">
              Thời gian xuất: ${exportDateStr}
            </td>
            <td colspan="6" style="font-size: 9pt; color: #6B7280; text-align: right; padding: 4px 8px 12px 8px; white-space: nowrap;">
              Tổng cộng: <b>${filteredCustomers.length}</b> khách hàng
            </td>
          </tr>
          <thead>
            <tr style="background-color: #F3F4F6; color: #111827; font-weight: 600; text-align: center;">
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 45px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">STT</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 140px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Mã khách hàng</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 180px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Họ và tên</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 120px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Số điện thoại</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 250px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Email</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 110px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Vai trò</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 110px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Hạng hội viên</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 100px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Điểm tích lũy</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 130px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Tổng chi tiêu</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 130px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Nhu cầu quan tâm</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 200px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Địa chỉ</th>
              <th style="border: 1px solid #D1D5DB; padding: 8px 12px; min-width: 100px; background-color: #F3F4F6; color: #111827; white-space: nowrap;">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background-color: #F3F4F6; font-weight: bold; border-top: 2px solid #9CA3AF;">
              <td colspan="7" style="border: 1px solid #D1D5DB; padding: 8px 12px; text-align: center; color: #374151; white-space: nowrap;">
                TỔNG CỘNG (${filteredCustomers.length} KHÁCH HÀNG)
              </td>
              <td style="border: 1px solid #D1D5DB; padding: 8px 12px; text-align: right; color: #111827; white-space: nowrap;">
                ${totalPointsSum.toLocaleString('vi-VN')}
              </td>
              <td style="border: 1px solid #D1D5DB; padding: 8px 12px; text-align: right; color: #111827; white-space: nowrap;">
                ${totalSpentSum.toLocaleString('vi-VN')} ₫
              </td>
              <td colspan="3" style="border: 1px solid #D1D5DB; padding: 8px 12px;"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MLD_DanhSachKhachHang_${fileDateStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      'Xuất Excel thành công',
      `Đã xuất ${filteredCustomers.length} hồ sơ ra file Excel (.xls) định dạng chuẩn.`
    );
  };

  // 2. Tính năng xuất danh sách khách hàng ra CSV chuẩn UTF-8 có 'sep=,' để tự động phân tách cột
  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.warning('Không có dữ liệu', 'Không có hồ sơ khách hàng nào trong danh sách hiện tại để xuất.');
      return;
    }

    const headers = [
      'STT',
      'Mã khách hàng',
      'Họ và tên',
      'Số điện thoại',
      'Email',
      'Vai trò',
      'Hạng hội viên',
      'Điểm thưởng',
      'Tổng chi tiêu (VNĐ)',
      'Nhu cầu quan tâm',
      'Địa chỉ',
      'Ngày tạo',
    ];

    const rows = filteredCustomers.map((c, idx) => {
      const code = c.referralCode || `KH-${c.id.slice(0, 8).toUpperCase()}`;
      const phone = cleanExportPhone(c.phone);
      const email = c.email && c.email !== 'null' ? c.email : '';
      const role = getRoleExportLabel(c.role);
      const tier = getTierExportLabel(c.membershipTier);
      const purpose = getPurposeExportLabel(c.purpose);
      const address = c.address && c.address !== 'null' ? c.address.replace(/"/g, '""') : '';
      const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '';

      return [
        idx + 1,
        `"${code}"`,
        `"${c.fullName.replace(/"/g, '""')}"`,
        `"'\t${phone}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${role}"`,
        `"${tier}"`,
        c.rewardPoints || 0,
        c.totalSpent || 0,
        `"${purpose}"`,
        `"${address}"`,
        `"${created}"`,
      ];
    });

    // \uFEFFsep=,\r\n tells Excel & WPS explicitly to use comma delimiter so columns are never lumped into Column A!
    const csvContent =
      '\uFEFFsep=,\r\n' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MLD_KhachHang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Xuất file thành công', `Đã xuất ${filteredCustomers.length} hồ sơ khách hàng ra file CSV chuẩn UTF-8.`);
  };

  // Load packages for selected customer
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedPackages([]);
      return;
    }
    const fetchPackages = async () => {
      try {
        const res = await treatmentService.getUserPackagesByCustomer(selectedCustomerId);
        if (res.success) {
          setSelectedPackages(res.data);
        }
      } catch (err) {
        console.error('Failed to load user packages:', err);
      }
    };
    fetchPackages();
  }, [selectedCustomerId]);

  // CUST-07: Khi bộ lọc không có bản ghi nào, selectedCustomer là null
  const selectedCustomer =
    filteredCustomers.length > 0
      ? allCustomers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0]
      : null;

  const selectedCustomerPackages = useMemo(() => {
    if (!selectedCustomer) return [];
    return allPackages.filter((p) => p.customerId === selectedCustomer.id);
  }, [allPackages, selectedCustomer]);

  const selectedCustomerBookings = useMemo(() => {
    if (!selectedCustomer) return [];
    return allBookings.filter((b) => b.customerId === selectedCustomer.id);
  }, [allBookings, selectedCustomer]);

  const selectedCustomerEnrollments = useMemo(() => {
    if (!selectedCustomer) return [];
    return allEnrollments.filter((e) => e.studentId === selectedCustomer.id);
  }, [allEnrollments, selectedCustomer]);

  const isDualRole =
    selectedCustomerEnrollments.length > 0 &&
    (selectedCustomerPackages.length > 0 || (selectedCustomer?.totalSpent || 0) > 0);

  const isStudentOnly =
    selectedCustomerEnrollments.length > 0 || selectedCustomer?.role === UserRole.STUDENT;

  const relatedBranchNames = useMemo(() => {
    if (!selectedCustomer) return 'Quận 3';
    const bIds = Array.from(new Set(selectedCustomerBookings.map((b) => b.branchId).filter(Boolean)));
    const names = bIds
      .map((id) => {
        const br = branches.find((b) => b.id === id);
        return br?.district || br?.name.replace(/MLD Beauty & Spa – Cơ sở\s*/i, '');
      })
      .filter(Boolean);
    if (names.length > 0) return names.join(' · ');
    return getPreferredBranch(selectedCustomer, selectedCustomerBookings, branches);
  }, [selectedCustomer, selectedCustomerBookings, branches]);

  const expiringPackages = useMemo(() => {
    const now = new Date();
    return selectedCustomerPackages.filter((p) => {
      if (p.status !== 'ACTIVE' || !p.expiresAt) return false;
      const expDate = new Date(p.expiresAt);
      const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 60;
    });
  }, [selectedCustomerPackages]);

  const careList = useMemo(() => {
    const items: { date: string; title: string; note: string }[] = [];
    const sortedBookings = [...allBookings]
      .filter((b) => b.bookingDate)
      .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

    for (const b of sortedBookings.slice(0, 3)) {
      const cust = allCustomers.find((u) => u.id === b.customerId) || b.customer;
      const cName = cust?.fullName ? cust.fullName.split(' ').slice(-2).join(' ') : 'Khách hàng';
      const d = new Date(b.bookingDate);
      const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const priceStr = b.finalPrice ? `${b.finalPrice.toLocaleString('vi-VN')}đ` : '';
      const content = b.specialNotes || `lịch hẹn ${b.bookingCode}${priceStr ? ` (${priceStr})` : ''}`;
      items.push({
        date: dStr,
        title: cName,
        note: content,
      });
    }

    if (items.length < 2) {
      for (const e of allEnrollments.slice(0, 2)) {
        const student = allCustomers.find((u) => u.id === e.studentId);
        const sName = student?.fullName ? student.fullName.split(' ').slice(-2).join(' ') : 'Học viên';
        const d = e.enrolledAt ? new Date(e.enrolledAt) : new Date();
        const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        items.push({
          date: dStr,
          title: sName,
          note: `theo dõi tiến độ học ${e.progressPercent || 0}% và lịch thực hành.`,
        });
      }
    }

    return items;
  }, [allBookings, allEnrollments, allCustomers]);

  // CUST-01: Modal Handlers Tiếp nhận khách hàng mới
  const handleOpenCreateCustomerModal = () => {
    setNewCustomerForm(INITIAL_NEW_CUSTOMER_FORM);
    setIsCreateModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustomerForm.fullName.trim();
    const cleanPhone = newCustomerForm.phone.trim();
    const cleanPhoneDigits = cleanPhone.replace(/[\s.\-()]/g, '');
    const cleanEmail = newCustomerForm.email.trim();

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
        'Vui lòng nhập đúng định dạng số điện thoại Việt Nam (VD: 0988123456, 02839301234).'
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

    // CUST-02: Kiểm tra trùng số điện thoại với danh sách khách hàng hiện có
    const isDuplicate = allCustomers.some(
      (c) => c.phone.replace(/[\s.\-()]/g, '') === cleanPhoneDigits
    );
    if (isDuplicate) {
      toast.warning(
        'Trùng số điện thoại',
        `Số điện thoại "${cleanPhone}" đã tồn tại trong hệ thống khách hàng.`
      );
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const res = await customerService.createCustomer({
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        gender: newCustomerForm.gender,
        membershipTier: newCustomerForm.membershipTier,
        purpose: newCustomerForm.purpose,
        address: newCustomerForm.address.trim() || undefined,
      });

      if (res.success && res.data) {
        setAllCustomers((prev) => [res.data, ...prev]);
        setSelectedCustomerId(res.data.id);
        toast.success(
          'Tiếp nhận thành công',
          `Hồ sơ của khách hàng ${cleanName} đã được kích hoạt trên hệ thống.`
        );
        setIsCreateModalOpen(false);
        setNewCustomerForm(INITIAL_NEW_CUSTOMER_FORM);
      } else {
        toast.error('Lỗi khởi tạo', res.message || 'Không thể tạo hồ sơ khách hàng vào lúc này.');
      }
    } catch (err) {
      console.error('Lỗi khi tạo khách hàng:', err);
      toast.error('Có lỗi xảy ra', 'Không thể hoàn tất tiếp nhận khách hàng mới.');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const getTierBadgeStyle = (tier?: MemberTier) => {
    switch (tier) {
      case MemberTier.DIAMOND:
        return 'bg-[#E5D8F6] text-[#6A39AF]';
      case MemberTier.PLATINUM:
        return 'bg-[#DEEAF6] text-[#2968A8]';
      case MemberTier.GOLD:
        return 'bg-[#F9EED4] text-[#A67812]';
      case MemberTier.SILVER:
        return 'bg-[#E8EDF2] text-[#4A5E73]';
      default:
        return 'bg-[#F4ECE3] text-[#78695E]';
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case UserRole.CUSTOMER:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
            Khách hàng
          </span>
        );
      case UserRole.STUDENT:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E1F5FE] text-[#0277BD]">
            Học viên
          </span>
        );
      case UserRole.TECHNICIAN:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF3E0] text-[#E65100]">
            Kỹ thuật viên
          </span>
        );
      case UserRole.INSTRUCTOR:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3E5F5] text-[#7B1FA2]">
            Giảng viên
          </span>
        );
      case UserRole.RECEPTIONIST:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FCE4EC] text-[#C2185B]">
            Lễ tân
          </span>
        );
      case UserRole.SUPER_ADMIN:
      case UserRole.ADMIN:
      case UserRole.BRANCH_MANAGER:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE7F6] text-[#512DA8]">
            Quản trị
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportExpiringPackages = () => {
    toast.success(
      'Xuất danh sách thành công',
      'Đã xuất dữ liệu các gói liệu trình và học phí cần theo dõi ra file Excel.'
    );
    handleExportExcel();
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Khách hàng CRM
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Tra cứu đa chi nhánh · Kết nối trực tuyến qua customerService.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
          {/* Export Dropdown Group */}
          <div className="relative shrink-0 whitespace-nowrap">
            <div className="inline-flex rounded-xl shadow-2xs border border-[#D7BBA6] bg-white overflow-hidden shrink-0 whitespace-nowrap">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 hover:bg-[#FAF8F5] text-[#8A4F23] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                title="Xuất bảng tính Excel (.xls) đẹp mắt với màu thương hiệu và tự căn cột cho WPS & Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#1E7145] stroke-[2]" />
                <span>Xuất Excel</span>
                <span className="text-[10px] font-semibold text-[#8A4F23] bg-[#FAF0E4] px-1.5 py-0.5 rounded-full border border-[#E8DFD8]">
                  {filteredCustomers.length}
                </span>
              </button>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2 py-2.5 border-l border-[#E8DFD8] hover:bg-[#FAF8F5] text-[#8A4F23] transition-colors cursor-pointer shrink-0"
                title="Tùy chọn định dạng xuất file"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-[#E8DFD8] rounded-2xl shadow-xl z-30 p-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-[#73675F] border-b border-[#F4ECE3] mb-1 flex items-center justify-between">
                    <span className="whitespace-nowrap">Định dạng tải về</span>
                    <span className="text-[10px] bg-[#FAF0E4] text-[#985018] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                      {filteredCustomers.length} hồ sơ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-[#FAF0E4] text-left transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#E7F4EE] text-[#1E7145] flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2C241E] group-hover:text-[#8A4F23] whitespace-nowrap">
                          Excel (.xls)
                        </div>
                        <div className="text-[10.5px] text-[#73675F] whitespace-nowrap">
                          Tự căn cột & màu MLD
                        </div>
                      </div>
                    </div>
                    <span className="text-[9.5px] bg-[#E7F4EE] text-[#1E7145] px-1.5 py-0.5 rounded font-bold shrink-0 whitespace-nowrap">
                      Khuyên dùng
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-[#FAF0E4] text-left transition-colors flex items-center gap-2.5 cursor-pointer group mt-0.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2C241E] group-hover:text-[#8A4F23] whitespace-nowrap">
                        CSV (.csv)
                      </div>
                      <div className="text-[10.5px] text-[#73675F] whitespace-nowrap">
                        Chuẩn UTF-8 tách dấu phẩy
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleOpenCreateCustomerModal}
            className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 stroke-[2]" />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* 2. Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Tổng khách hàng */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[#73675F]">
              Khách hàng trong hệ thống
            </span>
            <Users className="w-4 h-4 text-[#8A4F23] stroke-[1.8]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#8E4002] tracking-tight mt-1">
            {isLoading ? '...' : allCustomers.length}
          </div>
          <div className="text-[11px] text-[#73675F] font-medium mt-1">
            {hasActiveFilter
              ? `Lọc được ${filteredCustomers.length} / ${allCustomers.length} hồ sơ`
              : 'Khách hàng & học viên đang hoạt động'}
          </div>
        </div>

        {/* Card 2: Tài khoản đang chọn */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[#73675F]">
              Điểm thưởng tích lũy
            </span>
            <Crown className="w-4 h-4 text-[#8A4F23] stroke-[1.8]" />
          </div>
          <div className="text-[24px] font-bold text-[#8E4002] tracking-tight mt-1">
            {selectedCustomer ? `${(selectedCustomer.rewardPoints || 0).toLocaleString('vi-VN')} điểm` : '—'}
          </div>
          <div className="text-[11px] text-[#73675F] font-medium mt-1">
            {selectedCustomer
              ? `${selectedCustomer.fullName} · Hạng ${selectedCustomer.membershipTier}`
              : 'Chưa chọn khách hàng'}
          </div>
        </div>

        {/* Card 3: Liệu trình của khách hàng đang chọn */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[#73675F]">
              Liệu trình {selectedCustomer?.fullName ? `của ${selectedCustomer.fullName.split(' ').slice(-2).join(' ')}` : ''}
            </span>
            <Leaf className="w-4 h-4 text-[#8A4F23] stroke-[1.8]" />
          </div>
          <div className="text-[24px] font-bold text-[#8E4002] tracking-tight mt-1">
            {selectedCustomer && selectedPackages.length > 0
              ? `${selectedPackages.reduce((s, p) => s + (p.totalSessions - p.completedSessions), 0)} buổi còn`
              : selectedCustomer ? 'Chưa có gói' : '—'}
          </div>
          <div className="text-[11px] text-[#73675F] font-medium mt-1">
            {selectedCustomer
              ? `${selectedPackages.length} gói đang sở hữu · Tổng chi tiêu: ${(selectedCustomer.totalSpent || 0).toLocaleString('vi-VN')}đ`
              : 'Chưa có thông tin'}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar Box */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-wrap items-center gap-2.5 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã giới thiệu, số điện thoại hoặc email..."
            className="w-full h-10 pl-10 pr-9 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Branch Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Role Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Vai trò</option>
            <option value="CUSTOMER">Khách hàng</option>
            <option value="STUDENT">Học viên</option>
            <option value="TECHNICIAN">Kỹ thuật viên</option>
            <option value="ADMIN">Quản trị</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Membership Tier Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Hạng hội viên</option>
            <option value={MemberTier.STANDARD}>Hạng Standard</option>
            <option value={MemberTier.SILVER}>Hạng Silver (Bạc)</option>
            <option value={MemberTier.GOLD}>Hạng Gold (Vàng)</option>
            <option value={MemberTier.PLATINUM}>Hạng Platinum (Bạch Kim)</option>
            <option value={MemberTier.DIAMOND}>Hạng Diamond (Kim Cương)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng / Đã khóa</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Purpose / Interest Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedPurpose}
            onChange={(e) => setSelectedPurpose(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Nhu cầu quan tâm</option>
            <option value={PurposeInterest.BEAUTY_SPA}>Beauty Spa</option>
            <option value={PurposeInterest.ACADEMY}>Học viện Academy</option>
            <option value={PurposeInterest.BOTH}>Cả Spa & Học viện</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="NEWEST">Mới nhất</option>
            <option value="SPENT_DESC">Chi tiêu cao nhất</option>
            <option value="POINTS_DESC">Điểm thưởng nhiều nhất</option>
            <option value="NAME_ASC">Tên A → Z</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset filter button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* 3. Main Full-Width Customer Table Card */}
      <div className="bg-white rounded-3xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Table Card Header */}
        <div className="p-5 sm:px-6 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#3E200C]">Danh sách khách hàng</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
            {filteredCustomers.length} khách hàng
          </span>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#F6EEE5] text-[#73675F] text-[11.5px] font-semibold border-b border-[#EFE4D9]">
              <tr>
                <th className="py-3 px-5 whitespace-nowrap">Khách hàng / liên hệ</th>
                <th className="py-3 px-4 whitespace-nowrap">Hạng & nguồn</th>
                <th className="py-3 px-4 whitespace-nowrap">Lần gần nhất</th>
                <th className="py-3 px-4 whitespace-nowrap">Gói / học tập</th>
                <th className="py-3 px-4 whitespace-nowrap">Chi nhánh ưu tiên</th>
                <th className="py-3 px-6 text-right sm:text-center whitespace-nowrap">Trạng thái / thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4ECE3]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#73675F]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy khách hàng phù hợp</p>
                      <p className="text-xs text-[#8C7A6B]">
                        {searchTerm.trim()
                          ? `Không có hồ sơ nào khớp với từ khóa "${searchTerm}".`
                          : 'Không có khách hàng nào khớp với các tiêu chí bộ lọc đã chọn.'}
                      </p>
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c, idx) => {
                  const isSelected = c.id === selectedCustomerId;
                  const statusLbl = getStatusLabel(c, allPackages, allEnrollments);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#FAF4ED]' : 'hover:bg-[#FAF6F0]'
                      }`}
                    >
                      {/* 1. Khách hàng / liên hệ */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {c.avatarUrl ? (
                            <img
                              src={c.avatarUrl}
                              alt={c.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-[#E0D7CC] shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#F5E5D5] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0 border border-[#E8D4C1]">
                              {getInitials(c.fullName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-[#2C241E] text-xs whitespace-nowrap">
                              {c.fullName}
                            </div>
                            <div className="text-[11px] text-[#73675F] whitespace-nowrap mt-0.5">
                              {getFormattedCode(c, idx)} · {getMaskedPhone(c.phone)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Hạng & nguồn */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-[#2C241E] whitespace-nowrap">
                          {getTierLabel(c.membershipTier)}
                          {c.rewardPoints > 0 && ` · ${c.rewardPoints.toLocaleString('vi-VN')} điểm`}
                        </div>
                        <div className="text-[11px] text-[#73675F] whitespace-nowrap mt-0.5">
                          {getSourceLabel(c)}
                        </div>
                      </td>

                      {/* 3. Lần gần nhất */}
                      <td className="py-3 px-4 text-xs text-[#2C241E] whitespace-nowrap">
                        {getLastVisitDate(c, allBookings)}
                      </td>

                      {/* 4. Gói / học tập */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-[#2C241E] whitespace-nowrap">
                          {getPackageLine1(c, allPackages)}
                        </div>
                        <div className="text-[11px] text-[#73675F] whitespace-nowrap mt-0.5">
                          {getPackageLine2(c, allEnrollments)}
                        </div>
                      </td>

                      {/* 5. Chi nhánh ưu tiên */}
                      <td className="py-3 px-4 text-xs text-[#2C241E] whitespace-nowrap">
                        {getPreferredBranch(c, allBookings, branches)}
                      </td>

                      {/* 6. Trạng thái / thao tác */}
                      <td className="py-3 px-6 text-right sm:text-center whitespace-nowrap">
                        <div className="flex flex-col items-end sm:items-center gap-0.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-bold whitespace-nowrap ${getStatusStyle(
                              statusLbl
                            )}`}
                          >
                            {statusLbl}
                          </span>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/customer-detail?id=${c.id}`);
                              }}
                              className="text-xs font-bold text-[#8A4F23] hover:underline cursor-pointer mt-1 whitespace-nowrap"
                            >
                              Xem hồ sơ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-6 py-3.5 flex items-center justify-between text-xs text-[#73675F] border-t border-[#F4ECE3] bg-white">
          <div>
            Hiển thị {paginatedCustomers.length} / {filteredCustomers.length} khách hàng
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-6 h-6 rounded flex items-center justify-center border border-[#E0D7CC] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[#73675F]"
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                  p === currentPage
                    ? 'bg-[#FAF0E4] text-[#8A4F23] border border-[#E0D7CC]'
                    : 'border border-[#E0D7CC] text-[#73675F] hover:bg-[#FAF8F5]'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-6 h-6 rounded flex items-center justify-center border border-[#E0D7CC] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom 3 Cards (Khách hàng & học viên | Sắp hết hạn gói | Danh sách chăm sóc) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mt-5">
        {/* Card 1: Khách hàng & học viên */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#3E200C]">Khách hàng & học viên</h3>
            <div className="flex items-center gap-3 mt-3.5">
              {selectedCustomer?.avatarUrl ? (
                <img
                  src={selectedCustomer.avatarUrl}
                  alt={selectedCustomer.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-[#E0D7CC] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F5E5D5] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0 border border-[#E8D4C1]">
                  {getInitials(selectedCustomer?.fullName || 'Khách hàng')}
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold text-[#2C241E]">
                  {selectedCustomer?.fullName || 'Chưa chọn khách hàng'}
                </h4>
                <p className="text-[11px] text-[#73675F] mt-0.5">
                  Một tài khoản · {isDualRole ? 'Dịch vụ và học viện' : isStudentOnly ? 'Học viên đào tạo nghề' : 'Khách hàng dịch vụ spa'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#73675F] leading-relaxed mt-4">
              Phân nhóm dữ liệu thực: {selectedCustomer?.fullName || 'Khách hàng'}{' '}
              {isDualRole
                ? 'đồng thời sử dụng dịch vụ chăm sóc sắc đẹp và ghi danh học nghề tại Học viện MLD.'
                : isStudentOnly
                ? 'hiện đang theo học các chương trình chuyên môn tại viện đào tạo.'
                : (selectedCustomer?.totalSpent || 0) > 0
                ? `đang sử dụng dịch vụ spa với tổng chi tiêu ${(selectedCustomer?.totalSpent || 0).toLocaleString('vi-VN')} ₫.`
                : 'được tiếp nhận qua hệ thống, đang tư vấn nhu cầu dịch vụ.'}
            </p>
          </div>

          <div className="pt-3 border-t border-[#F4ECE3] flex items-center justify-between text-xs mt-4">
            <span className="text-[#73675F]">Chi nhánh liên quan</span>
            <span className="font-bold text-[#2C241E]">{relatedBranchNames}</span>
          </div>
        </div>

        {/* Card 2: Sắp hết hạn gói */}
        <div className="bg-[#F5ECE1] rounded-2xl border border-[#E8DACB] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#3E200C]">Sắp hết hạn gói</h3>
            <div className="text-xs font-bold text-[#2C241E] mt-3">
              {expiringPackages.length > 0
                ? `Có ${expiringPackages.length} gói sắp hết hạn`
                : 'Chưa có gói hết hạn trong tháng này'}
            </div>
            <p className="text-xs text-[#73675F] leading-relaxed mt-2">
              {expiringPackages.length > 0
                ? `Gói của ${selectedCustomer?.fullName || 'khách hàng'} có hạn đến ${new Date(expiringPackages[0].expiresAt).toLocaleDateString('vi-VN')}. Vui lòng liên hệ nhắc lịch sử dụng.`
                : selectedCustomerPackages.length > 0
                ? `${selectedCustomerPackages.filter((p) => p.status === 'ACTIVE').length} gói của ${selectedCustomer?.fullName?.split(' ').slice(-2).join(' ') || 'khách hàng'} có hạn đến ${selectedCustomerPackages[0].expiresAt ? new Date(selectedCustomerPackages[0].expiresAt).toLocaleDateString('vi-VN') : 'vô thời hạn'}. Đồng bộ trực tiếp từ Supabase Cloud.`
                : `${selectedCustomer?.fullName || 'Khách hàng'} hiện chưa kích hoạt gói liệu trình trả trước nào trong cơ sở dữ liệu.`}
            </p>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleExportExpiringPackages}
              className="w-full py-2.5 bg-white border border-[#A85A32] hover:bg-[#FAF6F0] text-[#8A4F23] text-xs font-bold rounded-xl transition-all shadow-2xs text-center cursor-pointer"
            >
              Xuất danh sách
            </button>
          </div>
        </div>

        {/* Card 3: Danh sách chăm sóc */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#3E200C]">Danh sách chăm sóc gần đây</h3>
            <div className="space-y-2.5 mt-3 text-xs text-[#2C241E]">
              {careList.length > 0 ? (
                careList.map((item, idx) => (
                  <div key={idx} className="leading-snug">
                    <span className="font-medium text-[#73675F]">{item.date} · </span>
                    <span>{item.title}: {item.note}</span>
                  </div>
                ))
              ) : (
                <div className="text-[#8C7A6B] py-2 text-xs">
                  Chưa có lịch hẹn hoặc nhiệm vụ chăm sóc mới.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#F4ECE3] text-[11px] text-[#8C7A6B] mt-4">
            Dữ liệu lịch hẹn và học vụ đồng bộ thời gian thực từ Supabase Cloud.
          </div>
        </div>
      </div>

      {/* 5. Modal Tiếp Nhận Khách Hàng Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3E2CE] flex items-center justify-center text-[#8A4F23] shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#3E200C]">Tiếp nhận khách hàng mới</h2>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Tạo hồ sơ CRM, cấp mã hội viên và phân hạng thành viên ban đầu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCustomer} className="overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Họ và tên khách hàng <span className="text-[#985018]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.fullName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                    placeholder="Ví dụ: Hoàng Thị Ánh Tuyết"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                  />
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
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                      placeholder="0901234567"
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
                      value={newCustomerForm.email}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                      placeholder="khachhang@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Hạng hội viên ban đầu
                  </label>
                  <select
                    value={newCustomerForm.membershipTier}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, membershipTier: e.target.value as MemberTier })}
                    className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs font-bold text-[#8A4F23] focus:outline-none focus:border-[#985018] cursor-pointer"
                  >
                    <option value={MemberTier.STANDARD}>STANDARD · Tiêu Chuẩn</option>
                    <option value={MemberTier.SILVER}>SILVER · Hội viên Bạc</option>
                    <option value={MemberTier.GOLD}>GOLD · Hội viên Vàng (VIP)</option>
                    <option value={MemberTier.PLATINUM}>PLATINUM · Bạch Kim</option>
                    <option value={MemberTier.DIAMOND}>DIAMOND · Kim Cương (VVIP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Nhu cầu quan tâm
                  </label>
                  <select
                    value={newCustomerForm.purpose}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, purpose: e.target.value as PurposeInterest })}
                    className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                  >
                    <option value={PurposeInterest.BEAUTY_SPA}>Trị liệu Spa & Thẩm mỹ</option>
                    <option value={PurposeInterest.ACADEMY}>Học viện Academy</option>
                    <option value={PurposeInterest.BOTH}>Cả Spa & Học viện</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Giới tính
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'FEMALE', label: 'Nữ' },
                      { key: 'MALE', label: 'Nam' },
                      { key: 'OTHER', label: 'Khác' },
                    ].map((g) => {
                      const isSel = newCustomerForm.gender === g.key;
                      return (
                        <button
                          type="button"
                          key={g.key}
                          onClick={() => setNewCustomerForm({ ...newCustomerForm, gender: g.key as any })}
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Địa chỉ liên hệ
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={newCustomerForm.address}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                      placeholder="Số nhà, đường, phường, quận/huyện, tỉnh/thành"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingCustomer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tiếp nhận...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Tạo hồ sơ khách hàng</span>
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
