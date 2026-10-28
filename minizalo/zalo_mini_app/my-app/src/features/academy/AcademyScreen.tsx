import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { Course, Chapter, Lesson, QuizQuestion } from '@/core/types';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  School,
  PlayCircle,
  CheckCircle,
  Clock,
  BookOpen,
  ArrowRight,
  ChevronLeft,
  Lock,
  Hourglass,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface AcademyScreenProps {
  onBackToHome?: () => void;
}

export const AcademyScreen: React.FC<AcademyScreenProps> = ({ onBackToHome }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [expandedFilter, setExpandedFilter] = useState<'audience' | 'need' | null>(null);

  const audienceCategories = [
    'Tất cả đối tượng',
    'Khóa học đã đăng ký',
    'Người mới bắt đầu',
    'Người đang làm nghề',
    'Kỹ thuật viên XBBH/VLTL',
    'Y tế & Phục hồi',
  ];
  const [selectedAudience, setSelectedAudience] = useState('Tất cả đối tượng');

  const needCategories = [
    'Tất cả nhu cầu',
    'Kiến thức nền tảng & Tự chăm sóc',
    'Tích hợp dịch vụ mới',
    'Mở cơ sở chăm sóc',
  ];
  const [selectedNeed, setSelectedNeed] = useState('Tất cả nhu cầu');

  // Subviews & Modals
  const [showMyCoursesModal, setShowMyCoursesModal] = useState(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<Course | null>(null);
  const [courseChapters, setCourseChapters] = useState<Chapter[]>([]);
  const [activeVideoLesson, setActiveVideoLesson] = useState<Lesson | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

  useEffect(() => {
    loadCourses();
    setEnrolledCourseIds(supabaseApi.getEnrolledCourseIds());
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await supabaseApi.getCourses();
      setCourses(data);
    } catch (err) {
      console.warn('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourseDetail = async (c: Course) => {
    setSelectedCourseDetail(c);
    try {
      const chs = await supabaseApi.getCourseCurriculum(c.id);
      setCourseChapters(chs);
    } catch {
      setCourseChapters([]);
    }
  };

  const handleEnrollCourse = (c: Course) => {
    supabaseApi.enrollCourse(c.id);
    setEnrolledCourseIds(supabaseApi.getEnrolledCourseIds());
    alert(`Đã ghi danh thành công khóa học: ${c.title}! Bạn có thể vào học ngay.`);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const filteredCourses = courses.filter((c) => {
    // 1. Audience Filter
    if (selectedAudience === 'Khóa học đã đăng ký') {
      if (!enrolledCourseIds.includes(c.id)) return false;
    } else if (selectedAudience !== 'Tất cả đối tượng' && selectedAudience !== 'Tất cả') {
      const aud = selectedAudience.toLowerCase();
      const match =
        (c.category || '').toLowerCase().includes(aud) ||
        (c.level || '').toLowerCase().includes(aud) ||
        (c.title || '').toLowerCase().includes(aud);
      if (!match) return false;
    }

    // 2. Need Filter
    if (selectedNeed !== 'Tất cả nhu cầu' && selectedNeed !== 'Tất cả') {
      const need = selectedNeed.toLowerCase();
      const match = (c.description || '').toLowerCase().includes(need) || (c.title || '').toLowerCase().includes(need);
      if (!match) return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (c.title || '').toLowerCase().includes(q);
      const descMatch = (c.description || '').toLowerCase().includes(q);
      const instMatch = (c.instructorName || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !instMatch) return false;
    }

    return true;
  });

  return (
    <div className="pb-24 bg-[#F9FAFB] min-h-screen">
      {/* 1. APPBAR: Chuẩn Mobile E01 (22px bold + Nút "Khóa học của tôi") */}
      <div className="bg-white px-4 py-3 border-b border-[#E5E7EB] sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[20px] font-bold text-[#1F2937] tracking-tight">
            Đào tạo & Khóa học
          </h1>
        </div>

        {/* Nút Khóa học của tôi (Khớp 100% Mobile E01 Action) */}
        <button
          type="button"
          onClick={() => setShowMyCoursesModal(true)}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#EFF4FE] text-[#2860EB] border border-[#2860EB]/30 hover:bg-[#2860EB]/10 transition active:scale-95 text-xs font-bold"
        >
          <School className="w-4 h-4 text-[#2860EB]" />
          <span>Khóa học của tôi</span>
        </button>
      </div>

      {/* 2. Ô TÌM KIẾM KHÓA HỌC */}
      <div className="bg-white px-4 pt-2.5 pb-2.5">
        <div className="relative flex items-center bg-[#F1F5F9] rounded-lg border border-[#E5E7EB] px-3 py-2">
          <Search className="w-4 h-4 text-[#2860EB] shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm khóa học dẫn lưu..."
            className="w-full bg-transparent text-[13.5px] text-[#1F2937] placeholder-gray-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. HAI NÚT BỘ LỌC: [ Đối tượng ▼ ] và [ Nhu cầu ▼ ] */}
      <div className="bg-white px-4 pb-3 flex items-center space-x-2.5 border-b border-[#E5E7EB]">
        {/* Nút Đối tượng */}
        <button
          type="button"
          onClick={() =>
            setExpandedFilter(expandedFilter === 'audience' ? null : 'audience')
          }
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition ${
            expandedFilter === 'audience' ||
            (selectedAudience !== 'Tất cả đối tượng' && selectedAudience !== 'Tất cả')
              ? 'bg-[#EFF4FE] border-[#2860EB] text-[#2860EB]'
              : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#1F2937]'
          }`}
        >
          <span className="truncate">
            {selectedAudience === 'Tất cả đối tượng' ? 'Đối tượng' : selectedAudience}
          </span>
          {expandedFilter === 'audience' ? (
            <ChevronUp className="w-4 h-4 text-[#2860EB] shrink-0 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          )}
        </button>

        {/* Nút Nhu cầu */}
        <button
          type="button"
          onClick={() =>
            setExpandedFilter(expandedFilter === 'need' ? null : 'need')
          }
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition ${
            expandedFilter === 'need' ||
            (selectedNeed !== 'Tất cả nhu cầu' && selectedNeed !== 'Tất cả')
              ? 'bg-[#EFF4FE] border-[#2860EB] text-[#2860EB]'
              : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#1F2937]'
          }`}
        >
          <span className="truncate">
            {selectedNeed === 'Tất cả nhu cầu' ? 'Nhu cầu' : selectedNeed}
          </span>
          {expandedFilter === 'need' ? (
            <ChevronUp className="w-4 h-4 text-[#2860EB] shrink-0 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          )}
        </button>
      </div>

      {/* 4. KHUNG SỔ XUỐNG CÁC TÙY CHỌN BỘ LỌC */}
      {expandedFilter && (
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E5E7EB] space-y-2 animate-in fade-in duration-200">
          <p className="text-xs font-semibold text-[#616161]">
            {expandedFilter === 'audience'
              ? 'Chọn đối tượng đào tạo:'
              : 'Chọn nhu cầu học tập:'}
          </p>

          <div className="flex flex-wrap gap-2">
            {(expandedFilter === 'audience' ? audienceCategories : needCategories).map(
              (cat) => {
                const isSelected =
                  expandedFilter === 'audience'
                    ? cat === selectedAudience
                    : cat === selectedNeed;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (expandedFilter === 'audience') {
                        setSelectedAudience(cat);
                      } else {
                        setSelectedNeed(cat);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition ${
                      isSelected
                        ? 'bg-[#2860EB] text-white font-bold'
                        : 'bg-white text-gray-700 border border-[#E5E7EB] hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* 5. DANH SÁCH THẺ KHÓA HỌC (Chuẩn Mobile E01: Ảnh 185px, Badges, Tên 15.5px bold, Học phí #00693F, Nút "Chi tiết →") */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-[#2860EB] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Đang tải danh mục khóa học...</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <School className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-700">
              Không tìm thấy khóa học phù hợp
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Vui lòng thử từ khóa khác hoặc chọn danh mục khác
            </p>
            <button
              onClick={() => {
                setSelectedAudience('Tất cả đối tượng');
                setSelectedNeed('Tất cả nhu cầu');
                setExpandedFilter(null);
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-[#2860EB] text-white text-xs font-bold rounded-lg"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          filteredCourses.map((c) => {
            const isEnrolled = enrolledCourseIds.includes(c.id);
            return (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
              >
                {/* 1. Ảnh kèm Badge giảm giá / Số lượng video / Đã đăng ký */}
                <div
                  onClick={() => handleOpenCourseDetail(c)}
                  className="w-full h-[185px] bg-[#EFF4FE] overflow-hidden cursor-pointer relative"
                >
                  <img
                    src={c.image}
                    alt={c.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />

                  {/* Badge ĐÃ ĐĂNG KÝ */}
                  {isEnrolled && (
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#2860EB] text-white text-[11px] font-bold flex items-center space-x-1 shadow-md">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>ĐÃ ĐĂNG KÝ</span>
                    </div>
                  )}

                  {/* Badge Video */}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-semibold flex items-center space-x-1 backdrop-blur-xs">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>4 video</span>
                  </div>
                </div>

                {/* 2. Nội dung: Tên khóa học, Học phí và Nút Chi tiết */}
                <div className="p-3.5">
                  <h3
                    onClick={() => handleOpenCourseDetail(c)}
                    className="text-[15.5px] font-bold text-[#0F172A] leading-snug cursor-pointer line-clamp-2 hover:text-[#2860EB] transition-colors"
                  >
                    {c.title}
                  </h3>

                  <div className="my-3 border-t border-[#F1F5F9]" />

                  {/* Hàng Học phí (#00693F) và Nút Chi tiết */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline text-[#00693F] font-bold text-[19px]">
                      <span>{formatCurrency(c.tuitionFee)} </span>
                      <span className="underline ml-0.5">đ</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCourseDetail(c)}
                      className="px-3.5 py-1.5 bg-[#F1F5F9] hover:bg-[#2860EB] text-[#0F172A] hover:text-white border border-[#E2E8F0] hover:border-[#2860EB] rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors active:scale-95"
                    >
                      <span>Chi tiết</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL KHÓA HỌC CỦA TÔI */}
      {showMyCoursesModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowMyCoursesModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <School className="w-5 h-5 text-[#2860EB]" />
                <h3 className="text-base font-bold text-gray-900">Khóa học của tôi</h3>
              </div>
              <button
                onClick={() => setShowMyCoursesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {courses
                .filter((c) => enrolledCourseIds.includes(c.id))
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setShowMyCoursesModal(false);
                      handleOpenCourseDetail(c);
                    }}
                    className="p-3 bg-[#EFF4FE]/50 rounded-xl border border-[#2860EB]/20 flex items-center justify-between cursor-pointer hover:bg-[#EFF4FE] transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 border border-gray-100">
                        <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{c.title}</h4>
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center mt-0.5">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Đang học trực tuyến
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#2860EB] shrink-0 ml-2" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CHI TIẾT KHÓA HỌC & BÀI GIẢNG VIDEO */}
      {selectedCourseDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedCourseDetail(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-11 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-2" />

            <div className="w-full h-44 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={selectedCourseDetail.image}
                alt={selectedCourseDetail.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-[#EFF4FE] text-[#2860EB] text-[11px] font-bold">
                {selectedCourseDetail.level || 'Chuyên nghiệp'}
              </span>
              <span className="text-xs font-bold text-[#00693F]">
                Học phí: {formatCurrency(selectedCourseDetail.tuitionFee)} đ
              </span>
            </div>

            <h2 className="text-base font-bold text-gray-900 leading-snug">
              {selectedCourseDetail.title}
            </h2>

            <p className="text-xs text-gray-600 leading-relaxed">
              {selectedCourseDetail.description}
            </p>

            {/* Danh mục chương & bài giảng */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Khung bài giảng thực hành (Lâm sàng)
              </h4>

              {courseChapters.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                  Chương 1: Giải phẫu hệ bạch huyết & 4 động tác Vodder kinh điển.
                  <br />
                  Chương 2: Thực hành dẫn lưu giảm phù mặt & tay chân.
                </div>
              ) : (
                courseChapters.map((ch) => (
                  <div key={ch.id} className="p-3 bg-gray-50 rounded-lg space-y-1.5">
                    <p className="text-xs font-bold text-gray-800">{ch.title}</p>
                    {ch.lessons?.map((les) => (
                      <div
                        key={les.id}
                        onClick={() => {
                          if (enrolledCourseIds.includes(selectedCourseDetail.id)) {
                            setActiveVideoLesson(les);
                          } else {
                            alert('Vui lòng ghi danh khóa học để mở khóa video bài giảng.');
                          }
                        }}
                        className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 cursor-pointer hover:border-[#2860EB]"
                      >
                        <div className="flex items-center space-x-2">
                          <PlayCircle className="w-4 h-4 text-[#2860EB]" />
                          <span className="text-xs text-gray-700">{les.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {les.durationMinutes}p
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Nút hành động */}
            {enrolledCourseIds.includes(selectedCourseDetail.id) ? (
              <button
                type="button"
                onClick={() => setSelectedCourseDetail(null)}
                className="w-full py-3 bg-[#00693F] text-white text-xs font-bold rounded-xl"
              >
                Đã ghi danh · Đóng
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleEnrollCourse(selectedCourseDetail)}
                className="w-full py-3 bg-[#2860EB] hover:bg-[#1E4BB8] text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Ghi danh khóa học ngay
              </button>
            )}
          </div>
        </div>
      )}

      {/* 8. MODAL VIDEO PLAYER (YouTube Embed) */}
      {activeVideoLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setActiveVideoLesson(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <h4 className="text-xs font-bold text-gray-900 truncate">
                {activeVideoLesson.title}
              </h4>
              <button onClick={() => setActiveVideoLesson(null)} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title={activeVideoLesson.title}
                src={`https://www.youtube.com/embed/${activeVideoLesson.youtubeId || 'mDhpMX4EeY8'}?autoplay=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-3 text-center">
              <button
                onClick={() => setActiveVideoLesson(null)}
                className="w-full py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg"
              >
                Hoàn thành bài giảng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
