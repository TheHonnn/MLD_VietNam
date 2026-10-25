import '../../../../features/booking/presentation/screens/all_in_one_booking_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../l10n/app_localizations.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/treatment_repository.dart';

import 'd02_package_details_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';

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
    TreatmentRepository.instance.fetchPackages().then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final canGoBack = widget.onBack != null || Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. ĐIỀU HƯỚNG / TIÊU ĐỀ (GIỚI THIỆU) ---
              if (canGoBack) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () {
                        if (widget.onBack != null) {
                          widget.onBack!();
                        } else {
                          Navigator.of(context).pop();
                        }
                      },
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
              ],

              Text(
                l10n?.myPackages ?? 'Gói liệu trình của tôi',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  height: 36.4 / 28,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 6),
              Text(
                l10n?.managePackagesSubtitle ?? 'Quản lý các gói chăm sóc sức khỏe và liệu trình đã đăng ký.',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary, // #6B6158
                ),
              ),

              const SizedBox(height: 20),

              // --- 2. THẺ THÔNG TIN KHÁCH HÀNG (350x132, r=20, #F3E2CE) ---
              Builder(
                builder: (context) {
                  final profile = MembershipRepository.instance.profile;
                  final activePackages = _repo.packages.where((p) => p.status == PackageStatus.active).toList();
                  final remainingSessions = activePackages.fold<int>(0, (sum, p) => sum + (p.totalSessions - p.completedSessions));
                  final usedSessions = _repo.packages.fold<int>(0, (sum, p) => sum + p.completedSessions);

                  final displayName = profile.fullName.trim().isNotEmpty ? profile.fullName : 'Khách hàng';
                  final memberTier = profile.memberTier.trim().isNotEmpty ? profile.memberTier : 'Thành viên';

                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSecondary, // #F3E2CE
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border, width: 1.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: const BoxDecoration(
                                color: Colors.white,
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
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary, // #40352F
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    memberTier,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.primary, // #985018
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.workspace_premium_rounded, color: Color(0xFF0284C7), size: 24),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          '${activePackages.length} gói đang dùng   ·   $remainingSessions buổi còn lại   ·   $usedSessions đã dùng',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Hồ sơ chăm sóc & liệu trình',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),

              // --- 3. BỘ LỌC TRẠNG THÁI GÓI (350x44) ---
              Row(
                children: [
                  _buildFilterTab(0, l10n?.activePackages ?? 'Đang sử dụng'),
                  const SizedBox(width: 8),
                  _buildFilterTab(1, l10n?.completedPackages ?? 'Đã hoàn thành'),
                  const SizedBox(width: 8),
                  _buildFilterTab(2, l10n?.expiredPackages ?? 'Hết hạn'),
                ],
              ),

              const SizedBox(height: 20),

              // --- 4. DANH SÁCH GÓI LIỆU TRÌNH ---
              if (_selectedStatusIndex == 0) ...[
                if (_repo.packages.where((p) => p.status == PackageStatus.active).isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.spa_outlined, size: 48, color: AppColors.textSecondary),
                        const SizedBox(height: 12),
                        Text(
                          l10n?.noActivePackages ?? 'Bạn chưa có gói liệu trình nào đang hoạt động',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Đăng ký gói dịch vụ để tận hưởng trải nghiệm chăm sóc định kỳ và tiết kiệm chi phí.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          height: 44,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const AllInOneBookingScreen()),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: Text(l10n?.exploreServicesAndBook ?? 'Khám phá dịch vụ & đặt lịch', style: const TextStyle(fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ..._repo.packages.where((p) => p.status == PackageStatus.active).map(
                    (pkg) => Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
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
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Center(
                      child: Text(
                        'Bạn chưa có gói liệu trình nào đã hoàn thành.',
                        style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                      ),
                    ),
                  )
                else
                  ..._repo.packages.where((p) => p.status == PackageStatus.completed || p.completedSessions >= p.totalSessions).map(
                    (pkg) => Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
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
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Center(
                      child: Text(
                        'Không có gói liệu trình nào hết hạn.',
                        style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                      ),
                    ),
                  )
                else
                  ..._repo.packages.where((p) => p.status == PackageStatus.expired).map(
                    (pkg) => Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
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

              const SizedBox(height: 28),

              // --- 6. KHÁM PHÁ THÊM GÓI CHĂM SÓC ---
              const Text(
                'Khám phá thêm gói chăm sóc',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Một lựa chọn mới cho khoảng thời gian dành riêng cho bạn.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),

              // 2 Thẻ gợi ý
              ..._repo.suggestedPackages.map((sug) => Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: _buildSuggestedCard(sug),
              )),

              const SizedBox(height: 12),

              // --- 7. THẺ THÔNG TIN CUỐI TRANG (#F3E2CE, r=20) ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Đặt buổi chăm sóc tiếp theo',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Chọn gói phù hợp rồi tiếp tục trong phần Đặt lịch hiện có.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
            ],
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: 1.0,
            ),
          ),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              color: isSelected ? Colors.white : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPackageCard({
    required UserPackageModel package,
    required VoidCallback onTap,
  }) {
    final percentText = (package.progressPercent * 100).toStringAsFixed(1).replaceAll('.0', '');

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surface, // #FFFFFF
        borderRadius: BorderRadius.circular(20),
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
          // Ảnh chăm sóc (r=16)
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: Image.asset(
              package.imageUrl,
              height: 144,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 144,
                color: AppColors.surfaceSecondary,
                child: const Icon(Icons.spa, size: 48, color: AppColors.primary),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  package.packageName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary, // #40352F
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  package.branchName,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary, // #6B6158
                  ),
                ),
                const SizedBox(height: 14),

                // PackageProgressBar (318x90)
                Row(
                  children: [
                    _buildStatCol(package.totalSessions.toString(), 'Tổng buổi'),
                    _buildStatCol(package.completedSessions.toString(), 'Đã dùng'),
                    _buildStatCol(package.remainingSessions.toString(), 'Còn lại'),
                  ],
                ),
                const SizedBox(height: 8),

                // Thanh tiến trình (height 6, r=3, #F3E2CE track, #985018 fill)
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: package.progressPercent,
                    minHeight: 6,
                    backgroundColor: AppColors.surfaceSecondary, // #F3E2CE
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary), // #985018
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Đã hoàn thành $percentText% liệu trình',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),

                const SizedBox(height: 12),
                Text(
                  'Hạn sử dụng: ${package.expiryDate}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textPrimary,
                  ),
                ),

                const SizedBox(height: 14),
                // Nút xem chi tiết & Nút đặt lịch buổi tiếp theo trong liệu trình (Mục 22, 23)
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 44,
                        child: OutlinedButton(
                          onPressed: onTap,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary, width: 1.2),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text(
                            'Xem chi tiết',
                            style: TextStyle(
                              fontSize: 14,
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
                          height: 44,
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
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: const Text(
                              'Đặt buổi tiếp',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
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

  Widget _buildStatCol(String val, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            val,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: AppColors.primary, // #985018
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

  Widget _buildSuggestedCard(SuggestedPackageModel sug) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surface, // #FFFFFF
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                child: Image.asset(
                  sug.imageUrl,
                  height: 172,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 172,
                    color: AppColors.surfaceSecondary,
                    child: const Icon(Icons.spa, size: 48, color: AppColors.primary),
                  ),
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _repo.toggleSuggestedFavorite(sug.id);
                    });
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
                      sug.isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: sug.isFavorite ? Colors.red : AppColors.primary,
                      size: 22,
                    ),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sug.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Chuyên viên: ${sug.specialistName}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      sug.priceText,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary, // #985018
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  sug.description,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textPrimary,
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
                          builder: (_) => const AllInOneBookingScreen(),
                        ),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.primary, width: 1.0),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text(
                      'Xem chi tiết',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
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
}
