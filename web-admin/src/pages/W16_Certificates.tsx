import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
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
  Download,
  AlertCircle,
  X,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { academyService } from '../services';
import { exportElementToPdf } from '../utils/pdfExport';
import {
  StudentCertificate,
  CertificateStatus,
  Course,
  CourseEnrollment,
} from '../types/shared_types';
import { toast } from '../components/common';

export const W16_Certificates: React.FC = () => {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  
  // Modals
  const [selectedCert, setSelectedCert] = useState<StudentCertificate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [certToRevoke, setCertToRevoke] = useState<StudentCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');

  // Generated dynamic QR Data URL for preview
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');

  // Form cấp mới GCN chuyên sâu
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    dateOfBirth: '',
    courseId: '',
    courseTitle: 'Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)',
    theoryScore: 9.0,
    practicalScore: 9.5,
    finalGrade: 'XUẤT SẮC',
    signerName: 'BS. CKI Trần Hoàng Nam',
    signerTitle: 'Chủ Tịch Hội Đồng Y Khoa MLD',
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [certRes, crsRes, enrRes] = await Promise.all([
        academyService.getCertificates(),
        academyService.getCourses(),
        academyService.getEnrollments(),
      ]);

      if (certRes.success && certRes.data) {
        setCertificates(certRes.data);
      }
      if (crsRes.success && crsRes.data) {
        setCourses(crsRes.data);
      }
      if (enrRes.success && enrRes.data) {
        setEnrollments(enrRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu Giấy chứng nhận');
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động tính xếp loại khi điểm thay đổi
  useEffect(() => {
    const avg = (Number(formData.theoryScore) + Number(formData.practicalScore)) / 2;
    let grade = 'KHÁ';
    if (avg >= 9.0) grade = 'XUẤT SẮC';
    else if (avg >= 8.0) grade = 'GIỎI';
    else if (avg >= 7.0) grade = 'KHÁ';
    else grade = 'CHƯA ĐẠT';

    setFormData((prev) => ({ ...prev, finalGrade: grade }));
  }, [formData.theoryScore, formData.practicalScore]);

  // Sinh QR code thực sự khi mở bản xem trước
  useEffect(() => {
    if (selectedCert) {
      const verifyUrl = selectedCert.qrVerificationCode || `https://mldvietnam.vn/verify/${selectedCert.certificateCode}`;
      QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 1,
        color: {
          dark: '#082f49', // Navy y tế đậm
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setPreviewQrDataUrl(url))
        .catch((err) => console.error('Lỗi sinh QR Code:', err));
    }
  }, [selectedCert]);

  // Lọc danh sách GCN
  const filteredCerts = useMemo(() => {
    return certificates.filter((c) => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchGrade = gradeFilter === 'ALL' || c.finalGrade === gradeFilter;
      const kw = searchKeyword.toLowerCase();
      const matchSearch =
        !searchKeyword ||
        c.studentName.toLowerCase().includes(kw) ||
        c.certificateCode.toLowerCase().includes(kw) ||
        c.courseTitle.toLowerCase().includes(kw);
      return matchStatus && matchGrade && matchSearch;
    });
  }, [certificates, statusFilter, gradeFilter, searchKeyword]);

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

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || !selectedCert) return;
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(printRef.current, {
        fileName: `GCN_MLD_${selectedCert.certificateCode}_${(selectedCert.studentName || 'HocVien').replace(/\s+/g, '_')}`,
        orientation: 'landscape',
        format: 'a4',
        scale: 2.5,
      });
      toast.success('Xuất file thành công', `Đã tải về Giấy chứng nhận ${selectedCert.certificateCode}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Lỗi xuất PDF', 'Không thể tạo file PDF giấy chứng nhận.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenRevoke = (cert: StudentCertificate) => {
    setCertToRevoke(cert);
    setRevokeReason('');
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certToRevoke) return;
    if (!revokeReason.trim()) {
      toast.error('Vui lòng nhập lý do thu hồi Giấy chứng nhận');
      return;
    }

    try {
      const res = await academyService.revokeCertificate(certToRevoke.id, revokeReason.trim());
      if (res.success) {
        toast.success(`Đã thu hồi Giấy chứng nhận ${certToRevoke.certificateCode}`);
        setShowRevokeModal(false);
        setCertToRevoke(null);
        loadAllData();
      } else {
        toast.error('Thu hồi không thành công');
      }
    } catch {
      toast.error('Lỗi kết nối khi thu hồi Giấy chứng nhận');
    }
  };

  const handleSelectEnrollment = (enrId: string) => {
    const found = enrollments.find((e) => e.id === enrId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        studentId: found.studentId,
        studentName: found.student?.fullName || '',
        courseId: found.courseId,
        courseTitle: found.course?.title || prev.courseTitle,
      }));
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.courseTitle.trim()) {
      toast.error('Vui lòng điền đầy đủ Tên học viên và Khóa học');
      return;
    }

    const avg = (Number(formData.theoryScore) + Number(formData.practicalScore)) / 2;
    if (avg < 7.0) {
      if (!window.confirm('Điểm trung bình dưới 7.0 (Chưa đạt chuẩn). Bạn có chắc chắn muốn đặc cách cấp GCN?')) {
        return;
      }
    }

    // Sinh mã tự động chuẩn y tế
    const year = new Date().getFullYear();
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const code = `MLD-GCN-${year}-${randomHex}`;

    try {
      const res = await academyService.issueCertificate({
        studentId: formData.studentId || undefined,
        studentName: formData.studentName.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        courseId: formData.courseId || undefined,
        courseTitle: formData.courseTitle.trim(),
        certificateCode: code,
        qrVerificationCode: `https://mldvietnam.vn/verify/${code}`,
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
          studentId: '',
          studentName: '',
          dateOfBirth: '',
          courseId: '',
          courseTitle: courses[0]?.title || 'Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)',
          theoryScore: 9.0,
          practicalScore: 9.5,
          finalGrade: 'XUẤT SẮC',
          signerName: 'BS. CKI Trần Hoàng Nam',
          signerTitle: 'Chủ Tịch Hội Đồng Y Khoa MLD',
        });
        loadAllData();
      } else {
        toast.error('Không thể cấp Giấy chứng nhận mới');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối khi cấp Giấy chứng nhận');
    }
  };

  // Xuất CSV danh sách Giấy chứng nhận
  const handleExportCSV = () => {
    if (filteredCerts.length === 0) {
      toast.error('Không có dữ liệu để xuất file');
      return;
    }

    const headers = [
      'Mã GCN',
      'Họ và Tên Học Viên',
      'Ngày Sinh',
      'Chương Trình Đào Tạo',
      'Điểm Lý Thuyết',
      'Điểm Thực Hành',
      'Xếp Loại',
      'Ngày Cấp',
      'Người Ký Duyệt',
      'Trạng Thái',
      'Link Tra Cứu QR',
    ];

    const rows = filteredCerts.map((c) => [
      `"${c.certificateCode}"`,
      `"${c.studentName}"`,
      `"${c.dateOfBirth || ''}"`,
      `"${c.courseTitle}"`,
      c.theoryScore ?? '',
      c.practicalScore ?? '',
      `"${c.finalGrade}"`,
      `"${c.issueDate}"`,
      `"${c.signerName || ''}"`,
      `"${c.status === CertificateStatus.ISSUED ? 'Hợp lệ' : 'Đã thu hồi'}"`,
      `"${c.qrVerificationCode}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MLD_Danh_Sach_Giay_Chung_Nhan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất file CSV Giấy chứng nhận thành công');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* STYLE ISOLATION CHO CHẾ ĐỘ IN ẤN A4 NGANG (PRINT MODE) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible !important;
          }
          #printable-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 24px !important;
            border: 12px double #b45309 !important;
            background: white !important;
            box-shadow: none !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-100 shadow-xs">
              <Award className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Quản Lý & Cấp Giấy Chứng Nhận Chuẩn Y Khoa
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  ISO 9001:2015
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Chứng chỉ số điện tử tích hợp mã QR tra cứu tính minh bạch & chống làm giả mạo của Viện MLD Việt Nam
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Xuất Excel/CSV
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Cấp Giấy chứng nhận mới
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số Giấy chứng nhận</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã cấp hợp lệ (Active)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.issued}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tốt nghiệp Xuất sắc</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.excellent}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã thu hồi / Hủy bỏ</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.revoked}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên, số hiệu GCN, khóa đào tạo..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            Lọc:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value={CertificateStatus.ISSUED}>Hợp lệ (ISSUED)</option>
            <option value={CertificateStatus.REVOKED}>Đã thu hồi (REVOKED)</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả xếp loại</option>
            <option value="XUẤT SẮC">XUẤT SẮC</option>
            <option value="GIỎI">GIỎI</option>
            <option value="KHÁ">KHÁ</option>
          </select>
        </div>
      </div>

      {/* CERTIFICATES TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Số hiệu văn bằng</th>
                <th className="py-3.5 px-4">Học viên & Ngày sinh</th>
                <th className="py-3.5 px-4">Chương trình đào tạo</th>
                <th className="py-3.5 px-4">Điểm số & Xếp loại</th>
                <th className="py-3.5 px-4">Ngày cấp</th>
                <th className="py-3.5 px-4">Hội đồng ký duyệt</th>
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
                    <p className="font-semibold text-gray-700">Không tìm thấy Giấy chứng nhận nào</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc cấp mới Giấy chứng nhận</p>
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-sky-700">
                        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                        {cert.certificateCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{cert.studentName}</div>
                      {cert.dateOfBirth && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          NS: {cert.dateOfBirth}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-gray-800 font-medium line-clamp-2 leading-snug" title={cert.courseTitle}>
                        {cert.courseTitle}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                            cert.finalGrade === 'XUẤT SẮC'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : cert.finalGrade === 'GIỎI'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {cert.finalGrade}
                        </span>
                        {(cert.theoryScore !== null || cert.practicalScore !== null) && (
                          <div className="text-[11px] text-gray-500 font-mono">
                            LT: {cert.theoryScore ?? '-'}đ · TH: {cert.practicalScore ?? '-'}đ
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap font-mono text-xs">
                      {cert.issueDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-gray-900">{cert.signerName || 'BS. CKI Trần Hoàng Nam'}</div>
                      <div className="text-[11px] text-gray-500 truncate max-w-[140px]">{cert.signerTitle || 'Hội đồng Y khoa'}</div>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPreview(cert)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Xem bản in phôi y tế & QR code"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem & In
                        </button>
                        {cert.status === CertificateStatus.ISSUED && (
                          <button
                            onClick={() => handleOpenRevoke(cert)}
                            className="px-2 py-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium transition"
                            title="Thu hồi Giấy chứng nhận này"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Award className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Phôi Giấy Chứng Nhận Điện Tử Chuẩn Y Khoa
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">Số hiệu: {selectedCert.certificateCode}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                  title="Tải trực tiếp tệp PDF chuẩn in A4 ngang về máy tính"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Tải file PDF (A4)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In trực tiếp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* CERTIFICATE PRINTABLE AREA */}
            <div
              id="printable-certificate"
              ref={printRef}
              className="relative p-10 bg-gradient-to-br from-amber-50/30 via-white to-sky-50/20 border-8 border-double border-amber-600/40 rounded-2xl shadow-inner text-center font-serif text-gray-900 space-y-5"
            >
              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 text-amber-800/60 font-mono text-xs tracking-wider">◆ VIỆN ĐÀO TẠO MLD VIỆT NAM ◆</div>
              <div className="absolute top-4 right-4 text-amber-800/60 font-mono text-xs tracking-wider">◆ CHUẨN QUỐC TẾ ISO 9001:2015 ◆</div>
              <div className="absolute bottom-4 left-4 text-gray-500 font-mono text-[11px]">
                Sổ vào sổ cấp GCN: <strong className="text-gray-800">{selectedCert.certificateCode}</strong>
              </div>
              <div className="absolute bottom-4 right-4 text-gray-500 font-mono text-[11px]">
                Hệ thống xác thực điện tử bảo hộ độc quyền
              </div>

              {/* National Header */}
              <div className="space-y-1">
                <p className="text-xs font-bold tracking-widest text-gray-800 uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </p>
                <p className="text-xs font-semibold text-gray-600 tracking-wider">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <div className="w-28 h-0.5 bg-amber-700/50 mx-auto mt-1"></div>
              </div>

              {/* Institute Name */}
              <div className="pt-2">
                <h4 className="text-sm font-bold tracking-wider text-sky-900 uppercase">
                  VIỆN TRỊ LIỆU & ĐÀO TẠO KỸ THUẬT DẪN LƯU BẠCH HUYẾT MLD VIỆT NAM
                </h4>
                <p className="text-xs text-gray-500 italic mt-0.5">
                  MLD Vietnam Institute of Manual Lymphatic Drainage & Clinical Therapy
                </p>
              </div>

              {/* Title Certificate */}
              <div className="pt-3 pb-1">
                <h2 className="text-3xl font-extrabold text-amber-800 tracking-widest uppercase">
                  GIẤY CHỨNG NHẬN
                </h2>
                <p className="text-xs tracking-widest text-sky-800 uppercase font-sans font-bold mt-1">
                  CERTIFICATE OF CLINICAL EXCELLENCE & PROFESSIONAL PRACTICE
                </p>
              </div>

              {/* Body Content */}
              <div className="space-y-3 py-2 max-w-xl mx-auto">
                <p className="text-xs text-gray-600 italic">Hội đồng Chuyên môn Y khoa MLD Việt Nam chứng nhận học viên:</p>
                <h3 className="text-2xl font-extrabold text-sky-950 tracking-wide uppercase border-b-2 border-amber-600/30 pb-1 inline-block min-w-[320px]">
                  {selectedCert.studentName}
                </h3>
                {selectedCert.dateOfBirth && (
                  <p className="text-xs text-gray-600 font-sans">
                    Sinh ngày: <span className="font-semibold text-gray-900">{selectedCert.dateOfBirth}</span>
                  </p>
                )}

                <p className="text-xs text-gray-700 pt-2 leading-relaxed">
                  Đã hoàn thành xuất sắc chương trình đào tạo & vượt qua kỳ kiểm tra thực hành lâm sàng:
                </p>
                <p className="text-base font-bold text-sky-900 font-sans px-4 py-2 bg-sky-50/80 rounded-xl border border-sky-200">
                  {selectedCert.courseTitle}
                </p>

                <div className="flex items-center justify-center gap-6 text-xs font-sans text-gray-700 pt-1">
                  {selectedCert.theoryScore !== null && selectedCert.theoryScore !== undefined && (
                    <span>Lý thuyết: <strong className="font-bold">{selectedCert.theoryScore} / 10</strong></span>
                  )}
                  {selectedCert.practicalScore !== null && selectedCert.practicalScore !== undefined && (
                    <span>Thực hành lâm sàng: <strong className="font-bold">{selectedCert.practicalScore} / 10</strong></span>
                  )}
                  <span>Xếp loại: <strong className="text-sky-800 font-bold px-2 py-0.5 bg-amber-100 rounded">{selectedCert.finalGrade}</strong></span>
                </div>
              </div>

              {/* Footer Signatures & Real Dynamic QR */}
              <div className="grid grid-cols-3 items-end pt-5 gap-4 text-xs font-sans">
                {/* QR Code */}
                <div className="text-left space-y-1.5">
                  <div className="w-24 h-24 p-1 bg-white border border-gray-300 rounded-xl shadow-xs flex items-center justify-center">
                    {previewQrDataUrl ? (
                      <img src={previewQrDataUrl} alt="QR Tra cứu" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-20 h-20 text-sky-900" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">Quét QR tra cứu văn bằng gốc</p>
                  <p className="text-[10px] text-sky-700 font-mono font-semibold break-all">
                    {selectedCert.certificateCode}
                  </p>
                </div>

                {/* Seal Icon */}
                <div className="text-center pb-2">
                  <div className="w-20 h-20 mx-auto rounded-full border-2 border-red-600/80 flex items-center justify-center text-red-600 font-bold text-[9px] uppercase leading-tight rotate-[-12deg] shadow-xs">
                    HỘI ĐỒNG<br />Y KHOA MLD<br />VIỆT NAM
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 italic">Con dấu điện tử xác thực</p>
                </div>

                {/* Signer */}
                <div className="text-right space-y-1">
                  <p className="text-gray-600 text-xs">Hà Nội, ngày {selectedCert.issueDate}</p>
                  <p className="font-bold text-gray-800 uppercase text-xs">
                    {selectedCert.signerTitle || 'Chủ Tịch Hội Đồng Y Khoa'}
                  </p>
                  <div className="h-12 flex items-center justify-end">
                    <span className="font-serif italic text-lg text-sky-900 pr-2">Tran Hoang Nam</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs">
                    {selectedCert.signerName || 'BS. CKI Trần Hoàng Nam'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CẤP MỚI GIẤY CHỨNG NHẬN CHUYÊN SÂU                                   */}
      {/* ========================================================================= */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-gray-900">Cấp Giấy Chứng Nhận Y Khoa Mới</h3>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              {/* Chọn từ danh sách ghi danh nếu có */}
              {enrollments.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chọn nhanh từ học viên đang ghi danh
                  </label>
                  <select
                    onChange={(e) => handleSelectEnrollment(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-sky-50/40"
                  >
                    <option value="">-- Hoặc nhập thông tin thủ công bên dưới --</option>
                    {enrollments.map((enr) => (
                      <option key={enr.id} value={enr.id}>
                        {enr.student?.fullName || 'Học viên'} - {enr.course?.title || 'Khóa học'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Chương trình đào tạo *
                </label>
                <select
                  value={formData.courseTitle}
                  onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {courses.map((crs) => (
                    <option key={crs.id} value={crs.title}>
                      {crs.title}
                    </option>
                  ))}
                  {courses.length === 0 && (
                    <>
                      <option value="Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)">
                        Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)
                      </option>
                      <option value="Trị Liệu Thoát Phù & Phục Hồi Sau Phẫu Thuật">
                        Trị Liệu Thoát Phù & Phục Hồi Sau Phẫu Thuật
                      </option>
                      <option value="Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết">
                        Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết
                      </option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Điểm lý thuyết (0 - 10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.theoryScore}
                    onChange={(e) => setFormData({ ...formData, theoryScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Điểm thực hành (0 - 10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.practicalScore}
                    onChange={(e) => setFormData({ ...formData, practicalScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Tự động xếp loại:</span>
                <span className="font-bold text-sky-800 px-2.5 py-1 bg-white rounded-lg border border-sky-200">
                  {formData.finalGrade}
                </span>
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Cấp & Tạo QR Tra Cứu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THU HỒI GIẤY CHỨNG NHẬN (CÓ NHẬP LÝ DO RÕ RÀNG)                      */}
      {/* ========================================================================= */}
      {showRevokeModal && certToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Xác Nhận Thu Hồi Giấy Chứng Nhận</h3>
                <p className="text-xs text-gray-500 font-mono">{certToRevoke.certificateCode}</p>
              </div>
            </div>

            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-1">
              <p>Học viên: <strong>{certToRevoke.studentName}</strong></p>
              <p>Khóa đào tạo: <strong>{certToRevoke.courseTitle}</strong></p>
              <p className="text-rose-700 pt-1">
                Lưu ý: Giấy chứng nhận sau khi thu hồi sẽ hiển thị trạng thái vô hiệu trên toàn hệ thống tra cứu QR công khai.
              </p>
            </div>

            <form onSubmit={handleConfirmRevoke} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Lý do thu hồi (Bắt buộc) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Ví dụ: Phát hiện gian lận thi cử / Thu hồi cấp đổi văn bằng mới..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevokeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Xác nhận Thu Hồi
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
