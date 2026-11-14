import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';

class AdminRevenueGridModal extends StatefulWidget {
  final String initialPeriod; // 'TODAY', 'WEEK', 'MONTH'
  final String? branchId;

  const AdminRevenueGridModal({
    super.key,
    this.initialPeriod = 'MONTH',
    this.branchId,
  });

  static Future<void> show(
    BuildContext context, {
    String initialPeriod = 'MONTH',
    String? branchId,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AdminRevenueGridModal(
        initialPeriod: initialPeriod,
        branchId: branchId,
      ),
    );
  }

  @override
  State<AdminRevenueGridModal> createState() => _AdminRevenueGridModalState();
}

class _AdminRevenueGridModalState extends State<AdminRevenueGridModal> {
  final AdminRepository _repository = AdminRepository.instance;

  late String _currentPeriod;
  bool _isLoading = true;
  AdminRevenueReport _report = AdminRevenueReport.empty('MONTH');
  int? _selectedPointIndex;

  @override
  void initState() {
    super.initState();
    _currentPeriod = widget.initialPeriod;
    _fetchReport();
  }

  Future<void> _fetchReport() async {
    setState(() => _isLoading = true);
    final rep = await _repository.fetchRevenueReport(
      branchId: widget.branchId,
      period: _currentPeriod,
    );
    if (mounted) {
      setState(() {
        _report = rep;
        _isLoading = false;
        _selectedPointIndex = null;
      });
    }
  }

