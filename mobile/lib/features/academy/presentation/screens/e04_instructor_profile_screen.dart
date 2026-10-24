import 'package:flutter/material.dart';
import '../../data/models/academy_models.dart';
import '../widgets/academy_widgets.dart';
import 'e02_course_catalog_screen.dart';
import 'e03_course_detail_screen.dart';

/// Screen E04: Thông tin giảng viên [8116:25508]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E04InstructorProfileScreen extends StatelessWidget {
  final InstructorModel instructor;

  const E04InstructorProfileScreen({
    super.key,
    required this.instructor,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AcademyColors.cardBorder, width: 1.0)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const E02CourseCatalogScreen(),
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
              'Xem khóa học của giảng viên',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tiêu đề trang [8116:25513]
            const Text(
              'Thông tin giảng viên',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. InstructorProfileCard / 02 (Ảnh chữ nhật lớn 350x264 chuẩn Figma) [8116:25515]
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Image.asset(
                    instructor.avatar,
                    height: 264,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Image.asset(
                      'assets/images/nguyen_thu_ha.png',
                      height: 264,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          instructor.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AcademyColors.heading,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          instructor.title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AcademyColors.primary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Massage · Chăm sóc cơ thể · Quy trình dịch vụ',
                          style: TextStyle(
                            fontSize: 14,
                            color: AcademyColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AcademyColors.cardWarm,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Thông tin giảng viên',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AcademyColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 3. Giới thiệu [8116:25528]
            const Text(
              'Giới thiệu',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              instructor.bio.isNotEmpty
                  ? instructor.bio
                  : 'Cô Hương đồng hành cùng học viên từ thao tác nền tảng đến thực hành quy trình hoàn chỉnh. Phương pháp hướng dẫn chú trọng vệ sinh, giao tiếp và điều chỉnh thao tác theo phản hồi của khách hàng.',
              style: const TextStyle(
                fontSize: 14,
                color: AcademyColors.textPrimary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),

            // 4. Chuyên môn đào tạo [8116:25531]
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
                    'Chuyên môn đào tạo',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...[
                    'Kỹ thuật massage cơ bản và chuyên nghiệp',
                    'Quy trình phục vụ trong môi trường Spa',
                    'Vệ sinh và an toàn tại nơi thực hành',
                    'Quan sát, phản hồi và đánh giá thao tác',
                  ].map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check,
                              color: AcademyColors.primary,
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AcademyColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 5. Kinh nghiệm thực tế [8116:25545]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kinh nghiệm thực tế',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '8 năm đồng hành nghề Spa',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.primary,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Hướng dẫn nhóm học viên nhỏ, tổ chức buổi thực hành và hỗ trợ xây dựng quy trình chăm sóc khách hàng trong môi trường đào tạo.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AcademyColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  SizedBox(height: 10),
                  Text(
                    'Giảng viên có giấy chứng nhận sư phạm và nhiều năm kinh nghiệm thực tế.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 6. Khóa học phụ trách [8116:25550]
            const Text(
              'Khóa học phụ trách',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 14),
            ...MockAcademyData.courses.take(2).map((c) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _buildCourseSubCard(context, c),
                )),
            const SizedBox(height: 14),

            // 7. Lịch đào tạo [8116:25564]
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
                    'Lịch đào tạo',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  SizedBox(height: 10),
                  Text(
                    '16/10/2026 · 13:00–17:00 Thực hành kỹ thuật massage cơ bản',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    '23/10/2026 · 13:00–17:00 Khai giảng lớp MCN-1026',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Chi nhánh Quận 3 · Lịch giảng dạy',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
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

  Widget _buildCourseSubCard(BuildContext context, CourseModel course) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 150,
            width: double.infinity,
            child: Image.asset(
              course.image,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: AcademyColors.cardWarm,
                child: const Center(
                  child: Icon(Icons.school, size: 48, color: AcademyColors.primary),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.heading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${course.level} · Học trực tiếp',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AcademyColors.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${formatCurrency(course.tuitionFee)} đ',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.primary,
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => E03CourseDetailScreen(course: course),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AcademyColors.primary, width: 1.0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text(
                        'Xem chi tiết',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
