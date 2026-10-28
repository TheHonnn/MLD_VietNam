import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/treatment_models.dart';
import 'd03_care_journal_screen.dart';

/// Screen D02: Chi tiết gói liệu trình & Chi tiết từng buổi điều trị
/// - Chuẩn 100% Hệ thống Y khoa MLD Việt Nam & Design System (#2860EB)
/// - Hiển thị đầy đủ: Mã liệu trình, Tên liệu trình, Tên dịch vụ, Tên khách hàng,
///   Số buổi, Tổng số buổi cần điều trị, Giờ điều trị, Trạng thái, Nội dung, Hình ảnh minh chứng.
class D02PackageDetailsScreen extends StatelessWidget {
  final UserPackageModel package;

  const D02PackageDetailsScreen({
    super.key,
    required this.package,
  });

  @override
  Widget build(BuildContext context) {
    final percentText = (package.progressPercent * 100).toStringAsFixed(1).replaceAll('.0', '');
    final profile = MembershipRepository.instance.profile;
    final customerDisplayName = package.customerName.trim().isNotEmpty
        ? package.customerName
        : (profile.fullName.trim().isNotEmpty ? profile.fullName : context.tr('Khách hàng', 'Customer'));
    final serviceDisplayName = package.serviceName.trim().isNotEmpty
        ? package.serviceName
        : context.tr('Dẫn lưu bạch huyết chuyên sâu MLD', 'Deep Lymphatic Drainage MLD');
    final packageCodeDisplay = package.packageCode.trim().isNotEmpty
        ? package.packageCode
        : 'MLD-PKG-${package.id}';

    // Tạo danh sách buổi: Ưu tiên sessions từ API; nếu rỗng thì sinh khung các buổi theo totalSessions
    final List<TreatmentSessionModel> displaySessions = [];
    if (package.sessions.isNotEmpty) {
      displaySessions.addAll(package.sessions);
    } else {
      final total = package.totalSessions > 0 ? package.totalSessions : 1;
      for (int i = 1; i <= total; i++) {
        final isDone = i <= package.completedSessions;
        final isCurrent = i == package.completedSessions + 1 && package.status == PackageStatus.active;
        String statusText = 'PENDING';
        if (isDone) {
          statusText = 'COMPLETED';
        } else if (isCurrent) {
          statusText = 'IN_PROGRESS';
        }

        displaySessions.add(
          TreatmentSessionModel(
            id: 'sess-$i',
            sessionNumber: i,
            packageCode: packageCodeDisplay,
            packageName: package.packageName,
            serviceName: serviceDisplayName,
            customerName: customerDisplayName,
            treatmentTime: isDone ? 'Đã hoàn thành' : (isCurrent ? 'Dự kiến buổi tiếp theo' : 'Chưa lên lịch'),
            totalSessions: total,
            status: statusText,
            title: isDone
                ? context.tr('Khai thông & Dẫn lưu bạch huyết buổi $i', 'Lymphatic Drainage Session $i')
                : context.tr('Liệu trình trị liệu phục hồi buổi $i', 'Recovery Therapy Session $i'),
            content: isDone
                ? context.tr('Đã hoàn thành liệu trình kỹ thuật MLD tiêu chuẩn, hỗ trợ giải phóng dịch ứ và tuần hoàn bạch huyết.', 'Completed standard MLD technique, promoting lymph fluid drainage.')
                : context.tr('Chuyên viên sẽ ghi chép nội dung kỹ thuật và đánh giá sau khi buổi điều trị hoàn tất.', 'Specialist will record clinical notes and progress upon session completion.'),
            evidenceImages: const [],
            specialistName: package.specialistName,
            branchName: package.branchName,
          ),
        );
      }
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          context.tr('Chi tiết gói liệu trình', 'Treatment Package Details'),
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ==========================================
                    // 1. THẺ THÔNG TIN TỔNG QUAN GÓI LIỆU TRÌNH
                    // ==========================================
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Mã liệu trình & Trạng thái
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF4FE),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.qr_code_rounded, size: 14, color: AppColors.primary),
                                      const SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                          '#$packageCodeDisplay',
                                          style: const TextStyle(
                                            fontFamily: 'Montserrat',
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              _buildStatusBadge(context, package.status),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Tên liệu trình
                          Text(
                            package.packageName.tr(context),
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Box thông tin dịch vụ, khách hàng, chi nhánh
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9FAFB),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              children: [
                                _buildInfoRow(
                                  icon: Icons.spa_rounded,
                                  label: context.tr('Tên dịch vụ:', 'Service:'),
                                  value: serviceDisplayName,
                                  isBold: true,
                                ),
                                const Divider(height: 16, color: AppColors.border),
                                _buildInfoRow(
                                  icon: Icons.person_outline_rounded,
                                  label: context.tr('Khách hàng:', 'Customer:'),
                                  value: customerDisplayName,
                                  isBold: true,
                                ),
                                const Divider(height: 16, color: AppColors.border),
                                _buildInfoRow(
                                  icon: Icons.medical_services_outlined,
                                  label: context.tr('Chuyên viên:', 'Specialist:'),
                                  value: package.specialistName.tr(context),
                                ),
                                const Divider(height: 16, color: AppColors.border),
                                _buildInfoRow(
                                  icon: Icons.location_on_outlined,
                                  label: context.tr('Chi nhánh:', 'Branch:'),
                                  value: package.branchName.tr(context),
                                ),
                                if (package.expiryDate.isNotEmpty) ...[
                                  const Divider(height: 16, color: AppColors.border),
                                  _buildInfoRow(
                                    icon: Icons.event_available_rounded,
                                    label: context.tr('Hạn sử dụng:', 'Expiry Date:'),
                                    value: package.expiryDate,
                                  ),
                                ],
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Thống kê tiến độ điều trị
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  context.tr('Tiến độ điều trị:', 'Treatment Progress:'),
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              RichText(
                                text: TextSpan(
                                  style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13.5, color: AppColors.textPrimary),
                                  children: [
                                    TextSpan(
                                      text: '${package.completedSessions}',
                                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 15),
                                    ),
                                    TextSpan(
                                      text: ' / ${package.totalSessions} ${context.tr("buổi", "sessions")}',
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                    ),
                                    TextSpan(
                                      text: ' ($percentText%)',
                                      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: package.progressPercent,
                              minHeight: 8,
                              backgroundColor: const Color(0xFFEFF4FE),
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 22),

                    // ==========================================
                    // 2. PHÂN MỤC: DANH SÁCH & CHI TIẾT TỪNG BUỔI
                    // ==========================================
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr('LỘ TRÌNH TỪNG BUỔI ĐIỀU TRỊ', 'SESSION SCHEDULE'),
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textSecondary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                context.tr('Bấm vào từng buổi để xem chi tiết & minh chứng', 'Tap session to view details & evidence'),
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11.5,
                                  color: AppColors.textPlaceholder,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF4FE),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${displaySessions.length} ${context.tr("buổi", "sessions")}',
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Danh sách thẻ các buổi
                    ...displaySessions.map(
                      (sess) => _buildSessionItem(context, sess, package),
                    ),

                    const SizedBox(height: 16),

                    // ==========================================
                    // 3. NÚT XEM NHẬT KÝ TRỊ LIỆU
                    // ==========================================
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const D03CareJournalScreen()),
                          );
                        },
                        icon: const Icon(Icons.menu_book_outlined, size: 18, color: AppColors.primary),
                        label: Text(
                          context.tr('Xem xâu chuỗi minh chứng tại Nhật ký trị liệu', 'View Evidence Chain in Care Journal'),
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // ==========================================
            // 4. BOTTOM ACTION BAR (ĐẶT LỊCH BUỔI TIẾP)
            // ==========================================
            if (package.remainingSessions > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    top: BorderSide(color: AppColors.border, width: 1.0),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
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
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: Text(
                      context.tr('Đặt lịch buổi tiếp theo', 'Book Next Session'),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
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

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool isBold = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 13,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(BuildContext context, PackageStatus status) {
    Color bg;
    Color text;
    String label;
    if (status == PackageStatus.active) {
      bg = const Color(0xFFEFF4FE);
      text = AppColors.primary;
      label = context.tr('Đang điều trị', 'In Treatment');
    } else if (status == PackageStatus.completed) {
      bg = const Color(0xFFF0FDF4);
      text = const Color(0xFF16A34A);
      label = context.tr('Hoàn thành', 'Completed');
    } else {
      bg = const Color(0xFFF3F4F6);
      text = const Color(0xFF6B7280);
      label = context.tr('Hết hạn', 'Expired');
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Montserrat',
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: text,
        ),
      ),
    );
  }

  /// Thẻ buổi điều trị trong danh sách chia buổi
  Widget _buildSessionItem(BuildContext context, TreatmentSessionModel session, UserPackageModel package) {
    final isDone = session.isCompleted;
    final isCurrent = session.isInProgress;

    Color badgeBg;
    Color badgeColor;
    String badgeText;
    if (isDone) {
      badgeBg = const Color(0xFFF0FDF4);
      badgeColor = const Color(0xFF16A34A);
      badgeText = context.tr('Đã thực hiện', 'Completed');
    } else if (isCurrent) {
      badgeBg = const Color(0xFFEFF4FE);
      badgeColor = AppColors.primary;
      badgeText = context.tr('Đang điều trị', 'In Progress');
    } else {
      badgeBg = const Color(0xFFF3F4F6);
      badgeColor = const Color(0xFF6B7280);
      badgeText = context.tr('Đang chờ', 'Pending');
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCurrent ? AppColors.primary : AppColors.border,
          width: isCurrent ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _showSessionDetailBottomSheet(context, session, package),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Badge tròn số buổi
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: isDone ? const Color(0xFFF0FDF4) : (isCurrent ? const Color(0xFFEFF4FE) : const Color(0xFFF9FAFB)),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDone ? const Color(0xFF86EFAC) : (isCurrent ? AppColors.primary : AppColors.border),
                  ),
                ),
                child: Center(
                  child: isDone
                      ? const Icon(Icons.check_rounded, color: Color(0xFF16A34A), size: 22)
                      : Text(
                          '${session.sessionNumber}',
                          style: TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: isCurrent ? AppColors.primary : AppColors.textSecondary,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 12),

              // Thông tin tóm tắt buổi
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${context.tr("Buổi", "Session")} ${session.sessionNumber}',
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            badgeText,
                            style: TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: badgeColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      session.title,
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.access_time_rounded, size: 13, color: AppColors.textSecondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            session.treatmentTime.isNotEmpty ? session.treatmentTime : context.tr('Chưa lên lịch', 'Not scheduled'),
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (session.evidenceImages.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FE),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.photo_library_outlined, size: 12, color: AppColors.primary),
                                const SizedBox(width: 3),
                                Text(
                                  '${session.evidenceImages.length} ảnh',
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_ios_rounded, size: 15, color: AppColors.textPlaceholder),
            ],
          ),
        ),
      ),
    );
  }

  /// BottomSheet hiển thị CHI TIẾT TỪNG BUỔI ĐIỀU TRỊ
  /// Có: Mã liệu trình, Tên liệu trình, Tên dịch vụ, Tên khách hàng, Giờ điều trị,
  /// Số buổi, Tổng số buổi cần điều trị, Trạng thái, Nội dung, Hình ảnh minh chứng.
  void _showSessionDetailBottomSheet(
    BuildContext context,
    TreatmentSessionModel session,
    UserPackageModel package,
  ) {
    final profile = MembershipRepository.instance.profile;
    final packageCode = session.packageCode.isNotEmpty ? session.packageCode : (package.packageCode.isNotEmpty ? package.packageCode : 'MLD-PKG-${package.id}');
    final packageName = session.packageName.isNotEmpty ? session.packageName : package.packageName;
    final serviceName = session.serviceName.isNotEmpty ? session.serviceName : (package.serviceName.isNotEmpty ? package.serviceName : 'Dẫn lưu bạch huyết MLD');
    final customerName = session.customerName.isNotEmpty ? session.customerName : (package.customerName.isNotEmpty ? package.customerName : (profile.fullName.isNotEmpty ? profile.fullName : 'Khách hàng'));
    final totalSessions = package.totalSessions > 0 ? package.totalSessions : session.totalSessions;
    final treatmentTime = session.treatmentTime.isNotEmpty ? session.treatmentTime : context.tr('Theo lịch hẹn trung tâm', 'Per center appointment');

    Color statusBg;
    Color statusTextColor;
    String statusLabel;
    if (session.isCompleted) {
      statusBg = const Color(0xFFF0FDF4);
      statusTextColor = const Color(0xFF16A34A);
      statusLabel = context.tr('Đã thực hiện', 'Completed');
    } else if (session.isInProgress) {
      statusBg = const Color(0xFFEFF4FE);
      statusTextColor = AppColors.primary;
      statusLabel = context.tr('Đang điều trị', 'In Progress');
    } else {
      statusBg = const Color(0xFFF3F4F6);
      statusTextColor = const Color(0xFF6B7280);
      statusLabel = context.tr('Đang chờ thực hiện', 'Pending');
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.88,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Thanh kéo vuốt
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header Modal
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        context.tr('Chi tiết buổi điều trị', 'Session Details'),
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 22, color: AppColors.textSecondary),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.border),

              // Nội dung chi tiết cuộn được
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge Mã liệu trình & Trạng thái buổi
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '#$packageCode',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              statusLabel,
                              style: TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: statusTextColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Tên liệu trình
                      Text(
                        packageName.tr(context),
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Bảng các trường thông tin chuẩn theo yêu cầu:
                      // Tên dịch vụ, Tên khách hàng, Giờ điều trị, Số buổi / Tổng số buổi
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            _buildModalInfoRow(
                              icon: Icons.spa_rounded,
                              label: context.tr('Tên dịch vụ:', 'Service Name:'),
                              value: serviceName,
                              isHighlight: true,
                            ),
                            const Divider(height: 16, color: AppColors.border),
                            _buildModalInfoRow(
                              icon: Icons.person_outline_rounded,
                              label: context.tr('Tên khách hàng:', 'Customer Name:'),
                              value: customerName,
                              isHighlight: true,
                            ),
                            const Divider(height: 16, color: AppColors.border),
                            _buildModalInfoRow(
                              icon: Icons.format_list_numbered_rounded,
                              label: context.tr('Số buổi / Tổng buổi:', 'Session / Total:'),
                              value: '${context.tr("Buổi", "Session")} ${session.sessionNumber} / $totalSessions ${context.tr("buổi", "sessions")}',
                              isHighlight: true,
                              valueColor: AppColors.primary,
                            ),
                            const Divider(height: 16, color: AppColors.border),
                            _buildModalInfoRow(
                              icon: Icons.access_time_rounded,
                              label: context.tr('Giờ điều trị:', 'Treatment Time:'),
                              value: treatmentTime,
                            ),
                            const Divider(height: 16, color: AppColors.border),
                            _buildModalInfoRow(
                              icon: Icons.medical_services_outlined,
                              label: context.tr('Kỹ thuật viên:', 'Specialist:'),
                              value: session.specialistName,
                            ),
                            const Divider(height: 16, color: AppColors.border),
                            _buildModalInfoRow(
                              icon: Icons.location_on_outlined,
                              label: context.tr('Chi nhánh:', 'Branch:'),
                              value: session.branchName,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      // 1. NỘI DUNG BUỔI ĐIỀU TRỊ
                      Row(
                        children: [
                          const Icon(Icons.description_outlined, size: 18, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            context.tr('Nội dung buổi điều trị', 'Session Clinical Content'),
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Text(
                          session.content.isNotEmpty
                              ? session.content
                              : context.tr(
                                  'Chuyên viên MLD sẽ ghi chép chi tiết quy trình kỹ thuật, mức độ giảm sưng nề và phản ứng mô cơ sau buổi điều trị.',
                                  'MLD specialists will record clinical notes and progress here upon session completion.',
                                ),
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 13,
                            color: AppColors.textPrimary,
                            height: 1.45,
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),

                      // 2. HÌNH ẢNH MINH CHỨNG
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.photo_library_outlined, size: 18, color: AppColors.primary),
                              const SizedBox(width: 6),
                              Text(
                                context.tr('Hình ảnh minh chứng', 'Evidence Images'),
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          if (session.evidenceImages.isNotEmpty)
                            Text(
                              '${session.evidenceImages.length} ${context.tr("hình ảnh", "images")}',
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (session.evidenceImages.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            children: [
                              const Icon(Icons.image_outlined, size: 36, color: AppColors.textPlaceholder),
                              const SizedBox(height: 8),
                              Text(
                                context.tr('Chưa có hình ảnh minh chứng cho buổi này', 'No evidence images for this session yet'),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                context.tr(
                                  'Hình ảnh kết quả trước/sau điều trị sẽ được chuyên viên chụp và đồng bộ từ hệ thống.',
                                  'Before/after treatment images will be captured and synced by specialists.',
                                ),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 11.5,
                                  color: AppColors.textPlaceholder,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                            childAspectRatio: 1,
                          ),
                          itemCount: session.evidenceImages.length,
                          itemBuilder: (ctx, idx) {
                            final imgUrl = session.evidenceImages[idx];
                            return InkWell(
                              onTap: () => _openImageViewer(ctx, imgUrl),
                              borderRadius: BorderRadius.circular(8),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: _buildImageWidget(imgUrl),
                              ),
                            );
                          },
                        ),

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildModalInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool isHighlight = false,
    Color? valueColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 12.5,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 13,
              fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildImageWidget(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Image.network(
        path,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackImage(),
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary));
        },
      );
    }
    return Image.asset(
      path,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => _buildFallbackImage(),
    );
  }

  Widget _buildFallbackImage() {
    return Container(
      color: const Color(0xFFEFF4FE),
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, color: AppColors.primary, size: 24),
      ),
    );
  }

  /// Mở màn hình xem phóng to ảnh toàn màn hình với InteractiveViewer
  void _openImageViewer(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black.withValues(alpha: 0.9),
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                panEnabled: true,
                minScale: 0.5,
                maxScale: 4.0,
                child: _buildImageWidget(imageUrl),
              ),
            ),
            Positioned(
              top: 40,
              right: 16,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
