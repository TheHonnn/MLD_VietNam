import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, RefreshCw, QrCode, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from '../common';
import { MLDInvoiceDocument } from '../invoices/MLDInvoiceDocument';
import { exportElementToPdf } from '../../utils/pdfExport';

export interface CandidateBillInfo {
  id: string;
  name: string;
  code: string; // Mã khách hàng (HV-xxxx)
  orderCode?: string; // Mã đơn hàng (KH-xxxx)
  phone: string;
  email?: string;
  program: string;
  classBatch: string;
  tuitionTotal: number;
  amountPaid: number;
  branch: string;
  schedule: string;
  startDate: string;
  approvalStatus?: string;
}

interface EnrollmentBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateBillInfo | null;
  onCheckPayment: (enrollmentId: string) => Promise<{ isPaid: boolean; message: string }>;
  onApproveAtDesk: (enrollmentId: string) => Promise<void>;
}

export const EnrollmentBillModal: React.FC<EnrollmentBillModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onCheckPayment,
  onApproveAtDesk,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !candidate) return null;

  const rawTuition = Math.max(0, Number(candidate.tuitionTotal) || 0);
  const remaining = Math.max(0, rawTuition - (candidate.amountPaid || 0));
  const amountToPay = remaining;

  // Prioritize unique order code for accurate payment transfer matching (Spec 5.2 & 5.3)
  const orderRef = candidate.orderCode || candidate.code || `KH-${candidate.id.slice(-6)}`;
  const cleanCode = orderRef.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
  const transferContent = `MLD ${cleanCode}`;

  // VietQR Napas 247 generator URL
  const vietQrUrl = `https://api.vietqr.io/image/970422-0394316963-compact2.jpg?amount=${amountToPay}&addInfo=${encodeURIComponent(transferContent)}&accountName=BUI%20THE%20HOANG`;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success('Đã sao chép', `Đã sao chép ${fieldName}: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('enrollment-bill-print-area', {
        fileName: `Phieu_dang_ky_${candidate.orderCode || candidate.code}`,
        orientation: 'portrait',
        format: 'a5',
        scale: 2,
      });
    } catch (error: any) {
      toast.error('Lỗi xuất PDF', error?.message || 'Không thể tạo phiếu PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      await onCheckPayment(candidate.id);
    } catch (err: any) {
      toast.error('Lỗi kiểm tra', err?.message || 'Không thể kiểm tra giao dịch.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApproveAtDesk(candidate.id);
    } catch (err: any) {
      toast.error('Lỗi xác nhận', err?.message || 'Không thể xác nhận thanh toán.');
    } finally {
      setIsApproving(false);
    }
  };

  const isApproved = candidate.approvalStatus === 'APPROVED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Modal Navigation Header (Non-print) */}
        <div className="no-print p-4 sm:px-6 bg-[#FAF5EF] border-b border-[#EFE4D9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F3E2CE] text-[#8D4B1A] flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2C241E]">
                Phiếu Nộp Học Phí & Mã Khách Hàng
              </h2>
              <p className="text-xs text-[#73675F]">
                Mã hồ sơ: <span className="font-semibold text-[#8D4B1A]">{candidate.code}</span> • Trạng thái:{' '}
                {isApproved ? (
                  <span className="text-emerald-700 font-semibold">Đã duyệt nhập học</span>
                ) : (
                  <span className="text-amber-700 font-semibold">Chờ duyệt nhập học</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-white border border-[#E8DFD8] hover:bg-[#FAF8F5] text-[#4A3B32] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Tải PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#73675F] hover:text-[#2C241E] hover:bg-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Bill Content */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-6 text-[#2C241E]">
          <MLDInvoiceDocument printId="enrollment-bill-print-area" data={{
            id: orderRef,
            title: 'PHIẾU HỌC PHÍ',
            issuedAt: new Date().toLocaleDateString('vi-VN'),
            customerName: candidate.name,
            customerPhone: candidate.phone,
            customerEmail: candidate.email,
            branchName: candidate.branch,
            paymentMethod: remaining > 0 ? 'VietQR hoặc tại quầy' : 'Theo chứng từ đã thu',
            status: rawTuition <= 0 ? 'Chưa có học phí xác nhận' : remaining === 0 ? 'Đã thu đủ' : candidate.amountPaid > 0 ? 'Đã thu một phần' : 'Chưa thanh toán',
            lines: [{ description: candidate.program, quantity: 1, unitPrice: rawTuition, amount: rawTuition }],
            subtotal: rawTuition, discount: 0, vatRate: 0, vatAmount: 0, total: rawTuition,
            paidAmount: candidate.amountPaid || 0, balanceDue: remaining,
          }}>
            {remaining > 0 && (
            <div className="border-2 border-dashed border-[#8D4B1A]/40 rounded-2xl p-5 bg-[#FAF7F2] flex flex-col sm:flex-row items-center gap-6">
              {/* QR Image */}
              <div className="flex flex-col items-center shrink-0">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-[#EFE4D9]">
                  <img
                    src={vietQrUrl}
                    alt="VietQR MB Bank Napas 247"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                </div>
                <span className="text-[10px] text-[#73675F] mt-1.5 font-medium">
                  Quét mã qua app ngân hàng bất kỳ
                </span>
              </div>

              {/* Bank Transfer Details */}
              <div className="flex-1 space-y-2 text-xs w-full">
                <div className="font-bold text-[#8D4B1A] text-sm flex items-center gap-1.5 pb-1 border-b border-[#EFE4D9]">
                  <QrCode className="w-4 h-4" />
                  <span>THÔNG TIN CHUYỂN KHOẢN TỰ ĐỘNG ĐỐI SOÁT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#73675F] block text-[11px]">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-[#2C241E]">MB Bank (Quân Đội)</span>
                  </div>

                  <div>
                    <span className="text-[#73675F] block text-[11px]">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#2C241E] text-[13px]">0394316963</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('0394316963', 'Số tài khoản')}
                        className="no-print p-1 hover:bg-white rounded text-[#8D4B1A] transition-colors cursor-pointer"
                        title="Sao chép STK"
                      >
                        {copiedField === 'Số tài khoản' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#73675F] block text-[11px]">Chủ tài khoản:</span>
                    <span className="font-bold text-[#2C241E] uppercase">BUI THE HOANG</span>
                  </div>

                  <div>
                    <span className="text-[#73675F] block text-[11px]">Số tiền chính xác:</span>
                    <span className="font-bold text-[#8D4B1A] text-[13px]">
                      {amountToPay.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>

                {/* Transfer Note Cú pháp */}
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase">
                      Nội dung chuyển khoản (bắt buộc):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferContent, 'Nội dung chuyển khoản')}
                      className="no-print text-[11px] font-semibold text-[#8D4B1A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'Nội dung chuyển khoản' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-extrabold text-[#8D4B1A] tracking-wider">
                    {transferContent}
                  </div>
                  <div className="text-[11px] text-amber-800 leading-snug">
                    * Sử dụng đúng nội dung chuyển khoản. Hồ sơ được duyệt riêng sau khi xác nhận khoản thu.
                  </div>
                </div>
              </div>
            </div>

            )}
          </MLDInvoiceDocument>
        </div>

        {/* Modal Bottom Actions Bar (Non-print) */}
        <div className="no-print p-4 sm:px-6 bg-[#FAF5EF] border-t border-[#EFE4D9] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#73675F]">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Mã khách hàng: <strong className="text-[#2C241E]">{cleanCode}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nút 1: Kiểm tra tiền về */}
            <button
              type="button"
              disabled={isChecking}
              onClick={handleCheckNow}
              className="px-4 py-2 bg-white border border-[#BA7E4C] text-[#8D4B1A] hover:bg-[#F8F1E8] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Đang kiểm tra giao dịch...' : 'Kiểm tra giao dịch đã ghi nhận'}</span>
            </button>

            {/* Nút 2: Duyệt tại quầy */}
            {remaining > 0 && (
              <button
                type="button"
                disabled={isApproving}
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isApproving ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền'}</span>
              </button>
            )}

            {/* Nút 3: In phiếu */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
