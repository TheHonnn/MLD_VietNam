import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/admin_action_card.dart';

class AdminDashboardScreen extends StatefulWidget {
  final Function(int tabIndex, {String? subTab})? onNavigateTab;
  final VoidCallback? onOpenQrScanner;

  const AdminDashboardScreen({
    super.key,
    this.onNavigateTab,
    this.onOpenQrScanner,
  });

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final AdminRepository _repository = AdminRepository.instance;

  bool _isLoading = true;
  String _selectedBranchId = 'ALL';
  List<AdminBranchModel> _branches = [];
  AdminKpiMetrics _metrics = AdminKpiMetrics.empty();
  List<AdminActionItem> _actionItems = [];
  String? _processingItemId;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    final branches = await _repository.fetchBranches();
    if (mounted) {
      setState(() => _branches = branches);
    }
    await _fetchData();
  }

  Future<void> _fetchData() async {
    final metrics = await _repository.fetchDashboardMetrics(
      branchId: _selectedBranchId == 'ALL' ? null : _selectedBranchId,
    );
    final actions = await _repository.fetchPendingActionItems(
      branchId: _selectedBranchId == 'ALL' ? null : _selectedBranchId,
    );

    if (mounted) {
      setState(() {
        _metrics = metrics;
        _actionItems = actions;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleAction(AdminActionItem item) async {
    setState(() => _processingItemId = item.id);

    try {
      if (item.type == AdminActionType.pendingBooking) {
        final success = await _repository.approveBooking(item.rawId);
        if (mounted) {
          if (success) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Đã duyệt xác nhận lịch hẹn thành công!'),
                backgroundColor: AppColors.success,
                behavior: SnackBarBehavior.floating,
              ),
            );
            await _fetchData();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Không thể duyệt lịch hẹn. Vui lòng thử lại.'),
                backgroundColor: AppColors.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        }
      } else if (item.type == AdminActionType.waitingBatch) {
        // Chuyển sang Tab 2 (Tuyển sinh & Học viện) ở phân hệ Chờ xếp lớp
        widget.onNavigateTab?.call(2, subTab: 'PAID_WAITING_CLASS');
      } else if (item.type == AdminActionType.newQuizSubmission) {
        // Chuyển sang Tab 2 ở phân hệ Bài thi
        widget.onNavigateTab?.call(2, subTab: 'QUIZZES');
      }
    } finally {
      if (mounted) {
        setState(() => _processingItemId = null);
      }
    }
  }

  String _formatCurrency(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    const weekdays = ['Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Chủ Nhật'];
    final weekdayName = weekdays[(now.weekday - 1).clamp(0, 6)];
    final dateFormatted = DateFormat('dd/MM/yyyy').format(now);
    final dateStr = 'Thứ $weekdayName, ngày $dateFormatted';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'QUẢN TRỊ VIÊN',
                    style: GoogleFonts.montserrat(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'MLD Việt Nam',
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              dateStr,
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          // Nút Quét mã QR tiếp đón nhanh
          IconButton(
            tooltip: 'Quét mã QR Tiếp đón',
            onPressed: widget.onOpenQrScanner,
            icon: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.qr_code_scanner_rounded,
                color: AppColors.primary,
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchData,
        color: AppColors.primary,
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                children: [
                  // 1. Dropdown chọn Chi nhánh
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedBranchId,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF6B7280)),
                        style: GoogleFonts.montserrat(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textHeading,
                        ),
                        items: [
                          DropdownMenuItem<String>(
                            value: 'ALL',
                            child: Row(
                              children: [
                                const Icon(Icons.corporate_fare_rounded, size: 16, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Text(
                                  'Tất cả cơ sở MLD',
                                  style: GoogleFonts.montserrat(fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          ..._branches.map(
                            (b) => DropdownMenuItem<String>(
                              value: b.id,
                              child: Row(
                                children: [
                                  const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFFE11D48)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      b.name,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.montserrat(fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        onChanged: (val) {
                          if (val != null && val != _selectedBranchId) {
                            setState(() {
                              _selectedBranchId = val;
                              _isLoading = true;
                            });
                            _fetchData();
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Lưới 4 Thẻ KPI nóng trong ngày
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.25,
                    children: [
                      AdminKpiCard(
                        title: 'Doanh thu hôm nay',
                        value: _formatCurrency(_metrics.todayRevenue),
                        subtitle: 'Hóa đơn đã thu',
                        icon: Icons.account_balance_wallet_rounded,
                        iconColor: const Color(0xFF00693F),
                        iconBgColor: const Color(0xFFE8F6ED),
                      ),
                      AdminKpiCard(
                        title: 'Lịch hẹn hôm nay',
                        value: '${_metrics.todayBookingsCount} ca',
                        subtitle: '${_metrics.checkedInBookingsCount} đã check-in',
                        icon: Icons.calendar_today_rounded,
                        iconColor: AppColors.primary,
                        iconBgColor: AppColors.primaryLight,
                        onTap: () => widget.onNavigateTab?.call(1),
                      ),
                      AdminKpiCard(
                        title: 'Học viện chờ lớp',
                        value: '${_metrics.waitingBatchStudentsCount} học viên',
                        subtitle: 'Đã đóng tiền cọc/học phí',
                        icon: Icons.school_rounded,
                        iconColor: const Color(0xFFD97706),
                        iconBgColor: const Color(0xFFFEF3C7),
                        onTap: () => widget.onNavigateTab?.call(2, subTab: 'PAID_WAITING_CLASS'),
                      ),
                      AdminKpiCard(
                        title: 'Việc cần duyệt gấp',
                        value: '${_metrics.pendingActionsCount} mục',
                        subtitle: 'Yêu cầu xử lý ngay',
                        icon: Icons.warning_amber_rounded,
                        iconColor: const Color(0xFFE11D48),
                        iconBgColor: const Color(0xFFFFE4E6),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // 3. Phím tắt Thao tác nhanh (Quick Action Shortcuts)
                  Text(
                    'THAO TÁC NHANH',
                    style: GoogleFonts.montserrat(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF6B7280),
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildQuickButton(
                          label: 'Duyệt dịch vụ',
                          icon: Icons.spa_rounded,
                          color: const Color(0xFFE11D48),
                          onTap: () => widget.onNavigateTab?.call(3, subTab: 'SERVICES'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildQuickButton(
                          label: 'Duyệt khóa học',
                          icon: Icons.menu_book_rounded,
                          color: const Color(0xFF00693F),
                          onTap: () => widget.onNavigateTab?.call(3, subTab: 'COURSES'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildQuickButton(
                          label: 'Tiếp đón QR',
                          icon: Icons.qr_code_scanner_rounded,
                          color: AppColors.primary,
                          onTap: widget.onOpenQrScanner,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // 4. Hàng việc cần xử lý khẩn cấp (Urgent Action Required Feed)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CẦN DUYỆT KHẨN CẤP (${_actionItems.length})',
                        style: GoogleFonts.montserrat(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF6B7280),
                          letterSpacing: 0.8,
                        ),
                      ),
                      if (_actionItems.isNotEmpty)
                        Text(
                          'Vuốt xuống để làm mới',
                          style: GoogleFonts.montserrat(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF9CA3AF),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_actionItems.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 52,
                            height: 52,
                            decoration: const BoxDecoration(
                              color: Color(0xFFE8F6ED),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.check_circle_outline_rounded,
                              color: Color(0xFF0D6832),
                              size: 30,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Tuyệt vời! Không có mục nào tồn đọng',
                            style: GoogleFonts.montserrat(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Mọi lịch hẹn và hồ sơ học viên đã được phê duyệt đầy đủ.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.montserrat(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._actionItems.map(
                      (item) => AdminActionCard(
                        item: item,
                        isProcessing: _processingItemId == item.id,
                        onAction: () => _handleAction(item),
                      ),
                    ),
                  const SizedBox(height: 24),
                ],
              ),
      ),
    );
  }

  Widget _buildQuickButton({
    required String label,
    required IconData icon,
    required Color color,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
