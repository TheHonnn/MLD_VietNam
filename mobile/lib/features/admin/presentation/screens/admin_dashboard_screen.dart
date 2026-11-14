import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/admin_action_card.dart';
import '../widgets/admin_revenue_grid_modal.dart';
import '../widgets/assign_batch_bottom_sheet.dart';
import '../widgets/quiz_submission_detail_sheet.dart';

class AdminDashboardScreen extends StatefulWidget {
  final Function(int tabIndex, {String? subTab})? onNavigateTab;
  final VoidCallback? onOpenQrScanner;
  final VoidCallback? onLogout;

  const AdminDashboardScreen({
    super.key,
    this.onNavigateTab,
    this.onOpenQrScanner,
    this.onLogout,
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
        if (item.rawData != null) {
          final candidate = AdminCandidateModel.fromJson(item.rawData!);
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => AssignBatchBottomSheet(
              candidate: candidate,
              onBatchAssigned: (batchId, batchCode) async {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Đã xếp học viên ${candidate.candidateName} vào lớp $batchCode'),
                    backgroundColor: AppColors.success,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                await _fetchData();
              },
            ),
          );
        } else {
          // Chuyển sang Tab 2 (Tuyển sinh & Học viện) ở phân hệ Chờ xếp lớp
          widget.onNavigateTab?.call(2, subTab: 'PAID_WAITING_CLASS');
        }
      } else if (item.type == AdminActionType.newQuizSubmission) {
        if (item.rawData != null) {
          final sub = AdminQuizSubmissionModel.fromJson(item.rawData!);
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => QuizSubmissionDetailSheet(
              submission: sub,
              onSaved: () async {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Đã lưu nhận xét bài thi thành công!'),
                    backgroundColor: AppColors.success,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                await _fetchData();
              },
            ),
          );
        } else {
          // Chuyển sang Tab 2 ở phân hệ Bài thi
          widget.onNavigateTab?.call(2, subTab: 'QUIZZES');
        }
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
                    style: AppTypography.zaloFont(
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
                  style: AppTypography.zaloFont(
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
              style: AppTypography.zaloFont(
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
          if (widget.onLogout != null) ...[
            const SizedBox(width: 4),
            IconButton(
              tooltip: 'Đăng xuất quản trị',
              onPressed: widget.onLogout,
              icon: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.logout_rounded,
                  color: Color(0xFFE11D48),
                  size: 20,
                ),
              ),
            ),
          ],
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
                        style: AppTypography.zaloFont(
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
                                  style: AppTypography.zaloFont(fontWeight: FontWeight.w600),
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
                                      style: AppTypography.zaloFont(fontWeight: FontWeight.w500),
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

                  // 2. Thống kê Doanh thu (Hôm nay & Tháng đặt ngang nhau - Bấm vào xem Biểu đồ Lưới)
                  Row(
                    children: [
                      Expanded(
                        child: AdminKpiCard(
                          title: 'Doanh thu hôm nay',
                          value: _formatCurrency(_metrics.todayRevenue),
                          subtitle: 'Hóa đơn đã thu · Chạm xem lưới',
                          icon: Icons.account_balance_wallet_rounded,
                          iconColor: const Color(0xFF00693F),
                          iconBgColor: const Color(0xFFE8F6ED),
                          onTap: () => AdminRevenueGridModal.show(
                            context,
                            initialPeriod: 'TODAY',
                            branchId: _selectedBranchId == 'ALL' ? null : _selectedBranchId,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AdminKpiCard(
                          title: 'Doanh thu tháng ${now.month}',
                          value: _formatCurrency(_metrics.monthRevenue),
                          subtitle: 'Tháng ${now.month}/${now.year} · Chạm xem lưới',
                          icon: Icons.trending_up_rounded,
                          iconColor: const Color(0xFF1E40AF),
                          iconBgColor: const Color(0xFFEFF6FF),
                          onTap: () => AdminRevenueGridModal.show(
                            context,
                            initialPeriod: 'MONTH',
                            branchId: _selectedBranchId == 'ALL' ? null : _selectedBranchId,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 3. Thống kê Học viên (Hôm nay & Tháng đặt ngang nhau theo yêu cầu)
                  Row(
                    children: [
                      Expanded(
                        child: AdminKpiCard(
                          title: 'Học viên hôm nay',
                          value: '${_metrics.todayStudentsCount} học viên',
                          subtitle: 'Ghi danh mới hôm nay',
                          icon: Icons.person_add_alt_1_rounded,
                          iconColor: const Color(0xFF0284C7),
                          iconBgColor: const Color(0xFFE0F2FE),
                          onTap: () => widget.onNavigateTab?.call(2),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AdminKpiCard(
                          title: 'Học viên tháng ${now.month}',
                          value: '${_metrics.monthStudentsCount} học viên',
                          subtitle: 'Tháng ${now.month}/${now.year}',
                          icon: Icons.groups_rounded,
                          iconColor: const Color(0xFF7C3AED),
                          iconBgColor: const Color(0xFFEDE9FE),
                          onTap: () => widget.onNavigateTab?.call(2),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 4. Thống kê Vận hành Lịch hẹn & Chờ lớp (Đặt ngang nhau)
                  Row(
                    children: [
                      Expanded(
                        child: AdminKpiCard(
                          title: 'Lịch hẹn hôm nay',
                          value: '${_metrics.todayBookingsCount} ca',
                          subtitle: '${_metrics.checkedInBookingsCount} đã check-in',
                          icon: Icons.calendar_today_rounded,
                          iconColor: AppColors.primary,
                          iconBgColor: AppColors.primaryLight,
                          onTap: () => widget.onNavigateTab?.call(1),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AdminKpiCard(
                          title: 'Học viện chờ lớp',
                          value: '${_metrics.waitingBatchStudentsCount} học viên',
                          subtitle: 'Đã đóng tiền cọc/học phí',
                          icon: Icons.school_rounded,
                          iconColor: const Color(0xFFD97706),
                          iconBgColor: const Color(0xFFFEF3C7),
                          onTap: () => widget.onNavigateTab?.call(2, subTab: 'PAID_WAITING_CLASS'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 4. Khung Dashboard Thứ 4: Việc cần duyệt gấp (Bấm vào điều hướng thông minh)
                  InkWell(
                    onTap: () {
                      final hasPendingBk = _actionItems.any((it) => it.type == AdminActionType.pendingBooking);
                      final hasWaitingBatch = _actionItems.any((it) => it.type == AdminActionType.waitingBatch);
                      final hasQuiz = _actionItems.any((it) => it.type == AdminActionType.newQuizSubmission);

                      if (hasPendingBk) {
                        widget.onNavigateTab?.call(1, subTab: 'PENDING');
                      } else if (hasWaitingBatch) {
                        widget.onNavigateTab?.call(2, subTab: 'PAID_WAITING_CLASS');
                      } else if (hasQuiz) {
                        widget.onNavigateTab?.call(2, subTab: 'QUIZZES');
                      } else {
                        widget.onNavigateTab?.call(1, subTab: 'PENDING');
                      }
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: _metrics.pendingActionsCount > 0 ? const Color(0xFFFFF1F2) : const Color(0xFFE8F6ED),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _metrics.pendingActionsCount > 0 ? const Color(0xFFFECDD3) : const Color(0xFFC6F6D5),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: _metrics.pendingActionsCount > 0 ? const Color(0xFFFFE4E6) : Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _metrics.pendingActionsCount > 0
                                  ? Icons.warning_amber_rounded
                                  : Icons.check_circle_outline_rounded,
                              color: _metrics.pendingActionsCount > 0
                                  ? const Color(0xFFE11D48)
                                  : const Color(0xFF0D6832),
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'VIỆC CẦN DUYỆT GẤP',
                                      style: AppTypography.zaloFont(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: _metrics.pendingActionsCount > 0
                                            ? const Color(0xFFBE123C)
                                            : const Color(0xFF0D6832),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: _metrics.pendingActionsCount > 0
                                            ? const Color(0xFFE11D48)
                                            : const Color(0xFF0D6832),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '${_metrics.pendingActionsCount} mục',
                                        style: AppTypography.zaloFont(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  _metrics.pendingActionsCount > 0
                                      ? 'Có lịch hẹn/hồ sơ đang chờ bạn duyệt. Bấm để vào duyệt ngay →'
                                      : 'Đã hoàn tất tất cả việc duyệt. Hệ thống đang thông suốt.',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: _metrics.pendingActionsCount > 0
                                        ? const Color(0xFF9F1239)
                                        : const Color(0xFF166534),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_metrics.pendingActionsCount > 0)
                            const Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 14,
                              color: Color(0xFFE11D48),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 3. Phím tắt Thao tác nhanh (Quick Action Shortcuts)
                  Text(
                    'THAO TÁC NHANH',
                    style: AppTypography.zaloFont(
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
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF6B7280),
                          letterSpacing: 0.8,
                        ),
                      ),
                      if (_actionItems.isNotEmpty)
                        Text(
                          'Vuốt xuống để làm mới',
                          style: AppTypography.zaloFont(
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
                            style: AppTypography.zaloFont(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Mọi lịch hẹn và hồ sơ học viên đã được phê duyệt đầy đủ.',
                            textAlign: TextAlign.center,
                            style: AppTypography.zaloFont(
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
                style: AppTypography.zaloFont(
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
