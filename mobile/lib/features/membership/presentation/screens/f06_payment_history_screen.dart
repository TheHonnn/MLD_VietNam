import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/mock_membership_repository.dart';

class F06PaymentHistoryScreen extends StatefulWidget {
  const F06PaymentHistoryScreen({super.key});

  @override
  State<F06PaymentHistoryScreen> createState() => _F06PaymentHistoryScreenState();
}

class _F06PaymentHistoryScreenState extends State<F06PaymentHistoryScreen> {
  final MockMembershipRepository _repo = MockMembershipRepository();
  String _selectedCategory = 'Tất cả';
  String _selectedMonth = 'Tháng 10/2026';

  @override
  Widget build(BuildContext context) {
    final payments = _repo.payments;

    final filtered = payments.where((p) {
      if (_selectedCategory == 'Tất cả') return true;
      return p.type == _selectedCategory;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
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
                'Lịch sử thanh toán',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Theo dõi các giao dịch dịch vụ và học phí của bạn.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 24),

              // --- 2. TỔNG QUAN THANH TOÁN (350x216, r=20, #F3E2CE) ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Đã thanh toán · Tháng 10/2026',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      '8.550.000đ',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary, // #985018
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '3 giao dịch hoàn tất · Dữ liệu minh họa',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Gần nhất: 08/10/2026 · 450.000đ',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      'Hoàn tiền: 0đ · Còn phải trả: 0đ\nChỉ tính 3 giao dịch mẫu, không phải tổng dư nợ tài khoản.',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // --- 3. KỲ GIAO DỊCH (Dropdown chọn tháng) ---
              Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedMonth,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary),
                    items: const [
                      DropdownMenuItem(value: 'Tháng 10/2026', child: Text('Tháng 10/2026')),
                      DropdownMenuItem(value: 'Tháng 09/2026', child: Text('Tháng 09/2026')),
                      DropdownMenuItem(value: 'Tháng 08/2026', child: Text('Tháng 08/2026')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedMonth = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                '01/10/2026 – 31/10/2026',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 16),

              // --- 4. BỘ LỌC DANH MỤC ---
              Row(
                children: [
                  _buildFilterChip('Tất cả'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Dịch vụ'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Liệu trình'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Học phí'),
                ],
              ),

              const SizedBox(height: 20),

              // --- 5. DANH SÁCH THẺ GIAO DỊCH (PaymentTransactionCard / 01..03) ---
              ...filtered.map((item) => _buildPaymentCard(item)),

              const SizedBox(height: 12),

              // --- 6. PHẠM VI LỊCH SỬ MINH HỌA (350x258, r=20, #F3E2CE) ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Phạm vi lịch sử minh họa',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '450.000đ + 3.600.000đ + 4.500.000đ = 8.550.000đ.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Ba giao dịch giả định độc lập; không phải thanh toán thực tế.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Đơn dịch vụ 450.000đ, gói liệu trình 3.600.000đ và học phí chuyên nghiệp 4.500.000đ.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              const Center(
                child: Text(
                  'Dữ liệu minh họa · Lịch sử giả định, không phải hóa đơn thuế.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final bool isSelected = _selectedCategory == label;
    return InkWell(
      onTap: () => setState(() => _selectedCategory = label),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 14),
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

  Widget _buildPaymentCard(PaymentTransaction item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row (Icon, Date, Code)
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  item.icon == 'receipt' ? Icons.receipt_long_rounded : Icons.school_rounded,
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
                      item.date,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.code,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          Text(
            item.serviceName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            item.branch,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.textSecondary,
            ),
          ),

          const SizedBox(height: 14),

          // Số tiền đã thanh toán
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Số tiền đã thanh toán',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                item.amountFormatted,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary, // #985018
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Status Badge
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF7F0),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_rounded, size: 16, color: Color(0xFF236B42)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${item.statusLabel} · Không phải giao dịch thực',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF236B42),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          Text(
            'Phương thức: ${item.paymentMethod}',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Hoàn tiền: 0đ · Còn phải trả: 0đ Chỉ áp dụng cho giao dịch minh họa.',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w400,
              color: AppColors.textSecondary,
            ),
          ),

          const SizedBox(height: 14),

          // Nút Xem biên nhận
          InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Xem biên nhận điện tử cho ${item.code}')),
              );
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              height: 44,
              alignment: Alignment.center,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description_outlined, size: 18, color: AppColors.primary),
                  SizedBox(width: 8),
                  Text(
                    'Xem biên nhận',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

