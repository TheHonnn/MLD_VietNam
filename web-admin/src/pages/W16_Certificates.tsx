import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  Calendar,
  GraduationCap,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  Download,
  Sliders,
  Palette,
  Sparkles,
  BookOpen,
  UserCheck,
  FileCheck,
  Printer,
  ChevronRight,
  Info,
} from 'lucide-react';
import { academyService } from '../services';
import CertificateTemplateEditor from '../components/certificates/CertificateTemplateEditor';
import CertificateDocumentPreview from '../components/certificates/CertificateDocumentPreview';
import {
  StudentCertificate,
  CertificateStatus,
  Course,
  CourseEnrollment,
} from '../types/shared_types';
import { toast } from '../components/common';

const STORAGE_KEY = 'mld.certificate-template.v2';

const defaultTemplateSettings = {
  organization: 'VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN CÔNG NGHỆ CSSK CỘNG ĐỒNG',
  institute: 'TRUNG TÂM ỨNG DỤNG KHOA HỌC BẠCH HUYẾT VIỆT NAM',
  title: 'CHỨNG NHẬN',
  subtitle: 'HOÀN THÀNH ĐÀO TẠO',
  intro: 'Chứng nhận này xác nhận rằng, học viên:',
  completion: 'Đã hoàn thành xuất sắc chương trình đào tạo:',
  framework: 'thuộc Khung đào tạo số 4 của MLD Việt Nam',
  location: 'Thành phố Hồ Chí Minh',
  primaryColor: '#0b43a8',
  titleSize: 56,
  showLogo: true,
  showWatermark: true,
  showFooterNotes: true,
  footerNotes: [
    'Chứng nhận này xác nhận học viên đã hoàn thành đầy đủ các yêu cầu đào tạo của cấp độ tương ứng theo quy định của chương trình.',
    'Chứng nhận này không đồng nghĩa với việc được phép giảng dạy, đào tạo, cấp chứng nhận hoặc chuyển giao phương pháp Dẫn lưu Bạch huyết Thủ công (MLD) cho người khác.',
    'Quyền giảng dạy và tư cách giảng viên chỉ được công nhận thông qua Chương trình Đào tạo Giảng viên chính thức và phải có sự phê duyệt bằng văn bản từ Hệ thống Đào tạo MLD Việt Nam.',
  ],
};

