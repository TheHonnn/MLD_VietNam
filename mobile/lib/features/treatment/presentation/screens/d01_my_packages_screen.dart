import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';
import 'd02_package_details_screen.dart';

/// Screen D01: Gói liệu trình của tôi - Đồng bộ Design System (#2860EB), Font Montserrat, 100% English translation
class D01MyPackagesScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const D01MyPackagesScreen({
    super.key,
    this.onBack,
  });

  @override
  State<D01MyPackagesScreen> createState() => _D01MyPackagesScreenState();
}

class _D01MyPackagesScreenState extends State<D01MyPackagesScreen> {
  final TreatmentRepository _repo = TreatmentRepository.instance;
  int _selectedStatusIndex = 0; // 0: Đang sử dụng, 1: Đã hoàn thành, 2: Hết hạn

  @override
  void initState() {
    super.initState();
    _loadPackages();
  }

  Future<void> _loadPackages() async {
    await _repo.fetchPackages();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final canGoBack = widget.onBack != null || Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: canGoBack
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
                onPressed: () {
                  if (widget.onBack != null) {
                    widget.onBack!();
                  } else {
                    Navigator.of(context).pop();
                  }
                },
              )
            : null,
        title: Text(
          context.tr('Gói liệu trình của tôi', 'My Treatment Packages'),
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
        child: RefreshIndicator(
          onRefresh: _loadPackages,
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. THẺ THÔNG TIN KHÁCH HÀNG
                Builder(
                  builder: (context) {
                    final profile = MembershipRepository.instance.profile;
                    final activePackages = _repo.packages.where((p) => p.status == PackageStatus.active).toList();
                    final remainingSessions = activePackages.fold<int>(0, (sum, p) => sum + (p.totalSessions - p.completedSessions));
                    final usedSessions = _repo.packages.fold<int>(0, (sum, p) => sum + p.completedSessions);

                    final displayName = profile.fullName.trim().isNotEmpty ? profile.fullName : context.tr('Khách hàng', 'Customer');
                    final phone = profile.phone.trim();

                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
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
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEFF4FE),
                                  shape: BoxShape.circle,
                                ),
                                child: const Center(
                                  child: Icon(Icons.person_outline_rounded, color: AppColors.primary, size: 24),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      displayName,
                                      style: const TextStyle(
                                        fontFamily: 'Montserrat',
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    if (phone.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        phone,
                                        style: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w500,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${activePackages.length} ${context.tr("gói đang dùng", "active packages")}   ·   $remainingSessions ${context.tr("buổi còn lại", "sessions left")}   ·   $usedSessions ${context.tr("đã dùng", "used")}',
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const SizedBox(height: 16),

                // 2. BỘ LỌC TRẠNG THÁI GÓI
                Row(
                  children: [
                    _buildFilterTab(0, context.tr('Đang sử dụng', 'Active')),
                    const SizedBox(width: 8),
                    _buildFilterTab(1, context.tr('Đã hoàn thành', 'Completed')),
                    const SizedBox(width: 8),
                    _buildFilterTab(2, context.tr('Hết hạn', 'Expired')),
                  ],
                ),

                const SizedBox(height: 16),

                // 3. DANH SÁCH GÓI LIỆU TRÌNH THEO TRẠNG THÁI
                if (_selectedStatusIndex == 0) ...[
                  if (_repo.packages.where((p) => p.status == PackageStatus.active).isEmpty)
                    _buildEmptyState(
                      icon: Icons.spa_outlined,
                      title: context.tr('Bạn chưa có gói liệu trình nào đang hoạt động', 'You have no active treatment packages'),
                      subtitle: context.tr('Khám phá các dịch vụ & gói chăm sóc sức khỏe hệ bạch huyết để bắt đầu phục hồi cơ thể.', 'Explore lymphatic health services & treatment packages to start your recovery journey.'),
                    )
                  else
                    ..._repo.packages.where((p) => p.status == PackageStatus.active).map(
                          (pkg) => Padding(
                            padding: const EdgeInsets.only(bottom: 14.0),
                            child: _buildPackageCard(
                              package: pkg,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => D02PackageDetailsScreen(package: pkg),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                ] else if (_selectedStatusIndex == 1) ...[
                  if (_repo.packages.where((p) => p.status == PackageStatus.completed || p.completedSessions >= p.totalSessions).isEmpty)
                    _buildEmptyState(
                      icon: Icons.history_rounded,
                      title: context.tr('Bạn chưa có gói liệu trình nào đã hoàn thành.', 'You have no completed treatment packages.'),
                      subtitle: context.tr('Các gói liệu trình đã hoàn thành sẽ xuất hiện tại đây.', 'Your completed treatment packages will appear here.'),
                      showBookButton: false,
                    )
                  else
                    ..._repo.packages.where((p) => p.status == PackageStatus.completed || p.completedSessions >= p.totalSessions).map(
                          (pkg) => Padding(
                            padding: const EdgeInsets.only(bottom: 14.0),
                            child: _buildPackageCard(
                              package: pkg,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => D02PackageDetailsScreen(package: pkg),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                ] else ...[
                  if (_repo.packages.where((p) => p.status == PackageStatus.expired).isEmpty)
                    _buildEmptyState(
                      icon: Icons.event_busy_rounded,
                      title: context.tr('Không có gói liệu trình nào hết hạn.', 'No expired treatment packages.'),
                      subtitle: context.tr('Các gói liệu trình hết hạn sẽ hiển thị tại đây.', 'Expired treatment packages will be displayed here.'),
                      showBookButton: false,
                    )
                  else
                    ..._repo.packages.where((p) => p.status == PackageStatus.expired).map(
                          (pkg) => Padding(
                            padding: const EdgeInsets.only(bottom: 14.0),
                            child: _buildPackageCard(
                              package: pkg,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => D02PackageDetailsScreen(package: pkg),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                ],

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterTab(int index, String title) {
    final isSelected = _selectedStatusIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedStatusIndex = index;
          });
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
            ),
          ),
          child: Text(
            title,
            style: TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    bool showBookButton = true,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF4FE),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 28, color: AppColors.primary),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          if (showBookButton) ...[
            const SizedBox(height: 18),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                ),
                child: Text(
                  context.tr('Khám phá dịch vụ', 'Explore Services'),
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPackageCard({
    required UserPackageModel package,
    required VoidCallback onTap,
  }) {
    final percentText = (package.progressPercent * 100).toStringAsFixed(1).replaceAll('.0', '');
    final profile = MembershipRepository.instance.profile;
    final customerDisplayName = package.customerName.trim().isNotEmpty
        ? package.customerName
        : (profile.fullName.trim().isNotEmpty ? profile.fullName : context.tr('Khách hàng', 'Customer'));
    final serviceDisplayName = package.serviceName.trim().isNotEmpty
        ? package.serviceName
        : context.tr('Trị liệu phục hồi MLD', 'MLD Recovery Therapy');
    final packageCodeDisplay = package.packageCode.trim().isNotEmpty
        ? package.packageCode
        : 'MLD-PKG-';

    // Xác định badge trạng thái
    Color statusBg;
    Color statusTextColor;
    String statusLabel;
    if (package.status == PackageStatus.active) {
      statusBg = const Color(0xFFEFF4FE);
      statusTextColor = AppColors.primary;
      statusLabel = context.tr('Đang điều trị', 'In Treatment');
    } else if (package.status == PackageStatus.completed || package.completedSessions >= package.totalSessions) {
      statusBg = const Color(0xFFF0FDF4);
      statusTextColor = const Color(0xFF16A34A);
      statusLabel = context.tr('Hoàn thành', 'Completed');
    } else {
      statusBg = const Color(0xFFF3F4F6);
      statusTextColor = const Color(0xFF6B7280);
      statusLabel = context.tr('Hết hạn', 'Expired');
    }

    return Container(
      width: double.infinity,
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
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Mã liệu trình & Trạng thái
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
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
                          Text(
                            '#',
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
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

                // 2. Tên liệu trình
                Text(
                  package.packageName.tr(context),
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),

                // 3. Tên dịch vụ & Tên khách hàng
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.spa_rounded, size: 16, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13, color: AppColors.textPrimary),
                                children: [
                                  TextSpan(
                                    text: ' ',
                                    style: const TextStyle(fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                                  ),
                                  TextSpan(
                                    text: serviceDisplayName,
                                    style: const TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.person_outline_rounded, size: 16, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13, color: AppColors.textPrimary),
                                children: [
                                  TextSpan(
                                    text: ' ',
                                    style: const TextStyle(fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                                  ),
                                  TextSpan(
                                    text: customerDisplayName,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 4. Số buổi & Tổng số buổi cần điều trị
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    RichText(
                      text: TextSpan(
                        style: const TextStyle(fontFamily: 'Montserrat', fontSize: 13.5, color: AppColors.textPrimary),
                        children: [
                          TextSpan(
                            text: ' ',
                            style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                          ),
                          TextSpan(
                            text: '',
                            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          TextSpan(
                            text: ' /  ',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '%',
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Thanh tiến trình
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: package.progressPercent,
                    minHeight: 7,
                    backgroundColor: const Color(0xFFEFF4FE),
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                const SizedBox(height: 14),

                // 5. CHIA BUỔI ĐỂ HIỂN THỊ (Session Breakdown)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('Chia buổi điều trị:', 'Session Breakdown:'),
                      style: const TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildSessionsRow(package),
                  ],
                ),

                const SizedBox(height: 12),
                if (package.expiryDate.isNotEmpty)
                  Text(
                    ' ',
                    style: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),

                const SizedBox(height: 14),
                // 6. Nút thao tác
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 42,
                        child: OutlinedButton(
                          onPressed: onTap,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(
                            context.tr('Xem chi tiết các buổi', 'View Session Details'),
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    if (package.remainingSessions > 0) ...[
                      const SizedBox(width: 10),
                      Expanded(
                        child: SizedBox(
                          height: 42,
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
                              context.tr('Đặt buổi tiếp', 'Book Next Session'),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Hiển thị thanh chia các buổi điều trị (Buổi 1, Buổi 2...)
  Widget _buildSessionsRow(UserPackageModel package) {
    final count = package.totalSessions > 0 ? package.totalSessions : 1;
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: count,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (context, index) {
          final sessionNum = index + 1;
          final isDone = sessionNum <= package.completedSessions;
          final isCurrent = sessionNum == package.completedSessions + 1 && package.status == PackageStatus.active;

          Color bgColor;
          Color borderColor;
          Color textColor;
          Widget icon;

          if (isDone) {
            bgColor = const Color(0xFFF0FDF4);
            borderColor = const Color(0xFF86EFAC);
            textColor = const Color(0xFF16A34A);
            icon = const Icon(Icons.check_rounded, size: 14, color: Color(0xFF16A34A));
          } else if (isCurrent) {
            bgColor = const Color(0xFFEFF4FE);
            borderColor = AppColors.primary;
            textColor = AppColors.primary;
            icon = const Icon(Icons.play_arrow_rounded, size: 14, color: AppColors.primary);
          } else {
            bgColor = const Color(0xFFF9FAFB);
            borderColor = AppColors.border;
            textColor = AppColors.textSecondary;
            icon = const Icon(Icons.hourglass_empty_rounded, size: 12, color: AppColors.textSecondary);
          }

          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                icon,
                const SizedBox(width: 4),
                Text(
                  ' ',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 12,
                    fontWeight: isDone || isCurrent ? FontWeight.w700 : FontWeight.w500,
                    color: textColor,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatCol(String val, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            val,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 19,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Montserrat',
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
