import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import 'e08_class_detail_screen.dart';

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
    AcademyRepository.instance.getMyCourses().then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final allCourses = AcademyRepository.instance.enrolledCourses;

    final inProgressCourses = allCourses
        .where((c) => (c.progressPercentage > 0 && c.progressPercentage < 100) || c.status == 'IN_PROGRESS')
        .toList();
    final upcomingCourses = allCourses
        .where((c) => c.progressPercentage == 0 || c.status == 'UPCOMING')
        .toList();
    final completedCourses = allCourses
        .where((c) => c.progressPercentage >= 100 || c.status == 'COMPLETED')
        .toList();

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
              'MLD VietNam',
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

            // 2. Thẻ thông tin tổng quan (3 chỉ số + giờ học) [8116:25877]
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
                      _buildMetricColumn('${allCourses.length}', 'đã ghi danh'),
                      _buildMetricColumn('${inProgressCourses.length}', 'đang học'),
                      _buildMetricColumn('${completedCourses.length}', 'hoàn thành'),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    '${allCourses.fold<int>(0, (acc, c) => acc + c.totalHours)} giờ học · ${allCourses.length} khóa đang tham gia',
                    style: const TextStyle(
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
                  _buildNavTab(0, 'Đang học (${inProgressCourses.length})'),
                  _buildNavTab(1, 'Sắp học (${upcomingCourses.length})'),
                  _buildNavTab(2, 'Đã hoàn thành (${completedCourses.length})'),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Nội dung Tab
            if (_selectedTab == 0) ...[
              if (inProgressCourses.isNotEmpty)
                ...inProgressCourses.map((c) => _buildEnrolledCard(c))
              else
                _buildEmptyCourseState('đang học'),
            ] else if (_selectedTab == 1) ...[
              if (upcomingCourses.isNotEmpty)
                ...upcomingCourses.map((c) => _buildEnrolledCard(c))
              else
                _buildEmptyCourseState('sắp học'),
            ] else ...[
              if (completedCourses.isNotEmpty)
                ...completedCourses.map((c) => _buildEnrolledCard(c))
              else
                _buildEmptyCourseState('đã hoàn thành'),
            ],
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
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Khám phá danh mục các khóa đào tạo nghề Spa & Trị liệu dưỡng sinh của Học viện MLD để nâng cao tay nghề.',
            textAlign: TextAlign.center,
            style: TextStyle(
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
              child: const Text(
                'Khám phá khóa học ngay',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

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
                        color: AcademyColors.cardWarm,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'ĐANG HỌC · ĐÃ GHI DANH',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      course.title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${course.totalHours} giờ · ${course.branch}',
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
          const SizedBox(height: 6),
          const Row(
            children: [
              Icon(Icons.timer_outlined, size: 14, color: AcademyColors.primary),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Thời hạn học: Đến 31/12/2026 (Còn 68 ngày)',
                  style: TextStyle(
                    fontSize: 12,
                    color: AcademyColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
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
                  MaterialPageRoute(builder: (_) => const E08ClassDetailScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AcademyColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text(
                'Xem chi tiết lớp học & Bài giảng',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
