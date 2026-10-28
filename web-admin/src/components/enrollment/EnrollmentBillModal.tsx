import React, { useState } from 'react';
import { X, Printer, CheckCircle2, RefreshCw, QrCode, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from '../common';

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

  if (!isOpen || !candidate) return null;

  const rawTuition = candidate.tuitionTotal || 9000000;
  const remaining = Math.max(0, rawTuition - (candidate.amountPaid || 0));
  const amountToPay = remaining > 0 ? remaining : rawTuition;

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

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      const res = await onCheckPayment(candidate.id);
      if (res.isPaid) {
        toast.success('Đối soát thành công!', res.message);
      } else {
        toast.info('Chưa có giao dịch', res.message);
      }
    } catch (err: any) {
      toast.error('Lỗi kiểm tra', err?.message || 'Không thể kiểm tra giao dịch.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Xác nhận duyệt học viên ${candidate.name} (${candidate.code}) và thu ${amountToPay.toLocaleString('vi-VN')}đ tại quầy?`)) {
      return;
    }
    setIsApproving(true);
    try {
      await onApproveAtDesk(candidate.id);
      toast.success('Đã duyệt thành công', `Học viên ${candidate.name} đã được ghi nhận nhập học!`);
    } catch (err: any) {
      toast.error('Lỗi khi duyệt', err?.message || 'Không thể duyệt hồ sơ.');
    } finally {
      setIsApproving(false);
    }
  };

  const isApproved = candidate.approvalStatus === 'APPROVED' || (candidate.amountPaid > 0 && candidate.amountPaid >= rawTuition);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      {/* CSS print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #enrollment-bill-print-area, #enrollment-bill-print-area * {
            visibility: visible;
          }
          #enrollment-bill-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 24px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

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
                  <span className="text-emerald-700 font-semibold">Đã duyệt & Đã thanh toán</span>
                ) : (
                  <span className="text-amber-700 font-semibold">Chờ duyệt & Chưa thanh toán</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div id="enrollment-bill-print-area" className="bg-white p-6 sm:p-8 rounded-xl border border-[#EFE4D9] space-y-6">
            {/* 1. Header Institute Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b-2 border-[#8D4B1A]">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#8D4B1A]">
                  HỌC VIỆN ĐÀO TẠO Y KHOA & THẨM MỸ MLD VIỆT NAM
                </div>
                <div className="text-lg font-extrabold text-[#2C241E] mt-0.5">
                  MLD HEALTHCARE & ACADEMY
                </div>
                <div className="text-xs text-[#73675F] mt-1 space-y-0.5">
                  <div>Địa chỉ: 123 Đường Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP.HCM</div>
                  <div>Hotline: 0901 234 567 • Email: academy@mldvietnam.vn</div>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 bg-[#FAF5EF] sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto">
                <div className="text-[11px] text-[#73675F]">MÃ ĐƠN HÀNG / THAM CHIẾU</div>
                <div className="text-xl font-mono font-extrabold text-[#8D4B1A] tracking-wider">
                  {candidate.orderCode || candidate.code}
                </div>
                {candidate.orderCode && candidate.code && (
                  <div className="text-[11px] text-[#73675F]">
                    Mã KH: <span className="font-semibold">{candidate.code}</span>
                  </div>
                )}
                <div className="text-[11px] text-[#73675F] mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>

            {/* 2. Bill Title */}
            <div className="text-center py-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#2C241E] tracking-tight uppercase">
                PHIẾU ĐĂNG KÝ KHÓA HỌC & THÔNG BÁO NỘP HỌC PHÍ
              </h1>
              <p className="text-xs text-[#73675F] mt-1">
                Chứng từ ghi nhận thông tin đăng ký nhập học & thông tin chuyển khoản ngân hàng tự động
              </p>
            </div>

            {/* 3. Student & Course Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: Student Details */}
              <div className="bg-[#FAF5EF] rounded-xl p-4 border border-[#EFE4D9] space-y-2">
                <div className="font-bold text-[#8D4B1A] text-[13px] border-b border-[#EFE4D9] pb-1.5 mb-2">
                  1. THÔNG TIN HỌC VIÊN
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Họ và tên:</span>
                  <span className="font-bold text-[#2C241E]">{candidate.name}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Mã khách hàng:</span>
                  <span className="font-mono font-bold text-[#8D4B1A] bg-amber-100 px-1.5 py-0.5 rounded">
                    {candidate.code}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Số điện thoại:</span>
                  <span className="font-semibold text-[#2C241E]">{candidate.phone}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Chi nhánh đào tạo:</span>
                  <span className="text-[#2C241E] font-medium">{candidate.branch || 'Quận 3 - TP.HCM'}</span>
                </div>
              </div>

              {/* Right Column: Course Details */}
              <div className="bg-[#FAF5EF] rounded-xl p-4 border border-[#EFE4D9] space-y-2">
                <div className="font-bold text-[#8D4B1A] text-[13px] border-b border-[#EFE4D9] pb-1.5 mb-2">
                  2. THÔNG TIN KHÓA ĐÀO TẠO
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Khóa học:</span>
                  <span className="font-bold text-[#2C241E] text-right">{candidate.program}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Đợt lớp:</span>
                  <span className="text-[#2C241E] font-medium">{candidate.classBatch}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Thời khóa biểu:</span>
                  <span className="text-[#2C241E] font-medium">{candidate.schedule || 'Thứ 6 - 7 - CN'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#73675F]">Khai giảng:</span>
                  <span className="text-[#2C241E] font-medium">{candidate.startDate || 'Theo thông báo'}</span>
                </div>
              </div>
            </div>

            {/* 4. Tuition Summary Table */}
            <div className="border border-[#EFE4D9] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F3E2CE] text-[#73675F] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Khoản mục</th>
                    <th className="py-2.5 px-4 text-center">Đơn vị</th>
                    <th className="py-2.5 px-4 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9]">
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2C241E]">{candidate.program}</div>
                      <div className="text-[11px] text-[#73675F]">Đã bao gồm giáo trình, thực hành máy và chứng chỉ tốt nghiệp</div>
                    </td>
                    <td className="py-3 px-4 text-center text-[#73675F]">Khóa trọn gói</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#2C241E]">
                      {rawTuition.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                  {candidate.amountPaid > 0 && (
                    <tr className="bg-emerald-50/50">
                      <td className="py-2.5 px-4 text-emerald-800 font-medium">Đã thanh toán trước đó:</td>
                      <td className="py-2.5 px-4 text-center text-emerald-700">Đã thu</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                        -{candidate.amountPaid.toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  )}
                  <tr className="bg-[#FAF5EF] font-bold text-[13px]">
                    <td className="py-3 px-4 text-[#8D4B1A]">SỐ TIỀN CẦN THANH TOÁN:</td>
                    <td className="py-3 px-4 text-center text-[#8D4B1A]">VNĐ</td>
                    <td className="py-3 px-4 text-right text-lg text-[#8D4B1A]">
                      {amountToPay.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. VietQR & Bank Transfer Instructions */}
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
                    * Hệ thống sẽ tự động đối soát theo <strong>Mã khách hàng</strong> và số tiền chuyển khoản để tự động duyệt học viên vào khóa học ngay sau khi tiền về.
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Signatures */}
            <div className="grid grid-cols-2 pt-6 text-center text-xs">
              <div>
                <div className="font-bold text-[#2C241E]">NGƯỜI LẬP PHIẾU</div>
                <div className="text-[11px] text-[#73675F] italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center">
                  <span className="text-xs text-[#73675F] italic font-medium">Bộ phận Tuyển sinh MLD</span>
                </div>
              </div>

              <div>
                <div className="font-bold text-[#2C241E]">HỌC VIÊN ĐĂNG KÝ</div>
                <div className="text-[11px] text-[#73675F] italic mt-0.5">(Ký và xác nhận thông tin)</div>
                <div className="h-16 flex items-end justify-center">
                  <span className="text-xs text-[#2C241E] font-bold">{candidate.name}</span>
                </div>
              </div>
            </div>
          </div>
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
              <span>{isChecking ? 'Đang kiểm tra giao dịch...' : 'Kiểm tra tiền về (Đối soát)'}</span>
            </button>

            {/* Nút 2: Duyệt tại quầy */}
            {!isApproved && (
              <button
                type="button"
                disabled={isApproving}
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isApproving ? 'Đang duyệt...' : 'Duyệt & Thu tiền tại quầy'}</span>
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
