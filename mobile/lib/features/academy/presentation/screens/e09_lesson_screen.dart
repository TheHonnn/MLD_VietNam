import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/app_security_service.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import '../widgets/mld_youtube_player.dart';

/// Screen E09: Màn hình phát Video bài học
/// Mở luôn video khi bấm vào bài học, phát ngay lập tức, không có thông tin rườm rà
class E09LessonScreen extends StatefulWidget {
  final LessonModel? lesson;
  final String? courseTitle;
  final String? courseId;

  const E09LessonScreen({
    super.key,
    this.lesson,
    this.courseTitle,
    this.courseId,
  });

  @override
  State<E09LessonScreen> createState() => _E09LessonScreenState();
}

class _E09LessonScreenState extends State<E09LessonScreen> {
  bool _isCompleted = false;

  @override
  void initState() {
    super.initState();
    // Bật bảo mật FLAG_SECURE chặn quay màn hình / chụp ảnh màn hình bài giảng
    AppSecurityService.instance.enableSecureScreen();
    if (widget.lesson != null) {
      final cId = widget.courseId ?? widget.courseTitle ?? 'default_course';
      _isCompleted = AcademyRepository.instance.isLessonCompleted(cId, widget.lesson!.id);
    }
  }

  void _markCompleted() async {
    if (widget.lesson == null) return;
    final cId = widget.courseId ?? widget.courseTitle ?? 'default_course';
    await AcademyRepository.instance.markLessonCompleted(cId, widget.lesson!.id);
    if (mounted) {
      setState(() {
        _isCompleted = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Đã ghi nhận xem hết bài: ${widget.lesson?.title ?? ""}'),
          backgroundColor: const Color(0xFF2E8B57),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        subtitleTag: 'Video bài giảng',
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AcademyColors.cardBorder, width: 1.0)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _markCompleted,
            style: ElevatedButton.styleFrom(
              backgroundColor: _isCompleted ? const Color(0xFF2E8B57) : AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              _isCompleted ? '✓ Đã hoàn thành bài học' : 'Đánh dấu đã xem hết',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Khung video phát trực tiếp
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              clipBehavior: Clip.antiAlias,
              child: MldYoutubePlayer(
                videoUrl: widget.lesson?.videoUrl ?? 'https://youtu.be/mDhpMX4EeY8?si=Hd_z_npg-loMZEx8',
                title: widget.lesson?.title ?? 'Bài 1: Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật',
                onVideoEnded: _markCompleted,
              ),
            ),
            const SizedBox(height: 16),

            // Nhãn Video bài với thời lượng hiển thị chính xác theo độ dài clip
            Text(
              'Video Bài ${widget.lesson?.lessonOrder ?? 1} · ${widget.lesson?.formattedDuration ?? "94:48"}',
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 6),

            // Tên bài học
            Text(
              widget.lesson?.title ?? 'Bài 1: Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật',
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 6),

            // Tên khóa học
            Text(
              widget.courseTitle ?? 'Học viện MLD Việt Nam',
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 13.5,
                color: AcademyColors.textSecondary,
              ),
            ),
            const SizedBox(height: 14),

            // Trạng thái hoàn thành
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _isCompleted ? const Color(0xFFDCFCE7) : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _isCompleted ? const Color(0xFF86EFAC) : const Color(0xFFBFDBFE),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _isCompleted ? Icons.check_circle_rounded : Icons.info_outline,
                    color: _isCompleted ? const Color(0xFF16A34A) : AppColors.primary,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _isCompleted
                          ? 'Bạn đã hoàn thành bài học này. Bài học kế tiếp đã được mở khóa!'
                          : 'Xem hết video để hệ thống tự động ghi nhận và mở khóa bài tiếp theo.',
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _isCompleted ? const Color(0xFF15803D) : const Color(0xFF1E40AF),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
