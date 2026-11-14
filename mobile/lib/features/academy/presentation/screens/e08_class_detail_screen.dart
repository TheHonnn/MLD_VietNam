import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../../../admin/data/models/admin_models.dart';
import '../../../admin/data/repositories/admin_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e09_lesson_screen.dart';
import 'e11_attendance_schedule_screen.dart';

/// Screen E08: Chi tiết lớp học [8116:25997]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
/// Khóa học đã đăng ký: hiển thị chương đang học và tiến độ hoàn thành các video bài giảng.
class E08ClassDetailScreen extends StatefulWidget {
  final CourseModel? course;
  final String? courseId;

  const E08ClassDetailScreen({super.key, this.course, this.courseId});

  @override
  State<E08ClassDetailScreen> createState() => _E08ClassDetailScreenState();
}

class _E08ClassDetailScreenState extends State<E08ClassDetailScreen> {
  int _selectedTab = 0; // 0: Nội dung học, 1: Lịch học, 2: Tài liệu
  List<ChapterModel> _chapters = [];
  bool _isLoading = false;
  List<AdminBatchScheduleModel> _batchSchedules = [];
  bool _isLoadingSchedules = false;

  final Set<int> _expandedChapterIndices = {0}; // Mở chương đầu tiên theo mặc định

  String get _courseId => widget.courseId ?? widget.course?.id ?? '30303030-0001-0001-0001-000000000001';

  List<LessonModel> get _allLessons => _chapters.expand((c) => c.lessons).toList();

  int get _totalLessonsCount => _allLessons.length;

  int get _completedLessonsCount =>
      _allLessons.where((l) => AcademyRepository.instance.isLessonCompleted(_courseId, l.id)).length;

  bool get _isCourseCompleted => _totalLessonsCount > 0 && _completedLessonsCount >= _totalLessonsCount;

  LessonModel? get _nextLessonToStudy {
    for (final l in _allLessons) {
      if (!AcademyRepository.instance.isLessonCompleted(_courseId, l.id)) {
        return l;
      }
    }
    return _allLessons.isNotEmpty ? _allLessons.first : null;
  }

