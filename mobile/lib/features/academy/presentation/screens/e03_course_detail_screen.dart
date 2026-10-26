import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e04_instructor_profile_screen.dart';
import 'e05_enrollment_form_screen.dart';
import 'e09_lesson_screen.dart';

/// Screen E03: Chi tiết khóa học & Danh sách Video bài giảng
/// Bấm vào khóa học hiện tất cả video khóa học; Muốn xem phải đăng ký khóa học.
class E03CourseDetailScreen extends StatefulWidget {
  final CourseModel course;

  const E03CourseDetailScreen({
    super.key,
    required this.course,
  });

  @override
  State<E03CourseDetailScreen> createState() => _E03CourseDetailScreenState();
}

class _E03CourseDetailScreenState extends State<E03CourseDetailScreen> {
  bool _isBookmarked = false;
  int _selectedTab = 0; // 0: Video bài học (Mặc định hiển thị tất cả video), 1: Thông tin chi tiết
  List<ChapterModel> _chapters = [];
  bool _isLoadingCurriculum = false;

  bool get _isEnrolled => AcademyRepository.instance.isCourseEnrolled(widget.course.id, widget.course.title);

  int get _totalLessonsCount => _chapters.fold<int>(0, (sum, c) => sum + c.lessons.length);

  InstructorModel get _instructor {
    return MockAcademyData.instructors.firstWhere(
      (i) => i.name == widget.course.instructorName,
      orElse: () => MockAcademyData.instructors.first,
    );
  }

  @override
  void initState() {
    super.initState();
    _loadCurriculum();
  }

  Future<void> _loadCurriculum() async {
    setState(() => _isLoadingCurriculum = true);
    try {
      final data = await AcademyRepository.instance.getCourseCurriculum(widget.course.id);
      if (mounted) {
        setState(() => _chapters = data);
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isLoadingCurriculum = false);
    }
  }

