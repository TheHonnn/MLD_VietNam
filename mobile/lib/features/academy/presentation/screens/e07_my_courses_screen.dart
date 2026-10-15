import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';
import 'e08_class_detail_screen.dart';
import 'e12_learning_results_screen.dart';

/// Screen E07: Khóa học của tôi [8116:25866]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
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

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTabIndex;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Giới thiệu [8116:25871]
            const Text(
              'HỌC VIỆN ĐÀO TẠO MLD',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                color: AcademyColors.primary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Khóa học của tôi',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Theo dõi quá trình học tập và phát triển kỹ năng.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // 2. Thẻ thông tin tổng quan (3 chỉ số + 120 giờ) [8116:25877]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _buildMetricColumn('3', 'đã ghi danh'),
                      _buildMetricColumn('1', 'đang học'),
                      _buildMetricColumn('1', 'hoàn thành'),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    '120 giờ học · 1 khóa sắp học',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Tổng số giờ tích lũy thực hành và lý thuyết.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Thẻ điều hướng 3 Tab (Đang học / Sắp học / Đã hoàn thành) [8116:25884]
            Container(
              height: 48,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AcademyColors.cardBorder, width: 1.0),
                ),
              ),
              child: Row(
                children: [
                  _buildNavTab(0, 'Đang học'),
                  _buildNavTab(1, 'Sắp học'),
                  _buildNavTab(2, 'Đã hoàn thành'),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Nội dung Tab
            if (_selectedTab == 0) ...[
              // LearningProgressCard / 02 [8116:25894]
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AcademyColors.cardWarm,
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
                    const Text(
                      'Kỹ thuật Massage Chuyên Nghiệp',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Nguyễn Thanh Hương · Khai giảng 18/09/2026',
                      style: TextStyle(
                        fontSize: 13,
                        color: AcademyColors.textSecondary,
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
                    const SizedBox(height: 14),
                    const Text(
                      'Bài tiếp theo: Bài 05 — Kỹ thuật Massage cơ bản',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const E08ClassDetailScreen(),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(0, 56),
                          backgroundColor: AcademyColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Tiếp tục học',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Các khóa học khác [8116:25905]
              const Text(
                'Các khóa học khác',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                ),
              ),
              const SizedBox(height: 14),

              // Thẻ Sắp học
              _buildOtherCourseCard(
                tag: 'Sắp học',
                title: 'Chăm Sóc Da Chuyên Nghiệp',
                subtitle: 'CSD-1026 · Khai giảng 30/10/2026',
                format: 'Kết hợp trực tuyến và thực hành',
                buttonText: 'Xem lớp sắp học',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const E08ClassDetailScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 14),

              // Thẻ Đã hoàn thành
              _buildOtherCourseCard(
                tag: 'Đã hoàn thành',
                title: 'Kỹ thuật Massage Cơ Bản',
                subtitle: 'MCB-0726 · Hoàn thành 28/08/2026',
                format: '20 / 20 bài học · Tiến độ 100%',
                buttonText: 'Xem kết quả học tập',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const E12LearningResultsScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),

              // Lịch học gần nhất [8116:25922]
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AcademyColors.cardWarm,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Lịch học gần nhất',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                      ),
                    ),
                    const SizedBox(height: 14),
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
                                'Thứ 6 · Buổi 05',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: AcademyColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Kỹ thuật Massage Chuyên Nghiệp',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Thực hành kỹ thuật massage cơ bản',
                      style: TextStyle(fontSize: 14, color: AcademyColors.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Phòng thực hành 02 · Chi nhánh Quận 3',
                      style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Giảng viên Nguyễn Thanh Hương',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AcademyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (_selectedTab == 1) ...[
              _buildOtherCourseCard(
                tag: 'Sắp học',
                title: 'Chăm Sóc Da Chuyên Nghiệp',
                subtitle: 'CSD-1026 · Khai giảng 30/10/2026',
                format: 'Kết hợp trực tuyến và thực hành',
                buttonText: 'Xem lớp sắp học',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const E08ClassDetailScreen(),
                    ),
                  );
                },
              ),
            ] else ...[
              _buildOtherCourseCard(
                tag: 'Đã hoàn thành',
                title: 'Kỹ thuật Massage Cơ Bản',
                subtitle: 'MCB-0726 · Hoàn thành 28/08/2026',
                format: '20 / 20 bài học · Tiến độ 100%',
                buttonText: 'Xem kết quả học tập',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const E12LearningResultsScreen(),
                    ),
                  );
                },
              ),
            ],

            const SizedBox(height: 24),

            // Chú thích chân trang [8116:25931]
            const Center(
              child: Text(
                'Đăng ký MCN-1026 đang chờ thanh toán chưa được tính vào 3 khóa đã ghi danh.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricColumn(String count, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            count,
            style: const TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
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
              fontSize: 15,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? AcademyColors.primary : AcademyColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOtherCourseCard({
    required String tag,
    required String title,
    required String subtitle,
    required String format,
    required String buttonText,
    required VoidCallback onPressed,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AcademyColors.cardWarm,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              tag,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AcademyColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AcademyColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            format,
            style: const TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton(
              onPressed: onPressed,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AcademyColors.primary, width: 1.2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                buttonText,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AcademyColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
