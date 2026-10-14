import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../data/models/treatment_models.dart';
import '../../data/repositories/mock_treatment_repository.dart';
import 'd02_package_details_screen.dart';
import 'd04_pre_service_consultation_screen.dart';

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
  final MockTreatmentRepository _repo = MockTreatmentRepository();
  int _selectedStatusIndex = 0; // 0: Đang sử dụng, 1: Đã hoàn thành, 2: Hết hạn

  @override
  Widget build(BuildContext context) {
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
                      'CHĂM SÓC · MINH HỌA',
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

              const Text(
                'Gói liệu trình của tôi',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  height: 36.4 / 28,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Quản lý các gói chăm sóc sức khỏe và liệu trình đã đăng ký.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary, // #6B6158
                ),
              ),

              const SizedBox(height: 20),

              // --- 2. THẺ THÔNG TIN KHÁCH HÀNG (350x132, r=20, #F3E2CE) ---
              Container(
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
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Nguyễn Minh Anh',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary, // #40352F
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Hội viên Vàng · Ví dụ',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.primary, // #985018
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.workspace_premium_rounded, color: Color(0xFFC58D59), size: 24),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '2 gói đang dùng   ·   11 buổi còn lại   ·   7 đã dùng',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Hồ sơ và liệu trình minh họa',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // --- 3. BỘ LỌC TRẠNG THÁI GÓI (350x44) ---
              Row(
                children: [
                  _buildFilterTab(0, 'Đang sử dụng'),
                  const SizedBox(width: 8),
                  _buildFilterTab(1, 'Đã hoàn thành'),
                  const SizedBox(width: 8),
                  _buildFilterTab(2, 'Hết hạn'),
                ],
              ),

              const SizedBox(height: 20),

              // --- 4. DANH SÁCH GÓI LIỆU TRÌNH ---
              if (_selectedStatusIndex == 0) ...[
                _buildPackageCard(
                  package: _repo.packages[0],
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => D02PackageDetailsScreen(package: _repo.packages[0]),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),
                _buildPackageCard(
                  package: _repo.packages[1],
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => D02PackageDetailsScreen(package: _repo.packages[1]),
                      ),
                    );
                  },
                ),
              ] else if (_selectedStatusIndex == 1) ...[
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
                ),
              ] else ...[
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
                ),
              ],

              const SizedBox(height: 24),

              // --- 5. BUỔI CHĂM SÓC SẮP TỚI (350x248, r=16, #F3E2CE) ---
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
                      const Text(
                        'Buổi 05 · Lịch hẹn sắp tới',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textHeading, // #693B20
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Massage thư giãn toàn thân',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary, // #40352F
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '15/10/2026 · 09:00–10:00',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Chi nhánh mẫu 01 — Quận 3 · Dữ liệu minh họa',
                        style: TextStyle(
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
                          'Lịch hẹn minh họa',
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
                                builder: (_) => const C01ServiceSelectionScreen(),
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
                              color: AppColors.primary, // #985018
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
                // Nút Xem chi tiết (r=14)
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton(
                    onPressed: onTap,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.primary, width: 1.0),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text(
                      'Xem chi tiết',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary, // #985018
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
                          builder: (_) => const C01ServiceSelectionScreen(),
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
