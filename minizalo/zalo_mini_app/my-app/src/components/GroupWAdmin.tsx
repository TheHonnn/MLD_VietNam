import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { database } from '../../../../backend/src/data/database';
import {
  LeafIcon,
  SearchIcon,
  SmartPhoneIcon,
  DashboardIcon,
  BuildingIcon,
  UsersIcon,
  NavCalendarIcon,
  CashierIcon,
  NavAcademyIcon,
  TrendingUpIcon,
  MassageIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  CloseIcon,
} from '@/components/Icons';

interface GroupWAdminProps {
  onBackToMiniApp: () => void;
}

export const GroupWAdmin: React.FC<GroupWAdminProps> = ({ onBackToMiniApp }) => {
  const [activeMenu, setActiveMenu] = useState<
    'overview' | 'branches' | 'customers' | 'technicians' | 'cashier' | 'academy' | 'revenue'
  >('overview');

  const [selectedBranch, setSelectedBranch] = useState('all');
  const [adminData, setAdminData] = useState(database.admin);
  const [branches, setBranches] = useState(database.branches);
  const [services, setServices] = useState(database.services);
  const [doctors, setDoctors] = useState(database.doctors);

  // New POS Receipt form state
  const [newCustomerName, setNewCustomerName] = useState('Nguyễn Minh Anh');
  const [newServiceTitle, setNewServiceTitle] = useState('Massage thư giãn toàn thân');
  const [newTechName, setNewTechName] = useState('Trần Minh Phương');
  const [newAmount, setNewAmount] = useState(450000);
  const [newDiscount, setNewDiscount] = useState(200000);
  const [newPaymentMethod, setNewPaymentMethod] = useState('Chuyển khoản QR ngân hàng');
  const [posSuccessMsg, setPosSuccessMsg] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [adminModal, setAdminModal] = useState<{ type: string; title: string; data?: any } | null>(null);
  const [customers, setCustomers] = useState([
    { id: 'cus_01', name: 'Nguyễn Minh Anh', phone: '0912 345 678', tier: 'Gold VIP', points: 2450, treatments: '11 buổi (Massage + Dẫn lưu)' },
    { id: 'cus_02', name: 'Trần Ngọc Linh', phone: '0987 654 321', tier: 'Silver', points: 1250, treatments: '5 buổi (Chăm sóc da)' },
  ]);

  const matchesSearch = (value: string) => !globalSearch.trim() || value.toLocaleLowerCase('vi').includes(globalSearch.trim().toLocaleLowerCase('vi'));
  const visibleBranches = branches.filter((item) => (selectedBranch === 'all' || item.id === selectedBranch) && matchesSearch(`${item.name} ${item.address} ${item.phone}`));
  const visibleCustomers = customers.filter((item) => matchesSearch(`${item.name} ${item.phone} ${item.tier}`));
  const visibleSchedules = adminData.staffSchedules.filter((item) => matchesSearch(`${item.techName} ${item.role} ${item.branch}`));
  const visibleStudents = adminData.students.filter((item) => matchesSearch(`${item.name} ${item.phone} ${item.courseTitle}`));

  const downloadRevenueCsv = () => {
    const rows = [['Ngày', 'Doanh thu'], ...adminData.weeklyRevenue.map((item) => [item.day, String(item.amount)])];
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mld-doanh-thu-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submitAdminModal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (adminModal?.type === 'branch') setBranches((current) => [...current, { id: `br_${Date.now()}`, name: String(values.name), address: String(values.address), phone: String(values.phone), isActive: true, createdAt: new Date().toISOString() } as any]);
    if (adminModal?.type === 'customer') setCustomers((current) => [...current, { id: `cus_${Date.now()}`, name: String(values.name), phone: String(values.phone), tier: 'Standard', points: 0, treatments: 'Chưa sử dụng dịch vụ' }]);
    if (adminModal?.type === 'schedule') setAdminData((current) => ({ ...current, staffSchedules: [...current.staffSchedules, { techName: String(values.name), role: String(values.role), branch: String(values.branch), status: 'Đã xếp ca', morningSlot: String(values.morning), afternoonSlot: String(values.afternoon), eveningSlot: String(values.evening) }] }));
    if (adminModal?.type === 'student') setAdminData((current) => ({ ...current, students: [...current.students, { id: `stu_${Date.now()}`, name: String(values.name), phone: String(values.phone), courseTitle: String(values.course), progress: 0, completedLessons: '0 bài học', feeStatus: 'Chờ xác nhận', examScore: 'Chưa thi', certificateStatus: 'Chưa cấp' }] }));
    setAdminModal(null);
  };

  useEffect(() => {
    async function loadAdmin() {
      const overview = await apiClient.getAdminOverview();
      const sched = await apiClient.getAdminSchedule();
      const rcpts = await apiClient.getAdminReceipts();
      const stds = await apiClient.getAdminStudents();

      if (overview?.kpis) {
        setAdminData((prev) => ({
          ...prev,
          kpis: overview.kpis,
          weeklyRevenue: overview.weeklyRevenue || prev.weeklyRevenue,
        }));
      }
      if (sched?.schedules) {
        setAdminData((prev) => ({ ...prev, staffSchedules: sched.schedules }));
      }
      if (rcpts?.receipts) {
        setAdminData((prev) => ({ ...prev, posReceipts: rcpts.receipts }));
      }
      if (stds?.students) {
        setAdminData((prev) => ({ ...prev, students: stds.students }));
      }
    }
    loadAdmin();
  }, []);

  const handleCreateReceipt = async () => {
    const res = await apiClient.createAdminReceipt({
      customerName: newCustomerName,
      serviceTitle: newServiceTitle,
      techName: newTechName,
      amount: newAmount,
      discount: newDiscount,
      paymentMethod: newPaymentMethod,
    });

    if (res?.receipt) {
      setAdminData((prev) => ({
        ...prev,
        posReceipts: [res.receipt, ...prev.posReceipts],
        kpis: {
          ...prev.kpis,
          todayRevenue: prev.kpis.todayRevenue + res.receipt.finalAmount,
        },
      }));
      setPosSuccessMsg(`Đã tạo thành công hóa đơn ${res.receipt.receiptCode}!`);
      setTimeout(() => setPosSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-800 font-sans text-xs select-none">
      {/* 1. TOP WEB ADMIN HEADER */}
      <header className="bg-white border-b border-stone-200 px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#98501B] text-white flex items-center justify-center shadow">
              <LeafIcon size={18} color="#FFFFFF" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#98501B] tracking-wide">MLD Vietnam</span>
              <span className="text-[10px] text-stone-500 block -mt-0.5 font-semibold">
                QUẢN TRỊ VIÊN HỆ THỐNG
              </span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-stone-300"></div>

          {/* Branch Selector */}
          <div className="flex items-center space-x-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg">
            <BuildingIcon size={14} color="#8C7E74" />
            <span className="text-stone-500 text-[11px]">Chi nhánh:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-bold text-stone-700 outline-none text-xs cursor-pointer"
            >
              <option value="all">Tất cả chi nhánh (Quận 3 + Cầu Giấy)</option>
              <option value="br_01">Chi nhánh 01 — Quận 3 (TP.HCM)</option>
              <option value="br_02">Chi nhánh 02 — Cầu Giấy (Hà Nội)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Tìm khách hàng, SĐT, mã HĐ..."
              className="w-56 pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-[#98501B] focus:bg-white"
            />
            <span className="absolute left-2.5 top-2 text-stone-400">
              <SearchIcon size={13} color="#8C7E74" />
            </span>
          </div>

          {/* Switch back to Mini App */}
          <button
            onClick={onBackToMiniApp}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#98501B] hover:bg-[#884218] text-white font-bold rounded-lg shadow-sm transition"
          >
            <SmartPhoneIcon size={14} color="#FFFFFF" />
            <span>Giao Diện Mini App</span>
          </button>

          {/* Admin Avatar */}
          <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
            <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center font-bold text-[#98501B]">
              QT
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-bold text-[11px] text-stone-800">Quản Trị Viên</div>
              <div className="text-[9px] text-emerald-600 font-semibold">Trực tuyến</div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-56 bg-white border-r border-stone-200 p-4 space-y-1 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
              VẬN HÀNH DỊCH VỤ
            </div>

            <button
              onClick={() => setActiveMenu('overview')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'overview'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <DashboardIcon size={16} color={activeMenu === 'overview' ? '#98501B' : '#8C7E74'} />
              <span>Tổng quan vận hành</span>
            </button>

            <button
              onClick={() => setActiveMenu('branches')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'branches'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <BuildingIcon size={16} color={activeMenu === 'branches' ? '#98501B' : '#8C7E74'} />
              <span>Quản lý chi nhánh</span>
            </button>

            <button
              onClick={() => setActiveMenu('customers')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'customers'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <UsersIcon size={16} color={activeMenu === 'customers' ? '#98501B' : '#8C7E74'} />
              <span>Khách hàng (CRM)</span>
            </button>

            <button
              onClick={() => setActiveMenu('technicians')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'technicians'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <NavCalendarIcon size={16} color={activeMenu === 'technicians' ? '#98501B' : '#8C7E74'} />
              <span>Lịch kỹ thuật viên</span>
            </button>

            <button
              onClick={() => setActiveMenu('cashier')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'cashier'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <CashierIcon size={16} color={activeMenu === 'cashier' ? '#98501B' : '#8C7E74'} />
              <span>Thu ngân & Hóa đơn</span>
            </button>

            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 pt-4 pb-1">
              ĐÀO TẠO & HỌC VIỆN
            </div>

            <button
              onClick={() => setActiveMenu('academy')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'academy'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <NavAcademyIcon size={16} color={activeMenu === 'academy' ? '#98501B' : '#8C7E74'} />
              <span>Học viên & Tuyển sinh</span>
            </button>

            <button
              onClick={() => setActiveMenu('revenue')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left ${
                activeMenu === 'revenue'
                  ? 'bg-amber-50 text-[#98501B] border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <TrendingUpIcon size={16} color={activeMenu === 'revenue' ? '#98501B' : '#8C7E74'} />
              <span>Báo cáo doanh thu</span>
            </button>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-[10px] space-y-1">
            <div className="font-bold text-stone-700">MLD Cloud v2.0</div>
            <div>Server: Node.js / Express</div>
            <div className="text-emerald-600 font-semibold">API Port 5000 Connected</div>
          </div>
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* VIEW 1: TỔNG QUAN VẬN HÀNH */}
          {activeMenu === 'overview' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold text-stone-900">Tổng quan vận hành</h1>
                  <p className="text-stone-500 text-xs">
                    Số liệu thực tế cập nhật theo thời gian thực từ hệ thống cơ sở.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveMenu('cashier')}
                    className="px-3 py-2 bg-[#98501B] text-white font-bold rounded-lg shadow-sm hover:bg-[#884218] transition"
                  >
                    + Thu ngân dịch vụ
                  </button>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-stone-500 font-medium">Thực thu trong ngày</span>
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <CashierIcon size={16} color="#059669" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold text-emerald-600">
                      {adminData.kpis.todayRevenue.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      Tiền mặt: {adminData.kpis.cashOnHand.toLocaleString('vi-VN')} ₫ | Chuyển khoản:{' '}
                      {adminData.kpis.bankTransfer.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-stone-500 font-medium">Khách đặt hẹn hôm nay</span>
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <NavCalendarIcon size={16} color="#2563EB" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold text-stone-900">{adminData.kpis.newBookingsToday} khách</div>
                    <div className="text-[10px] text-blue-600 mt-0.5 font-semibold">
                      {adminData.kpis.upcomingAppointments} lịch hẹn sắp tới
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-stone-500 font-medium">Ca đang phục vụ</span>
                    <span className="p-1.5 rounded-lg bg-amber-50 text-[#98501B]">
                      <MassageIcon size={16} color="#98501B" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold text-[#98501B]">{adminData.kpis.servingNow} ca</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 font-semibold">
                      {adminData.kpis.completedToday} ca hoàn tất hôm nay
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-stone-500 font-medium">Lấp đầy phòng</span>
                    <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                      <BuildingIcon size={16} color="#7C3AED" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold text-purple-600">{adminData.kpis.roomOccupancyRate}%</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">5/6 phòng đang vận hành</div>
                  </div>
                </div>
              </div>

              {/* Chart & Revenue Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Bar Chart */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-stone-800">Thực thu theo ngày (7 ngày gần nhất)</h3>
                    <span className="text-[11px] text-stone-500">Đơn vị: VNĐ</span>
                  </div>

                  <div className="h-44 flex items-end justify-between space-x-3 pt-6 border-b border-stone-100">
                    {adminData.weeklyRevenue.map((item, idx) => {
                      const maxVal = 10000000;
                      const heightPercent = Math.min(100, Math.round((item.amount / maxVal) * 100));
                      const isToday = idx === adminData.weeklyRevenue.length - 2;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-stone-600 mb-1">
                            {(item.amount / 1000000).toFixed(1)}M
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-lg transition-all ${
                              isToday ? 'bg-[#98501B]' : 'bg-stone-300 hover:bg-stone-400'
                            }`}
                          ></div>
                          <span className="text-[10px] text-stone-500 mt-2 font-medium">{item.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Structure Card */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-stone-800 mb-3">Cơ cấu doanh thu</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-stone-700">
                          <span>Dịch vụ Spa & Trị liệu</span>
                          <span>4.500.000 ₫ (52.6%)</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full mt-1 overflow-hidden">
                          <div className="w-[52.6%] h-full bg-[#98501B] rounded-full"></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-stone-700">
                          <span>Học phí khóa đào tạo</span>
                          <span>4.050.000 ₫ (47.4%)</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full mt-1 overflow-hidden">
                          <div className="w-[47.4%] h-full bg-blue-600 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-stone-600 text-[11px] space-y-1 mt-4">
                    <div className="font-bold text-[#98501B]">Đối chiếu chi nhánh:</div>
                    <div className="flex justify-between">
                      <span>Cơ sở 1 (Quận 3):</span>
                      <span className="font-bold">8.550.000 ₫</span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>Cơ sở 2 (Cầu Giấy):</span>
                      <span>0 ₫ (Chưa mở ca)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPCOMING APPOINTMENTS TABLE */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-stone-800">Lịch hẹn sắp tới hôm nay</h3>
                  <span className="text-[11px] text-stone-500 font-medium">3 lịch hẹn</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                        <th className="py-2 px-3">Mã lịch hẹn</th>
                        <th className="py-2 px-3">Thời gian</th>
                        <th className="py-2 px-3">Khách hàng</th>
                        <th className="py-2 px-3">Dịch vụ</th>
                        <th className="py-2 px-3">Kỹ thuật viên</th>
                        <th className="py-2 px-3">Phòng</th>
                        <th className="py-2 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[11px]">
                      {adminData.staffSchedules.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-bold text-stone-800">MED-2026-981{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#98501B]">09:30 - 10:30</td>
                          <td className="py-2.5 px-3 font-medium">Nguyễn Minh Anh</td>
                          <td className="py-2.5 px-3">Massage thư giãn toàn thân</td>
                          <td className="py-2.5 px-3 font-medium">{item.techName}</td>
                          <td className="py-2.5 px-3 text-stone-500">Phòng 0{idx + 1}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: QUẢN LÝ CHI NHÁNH */}
          {activeMenu === 'branches' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold text-stone-900">Quản lý hệ thống chi nhánh</h1>
                  <p className="text-stone-500 text-xs">Cấu hình phòng trị liệu, giường spa và nhân sự từng cơ sở.</p>
                </div>
                <button onClick={() => setAdminModal({ type: 'branch', title: 'Thêm chi nhánh mới' })} className="px-3 py-2 bg-[#98501B] text-white font-bold rounded-lg shadow-sm hover:bg-[#884218]">
                  + Thêm chi nhánh mới
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleBranches.map((br) => (
                  <div key={br.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-stone-900">{br.name}</h3>
                        <p className="text-stone-500 text-[11px] mt-0.5">{br.address}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        Đang hoạt động
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div>
                        <div className="text-[10px] text-stone-400">Phòng VIP</div>
                        <div className="font-bold text-stone-800 text-xs mt-0.5">2 phòng</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400">Giường Spa</div>
                        <div className="font-bold text-stone-800 text-xs mt-0.5">6 giường</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400">Kỹ thuật viên</div>
                        <div className="font-bold text-stone-800 text-xs mt-0.5">4 nhân sự</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-[11px]">
                      <span className="text-stone-500">Giờ mở cửa: 09:00 - 20:00 (Cả tuần)</span>
                      <button onClick={() => setAdminModal({ type: 'detail', title: `Cấu hình ${br.name}`, data: br })} className="text-[#98501B] font-bold hover:underline flex items-center space-x-1">
                        <span>Cấu hình ca trực</span>
                        <ArrowRightIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: KHÁCH HÀNG CRM */}
          {activeMenu === 'customers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold text-stone-900">Danh sách khách hàng (CRM)</h1>
                  <p className="text-stone-500 text-xs">Theo dõi lịch sử trị liệu, tích điểm và gói chăm sóc.</p>
                </div>
                <button onClick={() => setAdminModal({ type: 'customer', title: 'Thêm khách hàng' })} className="px-3 py-2 bg-[#98501B] text-white font-bold rounded-lg shadow-sm">
                  + Thêm khách hàng
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Hạng VIP</th>
                      <th className="py-3 px-4">Điểm tích lũy</th>
                      <th className="py-3 px-4">Liệu trình đã dùng</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[11px]">
                    {visibleCustomers.map((customer) => <tr key={customer.id} className="hover:bg-stone-50">
                      <td className="py-3 px-4 font-bold text-stone-900">{customer.name}</td>
                      <td className="py-3 px-4 text-stone-600">{customer.phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#98501B] font-bold text-[10px] flex items-center space-x-1 w-max">
                          <StarIcon size={10} color="#98501B" filled />
                          <span>{customer.tier}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#98501B]">{customer.points.toLocaleString('vi-VN')} pts</td>
                      <td className="py-3 px-4">{customer.treatments}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setAdminModal({ type: 'detail', title: `Hồ sơ ${customer.name}`, data: customer })} className="text-blue-600 font-bold hover:underline mr-2">Xem EMR</button>
                        <button onClick={() => { setNewCustomerName(customer.name); setActiveMenu('cashier'); }} className="text-[#98501B] font-bold hover:underline">Thu ngân</button>
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: LỊCH KỸ THUẬT VIÊN */}
          {activeMenu === 'technicians' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold text-stone-900">Lịch phân ca kỹ thuật viên</h1>
                  <p className="text-stone-500 text-xs">Sắp xếp ca sáng, chiều, tối cho đội ngũ trị liệu.</p>
                </div>
                <button onClick={() => setAdminModal({ type: 'schedule', title: 'Xếp ca kỹ thuật viên' })} className="px-3 py-2 bg-[#98501B] text-white font-bold rounded-lg shadow-sm">
                  + Xếp ca mới
                </button>
              </div>

              <div className="space-y-4">
                {visibleSchedules.map((staff, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center font-bold text-[#98501B]">
                          {staff.techName.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-stone-900">{staff.techName}</h3>
                          <span className="text-[11px] text-stone-500">
                            {staff.role} • Chi nhánh {staff.branch}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        {staff.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="font-bold text-stone-700 text-[10px] uppercase">Ca Sáng (09:00 - 12:00)</div>
                        <div className="mt-1 font-medium text-stone-800">{staff.morningSlot}</div>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="font-bold text-stone-700 text-[10px] uppercase">Ca Chiều (13:30 - 17:00)</div>
                        <div className="mt-1 font-medium text-stone-800">{staff.afternoonSlot}</div>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="font-bold text-stone-700 text-[10px] uppercase">Ca Tối (17:30 - 20:00)</div>
                        <div className="mt-1 font-medium text-stone-800">{staff.eveningSlot}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 5: THU NGÂN & HÓA ĐƠN POS */}
          {activeMenu === 'cashier' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Billing Input Form */}
              <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-stone-900">Thu ngân dịch vụ (POS)</h2>

                {posSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-semibold text-xs flex items-center space-x-1.5">
                    <CheckIcon size={14} color="#059669" />
                    <span>{posSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Khách hàng</label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Dịch vụ sử dụng</label>
                    <select
                      value={newServiceTitle}
                      onChange={(e) => setNewServiceTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-semibold"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.title}>
                          {s.title} ({s.price.toLocaleString('vi-VN')} ₫)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Kỹ thuật viên thực hiện</label>
                    <select
                      value={newTechName}
                      onChange={(e) => setNewTechName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-semibold"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.specialty})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Tổng tiền gốc</label>
                      <input
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Giảm giá</label>
                      <input
                        type="number"
                        value={newDiscount}
                        onChange={(e) => setNewDiscount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-bold text-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Phương thức thanh toán</label>
                    <select
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-xs font-semibold"
                    >
                      <option value="Chuyển khoản QR ngân hàng">Chuyển khoản QR ngân hàng</option>
                      <option value="Tiền mặt">Tiền mặt</option>
                      <option value="Ví ZaloPay">Ví ZaloPay</option>
                    </select>
                  </div>

                  {/* Total calculation */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                    <span className="font-bold text-stone-700">Thực thu:</span>
                    <span className="text-base font-bold text-[#98501B]">
                      {Math.max(0, newAmount - newDiscount).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  <button
                    onClick={handleCreateReceipt}
                    className="w-full py-3 bg-[#98501B] text-white font-bold rounded-xl shadow-md hover:bg-[#884218] transition text-xs"
                  >
                    Ghi nhận thanh toán & In phiếu thu
                  </button>
                </div>
              </div>

              {/* Receipts History List */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-stone-900">Danh sách phiếu thu gần nhất</h2>

                <div className="space-y-3">
                  {adminData.posReceipts.map((rcpt, idx) => (
                    <div key={idx} className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-stone-900">{rcpt.receiptCode}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            {rcpt.status}
                          </span>
                        </div>
                        <div className="text-stone-700 font-semibold">{rcpt.customerName} - {rcpt.serviceTitle}</div>
                        <div className="text-stone-500 text-[10px]">
                          Kỹ thuật viên: {rcpt.techName} • {rcpt.paymentMethod} • {rcpt.time}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-[#98501B]">
                          {rcpt.finalAmount.toLocaleString('vi-VN')} ₫
                        </div>
                        {rcpt.discount > 0 && (
                          <div className="text-[10px] text-stone-400 line-through">
                            {rcpt.amount.toLocaleString('vi-VN')} ₫
                          </div>
                        )}
                        <button onClick={() => window.print()} className="text-[10px] text-blue-600 font-bold hover:underline mt-1 block ml-auto">
                          In lại phiếu
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: HỌC VIÊN & TUYỂN SINH */}
          {activeMenu === 'academy' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold text-stone-900">Tuyển sinh & Học viên Học viện MLD</h1>
                  <p className="text-stone-500 text-xs">Theo dõi tiến độ học tập, bài thi trắc nghiệm và chứng chỉ.</p>
                </div>
                <button onClick={() => setAdminModal({ type: 'student', title: 'Tạo hồ sơ tuyển sinh' })} className="px-3 py-2 bg-[#98501B] text-white font-bold rounded-lg shadow-sm">
                  + Tạo hồ sơ tuyển sinh
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Học viên</th>
                      <th className="py-3 px-4">Khóa học đăng ký</th>
                      <th className="py-3 px-4">Tiến độ bài giảng</th>
                      <th className="py-3 px-4">Tình trạng học phí</th>
                      <th className="py-3 px-4">Điểm thi</th>
                      <th className="py-3 px-4 text-right">Chứng chỉ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[11px]">
                    {visibleStudents.map((stu) => (
                      <tr key={stu.id} onClick={() => setAdminModal({ type: 'detail', title: `Hồ sơ học viên ${stu.name}`, data: stu })} className="cursor-pointer hover:bg-stone-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{stu.name}</div>
                          <div className="text-[10px] text-stone-500">{stu.phone}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">{stu.courseTitle}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${stu.progress}%` }}
                                className="h-full bg-blue-600 rounded-full"
                              ></div>
                            </div>
                            <span className="font-bold text-[10px] text-stone-600">{stu.progress}%</span>
                          </div>
                          <span className="text-[10px] text-stone-400">{stu.completedLessons}</span>
                        </td>
                        <td className="py-3 px-4 text-emerald-700 font-semibold">{stu.feeStatus}</td>
                        <td className="py-3 px-4 font-bold text-stone-800">{stu.examScore}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              stu.certificateStatus.includes('Đã cấp')
                                ? 'bg-amber-100 text-[#98501B]'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {stu.certificateStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 7: BÁO CÁO DOANH THU */}
          {activeMenu === 'revenue' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold text-stone-900">Báo cáo doanh thu & tài chính</h1>
                  <p className="text-stone-500 text-xs">Đối chiếu doanh thu tiền mặt, chuyển khoản và chi nhánh.</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={downloadRevenueCsv} className="px-3 py-2 bg-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-300">
                    Xuất file Excel
                  </button>
                  <button onClick={() => window.print()} className="px-3 py-2 bg-[#98501B] text-white font-bold rounded-lg shadow-sm hover:bg-[#884218]">
                    In báo cáo ngày
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
                  <span className="text-stone-500 text-xs">Tổng doanh thu tuần</span>
                  <div className="text-xl font-bold text-[#98501B] mt-1">47.450.000 ₫</div>
                  <div className="text-[10px] text-emerald-600 mt-1 font-semibold">+14.2% so với tuần trước</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
                  <span className="text-stone-500 text-xs">Lợi nhuận gộp ước tính</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1">32.200.000 ₫</div>
                  <div className="text-[10px] text-stone-500 mt-1">Tỷ suất lợi nhuận: 67.8%</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
                  <span className="text-stone-500 text-xs">Chi phí voucher ưu đãi</span>
                  <div className="text-xl font-bold text-red-600 mt-1">- 2.550.000 ₫</div>
                  <div className="text-[10px] text-stone-500 mt-1">Áp dụng cho 6 lượt khách</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {adminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6" onMouseDown={() => setAdminModal(null)}>
          <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[8px] border border-stone-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
              <div><h2 className="text-base font-bold text-stone-900">{adminModal.title}</h2><p className="mt-0.5 text-[11px] text-stone-500">Dữ liệu quản trị thử nghiệm</p></div>
              <button onClick={() => setAdminModal(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-stone-200"><CloseIcon size={16} /></button>
            </div>

            {adminModal.type === 'detail' ? (
              <div className="space-y-3 p-5">
                {Object.entries(adminModal.data || {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => <div key={key} className="grid grid-cols-[140px_1fr] gap-3 border-b border-stone-100 pb-2"><span className="font-semibold capitalize text-stone-500">{key}</span><span className="font-medium text-stone-900">{String(value)}</span></div>)}
                <button onClick={() => setAdminModal(null)} className="mt-2 h-10 w-full rounded-[8px] bg-[#98501B] font-bold text-white">Đóng hồ sơ</button>
              </div>
            ) : (
              <form onSubmit={submitAdminModal} className="space-y-4 p-5">
                {(adminModal.type === 'branch' || adminModal.type === 'customer' || adminModal.type === 'schedule' || adminModal.type === 'student') && <AdminField name="name" label={adminModal.type === 'schedule' ? 'Tên kỹ thuật viên' : adminModal.type === 'student' ? 'Tên học viên' : adminModal.type === 'branch' ? 'Tên chi nhánh' : 'Tên khách hàng'} required />}
                {adminModal.type === 'branch' && <><AdminField name="address" label="Địa chỉ" required /><AdminField name="phone" label="Số điện thoại" required /></>}
                {adminModal.type === 'customer' && <AdminField name="phone" label="Số điện thoại" required />}
                {adminModal.type === 'student' && <><AdminField name="phone" label="Số điện thoại" required /><label className="block"><span className="mb-1 block font-bold text-stone-700">Khóa học</span><select name="course" required className="h-10 w-full rounded-[8px] border border-stone-200 bg-white px-3">{database.courses.map((course) => <option key={course.id}>{course.title}</option>)}</select></label></>}
                {adminModal.type === 'schedule' && <><AdminField name="role" label="Chức danh" required /><label className="block"><span className="mb-1 block font-bold text-stone-700">Chi nhánh</span><select name="branch" className="h-10 w-full rounded-[8px] border border-stone-200 bg-white px-3">{branches.map((branch) => <option key={branch.id}>{branch.name}</option>)}</select></label><AdminField name="morning" label="Ca sáng" placeholder="09:00 - 12:00" /><AdminField name="afternoon" label="Ca chiều" placeholder="13:30 - 17:00" /><AdminField name="evening" label="Ca tối" placeholder="17:30 - 20:00" /></>}
                <div className="flex justify-end gap-2 border-t border-stone-100 pt-4"><button type="button" onClick={() => setAdminModal(null)} className="h-10 rounded-[8px] border border-stone-200 px-4 font-bold text-stone-600">Hủy</button><button type="submit" className="h-10 rounded-[8px] bg-[#98501B] px-5 font-bold text-white">Lưu dữ liệu</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminField = ({ name, label, required = false, placeholder = '' }: { name: string; label: string; required?: boolean; placeholder?: string }) => <label className="block"><span className="mb-1 block font-bold text-stone-700">{label}</span><input name={name} required={required} placeholder={placeholder} className="h-10 w-full rounded-[8px] border border-stone-200 bg-stone-50 px-3 outline-none focus:border-[#98501B] focus:bg-white" /></label>;