const DEFAULT_PREVIEW_CERTIFICATE: StudentCertificate = {
  id: 'preview-default',
  certificateCode: 'MLD-GCN-2026-0899',
  qrVerificationCode: 'https://mldvietnam.vn/verify/MLD-GCN-2026-0899',
  studentName: 'NGUYỄN THỊ THU HÀ',
  dateOfBirth: '1995-08-15',
  courseTitle: 'Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)',
  issueDate: new Date().toISOString().split('T')[0],
  finalGrade: 'XUẤT SẮC',
  theoryScore: 9.5,
  practicalScore: 9.8,
  signerName: 'ThS.BS Lâm Xuân Trường',
  signerTitle: 'GIÁM ĐỐC',
  status: CertificateStatus.ISSUED,
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '-';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

export const W16_Certificates: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'template' | 'issue'>('list');
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');

  // Modals & Selected items
  const [selectedCert, setSelectedCert] = useState<StudentCertificate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [issueCode, setIssueCode] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [certToRevoke, setCertToRevoke] = useState<StudentCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');

  // Form cấp mới GCN
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    dateOfBirth: '',
    courseId: '',
    courseTitle: '',
    theoryScore: 9.0,
    practicalScore: 9.5,
    finalGrade: 'XUẤT SẮC',
    signerName: 'ThS.BS Lâm Xuân Trường',
    signerTitle: 'GIÁM ĐỐC',
  });

  const makeCertificateCode = () => `MLD-GCN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const openIssueModal = () => {
    setIssueCode(makeCertificateCode());
    setShowIssueModal(true);
  };

  // Đọc cài đặt mẫu chứng nhận từ localStorage nếu có
  const currentTemplate = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultTemplateSettings;
      const parsed = JSON.parse(saved);
      return { ...defaultTemplateSettings, ...parsed };
    } catch {
      return defaultTemplateSettings;
    }
  }, [activeTab, showIssueModal, showPreviewModal]);

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
        if (crsRes.data.length > 0 && !formData.courseTitle) {
          setFormData((prev) => ({
            ...prev,
            courseId: crsRes.data[0].id,
            courseTitle: crsRes.data[0].title,
          }));
        }
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

  // Lọc danh sách GCN
  const filteredCerts = useMemo(() => {
    return certificates.filter((c) => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchGrade = gradeFilter === 'ALL' || c.finalGrade === gradeFilter;
      const matchCourse = courseFilter === 'ALL' || c.courseTitle === courseFilter;
      const kw = searchKeyword.trim().toLowerCase();
      const matchSearch =
        !kw ||
        c.studentName.toLowerCase().includes(kw) ||
        c.certificateCode.toLowerCase().includes(kw) ||
        c.courseTitle.toLowerCase().includes(kw);
      return matchStatus && matchGrade && matchCourse && matchSearch;
    });
  }, [certificates, statusFilter, gradeFilter, courseFilter, searchKeyword]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = certificates.length;
    const issued = certificates.filter((c) => c.status === CertificateStatus.ISSUED).length;
    const excellent = certificates.filter(
      (c) => c.finalGrade === 'XUẤT SẮC' || c.finalGrade === 'GIỎI'
    ).length;
    const revoked = certificates.filter((c) => c.status === CertificateStatus.REVOKED).length;
    return { total, issued, excellent, revoked };
  }, [certificates]);

  // Mở trình chỉnh sửa phôi cho một chứng nhận cụ thể
  const handleOpenPreview = (cert: StudentCertificate) => {
    setSelectedCert(cert);
    setShowPreviewModal(true);
  };

  // Mở trình chỉnh sửa phôi bản mẫu mặc định
  const handleOpenTemplateDesigner = () => {
    setSelectedCert(DEFAULT_PREVIEW_CERTIFICATE);
    setShowPreviewModal(true);
  };

  const handlePrint = () => {
    window.print();
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

  // Chọn học viên từ danh sách ghi danh
  const handleSelectEnrollment = (enrId: string) => {
    const found = enrollments.find((e) => e.id === enrId);
    if (found) {
      const matchedCourse = courses.find((c) => c.id === found.courseId);
      const studentName = found.studentName || (found as any).student?.fullName || '';
      setFormData((prev) => ({
        ...prev,
        studentId: found.studentId || '',
        studentName: studentName || prev.studentName,
        dateOfBirth: (found as any).student?.dateOfBirth || (found as any).dateOfBirth || prev.dateOfBirth,
        courseId: found.courseId || '',
        courseTitle: matchedCourse?.title || prev.courseTitle,
      }));
    }
  };

  // Nạp 2 dữ liệu chứng nhận mẫu thực tế khi chưa có dữ liệu
  const handleSeedSampleCertificates = async () => {
    setIsLoading(true);
    try {
      const year = new Date().getFullYear();
      const samples: Partial<StudentCertificate>[] = [
        {
          studentName: 'Nguyễn Thị Thu Hà',
          dateOfBirth: '1995-08-15',
          courseTitle: courses[0]?.title || 'Chương trình phát triển giảng viên và học thuật',
          certificateCode: `MLD-GCN-${year}-1028`,
          qrVerificationCode: `https://mldvietnam.vn/verify/MLD-GCN-${year}-1028`,
          theoryScore: 9.5,
          practicalScore: 9.8,
          finalGrade: 'XUẤT SẮC',
          signerName: 'ThS.BS Lâm Xuân Trường',
          signerTitle: 'GIÁM ĐỐC',
          status: CertificateStatus.ISSUED,
          issueDate: new Date().toISOString().split('T')[0],
        },
        {
          studentName: 'Trần Lan Anh',
          dateOfBirth: '1998-11-22',
          courseTitle: courses[1]?.title || 'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề',
          certificateCode: `MLD-GCN-${year}-1029`,
          qrVerificationCode: `https://mldvietnam.vn/verify/MLD-GCN-${year}-1029`,
          theoryScore: 8.8,
          practicalScore: 9.2,
          finalGrade: 'GIỎI',
          signerName: 'ThS.BS Lâm Xuân Trường',
          signerTitle: 'GIÁM ĐỐC',
          status: CertificateStatus.ISSUED,
          issueDate: new Date().toISOString().split('T')[0],
        },
      ];

      for (const sample of samples) {
        await academyService.issueCertificate(sample);
      }
      toast.success('Đã nạp 2 hồ sơ chứng nhận mẫu thực tế vào hệ thống');
      await loadAllData();
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      toast.error('Không thể tạo dữ liệu mẫu');
    } finally {
      setIsLoading(false);
    }
  };

  // Cấp chứng nhận mới
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.courseTitle.trim()) {
      toast.error('Vui lòng điền đầy đủ Tên học viên và Chương trình đào tạo');
      return;
    }

    const avg = (Number(formData.theoryScore) + Number(formData.practicalScore)) / 2;
    if (avg < 7.0) {
      if (!window.confirm('Điểm trung bình dưới 7.0 (Chưa đạt chuẩn). Bạn có chắc chắn muốn đặc cách cấp GCN?')) {
        return;
      }
    }

    const code = issueCode || makeCertificateCode();

    try {
      const payload: Partial<StudentCertificate> = {
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
        issueDate: new Date().toISOString().split('T')[0],
      };

      const res = await academyService.issueCertificate(payload);

      if (res.success && res.data) {
        toast.success(`Cấp thành công Giấy chứng nhận: ${res.data.certificateCode}`);
        setShowIssueModal(false);
        await loadAllData();
        // Mở ngay trình xem & in PDF cho chứng nhận vừa tạo
        setSelectedCert(res.data);
        setShowPreviewModal(true);
        setActiveTab('list');
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

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `MLD_Danh_Sach_Giay_Chung_Nhan_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất file CSV Giấy chứng nhận thành công');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans text-gray-900">
      <style>{`
        .certificate-tab-preview-header { background: linear-gradient(180deg, rgba(180,222,248,.82), rgba(255,255,255,.25)); }
        .certificate-tab-preview-footer { isolation: isolate; }
        .certificate-tab-preview-footer::before { content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.04) 42%); }
        .certificate-tab-preview-mountain { position: absolute; inset-inline: -2%; bottom: -1px; z-index: 0; height: 88%; pointer-events: none; filter: blur(1.5px); }
        .certificate-tab-preview-mountain-back { opacity: .72; background: linear-gradient(180deg, #e6f7fb 0%, #a6e0ea 100%); clip-path: polygon(0 28%, 8% 25%, 16% 5%, 23% 12%, 31% 35%, 43% 28%, 54% 7%, 64% 23%, 73% 31%, 82% 10%, 91% 23%, 100% 19%, 100% 100%, 0 100%); }
        .certificate-tab-preview-mountain-mid { opacity: .86; background: linear-gradient(180deg, #8bd6e2 0%, #5caec4 100%); clip-path: polygon(0 47%, 11% 42%, 19% 28%, 30% 45%, 39% 53%, 51% 31%, 62% 48%, 74% 34%, 84% 48%, 95% 37%, 100% 41%, 100% 100%, 0 100%); }
        .certificate-tab-preview-mountain-front { background: linear-gradient(180deg, #4eaa76 0%, #126274 100%); clip-path: polygon(0 72%, 12% 61%, 25% 74%, 38% 57%, 50% 63%, 63% 43%, 76% 58%, 87% 68%, 100% 54%, 100% 100%, 0 100%); }
        .certificate-header-org-fit { font-size: clamp(6px, 1.02vw, 10.5px); letter-spacing: -0.015em; white-space: nowrap; }
        .certificate-header-inst-fit { font-size: clamp(5.5px, 0.95vw, 9.8px); letter-spacing: -0.015em; white-space: nowrap; }
      `}</style>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold border border-sky-100 shadow-xs shrink-0">
              <Award className="w-6 h-6 text-sky-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Quản Lý & Cấp Giấy Chứng Nhận MLD
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  Khung Đào Tạo Số 4 · MLD Việt Nam
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Hệ thống chứng nhận chuẩn hóa Viện NC&PT Công Nghệ CSSK Cộng Đồng, tích hợp công cụ in PDF A4 và mã QR tra cứu tính minh bạch.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenTemplateDesigner}
            className="flex items-center gap-2 px-3.5 py-2 border border-sky-300 text-sky-800 bg-sky-50/70 hover:bg-sky-100 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs"
            title="Mở trình tùy chỉnh phôi chứng nhận, thay đổi nội dung, màu sắc và in thử"
          >
            <Sliders className="w-4 h-4 text-sky-700" />
            Thiết kế phôi mẫu
          </button>
          <button
            type="button"
            onClick={openIssueModal}
            className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Cấp Giấy chứng nhận mới
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
            title="Xuất danh sách chứng nhận ra file CSV"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Xuất Excel/CSV
          </button>
          <button
            type="button"
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
            title="Làm mới dữ liệu từ Supabase Cloud"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tổng số GCN</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Đã cấp hợp lệ</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.issued}</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tốt nghiệp Xuất sắc/Giỏi</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{stats.excellent}</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Đã thu hồi / Hủy</p>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">{stats.revoked}</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
            activeTab === 'list'
              ? 'border-sky-700 text-sky-800 bg-sky-50/50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Danh sách chứng nhận đã cấp
          <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-200 text-gray-800">
            {certificates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('template')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
            activeTab === 'template'
              ? 'border-sky-700 text-sky-800 bg-sky-50/50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Eye className="w-4 h-4" />
          Mẫu phôi & Xem trước in ấn
        </button>

        <button
          type="button"
          onClick={() => { setIssueCode(makeCertificateCode()); setActiveTab('issue'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
            activeTab === 'issue'
              ? 'border-sky-700 text-sky-800 bg-sky-50/50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Plus className="w-4 h-4" />
          Cấp chứng nhận mới
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH CHỨNG NHẬN ĐÃ CẤP                                        */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* FILTER & SEARCH BAR */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Tìm theo tên học viên, số hiệu GCN, khóa đào tạo..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[200px] truncate"
              >
                <option value="ALL">Tất cả khóa đào tạo</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
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

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
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
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-600 border-t-transparent mb-2"></div>
                        <p className="font-medium text-xs sm:text-sm">Đang tải dữ liệu Giấy chứng nhận từ Supabase Cloud...</p>
                      </td>
                    </tr>
                  ) : filteredCerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-sky-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm sm:text-base">Chưa tìm thấy Giấy chứng nhận nào</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Hệ thống chưa có hồ sơ chứng nhận hoặc không khớp với bộ lọc hiện tại. Bạn có thể cấp chứng nhận mới hoặc nạp dữ liệu mẫu để thử nghiệm ngay.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={openIssueModal}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 text-white text-xs font-semibold hover:bg-sky-800 transition shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Cấp chứng nhận mới
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('template')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold transition shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem mẫu phôi hiện tại
                            </button>
                            <button
                              type="button"
                              onClick={handleSeedSampleCertificates}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-300 text-sky-800 bg-sky-50/70 hover:bg-sky-100 text-xs font-semibold transition shadow-xs"
                              title="Tạo nhanh 2 chứng nhận mẫu có điểm và xếp loại để trải nghiệm xem, in ấn và xuất file"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                              Nạp 2 hồ sơ mẫu
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCerts.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-sky-800">
                            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                            {cert.certificateCode}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900 uppercase">{cert.studentName}</div>
                          {cert.dateOfBirth && (
                            <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              NS: {formatDisplayDate(cert.dateOfBirth)}
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
                          {formatDisplayDate(cert.issueDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-gray-900">{cert.signerName || 'ThS.BS Lâm Xuân Trường'}</div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[140px]">{cert.signerTitle || 'GIÁM ĐỐC'}</div>
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
                              type="button"
                              onClick={() => handleOpenPreview(cert)}
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Mở trình chỉnh sửa phôi và in ấn / tải PDF"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-700" />
                              Xem & In
                            </button>
                            {cert.status === CertificateStatus.ISSUED && (
                              <button
                                type="button"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MẪU PHÔI & XEM TRƯỚC IN ẤN                                          */}
      {/* ========================================================================= */}
      {activeTab === 'template' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          {/* CỘT TRÁI: BẢN XEM TRƯỚC PHÔI CHỨNG NHẬN TRỰC TIẾP */}
          <div className="bg-gray-100 rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-inner flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-sky-700" />
                Bản xem trước mẫu quy chuẩn A4 Dọc
              </span>
              <span className="font-mono text-[11px] text-gray-400">210mm × 297mm</span>
            </div>

            <article
              className="relative flex aspect-[210/297] w-full max-w-[540px] flex-col overflow-hidden border border-sky-200 bg-white px-[7.5%] pb-[3.5%] pt-[3.5%] font-sans text-gray-900 shadow-xl rounded-lg"
              style={{ '--certificate-primary': currentTemplate.primaryColor } as React.CSSProperties}
            >
              {/* Watermark logo mờ */}
              {currentTemplate.showWatermark && (
                <div className="pointer-events-none absolute inset-x-[8%] top-[24%] flex h-[48%] items-center justify-center opacity-[0.055]" aria-hidden="true">
                  <img src="/logo_mld.png" alt="" className="h-full w-full object-contain" />
                </div>
              )}

              {/* Header: Logo + Tổ chức + Trung tâm */}
              <div className="certificate-tab-preview-header relative flex items-center gap-2 sm:gap-3 px-2 py-[1.5%]" style={{ color: currentTemplate.primaryColor }}>
                {currentTemplate.showLogo && (
                  <img
                    src="/logo_mld.png"
                    alt="Logo MLD Việt Nam"
                    crossOrigin="anonymous"
                    className="h-auto max-h-11 w-[15%] max-w-[68px] shrink-0 object-contain object-left"
                  />
                )}
                <div className="min-w-0 flex-1 text-center">
                  <p className="certificate-header-org-fit font-extrabold uppercase leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {currentTemplate.organization.replace(/CỘNG\s+ĐỒNG/g, 'CỘNG\u00A0ĐỒNG')}
                  </p>
                  <p className="certificate-header-inst-fit mt-0.5 font-bold uppercase leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {currentTemplate.institute}
                  </p>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="relative mt-[3.5%] text-center" style={{ color: currentTemplate.primaryColor }}>
                <h2 className="font-serif font-bold leading-none text-[clamp(28px,5vw,48px)]">{currentTemplate.title}</h2>
                <p className="mt-[1.6%] text-[clamp(9px,1.6vw,14px)] font-extrabold leading-tight">{currentTemplate.subtitle}</p>
                <p className="mx-auto mt-[0.6%] max-w-[95%] text-[clamp(8px,1.4vw,12px)] font-bold uppercase leading-snug">
                  KỸ THUẬT DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU (MLD ADVANCED)
                </p>
              </div>

              {/* Student info */}
              <div className="relative mt-[6%] space-y-[0.7%] text-left text-[clamp(9px,1.5vw,13px)] font-semibold leading-snug">
                <p>{currentTemplate.intro}</p>
                <p>Họ và tên: <strong className="font-extrabold uppercase">NGUYỄN THỊ THU HÀ</strong></p>
                <p>Ngày sinh: <strong>15/08/1995</strong></p>
                <p>Mã học viên: <strong>MLD-GCN-2026-0899</strong></p>
                <p>Ngày cấp: <strong>{formatDisplayDate(new Date().toISOString().split('T')[0])}</strong></p>
                <p className="pt-[1%]">{currentTemplate.completion}</p>
                <p className="font-extrabold uppercase leading-snug" style={{ color: currentTemplate.primaryColor }}>
                  Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu <span className="font-semibold">{currentTemplate.framework}</span>
                  {currentTemplate.location && <span className="font-semibold"> tại {currentTemplate.location}.</span>}
                </p>
              </div>

              {/* Signer */}
              <div className="relative mt-[2%] flex min-h-[14%] justify-end pb-[1%] pr-[5%] text-center">
                <div className="w-[42%]">
                  <p className="text-[clamp(9px,1.4vw,12px)] font-extrabold uppercase">GIÁM ĐỐC</p>
                  <div className="h-[clamp(32px,6vw,50px)]" />
                  <p className="text-[clamp(8.5px,1.3vw,11.5px)] font-bold">ThS.BS Lâm Xuân Trường</p>
                </div>
              </div>

              {/* Footer notes with mountain vector artwork */}
              {currentTemplate.showFooterNotes && (
                <footer className="certificate-tab-preview-footer relative -mx-[9.2%] mt-auto min-h-[27%] px-[9.2%] pb-[4%] pt-[5%] text-[clamp(6px,1.05vw,9px)] leading-[1.3] text-gray-900">
                  <div className="certificate-tab-preview-mountain certificate-tab-preview-mountain-back" />
                  <div className="certificate-tab-preview-mountain certificate-tab-preview-mountain-mid" />
                  <div className="certificate-tab-preview-mountain certificate-tab-preview-mountain-front" />
                  <ul className="relative z-10 max-w-[95%] list-disc space-y-[1%] pl-4">
                    {currentTemplate.footerNotes.map((note: string, index: number) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </footer>
              )}
            </article>
          </div>

          {/* CỘT PHẢI: QUY CÁCH VÀ CÔNG CỤ TÙY BIẾN */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Quy Cách Phôi Chứng Nhận</h3>
                  <p className="text-[11px] text-gray-500">Mẫu chứng nhận đang lưu hành trên toàn quốc</p>
                </div>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-gray-500 font-medium">Đơn vị chủ quản:</dt>
                  <dd className="font-bold text-gray-900 mt-0.5">{currentTemplate.organization}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Đơn vị đào tạo & cấp bằng:</dt>
                  <dd className="font-bold text-gray-900 mt-0.5">{currentTemplate.institute}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <dt className="text-gray-500 font-medium">Khổ giấy in:</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5">A4 Dọc (210×297mm)</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Màu sắc chủ đạo:</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: currentTemplate.primaryColor }}></span>
                      {currentTemplate.primaryColor}
                    </dd>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <dt className="text-gray-500 font-medium">Định dạng xuất:</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5">PDF Vector 300 DPI</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Bảo mật:</dt>
                    <dd className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mã QR xác thực
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="pt-2 border-t border-gray-100 space-y-2.5">
                <button
                  type="button"
                  onClick={handleOpenTemplateDesigner}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
                >
                  <Sliders className="w-4 h-4" />
                  Mở trình thiết kế & chỉnh sửa phôi
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPreview(DEFAULT_PREVIEW_CERTIFICATE)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs"
                >
                  <Eye className="w-4 h-4 text-gray-500" />
                  Xem bản mẫu đầy đủ & Tải PDF
                </button>

                <button
                  type="button"
                  onClick={openIssueModal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-sky-300 hover:bg-sky-50 text-sky-800 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs"
                >
                  <Plus className="w-4 h-4 text-sky-700" />
                  Cấp bằng mới với mẫu này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CẤP CHỨNG NHẬN NHANH TRỰC TIẾP TRÊN TRANG                          */}
      {/* ========================================================================= */}
      {activeTab === 'issue' && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
        <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cấp Giấy Chứng Nhận MLD Mới</h2>
              <p className="text-xs text-gray-500">
                Thông tin sau khi lưu sẽ tự động tạo mã QR tra cứu và sẵn sàng mở ngay bộ công cụ in ấn PDF.
              </p>
            </div>
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
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-sky-50/40"
                >
                  <option value="">-- Hoặc nhập thông tin thủ công bên dưới --</option>
                  {enrollments.map((enr) => {
                    const matchedCourse = courses.find((c) => c.id === enr.courseId);
                    const name = enr.studentName || (enr as any).student?.fullName || 'Học viên';
                    const cTitle = matchedCourse?.title || 'Khóa học';
                    return (
                      <option key={enr.id} value={enr.id}>
                        {name} · {cTitle}
                      </option>
                    );
                  })}
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
                placeholder="Ví dụ: NGUYỄN THỊ THU HÀ"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase font-semibold"
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
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Chương trình đào tạo *
              </label>
              <select
                value={formData.courseTitle}
                onChange={(e) => { const selected = courses.find((course) => course.title === e.target.value); setFormData({ ...formData, courseTitle: e.target.value, courseId: selected?.id || '' }); }}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {courses.map((crs) => (
                  <option key={crs.id} value={crs.title}>
                    {crs.title}
                  </option>
                ))}
                {courses.length === 0 && (
                  <>
                    <option value="Chương trình phát triển giảng viên và học thuật">
                      Chương trình phát triển giảng viên và học thuật
                    </option>
                    <option value="Dẫn lưu bạch huyết chuyên sâu cho người làm nghề">
                      Dẫn lưu bạch huyết chuyên sâu cho người làm nghề
                    </option>
                    <option value="Dẫn lưu bạch huyết cơ bản cho người làm nghề">
                      Dẫn lưu bạch huyết cơ bản cho người làm nghề
                    </option>
                    <option value="Dẫn lưu bạch huyết nâng cao cho người làm nghề">
                      Dẫn lưu bạch huyết nâng cao cho người làm nghề
                    </option>
                    <option value="Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu">
                      Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu
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
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
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
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center justify-between text-xs">
              <span className="text-gray-700 font-medium">Tự động xếp loại:</span>
              <span className="font-bold text-sky-900 px-3 py-1 bg-white rounded-lg border border-sky-200">
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
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
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
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Quay lại danh sách
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cấp & Mở Bản In Ngay
              </button>
            </div>
          </form>
        </div>
        <aside className="min-w-0" aria-label="Bản xem trước chứng nhận">
          <div className="mx-auto w-full max-w-[440px] xl:sticky xl:top-6">
            <CertificateDocumentPreview
              settings={currentTemplate}
              fields={{
                studentName: formData.studentName,
                dateOfBirth: formData.dateOfBirth ? formatDisplayDate(formData.dateOfBirth) : '',
                courseTitle: formData.courseTitle,
                certificateCode: issueCode,
                issueDate: formatDisplayDate(new Date().toISOString().split('T')[0]),
                signerName: formData.signerName,
                signerTitle: formData.signerTitle,
              }}
            />
          </div>
        </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL CẤP MỚI GIẤY CHỨNG NHẬN (KHI BẤM NÚT TỪ HEADER HOẶC BẤT KỲ ĐÂU)*/}
      {/* ========================================================================= */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-[1180px] w-full max-h-[calc(100dvh-32px)] overflow-y-auto p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-700" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Cấp Giấy Chứng Nhận MLD Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="order-2 max-h-[70vh] overflow-y-auto pr-1 md:order-1">
            <form onSubmit={handleIssueSubmit} className="space-y-4">
              {enrollments.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chọn nhanh từ học viên đang ghi danh
                  </label>
                  <select
                    onChange={(e) => handleSelectEnrollment(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-sky-50/40"
                  >
                    <option value="">-- Hoặc nhập thông tin thủ công bên dưới --</option>
                    {enrollments.map((enr) => {
                      const matchedCourse = courses.find((c) => c.id === enr.courseId);
                      const name = enr.studentName || (enr as any).student?.fullName || 'Học viên';
                      const cTitle = matchedCourse?.title || 'Khóa học';
                      return (
                        <option key={enr.id} value={enr.id}>
                          {name} · {cTitle}
                        </option>
                      );
                    })}
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
                  placeholder="Ví dụ: NGUYỄN THỊ THU HÀ"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase font-semibold"
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
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Chương trình đào tạo *
                </label>
                <select
                  value={formData.courseTitle}
                  onChange={(e) => { const selected = courses.find((course) => course.title === e.target.value); setFormData({ ...formData, courseTitle: e.target.value, courseId: selected?.id || '' }); }}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {courses.map((crs) => (
                    <option key={crs.id} value={crs.title}>
                      {crs.title}
                    </option>
                  ))}
                  {courses.length === 0 && (
                    <>
                      <option value="Chương trình phát triển giảng viên và học thuật">
                        Chương trình phát triển giảng viên và học thuật
                      </option>
                      <option value="Dẫn lưu bạch huyết chuyên sâu cho người làm nghề">
                        Dẫn lưu bạch huyết chuyên sâu cho người làm nghề
                      </option>
                      <option value="Dẫn lưu bạch huyết cơ bản cho người làm nghề">
                        Dẫn lưu bạch huyết cơ bản cho người làm nghề
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium">Tự động xếp loại:</span>
                <span className="font-bold text-sky-900 px-3 py-1 bg-white rounded-lg border border-sky-200">
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Cấp & Mở Trình In Ngay
                </button>
              </div>
            </form>
            </div>
            <aside className="order-1 min-w-0 md:order-2" aria-label="Bản xem trước chứng nhận">
              <div className="mx-auto w-full max-w-[390px]">
                <CertificateDocumentPreview
                  settings={currentTemplate}
                  fields={{
                    studentName: formData.studentName,
                    dateOfBirth: formData.dateOfBirth ? formatDisplayDate(formData.dateOfBirth) : '',
                    courseTitle: formData.courseTitle,
                    certificateCode: issueCode,
                    issueDate: formatDisplayDate(new Date().toISOString().split('T')[0]),
                    signerName: formData.signerName,
                    signerTitle: formData.signerTitle,
                  }}
                />
              </div>
            </aside>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OVERLAY TRÌNH CHỈNH SỬA & IN ẤN PHÔI CHỨNG NHẬN TOÀN DIỆN                */}
      {/* ========================================================================= */}
      {showPreviewModal && selectedCert && (
        <CertificateTemplateEditor
          certificate={selectedCert}
          isExporting={isExportingPdf}
          onClose={() => setShowPreviewModal(false)}
          onExportingChange={setIsExportingPdf}
          onPrint={handlePrint}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL THU HỒI GIẤY CHỨNG NHẬN                                             */}
      {/* ========================================================================= */}
      {showRevokeModal && certToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Xác Nhận Thu Hồi Giấy Chứng Nhận</h3>
                <p className="text-xs text-gray-500 font-mono">{certToRevoke.certificateCode}</p>
              </div>
            </div>

            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-1">
              <p>Học viên: <strong className="uppercase">{certToRevoke.studentName}</strong></p>
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
                  placeholder="Ví dụ: Cấp đổi sang văn bằng cấp độ mới / Thông tin học viên cần điều chỉnh..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevokeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
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
