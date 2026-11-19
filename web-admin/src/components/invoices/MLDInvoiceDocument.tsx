import React from 'react';

export interface MLDInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface MLDInvoicePackageInfo {
  packageName?: string | null;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  expiresAt?: string | null;
}

export interface MLDInvoiceData {
  id: string;
  title?: string;
  paidAmount?: number;
  balanceDue?: number;
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
  headerText?: string;
  footerNote?: string;
  hotline?: string;
  packageInfo?: MLDInvoicePackageInfo | null;
  lines: MLDInvoiceLine[];
  subtotal: number;
  discount: number;
  pointsRedeemed?: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateShort = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('vi-VN');
};

export function MLDInvoiceDocument({
  data,
  printId = 'pos-receipt-card',
  mode = 'a5',
  children,
}: {
  data: MLDInvoiceData;
  printId?: string;
  mode?: 'a5' | 'thermal80';
  children?: React.ReactNode;
}) {
  const pkg = data.packageInfo
    ? {
        ...data.packageInfo,
        remainingSessions: Math.max(
          0,
          Number.isFinite(Number(data.packageInfo.remainingSessions))
            ? Number(data.packageInfo.remainingSessions)
            : Number(data.packageInfo.totalSessions || 0) - Number(data.packageInfo.completedSessions || 0),
        ),
      }
    : null;

  const isThermal = mode === 'thermal80';
  const contactPhone = data.branchPhone || data.hotline || '';

  if (isThermal) {
    return (
      <article
        id={printId}
        className="mld-invoice mld-invoice-80mm mx-auto w-full max-w-[302px] bg-white px-3.5 py-4 font-mono text-[11px] leading-snug text-slate-900 shadow-xs border border-slate-200"
      >
        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 2mm; }
            body * { visibility: hidden !important; }
            #${printId}, #${printId} * { visibility: visible !important; }
            #${printId} {
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 76mm !important;
              max-width: 76mm !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 2mm 3mm !important;
              border: none !important;
              box-shadow: none !important;
              background: #fff !important;
            }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="border-b border-dashed border-slate-400 pb-2.5 text-center">
          <img src="/logo_mld.png" alt="MLD Việt Nam" className="mx-auto mb-1.5 h-8 w-auto object-contain grayscale contrast-125" />
          <p className="text-[11px] font-bold uppercase tracking-tight">
            {data.headerText || 'MLD HEALTHCARE & SPA'}
          </p>
          {data.branchName && <p className="text-[10px] font-semibold">{data.branchName}</p>}
          {data.branchAddress && <p className="text-[10px] text-slate-700">{data.branchAddress}</p>}
          {contactPhone && <p className="text-[10px] text-slate-700">Hotline: {contactPhone}</p>}
        </div>

        <div className="border-b border-dashed border-slate-400 py-2 text-center">
          <h1 className="text-sm font-black uppercase tracking-wide">{data.title || 'HÓA ĐƠN THANH TOÁN'}</h1>
          <p className="mt-0.5 text-[10px] font-bold">Số HĐ: {data.id}</p>
          <p className="text-[10px] text-slate-700">Ngày: {data.issuedAt}</p>
          {data.shiftCode && <p className="text-[10px] text-slate-700">Ca: {data.shiftCode}</p>}
        </div>

        <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2 text-[10px]">
          <p>
            <span className="font-semibold">Khách hàng:</span> {data.customerName}
          </p>
          {data.customerPhone && (
            <p>
              <span className="font-semibold">SĐT:</span> {data.customerPhone}
            </p>
          )}
          {data.technicianName && (
            <p>
              <span className="font-semibold">NV bán / KTV:</span> {data.technicianName}
            </p>
          )}
        </div>

        <div className="border-b border-dashed border-slate-400 py-2">
          <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-slate-700">
            <span>Dịch vụ / SP</span>
            <span>Thành tiền</span>
          </div>
          <div className="space-y-1.5">
            {data.lines.map((line, index) => (
              <div key={`${line.description}-${index}`} className="text-[11px]">
                <div className="font-semibold text-slate-900">{line.description}</div>
                <div className="flex justify-between text-[10px] text-slate-700">
                  <span>
                    {line.quantity} x {money(line.unitPrice)}
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums">{money(line.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <dl className="space-y-1 border-b border-dashed border-slate-400 py-2 text-[10px]">
          <div className="flex justify-between">
            <dt>Tạm tính:</dt>
            <dd className="tabular-nums">{money(data.subtotal)}</dd>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between">
              <dt>Giảm giá:</dt>
              <dd className="tabular-nums">-{money(data.discount)}</dd>
            </div>
          )}
          {(data.pointsRedeemed ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt>Đổi điểm thưởng:</dt>
              <dd className="tabular-nums">-{money(data.pointsRedeemed || 0)}</dd>
            </div>
          )}
          {(data.vatAmount !== 0 || data.vatRate !== 0) && (
            <div className="flex justify-between">
              <dt>VAT ({data.vatRate}%):</dt>
              <dd className="tabular-nums">{money(data.vatAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-1 text-[12px] font-black">
            <dt>TỔNG CỘNG:</dt>
            <dd className="tabular-nums">{money(data.total)}</dd>
          </div>
          {data.paidAmount !== undefined && (
            <div className="flex justify-between">
              <dt>Đã thu:</dt>
              <dd className="tabular-nums">{money(data.paidAmount)}</dd>
            </div>
          )}
          {data.balanceDue !== undefined && (
            <div className="flex justify-between font-bold">
              <dt>Còn phải nộp:</dt>
              <dd className="tabular-nums">{money(data.balanceDue)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-0.5">
            <dt>Thanh toán:</dt>
            <dd className="text-right font-semibold">{data.paymentMethod}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Trạng thái:</dt>
            <dd className="font-semibold">{data.status || 'Chưa xác định'}</dd>
          </div>
        </dl>

        {pkg && (
          <div className="mt-2 border border-dashed border-slate-800 bg-slate-50 px-2.5 py-2 text-[10px]">
            <p className="text-center font-black uppercase tracking-wide">Số buổi liệu trình</p>
            {pkg.packageName && <p className="mt-1 font-bold">{pkg.packageName}</p>}
            <div className="mt-1 flex justify-between">
              <span>Tổng số buổi:</span>
              <span className="font-semibold">{pkg.totalSessions} buổi</span>
            </div>
            <div className="flex justify-between">
              <span>Đã sử dụng:</span>
              <span className="font-semibold">{pkg.completedSessions} buổi</span>
            </div>
            <div className="mt-0.5 flex justify-between border-t border-dashed border-slate-400 pt-0.5 text-[11px] font-black">
              <span>Còn lại:</span>
              <span>{pkg.remainingSessions} buổi</span>
            </div>
            {pkg.expiresAt && (
              <div className="mt-0.5 flex justify-between">
                <span>Hạn dùng:</span>
                <span>{formatDateShort(pkg.expiresAt)}</span>
              </div>
            )}
          </div>
        )}

        {children && <div className="mt-2">{children}</div>}

        <div className="mt-3 border-t border-dashed border-slate-400 pt-2 text-center text-[10px] text-slate-700">
          <p>{data.footerNote || 'Cảm ơn Quý khách đã tin tưởng dịch vụ MLD!'}</p>
        </div>
      </article>
    );
  }

  return (
    <article id={printId} className="mld-invoice relative overflow-hidden bg-[#F2F4EE] text-[#153F3E]">
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          #${printId}, #${printId} * { visibility: visible !important; }
          #${printId} { position: absolute !important; inset: 0 auto auto 0 !important; width: 148mm !important; min-height: 210mm !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <img src="/logo_mld.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 h-72 w-72 object-contain opacity-[0.035] grayscale" />

      <div className="relative px-7 pb-7 pt-8 sm:px-10 sm:pb-9 sm:pt-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#277775]">
              {data.headerText || 'MLD Việt Nam'}
            </p>
            <h1 className="mt-1 text-4xl font-light tracking-[-0.04em] text-[#176F6C] sm:text-5xl">{data.title || 'HÓA ĐƠN'}</h1>
            <p className="mt-3 text-xs text-[#4C6665]">Ngày lập: <strong className="font-semibold text-[#153F3E]">{data.issuedAt}</strong></p>
          </div>
          <div className="text-right">
            <img src="/logo_mld.png" alt="MLD Việt Nam" className="ml-auto h-12 w-auto object-contain" />
            <p className="mt-2 text-[10px] text-[#5F7473]">{data.title ? 'Mã chứng từ' : 'Mã hóa đơn'}</p>
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
            {contactPhone && <p className="mt-1 text-[#4C6665]">Hotline: {contactPhone}</p>}
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

        {pkg && (
          <div className="mt-4 rounded-lg border border-[#176F6C]/30 bg-white/80 px-4 py-3 text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#176F6C] uppercase tracking-wide">
                Quyền lợi buổi liệu trình {pkg.packageName ? `· ${pkg.packageName}` : ''}
              </span>
              {pkg.expiresAt && (
                <span className="text-[10px] text-[#4C6665]">Hạn dùng: {formatDateShort(pkg.expiresAt)}</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-[#F2F4EE] px-2 py-1.5">
                <div className="text-[10px] text-[#5F7473]">Tổng số buổi</div>
                <div className="font-bold text-[#183D3C]">{pkg.totalSessions} buổi</div>
              </div>
              <div className="rounded bg-[#F2F4EE] px-2 py-1.5">
                <div className="text-[10px] text-[#5F7473]">Đã sử dụng</div>
                <div className="font-bold text-[#183D3C]">{pkg.completedSessions} buổi</div>
              </div>
              <div className="rounded bg-[#176F6C]/10 px-2 py-1.5">
                <div className="text-[10px] text-[#176F6C]">Còn lại</div>
                <div className="font-black text-[#176F6C]">{pkg.remainingSessions} buổi</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[1fr_230px]">
          <div className="text-[11px] leading-relaxed text-[#536D6C]">
            <p><span className="font-semibold text-[#183D3C]">Thanh toán:</span> {data.paymentMethod}</p>
            {data.shiftCode && <p><span className="font-semibold text-[#183D3C]">Mã ca:</span> {data.shiftCode}</p>}
            {data.technicianName && <p><span className="font-semibold text-[#183D3C]">NV bán / Chuyên viên:</span> {data.technicianName}</p>}
            <p><span className="font-semibold text-[#183D3C]">Trạng thái:</span> {data.status || 'Chưa xác định'}</p>
          </div>
          <dl className="space-y-2 text-[11px]">
            <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">Tạm tính</dt><dd className="font-medium tabular-nums">{money(data.subtotal)}</dd></div>
            {data.discount > 0 && <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">Giảm giá</dt><dd className="font-medium tabular-nums">-{money(data.discount)}</dd></div>}
            {(data.pointsRedeemed ?? 0) > 0 && <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">Đổi điểm thưởng</dt><dd className="font-medium tabular-nums">-{money(data.pointsRedeemed || 0)}</dd></div>}
            {(data.vatAmount !== 0 || data.vatRate !== 0) && <div className="flex justify-between gap-3"><dt className="text-[#5F7473]">VAT ({data.vatRate}%)</dt><dd className="font-medium tabular-nums">{money(data.vatAmount)}</dd></div>}
            <div className="flex items-end justify-between gap-3 border-t-2 border-[#176F6C] pt-3"><dt className="text-sm font-semibold text-[#176F6C]">Tổng cộng</dt><dd className="text-lg font-black tabular-nums text-[#176F6C]">{money(data.total)}</dd></div>
            {data.paidAmount !== undefined && <div className="flex justify-between gap-3"><dt>Đã thu</dt><dd>{money(data.paidAmount)}</dd></div>}
            {data.balanceDue !== undefined && <div className="flex justify-between gap-3 font-bold"><dt>Còn phải nộp</dt><dd>{money(data.balanceDue)}</dd></div>}
          </dl>
        </div>
      </div>

      {children && <div className="relative px-7 pb-7 sm:px-10">{children}</div>}
      <footer className="grid grid-cols-1 gap-4 bg-[#E7ECE4] px-7 py-6 text-[10px] text-[#356462] sm:grid-cols-[1.2fr_1fr] sm:px-10">
        <div className="flex items-center gap-3"><img src="/logo_mld.png" alt="MLD Việt Nam" className="h-10 w-auto object-contain" /><div><p className="font-bold uppercase tracking-[0.12em]">MLD Việt Nam</p><p className="mt-1">Medical Healthcare, Spa & Academy</p></div></div>
        <div className="sm:text-right"><p className="font-semibold">{data.footerNote || 'Cảm ơn quý khách đã tin tưởng MLD Việt Nam.'}</p><p className="mt-1">Chứng từ được phát hành từ hệ thống quản trị MLD.</p></div>
      </footer>
    </article>
  );
}