  void _onLessonTap(LessonModel lesson) {
    if (_isEnrolled || lesson.isFreePreview) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => E09LessonScreen(
            lesson: lesson,
            courseTitle: widget.course.title,
          ),
        ),
      );
    } else {
      _showEnrollRequiredModal(lesson);
    }
  }

  void _showEnrollRequiredModal(LessonModel lesson) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_outline_rounded, size: 28, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            const Text(
              'Yêu cầu đăng ký khóa học',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Video "${lesson.title}" thuộc khóa học "${widget.course.title}".\n\nBạn cần đăng ký khóa học để xem toàn bộ video bài giảng và tài liệu học tập chuẩn y khoa Vodder.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 13.5,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => E05EnrollmentFormScreen(course: widget.course),
                    ),
                  ).then((_) {
                    if (mounted) setState(() {});
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text(
                  'Đăng ký khóa học ngay',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'Để sau',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  color: AppColors.textSecondary,
                  fontSize: 13.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: _isEnrolled
            ? 'Đã đăng ký khóa học'
            : 'Học phí · ${formatCurrency(course.tuitionFee)}đ',
        buttonText: _isEnrolled ? 'Vào xem video bài học' : 'Đăng ký khóa học',
        onPressed: () {
          if (_isEnrolled) {
            final firstLesson = _chapters.isNotEmpty && _chapters[0].lessons.isNotEmpty
                ? _chapters[0].lessons[0]
                : null;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => E09LessonScreen(
                  lesson: firstLesson,
                  courseTitle: widget.course.title,
                ),
              ),
            );
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => E05EnrollmentFormScreen(course: course),
              ),
            ).then((_) {
              if (mounted) setState(() {});
            });
          }
        },
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề khóa học
            Text(
              course.title,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. Ảnh khóa học & Tiện ích Share/Bookmark
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    course.image,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AcademyColors.cardWarm,
                      child: const Center(
                        child: Icon(Icons.school, size: 60, color: AcademyColors.primary),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Row(
                      children: [
                        InkWell(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Đã sao chép liên kết khóa học'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.share_outlined,
                              color: AcademyColors.textPrimary,
                              size: 18,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () {
                            setState(() => _isBookmarked = !_isBookmarked);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  _isBookmarked
                                      ? 'Đã lưu khóa học'
                                      : 'Đã bỏ lưu khóa học',
                                ),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              _isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                              color: _isBookmarked
                                  ? AcademyColors.primary
                                  : AcademyColors.textPrimary,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 3. Thẻ thông số tóm tắt
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildQuickStat(
                    label: 'Video bài giảng',
                    value: '$_totalLessonsCount bài',
                    icon: Icons.play_circle_fill,
                    color: AppColors.primary,
                  ),
                  Container(width: 1, height: 32, color: AppColors.border),
                  _buildQuickStat(
                    label: 'Thời lượng',
                    value: '${course.totalHours} giờ',
                    icon: Icons.schedule_rounded,
                    color: const Color(0xFFD97706),
                  ),
                  Container(width: 1, height: 32, color: AppColors.border),
                  _buildQuickStat(
                    label: 'Trạng thái',
                    value: _isEnrolled ? 'Đã đăng ký' : 'Cần đăng ký',
                    icon: _isEnrolled ? Icons.check_circle_rounded : Icons.lock_outline_rounded,
                    color: _isEnrolled ? const Color(0xFF2E8B57) : const Color(0xFFE11D48),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 4. Thanh chuyển Tab: [ ▶ Video bài học ] & [ ℹ Giới thiệu khóa học ]
            Container(
              height: 44,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _selectedTab = 0),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _selectedTab == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _selectedTab == 0
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.06),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.play_circle_fill_rounded,
                              size: 17,
                              color: _selectedTab == 0 ? AppColors.primary : AppColors.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Video bài học ($_totalLessonsCount)',
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13,
                                fontWeight: _selectedTab == 0 ? FontWeight.bold : FontWeight.w600,
                                color: _selectedTab == 0 ? AppColors.primary : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _selectedTab = 1),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _selectedTab == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _selectedTab == 1
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.06),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              size: 17,
                              color: _selectedTab == 1 ? AppColors.primary : AppColors.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Thông tin khóa học',
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13,
                                fontWeight: _selectedTab == 1 ? FontWeight.bold : FontWeight.w600,
                                color: _selectedTab == 1 ? AppColors.primary : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 5. Nội dung Tab 0: Danh sách tất cả Video bài giảng (Hiển thị ngay lập tức)
            if (_selectedTab == 0) ...[
              if (!_isEnrolled)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.lock_rounded, color: Color(0xFFD97706), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: RichText(
                          text: const TextSpan(
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12.5,
                              color: Color(0xFF92400E),
                              height: 1.4,
                            ),
                            children: [
                              TextSpan(
                                text: 'Muốn xem toàn bộ video bài giảng: ',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text: 'Bạn cần đăng ký khóa học để mở khóa tất cả các bài học và học liệu bên dưới.',
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              if (_isLoadingCurriculum)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32.0),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (_chapters.isNotEmpty) ...[
                for (int cIndex = 0; cIndex < _chapters.length; cIndex++)
                  _buildChapterVideoSection(_chapters[cIndex], cIndex + 1),
              ] else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Center(
                    child: Text(
                      'Đang cập nhật danh sách video bài giảng...',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
            ] else ...[
              // Tab 1: Thông tin chi tiết khóa học
              _buildCourseOverview(course),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStat({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: AcademyColors.heading,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 11,
            color: AcademyColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildChapterVideoSection(ChapterModel chapter, int chapterNum) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Chương
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AcademyColors.cardWarm,
              borderRadius: BorderRadius.vertical(top: Radius.circular(11)),
            ),
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '$chapterNum',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    chapter.title,
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AcademyColors.heading,
                    ),
                  ),
                ),
                Text(
                  '${chapter.lessons.length} video',
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),

          // Danh sách bài học video trong chương
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 6),
            itemCount: chapter.lessons.length,
            separatorBuilder: (_, __) => const Divider(height: 1, indent: 56, endIndent: 16, color: AcademyColors.cardBorder),
            itemBuilder: (context, index) {
              final lesson = chapter.lessons[index];
              final canWatch = _isEnrolled || lesson.isFreePreview;

              return InkWell(
                onTap: () => _onLessonTap(lesson),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      // Icon Trạng thái
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: canWatch
                              ? AppColors.primary.withValues(alpha: 0.1)
                              : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          canWatch ? Icons.play_arrow_rounded : Icons.lock_outline_rounded,
                          color: canWatch ? AppColors.primary : Colors.grey[600],
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Thông tin bài học
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              lesson.title,
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: canWatch ? AcademyColors.textPrimary : Colors.grey[700],
                              ),
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Text(
                                  '${lesson.durationMinutes} phút · Video YouTube',
                                  style: TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 11.5,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Badge quyền truy cập
                      if (_isEnrolled)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Đã mở',
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2E8B57),
                            ),
                          ),
                        )
                      else if (lesson.isFreePreview)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Học thử ▶',
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF1F2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.lock, size: 10, color: Color(0xFFE11D48)),
                              SizedBox(width: 3),
                              Text(
                                'Cần đăng ký',
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFE11D48),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCourseOverview(CourseModel course) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Giới thiệu
        const Text(
          'Giới thiệu khóa học',
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AcademyColors.heading,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          course.description.isNotEmpty
              ? course.description
              : 'Chương trình đào tạo chuẩn y khoa Quốc tế Vodder MLD, kết hợp lý thuyết giải phẫu tuần hoàn và thực hành lâm sàng.',
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 13.5,
            color: AcademyColors.textPrimary,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 16),

        // Đối tượng & Nhu cầu Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AcademyColors.cardBorder),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Icon(Icons.people_outline, size: 18, color: AcademyColors.primary),
                  const SizedBox(width: 8),
                  const Text('Đối tượng:', style: TextStyle(fontFamily: 'Montserrat', fontSize: 13, fontWeight: FontWeight.w700, color: AcademyColors.heading)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      course.targetAudience,
                      style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13, fontWeight: FontWeight.w500, color: AcademyColors.textPrimary),
                    ),
                  ),
                ],
              ),
              const Divider(height: 16, color: AcademyColors.cardBorder),
              Row(
                children: [
                  const Icon(Icons.track_changes, size: 18, color: AcademyColors.primary),
                  const SizedBox(width: 8),
                  const Text('Nhu cầu:', style: TextStyle(fontFamily: 'Montserrat', fontSize: 13, fontWeight: FontWeight.w700, color: AcademyColors.heading)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      course.targetNeed,
                      style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13, fontWeight: FontWeight.w500, color: AcademyColors.textPrimary),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Bạn sẽ học được gì?
        const Text(
          'Bạn sẽ học được gì?',
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AcademyColors.heading,
          ),
        ),
        const SizedBox(height: 10),
        _buildBenefitItem('Nền tảng chăm sóc cơ thể và kỹ thuật massage'),
        _buildBenefitItem('Quy trình chuẩn bị và thực hiện dịch vụ'),
        _buildBenefitItem('Tìm hiểu nhu cầu, giao tiếp với khách hàng'),
        _buildBenefitItem('Vệ sinh, an toàn và tổ chức nơi làm việc'),
        _buildBenefitItem('Rèn luyện thao tác thực hành có hướng dẫn'),
        _buildBenefitItem('Tác phong chuyên nghiệp và đạo đức nghề nghiệp'),
        const SizedBox(height: 20),

        // Giảng viên đồng hành
        const Text(
          'Giảng viên đồng hành',
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AcademyColors.heading,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.asset(
                      _instructor.avatar,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 56,
                        height: 56,
                        color: AcademyColors.cardWarm,
                        child: const Center(
                          child: Text(
                            'TH',
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _instructor.name,
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AcademyColors.heading,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _instructor.title,
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AcademyColors.primary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          '8 năm kinh nghiệm đào tạo nghề',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 12,
                            color: AcademyColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                _instructor.bio,
                style: const TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 13,
                  color: AcademyColors.textPrimary,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 40,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => E04InstructorProfileScreen(instructor: _instructor),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AcademyColors.primary,
                    side: const BorderSide(color: AcademyColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Xem thông tin giảng viên', style: TextStyle(fontFamily: 'Montserrat', fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBenefitItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline, color: AppColors.primary, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 13.5,
                color: AcademyColors.textPrimary,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
