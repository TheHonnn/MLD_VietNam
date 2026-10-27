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
  double _initialPosition = 0.0;

  String get _courseId => widget.courseId ?? widget.courseTitle ?? 'default_course';

  @override
  void initState() {
    super.initState();
    // Bật bảo mật FLAG_SECURE chặn quay màn hình / chụp ảnh màn hình bài giảng
    AppSecurityService.instance.enableSecureScreen();
    if (widget.lesson != null) {
      _isCompleted = AcademyRepository.instance.isLessonCompleted(_courseId, widget.lesson!.id);
      _initialPosition = AcademyRepository.instance.getLessonPosition(_courseId, widget.lesson!.id);
    }
  }

  /// Tự động ghi nhận hoàn thành khi học viên xem hết video
  void _markCompleted() async {
    if (widget.lesson == null) return;
    if (_isCompleted) return;
    await AcademyRepository.instance.markLessonCompleted(_courseId, widget.lesson!.id);
    if (mounted) {
      setState(() {
        _isCompleted = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Bạn đã xem hết bài: "${widget.lesson?.title ?? ""}". Bài tiếp theo đã được mở khóa!'),
          backgroundColor: const Color(0xFF2E8B57),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _onProgressUpdate(double position, double duration) {
    if (widget.lesson != null && position > 0) {
      AcademyRepository.instance.saveLessonPosition(_courseId, widget.lesson!.id, position);
    }
  }

  bool get _canAccess {
    if (widget.lesson?.isFreePreview == true) return true;
    final cId = widget.courseId ?? widget.courseTitle;
    if (cId == null || cId.isEmpty) return false;
    return AcademyRepository.instance.isCourseApproved(cId, widget.courseTitle);
  }

  @override
  Widget build(BuildContext context) {
    if (!_canAccess) {
      return Scaffold(
        backgroundColor: AcademyColors.background,
        appBar: const AcademyAppBar(
          subtitleTag: 'Khóa học chờ duyệt',
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFFDE68A), width: 2),
                  ),
                  child: const Icon(Icons.lock_rounded, size: 40, color: Color(0xFFD97706)),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Khóa học chưa được Admin duyệt',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.heading,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Bạn chưa thể xem video bài học "${widget.lesson?.title ?? ""}" do hồ sơ đăng ký khóa học đang chờ Ban Quản Trị đối soát và phê duyệt.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 13.5,
                    color: AcademyColors.textSecondary,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back, size: 18),
                  label: const Text('Quay lại'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        subtitleTag: 'Video bài giảng',
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
                courseId: _courseId,
                lessonId: widget.lesson?.id,
                initialPosition: _initialPosition,
                onVideoEnded: _markCompleted,
                onProgressUpdate: _onProgressUpdate,
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

            // Thông báo trạng thái học tập (tối giản, không icon rườm rà)
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
              child: Text(
                _isCompleted
                    ? 'Bạn đã hoàn thành bài học này. Bài học kế tiếp đã được mở khóa.'
                    : 'Hệ thống tự động ghi nhớ vị trí xem. Bạn cần xem hết video để mở khóa bài tiếp theo.',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _isCompleted ? const Color(0xFF15803D) : const Color(0xFF1E40AF),
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
