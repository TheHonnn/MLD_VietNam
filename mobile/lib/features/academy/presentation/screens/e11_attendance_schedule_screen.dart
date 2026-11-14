import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';
import 'e08_class_detail_screen.dart';

/// Screen E11: Lịch học & điểm danh [8116:26294]
/// Đồng bộ 100% Brand Design System và dữ liệu CSDL Supabase
class E11AttendanceScheduleScreen extends StatefulWidget {
  const E11AttendanceScheduleScreen({super.key});

  @override
  State<E11AttendanceScheduleScreen> createState() => _E11AttendanceScheduleScreenState();
}

class _E11AttendanceScheduleScreenState extends State<E11AttendanceScheduleScreen> {
  bool _isLoading = true;
  List<StudentBatchScheduleItem> _schedules = [];

  @override
  void initState() {
    super.initState();
    _fetchSchedules();
  }

  Future<void> _fetchSchedules() async {
    setState(() => _isLoading = true);
    try {
      final list = await AcademyRepository.instance.getStudentBatchSchedules();
      if (mounted) {
        setState(() {
          _schedules = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildScheduleCard(StudentBatchScheduleItem item) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card: Mã lớp & Trạng thái
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.mintBackground.withValues(alpha: 0.6),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(
                bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.6), width: 1),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    item.batchCode.isNotEmpty ? item.batchCode : 'LỚP HỌC MLD',
                    style: GoogleFonts.beVietnamPro(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    item.status == 'STUDYING'
                        ? context.tr('Đang đào tạo', 'Studying')
                        : context.tr('Đã xếp lớp', 'Enrolled'),
                    style: GoogleFonts.beVietnamPro(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF2E7D32),
                    ),
                  ),
                ),
                const Spacer(),
                const Icon(Icons.event_available, color: AppColors.primary, size: 20),
              ],
            ),
          ),

          // Body: Tên khóa học & Thông tin lịch chi tiết
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.courseTitle,
                  style: GoogleFonts.beVietnamPro(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),

                // Lịch học & Khung giờ
                _buildInfoRow(
                  icon: Icons.access_time_rounded,
                  iconColor: const Color(0xFF0284C7),
                  label: context.tr('Lịch học:', 'Schedule:'),
                  value: '${item.scheduleDays}${item.timeSlot.isNotEmpty ? ' (${item.timeSlot})' : ''}',
                ),
                const SizedBox(height: 10),

                // Ngày bắt đầu - Ngày kết thúc
                if (item.startDate.isNotEmpty) ...[
                  _buildInfoRow(
                    icon: Icons.calendar_today_outlined,
                    iconColor: const Color(0xFF7C3AED),
                    label: context.tr('Thời gian:', 'Period:'),
                    value: '${item.startDate}  ➔  ${item.endDate.isNotEmpty ? item.endDate : 'Dự kiến'}',
                  ),
                  const SizedBox(height: 10),
                ],

                // Giảng viên phụ trách
                _buildInfoRow(
                  icon: Icons.badge_outlined,
                  iconColor: AppColors.primary,
                  label: context.tr('Giảng viên:', 'Instructor:'),
                  value: item.instructorName,
                ),
                const SizedBox(height: 10),

                // Cơ sở đào tạo
                _buildInfoRow(
                  icon: Icons.location_on_outlined,
                  iconColor: const Color(0xFFE11D48),
                  label: context.tr('Địa điểm:', 'Location:'),
                  value: item.branchName,
                  subValue: item.branchAddress,
                ),

                const SizedBox(height: 16),

                // Nút Vào lớp học
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (item.courseId.isNotEmpty) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => E08ClassDetailScreen(courseId: item.courseId),
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.play_circle_outline, size: 18),
                    label: Text(
                      context.tr('Vào lớp học & bài giảng', 'Enter Class & Lessons'),
                      style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    String? subValue,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: iconColor),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: GoogleFonts.beVietnamPro(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
              children: [
                TextSpan(
                  text: '$label ',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                TextSpan(
                  text: value,
                  style: const TextStyle(color: AppColors.textPrimary),
                ),
                if (subValue != null && subValue.isNotEmpty) ...[
                  TextSpan(
                    text: '\n$subValue',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.textSecondary.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyScheduleState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: AppColors.mintBackground,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.event_note_outlined,
              size: 32,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            context.tr('Chưa có lịch xếp lớp học viên', 'No class batch schedule assigned yet'),
            textAlign: TextAlign.center,
            style: GoogleFonts.beVietnamPro(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.textHeading,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.tr(
              'Khi Ban Tuyển sinh xếp bạn vào lớp học chính thức, toàn bộ lịch đào tạo, khung giờ, giảng viên và địa điểm thực hành sẽ hiển thị trực tiếp tại đây.',
              'When the Admission department assigns you to an official class batch, the schedule, time slot, instructor, and practice location will appear right here.',
            ),
            textAlign: TextAlign.center,
            style: GoogleFonts.beVietnamPro(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),

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
                backgroundColor: AppColors.accent,
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
                      style: GoogleFonts.beVietnamPro(fontSize: 14, fontWeight: FontWeight.w600),
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
      backgroundColor: AppColors.background,
      appBar: const AcademyAppBar(),
      body: RefreshIndicator(
        onRefresh: _fetchSchedules,
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Giới thiệu [8116:26299]
              Text(
                context.tr('Lịch học & điểm danh', 'Class Schedule & Attendance'),
                style: GoogleFonts.beVietnamPro(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                context.tr(
                  'Chủ động theo dõi lịch đào tạo, khung giờ và địa điểm học trực tiếp.',
                  'Track training schedule, time slots, and live practice locations proactively.',
                ),
                style: GoogleFonts.beVietnamPro(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (_schedules.isNotEmpty) ...[
                for (final item in _schedules) _buildScheduleCard(item),
              ] else
                _buildEmptyScheduleState(),
            ],
          ),
        ),
      ),
    );
  }
}
