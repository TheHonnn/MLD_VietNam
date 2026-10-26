import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/material.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e01_academy_home_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';

/// Screen E12: Kết quả học tập (Learning Results & Certificate) [8116:26507]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E12LearningResultsScreen extends StatelessWidget {
  const E12LearningResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final hasEnrolled = AcademyRepository.instance.hasEnrolledCourses;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(),
      bottomNavigationBar: hasEnrolled ? Container(
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
                  _showCertificateDialog(context);
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
                  'Xem chứng nhận',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
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
                    const SnackBar(
                      content: Text('Đang tải chứng nhận PDF về máy...'),
                      duration: Duration(seconds: 2),
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
                  'Tải chứng nhận',
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
      ) : null,
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

            if (!hasEnrolled) ...[
              _buildEmptyResultState(context),
            ] else ...[
              // 2. Hồ sơ học viên [8116:26518]
              Builder(
                builder: (context) {
                  final profile = MembershipRepository.instance.profile;
                  final fullName = profile.fullName.trim().isNotEmpty ? profile.fullName : 'Học viên MLD';
                  final initials = fullName.split(' ').where((w) => w.isNotEmpty).map((w) => w[0]).take(2).join().toUpperCase();

                  return Row(
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
                            initials.isNotEmpty ? initials : 'HV',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fullName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Lớp Kỹ thuật viên · Ban Đào Tạo MLD',
                            style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            const SizedBox(height: 20),

            // 3. LearningProgressCard / 03 (Thẻ hoàn thành) [8116:26524]
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
                  const Text(
                    'Kỹ thuật Massage Cơ Bản',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Đã hoàn thành',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '20 / 20 bài học đã hoàn thành',
                        style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
                      ),
                      Text(
                        '100%',
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
                      value: 1.0,
                      minHeight: 6,
                      backgroundColor: AcademyColors.cardBorder,
                      valueColor: AlwaysStoppedAnimation<Color>(AcademyColors.primary),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Ngày hoàn thành 28/08/2026',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 4. Điểm đánh giá (2 thẻ Lý thuyết / Thực hành) [8116:26532]
            Row(
              children: [
                Expanded(
                  child: _buildScoreCard('8.5/10', 'Lý thuyết', 'Đánh giá khách hàng'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildScoreCard('9.0/10', 'Thực hành', 'Đánh giá khách hàng'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 5. Thẻ chuyên cần [8116:26541]
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
                    'Chuyên cần 90% · 18 / 20 buổi',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.primary,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Tính trên 20 buổi đã diễn ra của khóa cơ bản MCB-0726; không phải lớp MCN-0926 đang học.',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 6. Nhận xét của giảng viên [8116:26544]
            const Text(
              'Nhận xét của giảng viên',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 12),
            _buildReviewCard('Kiến thức lý thuyết.', 'Nắm vững quy trình phục vụ và nguyên tắc vệ sinh.'),
            const SizedBox(height: 10),
            _buildReviewCard('Kỹ năng thực hành.', 'Thao tác ổn định, biết điều chỉnh lực theo phản hồi.'),
            const SizedBox(height: 10),
            _buildReviewCard('Chuyên cần.', 'Tham gia 18/20 buổi; chủ động ôn lại nội dung đã vắng.'),
            const SizedBox(height: 10),
            _buildReviewCard('Thái độ học tập.', 'Tích cực tiếp nhận góp ý và phối hợp trong nhóm.'),
            const SizedBox(height: 24),

            // 7. Giấy chứng nhận hoàn thành đào tạo (Mục 66 - 75)
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
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.workspace_premium_rounded, color: AcademyColors.primary, size: 32),
                        SizedBox(width: 8),
                        Text(
                          'MLD VIETNAM ACADEMY',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                            color: AcademyColors.primary,
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
                    const Text(
                      'Nguyễn Minh Anh',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AcademyColors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Sinh ngày: 15/08/1996',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Đã hoàn thành xuất sắc khóa đào tạo chuyên sâu:',
                      style: TextStyle(fontSize: 13, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Kỹ thuật Dẫn lưu bạch huyết MLD Chuyên Sâu',
                      textAlign: TextAlign.center,
                      style: TextStyle(
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
                      child: const Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Mã Giấy chứng nhận:', style: TextStyle(fontSize: 12, color: Color(0xFF475569))),
                              Text('MLD-GCN-2026-00089', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AcademyColors.primary)),
                            ],
                          ),
                          SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Ngày cấp:', style: TextStyle(fontSize: 12, color: Color(0xFF475569))),
                              Text('28/08/2026', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Mã QR tra cứu chứng nhận (Mục 72)
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: QrImageView(
                        data: 'https://mldvietnam.edu.vn/verify/MLD-GCN-2026-00089',
                        version: QrVersions.auto,
                        size: 96,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Quét mã QR để tra cứu tính xác thực trực tuyến',
                      style: TextStyle(fontSize: 11, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 16),
                    // Nút xuất PDF (Mục 75)
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Đang tải xuống Giấy chứng nhận bản PDF chính thức (MLD-GCN-2026-00089.pdf)...'),
                              backgroundColor: AcademyColors.primary,
                            ),
                          );
                        },
                        icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                        label: const Text('Xuất Giấy chứng nhận (PDF)', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AcademyColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                      ),
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
          const Text(
            'Chưa có kết quả học tập & giấy chứng nhận',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Bạn hiện chưa tham gia khóa đào tạo nào tại Học viện MLD. Sau khi đăng ký và hoàn thành khóa học, toàn bộ kết quả đánh giá kỹ năng và chứng nhận số sẽ xuất hiện tại đây.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AcademyColors.textSecondary,
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
                backgroundColor: AcademyColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.school_outlined, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Đăng ký khóa học ngay',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScoreCard(String score, String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            score,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w700,
              color: AcademyColors.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AcademyColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11, color: AcademyColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewCard(String title, String content) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AcademyColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: const TextStyle(fontSize: 13, color: AcademyColors.textPrimary, height: 1.4),
          ),
        ],
      ),
    );
  }

  void _showCertificateDialog(BuildContext context) {
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
                'Chứng Nhận Hoàn Thành',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AcademyColors.heading),
              ),
              const SizedBox(height: 6),
              const Text(
                'Học viên: Nguyễn Minh Anh\nKhóa học: Kỹ thuật Massage Cơ Bản\nĐiểm: 8.5/10 · Xếp loại: Giỏi',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AcademyColors.textPrimary, height: 1.4),
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
                  child: const Text('Đóng'),
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
