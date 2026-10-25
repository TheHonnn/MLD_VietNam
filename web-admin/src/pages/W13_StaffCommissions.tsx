import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Wallet,
  Building2,
  Calendar,
  UserCheck,
  Search,
  Filter,
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { commissionService, branchService, staffService } from '../services';
import { StaffCommission, Branch, User } from '../types/shared_types';
import { toast } from '../components/common';

export const W13_StaffCommissions: React.FC = () => {
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [commRes, branchRes, staffRes] = await Promise.all([
        commissionService.getCommissions({
          cycleMonth: selectedMonth !== 'all' ? selectedMonth : undefined,
          branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
          staffId: selectedStaff !== 'all' ? selectedStaff : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
        }),
        branchService.getAllBranches(),
        staffService.getStaffList(),
      ]);

      if (commRes.success && commRes.data) {
        setCommissions(commRes.data);
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
      }
      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data.filter((s) => s.role === 'TECHNICIAN' || s.role === 'INSTRUCTOR'));
      }
    } catch (err) {
      console.error('Error loading commissions data:', err);
      toast.error('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ CSDL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, selectedMonth, selectedStaff, selectedStatus]);

  // Client-side search filtering
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (!searchTerm) return true;
      const kw = searchTerm.toLowerCase();
      return (
        c.staffName?.toLowerCase().includes(kw) ||
        c.branchName?.toLowerCase().includes(kw) ||
        c.notes?.toLowerCase().includes(kw) ||
        c.id.toLowerCase().includes(kw)
      );
    });
  }, [commissions, searchTerm]);

  // KPI Calculations
  const kpi = useMemo(() => {
    let total = 0;
    let pending = 0;
    let approved = 0;
    let paid = 0;

    for (const c of filteredCommissions) {
      total += c.commissionAmount;
      if (c.status === 'PENDING_APPROVAL' || c.status === 'PENDING') {
        pending += c.commissionAmount;
      } else if (c.status === 'APPROVED') {
        approved += c.commissionAmount;
      } else if (c.status === 'PAID') {
        paid += c.commissionAmount;
      }
    }

    return { total, pending, approved, paid, count: filteredCommissions.length };
  }, [filteredCommissions]);

  const handleApprove = async (id: string, staffName?: string) => {
    setIsProcessing(true);
    try {
      const res = await commissionService.approveCommission(id);
      if (res.success) {
        toast.success('Duyệt thành công', `Đã duyệt khoản hoa hồng cho ${staffName || 'KTV'}.`);
        loadData();
      } else {
        toast.error('Thất bại', res.message);
      }
    } catch {
      toast.error('Lỗi', 'Không thể duyệt khoản hoa hồng.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async (id: string, staffName?: string) => {
    setIsProcessing(true);
    try {
      const res = await commissionService.markPaid(id);
      if (res.success) {
        toast.success('Thanh toán hoàn tất', `Đã chuyển trạng thái Đã chi trả cho ${staffName || 'KTV'}.`);
        loadData();
      } else {
        toast.error('Thất bại', res.message);
      }
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật trạng thái thanh toán.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = filteredCommissions
      .filter((c) => c.status === 'PENDING_APPROVAL' || c.status === 'PENDING')
      .map((c) => c.id);

    if (pendingIds.length === 0) {
      toast.info('Thông báo', 'Không có khoản hoa hồng nào đang chờ duyệt.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await commissionService.bulkApproveCommissions(pendingIds);
      if (res.success) {
        toast.success('Duyệt hàng loạt thành công', `Đã phê duyệt ${res.data} khoản hoa hồng.`);
        loadData();
      }
    } catch {
      toast.error('Lỗi', 'Lỗi duyệt hoa hồng hàng loạt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getCommissionTypeLabel = (type: string) => {
    switch (type) {
      case 'SERVICE_DIRECT':
        return { label: 'Ca trị liệu trực tiếp', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'PACKAGE_UPSELL':
        return { label: 'Tư vấn bán gói Combo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CSAT_BONUS':
        return { label: 'Thưởng CSAT 5 Sao', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: type, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return { label: 'Đã thanh toán', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'APPROVED':
        return { label: 'Đã phê duyệt', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'PENDING_APPROVAL':
      case 'PENDING':
      default:
        return { label: 'Chờ duyệt', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8EFF5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Phân hệ Quản trị Vận hành Enterprise</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            Bảng Kê Hoa Hồng Kỹ Thuật Viên & Nhân Sự
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Tự động trích xuất hoa hồng theo ca trị liệu, tư vấn bán gói và thưởng chất lượng dịch vụ CSAT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading || isProcessing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleBulkApprove}
            disabled={isProcessing || kpi.pending === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Duyệt tất cả chờ ({formatVND(kpi.pending)})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Tổng hoa hồng phát sinh</p>
            <p className="text-xl font-bold text-[#0F172A] mt-1">{formatVND(kpi.total)}</p>
            <p className="text-[11px] text-sky-600 mt-0.5">{kpi.count} lượt ghi nhận</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Chờ phê duyệt</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatVND(kpi.pending)}</p>
            <p className="text-[11px] text-amber-500 mt-0.5">Cần đối soát</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Đã phê duyệt (Chờ chi)</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatVND(kpi.approved)}</p>
            <p className="text-[11px] text-blue-500 mt-0.5">Sẵn sàng chi trả</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Đã chi trả hoàn tất</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatVND(kpi.paid)}</p>
            <p className="text-[11px] text-emerald-500 mt-0.5">Đã vào phiếu lương</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên KTV, chi nhánh, ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
          />
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả tháng</option>
            <option value="2026-10">Tháng 10/2026</option>
            <option value="2026-09">Tháng 09/2026</option>
            <option value="2026-08">Tháng 08/2026</option>
          </select>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Selector */}
        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-[#64748B]" />
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả kỹ thuật viên</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selector */}
        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-[#64748B]" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="APPROVED">Đã phê duyệt</option>
            <option value="PAID">Đã thanh toán</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Kỹ thuật viên & Cơ sở</th>
                <th className="py-3 px-4">Loại hoa hồng</th>
                <th className="py-3 px-4 text-right">Doanh số gốc</th>
                <th className="py-3 px-4 text-center">Tỷ lệ</th>
                <th className="py-3 px-4 text-right">Tiền hoa hồng</th>
                <th className="py-3 px-4">Chu kỳ</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs text-[#334155]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải bảng kê hoa hồng...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-[#CBD5E1]" />
                      <p className="font-medium text-sm">Không tìm thấy bản ghi hoa hồng nào</p>
                      <p className="text-[11px]">Thử điều chỉnh bộ lọc ngày hoặc chi nhánh bên trên.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((row) => {
                  const typeBadge = getCommissionTypeLabel(row.commissionType);
                  const statusBadge = getStatusBadge(row.status);

                  return (
                    <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F172A]">{row.staffName}</div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-[#94A3B8]" />
                          <span>{row.branchName}</span>
                        </div>
                        {row.notes && (
                          <div className="text-[10.5px] text-[#64748B] italic mt-0.5 line-clamp-1">
                            {row.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${typeBadge.bg}`}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#0F172A]">
                        {formatVND(row.baseAmount)}
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-sky-700">
                        {row.percentage}%
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                        +{formatVND(row.commissionAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-[#64748B] font-mono">{row.cycleMonth}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusBadge.bg}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {(row.status === 'PENDING_APPROVAL' || row.status === 'PENDING') && (
                            <button
                              onClick={() => handleApprove(row.id, row.staffName)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="Phê duyệt hoa hồng này"
                            >
                              Duyệt
                            </button>
                          )}

                          {row.status === 'APPROVED' && (
                            <button
                              onClick={() => handleMarkPaid(row.id, row.staffName)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="Xác nhận đã chi trả tiền cho KTV"
                            >
                              Chi trả
                            </button>
                          )}

                          {row.status === 'PAID' && (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Hoàn tất</span>
                            </span>
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
      </div>
    </div>
  );
};
