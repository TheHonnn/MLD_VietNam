import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/services/auth_service.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';

/// Screen F05: Ví Voucher & Ưu đãi cá nhân
/// Chuẩn Design System (#00693F và Gold), lấy 100% dữ liệu từ Supabase (user_vouchers + coupons)
class F05MyVouchersScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const F05MyVouchersScreen({
    super.key,
    this.onBack,
  });

  @override
  State<F05MyVouchersScreen> createState() => _F05MyVouchersScreenState();
}

class _F05MyVouchersScreenState extends State<F05MyVouchersScreen> {
  final MembershipRepository _repo = MembershipRepository.instance;
  final TextEditingController _codeController = TextEditingController();

  bool _isLoading = true;
  bool _isClaiming = false;
  int _selectedTabIndex = 0; // 0: Tất cả, 1: Khả dụng, 2: Đã dùng / Hết hạn
  List<VoucherItem> _allVouchers = [];

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _loadVouchers() async {
    setState(() => _isLoading = true);
    try {
      final list = await _repo.fetchVouchers();
      if (mounted) {
        setState(() {
          _allVouchers = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _allVouchers = _repo.vouchers;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleClaimCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      _showToast(context.tr('Vui lòng nhập mã voucher', 'Please enter a voucher code'), isError: true);
      return;
    }

    if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
      _showToast(context.tr('Vui lòng đăng nhập để lưu voucher vào ví', 'Please log in to save voucher'), isError: true);
      return;
    }

    setState(() => _isClaiming = true);
    FocusScope.of(context).unfocus();

    final result = await _repo.claimVoucherByCode(code);

    if (mounted) {
      setState(() => _isClaiming = false);
      final isSuccess = result['success'] == true;
      _showToast(result['message']?.toString() ?? '', isError: !isSuccess);
      if (isSuccess) {
        _codeController.clear();
        _loadVouchers();
      }
    }
  }

  void _copyToClipboard(String code) {
    Clipboard.setData(ClipboardData(text: code));
    _showToast(
      context.tr('Đã sao chép mã "$code" vào bộ nhớ tạm!', 'Copied code "$code" to clipboard!'),
      isError: false,
    );
  }

  void _handleUseVoucher(VoucherItem item) {
    // Chuyển sang màn Đặt lịch All-in-One hoặc Danh mục dịch vụ
    Navigator.push(
      context,
      AppPageTransitions.modalSlideUp(
        page: const AllInOneBookingScreen(),
      ),
    );
  }

  void _showToast(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: isError ? AppColors.error : AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  List<VoucherItem> get _filteredVouchers {
    if (_selectedTabIndex == 1) {
      return _allVouchers.where((v) => v.status == 'AVAILABLE').toList();
    } else if (_selectedTabIndex == 2) {
      return _allVouchers.where((v) => v.status != 'AVAILABLE').toList();
    }
    return _allVouchers;
  }

  int get _availableCount => _allVouchers.where((v) => v.status == 'AVAILABLE').length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
          onPressed: widget.onBack ?? () => Navigator.pop(context),
        ),
        title: Text(
          context.tr('Ví Voucher & Ưu đãi', 'My Vouchers & Offers'),
          style: const TextStyle(
            fontSize: 19,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // ==========================================
            // 1. HEADER TỔNG QUAN VÍ VOUCHER
            // ==========================================
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF005834), Color(0xFF007A48)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF005834).withValues(alpha: 0.25),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('Ví Voucher Khách hàng', 'Customer Voucher Wallet'),
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFFD1E7DD),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '$_availableCount voucher khả dụng',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFD700).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFFFD700).withValues(alpha: 0.5)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.stars_rounded, color: Color(0xFFFFD700), size: 14),
                        SizedBox(width: 4),
                        Text(
                          'MLD VIP',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFFFD700)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ==========================================
            // 2. Ô NHẬP MÃ VOUCHER THỦ CÔNG
            // ==========================================
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 12),
                    const Icon(Icons.confirmation_number_outlined, color: AppColors.accent, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _codeController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: context.tr('Nhập mã voucher (VD: MLDCHAOXIN)', 'Enter voucher code'),
                          hintStyle: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                        onSubmitted: (_) => _handleClaimCode(),
                      ),
                    ),
                    ElevatedButton(
                      onPressed: _isClaiming ? null : _handleClaimCode,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                      ),
                      child: _isClaiming
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              context.tr('Áp dụng', 'Apply'),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                    ),
                  ],
                ),
              ),
            ),

            // ==========================================
            // 3. TAB CHỌN BỘ LỌC
            // ==========================================
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  _buildTabChip(0, 'Tất cả (${_allVouchers.length})'),
                  const SizedBox(width: 8),
                  _buildTabChip(1, 'Khả dụng ($_availableCount)'),
                  const SizedBox(width: 8),
                  _buildTabChip(2, 'Đã dùng / Hết hạn'),
                ],
              ),
            ),

            // ==========================================
            // 4. DANH SÁCH VOUCHER
            // ==========================================
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _filteredVouchers.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _loadVouchers,
                          color: AppColors.primary,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            itemCount: _filteredVouchers.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final item = _filteredVouchers[index];
                              return _buildVoucherCard(item);
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabChip(int index, String label) {
    final isSelected = _selectedTabIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedTabIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isSelected ? 0.1 : 0.03),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildVoucherCard(VoucherItem item) {
    final isAvailable = item.status == 'AVAILABLE';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Khối trái: Giảm giá & Icon
              Container(
                width: 104,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isAvailable
                        ? [const Color(0xFF00693F), const Color(0xFF008751)]
                        : [const Color(0xFF94A3B8), const Color(0xFF64748B)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.confirmation_number_rounded, color: Colors.white, size: 28),
                    const SizedBox(height: 6),
                    Text(
                      item.discountBanner,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.subtitle.isNotEmpty ? item.subtitle : 'MLD SPA',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),

              // Khối phải: Chi tiết mã & Nút hành động
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: isAvailable ? AppColors.textPrimary : const Color(0xFF64748B),
                                height: 1.25,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isAvailable
                                  ? const Color(0xFFE8F5E9)
                                  : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.statusText,
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: isAvailable
                                    ? const Color(0xFF2E7D32)
                                    : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppColors.textSecondary,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Mã code & Hạn dùng
                      Row(
                        children: [
                          InkWell(
                            onTap: () => _copyToClipboard(item.code),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    item.code,
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.primary,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.copy_rounded, size: 12, color: AppColors.primary),
                                ],
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            'HSD: ${item.expiryDate}',
                            style: const TextStyle(
                              fontSize: 10.5,
                              color: Color(0xFF94A3B8),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // Nút hành động
                      if (isAvailable)
                        SizedBox(
                          width: double.infinity,
                          height: 32,
                          child: ElevatedButton(
                            onPressed: () => _handleUseVoucher(item),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.accent,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: EdgeInsets.zero,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.calendar_month_outlined, size: 13, color: Colors.white),
                                const SizedBox(width: 4),
                                Text(
                                  context.tr('Dùng ngay khi đặt lịch', 'Use Now'),
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.confirmation_number_outlined, size: 36, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 16),
            Text(
              context.tr('Chưa có voucher trong mục này', 'No vouchers found'),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              context.tr('Các mã giảm giá và quà tặng tri ân sẽ được lưu tại đây.', 'Discount vouchers and reward gifts will appear here.'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
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
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
              child: Text(
                context.tr('Khám phá dịch vụ trị liệu', 'Explore Services'),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
