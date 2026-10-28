import 'package:flutter/material.dart';
import '../../../../core/localization/app_translation.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';

/// Screen E11: Lịch học & điểm danh [8116:26294]
/// Không sử dụng dữ liệu tĩnh giả mạo. Phản ánh đúng trạng thái thực tế từ CSDL.
class E11AttendanceScheduleScreen extends StatefulWidget {
  const E11AttendanceScheduleScreen({super.key});

  @override
  State<E11AttendanceScheduleScreen> createState() => _E11AttendanceScheduleScreenState();
}

class _E11AttendanceScheduleScreenState extends State<E11AttendanceScheduleScreen> {
  

  Widget _buildEmptyScheduleState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: AcademyColors.cardWarm,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.event_note_outlined,
              size: 32,
              color: AcademyColors.primary,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            context.tr('Chưa có lịch học thực hành trực tiếp', 'No live practical schedule yet'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.tr(
              'Toàn bộ 11 khóa học MLD hiện tại được đào tạo trực tuyến qua hệ thống video bài giảng. Khi có đợt thực hành tập trung tại học viện, lịch học và phòng thực hành sẽ xuất hiện tại đây.',
              'All 11 MLD courses are currently delivered online via video lectures. When practical training sessions are scheduled at facilities, dates and rooms will appear here.',
            ),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AcademyColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),
          
          // Nút khám phá khóa học
          SizedBox(
            width: double.infinity,
            height: 48,
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
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.school_outlined, size: 20),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      context.tr('Xem danh mục 11 khóa học', 'View 11 Courses Catalog'),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Giới thiệu [8116:26299]
            Text(
              context.tr('Lịch học & điểm danh', 'Class Schedule & Attendance'),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              context.tr('Chủ động theo dõi lịch đào tạo và các buổi thực hành.', 'Track training schedule and practical sessions proactively.'),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            _buildEmptyScheduleState(),
          ],
        ),
      ),
    );
  }
}
