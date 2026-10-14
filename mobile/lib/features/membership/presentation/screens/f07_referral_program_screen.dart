import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/repositories/mock_membership_repository.dart';

class F07ReferralProgramScreen extends StatefulWidget {
  const F07ReferralProgramScreen({super.key});

  @override
  State<F07ReferralProgramScreen> createState() => _F07ReferralProgramScreenState();
}

class _F07ReferralProgramScreenState extends State<F07ReferralProgramScreen> {
  final MockMembershipRepository _repo = MockMembershipRepository();

  void _copyReferralCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép mã giới thiệu: $code'),
        backgroundColor: const Color(0xFF236B42),
      ),
    );
  }

  void _shareReferral(String code) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đang chia sẻ liên kết giới thiệu với mã: $code'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final history = _repo.referralHistory;
    const String referralCode = 'MINHANH128';

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
                      'Giới thiệu bạn bè',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Chia sẻ trải nghiệm tốt đẹp và nhận thêm quyền lợi.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 2. BANNER GIỚI THIỆU (350x228) ---
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(20),
                              topRight: Radius.circular(20),
                            ),
                            child: Image.asset(
                              'assets/images/gioithieu_1.png',
                              height: 140,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                height: 140,
                                color: AppColors.surfaceSecondary,
                                child: const Center(
                                  child: Icon(Icons.people_alt_rounded, size: 48, color: AppColors.primary),
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Mời bạn cùng trải nghiệm',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textHeading,
                                  ),
                                ),
                                SizedBox(height: 6),
                                Text(
                                  'Chia sẻ ứng dụng với bạn bè để cùng tận hưởng những quyền lợi dành cho hội viên.',
                                  style: TextStyle(
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
                    ),

                    const SizedBox(height: 20),

                    // --- 3. REFERRAL CODE CARD (350x210, r=20, #F3E2CE) ---
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
                          const Text(
                            'Mã giới thiệu của bạn',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            referralCode,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 2.0,
                              color: AppColors.primary, // #985018
                            ),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              Expanded(
                                child: SizedBox(
                                  height: 50,
                                  child: OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      side: const BorderSide(color: AppColors.primary, width: 1.2),
                                      backgroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                    ),
                                    onPressed: () => _copyReferralCode(referralCode),
                                    child: const Text(
                                      'Sao chép mã',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: SizedBox(
                                  height: 50,
                                  child: OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      side: const BorderSide(color: AppColors.primary, width: 1.2),
                                      backgroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                    ),
                                    onPressed: () => _shareReferral(referralCode),
                                    child: const Text(
                                      'Chia sẻ',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Dữ liệu minh họa · Mã không có giá trị giới thiệu thực',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 4. THẺ QUYỀN LỢI GIỚI THIỆU (350x230, r=20, white) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Quyền lợi giới thiệu',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.auto_awesome_rounded, size: 20, color: AppColors.primary),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Người giới thiệu nhận điểm thưởng khi đáp ứng điều kiện.',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.card_giftcard_rounded, size: 20, color: AppColors.primary),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Người được giới thiệu nhận ưu đãi đăng ký lần đầu.',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'Ví dụ: đăng ký lần đầu và hoàn tất dịch vụ đủ điều kiện mới được ghi nhận. Điểm và ưu đãi tùy chương trình; không phải cam kết quyền lợi thực.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              height: 1.4,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // --- 5. KẾT QUẢ GIỚI THIỆU (350x148, r=16, #F3E2CE) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Kết quả giới thiệu',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildStatItem('3', 'Đã giới thiệu'),
                              ),
                              Expanded(
                                child: _buildStatItem('2', 'Đủ điều kiện'),
                              ),
                              Expanded(
                                child: _buildStatItem('200', 'Điểm đã nhận'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Dữ liệu minh họa · 200 điểm đã ghi nhận 03/10/2026',
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

                    // --- 6. LỊCH SỬ GIỚI THIỆU ---
                    const Text(
                      'Lịch sử giới thiệu',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Tên được che một phần để bảo vệ riêng tư',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 14),

                    ...history.map((rec) {
                      final bool isEligible = rec.status == 'ELIGIBLE';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceSecondary,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.person_outline_rounded,
                                    size: 22,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        rec.maskedName,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${rec.date} · ${rec.statusText}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w400,
                                          color: isEligible ? const Color(0xFF236B42) : AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  rec.points,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: isEligible ? const Color(0xFF236B42) : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              rec.recordedDate,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),

                    const SizedBox(height: 12),

                    const Center(
                      child: Text(
                        'Dữ liệu minh họa · 2 lượt đủ điều kiện × 100 điểm = 200 điểm',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // --- 7. HÀNH ĐỘNG CỐ ĐỊNH (Bottom bar, 350x56 button #985018, r=14) ---
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
                  onPressed: () => _shareReferral(referralCode),
                  child: const Text(
                    'Chia sẻ ngay',
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

  Widget _buildStatItem(String val, String label) {
    return Column(
      children: [
        Text(
          val,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
