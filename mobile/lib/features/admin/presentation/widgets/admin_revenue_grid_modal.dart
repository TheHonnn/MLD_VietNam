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
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Đã thu',
                                value: _formatCurrency(_report.grossCollected),
                                subtitle: '${_report.totalTransactions} biên nhận hoàn tất',
                                color: const Color(0xFF004890),
                                bgColor: const Color(0xFFEFF6FF),
                                icon: Icons.receipt_long_rounded,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Hoàn tiền',
                                value: _formatCurrency(_report.refundAmount),
                                subtitle: '${_report.refundCount} khoản hoàn trong kỳ',
                                color: const Color(0xFFDC2626),
                                bgColor: const Color(0xFFFEF2F2),
                                icon: Icons.replay_rounded,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Thực thu',
                                value: _formatCurrency(_report.totalRevenue),
                                subtitle: 'Đã trừ hoàn tiền',
                                color: const Color(0xFF00693F),
                                bgColor: const Color(0xFFE8F6ED),
                                icon: Icons.account_balance_wallet_rounded,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildMetricCard(
                                title: 'Cần thu ngay',
                                value: _formatCurrency(_report.receivableAmount),
                                subtitle: '${_report.receivableCount} khoản công nợ / chờ quyết toán',
                                color: const Color(0xFFD97706),
                                bgColor: const Color(0xFFFEF3C7),
                                icon: Icons.schedule_rounded,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        Builder(
                          builder: (context) {
                            final total = _report.totalRevenue > 0 ? _report.totalRevenue : 1.0;
                            final servRatio = (_report.serviceRevenue / total).clamp(0.0, 1.0);
                            final packRatio = (_report.packageRevenue / total).clamp(0.0, 1.0);
                            final acadRatio = (_report.academyRevenue / total).clamp(0.0, 1.0);

                            final servPct = (servRatio * 100).toStringAsFixed(1);
                            final packPct = (packRatio * 100).toStringAsFixed(1);
                            final acadPct = (acadRatio * 100).toStringAsFixed(1);

                            return Container(
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
                                    children: [
                                      const Icon(Icons.pie_chart_rounded, size: 18, color: Color(0xFF004890)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'CƠ CẤU KHOẢN ĐÃ THU',
                                        style: AppTypography.zaloFont(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.5,
                                          color: AppColors.textHeading,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 14),

                                  _buildCategoryProgressRow(
                                    label: 'Dịch vụ',
                                    amount: _formatCurrency(_report.serviceRevenue),
                                    pct: servPct,
                                    ratio: servRatio,
                                    color: const Color(0xFF0EA5E9),
                                  ),
                                  const SizedBox(height: 10),

                                  _buildCategoryProgressRow(
                                    label: 'Liệu trình',
                                    amount: _formatCurrency(_report.packageRevenue),
                                    pct: packPct,
                                    ratio: packRatio,
                                    color: const Color(0xFFF59E0B),
                                  ),
                                  const SizedBox(height: 10),

                                  _buildCategoryProgressRow(
                                    label: 'Học phí',
                                    amount: _formatCurrency(_report.academyRevenue),
                                    pct: acadPct,
                                    ratio: acadRatio,
                                    color: const Color(0xFF208C58),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),

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
                                        'THỰC THU TỪNG NGÀY',
                                        style: AppTypography.zaloFont(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.5,
                                          color: AppColors.textHeading,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      _buildLegendDot(const Color(0xFF7C3AED), 'Học phí'),
                                      const SizedBox(width: 8),
                                      _buildLegendDot(const Color(0xFFF59E0B), 'Liệu trình'),
                                      const SizedBox(width: 8),
                                      _buildLegendDot(const Color(0xFF0EA5E9), 'Dịch vụ'),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Đơn vị: VND · Đã thu theo ngày, không gồm khoản chờ thanh toán',
                                style: AppTypography.zaloFont(
                                  fontSize: 10,
                                  color: const Color(0xFF9CA3AF),
                                ),
                              ),
                              const SizedBox(height: 16),

                              SizedBox(
                                height: 210,
                                child: _buildGridChart(gridCeiling),
                              ),

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

  Widget _buildCategoryProgressRow({
    required String label,
    required String amount,
    required String pct,
    required double ratio,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: AppTypography.zaloFont(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              '$amount · $pct%',
              style: AppTypography.zaloFont(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Container(
            height: 7,
            width: double.infinity,
            color: const Color(0xFFF1F5F9),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: ratio.clamp(0.0, 1.0),
              child: Container(color: color),
            ),
          ),
        ),
      ],
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

    final levels = [1.0, 0.66, 0.33, 0.0];

    return Stack(
      children: [
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

        Padding(
          padding: const EdgeInsets.only(left: 54, bottom: 22, top: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(points.length, (idx) {
              final p = points[idx];
              final isSelected = _selectedPointIndex == idx;
              final heightFraction = gridCeiling > 0 ? (p.totalAmount / gridCeiling).clamp(0.02, 1.0) : 0.02;

              final double acadRatio = p.totalAmount > 0 ? (p.academyAmount / p.totalAmount) : 0.0;
              final double packRatio = p.totalAmount > 0 ? (p.packageAmount / p.totalAmount) : 0.0;
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
                              if (packRatio > 0)
                                Flexible(
                                  flex: (packRatio * 100).toInt().clamp(1, 100),
                                  child: Container(color: const Color(0xFFF59E0B)),
                                ),
                              if (servRatio > 0)
                                Flexible(
                                  flex: (servRatio * 100).toInt().clamp(1, 100),
                                  child: Container(color: const Color(0xFF0EA5E9)),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),

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
          Expanded(
            child: Column(
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
                  'Học phí: ${_formatCurrency(p.academyAmount)} · Liệu trình: ${_formatCurrency(p.packageAmount)} · Dịch vụ: ${_formatCurrency(p.serviceAmount)}',
                  style: AppTypography.zaloFont(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF15803D),
                  ),
                ),
              ],
            ),
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
    final isPackage = it.category == 'TREATMENT_PACKAGE';
    final isProduct = it.category == 'PRODUCT';
    final isRefund = it.amount < 0 || it.status == 'REFUND';
    final badgeColor = isAcademy
        ? const Color(0xFF7C3AED)
        : (isPackage
            ? const Color(0xFFD97706)
            : (isProduct ? const Color(0xFF10B981) : const Color(0xFF0284C7)));
    final badgeBg = isAcademy
        ? const Color(0xFFEDE9FE)
        : (isPackage
            ? const Color(0xFFFEF3C7)
            : (isProduct ? const Color(0xFFD1FAE5) : const Color(0xFFE0F2FE)));
    final badgeText = isAcademy
        ? 'HỌC PHÍ'
        : (isPackage ? 'LIỆU TRÌNH' : (isProduct ? 'SẢN PHẨM' : 'DỊCH VỤ'));
    final badgeIcon = isAcademy
        ? Icons.school_rounded
        : (isPackage
            ? Icons.spa_rounded
            : (isProduct ? Icons.shopping_bag_rounded : Icons.self_improvement_rounded));

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
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              badgeIcon,
              color: badgeColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),

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

          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                isRefund
                    ? '- ${_formatCurrency(it.amount.abs())}'
                    : '+ ${_formatCurrency(it.amount)}',
                style: AppTypography.zaloFont(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: isRefund ? const Color(0xFFDC2626) : const Color(0xFF00693F),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isRefund ? const Color(0xFFFEE2E2) : const Color(0xFFE8F6ED),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isRefund ? 'HOÀN TIỀN' : 'ĐÃ THU',
                  style: AppTypography.zaloFont(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: isRefund ? const Color(0xFFDC2626) : const Color(0xFF00693F),
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
