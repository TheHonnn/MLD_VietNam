import '../../../../core/constants/app_colors.dart';
import '../../data/repositories/academy_repository.dart';
import '../../data/models/academy_models.dart';
import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';
import 'e05_enrollment_form_screen.dart';
import 'e09_lesson_screen.dart';
import 'e10_quiz_screen.dart';
import 'e11_attendance_schedule_screen.dart';

/// Screen E08: Chi tiết lớp học [8116:25997]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E08ClassDetailScreen extends StatefulWidget {
  final CourseModel? course;

  const E08ClassDetailScreen({super.key, this.course});

  @override
  State<E08ClassDetailScreen> createState() => _E08ClassDetailScreenState();
}

class _E08ClassDetailScreenState extends State<E08ClassDetailScreen> {
  int _selectedTab = 0; // 0: Nội dung học, 1: Lịch học, 2: Tài liệu
  List<ChapterModel> _chapters = [];
  bool _isLoading = false;

  bool get _isEnrolled {
    if (widget.course == null) return true;
    return AcademyRepository.instance.isCourseEnrolled(widget.course!.id, widget.course!.title);
  }

  void _onLessonTap(LessonModel lesson) {
    if (_isEnrolled || lesson.isFreePreview) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => E09LessonScreen(
            lesson: lesson,
            courseTitle: widget.course?.title,
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
              'Video "${lesson.title}" thuộc nội dung đào tạo chuyên sâu.\n\nBạn cần đăng ký khóa học để mở khóa toàn bộ bài giảng và thực hành lâm sàng.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 13.5,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            if (widget.course != null)
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => E05EnrollmentFormScreen(course: widget.course!),
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
  void initState() {
    super.initState();
    _loadCurriculum();
  }

  Future<void> _loadCurriculum() async {
    final courseId = widget.course?.id ?? '30303030-0001-0001-0001-000000000001';
    setState(() => _isLoading = true);
    try {
      final data = await AcademyRepository.instance.getCourseCurriculum(courseId);
      if (mounted && data.isNotEmpty) {
        setState(() => _chapters = data);
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: _chapters.isNotEmpty && _chapters[0].lessons.isNotEmpty
            ? _chapters[0].lessons[0].title
            : 'Bài 01 · Đại cương hệ bạch huyết Vodder',
        buttonText: 'Tiếp tục bài học',
        onPressed: () {
          final firstLesson = _chapters.isNotEmpty && _chapters[0].lessons.isNotEmpty
              ? _chapters[0].lessons[0]
              : null;
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => E09LessonScreen(
                lesson: firstLesson,
                courseTitle: widget.course?.title,
              ),
            ),
          );
        },
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề trang [8116:26002]
            const Text(
              'Chi tiết lớp học',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. Thẻ thông tin tổng quan lớp học [8116:26004] (350x274)
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
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Đang học · MCN-0926',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.course?.title ?? 'Dẫn lưu bạch huyết Vodder Chuyên Nghiệp',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Giảng viên Nguyễn Thanh Hương',
                    style: TextStyle(fontSize: 14, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Chi nhánh Quận 3',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Thứ 6–7–Chủ nhật · 13:00–17:00',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FE),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.schedule, size: 14, color: Color(0xFF2860EB)),
                        SizedBox(width: 6),
                        Text(
                          'Thời hạn truy cập: Còn 45 ngày (Hạn đến: 31/12/2026)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF2860EB),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '4 / 20 bài học đã hoàn thành',
                        style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
                      ),
                      Text(
                        '20%',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: const LinearProgressIndicator(
                      value: 0.20,
                      minHeight: 6,
                      backgroundColor: AcademyColors.cardBorder,
                      valueColor: AlwaysStoppedAnimation<Color>(AcademyColors.primary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Thẻ điều hướng 3 Tab (Nội dung học / Lịch học / Tài liệu) [8116:26017]
            Container(
              height: 48,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AcademyColors.cardBorder, width: 1.0),
                ),
              ),
              child: Row(
                children: [
                  _buildNavTab(0, 'Nội dung học'),
                  _buildNavTab(1, 'Lịch học'),
                  _buildNavTab(2, 'Tài liệu'),
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
                for (final chapter in _chapters)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: _buildChapterCard(
                      title: chapter.title,
                      subtitle: '${chapter.lessons.length} bài học video',
                      lessons: chapter.lessons.map((lesson) {
                        final canWatch = _isEnrolled || lesson.isFreePreview;
                        return InkWell(
                          onTap: () => _onLessonTap(lesson),
                          borderRadius: BorderRadius.circular(10),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
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
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        lesson.title,
                                        style: const TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w600,
                                          color: AcademyColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Video · ${lesson.durationMinutes} phút${lesson.isFreePreview ? ' · Học thử' : ''}',
                                        style: const TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                if (_isEnrolled)
                                  const Text('Đã mở', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2E8B57)))
                                else if (lesson.isFreePreview)
                                  const Text('Học thử ▶', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary))
                                else
                                  const Text('Khóa 🔒', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFE11D48))),
                                const SizedBox(width: 4),
                                const Icon(Icons.chevron_right, size: 18, color: AcademyColors.textSecondary),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
              ] else ...[
                _buildChapterCard(
                  title: 'Chương 1: Giới thiệu nghề Spa & Dẫn lưu Vodder',
                  subtitle: '3 bài học',
                  lessons: [
                    _buildLessonItem('Bài 1: Tổng quan phương pháp Vodder', 'Video · 18 phút', isDone: true),
                    _buildLessonItem('Bài 2: Giải phẫu hệ bạch huyết', 'Video · 24 phút', isDone: true),
                    _buildLessonItem('Bài 3: Thao tác vòng xoay tĩnh', 'Video · 20 phút', isDone: false),
                  ],
                ),
              ],
              const SizedBox(height: 24),

              // 5. Bài học tiếp theo [8116:26047]
              const Text(
                'Bài học tiếp theo',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                ),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const E09LessonScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AcademyColors.cardWarm,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.play_circle_fill, color: AcademyColors.primary, size: 26),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bài 05: Kỹ thuật Massage cơ bản',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Video · 18 phút · Tiếp theo',
                              style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right, color: AcademyColors.primary, size: 22),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // 6. Buổi thực hành sắp tới [8116:26056]
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
                    const Text(
                      'Buổi thực hành sắp tới',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          width: 56,
                          height: 64,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                          ),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '16',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: AcademyColors.primary,
                                  height: 1.1,
                                ),
                              ),
                              Text(
                                'Tháng 10',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                  color: AcademyColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '13:00–17:00',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AcademyColors.textPrimary,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Thực hành kỹ thuật massage cơ bản',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AcademyColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Phòng thực hành 02 · Chi nhánh Quận 3',
                      style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Giảng viên Nguyễn Thanh Hương',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AcademyColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 7. Củng cố kiến thức nghề Spa [8116:26068]
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Củng cố kiến thức nghề Spa',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Ôn tập quy trình, vệ sinh và an toàn trước buổi thực hành.',
                      style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const E10QuizScreen()),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AcademyColors.primary, width: 1.2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Kiểm tra kiến thức',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AcademyColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (_selectedTab == 1) ...[
              // Tab Lịch học
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E11AttendanceScheduleScreen()),
                    );
                  },
                  icon: const Icon(Icons.calendar_month, color: Colors.white),
                  label: const Text('Xem lịch học đầy đủ & điểm danh'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AcademyColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
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
                child: const Column(
                  children: [
                    Icon(Icons.folder_open, size: 48, color: AcademyColors.primary),
                    SizedBox(height: 12),
                    Text(
                      'Giáo trình & Tài liệu khóa học',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AcademyColors.heading),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Bao gồm slide bài giảng, phiếu kiểm tra kỹ thuật và quy chuẩn vệ sinh Spa.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
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
            style: TextStyle(
              fontSize: 15,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? AcademyColors.primary : AcademyColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChapterCard({
    required String title,
    required String subtitle,
    required List<Widget> lessons,
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                ),
              ),
              const Icon(Icons.keyboard_arrow_up, color: AcademyColors.textSecondary),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
          ),
          const SizedBox(height: 12),
          ...lessons,
        ],
      ),
    );
  }

  Widget _buildLessonItem(String title, String duration, {bool isDone = false, bool isLocked = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            isDone
                ? Icons.check_circle
                : isLocked
                    ? Icons.lock_outline
                    : Icons.play_circle_outline,
            color: isDone
                ? const Color(0xFF2E8B57)
                : isLocked
                    ? AcademyColors.textSecondary
                    : AcademyColors.primary,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isLocked ? AcademyColors.textSecondary : AcademyColors.textPrimary,
                  ),
                ),
                Text(
                  duration,
                  style: const TextStyle(fontSize: 11, color: AcademyColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
