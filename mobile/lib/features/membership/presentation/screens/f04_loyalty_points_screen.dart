import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';
import 'f05_my_vouchers_screen.dart';

class F04LoyaltyPointsScreen extends StatefulWidget {
  const F04LoyaltyPointsScreen({super.key});

  @override
  State<F04LoyaltyPointsScreen> createState() => _F04LoyaltyPointsScreenState();
}

class _F04LoyaltyPointsScreenState extends State<F04LoyaltyPointsScreen> {
  final MembershipRepository _repo = MembershipRepository.instance;
  String _selectedFilter = 'Tất cả';

  @override
  void initState() {
    super.initState();
    _repo.fetchLoyaltyPoints().then((_) {
      if (mounted) setState(() {});
    });
  }

  void _showRedeemConfirmation(RewardItem rw) {
    final currentPoints = _repo.profile.points;
    if (currentPoints < rw.pointsRequired) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Chưa đủ điểm thưởng', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textHeading)),
          content: Text('Bạn cần ${rw.pointsRequired} điểm để đổi "${rw.title}". Hiện tại bạn đang có $currentPoints điểm.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Đã hiểu', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Xác nhận đổi ưu đãi', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textHeading)),
        content: Text('Bạn có chắc chắn muốn dùng ${rw.pointsRequired} điểm để đổi "${rw.title}" không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _repo.redeemReward(rw);
              if (mounted) {
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Đổi thành công "${rw.title}"! Voucher đã được lưu vào ví ưu đãi.'),
                    backgroundColor: const Color(0xFF236B42),
                    duration: const Duration(seconds: 3),
                    action: SnackBarAction(
                      label: 'Xem ví',
                      textColor: Colors.white,
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const F05MyVouchersScreen()),
                        );
                      },
                    ),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Đổi quà'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = _repo.profile;
    final history = _repo.pointHistory;
    final rewards = _repo.rewards;

    final filteredHistory = history.where((item) {
      if (_selectedFilter == 'Tất cả') return true;
      if (_selectedFilter == 'Tích điểm') return item.type == 'EARN';
      if (_selectedFilter == 'Sử dụng điểm') return item.type == 'REDEEM';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            // Scrollable View
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

                      ],
                    ),

                    const SizedBox(height: 16),

                    const Text(
                      'Điểm tích lũy',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Tích điểm khi sử dụng dịch vụ và nhận những quyền lợi hấp dẫn.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 2. LOYALTY POINTS CARD (350x234, r=20, #F3E2CE) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Điểm hiện có',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${profile.points.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} điểm',
                                    style: const TextStyle(
                                      fontSize: 30,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary, // #985018
                                    ),
                                  ),
                                ],
                              ),
                              const Icon(
                                Icons.auto_awesome_rounded,
                                size: 32,
                                color: AppColors.primary,
                              ),
                            ],
                          ),

                          const SizedBox(height: 18),

                          Builder(
                            builder: (context) {
                              final earnedMonth = history
                                  .where((h) => h.type == 'EARN')
                                  .fold<int>(0, (acc, h) => acc + (int.tryParse(h.points.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0));
                              final usedPoints = history
                                  .where((h) => h.type == 'REDEEM')
                                  .fold<int>(0, (acc, h) => acc + (int.tryParse(h.points.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0));

                              return Row(
                                children: [
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: AppColors.border, width: 0.5),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '+$earnedMonth điểm',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF236B42),
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          const Text(
                                            'Tích trong tháng',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w400,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: AppColors.border, width: 0.5),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '$usedPoints điểm',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          const Text(
                                            'Đã sử dụng',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w400,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),

                          const SizedBox(height: 14),

                          Text(
                            profile.points > 0 ? '${profile.points} điểm đang có hiệu lực' : 'Không có điểm sắp hết hạn',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Lịch sử điểm thưởng',
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

                    // --- 3. TIẾN TỚI HẠNG MỚI (350x178, r=20, white) ---
                    Builder(
                      builder: (context) {
                        final currentPoints = profile.points;
                        const targetPoints = 1000;
                        final needPoints = (targetPoints - currentPoints).clamp(0, targetPoints);
                        final progress = (currentPoints / targetPoints).clamp(0.0, 1.0);

                        return Container(
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
                              const Row(
                                children: [
                                  Icon(Icons.diamond_outlined, size: 22, color: Color(0xFFC58D59)),
                                  SizedBox(width: 8),
                                  Text(
                                    'Hướng tới hạng Bạc',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'Bạn cần thêm $needPoints điểm để đạt hạng Bạc.',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 14),

                              ClipRRect(
                                borderRadius: BorderRadius.circular(3),
                                child: LinearProgressIndicator(
                                  value: progress,
                                  minHeight: 6,
                                  backgroundColor: AppColors.surfaceSecondary,
                                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                                ),
                              ),

                              const SizedBox(height: 10),
                              Text(
                                '$currentPoints / $targetPoints điểm · Tích cực trải nghiệm để nâng cấp hạng thành viên.',
                                style: const TextStyle(
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

                    const SizedBox(height: 24),

                    // --- 4. LỊCH SỬ TÍCH ĐIỂM ---
                    const Text(
                      'Lịch sử tích điểm',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Filter tabs
                    Row(
                      children: [
                        _buildFilterChip('Tất cả'),
                        const SizedBox(width: 8),
                        _buildFilterChip('Tích điểm'),
                        const SizedBox(width: 8),
                        _buildFilterChip('Sử dụng điểm'),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Danh sách giao dịch điểm
                    if (filteredHistory.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: const Center(
                          child: Text(
                            'Bạn chưa có giao dịch tích điểm nào.\nĐiểm thưởng sẽ được tích lũy khi bạn sử dụng dịch vụ tại MLD.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      )
                    else
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: Column(
                          children: filteredHistory.asMap().entries.map((entry) {
                            final int idx = entry.key;
                            final PointsTransaction item = entry.value;
                            final bool isEarn = item.type == 'EARN';
                            final bool isLast = idx == filteredHistory.length - 1;

                            return Column(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceSecondary,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Icon(
                                          isEarn ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded,
                                          size: 20,
                                          color: isEarn ? const Color(0xFF236B42) : AppColors.primary,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.title,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w500,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${item.date} · ${item.branch}',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w400,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        item.points,
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: isEarn ? const Color(0xFF236B42) : AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (!isLast)
                                  const Divider(
                                    height: 1,
                                    thickness: 1,
                                    indent: 16,
                                    endIndent: 16,
                                    color: Color(0xFFF3E2CE),
                                  ),
                              ],
                            );
                          }).toList(),
                        ),
                      ),

                    const SizedBox(height: 24),

                    // --- 5. ĐỔI ĐIỂM NHẬN ƯU ĐÃI ---
                    const Text(
                      'Đổi điểm nhận ưu đãi',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Ví dụ ưu đãi · Điều kiện tùy chương trình',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    ...rewards.map((rw) {
                      final canRedeem = profile.points >= rw.pointsRequired;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => _showRedeemConfirmation(rw),
                            borderRadius: BorderRadius.circular(20),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
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
                                    child: const Icon(
                                      Icons.confirmation_number_outlined,
                                      size: 22,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          rw.title,
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${rw.pointsRequired} điểm',
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          rw.condition,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w400,
                                            height: 1.4,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: () => _showRedeemConfirmation(rw),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: canRedeem ? AppColors.primary : Colors.grey.shade300,
                                      foregroundColor: canRedeem ? Colors.white : Colors.grey.shade600,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      minimumSize: const Size(64, 34),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                    child: const Text('Đổi quà', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }),

                    const SizedBox(height: 12),

                    const Center(
                      child: Text(
                        'Điểm thưởng dùng để đổi voucher và quà tặng chăm sóc',
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
                      MaterialPageRoute(builder: (_) => const F05MyVouchersScreen()),
                    );
                  },
                  child: const Text(
                    'Khám phá ưu đãi',
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

  Widget _buildFilterChip(String label) {
    final bool isSelected = _selectedFilter == label;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = label),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isSelected ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

