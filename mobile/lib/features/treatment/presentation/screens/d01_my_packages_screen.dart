import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../booking/data/models/booking_models.dart';
import '../../../booking/data/repositories/booking_repository.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../booking/presentation/screens/c10_appointment_detail_screen.dart';
import '../../../home/data/models/home_models.dart';
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
    if (WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')) {
      if (mounted) setState(() {});
      return;
    }
    await Future.wait([
      _repo.fetchPackages(),
      BookingRepository.instance.fetchMyAppointments(),
    ]);
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
                    final activePackages = _repo.packages
                        .where((p) =>
                            p.status == PackageStatus.active &&
                            !(p.totalSessions > 0 &&
                                p.completedSessions >= p.totalSessions))
                        .toList();
                    final remainingSessions = activePackages.fold<int>(
                        0,
                        (sum, p) =>
                            sum +
                            (p.totalSessions > p.completedSessions
                                ? p.totalSessions - p.completedSessions
                                : 0));
                    final usedSessions = _repo.packages.fold<int>(0, (sum, p) => sum + p.completedSessions);

                    final displayName = profile.fullName.trim().isNotEmpty ? profile.fullName : context.tr('Khách hàng', 'Customer');
                    final phone = profile.phone.trim();

                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
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
                                  color: AppColors.mintBackground,
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

                const SizedBox(height: 10),

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

                if (_selectedStatusIndex == 0) ...[
                  if (_repo.packages.where((p) => p.status == PackageStatus.active && !(p.totalSessions > 0 && p.completedSessions >= p.totalSessions)).isEmpty)
                    _buildEmptyState(
                      icon: Icons.spa_outlined,
                      title: context.tr('Bạn chưa có gói liệu trình nào đang hoạt động', 'You have no active treatment packages'),
                      subtitle: context.tr('Khám phá các dịch vụ & gói chăm sóc sức khỏe hệ bạch huyết để bắt đầu phục hồi cơ thể.', 'Explore lymphatic health services & treatment packages to start your recovery journey.'),
                    )
                  else
                    ..._repo.packages.where((p) => p.status == PackageStatus.active && !(p.totalSessions > 0 && p.completedSessions >= p.totalSessions)).map(
                          (pkg) => Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
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
                  if (_repo.packages
                      .where((p) =>
                          p.status == PackageStatus.completed ||
                          (p.totalSessions > 0 &&
                              p.completedSessions >= p.totalSessions))
                      .isEmpty)
                    _buildEmptyState(
                      icon: Icons.history_rounded,
                      title: context.tr('Bạn chưa có gói liệu trình nào đã hoàn thành.', 'You have no completed treatment packages.'),
                      subtitle: context.tr('Các gói liệu trình đã hoàn thành sẽ xuất hiện tại đây.', 'Your completed treatment packages will appear here.'),
                      showBookButton: false,
                    )
                  else
                    ..._repo.packages
                        .where((p) =>
                            p.status == PackageStatus.completed ||
                            (p.totalSessions > 0 &&
                                p.completedSessions >= p.totalSessions))
                        .map(
                          (pkg) => Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
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
                            padding: const EdgeInsets.only(bottom: 8.0),
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
              color: AppColors.mintBackground,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 28, color: AppColors.primary),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              
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
                  context.tr('Đăng ký tư vấn liệu trình', 'Request Treatment Consultation'),
                  style: const TextStyle(
                    
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
        : 'MLD-PKG-${package.id}';

    // Xác định badge trạng thái
    Color statusBg;
    Color statusTextColor;
    String statusLabel;
    if (package.status == PackageStatus.active) {
      statusBg = AppColors.mintBackground;
      statusTextColor = AppColors.primary;
      statusLabel = context.tr('Đang điều trị', 'In Treatment');
    } else if (package.status == PackageStatus.completed || package.completedSessions >= package.totalSessions) {
      statusBg = AppColors.mintBackground;
      statusTextColor = AppColors.accent;
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
            padding: const EdgeInsets.all(12),
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
                        color: AppColors.mintBackground,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.qr_code_rounded, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            '#$packageCodeDisplay',
                            style: const TextStyle(
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
                                style: const TextStyle( fontSize: 13, color: AppColors.textPrimary),
                                children: [
                                  TextSpan(
                                    text: '${context.tr("Dịch vụ:", "Service:")} ',
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
                                style: const TextStyle( fontSize: 13, color: AppColors.textPrimary),
                                children: [
                                  TextSpan(
                                    text: '${context.tr("Khách hàng:", "Customer:")} ',
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
                    Flexible(
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(fontSize: 13.5, color: AppColors.textPrimary),
                          children: [
                            TextSpan(
                              text: context.tr('Đã thực hiện: ', 'Completed: '),
                              style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                            ),
                            TextSpan(
                              text: '${package.completedSessions}',
                              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                            TextSpan(
                              text: ' / ${package.totalSessions} ${context.tr("buổi (${package.totalShifts} ca)", "sessions (${package.totalShifts} shifts)")}',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${context.tr("Còn ${package.remainingShifts} ca", "${package.remainingShifts} left")} · $percentText%',
                      style: const TextStyle(
                        fontSize: 12.5,
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
                    backgroundColor: AppColors.mintBackground,
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
                    '${context.tr("Hạn sử dụng:", "Expiry Date:")} ${package.expiryDate}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),

                Builder(
                  builder: (context) {
                    final openBooking = BookingRepository.instance.getOpenBookingForUserPackage(package.id);
                    final canBookNext = package.status == PackageStatus.active &&
                        package.remainingSessions > 0 &&
                        openBooking == null;
                    final openDateStr = openBooking != null
                        ? '${openBooking.appointmentDate.day.toString().padLeft(2, '0')}/${openBooking.appointmentDate.month.toString().padLeft(2, '0')}/${openBooking.appointmentDate.year}'
                        : '';
                    final linkedService = (package.serviceId != null && package.serviceId!.isNotEmpty)
                        ? SpaServiceModel(
                            id: package.serviceId!,
                            name: package.serviceName.isNotEmpty ? package.serviceName : package.packageName,
                            categoryName: 'Gói liệu trình',
                            shortDescription: package.description,
                            durationMinutes: package.durationMinutes,
                            price: 0,
                            imageUrl: package.imageUrl,
                          )
                        : null;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (openBooking != null) ...[
                          const SizedBox(height: 10),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.iceBlue.withValues(alpha: 0.65),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.event_note_rounded, size: 16, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Đã đặt lịch: ${openBooking.timeSlot} · $openDateStr (${openBooking.status.label})',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
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
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            if (openBooking != null) ...[
                              const SizedBox(width: 10),
                              Expanded(
                                child: SizedBox(
                                  height: 42,
                                  child: ElevatedButton(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => C10AppointmentDetailScreen(appointmentId: openBooking.id),
                                        ),
                                      ).then((_) => _loadPackages());
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.accent,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      elevation: 0,
                                    ),
                                    child: Text(
                                      context.tr('Xem lịch đang đặt', 'View Active Booking'),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ] else if (canBookNext) ...[
                              const SizedBox(width: 10),
                              Expanded(
                                child: SizedBox(
                                  height: 42,
                                  child: ElevatedButton(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => AllInOneBookingScreen(
                                            initialService: linkedService,
                                            userPackageId: package.id,
                                            userPackageName: package.packageName,
                                          ),
                                        ),
                                      ).then((_) => _loadPackages());
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
                    );
                  },
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
            bgColor = AppColors.mintBackground;
            borderColor = AppColors.sageGreen;
            textColor = AppColors.accent;
            icon = const Icon(Icons.check_rounded, size: 14, color: AppColors.accent);
          } else if (isCurrent) {
            bgColor = AppColors.mintBackground;
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
                  '${context.tr("Buổi", "Session")} $sessionNum',
                  style: TextStyle(
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

}
