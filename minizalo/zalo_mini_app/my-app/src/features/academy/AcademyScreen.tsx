import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { Course, Chapter, Lesson, QuizQuestion } from '@/core/types';
import {
  GraduationCap,
  PlayCircle,
  CheckCircle,
  Lock,
  Clock,
  BookOpen,
  Award,
  Calendar,
  QrCode,
  AlertCircle,
  X,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

interface AcademyScreenProps {
  onBackToHome?: () => void;
}

const AUDIENCE_OPTIONS = [
  'Tất cả',
  'Người mới bắt đầu',
  'Người đang làm nghề',
];

const NEED_OPTIONS = [
  'Tất cả',
  'Trị liệu lâm sàng',
  'Thẩm mỹ & Phục hồi',
  'Cơ bản tại nhà',
];

const SAMPLE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Phương pháp Dẫn lưu Bạch huyết Thủ công (MLD) nguyên bản được sáng lập bởi ai?',
    options: ['Dr. Emil Vodder', 'Dr. Sigmund Freud', 'Dr. William Harvey', 'Dr. Alexander Fleming'],
    correctIndex: 0,
    explanation: 'Tiến sĩ Emil Vodder và phu nhân Estrid Vodder phát minh kỹ thuật MLD vào năm 1936 tại Pháp.',
  },
  {
    id: 'q2',
    question: 'Áp lực tay chuẩn y khoa khi thực hiện thao tác Vodder MLD là bao nhiêu?',
    options: ['Áp lực mạnh ép sâu vào mô cơ (> 80 mmHg)', 'Áp lực cực nhẹ từ 30 đến 40 mmHg', 'Không chạm da', 'Áp lực tùy ý theo cảm giác khách hàng'],
    correctIndex: 1,
    explanation: 'MLD chỉ tác động vào mao mạch bạch huyết nông ngay dưới lớp biểu bì, áp lực khuyến nghị 30-40 mmHg.',
  },
  {
    id: 'q3',
    question: 'Chống chỉ định TUYỆT ĐỐI của dẫn lưu bạch huyết MLD là gì?',
    options: ['Đau mỏi cơ thông thường', 'Phù nhẹ sau phẫu thuật hàm', 'Nhiễm trùng cấp tính, suy tim mất bù, huyết khối tĩnh mạch sâu (DVT)', 'Mệt mỏi căng thẳng'],
    correctIndex: 2,
    explanation: 'MLD chống chỉ định tuyệt đối trong nhiễm trùng cấp, suy tim mất bù hoặc có nguy cơ gây thuyên tắc huyết khối.',
  },
  {
    id: 'q4',
    question: 'Thao tác cơ bản đặc trưng nhất của trường phái Vodder là gì?',
    options: ['Đấm bóp (Tapotement)', 'Xoay tròn tĩnh (Stationary Circles), Bơm (Pump), Xoắn (Rotary)', 'Bẻ khớp nắn chỉnh', 'Châm cứu kích thích điện'],
    correctIndex: 1,
    explanation: '4 động tác nền tảng của Vodder: Stationary circles, Pump technique, Scoop technique, Rotary technique.',
  },
  {
    id: 'q5',
    question: 'Nhóm hạch nào tiếp nhận dòng bạch huyết từ toàn bộ nửa dưới cơ thể?',
    options: ['Hạch nách (Axillary nodes)', 'Hạch cổ nông (Cervical nodes)', 'Hạch bẹn (Inguinal nodes) đổ về bể dưỡng chấp (Cisterna chyli)', 'Hạch dưới hàm'],
    correctIndex: 2,
    explanation: 'Dòng bạch huyết chi dưới đổ về chuỗi hạch bẹn và qua Cisterna Chyli trước khi vào ống ngực.',
  },
  {
    id: 'q6',
    question: 'Trước khi dẫn lưu khu vực tổn thương ngoại vi, nguyên tắc quan trọng nhất là gì?',
    options: ['Làm rỗng và giải phóng các hạch bạch huyết trung tâm (Cổ & Thượng đòn)', 'Xoa bóp thật mạnh tại chỗ sưng', 'Chườm đá lạnh lập tức', 'Cho bệnh nhân vận động nặng'],
    correctIndex: 0,
    explanation: 'Luôn phải thông đường thoát ở trung tâm (Terminus) trước khi đẩy dịch từ ngoại vi về.',
  },
  {
    id: 'q7',
    question: 'Mục đích chính của kỹ thuật MLD trong phục hồi hậu phẫu là gì?',
    options: ['Tăng tốc tiêu sưng, chống ứ trệ phù nề, ngăn ngừa mô sẹo xơ cứng', 'Làm tan mỡ vĩnh viễn', 'Thay thế thuốc kháng sinh', 'Kéo dài thời gian lành vết mổ'],
    correctIndex: 0,
    explanation: 'MLD giảm áp lực kẽ, đào thải tế bào chết và ngăn chặn hình thành mô xơ sẹo co rút.',
  },
  {
    id: 'q8',
    question: 'Tại sao không được sử dụng dầu massage có độ trơn cao khi làm MLD Vodder?',
    options: ['Vì dầu gây mụn', 'Vì kỹ thuật Vodder cần độ bám ma sát da để kéo dãn vi sợi bạch huyết mở van', 'Vì dầu đắt tiền', 'Vì làm bẩn khăn'],
    correctIndex: 1,
    explanation: 'Độ bám da là yếu tố quyết định để kéo căng nhẹ các sợi neo (anchoring filaments) mở vi van bạch huyết.',
  },
  {
    id: 'q9',
    question: 'Ống ngực (Thoracic Duct) đổ dịch bạch huyết vào hệ tuần hoàn tĩnh mạch ở vị trí nào?',
    options: ['Tĩnh mạch chủ dưới', 'Góc tĩnh mạch dưới đòn và tĩnh mạch cảnh trong bên trái', 'Động mạch cảnh', 'Tâm nhĩ phải trực tiếp'],
    correctIndex: 1,
    explanation: 'Thoracic duct đổ vào góc tĩnh mạch cảnh-dưới đòn trái (Left venous angle).',
  },
  {
    id: 'q10',
    question: 'Liệu pháp kết hợp tiêu chuẩn vàng cho bệnh nhân Phù bạch huyết mạn tính (CDT) gồm những gì?',
    options: ['Chỉ cần uống thuốc lợi tiểu', 'MLD, Băng ép đa lớp (Bandaging), Bài tập trị liệu, Chăm sóc da y khoa', 'Chỉ xông hơi khô', 'Nghỉ ngơi hoàn toàn bất động'],
    correctIndex: 1,
    explanation: 'Complex Decongestive Therapy (CDT) là tiêu chuẩn vàng kết hợp MLD + Compression + Exercise + Skin care.',
  },
];