  String _formatCurrency(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  String _formatCompact(double amount) {
    if (amount >= 1000000000) {
      return '${(amount / 1000000000).toStringAsFixed(1)} tỷ';
    } else if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(0)} tr';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(0)} k';
    }
    return '${amount.toInt()} đ';
  }

  @override
  Widget build(BuildContext context) {
    final maxChartVal = _report.chartPoints.fold<double>(
      0.0,
      (max, p) => p.totalAmount > max ? p.totalAmount : max,
    );
    // Baseline ceiling for the grid chart
    final gridCeiling = maxChartVal > 0 ? maxChartVal * 1.25 : 10000000.0;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF9FAFB),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 44,
              height: 4.5,
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(10),
              ),
            ),

            // Top Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F6ED),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.grid_view_rounded,
                          color: Color(0xFF00693F),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'BIỂU ĐỒ LƯỚI DOANH THU',
                            style: AppTypography.zaloFont(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                              letterSpacing: 0.3,
                            ),
                          ),
                          Text(
                            'Phân tích chi tiết và đối soát giao dịch',
                            style: AppTypography.zaloFont(
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF6B7280)),
                  ),
                ],
              ),
            ),

            // Period Filter Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    _buildPeriodTab('TODAY', 'Hôm nay'),
                    _buildPeriodTab('WEEK', '7 ngày qua'),
                    _buildPeriodTab('MONTH', 'Tháng ${DateTime.now().month}'),
                  ],
                ),
              ),
            ),

            // Main Content Area
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      children: [
                        // 1. KPI Summary Cards
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Tổng thực thu',
                                value: _formatCurrency(_report.totalRevenue),
                                subtitle: '${_report.totalTransactions} giao dịch',
                                color: const Color(0xFF00693F),
                                bgColor: const Color(0xFFE8F6ED),
                                icon: Icons.account_balance_wallet_rounded,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Học viện MLD',
                                value: _formatCurrency(_report.academyRevenue),
                                subtitle: 'Học phí & Tiền cọc',
                                color: const Color(0xFF7C3AED),
                                bgColor: const Color(0xFFEDE9FE),
                                icon: Icons.school_rounded,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Dịch vụ Spa',
                                value: _formatCurrency(_report.serviceRevenue),
                                subtitle: 'Trị liệu & Chăm sóc',
                                color: const Color(0xFF1E40AF),
                                bgColor: const Color(0xFFEFF6FF),
                                icon: Icons.spa_rounded,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Giá trị TB / đơn',
                                value: _formatCurrency(_report.averageTicket),
                                subtitle: 'Bình quân giao dịch',
                                color: const Color(0xFFD97706),
                                bgColor: const Color(0xFFFEF3C7),
                                icon: Icons.analytics_rounded,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // 2. Interactive Revenue Grid Chart
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.02),
                                blurRadius: 8,
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
                                  Row(
                                    children: [
                                      const Icon(Icons.bar_chart_rounded, size: 18, color: Color(0xFF00693F)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'BIỂU ĐỒ LƯỚI THEO CỘT',
                                        style: AppTypography.zaloFont(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.5,
                                          color: AppColors.textHeading,
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Legend
                                  Row(
                                    children: [
                                      _buildLegendDot(const Color(0xFF7C3AED), 'Học viện'),
                                      const SizedBox(width: 10),
                                      _buildLegendDot(const Color(0xFF1E40AF), 'Dịch vụ'),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 18),

                              // Grid Chart Component
                              SizedBox(
                                height: 210,
                                child: _buildGridChart(gridCeiling),
                              ),

                              // Tooltip / Selection detail if tapped
                              if (_selectedPointIndex != null &&
                                  _selectedPointIndex! < _report.chartPoints.length) ...[
                                const SizedBox(height: 14),
                                _buildSelectedTooltip(_report.chartPoints[_selectedPointIndex!]),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // 3. Grid Table of Detailed Transactions
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'ĐỐI SOÁT CHI TIẾT (${_report.items.length})',
                              style: AppTypography.zaloFont(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF6B7280),
                                letterSpacing: 0.8,
                              ),
                            ),
                            Text(
                              'Cập nhật thời gian thực',
                              style: AppTypography.zaloFont(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF9CA3AF),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        if (_report.items.isEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 30),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE5E7EB)),
                            ),
                            child: Center(
                              child: Text(
                                'Không có giao dịch nào trong khoảng thời gian này.',
                                style: AppTypography.zaloFont(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          )
                        else
                          ..._report.items.map((it) => _buildTransactionRow(it)),

                        const SizedBox(height: 30),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodTab(String period, String label) {
    final isSelected = _currentPeriod == period;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (_currentPeriod != period) {
            setState(() => _currentPeriod = period);
            _fetchReport();
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    )
                  ]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: AppTypography.zaloFont(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? AppColors.textHeading : const Color(0xFF6B7280),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required Color bgColor,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.zaloFont(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.zaloFont(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                Text(
                  subtitle,
                  style: AppTypography.zaloFont(
                    fontSize: 10,
                    color: const Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppTypography.zaloFont(
            fontSize: 10.5,
            fontWeight: FontWeight.w500,
            color: const Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }

  Widget _buildGridChart(double gridCeiling) {
    final points = _report.chartPoints;
    if (points.isEmpty) {
      return Center(
        child: Text(
          'Chưa có dữ liệu biểu đồ cho kỳ này',
          style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
        ),
      );
    }

    // Reference values for 4 horizontal gridlines
    final levels = [1.0, 0.66, 0.33, 0.0];

    return Stack(
      children: [
        // 1. Horizontal Gridlines & Y-Axis Scale
        Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: levels.map((fraction) {
            final val = gridCeiling * fraction;
            return Row(
              children: [
                SizedBox(
                  width: 46,
                  child: Text(
                    _formatCompact(val),
                    textAlign: TextAlign.right,
                    style: AppTypography.zaloFont(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF9CA3AF),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    height: 1,
                    color: fraction == 0.0 ? const Color(0xFFCBD5E1) : const Color(0xFFF1F5F9),
                  ),
                ),
              ],
            );
          }).toList(),
        ),

        // 2. Vertical Bars Grouped along X-Axis
        Padding(
          padding: const EdgeInsets.only(left: 54, bottom: 22, top: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(points.length, (idx) {
              final p = points[idx];
              final isSelected = _selectedPointIndex == idx;
              final heightFraction = gridCeiling > 0 ? (p.totalAmount / gridCeiling).clamp(0.02, 1.0) : 0.02;

              // Proportions of academy vs service
              final double acadRatio = p.totalAmount > 0 ? (p.academyAmount / p.totalAmount) : 0.0;
              final double servRatio = p.totalAmount > 0 ? (p.serviceAmount / p.totalAmount) : 0.0;

              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedPointIndex = isSelected ? null : idx;
                    });
                  },
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      // Amount label on top
                      if (p.totalAmount > 0)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            _formatCompact(p.totalAmount),
                            style: AppTypography.zaloFont(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                            ),
                          ),
                        ),

                      // Stacked Bar Container
                      Container(
                        width: 28,
                        height: 140 * heightFraction,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(6),
                          border: isSelected ? Border.all(color: const Color(0xFF00693F), width: 1.8) : null,
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(5),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (acadRatio > 0)
                                Flexible(
                                  flex: (acadRatio * 100).toInt().clamp(1, 100),
                                  child: Container(color: const Color(0xFF7C3AED)),
                                ),
                              if (servRatio > 0)
                                Flexible(
                                  flex: (servRatio * 100).toInt().clamp(1, 100),
                                  child: Container(color: const Color(0xFF1E40AF)),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),

                      // X-Axis Label
                      Text(
                        p.label,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 9.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? AppColors.textHeading : const Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedTooltip(AdminRevenuePoint p) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Chi tiết mốc: ${p.label}',
                style: AppTypography.zaloFont(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF166534),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Học viện: ${_formatCurrency(p.academyAmount)} · Dịch vụ: ${_formatCurrency(p.serviceAmount)}',
                style: AppTypography.zaloFont(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF15803D),
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF166534),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _formatCurrency(p.totalAmount),
              style: AppTypography.zaloFont(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionRow(AdminRevenueItem it) {
    final isAcademy = it.category == 'ACADEMY_TUITION';
    final badgeColor = isAcademy ? const Color(0xFF7C3AED) : const Color(0xFF1E40AF);
    final badgeBg = isAcademy ? const Color(0xFFEDE9FE) : const Color(0xFFEFF6FF);
    final badgeText = isAcademy ? 'HỌC VIỆN' : 'SPA TRỊ LIỆU';

    String timeFormatted = it.timestamp;
    try {
      final dt = DateTime.parse(it.timestamp).toLocal();
      timeFormatted = DateFormat('HH:mm · dd/MM/yyyy').format(dt);
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Icon Category
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isAcademy ? Icons.school_rounded : Icons.spa_rounded,
              color: badgeColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: badgeBg,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        badgeText,
                        style: AppTypography.zaloFont(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: badgeColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        it.code,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF6B7280),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  it.customerOrStudentName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.zaloFont(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                Text(
                  it.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.zaloFont(
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  timeFormatted,
                  style: AppTypography.zaloFont(
                    fontSize: 10,
                    color: const Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ),
          ),

          // Amount
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '+ ${_formatCurrency(it.amount)}',
                style: AppTypography.zaloFont(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF00693F),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F6ED),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'ĐÃ THU',
                  style: AppTypography.zaloFont(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF00693F),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
