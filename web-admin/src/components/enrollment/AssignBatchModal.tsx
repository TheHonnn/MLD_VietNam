import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Calendar,
  Clock,
  User as UserIcon,
  MapPin,
  Users,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { CourseBatch, Course, User } from '../../types/shared_types';
import { StaffWithProfile } from '../../services';
import { useNavigate } from 'react-router-dom';

export interface AssignCandidateInfo {
  id: string;
  name: string;
  code: string;
  phone: string;
  program: string;
  courseId?: string;
  currentBatchId?: string | null;
  currentBatchCode?: string;
  amountPaid: number;
  tuitionTotal: number;
}

interface AssignBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: AssignCandidateInfo | null;
  batches: CourseBatch[];
  courses: Course[];
  instructors: StaffWithProfile[];
  onAssignBatch: (enrollmentId: string, batchId: string) => Promise<boolean>;
}

export const AssignBatchModal: React.FC<AssignBatchModalProps> = ({
  isOpen,
  onClose,
  candidate,
  batches,
  courses,
  instructors,
  onAssignBatch,
}) => {
  const navigate = useNavigate();
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial batch selection when modal opens
  React.useEffect(() => {
    if (candidate) {
      if (candidate.currentBatchId) {
        setSelectedBatchId(candidate.currentBatchId);
      } else {
        // Find default matching batch for this course
        const matching = batches.find((b) => b.courseId === candidate.courseId);
        if (matching) {
          setSelectedBatchId(matching.id);
        } else if (batches.length > 0) {
          setSelectedBatchId(batches[0].id);
        }
      }
    }
  }, [candidate, batches]);

  if (!isOpen || !candidate) return null;

  // Filter batches for candidate's course (or fallback to all if courseId missing)
  const relevantBatches = candidate.courseId
    ? batches.filter((b) => b.courseId === candidate.courseId)
    : batches;

  const displayBatches = relevantBatches.length > 0 ? relevantBatches : batches;

  const instMap = new Map(instructors.map((i) => [i.id, i.fullName]));

  const handleSubmit = async () => {
    if (!selectedBatchId) return;
    setIsSubmitting(true);
    try {
      const ok = await onAssignBatch(candidate.id, selectedBatchId);
      if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FAF5EF] w-full max-w-2xl rounded-2xl border border-[#D7BBA6] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EFE4D9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF5FB] text-[#1B4F72] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2C241E]">
                Xếp Lớp & Phân Đợt Khai Giảng
              </h2>
              <p className="text-xs text-[#73675F]">
                Phân bổ học viên vào đợt lớp chính thức để theo dõi lịch học và điểm danh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#FAF5EF] text-[#73675F] hover:text-[#2C241E] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Candidate Info Card */}
          <div className="p-4 rounded-xl bg-white border border-[#EFE4D9] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F4ECE3] pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F3E2CE] text-[#8A4F23] font-bold text-xs flex items-center justify-center">
                  {candidate.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#2C241E]">{candidate.name}</div>
                  <div className="text-[11px] text-[#73675F]">{candidate.phone} · Mã KH: <strong className="text-[#8D4B1A]">{candidate.code}</strong></div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#E8F6ED] text-[#0D6832]">
                Đã duyệt học phí
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#73675F] block text-[11px]">Khóa đào tạo:</span>
                <span className="font-semibold text-[#2C241E]">{candidate.program}</span>
              </div>
              <div>
                <span className="text-[#73675F] block text-[11px]">Lớp hiện tại:</span>
                <span className="font-semibold text-[#8D4B1A]">
                  {candidate.currentBatchCode || 'Chưa phân lớp'}
                </span>
              </div>
            </div>
          </div>

          {/* Batches Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#8D4B1A]" />
                <span>Chọn đợt lớp khai giảng ({displayBatches.length} lớp khả dụng)</span>
              </label>
              <span className="text-[11px] text-[#73675F]">
                Đợt lớp đồng bộ với Thời khóa biểu & Điểm danh
              </span>
            </div>

            <div className="space-y-2.5">
              {displayBatches.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-xl border border-dashed border-[#D7BBA6] text-[#73675F] text-xs">
                  Chưa có đợt khai giảng nào cho khóa này. Vui lòng tạo lớp mới tại mục <strong>Vận hành đào tạo</strong>.
                </div>
              ) : (
                displayBatches.map((batch) => {
                  const isSelected = selectedBatchId === batch.id;
                  const isFull = Boolean(batch.maxStudents && (batch.enrolledCount || 0) >= batch.maxStudents);
                  const instName =
                    instMap.get(batch.instructorId || '') ||
                    batch.instructorId ||
                    'Lâm Xuân Trường';
                  const branchLabel = batch.branchId?.includes('0002') ? 'Quận 1' : 'Quận 3';
                  const formattedStartDate = batch.startDate
                    ? new Intl.DateTimeFormat('vi-VN').format(new Date(batch.startDate))
                    : 'Sắp khai giảng';

                  return (
                    <div
                      key={batch.id}
                      onClick={() => {
                        if (!isFull) {
                          setSelectedBatchId(batch.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                        isFull
                          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#FBF6EE] border-[#8D4B1A] shadow-xs ring-1 ring-[#8D4B1A] cursor-pointer'
                          : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6] cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="courseBatch"
                        disabled={isFull}
                        checked={isSelected}
                        onChange={() => {
                          if (!isFull) setSelectedBatchId(batch.id);
                        }}
                        className="mt-1 text-[#8D4B1A] focus:ring-[#8D4B1A] cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#2C241E]">
                              {batch.batchCode}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EBF5FB] text-[#1B4F72]">
                              {branchLabel}
                            </span>
                            {isFull && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Lớp đã đủ sĩ số
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] font-semibold flex items-center gap-1 ${isFull ? 'text-rose-600 font-bold' : 'text-[#8D4B1A]'}`}>
                            <Users className="w-3.5 h-3.5" />
                            {batch.enrolledCount || 0}/{batch.maxStudents || 15} học viên
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#73675F]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#8D4B1A] shrink-0" />
                            <span>Khai giảng: <strong className="text-[#2C241E]">{formattedStartDate}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-[#8D4B1A] shrink-0" />
                            <span>Giảng viên: <strong className="text-[#2C241E]">{instName}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:col-span-2">
                            <Clock className="w-3.5 h-3.5 text-[#8D4B1A] shrink-0" />
                            <span>Lịch học: <strong className="text-[#2C241E]">{batch.scheduleText || 'Linh hoạt theo thời khóa biểu'}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick link to other management screens */}
          <div className="p-3.5 rounded-xl bg-[#FAF0E4] border border-[#E9D7C3] flex items-center justify-between text-xs text-[#8A4F23]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Xem sĩ số toàn bộ lớp học và lịch giảng dạy tại trang Học viên</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/attendance');
              }}
              className="text-[#8D4B1A] font-bold hover:underline flex items-center gap-1 shrink-0 cursor-pointer text-xs"
            >
              <span>Trang Học viên</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#EFE4D9] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF5EF] transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!selectedBatchId || isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1B4F72] hover:bg-[#153e5b] text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang xếp lớp...' : 'Xác nhận xếp lớp & Bắt đầu học'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
