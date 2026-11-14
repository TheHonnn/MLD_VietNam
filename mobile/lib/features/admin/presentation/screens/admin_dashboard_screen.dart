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
import '../../../../core/services/top_notification_service.dart';

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
  int _selectedApprovalBox = 0; // 0: Lịch hẹn, 1: Chờ xếp lớp, 2: Bài thi nộp

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
            TopNotificationService.showSuccess(
              title: 'Duyệt lịch hẹn',
              message: 'Đã duyệt xác nhận lịch hẹn thành công!',
            );
            await _fetchData();
          } else {
            TopNotificationService.showError(
              title: 'Lỗi duyệt lịch',
              message: 'Không thể duyệt lịch hẹn. Vui lòng thử lại.',
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
                TopNotificationService.showSuccess(
                  title: 'Xếp lớp học viên',
                  message: 'Đã xếp học viên ${candidate.candidateName} vào lớp $batchCode',
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
                TopNotificationService.showSuccess(
                  title: 'Nhận xét bài thi',
                  message: 'Đã lưu nhận xét bài thi thành công!',
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

                  // 4. KHUNG CẦN DUYỆT GẤP: PHÂN RA 3 Ô ĐỘC LẬP THEO YÊU CẦU
                  Builder(
                    builder: (context) {
                      final bookingItems = _actionItems.where((it) => it.type == AdminActionType.pendingBooking).toList();
                      final batchItems = _actionItems.where((it) => it.type == AdminActionType.waitingBatch).toList();
                      final quizItems = _actionItems.where((it) => it.type == AdminActionType.newQuizSubmission).toList();

                      final bookingCount = _metrics.pendingBookingsCount > bookingItems.length ? _metrics.pendingBookingsCount : bookingItems.length;
                      final batchCount = _metrics.waitingBatchStudentsCount > batchItems.length ? _metrics.waitingBatchStudentsCount : batchItems.length;
                      final quizCount = _metrics.pendingQuizzesCount > quizItems.length ? _metrics.pendingQuizzesCount : quizItems.length;

                      List<AdminActionItem> activeItems;
                      String activeCategoryTitle;
                      IconData activeCategoryIcon;
                      Color activeCategoryColor;
                      VoidCallback onOpenTab;
                      String tabLabel;

                      switch (_selectedApprovalBox) {
                        case 0:
                          activeItems = bookingItems;
                          activeCategoryTitle = 'Lịch hẹn tiếp đón';
                          activeCategoryIcon = Icons.calendar_month_rounded;
                          activeCategoryColor = const Color(0xFF0284C7);
                          onOpenTab = () => widget.onNavigateTab?.call(1, subTab: 'PENDING');
                          tabLabel = 'Mở tab Tiếp đón →';
                          break;
                        case 1:
                          activeItems = batchItems;
                          activeCategoryTitle = 'Học viên chờ xếp lớp';
                          activeCategoryIcon = Icons.school_rounded;
                          activeCategoryColor = const Color(0xFF7C3AED);
                          onOpenTab = () => widget.onNavigateTab?.call(2, subTab: 'PAID_WAITING_CLASS');
                          tabLabel = 'Mở tab Tuyển sinh →';
                          break;
                        case 2:
                        default:
                          activeItems = quizItems;
                          activeCategoryTitle = 'Bài thi học viên';
                          activeCategoryIcon = Icons.assignment_turned_in_rounded;
                          activeCategoryColor = const Color(0xFF00693F);
                          onOpenTab = () => widget.onNavigateTab?.call(2, subTab: 'QUIZZES');
                          tabLabel = 'Mở tab Bài thi →';
                          break;
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header Việc cần duyệt gấp
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    'VIỆC CẦN DUYỆT GẤP',
                                    style: AppTypography.zaloFont(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF6B7280),
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: _metrics.pendingActionsCount > 0
                                          ? const Color(0xFFE11D48)
                                          : const Color(0xFF00693F),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '${_metrics.pendingActionsCount} việc',
                                      style: AppTypography.zaloFont(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                'Chạm ô để lọc danh sách',
                                style: AppTypography.zaloFont(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF9CA3AF),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // 3 Ô PHÂN LOẠI CẦN DUYỆT GẤP
                          Row(
                            children: [
                              _buildApprovalBox(
                                index: 0,
                                title: 'Lịch hẹn',
                                subtitle: 'Khách đặt lịch',
                                count: bookingCount,
                                icon: Icons.calendar_month_rounded,
                                color: const Color(0xFF0284C7),
                                bgColor: const Color(0xFFE0F2FE),
                              ),
                              const SizedBox(width: 8),
                              _buildApprovalBox(
                                index: 1,
                                title: 'Chờ xếp lớp',
                                subtitle: 'Đã đóng phí',
                                count: batchCount,
                                icon: Icons.school_rounded,
                                color: const Color(0xFF7C3AED),
                                bgColor: const Color(0xFFEDE9FE),
                              ),
                              const SizedBox(width: 8),
                              _buildApprovalBox(
                                index: 2,
                                title: 'Chấm bài thi',
                                subtitle: 'Học viên nộp',
                                count: quizCount,
                                icon: Icons.assignment_turned_in_rounded,
                                color: const Color(0xFF00693F),
                                bgColor: const Color(0xFFE8F6ED),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Header Danh sách theo Ô đang chọn
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(activeCategoryIcon, size: 14, color: activeCategoryColor),
                                  const SizedBox(width: 6),
                                  Text(
                                    'DANH SÁCH ${activeCategoryTitle.toUpperCase()} (${activeItems.length})',
                                    style: AppTypography.zaloFont(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: activeCategoryColor,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  if (activeItems.isNotEmpty)
                                    InkWell(
                                      onTap: () => _showCategoryApprovalSheet(context, _selectedApprovalBox),
                                      borderRadius: BorderRadius.circular(6),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: activeCategoryColor.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.fullscreen_rounded, size: 13, color: activeCategoryColor),
                                            const SizedBox(width: 3),
                                            Text(
                                              'Bảng trượt',
                                              style: AppTypography.zaloFont(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: activeCategoryColor,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  const SizedBox(width: 8),
                                  InkWell(
                                    onTap: onOpenTab,
                                    borderRadius: BorderRadius.circular(6),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      child: Text(
                                        tabLabel,
                                        style: AppTypography.zaloFont(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w600,
                                          color: const Color(0xFF4B5563),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Danh sách các mục thuộc ô đang chọn
                          if (activeItems.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFFE5E7EB)),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: activeCategoryColor.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      Icons.check_circle_outline_rounded,
                                      color: activeCategoryColor,
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Không có $activeCategoryTitle nào đang chờ duyệt',
                                    style: AppTypography.zaloFont(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textHeading,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Tất cả đã được xử lý xong.',
                                    style: AppTypography.zaloFont(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else
                            ...activeItems.map(
                              (item) => AdminActionCard(
                                item: item,
                                isProcessing: _processingItemId == item.id,
                                onAction: () => _handleAction(item),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 18),

                  // 5. Phím tắt Thao tác nhanh (Quick Action Shortcuts)
                  Text(
                    'THAO TÁC NHANH',
                    style: AppTypography.zaloFont(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF6B7280),
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 8),
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

  Widget _buildApprovalBox({
    required int index,
    required String title,
    required String subtitle,
    required int count,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    final isSelected = _selectedApprovalBox == index;
    final hasItems = count > 0;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (_selectedApprovalBox == index && hasItems) {
              _showCategoryApprovalSheet(context, index);
            } else {
              setState(() => _selectedApprovalBox = index);
            }
          },
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected
                  ? (hasItems ? bgColor.withValues(alpha: 0.3) : Colors.white)
                  : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isSelected ? color : const Color(0xFFE5E7EB),
                width: isSelected ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: isSelected
                      ? color.withValues(alpha: 0.12)
                      : Colors.black.withValues(alpha: 0.02),
                  blurRadius: isSelected ? 8 : 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(icon, color: color, size: 17),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: hasItems ? color : const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$count',
                        style: AppTypography.zaloFont(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: hasItems ? Colors.white : const Color(0xFF9CA3AF),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.zaloFont(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? color : AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$count cần duyệt',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.zaloFont(
                    fontSize: 10,
                    fontWeight: hasItems ? FontWeight.w600 : FontWeight.w400,
                    color: hasItems
                        ? (isSelected ? color : const Color(0xFFE11D48))
                        : const Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showCategoryApprovalSheet(BuildContext context, int categoryIndex) {
    final categoryType = categoryIndex == 0
        ? AdminActionType.pendingBooking
        : categoryIndex == 1
            ? AdminActionType.waitingBatch
            : AdminActionType.newQuizSubmission;

    final categoryTitle = categoryIndex == 0
        ? 'Lịch hẹn tiếp đón'
        : categoryIndex == 1
            ? 'Học viên chờ xếp lớp'
            : 'Bài thi học viên';

    final categoryColor = categoryIndex == 0
        ? const Color(0xFF0284C7)
        : categoryIndex == 1
            ? const Color(0xFF7C3AED)
            : const Color(0xFF00693F);

    final items = _actionItems.where((it) => it.type == categoryType).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.82,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 6),
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1D5DB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: categoryColor.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        categoryIndex == 0
                            ? Icons.calendar_month_rounded
                            : categoryIndex == 1
                                ? Icons.school_rounded
                                : Icons.assignment_turned_in_rounded,
                        color: categoryColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Danh sách $categoryTitle',
                            style: AppTypography.zaloFont(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                            ),
                          ),
                          Text(
                            '${items.length} lượt cần duyệt',
                            style: AppTypography.zaloFont(
                              fontSize: 11.5,
                              color: categoryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF9CA3AF)),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFFE5E7EB)),
              // Content
              Expanded(
                child: items.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle_outline_rounded, size: 48, color: categoryColor),
                              const SizedBox(height: 12),
                              Text(
                                'Không có $categoryTitle nào đang chờ duyệt',
                                style: AppTypography.zaloFont(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textHeading,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Tất cả đã được xử lý xong.',
                                style: AppTypography.zaloFont(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        itemCount: items.length,
                        itemBuilder: (_, idx) {
                          final item = items[idx];
                          return AdminActionCard(
                            item: item,
                            isProcessing: _processingItemId == item.id,
                            onAction: () async {
                              Navigator.pop(ctx);
                              await _handleAction(item);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
