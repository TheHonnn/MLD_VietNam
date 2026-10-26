import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  PlayCircle,
  Video,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  FolderPlus,
  Layers,
} from 'lucide-react';
import { Course, CourseChapter, CourseLesson } from '../../types/shared_types';
import { academyService } from '../../services/academy.service';

interface CourseCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  initialCourseId?: string;
  onSuccessToast?: (msg: string) => void;
}

// Hàm trích xuất YouTube Video ID chuẩn xác
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const CourseCurriculumModal: React.FC<CourseCurriculumModalProps> = ({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  onSuccessToast,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || (courses.length > 0 ? courses[0].id : '')
  );
  const [chapters, setChapters] = useState<CourseChapter[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Form states for Add/Edit Lesson
  const [isEditingLesson, setIsEditingLesson] = useState<boolean>(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [lessonTitle, setLessonTitle] = useState<string>('');
  const [lessonDuration, setLessonDuration] = useState<number>(20);
  const [lessonVideoUrl, setLessonVideoUrl] = useState<string>('');
  const [lessonContent, setLessonContent] = useState<string>('');
  const [isFreePreview, setIsFreePreview] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New Chapter state
  const [isAddingChapter, setIsAddingChapter] = useState<boolean>(false);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [newChapterDesc, setNewChapterDesc] = useState<string>('');

  // Fetch curriculum when selectedCourseId changes
  const fetchCurriculum = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await academyService.getCourseCurriculum(courseId);
      if (res.success && res.data) {
        setChapters(res.data);
        if (res.data.length > 0 && !selectedChapterId) {
          setSelectedChapterId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load course curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const targetId = initialCourseId || (courses.length > 0 ? courses[0].id : '');
      setSelectedCourseId(targetId);
      fetchCurriculum(targetId);
    }
  }, [isOpen, initialCourseId, courses]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setIsEditingLesson(false);
    fetchCurriculum(courseId);
  };

  // Preview YouTube ID
  const previewVideoId = extractYoutubeId(lessonVideoUrl);

  // Mở form thêm bài học mới
  const handleOpenAddLesson = (chapterId?: string) => {
    const targetChapterId = chapterId || (chapters.length > 0 ? chapters[0].id : '');
    setSelectedChapterId(targetChapterId);
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonDuration(20);
    setLessonVideoUrl('');
    setLessonContent('');
    setIsFreePreview(false);
    setFormError(null);
    setIsEditingLesson(true);
  };

  // Mở form chỉnh sửa bài học
  const handleOpenEditLesson = (lesson: CourseLesson, chapterId: string) => {
    setSelectedChapterId(chapterId);
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonDuration(lesson.durationMinutes || 20);
    setLessonVideoUrl(lesson.videoUrl || '');
    setLessonContent(lesson.contentText || '');
    setIsFreePreview(lesson.isFreePreview || false);
    setFormError(null);
    setIsEditingLesson(true);
  };

  // Lưu bài học
  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề bài học.');
      return;
    }
    if (!selectedChapterId) {
      setFormError('Vui lòng chọn chương học.');
      return;
    }
    if (lessonVideoUrl.trim() && !extractYoutubeId(lessonVideoUrl)) {
      setFormError('Đường dẫn YouTube không hợp lệ. Vui lòng kiểm tra lại link.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingLessonId) {
        // Update
        const res = await academyService.updateCourseLesson(editingLessonId, {
          title: lessonTitle.trim(),
          durationMinutes: Number(lessonDuration),
          videoUrl: lessonVideoUrl.trim() || null,
          contentText: lessonContent.trim() || null,
          isFreePreview,
          chapterId: selectedChapterId,
        });
        if (res.success) {
          onSuccessToast?.('Cập nhật bài học video thành công!');
          setIsEditingLesson(false);
          fetchCurriculum(selectedCourseId);
        } else {
          setFormError('Không thể cập nhật bài học.');
        }
      } else {
        // Create new
        const currentChapter = chapters.find((c) => c.id === selectedChapterId);
        const nextOrder = (currentChapter?.lessons?.length || 0) + 1;

        const res = await academyService.createCourseLesson({
          chapterId: selectedChapterId,
          lessonOrder: nextOrder,
          title: lessonTitle.trim(),
          durationMinutes: Number(lessonDuration),
          videoUrl: lessonVideoUrl.trim() || null,
          contentText: lessonContent.trim() || null,
          isFreePreview,
        });
        if (res.success) {
          onSuccessToast?.('Thêm bài học video mới thành công!');
          setIsEditingLesson(false);
          fetchCurriculum(selectedCourseId);
        } else {
          setFormError('Không thể tạo bài học.');
        }
      }
    } catch (err) {
      console.error('Save lesson failed:', err);
      setFormError('Đã xảy ra lỗi khi lưu bài học.');
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa bài học
  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài học video này khỏi khóa học?')) return;
    try {
      const res = await academyService.deleteCourseLesson(lessonId);
      if (res.success) {
        onSuccessToast?.('Đã xóa bài học thành công!');
        fetchCurriculum(selectedCourseId);
      }
    } catch (err) {
      console.error('Delete lesson failed:', err);
    }
  };

  // Tạo chương học mới
  const handleSaveChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      const nextOrder = chapters.length + 1;
      const res = await academyService.createCourseChapter({
        courseId: selectedCourseId,
        chapterOrder: nextOrder,
        title: newChapterTitle.trim(),
        description: newChapterDesc.trim() || undefined,
      });
      if (res.success && res.data) {
        onSuccessToast?.('Tạo chương học mới thành công!');
        setNewChapterTitle('');
        setNewChapterDesc('');
        setIsAddingChapter(false);
        fetchCurriculum(selectedCourseId);
      }
    } catch (err) {
      console.error('Create chapter failed:', err);
    }
  };

  if (!isOpen) return null;

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2860EB]/10 flex items-center justify-center text-[#2860EB]">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">
                Quản lý Tài liệu Đào tạo & Bài giảng Video
              </h2>
              <p className="text-xs text-[#6B7280]">
                Cấu hình học liệu, chương học & gắn link YouTube trực tiếp vào từng khóa đào tạo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#9CA3AF] hover:text-[#1F2937] hover:bg-[#E5E7EB] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Top Bar: Chọn Khóa học */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                Khóa đào tạo đang chọn:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#2860EB] focus:ring-1 focus:ring-[#2860EB]"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    [{course.code}] {course.title} ({course.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={() => setIsAddingChapter(!isAddingChapter)}
                className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#334155] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <FolderPlus className="w-4 h-4 text-[#2860EB]" />
                {isAddingChapter ? 'Đóng tạo chương' : 'Thêm chương mới'}
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddLesson()}
                className="px-4 py-2 bg-[#2860EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Thêm bài học Video
              </button>
            </div>
          </div>

          {/* Form thêm chương mới (nếu mở) */}
          {isAddingChapter && (
            <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-3 animate-in fade-in duration-100">
              <h4 className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4" />
                Tạo chương học mới cho khóa: {currentCourse?.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Tiêu đề chương (vd: Chương 1: Đại cương hệ bạch huyết)"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="bg-white border border-[#93C5FD] rounded-lg px-3 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#2860EB]"
                />
                <input
                  type="text"
                  placeholder="Mô tả tóm tắt chương học (tùy chọn)"
                  value={newChapterDesc}
                  onChange={(e) => setNewChapterDesc(e.target.value)}
                  className="bg-white border border-[#93C5FD] rounded-lg px-3 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#2860EB]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingChapter(false)}
                  className="px-3 py-1.5 text-xs text-[#475569] hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveChapter}
                  className="px-4 py-1.5 bg-[#2860EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                >
                  Lưu chương học
                </button>
              </div>
            </div>
          )}

          {/* Form Thêm/Chỉnh sửa Bài học Video */}
          {isEditingLesson && (
            <div className="p-5 bg-white border-2 border-[#2860EB]/30 rounded-xl shadow-md space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-[#2860EB]" />
                  {editingLessonId ? 'Chỉnh sửa bài học video' : 'Thêm bài học video mới vào khóa học'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingLesson(false)}
                  className="text-xs text-[#6B7280] hover:text-[#111827] cursor-pointer"
                >
                  Đóng form
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cột 1: Thông tin bài học */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Chương học <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#2860EB]"
                    >
                      {chapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Tiêu đề bài học <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Bài 01: Đại cương hệ bạch huyết & Phương pháp Vodder"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#2860EB]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#374151] mb-1">
                        Thời lượng (phút)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={lessonDuration}
                        onChange={(e) => setLessonDuration(Number(e.target.value))}
                        className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#2860EB]"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#374151]">
                        <input
                          type="checkbox"
                          checked={isFreePreview}
                          onChange={(e) => setIsFreePreview(e.target.checked)}
                          className="w-4 h-4 text-[#2860EB] rounded border-gray-300 focus:ring-[#2860EB]"
                        />
                        Cho phép học thử miễn phí
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Đường dẫn Video YouTube <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                        value={lessonVideoUrl}
                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                        className="w-full bg-white border border-[#D1D5DB] rounded-lg pl-3 pr-8 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#2860EB]"
                      />
                      {previewVideoId && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          ID: {previewVideoId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Hỗ trợ: YouTube chuẩn, link rút gọn youtu.be, shorts hoặc embed.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Mô tả & Hướng dẫn học tập (tùy chọn)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tóm tắt nội dung bài học, lưu ý thực hành hoặc mục tiêu cần đạt..."
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#2860EB]"
                    />
                  </div>
                </div>

                {/* Cột 2: Khung Xem trước trực tiếp (Live YouTube Preview) */}
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-[#374151] mb-1 flex items-center justify-between">
                    <span>Xem trước video trực tiếp (Live Preview):</span>
                    {previewVideoId && (
                      <span className="text-green-600 flex items-center gap-1 font-normal">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Video hợp lệ
                      </span>
                    )}
                  </label>
                  <div className="flex-1 bg-[#111827] rounded-xl overflow-hidden border border-[#374151] flex items-center justify-center min-h-[200px] relative">
                    {previewVideoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=0&rel=0`}
                        title="YouTube Video Preview"
                        className="w-full h-full min-h-[220px] border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="text-center p-6 text-gray-400">
                        <PlayCircle className="w-12 h-12 mx-auto mb-2 text-gray-500 stroke-[1.5]" />
                        <p className="text-xs font-medium">Chưa có link video</p>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                          Dán link YouTube vào ô bên trái để xem trước khung phát video ngay tại đây.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsEditingLesson(false)}
                  className="px-4 py-2 border border-[#D1D5DB] text-xs font-semibold text-[#374151] rounded-lg hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSaveLesson}
                  className="px-5 py-2 bg-[#2860EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : editingLessonId ? 'Cập nhật bài học' : 'Lưu bài học vào khóa học'}
                </button>
              </div>
            </div>
          )}

          {/* Danh sách Chương và Bài học hiện có trong khóa học */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2860EB]" />
                Lộ trình học liệu: {currentCourse?.title} ({chapters.length} chương)
              </h3>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                Đang tải dữ liệu học liệu từ Supabase...
              </div>
            ) : chapters.length === 0 ? (
              <div className="py-12 text-center bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6">
                <Layers className="w-10 h-10 mx-auto text-[#94A3B8] mb-2" />
                <h4 className="text-sm font-bold text-[#334155]">Khóa học chưa có học liệu video</h4>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                  Khóa học này chưa có chương học nào. Hãy bấm nút "Thêm chương mới" hoặc "Thêm bài học Video" ở trên để bắt đầu thêm tài liệu bài giảng.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingChapter(true)}
                  className="mt-4 px-4 py-2 bg-[#2860EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] transition-all cursor-pointer"
                >
                  Tạo chương học đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {chapters.map((chapter, chapIdx) => (
                  <div
                    key={chapter.id}
                    className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-2xs"
                  >
                    {/* Header chương */}
                    <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-[#2860EB] uppercase tracking-wider">
                          Chương {chapter.chapterOrder || chapIdx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#1E293B]">{chapter.title}</h4>
                        {chapter.description && (
                          <p className="text-xs text-[#64748B] mt-0.5">{chapter.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddLesson(chapter.id)}
                        className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#2860EB] text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm bài vào chương
                      </button>
                    </div>

                    {/* Danh sách bài học trong chương */}
                    <div className="divide-y divide-[#F1F5F9]">
                      {!chapter.lessons || chapter.lessons.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-[#94A3B8]">
                          Chưa có bài học nào trong chương này.
                        </div>
                      ) : (
                        chapter.lessons.map((lesson, lessonIdx) => {
                          const ytid = lesson.videoUrl ? extractYoutubeId(lesson.videoUrl) : null;
                          return (
                            <div
                              key={lesson.id}
                              className="px-4 py-3.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors gap-3"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                  <Video className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-[#1E293B]">
                                      {lesson.title}
                                    </span>
                                    {lesson.isFreePreview && (
                                      <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded">
                                        Học thử miễn phí
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#94A3B8]" />
                                      {lesson.durationMinutes || 18} phút
                                    </span>
                                    {lesson.videoUrl ? (
                                      <a
                                        href={lesson.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#2860EB] hover:underline flex items-center gap-1 truncate max-w-[280px]"
                                      >
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        {lesson.videoUrl}
                                      </a>
                                    ) : (
                                      <span className="text-amber-600">Chưa gắn link video</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Hành động sửa / xóa */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditLesson(lesson, chapter.id)}
                                  className="p-1.5 text-[#64748B] hover:text-[#2860EB] hover:bg-[#EFF6FF] rounded-lg transition-colors cursor-pointer"
                                  title="Chỉnh sửa bài học"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa bài học"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Học viên sẽ xem trực tiếp các video YouTube này trên App Mobile MLD Việt Nam.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#374151] font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

