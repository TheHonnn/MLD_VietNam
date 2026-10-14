import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';
import 'e09_lesson_screen.dart';
import 'e10_quiz_screen.dart';
import 'e11_attendance_schedule_screen.dart';

/// Screen E08: Chi tiết lớp học [8116:25997]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E08ClassDetailScreen extends StatefulWidget {
  const E08ClassDetailScreen({super.key});

  @override
  State<E08ClassDetailScreen> createState() => _E08ClassDetailScreenState();
}

class _E08ClassDetailScreenState extends State<E08ClassDetailScreen> {
  int _selectedTab = 0; // 0: Nội dung học, 1: Lịch học, 2: Tài liệu

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        subtitleTag: 'Dữ liệu minh họa',
      ),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: 'Bài 05 · Kỹ thuật Massage cơ bản',
        buttonText: 'Tiếp tục bài học',
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const E09LessonScreen(),
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
                    'Chi nhánh mẫu 01 — Quận 3',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Thứ 6–7–Chủ nhật · 13:00–17:00',
                    style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
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
              // Chương 1 (Expanded)
              _buildChapterCard(
                title: 'Chương 1: Giới thiệu nghề Spa',
                subtitle: '3 bài học · Đã hoàn thành',
                lessons: [
                  _buildLessonItem('Bài 1: Tổng quan ngành Spa', 'Video · 12 phút', isDone: true),
                  _buildLessonItem('Bài 2: Đạo đức & tác phong nghề', 'Video · 15 phút', isDone: true),
                  _buildLessonItem('Bài 3: Chuẩn bị không gian trị liệu', 'Video · 20 phút', isDone: true),
                ],
              ),
              const SizedBox(height: 12),

              // Chương 2 (Expanded with Active Lesson 5)
              _buildChapterCard(
                title: 'Chương 2: Kỹ thuật nền tảng',
                subtitle: '3 bài học · 1 bài đã hoàn thành',
                lessons: [
                  _buildLessonItem('Bài 4: Giải phẫu học ứng dụng', 'Video · 25 phút', isDone: true),
                  // Lesson 5 - Active
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const E09LessonScreen()),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      margin: const EdgeInsets.only(top: 8, bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AcademyColors.cardWarm,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.play_circle_fill, color: AcademyColors.primary, size: 24),
                          SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Bài 05: Kỹ thuật Massage cơ bản',
                                  style: TextStyle(
                                    fontSize: 14,
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
                          Icon(Icons.chevron_right, color: AcademyColors.primary, size: 20),
                        ],
                      ),
                    ),
                  ),
                  _buildLessonItem('Bài 6: Thao tác xoa vuốt & miết', 'Video · 22 phút', isLocked: true),
                ],
              ),
              const SizedBox(height: 10),

              // Chương 3, 4, 5 (Collapsed)
              _buildCollapsedChapterCard('Chương 3: Kỹ thuật chuyên sâu', '4 bài học · Chưa học'),
              const SizedBox(height: 8),
              _buildCollapsedChapterCard('Chương 4: Vệ sinh an toàn & CSKH', '4 bài học · Chưa học'),
              const SizedBox(height: 8),
              _buildCollapsedChapterCard('Chương 5: Thực hành lâm sàng & đánh giá', '6 bài học · Chưa học'),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'Tổng cộng 20 bài học trong 5 chương.',
                  style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                ),
              ),
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
                  child: Row(
                    children: const [
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
                  borderRadius: BorderRadius.circular(20),
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
                      'Phòng thực hành 02 · Chi nhánh mẫu 01 — Quận 3',
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
                  borderRadius: BorderRadius.circular(20),
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
                  borderRadius: BorderRadius.circular(20),
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

  Widget _buildCollapsedChapterCard(String title, String subtitle) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AcademyColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
              ),
            ],
          ),
          const Icon(Icons.keyboard_arrow_down, color: AcademyColors.textSecondary),
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
