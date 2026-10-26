import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  User,
  Search,
  Filter,
  Plus,
  RotateCcw,
  FileText,
  AlertCircle,
  Award,
  ChevronRight,
  Stethoscope,
  Scissors,
  Check,
  XCircle,
  Building2,
  ShieldCheck,
  Printer,
  Download,
  Eye,
  X,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { academyService, branchService } from '../services';
import {
  EdemaAssessment,
  EdemaAssessmentStatus,
  EdemaAssessmentResult,
  Branch,
  CertificateStatus,
} from '../types/shared_types';
import { toast } from '../components/common';

export const W17_EdemaAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<EdemaAssessment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showClinicalModal, setShowClinicalModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [selectedAssessment, setSelectedAssessment] = useState<EdemaAssessment | null>(null);

  // Form đăng ký mới
  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerPhone: '',
    branchId: 'aaaaaaaa-0001-0001-0001-000000000001',
    assessmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '09:00 - 10:00',
    clinicalNotes: '',
    protocolType: 'UPPER_LIMB', // UPPER_LIMB, LOWER_LIMB, POST_SURGERY
  });

  // Form ghi nhận chỉ số lâm sàng chuyên sâu y khoa
  const [clinicalForm, setClinicalForm] = useState({
    status: EdemaAssessmentStatus.COMPLETED,
    result: EdemaAssessmentResult.PASSED,
    stageLevel: 'Stage I',
    protocolType: 'UPPER_LIMB', // UPPER_LIMB, LOWER_LIMB
    // Số đo chi tiết (cm)
    point1Name: 'Mu bàn tay / Bàn chân',
    point1Affected: 21.5,
    point1Healthy: 19.0,
    point2Name: 'Cổ tay / Cổ chân',
    point2Affected: 18.5,
    point2Healthy: 16.0,
    point3Name: 'Cẳng tay / Bắp chân',
    point3Affected: 27.0,
    point3Healthy: 23.5,
    point4Name: 'Cánh tay / Đùi',
    point4Affected: 33.0,
    point4Healthy: 29.0,
    // Thử nghiệm lâm sàng
    stemmerSign: 'POSITIVE', // POSITIVE (+), NEGATIVE (-)
    pittingGrade: '2+',      // 0, 1+, 2+, 3+, 4+
    tissueFibrosis: 'MODERATE', // SOFT, MODERATE, SEVERE
    // Phác đồ chỉ định
    mldSessions: 10,
    bandageType: 'Băng ép áp lực đa lớp sợi ngắn (Short-stretch Bandage)',
    garmentClass: 'Class II (23 - 32 mmHg)',
    followUpDate: '',
    clinicalNotes: '',
    examinerName: 'BS. CKI Trần Hoàng Nam',
  });

  const reportPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assessRes, branchRes] = await Promise.all([
        academyService.getEdemaAssessments(),
        branchService.getAllBranches(),
      ]);

      if (assessRes.success && assessRes.data) {
        setAssessments(assessRes.data);
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách ca khám phù lâm sàng');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredList = useMemo(() => {
    return assessments.filter((item) => {
      const matchTab = activeTab === 'ALL' || item.status === activeTab;
      const kw = searchKeyword.toLowerCase();
      const matchSearch =
        !searchKeyword ||
        item.customerName.toLowerCase().includes(kw) ||
        item.customerPhone.includes(kw) ||
        (item.stageLevel && item.stageLevel.toLowerCase().includes(kw));
      return matchTab && matchSearch;
    });
  }, [assessments, activeTab, searchKeyword]);

  // Thống kê ca khám
  const stats = useMemo(() => {
    const total = assessments.length;
    const waiting = assessments.filter((a) => a.status === EdemaAssessmentStatus.WAITING_CONFIRMATION).length;
    const confirmed = assessments.filter((a) => a.status === EdemaAssessmentStatus.CONFIRMED).length;
    const passed = assessments.filter((a) => a.result === EdemaAssessmentResult.PASSED).length;
    return { total, waiting, confirmed, passed };
  }, [assessments]);

  const handleOpenClinical = (item: EdemaAssessment) => {
    setSelectedAssessment(item);
    const m = item.circumferenceMeasurements || {};
    
    // Khôi phục hoặc tạo mới phác đồ
    setClinicalForm({
      status: item.status || EdemaAssessmentStatus.COMPLETED,
      result: item.result || EdemaAssessmentResult.PASSED,
      stageLevel: item.stageLevel || 'Stage I',
      protocolType: m.protocolType || 'UPPER_LIMB',
      point1Name: m.point1Name || 'Mu bàn tay / Bàn chân',
      point1Affected: m.point1Affected !== undefined ? Number(m.point1Affected) : 21.5,
      point1Healthy: m.point1Healthy !== undefined ? Number(m.point1Healthy) : 19.0,
      point2Name: m.point2Name || 'Cổ tay / Cổ chân',
      point2Affected: m.point2Affected !== undefined ? Number(m.point2Affected) : 18.5,
      point2Healthy: m.point2Healthy !== undefined ? Number(m.point2Healthy) : 16.0,
      point3Name: m.point3Name || 'Cẳng tay / Bắp chân',
      point3Affected: m.point3Affected !== undefined ? Number(m.point3Affected) : 27.0,
      point3Healthy: m.point3Healthy !== undefined ? Number(m.point3Healthy) : 23.5,
      point4Name: m.point4Name || 'Cánh tay / Đùi',
      point4Affected: m.point4Affected !== undefined ? Number(m.point4Affected) : 33.0,
      point4Healthy: m.point4Healthy !== undefined ? Number(m.point4Healthy) : 29.0,
      stemmerSign: m.stemmerSign || 'POSITIVE',
      pittingGrade: m.pittingGrade || '2+',
      tissueFibrosis: m.tissueFibrosis || 'MODERATE',
      mldSessions: m.mldSessions || 10,
      bandageType: m.bandageType || 'Băng ép áp lực đa lớp sợi ngắn (Short-stretch Bandage)',
      garmentClass: m.garmentClass || 'Class II (23 - 32 mmHg)',
      followUpDate: m.followUpDate || '',
      clinicalNotes: item.clinicalNotes || '',
      examinerName: m.examinerName || 'BS. CKI Trần Hoàng Nam',
    });
    setShowClinicalModal(true);
  };

  const handleSaveClinical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment) return;

    const diff1 = (Number(clinicalForm.point1Affected) - Number(clinicalForm.point1Healthy)).toFixed(1);
    const diff2 = (Number(clinicalForm.point2Affected) - Number(clinicalForm.point2Healthy)).toFixed(1);
    const diff3 = (Number(clinicalForm.point3Affected) - Number(clinicalForm.point3Healthy)).toFixed(1);
    const diff4 = (Number(clinicalForm.point4Affected) - Number(clinicalForm.point4Healthy)).toFixed(1);

    const measurementsData = {
      protocolType: clinicalForm.protocolType,
      point1Name: clinicalForm.point1Name,
      point1Affected: clinicalForm.point1Affected,
      point1Healthy: clinicalForm.point1Healthy,
      point1Diff: `+${diff1}cm`,
      point2Name: clinicalForm.point2Name,
      point2Affected: clinicalForm.point2Affected,
      point2Healthy: clinicalForm.point2Healthy,
      point2Diff: `+${diff2}cm`,
      point3Name: clinicalForm.point3Name,
      point3Affected: clinicalForm.point3Affected,
      point3Healthy: clinicalForm.point3Healthy,
      point3Diff: `+${diff3}cm`,
      point4Name: clinicalForm.point4Name,
      point4Affected: clinicalForm.point4Affected,
      point4Healthy: clinicalForm.point4Healthy,
      point4Diff: `+${diff4}cm`,
      maxDiff: `+${Math.max(Number(diff1), Number(diff2), Number(diff3), Number(diff4)).toFixed(1)}cm`,
      stemmerSign: clinicalForm.stemmerSign,
      pittingGrade: clinicalForm.pittingGrade,
      tissueFibrosis: clinicalForm.tissueFibrosis,
      mldSessions: clinicalForm.mldSessions,
      bandageType: clinicalForm.bandageType,
      garmentClass: clinicalForm.garmentClass,
      followUpDate: clinicalForm.followUpDate,
      examinerName: clinicalForm.examinerName,
    };

    try {
      const res = await academyService.updateEdemaAssessment(selectedAssessment.id, {
        status: clinicalForm.status,
        result: clinicalForm.result,
        stageLevel: clinicalForm.stageLevel,
        circumferenceMeasurements: measurementsData,
        clinicalNotes: clinicalForm.clinicalNotes,
      });

      if (res.success) {
        toast.success('Đã lưu kết quả khám lâm sàng & phác đồ trị liệu thành công');
        setShowClinicalModal(false);
        loadData();
      } else {
        toast.error('Cập nhật chỉ số không thành công');
      }
    } catch {
      toast.error('Lỗi khi lưu chỉ số lâm sàng');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customerName.trim() || !createForm.customerPhone.trim()) {
      toast.error('Vui lòng điền họ tên và số điện thoại bệnh nhân');
      return;
    }

    try {
      const res = await academyService.createEdemaAssessment({
        customerName: createForm.customerName.trim(),
        customerPhone: createForm.customerPhone.trim(),
        branchId: createForm.branchId,
        assessmentDate: createForm.assessmentDate,
        timeSlot: createForm.timeSlot,
        clinicalNotes: createForm.clinicalNotes.trim() || undefined,
        circumferenceMeasurements: {
          protocolType: createForm.protocolType,
        },
        status: EdemaAssessmentStatus.WAITING_CONFIRMATION,
        result: EdemaAssessmentResult.PENDING,
      });

      if (res.success && res.data) {
        toast.success(`Đã đăng ký ca khám cho ${createForm.customerName}`);
        setShowCreateModal(false);
        setCreateForm({
          customerName: '',
          customerPhone: '',
          branchId: branches[0]?.id || 'aaaaaaaa-0001-0001-0001-000000000001',
          assessmentDate: new Date().toISOString().split('T')[0],
          timeSlot: '09:00 - 10:00',
          clinicalNotes: '',
          protocolType: 'UPPER_LIMB',
        });
        loadData();
      } else {
        toast.error('Không thể tạo lịch khám mới');
      }
    } catch {
      toast.error('Lỗi kết nối khi tạo lịch khám');
    }
  };

  const handleQuickIssueCertificate = async (item: EdemaAssessment) => {
    if (!window.confirm(`Xác nhận cấp Giấy chứng nhận Đạt chuẩn lâm sàng cho học viên / bệnh nhân ${item.customerName}?`)) {
      return;
    }

    const year = new Date().getFullYear();
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const code = `MLD-GCN-${year}-${randomHex}`;

    try {
      const certRes = await academyService.issueCertificate({
        studentName: item.customerName,
        courseTitle: `Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết (${item.stageLevel || 'Stage I'})`,
        certificateCode: code,
        qrVerificationCode: `https://mldvietnam.vn/verify/${code}`,
        theoryScore: 9.0,
        practicalScore: 9.5,
        finalGrade: 'XUẤT SẮC',
        status: CertificateStatus.ISSUED,
        signerName: 'BS. CKI Trần Hoàng Nam',
        signerTitle: 'Chủ Tịch Hội Đồng Y Khoa MLD',
      });

      if (certRes.success && certRes.data) {
        await academyService.updateEdemaAssessment(item.id, {
          certificateIssuedId: certRes.data.id,
          status: EdemaAssessmentStatus.COMPLETED,
        });
        toast.success(`Đã cấp Giấy chứng nhận ${certRes.data.certificateCode} thành công!`);
        loadData();
      } else {
        toast.error('Không thể cấp Giấy chứng nhận');
      }
    } catch {
      toast.error('Lỗi khi liên thông cấp Giấy chứng nhận');
    }
  };

  const handleOpenReport = (item: EdemaAssessment) => {
    setSelectedAssessment(item);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* STYLE ISOLATION FOR MEDICAL REPORT PRINTING */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-edema-report, #printable-edema-report * {
            visibility: visible !important;
          }
          #printable-edema-report {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 30px !important;
            background: white !important;
            box-shadow: none !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold border border-teal-100 shadow-xs">
              <Stethoscope className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Đăng Ký & Khám Phù Bạch Huyết Lâm Sàng
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                  Chuẩn ISL Quốc Tế
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Tiếp nhận bệnh nhân, đo chu vi sưng phù (cm), phân loại giai đoạn (Stage 0 - III), chỉ định phác đồ & liên thông cấp GCN
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Đăng ký ca khám mới
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số ca khám</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Chờ tiếp nhận khám</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.waiting}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã xác nhận lịch hẹn</p>
            <p className="text-2xl font-bold text-sky-600 mt-1">{stats.confirmed}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đạt chuẩn thoát phù tốt</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">{stats.passed}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & TABS */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả ca khám' },
              { id: EdemaAssessmentStatus.WAITING_CONFIRMATION, label: 'Chờ tiếp nhận' },
              { id: EdemaAssessmentStatus.CONFIRMED, label: 'Đã xác nhận' },
              { id: EdemaAssessmentStatus.COMPLETED, label: 'Đã hoàn tất' },
              { id: EdemaAssessmentStatus.CANCELLED, label: 'Đã hủy' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Tìm theo tên bệnh nhân, số điện thoại..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Lịch hẹn & Khung giờ</th>
                <th className="py-3.5 px-4">Bệnh nhân / Khách hàng</th>
                <th className="py-3.5 px-4">Phân loại giai đoạn (ISL)</th>
                <th className="py-3.5 px-4">Chỉ số chu vi đo đạc</th>
                <th className="py-3.5 px-4 text-center">Kết luận y khoa</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác lâm sàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-2"></div>
                    <p>Đang tải danh sách ca khám phù...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-700">Không có ca khám nào phù hợp</p>
                    <p className="text-xs text-gray-400 mt-1">Đăng ký ca khám mới để bắt đầu theo dõi lâm sàng</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const m = item.circumferenceMeasurements || {};
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          {item.assessmentDate}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {item.timeSlot}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{item.customerName}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {item.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.stageLevel ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                              item.stageLevel === 'Stage 0'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : item.stageLevel === 'Stage I'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : item.stageLevel === 'Stage II'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {item.stageLevel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa phân loại</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {m.maxDiff ? (
                          <div className="text-xs text-gray-800 space-y-0.5 font-mono">
                            <span className="font-bold text-rose-600">Lệch max: {m.maxDiff}</span>
                            <span className="text-gray-400 block text-[11px]">
                              Stemmer: {m.stemmerSign === 'POSITIVE' ? '(+) Dương' : '(-) Âm'} · Pitting: {m.pittingGrade || '2+'}
                            </span>
                          </div>
                        ) : m.chenh_lech ? (
                          <span className="text-xs font-mono font-bold text-rose-600">{m.chenh_lech}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa đo chu vi</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.result === EdemaAssessmentResult.PASSED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đạt chuẩn y khoa
                          </span>
                        ) : item.result === EdemaAssessmentResult.NEEDS_FOLLOW_UP ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Theo dõi thêm
                          </span>
                        ) : item.result === EdemaAssessmentResult.FAILED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Không đạt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Chờ khám
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.status === EdemaAssessmentStatus.WAITING_CONFIRMATION ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Chờ tiếp nhận
                          </span>
                        ) : item.status === EdemaAssessmentStatus.CONFIRMED ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                            Đã xác nhận
                          </span>
                        ) : item.status === EdemaAssessmentStatus.COMPLETED ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            Đã hoàn tất
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Đã hủy
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenClinical(item)}
                            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            title="Khám, đo chu vi & chẩn đoán"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            Khám & Đo
                          </button>
                          
                          <button
                            onClick={() => handleOpenReport(item)}
                            className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            title="Xem & In phiếu kết quả khám bệnh"
                          >
                            <Printer className="w-3.5 h-3.5 text-gray-500" />
                            Phiếu khám
                          </button>

                          {item.result === EdemaAssessmentResult.PASSED && !item.certificateIssuedId && (
                            <button
                              onClick={() => handleQuickIssueCertificate(item)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                              title="Liên thông cấp Giấy chứng nhận hoàn thành kiểm tra"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Cấp GCN
                            </button>
                          )}
                          {item.certificateIssuedId && (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 ml-1">
                              <Check className="w-3 h-3" /> Đã cấp GCN
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

      {/* ========================================================================= */}
      {/* MODAL GHI NHẬN CHỈ SỐ LÂM SÀNG & PHÁC ĐỒ ĐIỀU TRỊ CHUYÊN SÂU              */}
      {/* ========================================================================= */}
      {showClinicalModal && selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Khám Lâm Sàng & Phác Đồ Trị Liệu: {selectedAssessment.customerName}
                  </h3>
                  <p className="text-xs text-gray-500">Tiêu chuẩn kiểm định dẫn lưu bạch huyết Viện MLD Việt Nam</p>
                </div>
              </div>
              <button
                onClick={() => setShowClinicalModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveClinical} className="space-y-4">
              {/* Header Info */}
              <div className="bg-teal-50/60 p-3.5 rounded-2xl border border-teal-100 grid grid-cols-3 gap-2 text-xs text-teal-950">
                <div>
                  <span className="text-teal-700 font-medium">Bệnh nhân:</span> <strong>{selectedAssessment.customerName}</strong>
                </div>
                <div>
                  <span className="text-teal-700 font-medium">SĐT:</span> <strong>{selectedAssessment.customerPhone}</strong>
                </div>
                <div>
                  <span className="text-teal-700 font-medium">Ngày hẹn:</span> <strong>{selectedAssessment.assessmentDate}</strong>
                </div>
              </div>

              {/* Phân loại Protocol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Vị trí kiểm tra lâm sàng
                  </label>
                  <select
                    value={clinicalForm.protocolType}
                    onChange={(e) => {
                      const type = e.target.value;
                      if (type === 'UPPER_LIMB') {
                        setClinicalForm((prev) => ({
                          ...prev,
                          protocolType: type,
                          point1Name: 'Mu bàn tay',
                          point2Name: 'Cổ tay',
                          point3Name: 'Cẳng tay (dưới khuỷu 10cm)',
                          point4Name: 'Cánh tay (trên khuỷu 10cm)',
                        }));
                      } else {
                        setClinicalForm((prev) => ({
                          ...prev,
                          protocolType: type,
                          point1Name: 'Mu bàn chân',
                          point2Name: 'Cổ chân',
                          point3Name: 'Bắp chân (dưới gối 10cm)',
                          point4Name: 'Đùi (trên gối 15cm)',
                        }));
                      }
                    }}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="UPPER_LIMB">Chi trên (Tay / Nách / Ngực)</option>
                    <option value="LOWER_LIMB">Chi dưới (Chân / Bẹn / Đùi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phân độ Phù Lympho (Chuẩn ISL)
                  </label>
                  <select
                    value={clinicalForm.stageLevel}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, stageLevel: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Stage 0">Stage 0 - Tiềm tàng (Không sưng rõ rệt, ứ đọng mô bì)</option>
                    <option value="Stage I">Stage I - Phù ấn lõm nhẹ (Hồi phục khi kê cao chi)</option>
                    <option value="Stage II">Stage II - Xơ cứng mô liên kết (Không tự hồi phục)</option>
                    <option value="Stage III">Stage III - Phù voi (Xơ hóa mô nặng & biến dạng chi)</option>
                  </select>
                </div>
              </div>

              {/* BẢNG ĐO CHU VI 4 ĐIỂM CHUẨN Y KHOA */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
                <div className="bg-gray-50 px-3.5 py-2 font-semibold text-gray-700 border-b border-gray-200 flex justify-between items-center">
                  <span>BẢNG ĐO CHU VI ĐỐI XỨNG (CM)</span>
                  <span className="text-[11px] text-gray-500 font-normal">So sánh bên phù vs bên lành</span>
                </div>
                <div className="p-3 space-y-2.5 bg-white">
                  {/* Point 1 */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 font-medium text-gray-700">{clinicalForm.point1Name}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên phù"
                        value={clinicalForm.point1Affected}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point1Affected: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên lành"
                        value={clinicalForm.point1Healthy}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point1Healthy: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 font-mono font-bold text-rose-600 text-right">
                      +{(Number(clinicalForm.point1Affected) - Number(clinicalForm.point1Healthy)).toFixed(1)}
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 font-medium text-gray-700">{clinicalForm.point2Name}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên phù"
                        value={clinicalForm.point2Affected}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point2Affected: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên lành"
                        value={clinicalForm.point2Healthy}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point2Healthy: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 font-mono font-bold text-rose-600 text-right">
                      +{(Number(clinicalForm.point2Affected) - Number(clinicalForm.point2Healthy)).toFixed(1)}
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 font-medium text-gray-700">{clinicalForm.point3Name}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên phù"
                        value={clinicalForm.point3Affected}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point3Affected: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên lành"
                        value={clinicalForm.point3Healthy}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point3Healthy: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 font-mono font-bold text-rose-600 text-right">
                      +{(Number(clinicalForm.point3Affected) - Number(clinicalForm.point3Healthy)).toFixed(1)}
                    </div>
                  </div>

                  {/* Point 4 */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 font-medium text-gray-700">{clinicalForm.point4Name}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên phù"
                        value={clinicalForm.point4Affected}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point4Affected: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Bên lành"
                        value={clinicalForm.point4Healthy}
                        onChange={(e) => setClinicalForm({ ...clinicalForm, point4Healthy: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 font-mono font-bold text-rose-600 text-right">
                      +{(Number(clinicalForm.point4Affected) - Number(clinicalForm.point4Healthy)).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* NGHIỆM PHÁP LÂM SÀNG */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Dấu hiệu Stemmer (Ngón 2)
                  </label>
                  <select
                    value={clinicalForm.stemmerSign}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, stemmerSign: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="POSITIVE">Dương tính (+) - Da dày, không nhấc nếp</option>
                    <option value="NEGATIVE">Âm tính (-) - Nhấc được nếp da bình thường</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Thử ấn lõm (Pitting Test)
                  </label>
                  <select
                    value={clinicalForm.pittingGrade}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, pittingGrade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="0">Grade 0: Không ấn lõm</option>
                    <option value="1+">Grade 1+: Lõm nhẹ &lt;2mm (Hồi phục ngay)</option>
                    <option value="2+">Grade 2+: Lõm 2 - 4mm (Hồi phục &lt;15s)</option>
                    <option value="3+">Grade 3+: Lõm 4 - 6mm (Hồi phục &lt;1 phút)</option>
                    <option value="4+">Grade 4+: Lõm sâu &gt;6mm (Hồi phục 2-5 phút)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Mức độ xơ hóa mô bì
                  </label>
                  <select
                    value={clinicalForm.tissueFibrosis}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, tissueFibrosis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="SOFT">Mô mềm, đàn hồi tốt</option>
                    <option value="MODERATE">Xơ cứng vừa phải</option>
                    <option value="SEVERE">Xơ cứng bì nặng (Woody)</option>
                  </select>
                </div>
              </div>

              {/* PHÁC ĐỒ CHỈ ĐỊNH */}
              <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-100 space-y-2.5 text-xs">
                <div className="font-semibold text-sky-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  PHÁC ĐỒ TRỊ LIỆU ĐỀ XUẤT (TÍCH HỢP CDT - COMPLEX DECONGESTIVE THERAPY)
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-600 mb-1">Số buổi MLD Vodder:</label>
                    <input
                      type="number"
                      value={clinicalForm.mldSessions}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, mldSessions: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-sky-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-600 mb-1">Áp lực vớ/bao tay y khoa:</label>
                    <input
                      type="text"
                      value={clinicalForm.garmentClass}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, garmentClass: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-sky-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Kết luận & Trạng thái */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Kết luận y khoa
                  </label>
                  <select
                    value={clinicalForm.result}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, result: e.target.value as EdemaAssessmentResult })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={EdemaAssessmentResult.PASSED}>Đạt chuẩn / Phù thoái lui tốt (PASSED)</option>
                    <option value={EdemaAssessmentResult.NEEDS_FOLLOW_UP}>Cần tiếp tục liệu trình theo dõi (NEEDS_FOLLOW_UP)</option>
                    <option value={EdemaAssessmentResult.FAILED}>Chưa đạt chuẩn (FAILED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Trạng thái hồ sơ ca khám
                  </label>
                  <select
                    value={clinicalForm.status}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, status: e.target.value as EdemaAssessmentStatus })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={EdemaAssessmentStatus.CONFIRMED}>Đang thực hiện khám</option>
                    <option value={EdemaAssessmentStatus.COMPLETED}>Hoàn tất ca khám</option>
                    <option value={EdemaAssessmentStatus.CANCELLED}>Hủy bỏ ca khám</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Nhận định chuyên khoa của Bác sĩ / Master Trainer
                </label>
                <textarea
                  rows={2}
                  value={clinicalForm.clinicalNotes}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, clinicalNotes: e.target.value })}
                  placeholder="Ghi nhận lưu lượng tuần hoàn, dải xơ sau phẫu thuật, hướng dẫn băng ép và vận động trị liệu tại nhà..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowClinicalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Lưu & Cập Nhật Hồ Sơ Bệnh Án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL XEM & IN PHIẾU KẾT QUẢ KHÁM PHÙ LÂM SÀNG CHO BỆNH NHÂN              */}
      {/* ========================================================================= */}
      {showReportModal && selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Phiếu Kết Quả Khám Phù Bạch Huyết Lâm Sàng
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Phiếu (A4)
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* PRINTABLE EDEMA REPORT SHEET */}
            <div
              id="printable-edema-report"
              ref={reportPrintRef}
              className="p-8 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 space-y-4 font-sans text-xs"
            >
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-teal-600 pb-3">
                <div>
                  <h4 className="font-extrabold text-sm text-teal-900 uppercase">
                    VIỆN TRỊ LIỆU & ĐÀO TẠO MLD VIỆT NAM
                  </h4>
                  <p className="text-[11px] text-gray-600">Trung Tâm Khám & Trị Liệu Thoát Phù Bạch Huyết Vodder Chuẩn Quốc Tế</p>
                  <p className="text-[10px] text-gray-500">Địa chỉ: 120 Mai Hắc Đế, Hà Nội · Hotline: 0988.123.456</p>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono font-bold text-gray-800">MÃ HỒ SƠ: {selectedAssessment.id.substring(0, 8).toUpperCase()}</div>
                  <div className="text-[10px] text-gray-500">Ngày khám: {selectedAssessment.assessmentDate}</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-1">
                <h3 className="text-base font-extrabold text-teal-950 uppercase tracking-wide">
                  PHIẾU KẾT QUẢ ĐO CHU VI & ĐÁNH GIÁ PHÙ BẠCH HUYẾT
                </h3>
                <p className="text-[11px] text-gray-500 italic">Lymphatic Drainage & Clinical Circumference Assessment Sheet</p>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs">
                <div>Họ và tên: <strong className="text-gray-900 uppercase">{selectedAssessment.customerName}</strong></div>
                <div>Số điện thoại: <strong className="text-gray-900 font-mono">{selectedAssessment.customerPhone}</strong></div>
                <div>Khung giờ khám: <strong>{selectedAssessment.timeSlot}</strong></div>
                <div>Phân loại Giai đoạn (ISL): <strong className="text-teal-800">{selectedAssessment.stageLevel || 'Stage I'}</strong></div>
              </div>

              {/* Measurements Table */}
              <div>
                <p className="font-bold text-gray-800 mb-1">1. CHỈ SỐ CHU VI ĐỐI XỨNG:</p>
                <table className="w-full border-collapse border border-gray-300 text-center">
                  <thead>
                    <tr className="bg-gray-100 font-semibold text-gray-700">
                      <th className="border border-gray-300 py-1.5 px-2 text-left">Vị trí đo lâm sàng</th>
                      <th className="border border-gray-300 py-1.5 px-2">Bên phù (cm)</th>
                      <th className="border border-gray-300 py-1.5 px-2">Bên lành (cm)</th>
                      <th className="border border-gray-300 py-1.5 px-2">Chênh lệch $\Delta$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssessment.circumferenceMeasurements && selectedAssessment.circumferenceMeasurements.point1Name ? (
                      <>
                        <tr>
                          <td className="border border-gray-300 py-1 px-2 text-left">{selectedAssessment.circumferenceMeasurements.point1Name}</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point1Affected} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point1Healthy} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono font-bold text-rose-600">{selectedAssessment.circumferenceMeasurements.point1Diff}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 py-1 px-2 text-left">{selectedAssessment.circumferenceMeasurements.point2Name}</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point2Affected} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point2Healthy} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono font-bold text-rose-600">{selectedAssessment.circumferenceMeasurements.point2Diff}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 py-1 px-2 text-left">{selectedAssessment.circumferenceMeasurements.point3Name}</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point3Affected} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point3Healthy} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono font-bold text-rose-600">{selectedAssessment.circumferenceMeasurements.point3Diff}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 py-1 px-2 text-left">{selectedAssessment.circumferenceMeasurements.point4Name}</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point4Affected} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono">{selectedAssessment.circumferenceMeasurements.point4Healthy} cm</td>
                          <td className="border border-gray-300 py-1 px-2 font-mono font-bold text-rose-600">{selectedAssessment.circumferenceMeasurements.point4Diff}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-gray-300 py-2 text-gray-500 italic">
                          Chưa có bảng số đo chi tiết
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Diagnosis and Notes */}
              <div className="space-y-1.5 pt-1">
                <p className="font-bold text-gray-800">2. KẾT LUẬN & NHẬN ĐỊNH CHUYÊN MÔN:</p>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 leading-relaxed text-gray-800">
                  <p>
                    <strong>Kết luận y khoa:</strong>{' '}
                    {selectedAssessment.result === EdemaAssessmentResult.PASSED
                      ? 'Đạt chuẩn / Phù thoái lui đáp ứng rất tốt'
                      : 'Đang trong quá trình theo dõi & cần can thiệp dẫn lưu'}
                  </p>
                  <p className="mt-1">
                    <strong>Ghi chú chuyên khoa:</strong> {selectedAssessment.clinicalNotes || 'Bệnh nhân tuân thủ tốt phác đồ băng ép và dẫn lưu bạch huyết nhẹ nhàng theo kỹ thuật Vodder.'}
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-6 text-center">
                <div>
                  <p className="font-bold text-gray-800">BỆNH NHÂN / HỌC VIÊN</p>
                  <p className="text-[10px] text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-gray-900 uppercase">{selectedAssessment.customerName}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-800">BÁC SĨ / MASTER TRAINER</p>
                  <p className="text-[10px] text-gray-400 italic">(Ký, đóng dấu xác nhận)</p>
                  <div className="h-14 flex items-center justify-center font-serif italic text-teal-900 text-sm">
                    BS. Tran Hoang Nam
                  </div>
                  <p className="font-bold text-gray-900 uppercase">BS. CKI Trần Hoàng Nam</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ĐĂNG KÝ CA KHÁM MỚI                                                  */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">Đăng Ký Lịch Khám Phù Mới</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Họ và tên bệnh nhân / khách hàng *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lê Thị Ánh Tuyết"
                  value={createForm.customerName}
                  onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912345678"
                  value={createForm.customerPhone}
                  onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Vùng kiểm tra
                  </label>
                  <select
                    value={createForm.protocolType}
                    onChange={(e) => setCreateForm({ ...createForm, protocolType: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="UPPER_LIMB">Chi trên (Tay / Ngực)</option>
                    <option value="LOWER_LIMB">Chi dưới (Chân / Bẹn)</option>
                    <option value="POST_SURGERY">Phù sau hút mỡ / phẫu thuật</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chi nhánh khám
                  </label>
                  <select
                    value={createForm.branchId}
                    onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    {branches.length === 0 && (
                      <option value="aaaaaaaa-0001-0001-0001-000000000001">
                        MLD Trụ Sở Chính - Hà Nội
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Ngày hẹn khám
                  </label>
                  <input
                    type="date"
                    value={createForm.assessmentDate}
                    onChange={(e) => setCreateForm({ ...createForm, assessmentDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Khung giờ
                  </label>
                  <select
                    value={createForm.timeSlot}
                    onChange={(e) => setCreateForm({ ...createForm, timeSlot: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="09:00 - 10:00">09:00 - 10:00</option>
                    <option value="10:30 - 11:30">10:30 - 11:30</option>
                    <option value="14:00 - 15:00">14:00 - 15:00</option>
                    <option value="16:00 - 17:00">16:00 - 17:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Mô tả triệu chứng / tiền sử ban đầu
                </label>
                <textarea
                  rows={2}
                  value={createForm.clinicalNotes}
                  onChange={(e) => setCreateForm({ ...createForm, clinicalNotes: e.target.value })}
                  placeholder="Khách sau phẫu thuật thẩm mỹ ngực 3 tuần, có sưng nề và căng cứng..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Xác nhận đặt lịch khám
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default W17_EdemaAssessments;