export const AcademyScreen: React.FC<AcademyScreenProps> = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [selectedAudience, setSelectedAudience] = useState<string>('Tất cả');
  const [selectedNeed, setSelectedNeed] = useState<string>('Tất cả');
  const [audienceDropdownOpen, setAudienceDropdownOpen] = useState(false);
  const [needDropdownOpen, setNeedDropdownOpen] = useState(false);

  // Active Screen View: 'catalog' | 'class_detail' | 'attendance'
  const [currentView, setCurrentView] = useState<'catalog' | 'class_detail'>('catalog');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Class Detail state
  const [classTab, setClassTab] = useState<'curriculum' | 'schedule'>('curriculum');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({ c1: true, ch_01: true });

  // Video Player Modal (E09)
  const [activeVideoLesson, setActiveVideoLesson] = useState<Lesson | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Quiz Modal (E10)
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>(new Array(10).fill(-1));
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Attendance scanner simulation
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSuccess, setScannerSuccess] = useState(false);

  const userProfile = supabaseApi.getUserProfile();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const data = await supabaseApi.getCourses();
    setCourses(data);
    setLoading(false);
  };

  const handleOpenCourse = async (course: Course) => {
    setSelectedCourse(course);
    const curriculum = await supabaseApi.getCourseCurriculum(course.id);
    setChapters(curriculum);
    const completed = supabaseApi.getCompletedLessons(course.id);
    setCompletedLessonIds(completed);
    setCurrentView('class_detail');
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const matchAudience =
      selectedAudience === 'Tất cả' ||
      c.category.toLowerCase().includes(selectedAudience.toLowerCase()) ||
      (selectedAudience === 'Bác sĩ/Y sĩ' && c.level === 'Chuyên sâu');
    const matchNeed =
      selectedNeed === 'Tất cả' ||
      c.title.toLowerCase().includes(selectedNeed.toLowerCase()) ||
      c.description.toLowerCase().includes(selectedNeed.toLowerCase());
    return matchAudience && matchNeed;
  });

  // Calculate progress
  const allLessons = chapters.flatMap((c) => c.lessons);
  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const is100PercentDone = totalLessons > 0 && completedCount >= totalLessons;

  // Mark lesson done
  const handleMarkLessonDone = (lessonId: string) => {
    if (!selectedCourse) return;
    const updated = supabaseApi.markLessonCompleted(selectedCourse.id, lessonId);
    setCompletedLessonIds([...updated]);
    setActiveVideoLesson(null);
  };

  // Quiz submission
  const handleSubmitQuiz = () => {
    let correct = 0;
    SAMPLE_QUIZ_QUESTIONS.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    setQuizScore(correct);
    setQuizSubmitted(true);
  };

  const handleResetQuiz = () => {
    setQuizAnswers(new Array(10).fill(-1));
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* View 1: Course Catalog (E01) */}
      {currentView === 'catalog' && (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-b-2xl shadow-md">
            <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>Học viện Đào tạo MLD Quốc Tế</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Khóa học & Chứng nhận Vodder</h1>
            <p className="text-xs text-blue-100 mt-1">
              Chuyển giao phác đồ Dẫn lưu Bạch huyết chuẩn y khoa CHLB Đức
            </p>
          </div>

          {/* Clean Dropdown Filters [Đối tượng ▼] and [Nhu cầu ▼] */}
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="flex items-center space-x-3">
              {/* Audience Filter */}
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setAudienceDropdownOpen(!audienceDropdownOpen);
                    setNeedDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 transition"
                >
                  <span className="truncate">Đối tượng: {selectedAudience}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                </button>

                {audienceDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 max-h-56 overflow-y-auto">
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedAudience(opt);
                          setAudienceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition ${
                          selectedAudience === opt ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Need Filter */}
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setNeedDropdownOpen(!needDropdownOpen);
                    setAudienceDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 transition"
                >
                  <span className="truncate">Nhu cầu: {selectedNeed}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                </button>

                {needDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 max-h-56 overflow-y-auto">
                    {NEED_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedNeed(opt);
                          setNeedDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition ${
                          selectedNeed === opt ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Courses List */}
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-xs">Đang tải danh sách khóa học...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Không tìm thấy khóa học phù hợp với bộ lọc đã chọn.
              </div>
            ) : (
              filteredCourses.map((course) => {
                const isEnrolled = supabaseApi.isCourseEnrolled(course.id);
                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="relative h-44 bg-slate-900">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      {isEnrolled ? (
                        <div className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 mr-1 inline" />
                          <span>ĐÃ ĐĂNG KÝ</span>
                        </div>
                      ) : (
                        <div className="absolute top-2.5 left-2.5 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          {course.level}
                        </div>
                      )}
                      <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur text-white text-[10px] font-medium px-2 py-0.5 rounded flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-emerald-400" />
                        {course.durationWeeks} tuần ({course.totalHours}h)
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1.5">{course.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-3">{course.description}</p>

                      <div className="flex items-center space-x-2 text-xs text-slate-500 border-t border-slate-100 pt-3 mb-3">
                        <img
                          src={course.instructorAvatar}
                          alt={course.instructorName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div className="flex-1 truncate">
                          <span className="font-semibold text-slate-800 block text-xs">{course.instructorName}</span>
                          <span className="text-[10px] text-slate-400">{course.instructorTitle}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Học phí trọn gói</span>
                          <span className="text-sm font-black text-blue-600">
                            {course.tuitionFee.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenCourse(course)}
                          className={`py-2 px-4 font-semibold text-xs rounded-lg shadow transition flex items-center space-x-1 ${
                            isEnrolled
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {isEnrolled ? (<span>Đã đăng ký · Vào học</span>) : (<span>Đăng ký học</span>)}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* View 2: Class Detail & Curriculum Screen (E08) */}
      {currentView === 'class_detail' && selectedCourse && (
        <div className="p-4 space-y-4">
          {/* Back button */}
          <button
            onClick={() => setCurrentView('catalog')}
            className="flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 mb-1"
          >
            <span>← Quay lại danh mục đào tạo</span>
          </button>

          {/* Course Banner Card: Bảng thông tin chỉ hiện tên khóa học */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">{selectedCourse.title}</h2>
          </div>

          {/* Tabs: Nội dung học (Curriculum) vs Lịch học (Attendance E11) */}
          <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setClassTab('curriculum')}
              className={`flex-1 py-2 text-xs font-bold rounded transition ${
                classTab === 'curriculum' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nội dung bài giảng
            </button>
            <button
              onClick={() => setClassTab('schedule')}
              className={`flex-1 py-2 text-xs font-bold rounded transition ${
                classTab === 'schedule' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch học & Điểm danh (E11)
            </button>
          </div>

          {/* Tab 1: Curriculum List & Quiz Gate */}
          {classTab === 'curriculum' && (
            <div className="space-y-4">
              {/* Chapters & Lessons with Collapsible Accordion & Unified 16:9 Thumbnail Layout */}
              {chapters.map((chapter, cIdx) => {
                const isExpanded = expandedChapterIds[chapter.id] ?? (cIdx === 0);
                return (
                  <div key={chapter.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Chapter Accordion Header */}
                    <div
                      onClick={() =>
                        setExpandedChapterIds((prev) => ({
                          ...prev,
                          [chapter.id]: !isExpanded,
                        }))
                      }
                      className="bg-slate-50 hover:bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer transition select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {cIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {chapter.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                          {chapter.lessons.length} video
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Lesson Items inside Chapter */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {chapter.lessons.map((lesson) => {
                          const isDone = completedLessonIds.includes(lesson.id);
                          const isEnrolled = selectedCourse ? supabaseApi.isCourseEnrolled(selectedCourse.id) : false;
                          const durationDisplay = lesson.durationMinutes === 95 ? '94:48' : `${lesson.durationMinutes}:00`;
                          const ytid = lesson.youtubeId || (lesson.videoUrl ? (lesson.videoUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null) : null);

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => {
    setActiveVideoLesson(lesson);
  }}
                              className="p-3 flex items-center space-x-3 hover:bg-blue-50/40 cursor-pointer transition"
                            >
                              {/* BÊN TRÁI: Video Thumbnail 16:9 với Nút Phát tròn ở giữa và Badge thời lượng */}
                              <div className="relative w-28 h-16 bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                <img
                                  src={
                                    ytid
                                      ? `https://img.youtube.com/vi/${ytid}/mqdefault.jpg`
                                      : (selectedCourse?.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136')
                                  }
                                  alt={lesson.title}
                                  className="w-full h-full object-cover opacity-80"
                                />

                                <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">
                                  {durationDisplay}
                                </div>
                              </div>

                              {/* BÊN PHẢI: Tiêu đề video và Trạng thái */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                                  {lesson.title}
                                </h4>
                                <div className="mt-1 flex items-center space-x-2">
                                  {!isEnrolled ? (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      Khóa
                                    </span>
                                  ) : isDone ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center space-x-1">
                                      Đã học
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded flex items-center space-x-1">
                                      Vào học
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quiz Card - STRICTLY LOCKED UNTIL 100% COMPLETED */}
              <div
                className={`rounded-xl border p-4 shadow-sm transition ${
                  is100PercentDone
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      is100PercentDone ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {is100PercentDone ? <Award className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        BÀI KIỂM TRA ĐÁNH GIÁ KHÓA HỌC (E10)
                      </h3>
                      {!is100PercentDone && (
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Đang khóa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      10 câu hỏi trắc nghiệm y khoa chuyên môn Vodder · Điểm đạt tối thiểu: 8/10 câu
                    </p>

                    {!is100PercentDone ? (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Bạn cần hoàn thành tất cả video bài học trước khi làm bài kiểm tra.</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsQuizModalOpen(true)}
                        className="mt-3 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5"
                      >
                        <Award className="w-4 h-4" />
                        <span>Bắt đầu làm bài kiểm tra (15 phút)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Attendance & Schedule (E11) */}
          {classTab === 'schedule' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <Calendar className="w-4 h-4 text-blue-600 mr-1.5" />
                    Lịch học trực tiếp tại Học viện
                  </h3>
                  
                </div>

                <div className="py-8 text-center space-y-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Chưa có lịch học thực hành trực tiếp tại cơ sở</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Khóa học hiện được đào tạo trực tuyến qua hệ thống video bài giảng. Bạn có thể xem và thực hành toàn bộ bài giảng trong tab "Nội dung bài giảng".
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 0: Enrollment Required Modal (Chưa đăng ký khóa học không được xem) */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Đăng ký để học</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Chưa đăng ký khóa học không được xem video bài giảng. Bạn cần đăng ký khóa học <strong>"{selectedCourse?.title}"</strong> để mở khóa toàn bộ bài học và thực hành lâm sàng.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedCourse) {
                    supabaseApi.enrollCourse(selectedCourse.id);
                  }
                  setShowEnrollModal(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Đăng ký khóa học ngay
              </button>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: E09 Video Player with Anti-Right-Click & Watermark */}
      {activeVideoLesson && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-3 border-b border-slate-800 text-white">
              <span className="text-xs font-bold truncate pr-2">{activeVideoLesson.title}</span>
              <button
                onClick={() => setActiveVideoLesson(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Container with Watermark and Right-click lock */}
            <div
              className="relative aspect-video bg-black select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideoLesson.youtubeId || (activeVideoLesson.videoUrl ? (activeVideoLesson.videoUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || '1F2b2Uf0a88') : '1F2b2Uf0a88')}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideoLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>

              {/* Security Watermark floating */}
              <div className="absolute top-3 right-3 pointer-events-none text-[10px] text-white/50 font-mono select-none bg-black/40 px-2 py-0.5 rounded shadow">
                MLD BẢN QUYỀN · ID: 4EE38F82 · buih73444@gmail.com · 096.7786.399
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-900 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Thời lượng: {activeVideoLesson.durationMinutes} phút</span>
                <span className="text-emerald-400 flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Bảo mật bản quyền y khoa
                </span>
              </div>

              <div className="p-2.5 bg-slate-800 rounded-lg text-xs text-slate-300">
                Hệ thống tự động ghi nhớ vị trí xem. Bạn cần xem hết video để tự động mở khóa bài học tiếp theo.
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setActiveVideoLesson(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition text-center"
                >
                  Đóng bài giảng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: E10 Quiz Assessment Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold">Bài kiểm tra đánh giá Vodder MLD (E10)</h3>
                <p className="text-[11px] text-blue-100">10 câu trắc nghiệm · Yêu cầu đạt ≥ 8/10 câu</p>
              </div>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {SAMPLE_QUIZ_QUESTIONS.map((q, qIdx) => (
                <div key={q.id} className="border-b border-slate-100 pb-4">
                  <p className="text-xs font-bold text-slate-900 mb-2">
                    Câu {qIdx + 1}: {q.question}
                  </p>

                  <div className="space-y-1.5">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = quizAnswers[qIdx] === oIdx;
                      let optionClass = 'border-slate-200 hover:bg-slate-50';
                      if (isSelected) {
                        optionClass = 'border-blue-600 bg-blue-50 text-blue-700 font-semibold';
                      }
                      if (quizSubmitted) {
                        if (oIdx === q.correctIndex) {
                          optionClass = 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold';
                        } else if (isSelected && isSelected !== (oIdx === q.correctIndex)) {
                          optionClass = 'border-rose-400 bg-rose-50 text-rose-700';
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => {
                            const copy = [...quizAnswers];
                            copy[qIdx] = oIdx;
                            setQuizAnswers(copy);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition ${optionClass}`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Giải thích:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quiz Result & Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              {quizSubmitted ? (
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-xl border text-center ${
                      quizScore >= 8
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <h4 className="text-base font-bold">
                      Kết quả: {quizScore}/10 câu ({quizScore >= 8 ? 'ĐẠT' : 'CHƯA ĐẠT'})
                    </h4>
                    <p className="text-xs mt-1">
                      {quizScore >= 8
                        ? 'Xuất sắc! Bạn đã đủ điều kiện nhận Chứng nhận Hoàn thành khóa học MLD Vodder.'
                        : 'Bạn cần ôn tập lại kiến thức bài giảng và làm lại bài kiểm tra để đạt tối thiểu 8/10.'}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleResetQuiz}
                      className="flex-1 py-2.5 bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg hover:bg-slate-300 transition flex items-center justify-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Làm lại bài thi</span>
                    </button>
                    <button
                      onClick={() => setIsQuizModalOpen(false)}
                      className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Nộp bài thi đánh giá
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QR Attendance Scanner Simulation */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">Quét mã QR tại Học viện</h3>

            {scannerSuccess ? (
              <div className="space-y-3 py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Điểm danh thành công!</h4>
                <p className="text-xs text-slate-500">
                  Học viên: {userProfile.fullName} · Phòng Lab 201
                </p>
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="py-2 px-5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
                >
                  Hoàn tất
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative w-48 h-48 mx-auto border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center bg-slate-900 text-slate-400">
                  <div className="absolute inset-4 border border-blue-400 rounded-lg animate-pulse"></div>
                  <QrCode className="w-16 h-16 text-blue-400" />
                </div>
                <p className="text-xs text-slate-500">Hướng camera Zalo vào mã QR tại cửa lớp học</p>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setScannerSuccess(true)}
                    className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Mô phỏng quét mã
                  </button>
                  <button
                    onClick={() => setIsScannerOpen(false)}
                    className="py-2.5 px-4 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



