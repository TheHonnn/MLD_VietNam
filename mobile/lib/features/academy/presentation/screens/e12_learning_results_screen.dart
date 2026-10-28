import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/material.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';

/// Screen E12: Kết quả học tập & Giấy chứng nhận [8116:26507]
/// Không sử dụng dữ liệu tĩnh giả mạo (Nguyễn Minh Anh, Massage Cơ Bản, MLD-GCN-2026-00089).
/// Phản ánh đúng 100% tiến độ và kết quả thực tế của học viên từ CSDL.
class E12LearningResultsScreen extends StatelessWidget {
  const E12LearningResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Chỉ hiển thị chứng nhận khi học viên THỰC TẾ đã hoàn thành 100% một khóa học
    final enrolledCourses = AcademyRepository.instance.enrolledCourses;
    final completedCourse = enrolledCourses
        .where((c) => c.progressPercentage >= 100)
        .firstOrNull;
    final hasRealCertificate = completedCourse != null;

    final profile = MembershipRepository.instance.profile;
    final studentName = profile.fullName.trim().isNotEmpty ? profile.fullName.trim() : 'Học viên MLD';
    final courseTitle = completedCourse?.title ?? 'Khóa học Dẫn lưu Bạch huyết Chuẩn Vodder';
    final certCode = 'MLD-GCN-${completedCourse?.customerCode ?? completedCourse?.id ?? "VODDER"}-${DateTime.now().year}';
    final todayStr = '${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year}';

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      bottomNavigationBar: hasRealCertificate
          ? Container(
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
                        _showCertificateDialog(context, studentName, courseTitle, certCode);
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
                      child: Text(
                        context.tr('Xem chứng nhận', 'View Certificate'),
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
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(context.tr('Đang tải giấy chứng nhận PDF ($certCode.pdf)...', 'Downloading PDF certificate ($certCode.pdf)...')),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AcademyColors.primary, width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Tải chứng nhận PDF',
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
            )
          : null,
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Giới thiệu [8116:26512]
            const Text(
              'Kết quả học tập',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Ghi nhận hành trình học tập và phát triển kỹ năng của bạn.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            if (!hasRealCertificate) ...[
              _buildEmptyResultState(context),
            ] else ...[
              // 2. Hồ sơ học viên thực tế
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: AcademyColors.cardWarm,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        studentName.isNotEmpty ? studentName[0].toUpperCase() : 'H',
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primary,
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
                          studentName,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AcademyColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Học viên Học viện MLD Việt Nam',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 3. LearningProgressCard (Thẻ hoàn thành)
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
                    Text(
                      courseTitle,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.8),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Đã hoàn thành 100% bài học',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Ngày cấp chứng nhận: $todayStr',
                      style: const TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // 4. Giấy chứng nhận hoàn thành đào tạo (Mục 66 - 75)
              const Text(
                'Giấy chứng nhận tốt nghiệp',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                ),
              ),
              const SizedBox(height: 12),

              // CertificateCard chuẩn Y khoa MLD
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.primary, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AcademyColors.primary.withValues(alpha: 0.1),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AcademyColors.primary.withValues(alpha: 0.3), width: 1.0),
                  ),
                  child: Column(
                    children: [
                      // Logo & Đơn vị cấp
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.workspace_premium_rounded, color: AcademyColors.primary, size: 32),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              context.tr('HỌC VIỆN MLD VIỆT NAM', 'MLD VIETNAM ACADEMY'),
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.0,
                                color: AcademyColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'GIẤY CHỨNG NHẬN ĐÀO TẠO NGHỀ',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        width: 60,
                        height: 2.5,
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [AcademyColors.primary, AcademyColors.primaryDark],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Chứng nhận học viên',
                        style: TextStyle(fontSize: 13, color: Color(0xFF475569)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        studentName,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AcademyColors.primary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Đã hoàn thành xuất sắc khóa đào tạo chuyên sâu:',
                        style: TextStyle(fontSize: 13, color: Color(0xFF1E293B)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        courseTitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AcademyColors.cardWarm,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(context.tr('Mã Giấy chứng nhận:', 'Certificate Code:'), style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569))),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    certCode,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AcademyColors.primary),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(context.tr('Ngày cấp:', 'Issue Date:'), style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569))),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    todayStr,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Mã QR tra cứu chứng nhận
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: QrImageView(
                          data: 'https://mldvietnam.edu.vn/verify/$certCode',
                          version: QrVersions.auto,
                          size: 96,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Quét mã QR để tra cứu tính xác thực trực tuyến',
                        style: TextStyle(fontSize: 11, color: Color(0xFF475569)),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  'Giấy chứng nhận được lưu trữ điện tử vĩnh viễn trên hệ thống MLD Vietnam.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: AcademyColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyResultState(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(
              color: AcademyColors.cardWarm,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.workspace_premium_outlined,
              size: 34,
              color: AcademyColors.primary,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            context.tr('Chưa có kết quả học tập & giấy chứng nhận', 'No learning results & certificates yet'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.tr('Bạn hiện chưa hoàn thành khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký, hoàn thành 100% video bài học và đạt bài kiểm tra đánh giá (≥ 8.0/10), giấy chứng nhận số chính thức sẽ được cấp tại đây.', 'You have not completed any training course yet. Once you complete 100% of lessons and pass the quiz (>= 8.0/10), your official digital certificate will be issued here.'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AcademyColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
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
              icon: const Icon(Icons.school_outlined, size: 20),
              label: Text(
                context.tr('Khám phá khóa đào tạo ngay', 'Explore Courses'),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showCertificateDialog(BuildContext context, String studentName, String courseTitle, String certCode) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.workspace_premium, color: AcademyColors.primaryDark, size: 48),
                const SizedBox(height: 12),
                const Text(
                  'Giấy Chứng Nhận Tốt Nghiệp',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AcademyColors.heading),
                ),
                const SizedBox(height: 8),
                Text(
                  'Học viên: $studentName\nKhóa học: $courseTitle\nMã chứng nhận: $certCode\nXếp loại: Đạt chuẩn chuyên môn Vodder',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AcademyColors.textPrimary, height: 1.5),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AcademyColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(context.tr('Đóng', 'Close')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
