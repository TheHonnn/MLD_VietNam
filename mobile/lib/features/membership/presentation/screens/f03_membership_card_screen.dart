import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/repositories/mock_membership_repository.dart';
import 'f04_loyalty_points_screen.dart';

class F03MembershipCardScreen extends StatelessWidget {
  const F03MembershipCardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = MockMembershipRepository();
    final profile = repo.profile;
    final perks = repo.perks;
    final tiers = repo.tiers;

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- 1. HEADER & BACK BUTTON ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: () => Navigator.pop(context),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border, width: 1.0),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.arrow_back_rounded,
                                size: 20,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ),
                        const Text(
                          'Dữ liệu minh họa',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    const Text(
                      'Thẻ hội viên',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Đặc quyền dành riêng cho hội viên của chúng tôi.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 2. DIGITAL MEMBERSHIP CARD (350x307, r=20) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          stops: [0.0, 0.55, 1.0],
                          colors: [
                            Color(0xFF7E4213),
                            Color(0xFF985018),
                            Color(0xFF693B20),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF693B20).withValues(alpha: 0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Hàng Logo & Vương miện
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                width: 120,
                                height: 56,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10.4),
                                  border: Border.all(color: const Color(0xFFC58D59), width: 1.0),
                                ),
                                child: Image.asset(
                                  'assets/images/logo_mld.png',
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Center(
                                    child: Text(
                                      'MLD Vietnam',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const Icon(
                                Icons.workspace_premium_rounded,
                                size: 36,
                                color: Color(0xFFC58D59),
                              ),
                            ],
                          ),

                          const SizedBox(height: 20),

                          Text(
                            profile.memberTier.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
                              color: Color(0xFFC58D59),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            profile.fullName.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: Colors.white,
                            ),
                          ),

                          const SizedBox(height: 14),

                          Container(
                            height: 1,
                            color: const Color(0xFFC58D59).withValues(alpha: 0.5),
                          ),

                          const SizedBox(height: 14),

                          Text(
                            'MÃ HỘI VIÊN: ${profile.memberCode}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              letterSpacing: 1.0,
                              color: Colors.white,
                            ),
                          ),

                          const SizedBox(height: 6),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${profile.points.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} điểm',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFFC58D59),
                                ),
                              ),
                              Text(
                                'Đến ${profile.validUntil}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w400,
                                  color: Colors.white.withValues(alpha: 0.9),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          Align(
                            alignment: Alignment.centerRight,
                            child: Text(
                              'Dữ liệu minh họa · Thẻ không có giá trị sử dụng',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w400,
                                color: Colors.white.withValues(alpha: 0.7),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 3. XÁC NHẬN HỘI VIÊN (Mã QR Check-in) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        children: [
                          Container(
                            width: 140,
                            height: 140,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border, width: 1.0),
                            ),
                            child: const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.qr_code_2_rounded, size: 76, color: AppColors.primary),
                                  SizedBox(height: 4),
                                  Text(
                                    'MINH HỌA',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Quét mã để xác nhận hội viên tại trung tâm',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Dữ liệu minh họa · Mã không thể quét, không chứa dữ liệu định danh.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 4. ĐẶC QUYỀN HỘI VIÊN ---
                    const Text(
                      'Đặc quyền hội viên',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Quyền lợi ví dụ · Có thể cấu hình theo chương trình',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    ...perks.map((perk) {
                      IconData perkIcon = Icons.stars_rounded;
                      if (perk.icon == 'badge-percent') perkIcon = Icons.discount_outlined;
                      if (perk.icon == 'sparkles') perkIcon = Icons.auto_awesome_rounded;
                      if (perk.icon == 'gift') perkIcon = Icons.card_giftcard_rounded;
                      if (perk.icon == 'crown') perkIcon = Icons.workspace_premium_rounded;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: AppColors.surfaceSecondary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(perkIcon, size: 22, color: AppColors.primary),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    perk.title,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    perk.description,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
                                      height: 1.45,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),

                    const SizedBox(height: 16),

                    // --- 5. HÀNH TRÌNH HỘI VIÊN (TIERS: 350x170, r=20, #F3E2CE) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Hành trình hội viên',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: tiers.map((tier) {
                              final bool isSelected = tier.isCurrent;
                              return Expanded(
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isSelected ? AppColors.primary : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isSelected ? AppColors.primary : AppColors.border,
                                      width: 1.0,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        tier.name,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                          color: isSelected ? Colors.white : AppColors.textSecondary,
                                        ),
                                      ),
                                      if (isSelected) ...[
                                        const SizedBox(height: 2),
                                        const Icon(
                                          Icons.check_rounded,
                                          size: 14,
                                          color: Colors.white,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Hạng hiện tại: Vàng. Mốc và quyền lợi hạng là dữ liệu minh họa.',
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
                  ],
                ),
              ),
            ),

            // --- 6. HÀNH ĐỘNG CỐ ĐỊNH (Bottom bar, 350x56 button #985018, r=14) ---
            Container(
              padding: const EdgeInsets.all(16),
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
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary, // #985018
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F04LoyaltyPointsScreen()),
                    );
                  },
                  child: const Text(
                    'Xem điểm tích lũy',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
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
}

