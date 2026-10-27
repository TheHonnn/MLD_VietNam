import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import 'e08_class_detail_screen.dart';
import 'e10_quiz_screen.dart';

/// Screen E07: Khóa học của tôi
/// Gồm 2 tab chuẩn theo yêu cầu:
/// Tab 1: "Đang học" - chỉ hiển thị các khóa học đã đăng ký
/// Tab 2: "Kiểm tra" - hiện danh sách khóa học đã đăng ký, bấm vào khóa học sẽ hiện danh sách bài kiểm tra theo course_id
class E07MyCoursesScreen extends StatefulWidget {
  final int initialTabIndex;

  const E07MyCoursesScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<E07MyCoursesScreen> createState() => _E07MyCoursesScreenState();
}

class _E07MyCoursesScreenState extends State<E07MyCoursesScreen> {
  late int _selectedTab;
  String? _expandedCourseIdForQuiz;
  final Map<String, List<CourseQuizModel>> _courseQuizzesCache = {};
  bool _isLoadingQuizzes = false;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTabIndex;
    final enrolled = AcademyRepository.instance.enrolledCourses;
    if (enrolled.isNotEmpty) {
      _expandedCourseIdForQuiz = enrolled.first.id;
      _courseQuizzesCache[enrolled.first.id] =
          MockAcademyData.getQuizzesForCourse(enrolled.first.id, enrolled.first.title);
      _loadQuizzesForCourse(enrolled.first);
    }
    _refreshCourses();
  }

  void _refreshCourses() {
    AcademyRepository.instance.getMyCourses().then((courses) {
      if (mounted) {
        setState(() {
          if (courses.isNotEmpty && _expandedCourseIdForQuiz == null) {
            _expandedCourseIdForQuiz = courses.first.id;
            _loadQuizzesForCourse(courses.first);
          }
        });
      }
    });
  }

  void _loadQuizzesForCourse(CourseModel course) async {
    if (_courseQuizzesCache.containsKey(course.id)) return;
    setState(() => _isLoadingQuizzes = true);
    try {
      final list = await AcademyRepository.instance.getCourseQuizModels(course.id, course.title);
      if (mounted) {
        setState(() {
          _courseQuizzesCache[course.id] = list;
          _isLoadingQuizzes = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingQuizzes = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enrolledCourses = AcademyRepository.instance.enrolledCourses;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Giới thiệu
            const Text(
              'MLD VietNam',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                color: AcademyColors.primary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              context.tr('Khóa học của tôi', 'My Courses'),
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 26,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              context.tr(
                'Theo dõi khóa học đã đăng ký và hoàn thành các bài kiểm tra đánh giá năng lực.',
                'Track enrolled courses and complete qualification assessments.',
              ),
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // 2. Thẻ thông tin tổng quan
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _buildMetricColumn('${enrolledCourses.length}', context.tr('đã đăng ký', 'enrolled')),
                      _buildMetricColumn(
                        '${enrolledCourses.fold<int>(0, (acc, c) => acc + c.totalHours)}',
                        context.tr('giờ đào tạo', 'training hours'),
                      ),
                      _buildMetricColumn(
                        '${_countPassedQuizzes(enrolledCourses)}',
                        context.tr('bài đạt', 'passed quizzes'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    context.isEn
                        ? '${enrolledCourses.length} active registered courses'
                        : '${enrolledCourses.length} khóa học đã đăng ký đang tham gia',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.tr(
                      'Tất cả bài học và bài kiểm tra đánh giá chuyên môn y khoa Vodder.',
                      'All lectures and Vodder medical evaluation quizzes.',
                    ),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Thẻ điều hướng 2 Tab duy nhất theo yêu cầu: [Đang học] và [Kiểm tra]
            Container(
              height: 48,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AcademyColors.cardBorder, width: 1.0),
                ),
              ),
              child: Row(
                children: [
                  _buildNavTab(0, '${context.tr('Đang học', 'In Progress')} (${enrolledCourses.length})'),
                  _buildNavTab(1, context.tr('Kiểm tra', 'Quizzes & Tests')),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Nội dung Tab
            if (_selectedTab == 0) ...[
              // TAB 1: ĐANG HỌC (CHỈ HIỆN CÁC KHÓA HỌC ĐÃ ĐĂNG KÝ)
              if (enrolledCourses.isNotEmpty)
                ...enrolledCourses.map((c) => _buildEnrolledCard(c))
              else
                _buildEmptyCourseState('đã đăng ký'),
            ] else ...[
              // TAB 2: KIỂM TRA (HIỆN KHÓA HỌC ĐÃ ĐĂNG KÝ -> BẤM VÀO HIỆN CÁC BÀI KIỂM TRA THEO COURSE_ID)
              if (enrolledCourses.isNotEmpty)
                _buildQuizSection(enrolledCourses)
              else
                _buildEmptyCourseState('kiểm tra'),
            ],
          ],
        ),
      ),
    );
  }

  int _countPassedQuizzes(List<CourseModel> courses) {
    int passed = 0;
    for (final c in courses) {
      final quizzes = _courseQuizzesCache[c.id] ?? MockAcademyData.getQuizzesForCourse(c.id, c.title);
      for (final q in quizzes) {
        final sub = AcademyRepository.instance.getQuizSubmission(q.id);
        if (sub != null && sub.passed) passed++;
      }
    }
    return passed;
  }

  Widget _buildMetricColumn(String count, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            count,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 26,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AcademyColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavTab(int index, String title) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTab = index),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isSelected ? AcademyColors.primary : Colors.transparent,
                width: 3.0,
              ),
            ),
          ),
          child: Text(
            title,
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 14.5,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
              color: isSelected ? AcademyColors.primary : AcademyColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyCourseState(String tabTitle) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        children: [
          const Icon(Icons.school_outlined, size: 48, color: AcademyColors.textSecondary),
          const SizedBox(height: 14),
          Text(
            'Chưa có khóa học $tabTitle',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            context.tr(
              'Khám phá danh mục các khóa đào tạo nghề Spa & Trị liệu dưỡng sinh của Học viện MLD để nâng cao tay nghề.',
              'Explore MLD Academy vocational training courses to advance your skills.',
            ),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AcademyColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 46,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const E01AcademyHomeScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AcademyColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: Text(
                context.tr('Khám phá khóa học ngay', 'Explore Courses Now'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Thẻ khóa học trong Tab Đang học
  Widget _buildEnrolledCard(CourseModel course) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  course.image,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 80,
                    height: 80,
                    color: AcademyColors.cardWarm,
                    child: const Icon(Icons.school, color: AcademyColors.primary),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'ĐÃ ĐĂNG KÝ · ĐANG HỌC',
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      course.title.tr(context),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${course.totalHours} ${context.tr('giờ', 'hours')} · ${course.branch.tr(context)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AcademyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: AcademyColors.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  course.schedule,
                  style: const TextStyle(fontSize: 12, color: AcademyColors.textPrimary, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => E08ClassDetailScreen(course: course)),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AcademyColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text(
                'Vào học ngay',
                style: TextStyle(fontFamily: 'Montserrat', fontSize: 13.5, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// TAB 2: KIỂM TRA (DANH SÁCH BÀI KIỂM TRA GẮN THEO ID KHÓA HỌC ĐÃ ĐĂNG KÝ)
  Widget _buildQuizSection(List<CourseModel> enrolledCourses) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Chọn khóa học để làm bài kiểm tra:',
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AcademyColors.heading,
          ),
        ),
        const SizedBox(height: 10),

        // Danh sách các khóa học đã đăng ký để học viên chọn
        ...enrolledCourses.map((course) {
          final isSelected = _expandedCourseIdForQuiz == course.id;
          final quizzes = _courseQuizzesCache[course.id] ??
              MockAcademyData.getQuizzesForCourse(course.id, course.title);

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? AppColors.primary : AcademyColors.cardBorder,
                width: isSelected ? 1.5 : 1.0,
              ),
            ),
            child: Column(
              children: [
                // Thẻ khóa học (Bấm vào để mở/thu gọn danh sách bài kiểm tra)
                InkWell(
                  onTap: () {
                    setState(() {
                      if (_expandedCourseIdForQuiz == course.id) {
                        _expandedCourseIdForQuiz = null;
                      } else {
                        _expandedCourseIdForQuiz = course.id;
                        _loadQuizzesForCourse(course);
                      }
                    });
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.asset(
                            course.image,
                            width: 60,
                            height: 60,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 60,
                              height: 60,
                              color: AcademyColors.cardWarm,
                              child: const Icon(Icons.quiz_outlined, color: AcademyColors.primary),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                course.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? AppColors.primary : AcademyColors.heading,
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${quizzes.length} bài kiểm tra trắc nghiệm',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AcademyColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          isSelected ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                          color: isSelected ? AppColors.primary : Colors.grey[500],
                        ),
                      ],
                    ),
                  ),
                ),

                // Danh sách bài kiểm tra của khóa học (hiển thị khi được chọn)
                if (isSelected) ...[
                  const Divider(height: 1, color: AcademyColors.cardBorder),
                  Container(
                    color: const Color(0xFFFAFAFA),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: _isLoadingQuizzes && !_courseQuizzesCache.containsKey(course.id)
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        : quizzes.isEmpty
                            ? const Padding(
                                padding: EdgeInsets.all(16.0),
                                child: Text(
                                  'Chưa có bài kiểm tra nào được tạo cho khóa học này.',
                                  style: TextStyle(fontSize: 12.5, color: Colors.grey),
                                ),
                              )
                            : Column(
                                children: quizzes.map((quiz) {
                                  return _buildQuizItemCard(course, quiz);
                                }).toList(),
                              ),
                  ),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }

  /// Thẻ hiển thị một bài kiểm tra với nút Bắt đầu
  Widget _buildQuizItemCard(CourseModel course, CourseQuizModel quiz) {
    final submission = AcademyRepository.instance.getQuizSubmission(quiz.id);
    final hasTaken = submission != null;
    final isPassed = submission?.passed ?? false;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: hasTaken
              ? (isPassed ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA))
              : AcademyColors.cardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề bài kiểm tra do Admin tạo
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  quiz.title,
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.heading,
                    height: 1.35,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (hasTaken)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isPassed ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isPassed
                        ? 'ĐẠT · ${submission.score.toStringAsFixed(1)}/10'
                        : 'CHƯA ĐẠT · ${submission.score.toStringAsFixed(1)}/10',
                    style: TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isPassed ? const Color(0xFF047857) : const Color(0xFFDC2626),
                    ),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Chưa làm bài',
                    style: TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),

          // Thông tin: Thời gian, số câu, tiêu chí được điểm theo Admin quy định
          Text(
            '${quiz.totalQuestions} câu hỏi · Thời gian: ${quiz.timeLimitMinutes} phút',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AcademyColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tiêu chí đạt: ≥ ${quiz.passingScore.toStringAsFixed(1)} / 10 điểm (≥ 80% theo quy định Admin)',
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 12),

          // NÚT BẮT ĐẦU TRÊN BÀI KIỂM TRA
          SizedBox(
            width: double.infinity,
            height: 38,
            child: ElevatedButton(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => E10QuizScreen(
                      quiz: quiz,
                      course: course,
                      quizTitle: quiz.title,
                      courseTitle: course.title,
                      totalQuestions: quiz.totalQuestions,
                      timeLimitMinutes: quiz.timeLimitMinutes,
                      passingScore: quiz.passingScore,
                    ),
                  ),
                );
                if (result == true || mounted) {
                  setState(() {});
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: hasTaken && isPassed ? const Color(0xFF047857) : AcademyColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              child: Text(
                hasTaken ? (isPassed ? 'Xem lại bài thi' : 'Bắt đầu làm lại') : 'Bắt đầu',
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
