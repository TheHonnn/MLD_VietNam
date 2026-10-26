import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  QrCode,
  Printer,
  Search,
  Filter,
  Plus,
  Calendar,
  User,
  GraduationCap,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  Check,
  Building,
} from 'lucide-react';
import { academyService } from '../services';
import { StudentCertificate, CertificateStatus } from '../types/shared_types';
import { toast } from '../components/common';

export const W16_Certificates: React.FC = () => {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCert, setSelectedCert] = useState<StudentCertificate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);

  // Form cấp mới GCN
  const [formData, setFormData] = useState({
    studentName: '',
    dateOfBirth: '',
    courseTitle: 'Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)',
    theoryScore: 9.0,
    practicalScore: 9.5,
    finalGrade: 'XUẤT SẮC',
    signerName: 'BS. CKI Trần Hoàng Nam',
    signerTitle: 'Chủ Tịch Hội Đồng Y Khoa MLD',
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      const res = await academyService.getCertificates();
      if (res.success && res.data) {
        setCertificates(res.data);
      } else {
        toast.error('Không thể tải danh sách Giấy chứng nhận');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối khi tải Giấy chứng nhận');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCerts = useMemo(() => {
    return certificates.filter((c) => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const kw = searchKeyword.toLowerCase();
      const matchSearch =
        !searchKeyword ||
        c.studentName.toLowerCase().includes(kw) ||
        c.certificateCode.toLowerCase().includes(kw) ||
        c.courseTitle.toLowerCase().includes(kw);
      return matchStatus && matchSearch;
    });
  }, [certificates, statusFilter, searchKeyword]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = certificates.length;
    const issued = certificates.filter((c) => c.status === CertificateStatus.ISSUED).length;
    const excellent = certificates.filter((c) => c.finalGrade === 'XUẤT SẮC').length;
    const revoked = certificates.filter((c) => c.status === CertificateStatus.REVOKED).length;
    return { total, issued, excellent, revoked };
  }, [certificates]);

  const handleOpenPreview = (cert: StudentCertificate) => {
    setSelectedCert(cert);
    setShowPreviewModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRevoke = async (cert: StudentCertificate) => {
    if (!window.confirm(`Xác nhận thu hồi Giấy chứng nhận ${cert.certificateCode} của học viên ${cert.studentName}?`)) {
      return;
    }
    try {
      const res = await academyService.revokeCertificate(cert.id, 'Thu hồi theo yêu cầu hội đồng');
      if (res.success) {
        toast.success(`Đã thu hồi Giấy chứng nhận ${cert.certificateCode}`);
        loadCertificates();
      } else {
        toast.error('Thu hồi không thành công');
      }
    } catch {
      toast.error('Lỗi khi thu hồi Giấy chứng nhận');
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.courseTitle.trim()) {
      toast.error('Vui lòng điền đầy đủ Tên học viên và Khóa học');
      return;
    }

    try {
      const res = await academyService.issueCertificate({
        studentName: formData.studentName.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        courseTitle: formData.courseTitle.trim(),
        theoryScore: Number(formData.theoryScore),
        practicalScore: Number(formData.practicalScore),
        finalGrade: formData.finalGrade,
        signerName: formData.signerName.trim(),
        signerTitle: formData.signerTitle.trim(),
        status: CertificateStatus.ISSUED,
      });

      if (res.success && res.data) {
        toast.success(`Cấp thành công Giấy chứng nhận: ${res.data.certificateCode}`);
        setShowIssueModal(false);
        setFormData({
          studentName: '',
          dateOfBirth: '',
          courseTitle: 'Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)',
          theoryScore: 9.0,
          practicalScore: 9.5,
          finalGrade: 'XUẤT SẮC',
          signerName: 'BS. CKI Trần Hoàng Nam',
          signerTitle: 'Chủ Tịch Hội Đồng Y Khoa MLD',
        });
        loadCertificates();
      } else {
        toast.error('Không thể cấp Giấy chứng nhận mới');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cấp Giấy chứng nhận');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Quản Lý & Cấp Giấy Chứng Nhận Chuẩn Y Khoa
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Chứng chỉ số điện tử tích hợp mã QR tra cứu tính minh bạch & chống giả mạo Viện MLD Việt Nam
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCertificates}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Cấp Giấy chứng nhận mới
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số GCN</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã cấp hợp lệ</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.issued}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tốt nghiệp Xuất sắc</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.excellent}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Thu hồi / Hủy</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.revoked}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên, số hiệu GCN, khóa học..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value={CertificateStatus.ISSUED}>Hợp lệ (ISSUED)</option>
            <option value={CertificateStatus.REVOKED}>Đã thu hồi (REVOKED)</option>
          </select>
        </div>
      </div>

      {/* CERTIFICATES TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Số hiệu GCN</th>
                <th className="py-3.5 px-4">Học viên</th>
                <th className="py-3.5 px-4">Chương trình đào tạo</th>
                <th className="py-3.5 px-4">Điểm số & Xếp loại</th>
                <th className="py-3.5 px-4">Ngày cấp</th>
                <th className="py-3.5 px-4">Người ký duyệt</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-2"></div>
                    <p>Đang tải dữ liệu Giấy chứng nhận...</p>
                  </td>
                </tr>
              ) : filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600">Không tìm thấy Giấy chứng nhận phù hợp</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc thêm Giấy chứng nhận mới</p>
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-sky-600" />
                        {cert.certificateCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{cert.studentName}</div>
                      {cert.dateOfBirth && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          NS: {cert.dateOfBirth}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-gray-800 font-medium line-clamp-2" title={cert.courseTitle}>
                        {cert.courseTitle}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            cert.finalGrade === 'XUẤT SẮC'
                              ? 'bg-blue-100 text-blue-800'
                              : cert.finalGrade === 'GIỎI'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cert.finalGrade}
                        </span>
                        {cert.practicalScore && (
                          <span className="text-xs text-gray-500">({cert.practicalScore}đ TH)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{cert.issueDate}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-gray-800 font-medium">{cert.signerName || 'BS. CKI Trần Hoàng Nam'}</div>
                      <div className="text-[11px] text-gray-400">{cert.signerTitle || 'Hội đồng Y khoa'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {cert.status === CertificateStatus.ISSUED ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Hợp lệ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Đã thu hồi
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenPreview(cert)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                          title="Xem bản in & QR code"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem & In GCN
                        </button>
                        {cert.status === CertificateStatus.ISSUED && (
                          <button
                            onClick={() => handleRevoke(cert)}
                            className="px-2 py-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium transition"
                            title="Thu hồi Giấy chứng nhận"
                          >
                            Thu hồi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL XEM TRƯỚC BẢN PHÔI GIẤY CHỨNG NHẬN CHUẨN Y KHOA                     */}
      {/* ========================================================================= */}
      {showPreviewModal && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Phôi Giấy Chứng Nhận Điện Tử Chuẩn Y Khoa
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  In / Xuất PDF
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* CERTIFICATE PRINTABLE AREA */}
            <div
              ref={printRef}
              className="relative p-10 bg-amber-50/20 border-8 border-double border-amber-600/40 rounded-xl shadow-inner text-center font-serif text-gray-900 space-y-5"
              style={{
                backgroundImage: 'radial-gradient(#e0f2fe 0.75px, transparent 0.75px)',
                backgroundSize: '24px 24px',
              }}
            >
              {/* Corner Ornaments */}
              <div className="absolute top-3 left-3 text-amber-700/60 font-mono text-xs">◆ MLD MEDICAL ACADEMY ◆</div>
              <div className="absolute top-3 right-3 text-amber-700/60 font-mono text-xs">◆ ISO 9001:2015 ◆</div>
              <div className="absolute bottom-3 left-3 text-gray-400 font-mono text-[10px]">
                Sổ vào sổ cấp bằng: {selectedCert.certificateCode}
              </div>
              <div className="absolute bottom-3 right-3 text-gray-400 font-mono text-[10px]">
                Bảo hộ độc quyền Viện MLD
              </div>

              {/* National Header */}
              <div className="space-y-1">
                <p className="text-xs font-bold tracking-widest text-gray-700 uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </p>
                <p className="text-xs font-semibold text-gray-600 tracking-wider">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <div className="w-24 h-0.5 bg-gray-400 mx-auto mt-1"></div>
              </div>

              {/* Institute Name */}
              <div className="pt-2">
                <h4 className="text-sm font-bold tracking-wider text-sky-800 uppercase">
                  VIỆN TRỊ LIỆU & ĐÀO TẠO KỸ THUẬT DẪN LƯU BẠCH HUYẾT MLD VIỆT NAM
                </h4>
                <p className="text-xs text-gray-500 italic">MLD Vietnam Academy of Manual Lymphatic Drainage Therapy</p>
              </div>

              {/* Title Certificate */}
              <div className="pt-4 pb-2">
                <h2 className="text-3xl font-extrabold text-amber-800 tracking-widest uppercase">
                  GIẤY CHỨNG NHẬN
                </h2>
                <p className="text-sm tracking-wider text-gray-600 uppercase font-sans mt-0.5">
                  CERTIFICATE OF CLINICAL EXCELLENCE
                </p>
              </div>

              {/* Body Content */}
              <div className="space-y-3 py-2 max-w-xl mx-auto">
                <p className="text-sm text-gray-600 italic">Chứng nhận học viên:</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-wide text-sky-950 uppercase border-b-2 border-sky-800/20 pb-1 inline-block min-w-[280px]">
                  {selectedCert.studentName}
                </h3>
                {selectedCert.dateOfBirth && (
                  <p className="text-xs text-gray-600 font-sans">
                    Sinh ngày: <span className="font-semibold">{selectedCert.dateOfBirth}</span>
                  </p>
                )}

                <p className="text-sm text-gray-700 pt-2 leading-relaxed">
                  Đã hoàn thành xuất sắc chương trình đào tạo & đánh giá thực hành lâm sàng:
                </p>
                <p className="text-lg font-bold text-sky-900 font-sans px-4 py-1.5 bg-sky-50 rounded-lg border border-sky-200">
                  {selectedCert.courseTitle}
                </p>

                <div className="flex items-center justify-center gap-6 text-xs font-sans text-gray-700 pt-1">
                  {selectedCert.theoryScore !== null && selectedCert.theoryScore !== undefined && (
                    <span>Lý thuyết: <strong>{selectedCert.theoryScore} / 10</strong></span>
                  )}
                  {selectedCert.practicalScore !== null && selectedCert.practicalScore !== undefined && (
                    <span>Thực hành lâm sàng: <strong>{selectedCert.practicalScore} / 10</strong></span>
                  )}
                  <span>Xếp loại: <strong className="text-sky-700 font-bold">{selectedCert.finalGrade}</strong></span>
                </div>
              </div>

              {/* Footer Signatures & QR */}
              <div className="grid grid-cols-3 items-end pt-6 gap-4 text-xs font-sans">
                {/* QR Code */}
                <div className="text-left space-y-1">
                  <div className="w-24 h-24 p-1 bg-white border border-gray-300 rounded-lg shadow-sm flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-sky-900" />
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">Quét mã QR tra cứu văn bằng gốc</p>
                  <p className="text-[10px] text-gray-400 font-mono break-all">{selectedCert.qrVerificationCode}</p>
                </div>

                {/* Seal Icon */}
                <div className="text-center pb-2">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-red-600 flex items-center justify-center text-red-600 font-bold text-[10px] uppercase leading-tight rotate-[-12deg] opacity-80">
                    HỘI ĐỒNG<br />Y KHOA<br />MLD VN
                  </div>
                </div>

                {/* Signer */}
                <div className="text-right space-y-1">
                  <p className="text-gray-600">Hà Nội, ngày {selectedCert.issueDate}</p>
                  <p className="font-bold text-gray-800 uppercase">{selectedCert.signerTitle || 'Hội Đồng Y Khoa'}</p>
                  <div className="h-12 flex items-center justify-end">
                    <span className="font-serif italic text-lg text-sky-900 pr-2">Tran Hoang Nam</span>
                  </div>
                  <p className="font-bold text-gray-900">{selectedCert.signerName || 'BS. CKI Trần Hoàng Nam'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CẤP MỚI GIẤY CHỨNG NHẬN                                             */}
      {/* ========================================================================= */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-gray-900">Cấp Giấy Chứng Nhận Mới</h3>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Họ và tên học viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Ngày tháng năm sinh
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Chương trình đào tạo *
                </label>
                <select
                  value={formData.courseTitle}
                  onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)">
                    Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)
                  </option>
                  <option value="Trị Liệu Thoát Phù & Phục Hồi Sau Phẫu Thuật">
                    Trị Liệu Thoát Phù & Phục Hồi Sau Phẫu Thuật
                  </option>
                  <option value="Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết">
                    Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết
                  </option>
                  <option value="Kỹ Thuật MLD Cơ Bản Cho Kỹ Thuật Viên Mới">
                    Kỹ Thuật MLD Cơ Bản Cho Kỹ Thuật Viên Mới
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Điểm lý thuyết (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.theoryScore}
                    onChange={(e) => setFormData({ ...formData, theoryScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Điểm thực hành (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.practicalScore}
                    onChange={(e) => setFormData({ ...formData, practicalScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Xếp loại tốt nghiệp
                </label>
                <select
                  value={formData.finalGrade}
                  onChange={(e) => setFormData({ ...formData, finalGrade: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="XUẤT SẮC">XUẤT SẮC</option>
                  <option value="GIỎI">GIỎI</option>
                  <option value="KHÁ">KHÁ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Người ký duyệt
                  </label>
                  <input
                    type="text"
                    value={formData.signerName}
                    onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chức danh người ký
                  </label>
                  <input
                    type="text"
                    value={formData.signerTitle}
                    onChange={(e) => setFormData({ ...formData, signerTitle: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Cấp & Tạo QR Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default W16_Certificates;