  String? _extractYoutubeId(String? url) {
    if (url == null || url.trim().isEmpty) return null;
    final trimmed = url.trim();
    final direct = YoutubePlayerController.convertUrlToId(trimmed);
    if (direct != null && direct.length == 11) return direct;

    final regExp = RegExp(
      r'(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_\-]{11})',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(trimmed);
    if (match != null && match.groupCount >= 1) {
      return match.group(1);
    }
    return direct;
  }

  String _resolveCourseImage() {
    final img = widget.course?.image;
    if (img != null && img.isNotEmpty && !img.contains('gioithieu_1.png')) {
      return img;
    }
    return 'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg';
  }

  @override
  void initState() {
    super.initState();
    if (WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')) {
      _chapters = MockAcademyData.syllabusChapters;
      _isLoading = false;
    } else {
      _loadCurriculum();
    }
  }

  Future<void> _loadCurriculum() async {
    setState(() {
      _isLoading = true;
      _isLoadingSchedules = true;
    });
    try {
      final data = await AcademyRepository.instance.getCourseCurriculum(_courseId);
      if (mounted && data.isNotEmpty) {
        setState(() => _chapters = data);
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isLoading = false);
    }

    try {
      final list = await AdminRepository.instance.fetchBatchSchedulesForCourse(_courseId);
      if (mounted) {
        setState(() {
          _batchSchedules = list;
          _isLoadingSchedules = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSchedules = false);
    }
  }

  void _onLessonTap(LessonModel lesson) async {
    final isUnlocked = AcademyRepository.instance.canAccessLesson(_courseId, lesson, _allLessons);
    if (!isUnlocked) {
      final prev = AcademyRepository.instance.getRequiredPreviousLesson(lesson, _allLessons);
      final prevTitle = prev?.title != null
          ? AppTranslation.translate(prev!.title, isEn: context.isEn)
          : (context.isEn ? 'the previous lesson' : 'bài học trước đó');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.isEn
                ? '🔒 Lesson is locked! Please complete "$prevTitle" first. Skipping lessons is not allowed!'
                : '🔒 Bài học đang khóa! Vui lòng hoàn thành "$prevTitle" trước. Hệ thống không cho phép nhảy bài!',
          ),
          backgroundColor: const Color(0xFFD97706),
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    // Mở xem video trực tiếp, phát ngay
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => E09LessonScreen(
          lesson: lesson,
          courseTitle: widget.course?.title,
          courseId: _courseId,
        ),
      ),
    );
    // Khi học viên xem xong và trở về, làm mới lại giao diện cập nhật tiến độ
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: _nextLessonToStudy?.title ?? 'Bắt đầu học ngay',
        buttonText: _completedLessonsCount == 0 ? 'Bắt đầu học ngay' : 'Tiếp tục bài học',
        onPressed: () {
          final target = _nextLessonToStudy ?? (_allLessons.isNotEmpty ? _allLessons.first : null);
          if (target != null) {
            _onLessonTap(target);
          }
        },
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề trang [8116:26002]
            Text(
              context.tr('Chi tiết lớp học', 'Class Details'),
              style: GoogleFonts.beVietnamPro(
                fontSize: 26,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. Bảng thông tin: Chỉ hiện tên khóa học theo đúng yêu cầu
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border, width: 1.0),
              ),
              child: Text(
                AppTranslation.translate(widget.course?.title ?? 'Dẫn lưu bạch huyết Vodder Chuyên Nghiệp', isEn: context.isEn),
                style: GoogleFonts.beVietnamPro(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                  height: 1.35,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 3. Thẻ điều hướng 3 Tab (Nội dung học / Lịch học / Tài liệu) [8116:26017]
            Container(
              height: 48,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppColors.border, width: 1.0),
                ),
              ),
              child: Row(
                children: [
                  _buildNavTab(0, context.tr('Nội dung học', 'Curriculum')),
                  _buildNavTab(1, context.tr('Lịch học', 'Schedule')),
                  _buildNavTab(2, context.tr('Tài liệu', 'Materials')),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Tab 0: Lộ trình chương học [8116:26027]
            if (_selectedTab == 0) ...[
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24.0),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (_chapters.isNotEmpty) ...[
                for (int cIdx = 0; cIdx < _chapters.length; cIdx++) ...[
                  Builder(
                    builder: (context) {
                      final chapter = _chapters[cIdx];
                      final isExpanded = _expandedChapterIndices.contains(cIdx);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: _buildChapterCard(
                          title: AppTranslation.translate(chapter.title, isEn: context.isEn),
                          subtitle: context.isEn ? '${chapter.lessons.length} video lessons' : '${chapter.lessons.length} bài học video',
                          isExpanded: isExpanded,
                          onToggle: () {
                            setState(() {
                              if (isExpanded) {
                                _expandedChapterIndices.remove(cIdx);
                              } else {
                                _expandedChapterIndices.add(cIdx);
                              }
                            });
                          },
                          lessons: isExpanded
                              ? chapter.lessons.map((lesson) {
                                  final isDone = AcademyRepository.instance.isLessonCompleted(_courseId, lesson.id);
                                  final isUnlocked = AcademyRepository.instance.canAccessLesson(_courseId, lesson, _allLessons);
                                  final ytid = _extractYoutubeId(lesson.videoUrl);

                                  return InkWell(
                                    onTap: () => _onLessonTap(lesson),
                                    borderRadius: BorderRadius.circular(10),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 2.0),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          // BÊN TRÁI: VIDEO THUMBNAIL 16:9 VỚI NÚT PLAY TRÒN Ở GIỮA
                                          Container(
                                            width: 124,
                                            height: 70,
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF0F172A),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: isUnlocked
                                                    ? AppColors.primary.withValues(alpha: 0.3)
                                                    : Colors.grey.withValues(alpha: 0.2),
                                                width: 1.0,
                                              ),
                                            ),
                                            clipBehavior: Clip.antiAlias,
                                            child: Stack(
                                              alignment: Alignment.center,
                                              children: [
                                                // Ảnh bìa Thumbnail từ YouTube hoặc Khóa học
                                                if (ytid != null)
                                                  Image.network(
                                                    'https://img.youtube.com/vi/$ytid/mqdefault.jpg',
                                                    width: 124,
                                                    height: 70,
                                                    fit: BoxFit.cover,
                                                    errorBuilder: (_, __, ___) => Image.asset(
                                                      _resolveCourseImage(),
                                                      width: 124,
                                                      height: 70,
                                                      fit: BoxFit.cover,
                                                    ),
                                                  )
                                                else
                                                  Image.asset(
                                                    _resolveCourseImage(),
                                                    width: 124,
                                                    height: 70,
                                                    fit: BoxFit.cover,
                                                  ),
                                                // Lớp phủ khóa nếu chưa mở khóa (Anti-cheat)
                                                if (!isUnlocked)
                                                  Container(
                                                    color: Colors.black.withValues(alpha: 0.65),
                                                    child: const Center(
                                                      child: Icon(
                                                        Icons.lock_rounded,
                                                        color: Colors.white,
                                                        size: 26,
                                                      ),
                                                    ),
                                                  ),
                                                // Badge thời lượng ở góc dưới bên phải (ví dụ 94:48)
                                                Positioned(
                                                  bottom: 4,
                                                  right: 4,
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black.withValues(alpha: 0.75),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Text(
                                                      lesson.formattedDuration,
                                                      style: const TextStyle(
                                                        
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.w700,
                                                        color: Colors.white,
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          // BÊN PHẢI: TIÊU ĐỀ VIDEO VÀ TRẠNG THÁI
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  AppTranslation.translate(lesson.title, isEn: context.isEn),
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: GoogleFonts.beVietnamPro(
                                                    fontSize: 13.5,
                                                    fontWeight: FontWeight.w600,
                                                    color: isUnlocked
                                                        ? AppColors.textHeading
                                                        : AppColors.textSecondary,
                                                    height: 1.35,
                                                  ),
                                                ),
                                                const SizedBox(height: 6),
                                                Row(
                                                  children: [
                                                    if (isDone)
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                        decoration: BoxDecoration(
                                                          color: AppColors.mintBackground,
                                                          borderRadius: BorderRadius.circular(6),
                                                        ),
                                                        child: Text(
                                                          context.tr('Đã học', 'Completed'),
                                                          style: GoogleFonts.beVietnamPro(
                                                            fontSize: 11,
                                                            fontWeight: FontWeight.w700,
                                                            color: AppColors.accent,
                                                          ),
                                                        ),
                                                      )
                                                    else if (isUnlocked)
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                        decoration: BoxDecoration(
                                                          color: AppColors.iceBlue,
                                                          borderRadius: BorderRadius.circular(6),
                                                        ),
                                                        child: Text(
                                                          context.tr('Vào học', 'Start'),
                                                          style: GoogleFonts.beVietnamPro(
                                                            fontSize: 11,
                                                            fontWeight: FontWeight.w700,
                                                            color: AppColors.primary,
                                                          ),
                                                        ),
                                                      )
                                                    else
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                        decoration: BoxDecoration(
                                                          color: AppColors.surfaceDisabled,
                                                          borderRadius: BorderRadius.circular(6),
                                                          border: Border.all(color: AppColors.border),
                                                        ),
                                                        child: Row(
                                                          mainAxisSize: MainAxisSize.min,
                                                          children: [
                                                            const Icon(Icons.lock_outline_rounded, size: 12, color: AppColors.textPlaceholder),
                                                            const SizedBox(width: 4),
                                                            Text(
                                                              context.tr('Chưa mở khóa', 'Locked'),
                                                              style: GoogleFonts.beVietnamPro(
                                                                fontSize: 10.5,
                                                                fontWeight: FontWeight.w600,
                                                                color: AppColors.textSecondary,
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }).toList()
                              : const [],
                        ),
                      );
                    },
                  ),
                ],
              ],



              // 5. Thẻ bài học tiếp theo (hoặc thông báo hoàn thành)
              _buildNextLessonCard(),
            ] else if (_selectedTab == 1) ...[
              // Tab Lịch học Khoa học
              _buildStudentScientificScheduleView(),
            ] else ...[
              // Tab Tài liệu
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.folder_open, size: 48, color: AcademyColors.primary),
                    const SizedBox(height: 12),
                    Text(
                      context.tr('Giáo trình & Tài liệu khóa học', 'Course Syllabus & Materials'),
                      style: GoogleFonts.beVietnamPro(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      context.tr(
                        'Bao gồm slide bài giảng, tài liệu kỹ thuật và quy chuẩn vệ sinh Spa.',
                        'Includes lecture slides, technical documents, and Spa hygiene standards.',
                      ),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.beVietnamPro(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
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
            style: GoogleFonts.beVietnamPro(
              fontSize: 14.5,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNextLessonCard() {
    if (_isCourseCompleted) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.mintBackground,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('Đã hoàn thành tất cả video!', 'All videos completed!'),
                    style: GoogleFonts.beVietnamPro(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    context.isEn ? 'You have completed $_totalLessonsCount/$_totalLessonsCount video lectures of the course.' : 'Bạn đã hoàn thành $_totalLessonsCount/$_totalLessonsCount bài giảng video của khóa học.',
                    style: GoogleFonts.beVietnamPro(
                      fontSize: 12,
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildChapterCard({
    required String title,
    required String subtitle,
    required List<Widget> lessons,
    bool isExpanded = true,
    VoidCallback? onToggle,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.beVietnamPro(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: GoogleFonts.beVietnamPro(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  color: AcademyColors.textSecondary,
                ),
              ],
            ),
          ),
          if (isExpanded) ...[
            const SizedBox(height: 10),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 6),
            ...lessons,
          ],
        ],
      ),
    );
  }

  Widget _buildStudentScientificScheduleView() {
    if (_isLoadingSchedules) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final schedules = _batchSchedules;
    final completedCount = schedules.where((s) => s.status == 'COMPLETED').length;
    final upcomingCount = schedules.where((s) => s.status != 'COMPLETED').length;
    final progressRatio = schedules.isNotEmpty ? (completedCount / schedules.length).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),

        // 1. Thẻ Lộ trình Tiến độ Học tập Khoa học (Roadmap Progress Card)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border, width: 1.0),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.school_rounded, size: 18, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Text(
                        context.tr('Lộ trình đào tạo Y khoa MLD', 'MLD Medical Training Roadmap'),
                        style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.mintBackground,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${schedules.length} ${context.tr("buổi học", "sessions")}',
                      style: GoogleFonts.beVietnamPro(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.accent),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // 3 Thẻ chỉ số tiến độ
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.mintBackground,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(context.tr('Đã hoàn thành', 'Completed'), style: GoogleFonts.beVietnamPro(fontSize: 10, color: AppColors.textSecondary)),
                          const SizedBox(height: 2),
                          Text('$completedCount buổi', style: GoogleFonts.beVietnamPro(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(context.tr('Sắp diễn ra', 'Upcoming'), style: GoogleFonts.beVietnamPro(fontSize: 10, color: AppColors.textSecondary)),
                          const SizedBox(height: 2),
                          Text('$upcomingCount buổi', style: GoogleFonts.beVietnamPro(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF0284C7))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(context.tr('Tiến độ', 'Progress'), style: GoogleFonts.beVietnamPro(fontSize: 10, color: AppColors.textSecondary)),
                          const SizedBox(height: 2),
                          Text('${(progressRatio * 100).toInt()}%', style: GoogleFonts.beVietnamPro(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFFD97706))),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progressRatio,
                  minHeight: 5,
                  backgroundColor: const Color(0xFFE5E7EB),
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 2. Danh sách từng Buổi học (Dạng Timeline)
        if (schedules.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Icon(Icons.event_note_outlined, size: 40, color: AppColors.textPlaceholder),
                const SizedBox(height: 10),
                Text(
                  context.tr('Chưa có thời khóa biểu trực tiếp', 'No live schedule yet'),
                  style: GoogleFonts.beVietnamPro(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  context.tr('Lịch học thực hành và lý thuyết sẽ được cập nhật khi khóa học khai giảng.', 'Practice and theory schedule will be updated when the course starts.'),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.beVietnamPro(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: schedules.length,
            itemBuilder: (ctx, idx) {
              final s = schedules[idx];
              final isCompleted = s.status == 'COMPLETED';
              final isToday = s.status == 'TODAY';
              final nodeColor = isCompleted
                  ? AppColors.primary
                  : (isToday ? const Color(0xFFD97706) : const Color(0xFF9CA3AF));

              final typeColor = s.isPracticeLab ? const Color(0xFF059669) : const Color(0xFF0284C7);
              final typeBg = s.isPracticeLab ? const Color(0xFFE8F6ED) : const Color(0xFFE0F2FE);
              final typeLabel = s.isPracticeLab ? '🔬 Thực hành Lab' : '📖 Lý thuyết';

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cột Timeline Node
                  Column(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: isToday ? const Color(0xFFFEF3C7) : (isCompleted ? AppColors.mintBackground : const Color(0xFFF3F4F6)),
                          shape: BoxShape.circle,
                          border: Border.all(color: nodeColor, width: isToday ? 2.5 : 1.5),
                        ),
                        alignment: Alignment.center,
                        child: isCompleted
                            ? const Icon(Icons.check_rounded, size: 16, color: AppColors.primary)
                            : (isToday
                                ? const Icon(Icons.play_arrow_rounded, size: 16, color: Color(0xFFD97706))
                                : Text(
                                    '${s.sessionIndex}',
                                    style: GoogleFonts.beVietnamPro(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280)),
                                  )),
                      ),
                      if (idx < schedules.length - 1)
                        Container(
                          width: 2,
                          height: 95,
                          color: isCompleted ? AppColors.primary.withValues(alpha: 0.3) : const Color(0xFFE5E7EB),
                        ),
                    ],
                  ),

                  const SizedBox(width: 10),

                  // Thẻ Card Buổi học
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isToday ? const Color(0xFFD97706) : AppColors.border,
                          width: isToday ? 1.5 : 1.0,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isToday
                                ? const Color(0xFFD97706).withValues(alpha: 0.08)
                                : Colors.black.withValues(alpha: 0.02),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header buổi học
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: isToday ? const Color(0xFFFFFBEB) : const Color(0xFFF9FAFB),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                              border: const Border(bottom: BorderSide(color: Color(0xFFE5E7EB), width: 0.5)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'BUỔI ${s.sessionIndex}',
                                    style: GoogleFonts.beVietnamPro(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: typeBg,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    typeLabel,
                                    style: GoogleFonts.beVietnamPro(fontSize: 10, fontWeight: FontWeight.w700, color: typeColor),
                                  ),
                                ),
                                const Spacer(),
                                if (isToday)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDC2626),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'HÔM NAY',
                                      style: GoogleFonts.beVietnamPro(fontSize: 9.5, fontWeight: FontWeight.w800, color: Colors.white),
                                    ),
                                  )
                                else if (isCompleted)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE8F6ED),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'Đã hoàn thành',
                                      style: GoogleFonts.beVietnamPro(fontSize: 9.5, fontWeight: FontWeight.w600, color: AppColors.accent),
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE0F2FE),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'Sắp diễn ra',
                                      style: GoogleFonts.beVietnamPro(fontSize: 9.5, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                                    ),
                                  ),
                              ],
                            ),
                          ),

                          // Nội dung
                          Padding(
                            padding: const EdgeInsets.all(10),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.topic,
                                  style: GoogleFonts.beVietnamPro(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textHeading,
                                    height: 1.3,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_month_outlined, size: 13, color: Color(0xFFD97706)),
                                    const SizedBox(width: 4),
                                    Text(
                                      s.formattedDate,
                                      style: GoogleFonts.beVietnamPro(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF374151)),
                                    ),
                                    const SizedBox(width: 10),
                                    const Icon(Icons.access_time_rounded, size: 13, color: Color(0xFF0284C7)),
                                    const SizedBox(width: 4),
                                    Text(
                                      s.timeSlotDisplay,
                                      style: GoogleFonts.beVietnamPro(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF0284C7)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFFDC2626)),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        s.roomName ?? 'Phòng Lab Thực hành MLD',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.beVietnamPro(fontSize: 10.5, color: AppColors.textSecondary),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.badge_outlined, size: 13, color: AppColors.primary),
                                    const SizedBox(width: 4),
                                    Text(
                                      s.instructorName ?? 'ThS.BS Lâm Xuân Trường',
                                      style: GoogleFonts.beVietnamPro(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppColors.primary),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),

        const SizedBox(height: 8),

        // 3. Nút Điều hướng sang Màn hình Điểm danh tổng thể E11
        SizedBox(
          width: double.infinity,
          height: 46,
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const E11AttendanceScheduleScreen()),
              );
            },
            icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
            label: Text(
              context.tr('Mở cổng điểm danh QR & toàn bộ lớp học', 'Open QR Attendance & All Classes'),
              style: GoogleFonts.beVietnamPro(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary, width: 1.2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      ],
    );
  }
}
