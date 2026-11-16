import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/services/auth_service.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';
import 'f05_my_vouchers_screen.dart';

/// Screen F04: Điểm thưởng & Hạng hội viên (Customer Loyalty & Membership Screen)
/// Dành riêng cho Khách hàng: Xem điểm, xem hạng hội viên, lịch sử biến động điểm,
/// đổi điểm lấy voucher và xem đặc quyền hạng.
class F04LoyaltyPointsScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const F04LoyaltyPointsScreen({
    super.key,
    this.onBack,
  });

  @override
  State<F04LoyaltyPointsScreen> createState() => _F04LoyaltyPointsScreenState();
}

class _F04LoyaltyPointsScreenState extends State<F04LoyaltyPointsScreen> with SingleTickerProviderStateMixin {
  final MembershipRepository _repo = MembershipRepository.instance;
  late final TabController _tabController;

  bool _isLoading = true;
  bool _isRedeeming = false;
  List<PointsTransaction> _transactions = [];
  List<TierRuleModel> _tierRules = [];
  late UserProfile _profile;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _profile = _repo.userProfile;
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      await _repo.fetchProfile();
      final txList = await _repo.fetchLoyaltyPoints();
      final rules = await _repo.fetchTierRules();
      if (mounted) {
        setState(() {
          _profile = _repo.userProfile;
          _transactions = txList;
          _tierRules = rules;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _profile = _repo.userProfile;
          _transactions = _repo.pointHistory;
          _isLoading = false;
        });
      }
    }
  }

  String _formatCurrency(double amount) {
    return '${amount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
  }

  String _formatNumber(int val) {
    return val.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  }

  void _handleRedeem(RewardItem reward) {
    if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
      _showToast(context.tr('Vui lòng đăng nhập để đổi điểm thưởng', 'Please login to redeem points'), isError: true);
      return;
    }

    if (_profile.points < reward.pointsRequired) {
      _showToast(
        context.tr(
          'Bạn cần ${_formatNumber(reward.pointsRequired)} điểm nhưng hiện chỉ có ${_formatNumber(_profile.points)} điểm.',
          'You need ${_formatNumber(reward.pointsRequired)} pts but currently have ${_formatNumber(_profile.points)} pts.',
        ),
        isError: true,
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.stars_rounded, color: Color(0xFF007A48), size: 24),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                context.tr('Xác nhận đổi điểm', 'Confirm Redemption'),
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr(
                'Bạn có muốn dùng ${_formatNumber(reward.pointsRequired)} điểm để đổi lấy "${reward.title}" không?',
                'Do you want to use ${_formatNumber(reward.pointsRequired)} points to redeem "${reward.title}"?',
              ),
              style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563), height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    context.tr('Số dư điểm sau đổi:', 'Balance after:'),
                    style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                  ),
                  Text(
                    '${_formatNumber(_profile.points - reward.pointsRequired)} điểm',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF007A48)),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              context.tr('Hủy', 'Cancel'),
              style: const TextStyle(color: Color(0xFF6B7280), fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _executeRedeem(reward);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF007A48),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              context.tr('Xác nhận đổi', 'Confirm'),
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _executeRedeem(RewardItem reward) async {
    setState(() => _isRedeeming = true);
    try {
      final res = await _repo.redeemReward(reward);
      await _loadData();

      if (!mounted) return;
      setState(() => _isRedeeming = false);

      final isSuccess = res['success'] == true;
      if (isSuccess) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            contentPadding: const EdgeInsets.all(24),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_rounded, color: Color(0xFF007A48), size: 36),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('Đổi Voucher thành công!', 'Redeemed Successfully!'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                ),
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'Voucher "${reward.title}" đã được lưu vào Ví Voucher của bạn và có thể sử dụng ngay.',
                    'Voucher "${reward.title}" is now available in your Voucher Wallet.',
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13.5, color: Color(0xFF6B7280), height: 1.4),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFD1D5DB)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          context.tr('Đóng', 'Close'),
                          style: const TextStyle(color: Color(0xFF374151), fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const F05MyVouchersScreen()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF007A48),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          context.tr('Xem Ví Voucher', 'View Wallet'),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      } else {
        _showToast(res['message']?.toString() ?? 'Đổi ưu đãi thất bại', isError: true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isRedeeming = false);
        _showToast('Có lỗi xảy ra: $e', isError: true);
      }
    }
  }

  void _showToast(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppColors.error : const Color(0xFF007A48),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  // Gradient và màu sắc thẻ theo hạng hội viên
  LinearGradient _getTierGradient(String tier) {
    final t = tier.toUpperCase();
    if (t.contains('KIM CƯƠNG') || t.contains('DIAMOND')) {
      return const LinearGradient(
        colors: [Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }
    if (t.contains('BẠCH KIM') || t.contains('PLATINUM')) {
      return const LinearGradient(
        colors: [Color(0xFF37474F), Color(0xFF546E7A), Color(0xFF78909C)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }
    if (t.contains('VÀNG') || t.contains('GOLD')) {
      return const LinearGradient(
        colors: [Color(0xFF6B4701), Color(0xFFB8860B), Color(0xFFD4AF37)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }
    if (t.contains('BẠC') || t.contains('SILVER')) {
      return const LinearGradient(
        colors: [Color(0xFF455A64), Color(0xFF78909C), Color(0xFF90A4AE)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }
    // Hạng Tiêu chuẩn (Standard)
    return const LinearGradient(
      colors: [Color(0xFF004D40), Color(0xFF007A48), Color(0xFF2E7D32)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  IconData _getTierIcon(String tier) {
    final t = tier.toUpperCase();
    if (t.contains('KIM CƯƠNG') || t.contains('DIAMOND')) return Icons.diamond_rounded;
    if (t.contains('BẠCH KIM') || t.contains('PLATINUM')) return Icons.workspace_premium_rounded;
    if (t.contains('VÀNG') || t.contains('GOLD')) return Icons.military_tech_rounded;
    if (t.contains('BẠC') || t.contains('SILVER')) return Icons.shield_rounded;
    return Icons.verified_user_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final memberTierName = _profile.memberTier;
    final pointsBalance = _profile.points;
    final totalSpent = _profile.totalSpent;
    final equivalentValue = (pointsBalance * 100).toDouble();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF1F2937)),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Text(
          context.tr('Điểm thưởng & Hạng hội viên', 'Loyalty Points & Tier'),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1F2937),
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF007A48)))
          : Column(
              children: [
                // 1. VIP MEMBERSHIP CARD
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: _getTierGradient(memberTierName),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Hàng đầu: Logo MLD & Huy hiệu Hạng
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Center(
                                    child: Icon(Icons.spa_rounded, color: Colors.white, size: 16),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'MLD VIỆT NAM',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.22),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(_getTierIcon(memberTierName), size: 14, color: Colors.white),
                                  const SizedBox(width: 4),
                                  Text(
                                    memberTierName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 10),

                        // Tên hội viên & Số điện thoại / mã thẻ
                        Text(
                          _profile.fullName.isNotEmpty ? _profile.fullName : 'Hội viên MLD',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _profile.phone.isNotEmpty ? _profile.phone : _profile.memberCode,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            letterSpacing: 0.5,
                          ),
                        ),

                        const SizedBox(height: 8),
                        Divider(color: Colors.white.withValues(alpha: 0.2), height: 1),
                        const SizedBox(height: 8),

                        // Điểm thưởng & Giá trị quy đổi
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  context.tr('ĐIỂM THƯỞNG KHẢ DỤNG', 'AVAILABLE REWARD POINTS'),
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.8),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    Text(
                                      _formatNumber(pointsBalance),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Text(
                                      'điểm',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                if (equivalentValue > 0) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    '~ ${_formatCurrency(equivalentValue)} giá trị quy đổi',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.85),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (totalSpent > 0)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    context.tr('TỔNG CHI TIÊU', 'TOTAL SPENT'),
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.8),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _formatCurrency(totalSpent),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                Container(
                  color: Colors.white,
                  child: TabBar(
                    controller: _tabController,
                    labelColor: const Color(0xFF007A48),
                    unselectedLabelColor: const Color(0xFF6B7280),
                    indicatorColor: const Color(0xFF007A48),
                    indicatorWeight: 3,
                    labelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    unselectedLabelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                    tabs: [
                      Tab(text: context.tr('Lịch sử điểm', 'Points History')),
                      Tab(text: context.tr('Đổi Voucher', 'Redeem Voucher')),
                      Tab(text: context.tr('Đặc quyền hạng', 'Tier Perks')),
                    ],
                  ),
                ),

                // 3. TAB VIEWS
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildHistoryTab(),
                      _buildRedeemTab(),
                      _buildPerksTab(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  // ==========================================
  // TAB 1: LỊCH SỬ BIẾN ĐỘNG ĐIỂM
  // ==========================================
  Widget _buildHistoryTab() {
    if (_transactions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  color: Color(0xFFE8F5E9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.history_rounded, size: 30, color: Color(0xFF007A48)),
              ),
              const SizedBox(height: 14),
              Text(
                context.tr('Chưa có lịch sử điểm', 'No points history yet'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 6),
              Text(
                context.tr(
                  'Mọi giao dịch tích điểm trị liệu, đánh giá dịch vụ hoặc đổi quà sẽ hiển thị chi tiết tại đây.',
                  'Your points earned from treatments, reviews, and rewards will appear here.',
                ),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.4),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: const Color(0xFF007A48),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: _transactions.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (ctx, idx) {
          final tx = _transactions[idx];
          final isEarn = tx.type == 'EARN' || tx.points.startsWith('+');

          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                // Icon loại biến động
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isEarn ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      isEarn ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded,
                      color: isEarn ? const Color(0xFF007A48) : const Color(0xFFE65100),
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Tiêu đề & ngày
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tx.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1F2937),
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.calendar_today_rounded, size: 12, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Text(
                            tx.date,
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '•',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              tx.branch,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 10),

                // Điểm biến động (+ / -)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isEarn ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isEarn
                          ? const Color(0xFF208C58).withValues(alpha: 0.3)
                          : const Color(0xFFE65100).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    '${tx.points} đ',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isEarn ? const Color(0xFF007A48) : const Color(0xFFE65100),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ==========================================
  // TAB 2: ĐỔI ĐIỂM LẤY VOUCHER
  // ==========================================
  Widget _buildRedeemTab() {
    final rewards = _repo.rewards;

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: rewards.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, idx) {
        final r = rewards[idx];
        final canRedeem = _profile.points >= r.pointsRequired;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF208C58).withValues(alpha: 0.3)),
                    ),
                    child: const Center(
                      child: Icon(Icons.confirmation_number_rounded, color: Color(0xFF007A48), size: 24),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.title,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.stars_rounded, size: 14, color: Color(0xFF007A48)),
                            const SizedBox(width: 4),
                            Text(
                              '${_formatNumber(r.pointsRequired)} điểm thưởng',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF007A48),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                r.condition,
                style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280), height: 1.35),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 38,
                child: ElevatedButton(
                  onPressed: _isRedeeming ? null : () => _handleRedeem(r),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: canRedeem ? const Color(0xFF007A48) : Colors.grey.shade300,
                    foregroundColor: canRedeem ? Colors.white : Colors.grey.shade600,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    canRedeem
                        ? context.tr('Đổi ngay', 'Redeem Now')
                        : context.tr(
                            'Thiếu ${_formatNumber(r.pointsRequired - _profile.points)} điểm',
                            'Need ${_formatNumber(r.pointsRequired - _profile.points)} more pts',
                          ),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ==========================================
  // TAB 3: ĐẶC QUYỀN HẠNG & CÁCH TÍCH ĐIỂM
  // ==========================================
  Widget _buildPerksTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. CÁCH TÍCH ĐIỂM THƯỞNG
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.lightbulb_outline_rounded, color: Color(0xFF007A48), size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Làm sao để tích lũy điểm thưởng?',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildHowToEarnRow(
                  icon: Icons.rate_review_rounded,
                  iconColor: const Color(0xFFE65100),
                  title: 'Đánh giá chất lượng dịch vụ',
                  points: '+50 điểm',
                  desc: 'Mỗi buổi trị liệu hoàn thành khi đánh giá và nhận xét chân thực sẽ nhận ngay 50 điểm.',
                ),
                const Divider(height: 20, color: Color(0xFFF3F4F6)),
                _buildHowToEarnRow(
                  icon: Icons.group_add_rounded,
                  iconColor: const Color(0xFF1976D2),
                  title: 'Giới thiệu bạn bè & người thân',
                  points: '+100 điểm',
                  desc: 'Chia sẻ mã giới thiệu cá nhân, nhận ngay 100 điểm khi bạn bè hoàn tất buổi trị liệu đầu tiên.',
                ),
                const Divider(height: 20, color: Color(0xFFF3F4F6)),
                _buildHowToEarnRow(
                  icon: Icons.payments_rounded,
                  iconColor: const Color(0xFF007A48),
                  title: 'Chi tiêu hóa đơn dịch vụ',
                  points: '1% — 5%',
                  desc: '10.000đ chi tiêu = 1 điểm cơ sở x hệ số theo hạng hội viên (lên đến 5% hoàn điểm).',
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2. BẢNG ĐẶC QUYỀN HẠNG HỘI VIÊN (TỪ membership_tier_rules)
          const Text(
            'BẢNG ĐẶC QUYỀN HẠNG HỘI VIÊN',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF6B7280),
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 8),

          ..._tierRules.map((rule) {
            final isCurrent = rule.displayName.toLowerCase().contains(_profile.memberTier.toLowerCase()) ||
                _profile.memberTier.toLowerCase().contains(rule.displayName.toLowerCase());

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isCurrent ? const Color(0xFF007A48) : const Color(0xFFE5E7EB),
                  width: isCurrent ? 2 : 1,
                ),
                boxShadow: isCurrent
                    ? [
                        BoxShadow(
                          color: const Color(0xFF007A48).withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(_getTierIcon(rule.displayName), size: 18, color: const Color(0xFF007A48)),
                          const SizedBox(width: 8),
                          Text(
                            rule.displayName,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                        ],
                      ),
                      if (isCurrent)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF208C58).withValues(alpha: 0.4)),
                          ),
                          child: const Text(
                            'Hạng hiện tại',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF007A48),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Chi tiêu tích lũy từ: ${_formatCurrency(rule.minSpent)}',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF4B5563)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    rule.description,
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280), height: 1.35),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _buildPerkChip('Hoàn điểm: ${rule.pointEarningRate}%'),
                      if (rule.discountPercent > 0)
                        _buildPerkChip('Giảm dịch vụ: ${rule.discountPercent.toInt()}%'),
                      if (rule.freeHeadSpaCount > 0)
                        _buildPerkChip('Tặng ${rule.freeHeadSpaCount} buổi Head Spa'),
                      if (rule.priorityBooking)
                        _buildPerkChip('Ưu tiên xếp lịch trị liệu'),
                    ],
                  ),
                ],
              ),
            );
          }),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildHowToEarnRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String points,
    required String desc,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(child: Icon(icon, color: iconColor, size: 20)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                  ),
                  Text(
                    points,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF007A48)),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                desc,
                style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPerkChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
      ),
    );
  }
}
