import 'dart:async';
import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';
import 'e10_quiz_screen.dart';

/// Screen E09: Bài học (Video Lesson) [8116:26134]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
/// Tích hợp cơ chế bảo mật video, Watermark động chống quay/chụp màn hình (Điểm 52 - 65)
class E09LessonScreen extends StatefulWidget {
  const E09LessonScreen({super.key});

  @override
  State<E09LessonScreen> createState() => _E09LessonScreenState();
}

class _E09LessonScreenState extends State<E09LessonScreen> {
  int _selectedTab = 0; // 0: Nội dung, 1: Tài liệu, 2: Ghi chú
  bool _isPlaying = false;
  bool _isCompleted = false;

  Timer? _watermarkTimer;
  int _watermarkPositionIndex = 0;
  final List<Alignment> _watermarkAlignments = [
    Alignment.topRight,
    Alignment.centerLeft,
    Alignment.bottomCenter,
    Alignment.topLeft,
    Alignment.centerRight,
  ];

  @override
  void initState() {
    super.initState();
    _startWatermarkAnimation();
  }

  @override
  void dispose() {
    _watermarkTimer?.cancel();
    super.dispose();
  }

  void _startWatermarkAnimation() {
    _watermarkTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) {
        setState(() {
          _watermarkPositionIndex = (_watermarkPositionIndex + 1) % _watermarkAlignments.length;
        });
      }
    });
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  setState(() => _isCompleted = true);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã ghi nhận hoàn thành Bài 05!'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(0, 56),
                  backgroundColor: _isCompleted ? const Color(0xFF2E8B57) : AcademyColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  _isCompleted ? '✓ Đã hoàn thành bài học' : 'Hoàn thành bài học',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const E10QuizScreen()),
                  );
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AcademyColors.primary, width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Bài tiếp theo',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AcademyColors.primary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề trang [8116:26139]
            const Text(
              'Bài học',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. Video Player [8116:26144] (350x197, r=16)
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/academy_hero_classroom.png',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(0xFF1E293B),
                      child: const Center(
                        child: Icon(Icons.play_circle_fill, size: 60, color: Colors.white70),
                      ),
                    ),
                  ),

                  // Nút Play ở giữa
                  Center(
                    child: InkWell(
                      onTap: () => setState(() => _isPlaying = !_isPlaying),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _isPlaying ? Icons.pause : Icons.play_arrow,
                          color: AcademyColors.primary,
                          size: 28,
                        ),
                      ),
                    ),
                  ),

                  // Thanh điều khiển phát video phía dưới
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      color: const Color(0xFF1E293B).withValues(alpha: 0.9),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(2),
                            child: const LinearProgressIndicator(
                              value: 0.18,
                              minHeight: 3,
                              backgroundColor: Colors.white24,
                              valueColor: AlwaysStoppedAnimation<Color>(AcademyColors.primary),
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.pause, color: Colors.white, size: 16),
                                  SizedBox(width: 8),
                                  Text(
                                    '03:20 / 18:00',
                                    style: TextStyle(color: Colors.white, fontSize: 11),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  Text(
                                    '1x',
                                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                  SizedBox(width: 12),
                                  Icon(Icons.fullscreen, color: Colors.white, size: 18),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Watermark động di chuyển bảo mật bản quyền (Điểm 55, 56, 57, 60)
                  IgnorePointer(
                    child: AnimatedAlign(
                      duration: const Duration(seconds: 1),
                      curve: Curves.easeInOut,
                      alignment: _watermarkAlignments[_watermarkPositionIndex],
                      child: Container(
                        margin: const EdgeInsets.all(12),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Nguyễn Minh Anh · 0912***678 · MLD Vodder DRM',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Huy hiệu bảo mật video MLD DRM (Điểm 52, 53, 58, 59, 64)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_user_outlined, size: 16, color: Color(0xFF0066B2)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Bảo vệ bản quyền MLD Academy · Khóa tải xuống & Watermark chống ghi hình',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF1E3A8A),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 3. Thông tin bài học [8116:26152]
            const Text(
              'Chương 2 · Video 18 phút',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AcademyColors.primary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Bài 05: Kỹ thuật Massage cơ bản',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Kỹ thuật Massage Chuyên Nghiệp',
              style: TextStyle(fontSize: 14, color: AcademyColors.textPrimary),
            ),
            const SizedBox(height: 2),
            const Text(
              'Giảng viên Nguyễn Thanh Hương',
              style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
            ),
            const SizedBox(height: 4),
            const Text(
              'Video bài giảng chuyên đề MLD Academy.',
              style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
            ),
            const SizedBox(height: 20),

            // 4. Thẻ điều hướng 3 Tab (Nội dung / Tài liệu / Ghi chú) [8116:26158]
            Container(
              height: 48,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AcademyColors.cardBorder, width: 1.0),
                ),
              ),
              child: Row(
                children: [
                  _buildNavTab(0, 'Nội dung'),
                  _buildNavTab(1, 'Tài liệu'),
                  _buildNavTab(2, 'Ghi chú'),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 5. Nội dung Tab
            if (_selectedTab == 0) ...[
              // Mục tiêu bài học [8116:26168]
              const Text(
                'Sau bài học này, bạn có thể',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                ),
              ),
              const SizedBox(height: 12),
              ...[
                'Nhận biết tư thế và thao tác massage cơ bản.',
                'Chuẩn bị vệ sinh, khăn và không gian thực hành.',
                'Điều chỉnh lực theo phản hồi và sự thoải mái của khách hàng.',
              ].map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.check, color: AcademyColors.primary, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            item,
                            style: const TextStyle(fontSize: 14, color: AcademyColors.textPrimary, height: 1.35),
                          ),
                        ),
                      ],
                    ),
                  )),
              const SizedBox(height: 4),
              const Text(
                'Hướng dẫn kỹ năng dịch vụ, không phải hướng dẫn điều trị.',
                style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
              ),
              const SizedBox(height: 24),

              // Tài liệu tham khảo [8116:26180]
              const Text(
                'Tài liệu bài học',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                ),
              ),
              const SizedBox(height: 12),
              _buildDocumentCard(
                icon: Icons.description_outlined,
                title: 'Slide bài giảng: Kỹ thuật cơ bản (PDF)',
                subtitle: '2.4 MB · Cập nhật 15/09/2026',
              ),
              const SizedBox(height: 8),
              _buildDocumentCard(
                icon: Icons.checklist_outlined,
                title: 'Bảng kiểm thao tác thực hành (PDF)',
                subtitle: '1.1 MB · File biểu mẫu đánh giá',
              ),
              const SizedBox(height: 8),
              _buildDocumentCard(
                icon: Icons.menu_book_outlined,
                title: 'Sổ tay an toàn & vệ sinh Spa (PDF)',
                subtitle: '3.5 MB · Hướng dẫn thực địa',
              ),
              const SizedBox(height: 20),

              // Tiến độ xem bài học [8116:26194]
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AcademyColors.cardWarm,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tiến độ xem bài học',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.all(Radius.circular(3)),
                      child: LinearProgressIndicator(
                        value: 0.18,
                        minHeight: 6,
                        backgroundColor: AcademyColors.cardBorder,
                        valueColor: AlwaysStoppedAnimation<Color>(AcademyColors.primary),
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Tiến độ khóa học vẫn là 20% · 4/20 bài hoàn thành. Bài 05 chưa hoàn thành.',
                      style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ] else if (_selectedTab == 1) ...[
              _buildDocumentCard(
                icon: Icons.description_outlined,
                title: 'Slide bài giảng: Kỹ thuật cơ bản (PDF)',
                subtitle: '2.4 MB · Cập nhật 15/09/2026',
              ),
              const SizedBox(height: 8),
              _buildDocumentCard(
                icon: Icons.checklist_outlined,
                title: 'Bảng kiểm thao tác thực hành (PDF)',
                subtitle: '1.1 MB · File biểu mẫu đánh giá',
              ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ghi chú của học viên',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AcademyColors.heading),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '• Chú ý kiểm tra nhiệt độ khăn ấm trước khi tiếp xúc da khách hàng.\n• Thao tác miết lưng cần dùng lực đều từ bàn tay, tránh dồn lực lên ngón tay cái gây mỏi.',
                      style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary, height: 1.5),
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

  Widget _buildDocumentCard({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Row(
        children: [
          Icon(icon, color: AcademyColors.primary, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AcademyColors.textPrimary,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.download_rounded, color: AcademyColors.primary, size: 20),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đang tải tài liệu học tập...'),
                  duration: Duration(seconds: 1),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
