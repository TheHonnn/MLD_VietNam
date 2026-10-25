import '../../../../features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/treatment_models.dart';
import 'd03_care_journal_screen.dart';
import 'd04_pre_service_consultation_screen.dart';

class D02PackageDetailsScreen extends StatelessWidget {
  final UserPackageModel package;

  const D02PackageDetailsScreen({
    super.key,
    required this.package,
  });

  @override
  Widget build(BuildContext context) {
    final percentText = (package.progressPercent * 100).toStringAsFixed(1).replaceAll('.0', '');

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- 1. ĐIỀU HƯỚNG & TIÊU ĐỀ ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: () => Navigator.of(context).pop(),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surface, // #FFFFFF
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border, width: 1.0),
                            ),
                            child: const Icon(Icons.arrow_back, color: AppColors.textPrimary, size: 20),
                          ),
                        ),
                        const Text(
                          'CHĂM SÓC & TRỊ LIỆU',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.primary, // #985018
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Chi tiết gói liệu trình',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        height: 36.4 / 28,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 2. ẢNH CHĂM SÓC (350x208, r=16) ---
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset(
                        package.imageUrl,
                        height: 208,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          height: 208,
                          color: AppColors.surfaceSecondary,
                          child: const Icon(Icons.spa, size: 56, color: AppColors.primary),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // --- 3. THÔNG TIN GÓI (350x108) ---
                    const Text(
                      '● Đang sử dụng',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.primary, // #985018
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      package.packageName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Ngày mua: 01/09/2026 · Hạn: ${package.expiryDate}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary, // #6B6158
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      package.branchName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textPrimary,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 4. HÀNH TRÌNH CHĂM SÓC CỦA BẠN (350x154, r=20, #FFFFFF) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface, // #FFFFFF
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Hành trình chăm sóc của bạn',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _buildMetricCol(package.totalSessions.toString(), 'Tổng buổi'),
                              _buildMetricCol(package.completedSessions.toString(), 'Đã dùng'),
                              _buildMetricCol(package.remainingSessions.toString(), 'Còn lại'),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(3),
                            child: LinearProgressIndicator(
                              value: package.progressPercent,
                              minHeight: 6,
                              backgroundColor: AppColors.surfaceSecondary,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Đã hoàn thành $percentText% liệu trình',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // --- 5. BUỔI CHĂM SÓC SẮP TỚI (#F3E2CE, r=16) ---
                    InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const D04PreServiceConsultationScreen(),
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceSecondary, // #F3E2CE
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              package.nextAppointmentText,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textHeading, // #693B20
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              package.nextAppointmentService,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              package.nextAppointmentDate,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              package.branchName,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF7F0),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Lịch hẹn sắp tới',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF236B42),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: OutlinedButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const AllInOneBookingScreen(),
                                    ),
                                  );
                                },
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary, width: 1.0),
                                  backgroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                                child: const Text(
                                  'Đặt lịch buổi tiếp theo',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const D04PreServiceConsultationScreen(),
                                    ),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 0,
                                ),
                                child: const Text(
                                  'Phiếu thông tin trước dịch vụ',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // --- 6. HÀNH ĐỘNG PHỤ: XEM NHẬT KÝ CHĂM SÓC (350x56, r=14, #FFFFFF, stroke #985018) ---
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const D03CareJournalScreen()),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary, width: 1.5),
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text(
                          'Xem nhật ký chăm sóc',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary, // #985018
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 7. THÔNG TIN GÓI (350x170, r=20, #FFFFFF) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Thông tin gói',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            package.description,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            '4.000.000đ',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary, // #985018
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Giá gói dịch vụ ưu đãi áp dụng tại chi nhánh.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 8. LỊCH SỬ SỬ DỤNG (SessionTimeline / 01) ---
                    const Text(
                      'Lịch sử sử dụng',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 16),

                    ...package.sessions.map((sess) => _buildSessionItem(sess)),

                    const SizedBox(height: 16),

                    // --- 9. ĐIỀU KIỆN SỬ DỤNG · VÍ DỤ (350x238, r=20, #F3E2CE) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Điều kiện sử dụng · Ví dụ',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          SizedBox(height: 12),
                          Text(
                            '• Đặt lịch trước mỗi buổi để chọn thời gian phù hợp.',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '• Gói dành cho một khách hàng, không chuyển nhượng trong ví dụ này.',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '• Sử dụng các buổi còn lại trước 31/12/2026.',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 12),
                          Text(
                            'Áp dụng tại toàn bộ hệ thống chi nhánh MLD Vietnam.',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // --- 10. HÀNH ĐỘNG CỐ ĐỊNH (BOTTOM BAR) ---
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: AppColors.border, width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AllInOneBookingScreen(),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary, // #985018
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Đặt lịch buổi tiếp theo',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCol(String val, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            val,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionItem(TreatmentSessionModel session) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: AppColors.surfaceSecondary, // #F3E2CE
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.check, size: 20, color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  session.date,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${session.specialistName} · ${session.branchName}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
