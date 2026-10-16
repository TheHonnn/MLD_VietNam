import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { posService, bookingService, customerService } from '../services';
import { Invoice, Booking, User } from '../types/shared_types';

export const W07_CashierPOS: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'onsite' | 'transfer' | 'online'>('transfer');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [customer, setCustomer] = useState<User | undefined>(undefined);

  useEffect(() => {
    const fetchPosData = async () => {
      try {
        const [invRes, bkRes, custRes] = await Promise.all([
          posService.getInvoices(),
          bookingService.getBookingById('44440001-0001-0001-0001-000000000001'),
          customerService.getCustomerById('00000000-0000-0000-0000-000000000001'),
        ]);
        if (invRes.success) setInvoices(invRes.data);
        if (bkRes.success) setBooking(bkRes.data);
        if (custRes.success) setCustomer(custRes.data);
      } catch (err) {
        console.error('Failed to load POS data:', err);
      }
    };
    fetchPosData();
  }, []);

  // Past receipts dataset from service or fallback
  const pastReceipts = invoices.length > 0
    ? invoices.map((inv) => ({
        id: inv.invoiceCode,
        date: inv.paidAt ? inv.paidAt.split('T')[0] : '08/10/2026',
        content: inv.id === 'inv-1008' ? 'Massage thư giãn toàn thân' : inv.id === 'inv-1005' ? 'Gói chăm sóc da 8 buổi' : 'Học phí Kỹ thuật Spa Cơ bản',
        method: inv.paymentMethod === 'CASH_AT_SPA' ? 'Thanh toán tại cơ sở' : inv.paymentMethod === 'MOMO' ? 'Thanh toán trực tuyến (MoMo)' : 'Chuyển khoản',
        amount: `${inv.totalAmount.toLocaleString('vi-VN')}đ`,
        status: inv.paymentStatus === 'PAID' ? 'Đã thanh toán (Service)' : 'Chờ thanh toán',
      }))
    : [
    {
      id: 'MH-DV-1008',
      date: '08/10/2026',
      content: 'Massage thư giãn toàn thân',
      method: 'Thanh toán tại cơ sở',
      amount: '450.000đ',
      status: 'Đã thanh toán (minh họa)',
    },
    {
      id: 'MH-LT-1005',
      date: '05/10/2026',
      content: 'Gói chăm sóc da 8 buổi',
      method: 'Thanh toán trực tuyến',
      amount: '3.600.000đ',
      status: 'Đã thanh toán (minh họa)',
    },
    {
      id: 'MH-HP-1001',
      date: '01/10/2026',
      content: 'Học phí khóa Kỹ thuật Spa Cơ bản',
      method: 'Chuyển khoản',
      amount: '4.500.000đ',
      status: 'Đã thanh toán (minh họa)',
    },
  ];

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Thu ngân
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Đơn dịch vụ SPA-DEMO-000128 · Chờ thanh toán · Không phải biên nhận đã thu
          </p>
        </div>
        <button
          onClick={() => alert('Chức năng Tra cứu đơn dịch vụ (minh họa)')}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
        >
          Tra cứu đơn dịch vụ
        </button>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3">
        {/* Customer / Booking code input */}
        <div className="flex-1 min-w-[260px]">
          <input
            type="text"
            defaultValue="Nguyễn Minh Anh / SPA-DEMO-000128"
            className="w-full px-4 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Dropdown 1: Service type */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Dịch vụ lẻ</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 2: Status */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Chờ thanh toán</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 3: Date */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>12/10/2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 3. Middle Section: Two Columns (Service Details & Payment Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Đơn dịch vụ đang chọn */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <div>
            <h2 className="text-base font-bold text-[#2C241E]">
              Đơn dịch vụ đang chọn
            </h2>
            <div className="mt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F5E9DB] text-[#8A4F23]">
                Giữ chỗ minh họa
              </span>
            </div>
          </div>

          {/* Spa Service Banner Photo */}
          <div className="w-full h-24 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#EFE4D9]">
            <img
              src="/spa_massage_banner.png"
              alt="Massage thư giãn toàn thân"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Service Title */}
          <div>
            <h3 className="text-sm font-bold text-[#2C241E]">
              Massage thư giãn toàn thân
            </h3>
          </div>

          {/* Service Specs Details */}
          <div className="space-y-2 text-xs text-[#73675F]">
            <div className="flex items-center justify-between">
              <span>Thời lượng chăm sóc</span>
              <span className="font-semibold text-[#2C241E]">60 phút</span>
            </div>

            <div>
              <div className="font-medium text-[#2C241E]">Chi nhánh mẫu 01 — Quận 3</div>
              <div className="text-[11px] text-[#73675F] mt-0.5">
                123 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh · Địa chỉ minh họa
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span>Ngày hẹn</span>
              <span className="font-semibold text-[#2C241E]">12/10/2026</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Giờ chăm sóc</span>
              <span className="font-semibold text-[#2C241E]">14:00–15:00</span>
            </div>

            <p className="text-[11px] text-[#73675F] leading-relaxed pt-0.5">
              Chuẩn bị / vệ sinh sau buổi: 15 phút. Chiếm dụng nguồn lực 14:00–15:15, không tính vào 60 phút chăm sóc.
            </p>

            <div className="pt-1">
              <div className="text-xs text-[#2C241E]">
                Chuyên viên: <span className="font-medium">Trần Minh Phương</span>
              </div>
              <div className="text-xs text-[#2C241E] mt-1">
                Khách hàng: <span className="font-bold">Nguyễn Minh Anh</span>
              </div>
              <div className="text-xs text-[#73675F] mt-0.5">
                0912 345 678
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-[11px] text-[#73675F] pt-2 border-t border-[#F0E6DC]">
            Phòng 01 · Nguồn lực giữ đến 15:15, bao gồm 15 phút vệ sinh.
          </div>
        </div>

        {/* Right Column: Tổng hợp thanh toán */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <h2 className="text-base font-bold text-[#2C241E]">
            Tổng hợp thanh toán
          </h2>

          {/* Pricing breakdown box */}
          <div className="border border-[#EFE4D9] rounded-2xl p-4.5 space-y-2 text-xs">
            <div className="font-bold text-xs text-[#2C241E] mb-2">
              Chi phí minh họa
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tạm tính</span>
              <span className="font-semibold text-[#2C241E]">450.000đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Ưu đãi</span>
              <span className="font-semibold text-[#2C241E]">0đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Đã sử dụng gói liệu trình</span>
              <span className="font-semibold text-[#2C241E]">0đ</span>
            </div>

            <div className="border-t border-[#EFE4D9] pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#2C241E]">Tổng thanh toán</span>
                <span className="font-extrabold text-[#2C241E]">450.000đ</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Cọc cần thu ngay</span>
                <span className="font-semibold text-[#2C241E]">150.000đ</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Còn lại trả sau</span>
                <span className="font-semibold text-[#2C241E]">300.000đ</span>
              </div>
            </div>
          </div>

          {/* Status banner */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F3E2CE] text-[#8A4F23] text-xs font-semibold">
            <Clock className="w-4 h-4 stroke-[2]" />
            <span>Chờ thanh toán</span>
          </div>

          {/* Secondary badge */}
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EBDCCE] text-[#73675F]">
              Chưa thu tiền
            </span>
          </div>

          {/* Payment action button */}
          <button
            onClick={() => alert('Ghi nhận thanh toán (mô phỏng)')}
            className="w-full py-3 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center"
          >
            Ghi nhận thanh toán
          </button>

          {/* Draft Receipt Box */}
          <div className="bg-[#F6EFE8] rounded-xl p-3.5 space-y-1 text-xs">
            <div className="font-bold text-xs text-[#2C241E]">
              Bản nháp — minh họa
            </div>
            <div className="text-[11px] text-[#73675F]">
              SPA-DEMO-000128 · Tổng đơn 450.000đ
            </div>
            <div className="text-[11px] text-[#73675F]">
              Cọc dự kiến 150.000đ · Chưa có biên nhận đã thu.
            </div>
          </div>

          {/* Explanatory Note */}
          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Chỉ ghi nhận sau đối chiếu hợp lệ. Nút minh họa không xử lý hoặc tạo biên nhận thực.
          </div>
        </div>
      </div>

      {/* 4. Payment Methods Selector (Row of 3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Column 1: On-site payment */}
        <div
          onClick={() => setSelectedMethod('onsite')}
          className={`rounded-2xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all ${
            selectedMethod === 'onsite'
              ? 'bg-[#F3E2CE] border-[#D7BBA6]'
              : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6]'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  selectedMethod === 'onsite'
                    ? 'bg-[#8A4F23] text-white'
                    : 'border-2 border-[#D7BBA6] bg-white'
                }`}
              >
                {selectedMethod === 'onsite' && (
                  <CheckCircle2 className="w-5 h-5 text-[#8A4F23] fill-white" />
                )}
              </div>
              <span className="text-xs font-bold text-[#2C241E]">
                Thanh toán tại cơ sở
              </span>
            </div>
            <p className="text-[11px] text-[#73675F] leading-relaxed pl-7">
              Quận 3 minh họa cho phép trả phần còn lại 300.000đ; vẫn yêu cầu cọc 150.000đ.
            </p>
          </div>
        </div>

        {/* Column 2: Bank Transfer / QR */}
        <div
          onClick={() => setSelectedMethod('transfer')}
          className={`rounded-2xl border p-4.5 space-y-3 cursor-pointer transition-all ${
            selectedMethod === 'transfer'
              ? 'bg-[#F3E2CE] border-[#D7BBA6]'
              : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                selectedMethod === 'transfer'
                  ? 'bg-[#8A4F23] text-white'
                  : 'border-2 border-[#D7BBA6] bg-white'
              }`}
            >
              {selectedMethod === 'transfer' && (
                <CheckCircle2 className="w-5 h-5 text-[#8A4F23] fill-white" />
              )}
            </div>
            <span className="text-xs font-bold text-[#2C241E]">
              Chuyển khoản ngân hàng / QR
            </span>
          </div>

          {/* QR Code and description cleanly contained INSIDE card */}
          <div className="flex items-center gap-3 pl-7">
            <div className="w-14 h-14 bg-white rounded-xl border border-dashed border-[#D7BBA6] flex flex-col items-center justify-center text-[10px] text-[#73675F] leading-tight text-center font-medium shrink-0 shadow-2xs">
              <div>Chưa có</div>
              <div>QR</div>
            </div>
            <p className="text-[11px] text-[#50443D] leading-relaxed">
              Ngân hàng chưa cấu hình. Ô mẫu không chứa mã quét hoặc tài khoản hợp lệ.
            </p>
          </div>
        </div>

        {/* Column 3: Online Gateway */}
        <div
          onClick={() => setSelectedMethod('online')}
          className={`rounded-2xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all ${
            selectedMethod === 'online'
              ? 'bg-[#F3E2CE] border-[#D7BBA6]'
              : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6]'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  selectedMethod === 'online'
                    ? 'bg-[#8A4F23] text-white'
                    : 'border-2 border-[#D7BBA6] bg-white'
                }`}
              >
                {selectedMethod === 'online' && (
                  <CheckCircle2 className="w-5 h-5 text-[#8A4F23] fill-white" />
                )}
              </div>
              <span className="text-xs font-bold text-[#2C241E]">
                Thanh toán trực tuyến
              </span>
            </div>
            <p className="text-[11px] text-[#73675F] leading-relaxed pl-7">
              Chưa kết nối cổng thanh toán.
            </p>
          </div>

          <div className="text-[11px] text-[#73675F] pl-7 pt-2">
            Gói / voucher: chưa áp dụng · Không có phí ẩn.
          </div>
        </div>
      </div>

      {/* 5. Previous Receipts Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EFE4D9]">
          <h2 className="text-base font-bold text-[#2C241E]">
            Đối chiếu biên nhận trước đó · 01/10/2026 – 08/10/2026
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F5E9DB] text-[#8A4F23]">
            3 bản ghi mẫu
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold">
                <th className="py-3 px-5">Biên nhận / ngày</th>
                <th className="py-3 px-5">Nội dung</th>
                <th className="py-3 px-5">Phương thức</th>
                <th className="py-3 px-5">Đã thu</th>
                <th className="py-3 px-5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {pastReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-bold text-xs text-[#2C241E]">
                      {r.id}
                    </div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">
                      {r.date}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-xs text-[#2C241E] font-medium">
                    {r.content}
                  </td>
                  <td className="py-4 px-5 text-xs text-[#2C241E]">
                    {r.method}
                  </td>
                  <td className="py-4 px-5 text-xs font-semibold text-[#2C241E]">
                    {r.amount}
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#EAF5EC] text-[#2D7A4D]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D7A4D]" />
                      <span>{r.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
          <span>
            3 / 3 biên nhận · Tổng đã thu: 8.550.000đ · Cọc 150.000đ của đơn đang chọn chưa tính
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="p-1 rounded-md text-[#B0A294] border border-[#EFE4D9] opacity-50 cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-bold text-xs flex items-center justify-center">
              1
            </button>
            <button
              disabled
              className="p-1 rounded-md text-[#B0A294] border border-[#EFE4D9] opacity-50 cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Policy Note below Table */}
      <div className="text-xs text-[#73675F] leading-relaxed">
        Chính sách Quận 3 minh họa: cọc 150.000đ và trả sau 300.000đ. Ba khoản đã thu là các giao dịch trước đó, không phải thanh toán lại đơn đang chọn.
      </div>

      {/* 7. Footer Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#985018]" />
        <span>
          Dữ liệu minh họa · Các thao tác chỉ là giao diện tĩnh, không thay đổi dữ liệu hay thực hiện giao dịch.
        </span>
      </div>
    </div>
  );
};
