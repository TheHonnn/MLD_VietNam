import 'package:flutter/material.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e05_enrollment_form_screen.dart';
import 'e08_class_detail_screen.dart';

/// Screen E03: Chi tiết bài học & Khóa học
/// - Header: Tên khóa học, Ảnh bìa, Thông số tinh gọn (số bài, số giờ, trạng thái - không chữ thừa, không icon rườm rà)
/// - Danh sách bài học theo từng chương:
///   + Bên trái: Khung Video Thumbnail tỉ lệ 16:9 với nút Phát video tròn ▶ ở chính giữa
///   + Bên phải: Nội dung tập (Video Bài 1: Dấu hiệu nhận biết phù...)
///   + Bấm vào là mở luôn, xem video đó luôn
/// - Tab thông tin khóa học (Tổng quan, đối tượng, nhu cầu - không có thông tin giảng viên)
/// - Bài kiểm tra KHÔNG có trong chi tiết khóa học, chỉ có trong "Khóa học của tôi"
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
  int _selectedTab = 0; // 0: Video bài học (Mặc định), 1: Thông tin khóa học
  List<ChapterModel> _chapters = [];
  bool _isLoadingCurriculum = false;
  final Set<int> _expandedChapterIndices = {1}; // Mặc định mở Chương 1, các chương sau thu gọn

  bool get _isEnrolled => AcademyRepository.instance.isCourseEnrolled(widget.course.id, widget.course.title);
  int get _totalLessonsCount => _chapters.fold<int>(0, (sum, c) => sum + c.lessons.length);
  List<LessonModel> get _allLessons => _chapters.expand((c) => c.lessons).toList();

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
        setState(() {
          _chapters = data;
        });
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isLoadingCurriculum = false);
    }
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

  void _onLessonTap(LessonModel lesson) {
    // Chưa đăng ký khóa học tuyệt đối không được xem bài học nào
    if (!_isEnrolled) {
      _showEnrollRequiredModal(lesson);
      return;
    }

    // Đã đăng ký nhưng chưa được duyệt: không được xem
    final isApproved = AcademyRepository.instance.isCourseApproved(widget.course.id, widget.course.title);
    if (!isApproved) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Khóa học đang chờ duyệt.'),
          backgroundColor: Color(0xFFD97706),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    // Đã đăng ký và đã duyệt: Chuyển sang Trang Khóa học của tôi (Chi tiết lớp học) để học và theo dõi tiến độ
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => E08ClassDetailScreen(course: widget.course),
      ),
    ).then((_) {
      if (mounted) {
        setState(() {});
      }
    });
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
              'Đăng ký để học',
              style: TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Bạn cần đăng ký khóa học "${widget.course.title}" để xem bài giảng này.',
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
        buttonText: _isEnrolled ? 'Đã đăng ký' : 'Đăng ký học',
        onPressed: () {
          if (_isEnrolled) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => E08ClassDetailScreen(course: course),
              ),
            ).then((_) {
              if (mounted) setState(() {});
            });
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
            // 1. Tên khóa học
            Text(
              course.title,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),

            // 2. Ảnh bìa khóa học
            Container(
              height: 195,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.asset(
                course.image,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: AcademyColors.cardWarm,
                  child: const Center(
                    child: Icon(Icons.school, size: 60, color: AcademyColors.primary),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // 3. Thông số tinh gọn: Số bài • Số giờ • Trạng thái (Bỏ hết icon to và chữ thừa)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '$_totalLessonsCount bài',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  Container(width: 1, height: 16, color: AppColors.border),
                  Text(
                    '${course.totalHours} giờ',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  Container(width: 1, height: 16, color: AppColors.border),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _isEnrolled ? const Color(0xFFDCFCE7) : const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _isEnrolled ? 'Đã đăng ký' : 'Chưa đăng ký',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _isEnrolled ? const Color(0xFF15803D) : const Color(0xFFE11D48),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 4. Thanh chuyển Tab: [ Video bài học ] & [ Thông tin khóa học ]
            Container(
              height: 42,
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
                        child: Text(
                          'Video bài học ($_totalLessonsCount)',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 13,
                            fontWeight: _selectedTab == 0 ? FontWeight.bold : FontWeight.w600,
                            color: _selectedTab == 0 ? AppColors.primary : AppColors.textSecondary,
                          ),
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
                        child: Text(
                          'Thông tin khóa học',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 13,
                            fontWeight: _selectedTab == 1 ? FontWeight.bold : FontWeight.w600,
                            color: _selectedTab == 1 ? AppColors.primary : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 5. Nội dung Tab:
            if (_selectedTab == 0) ...[
              // Tab 0: Danh sách video theo chương
              if (!_isEnrolled)
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 18),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Bấm vào video để mở xem clip. Đăng ký để mở khóa toàn bộ khóa học.',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 12,
                            color: Color(0xFF92400E),
                            fontWeight: FontWeight.w500,
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
              // Tab 1: Thông tin khóa học (Tổng quan, Đối tượng, Nhu cầu - KHÔNG có giảng viên)
              _buildCourseOverview(course),
            ],
          ],
        ),
      ),
    );
  }

  /// Danh sách video theo chương:
  /// - Bên trái: Video thumbnail với Nút phát video tròn ▶ ở chính giữa
  /// - Bên phải: Nội dung tập (Video Bài 1: Dấu hiệu nhận biết phù...)
  /// - Bấm vào là mở luôn, xem video đó luôn
  Widget _buildChapterVideoSection(ChapterModel chapter, int chapterNum) {
    final isExpanded = _expandedChapterIndices.contains(chapterNum);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề Chương (Bấm để thu gọn / mở rộng giúp tiết kiệm diện tích)
          InkWell(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedChapterIndices.remove(chapterNum);
                } else {
                  _expandedChapterIndices.add(chapterNum);
                }
              });
            },
            borderRadius: BorderRadius.vertical(
              top: const Radius.circular(11),
              bottom: Radius.circular(isExpanded ? 0 : 11),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isExpanded ? AcademyColors.cardWarm : Colors.white,
                borderRadius: BorderRadius.vertical(
                  top: const Radius.circular(11),
                  bottom: Radius.circular(isExpanded ? 0 : 11),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
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
                        fontSize: 13.5,
                        fontWeight: FontWeight.bold,
                        color: AcademyColors.heading,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${chapter.lessons.length} video',
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: AppColors.textSecondary,
                  ),
                ],
              ),
            ),
          ),

          // Danh sách video bài học trong chương (Thu lại khi isExpanded == false)
          if (isExpanded)
            ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: chapter.lessons.length,
            separatorBuilder: (_, __) => const Divider(height: 1, indent: 16, endIndent: 16, color: AcademyColors.cardBorder),
            itemBuilder: (context, index) {
              final lesson = chapter.lessons[index];
              final isEnrolledOrFree = _isEnrolled || lesson.isFreePreview;
              final isCompleted = AcademyRepository.instance.isLessonCompleted(widget.course.id, lesson.id);
              final isUnlocked = isEnrolledOrFree && AcademyRepository.instance.canAccessLesson(widget.course.id, lesson, _allLessons);
              final ytid = _extractYoutubeId(lesson.videoUrl);

              // Tách phần tiêu đề nội dung sạch sẽ
              String lessonTitle = lesson.title;
              if (lessonTitle.contains(':')) {
                lessonTitle = lessonTitle.split(':').sublist(1).join(':').trim();
              }

              return InkWell(
                onTap: () => _onLessonTap(lesson),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // BÊN TRÁI: KHUNG VIDEO THUMBNAIL 16:9 VỚI NÚT PHÁT VIDEO TRÒN Ở GIỮA
                      Container(
                        width: 128,
                        height: 72,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isUnlocked ? AppColors.primary.withValues(alpha: 0.3) : Colors.black12,
                            width: 1.0,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            // Ảnh Thumbnail YouTube hoặc Ảnh bìa
                            if (ytid != null)
                              Image.network(
                                'https://img.youtube.com/vi/$ytid/mqdefault.jpg',
                                width: 128,
                                height: 72,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Image.asset(
                                  widget.course.image,
                                  width: 128,
                                  height: 72,
                                  fit: BoxFit.cover,
                                ),
                              )
                            else
                              Image.asset(
                                widget.course.image,
                                width: 128,
                                height: 72,
                                fit: BoxFit.cover,
                              ),

                            // Lớp phủ bóng mờ
                            Container(
                              color: Colors.black.withValues(alpha: isUnlocked ? 0.32 : 0.6),
                            ),

                            // NÚT PHÁT VIDEO TRÒN Ở CHÍNH GIỮA
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: isCompleted
                                    ? const Color(0xFF16A34A)
                                    : (isUnlocked ? AppColors.primary : Colors.black54),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.3),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                              child: Icon(
                                isCompleted
                                    ? Icons.check
                                    : (!_isEnrolled
                                        ? Icons.lock_outline_rounded
                                        : (isUnlocked ? Icons.play_arrow_rounded : Icons.lock_outline_rounded)),
                                color: Colors.white,
                                size: 20,
                              ),
                            ),

                            // Thời lượng góc dưới
                            Positioned(
                              bottom: 4,
                              right: 4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.75),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  lesson.formattedDuration,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),

                      // BÊN PHẢI: NỘI DUNG TẬP (Video bài 1: Dấu hiệu nhận biết phù...)
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Video Bài ${lesson.lessonOrder}:',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              lessonTitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isUnlocked ? AcademyColors.textPrimary : Colors.grey[600],
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            if (isCompleted)
                              const Text(
                                'Đã xem hết ✓',
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF15803D),
                                ),
                              )
                            else if (isUnlocked)
                              Text(
                                lesson.isFreePreview ? 'Học thử miễn phí ▶' : 'Xem ngay ▶',
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              )
                            else
                              Text(
                                !_isEnrolled && !lesson.isFreePreview ? 'Cần đăng ký 🔒' : 'Cần xem bài trước 🔒',
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey[500],
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

  /// Thông tin khóa học (Tổng quan, đối tượng, nhu cầu, quyền lợi - KHÔNG CÓ GIẢNG VIÊN)
  Widget _buildCourseOverview(CourseModel course) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Giới thiệu tổng quan',
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
        _buildBenefitItem('Nền tảng chăm sóc cơ thể và kỹ thuật massage dẫn lưu chuẩn Vodder'),
        _buildBenefitItem('Quy trình chuẩn bị và thực hiện dịch vụ an toàn y khoa'),
        _buildBenefitItem('Tìm hiểu nhu cầu, tư vấn giao tiếp chuyên nghiệp với khách hàng'),
        _buildBenefitItem('Vệ sinh, vô trùng và chuẩn hóa không gian trị liệu'),
        _buildBenefitItem('Rèn luyện thao tác thực hành lực nhẹ 30-40 mmHg'),
        _buildBenefitItem('Tác phong chuyên nghiệp và chuẩn mực đạo đức nghề nghiệp'),
        const SizedBox(height: 24),
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
