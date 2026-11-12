import React from 'react';

export interface MLDInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface MLDInvoiceData {
  id: string;
  issuedAt: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  paymentMethod: string;
  status?: string;
  shiftCode?: string;
  technicianName?: string;
  lines: MLDInvoiceLine[];
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export function MLDInvoiceDocument({ data }: { data: MLDInvoiceData }) {
  return (
    <article id="pos-receipt-card" className="mld-invoice relative overflow-hidden bg-[#F2F4EE] text-[#153F3E]">
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          #pos-receipt-card, #pos-receipt-card * { visibility: visible !important; }
          #pos-receipt-card { position: absolute !important; inset: 0 auto auto 0 !important; width: 148mm !important; min-height: 210mm !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <img src="/logo_mld.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 h-72 w-72 object-contain opacity-[0.035] grayscale" />

      <div className="relative px-7 pb-7 pt-8 sm:px-10 sm:pb-9 sm:pt-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#277775]">MLD Việt Nam</p>
            <h1 className="mt-1 text-4xl font-light tracking-[-0.04em] text-[#176F6C] sm:text-5xl">HÓA ĐƠN</h1>
            <p className="mt-3 text-xs text-[#4C6665]">Ngày lập: <strong className="font-semibold text-[#153F3E]">{data.issuedAt}</strong></p>
          </div>
          <div className="text-right">
            <img src="/logo_mld.png" alt="MLD Việt Nam" className="ml-auto h-12 w-auto object-contain" />
            <p className="mt-2 text-[10px] text-[#5F7473]">Mã hóa đơn</p>
            <p className="font-mono text-xs font-bold text-[#176F6C]">{data.id}</p>
          </div>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-6 text-xs sm:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold text-[#176F6C]">Hóa đơn cho</h2>
            <p className="mt-2 font-bold text-[#183D3C]">{data.customerName}</p>
            {data.customerPhone && <p className="mt-1 text-[#4C6665]">Điện thoại: {data.customerPhone}</p>}
            {data.customerEmail && <p className="mt-1 break-all text-[#4C6665]">Email: {data.customerEmail}</p>}
          </section>
          <section>
            <h2 className="text-sm font-semibold text-[#176F6C]">Đơn vị cung cấp</h2>
            <p className="mt-2 font-bold text-[#183D3C]">{data.branchName || 'MLD Việt Nam Medical Healthcare & Spa'}</p>
            {data.branchAddress && <p className="mt-1 leading-relaxed text-[#4C6665]">{data.branchAddress}</p>}
            {data.branchPhone && <p className="mt-1 text-[#4C6665]">Hotline: {data.branchPhone}</p>}
          </section>
        </div>

        <div className="mt-8 overflow-hidden border border-[#176F6C]/20">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="bg-[#176F6C] text-[#F7FAF4]"><tr><th className="w-[46%] px-3 py-3 font-semibold">Mô tả</th><th className="px-2 py-3 text-center font-semibold">Số lượng</th><th className="px-2 py-3 text-right font-semibold">Đơn giá</th><th className="px-3 py-3 text-right font-semibold">Thành tiền</th></tr></thead>
            <tbody>
              {data.lines.map((line, index) => (
                <tr key={`${line.description}-${index}`} className="border-b border-[#176F6C]/25 last:border-b-0">
                  <td className="px-3 py-3 font-medium text-[#183D3C]">{line.description}</td><td className="px-2 py-3 text-center text-[#4C6665]">{line.quantity}</td><td className="px-2 py-3 text-right tabular-nums text-[#4C6665]">{money(line.unitPrice)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-[#183D3C]">{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[1fr_230px]">
          <div className="text-[11px] leading-relaxed text-[#536D6C]">
            <p><span className="font-semibold text-[#183D3C]">Thanh toán:</span> {data.paymentMethod}</p>
            {data.shiftCode && <p><span className="font-semibold text-[#183D3C]">Mã ca:</span> {data.shiftCode}</p>}
            {data.technicianName && <p><span className="font-semibold text-[#183D3C]">Chuyên viên:</span> {data.technicianName}</p>}
            <p><span className="font-semibold text-[#183D3C]">Trạng thái:</span> {data.status || 'Đã thanh toán'}</p>
          </div>
          <dl className="space-y-2 text-[11px]">
            <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">Tạm tính</dt><dd className="font-medium tabular-nums">{money(data.subtotal)}</dd></div>
            {data.discount > 0 && <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">Giảm giá</dt><dd className="font-medium tabular-nums">-{money(data.discount)}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">VAT ({data.vatRate}%)</dt><dd className="font-medium tabular-nums">{money(data.vatAmount)}</dd></div>
            <div className="flex items-end justify-between gap-3 border-t-2 border-[#176F6C] pt-3"><dt className="text-sm font-semibold text-[#176F6C]">Tổng cộng</dt><dd className="text-lg font-black tabular-nums text-[#176F6C]">{money(data.total)}</dd></div>
          </dl>
        </div>
      </div>

      <footer className="grid grid-cols-1 gap-4 bg-[#E7ECE4] px-7 py-6 text-[10px] text-[#356462] sm:grid-cols-[1.2fr_1fr] sm:px-10">
        <div className="flex items-center gap-3"><img src="/logo_mld.png" alt="MLD Việt Nam" className="h-10 w-auto object-contain" /><div><p className="font-bold uppercase tracking-[0.12em]">MLD Việt Nam</p><p className="mt-1">Medical Healthcare, Spa & Academy</p></div></div>
        <div className="sm:text-right"><p className="font-semibold">Cảm ơn quý khách đã tin tưởng MLD Việt Nam.</p><p className="mt-1">Chứng từ được phát hành từ hệ thống quản trị MLD.</p></div>
      </footer>
    </article>
  );
}
