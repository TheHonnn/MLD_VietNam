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
import { customerService, treatmentService, branchService } from '../services';
import { toast } from '../components/common';
import { User, MemberTier, UserPackage, PurposeInterest, UserRole, Branch } from '../types/shared_types';
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

export const W03_Customers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPackages, setSelectedPackages] = useState<UserPackage[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [selectedSort, setSelectedSort] = useState<string>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // CUST-01: Create Customer Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(INITIAL_NEW_CUSTOMER_FORM);

  // Fetch all customers & branches on load
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const [res, branchRes] = await Promise.all([
        customerService.getCustomers(),
        branchService.getAllBranches(),
      ]);
      if (res.success && res.data) {
        setAllCustomers(res.data);
        if (res.data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(res.data[0].id);
        }
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
      }
    } catch (err) {
      console.error('Failed to load customers or branches:', err);
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
        <div className="flex items-center gap-2.5">
          {/* Export Dropdown Group */}
          <div className="relative">
            <div className="inline-flex rounded-xl shadow-2xs border border-[#D7BBA6] bg-white overflow-hidden">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 hover:bg-[#FAF8F5] text-[#8A4F23] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
                className="px-2 py-2.5 border-l border-[#E8DFD8] hover:bg-[#FAF8F5] text-[#8A4F23] transition-colors cursor-pointer"
                title="Tùy chọn định dạng xuất file"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#E8DFD8] rounded-xl shadow-lg z-30 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    handleExportExcel();
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#FAF0E4] text-left transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-md bg-[#E7F4EE] text-[#1E7145] flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#2C241E] group-hover:text-[#8A4F23]">
                    Bảng tính Excel (.xls)
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleExportCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#FAF0E4] text-left transition-colors flex items-center gap-2.5 cursor-pointer group mt-0.5"
                >
                  <div className="w-6 h-6 rounded-md bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#2C241E] group-hover:text-[#8A4F23]">
                    Tệp dữ liệu CSV (.csv)
                  </span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleOpenCreateCustomerModal}
            className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
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

      {/* 4. Main 2-Column Content: Customer Table (Left 8/12) vs Customer Profile Detail (Right 4/12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols on desktop) */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2C241E]">Danh sách khách hàng</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3E2CE] text-[#8A4F23]">
              {filteredCustomers.length} hồ sơ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3E2CE] text-[#73675F] text-[11.5px] font-medium">
                <tr>
                  <th className="py-3 px-5 font-medium">Khách hàng</th>
                  <th className="py-3 px-4 font-medium">Số điện thoại</th>
                  <th className="py-3 px-4 font-medium">Hạng & Điểm</th>
                  <th className="py-3 px-4 font-medium">Tổng chi tiêu</th>
                  <th className="py-3 px-6 font-medium text-right sm:text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D9]">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#73675F]">
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
                            className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer"
                          >
                            Xóa bộ lọc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => {
                    const isSelected = c.id === selectedCustomerId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`cursor-pointer ${
                          isSelected ? 'bg-[#F8F1E8]' : 'bg-white'
                        } hover:bg-[#FAF6F0] transition-colors`}
                      >
                      {/* Name & Avatar */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                            alt={c.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-[#E0D7CC]"
                          />
                          <div>
                            <div className="font-bold text-[#2C241E] flex items-center gap-1.5 flex-wrap">
                              <span>{c.fullName}</span>
                              {getRoleBadge(c.role)}
                            </div>
                            <div className="text-[11px] text-[#8C7A6B]">
                              Mã: {c.referralCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-[#4A3E34] whitespace-nowrap">
                        {c.phone}
                      </td>

                      {/* Tier & Points */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${getTierBadgeStyle(
                            c.membershipTier
                          )}`}
                        >
                          {c.membershipTier} • {(c.rewardPoints || 0).toLocaleString('vi-VN')} điểm
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-4 font-bold text-[#8E4002] whitespace-nowrap">
                        {(c.totalSpent || 0).toLocaleString('vi-VN')}đ
                      </td>

                      {/* Action */}
                      <td className="py-3 px-6 text-right sm:text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer-detail?id=${c.id}`);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-[#8A4F23] hover:bg-[#F3E2CE] transition-colors"
                        >
                          Xem hồ sơ
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B]">
            <span className="text-[11px]">
              Hiển thị {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} trong{' '}
              {filteredCustomers.length} khách hàng
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  currentPage <= 1
                    ? 'bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed'
                    : 'bg-white border border-[#E0D7CC] text-[#783D19] hover:bg-[#FAF0E4] cursor-pointer'
                }`}
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - currentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return (
                      <span key={pageNum} className="px-1 text-[#A69788]">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#985018] text-white shadow-2xs'
                        : 'bg-white border border-[#E0D7CC] text-[#73675F] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  currentPage >= totalPages
                    ? 'bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed'
                    : 'bg-white border border-[#E0D7CC] text-[#783D19] hover:bg-[#FAF0E4] cursor-pointer'
                }`}
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 of 12 cols on desktop) */}
        {selectedCustomer ? (
          <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
            <div className="text-center pb-4 border-b border-[#EFE4D9]">
              <img
                src={selectedCustomer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt={selectedCustomer.fullName}
                className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[#985018] shadow-sm"
              />
              <h3 className="text-base font-extrabold text-[#2C241E] mt-3">
                {selectedCustomer.fullName}
              </h3>
              <p className="text-xs text-[#73675F] mt-0.5">{selectedCustomer.phone}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                {getRoleBadge(selectedCustomer.role)}
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold ${getTierBadgeStyle(
                    selectedCustomer.membershipTier
                  )}`}
                >
                  Hạng {selectedCustomer.membershipTier} · {(selectedCustomer.rewardPoints || 0).toLocaleString('vi-VN')} điểm
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Vai trò tài khoản:</span>
                <span className="font-semibold text-[#2C241E]">
                  {getRoleBadge(selectedCustomer.role) || selectedCustomer.role}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Địa chỉ:</span>
                <span className="font-semibold text-[#2C241E] text-right max-w-[200px]">
                  {selectedCustomer.address || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Liên hệ khẩn cấp:</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedCustomer.emergencyContactName || 'Chưa có'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Tổng chi tiêu:</span>
                <span className="font-bold text-[#8E4002]">
                  {(selectedCustomer.totalSpent || 0).toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Mục đích quan tâm:</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedCustomer.purpose}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/customer-detail?id=${selectedCustomer.id}`)}
              className="w-full py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              Xem bệnh án & hồ sơ chi tiết
            </button>
          </div>
        ) : (
          <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#3E200C]">Chưa chọn khách hàng</h4>
            <p className="text-xs text-[#8C7A6B] max-w-xs leading-relaxed">
              Vui lòng chọn một khách hàng từ danh sách bên trái hoặc điều chỉnh bộ lọc để xem thông tin chi tiết.
            </p>
          </div>
        )}
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
