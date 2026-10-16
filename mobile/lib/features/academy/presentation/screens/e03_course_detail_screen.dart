import 'package:flutter/material.dart';
import '../../data/models/academy_models.dart';
import '../widgets/academy_widgets.dart';
import 'e04_instructor_profile_screen.dart';
import 'e05_enrollment_form_screen.dart';

/// Screen E03: Chi tiết khóa học [8116:25390]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
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
  int _expandedChapterIndex = 0;

  InstructorModel get _instructor {
    return MockAcademyData.instructors.firstWhere(
      (i) => i.name == widget.course.instructorName,
      orElse: () => MockAcademyData.instructors.first,
    );
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: 'Học phí · ${formatCurrency(course.tuitionFee)}đ',
        buttonText: 'Đăng ký khóa học',
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => E05EnrollmentFormScreen(course: course),
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
            // 1. Tiêu đề trang [8116:25395]
            Text(
              course.title,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 16),

            // 2. Ảnh khóa học & Tiện ích Share/Bookmark [8116:25398]
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
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
                    top: 14,
                    right: 14,
                    child: Row(
                      children: [
                        // Nút Chia sẻ 44x44 r=12
                        InkWell(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Đã sao chép liên kết khóa học'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.share_outlined,
                              color: AcademyColors.textPrimary,
                              size: 20,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Nút Bookmark 44x44 r=12
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
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              _isBookmarked
                                  ? Icons.bookmark
                                  : Icons.bookmark_border,
                              color: _isBookmarked
                                  ? AcademyColors.primary
                                  : AcademyColors.textPrimary,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 3. Thẻ thông tin (Tuần & Giờ bằng hàng, chi tiết bên dưới chuẩn 100% Figma) [8116:25406]
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
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Thực hành chuyên nghiệp',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Hàng thông số: Tuần học và Giờ đào tạo bằng hàng
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${course.durationWeeks}',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.heading,
                                height: 1.1,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'tuần học',
                              style: TextStyle(
                                fontSize: 13,
                                color: AcademyColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${course.totalHours}',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.heading,
                                height: 1.1,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'giờ đào tạo',
                              style: TextStyle(
                                fontSize: 13,
                                color: AcademyColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // 2 dòng chi tiết bên dưới như design
                  Text(
                    '${course.theoryHours} giờ lý thuyết · ${course.practiceHours} giờ thực hành',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Học trực tiếp · Học phí ${formatCurrency(course.tuitionFee)}đ',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 4. Giới thiệu khóa học [8116:25413]
            const Text(
              'Giới thiệu khóa học',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Chương trình dành cho học viên muốn phát triển kỹ năng massage và tác phong nghề Spa. Kết hợp kiến thức nền tảng với thực hành có hướng dẫn, giúp bạn tự tin thực hiện quy trình dịch vụ và giao tiếp với khách hàng.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textPrimary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),

            // 5. Mục tiêu nghề nghiệp: Bạn sẽ học được gì? [8116:25417]
            const Text(
              'Bạn sẽ học được gì?',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 12),
            ...[
              'Nền tảng chăm sóc cơ thể và kỹ thuật massage',
              'Quy trình chuẩn bị và thực hiện dịch vụ',
              'Tìm hiểu nhu cầu, giao tiếp với khách hàng',
              'Vệ sinh, an toàn và tổ chức nơi làm việc',
              'Rèn luyện thao tác thực hành có hướng dẫn',
              'Tác phong chuyên nghiệp và đạo đức nghề nghiệp',
            ].map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.check_circle_outline,
                        color: AcademyColors.primary,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          item,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AcademyColors.textPrimary,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 24),

            // 6. Nội dung chương trình (Curriculum Accordion) [8116:25430]
            const Text(
              'Nội dung chương trình',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 12),
            _buildCurriculumAccordion(),
            const SizedBox(height: 24),

            // 7. Giảng viên đồng hành [8116:25443]
            const Text(
              'Giảng viên đồng hành',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.asset(
                          _instructor.avatar,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 64,
                            height: 64,
                            color: AcademyColors.cardWarm,
                            child: const Center(
                              child: Text(
                                'TH',
                                style: TextStyle(
                                  fontSize: 18,
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
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.heading,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              _instructor.title,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AcademyColors.primary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              '8 năm kinh nghiệm đào tạo nghề',
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
                  const SizedBox(height: 12),
                  const Text(
                    'Kỹ thuật massage · Quy trình dịch vụ · Hướng dẫn thực hành',
                    style: TextStyle(
                      fontSize: 13,
                      color: AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
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
                        side: const BorderSide(color: AcademyColors.primary, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Xem thông tin giảng viên',
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
            const SizedBox(height: 24),

            // 8. Lịch khai giảng [8116:25448]
            const Text(
              'Lịch khai giảng',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 12),
            _buildScheduleCard('23/10/2026 · MCN-1026', 'Chi nhánh Quận 3', 'Thứ 6–7–Chủ nhật · 13:00–17:00', 'Đang nhận đăng ký'),
            const SizedBox(height: 12),
            _buildScheduleCard('20/11/2026 · MCN-1126', 'Chi nhánh Quận 3', 'Thứ 6–7–Chủ nhật · 13:00–17:00', 'Sắp mở đăng ký'),
            const SizedBox(height: 24),

            // 9. Điều kiện hoàn thành [8116:25463]
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
                    'Điều kiện hoàn thành',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Chuyên cần ≥80%; điểm lý thuyết và thực hành ≥7/10. Tiêu chí mẫu của khóa học.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AcademyColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Văn bản hoàn thành nội bộ khóa học, không phải văn bằng nghề được cấp phép hoặc chứng nhận kiểm định nhà nước. Nội dung đào tạo không đưa ra chẩn đoán hay cam kết điều trị.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
                      height: 1.4,
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

  Widget _buildCurriculumAccordion() {
    final chapters = [
      {
        'title': 'Chương 1: Giới thiệu nghề Spa & tác phong',
        'desc': 'Vai trò của người làm nghề, quy trình đón tiếp và nguyên tắc phục vụ trong môi trường Spa.',
      },
      {
        'title': 'Chương 2: Kỹ thuật nền tảng & thao tác cơ bản',
        'desc': 'Giải phẫu học ứng dụng, nhận biết khối cơ và các đường kinh lạc chính trong massage trị liệu.',
      },
      {
        'title': 'Chương 3: Quy trình massage toàn thân chuẩn',
        'desc': 'Thực hành các kỹ thuật vuốt, xoa bóp, day ấn huyệt và thả lỏng cơ chuẩn y khoa.',
      },
      {
        'title': 'Chương 4: Vệ sinh an toàn & xử lý tình huống',
        'desc': 'Nguyên tắc tiệt trùng, an toàn nghề nghiệp và ứng xử linh hoạt trong dịch vụ Spa cao cấp.',
      },
      {
        'title': 'Chương 5: Thực hành lâm sàng & đánh giá',
        'desc': 'Thực hành trực tiếp trên người mẫu dưới sự hướng dẫn 1-1 của giảng viên chuyên môn.',
      },
    ];

    return Column(
      children: List.generate(chapters.length, (index) {
        final isExpanded = _expandedChapterIndex == index;
        final chap = chapters[index];

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
          ),
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              initiallyExpanded: isExpanded,
              onExpansionChanged: (expanded) {
                setState(() => _expandedChapterIndex = expanded ? index : -1);
              },
              title: Text(
                chap['title']!,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AcademyColors.textPrimary,
                ),
              ),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                Text(
                  chap['desc']!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AcademyColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildScheduleCard(String schedule, String branch, String time, String tag) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AcademyColors.cardWarm,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                schedule,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.textPrimary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tag,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AcademyColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            branch,
            style: const TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            time,
            style: const TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
          ),
        ],
      ),
    );
  }
}
