import React, { useState, useEffect, useMemo } from 'react';
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
  const [selectedAssessment, setSelectedAssessment] = useState<EdemaAssessment | null>(null);

  // Form đăng ký mới
  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerPhone: '',
    branchId: 'aaaaaaaa-0001-0001-0001-000000000001',
    assessmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '09:00 - 10:00',
    clinicalNotes: '',
  });

  // Form ghi nhận chỉ số lâm sàng
  const [clinicalForm, setClinicalForm] = useState({
    status: EdemaAssessmentStatus.COMPLETED,
    result: EdemaAssessmentResult.PASSED,
    stageLevel: 'Stage I',
    partLeft: '24.5',
    partRight: '22.0',
    diff: '+2.5cm',
    clinicalNotes: '',
  });

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
        item.customerPhone.includes(kw);
      return matchTab && matchSearch;
    });
  }, [assessments, activeTab, searchKeyword]);

  // Thống kê
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
    setClinicalForm({
      status: item.status || EdemaAssessmentStatus.COMPLETED,
      result: item.result || EdemaAssessmentResult.PASSED,
      stageLevel: item.stageLevel || 'Stage I',
      partLeft: m.tay_trai || m.cang_tay_trai || m.bap_chan_trai || '22.0',
      partRight: m.tay_phai || m.cang_tay_phai || m.bap_chan_phai || '20.0',
      diff: m.chenh_lech || '+2.0cm',
      clinicalNotes: item.clinicalNotes || '',
    });
    setShowClinicalModal(true);
  };

  const handleSaveClinical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment) return;

    try {
      const res = await academyService.updateEdemaAssessment(selectedAssessment.id, {
        status: clinicalForm.status,
        result: clinicalForm.result,
        stageLevel: clinicalForm.stageLevel,
        circumferenceMeasurements: {
          chi_trai: `${clinicalForm.partLeft}cm`,
          chi_phai: `${clinicalForm.partRight}cm`,
          chenh_lech: clinicalForm.diff,
        },
        clinicalNotes: clinicalForm.clinicalNotes,
      });

      if (res.success) {
        toast.success('Đã cập nhật chỉ số lâm sàng thành công');
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
        });
        loadData();
      } else {
        toast.error('Không thể tạo lịch khám mới');
      }
    } catch {
      toast.error('Lỗi khi tạo lịch khám');
    }
  };

  const handleQuickIssueCertificate = async (item: EdemaAssessment) => {
    if (!window.confirm(`Cấp Giấy chứng nhận Đạt chuẩn lâm sàng cho học viên / bệnh nhân ${item.customerName}?`)) {
      return;
    }

    try {
      const certRes = await academyService.issueCertificate({
        studentName: item.customerName,
        courseTitle: `Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết (${item.stageLevel || 'Stage 0'})`,
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Stethoscope className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Đăng Ký & Khám Phù Bạch Huyết Lâm Sàng
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Tiếp nhận bệnh nhân, đo chu vi sưng phù (cm), phân độ lâm sàng (Stage 0 - III) & liên thông cấp GCN
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Đăng ký ca khám mới
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số ca khám</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Chờ tiếp nhận</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.waiting}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã xác nhận lịch</p>
            <p className="text-2xl font-bold text-sky-600 mt-1">{stats.confirmed}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đạt chuẩn y khoa</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">{stats.passed}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & TABS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: EdemaAssessmentStatus.WAITING_CONFIRMATION, label: 'Chờ tiếp nhận' },
              { id: EdemaAssessmentStatus.CONFIRMED, label: 'Đã xác nhận' },
              { id: EdemaAssessmentStatus.COMPLETED, label: 'Đã hoàn tất' },
              { id: EdemaAssessmentStatus.CANCELLED, label: 'Đã hủy' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Lịch khám & Giờ</th>
                <th className="py-3.5 px-4">Bệnh nhân / Khách hàng</th>
                <th className="py-3.5 px-4">Phân độ phù (Stage)</th>
                <th className="py-3.5 px-4">Chỉ số chu vi (cm)</th>
                <th className="py-3.5 px-4 text-center">Kết luận</th>
                <th className="py-3.5 px-4 text-center">Trạng thái ca</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-2"></div>
                    <p>Đang tải danh sách ca khám...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600">Không có ca khám nào phù hợp</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        {item.assessmentDate}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {item.timeSlot}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{item.customerName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {item.customerPhone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.stageLevel ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.stageLevel === 'Stage 0'
                              ? 'bg-blue-100 text-blue-800'
                              : item.stageLevel === 'Stage I'
                              ? 'bg-amber-100 text-amber-800'
                              : item.stageLevel === 'Stage II'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.stageLevel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa xác định</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {item.circumferenceMeasurements && Object.keys(item.circumferenceMeasurements).length > 0 ? (
                        <div className="text-xs text-gray-700 space-y-0.5 font-mono">
                          {Object.entries(item.circumferenceMeasurements).map(([k, v]) => (
                            <span key={k} className="inline-block mr-2 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa đo chu vi</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.result === EdemaAssessmentResult.PASSED ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đạt chuẩn
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenClinical(item)}
                          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          Khám & Đo
                        </button>
                        {item.result === EdemaAssessmentResult.PASSED && !item.certificateIssuedId && (
                          <button
                            onClick={() => handleQuickIssueCertificate(item)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                            title="Liên thông cấp Giấy chứng nhận cho bệnh nhân"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Cấp GCN
                          </button>
                        )}
                        {item.certificateIssuedId && (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã cấp GCN
                          </span>
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
      {/* MODAL GHI NHẬN CHỈ SỐ LÂM SÀNG & KẾT LUẬN                                 */}
      {/* ========================================================================= */}
      {showClinicalModal && selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Ghi Nhận Chỉ Số Lâm Sàng: {selectedAssessment.customerName}
                </h3>
              </div>
              <button
                onClick={() => setShowClinicalModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveClinical} className="space-y-4">
              <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 flex items-center justify-between text-xs text-teal-900">
                <div>
                  <span className="font-semibold">Bệnh nhân:</span> {selectedAssessment.customerName}
                </div>
                <div>
                  <span className="font-semibold">SĐT:</span> {selectedAssessment.customerPhone}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Phân loại Giai đoạn phù (Clinical Stage)
                </label>
                <select
                  value={clinicalForm.stageLevel}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, stageLevel: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Stage 0">Stage 0 - Tiềm tàng (Không sưng rõ rệt, ứ đọng dịch nhẹ)</option>
                  <option value="Stage I">Stage I - Phù ấn lõm nhẹ (Hồi phục khi nâng cao chi)</option>
                  <option value="Stage II">Stage II - Xơ cứng mô liên kết (Không hồi phục tự nhiên)</option>
                  <option value="Stage III">Stage III - Phù voi lymph (Xơ cứng bì nặng & biến dạng mô)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chi trái (cm)
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.partLeft}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, partLeft: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chi phải (cm)
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.partRight}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, partRight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chênh lệch
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.diff}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, diff: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Kết luận y khoa
                  </label>
                  <select
                    value={clinicalForm.result}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, result: e.target.value as EdemaAssessmentResult })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={EdemaAssessmentResult.PASSED}>Đạt chuẩn / Phù thoái lui tốt (PASSED)</option>
                    <option value={EdemaAssessmentResult.NEEDS_FOLLOW_UP}>Cần tiếp tục theo dõi (NEEDS_FOLLOW_UP)</option>
                    <option value={EdemaAssessmentResult.FAILED}>Chưa đạt chuẩn (FAILED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Trạng thái ca
                  </label>
                  <select
                    value={clinicalForm.status}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, status: e.target.value as EdemaAssessmentStatus })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={EdemaAssessmentStatus.CONFIRMED}>Đang thực hiện</option>
                    <option value={EdemaAssessmentStatus.COMPLETED}>Hoàn tất ca khám</option>
                    <option value={EdemaAssessmentStatus.CANCELLED}>Hủy bỏ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Nhận định chuyên môn của Chuyên gia / Bác sĩ
                </label>
                <textarea
                  rows={3}
                  value={clinicalForm.clinicalNotes}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, clinicalNotes: e.target.value })}
                  placeholder="Ghi nhận lưu lượng tuần hoàn, ấn lõm, hướng dẫn băng ép hoặc liệu trình MLD..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowClinicalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Lưu & Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ĐĂNG KÝ CA KHÁM MỚI                                                  */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
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
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Chi nhánh khám
                </label>
                <select
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} - {b.address}
                    </option>
                  ))}
                  {branches.length === 0 && (
                    <option value="aaaaaaaa-0001-0001-0001-000000000001">
                      MLD Trụ Sở Chính - 120 Mai Hắc Đế, Hà Nội
                    </option>
                  )}
                </select>
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Khung giờ
                  </label>
                  <select
                    value={createForm.timeSlot}
                    onChange={(e) => setCreateForm({ ...createForm, timeSlot: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  Mô tả tình trạng ban đầu
                </label>
                <textarea
                  rows={2}
                  value={createForm.clinicalNotes}
                  onChange={(e) => setCreateForm({ ...createForm, clinicalNotes: e.target.value })}
                  placeholder="Khách sau phẫu thuật hút mỡ/ngực, hoặc phù bạch huyết bẩm sinh..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Xác nhận đặt lịch
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
