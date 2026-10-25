import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../data/models/booking_models.dart';
import 'booking_stepper.dart';

/// Bảng màu & Quy chuẩn thiết kế chuẩn Figma Group C
class BookingColors {
  static const Color background = Color(0xFFF5F7F7);
  static const Color primary = Color(0xFF168477);
  static const Color primaryDark = Color(0xFF145B55);
  static const Color heading = Color(0xFF145B55);
  static const Color textPrimary = Color(0xFF1F2937);
  static const Color textSecondary = Color(0xFF475569);
  static const Color cardWarm = Color(0xFFE8F5F1);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color cardWhite = Colors.white;
  static const Color successText = Color(0xFF168477);
  static const Color successBg = Color(0xFFE8F5F1);
  static const Color errorText = Color(0xFFB63131);
  static const Color errorBg = Color(0xFFFFF0ED);
  static const Color qrBorder = Color(0xFF168477);
  static const Color slotDisabledBg = Color(0xFFF1F5F9);
}

/// 1. AppBar chuẩn Figma Group C
class BookingAppBar extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback? onBack;
  final Widget? trailing;

  const BookingAppBar({
    super.key,
    this.onBack,
    this.trailing,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: BookingColors.background,
      elevation: 0,
      scrolledUnderElevation: 0,
      leadingWidth: 64,
      leading: Padding(
        padding: const EdgeInsets.only(left: 16),
        child: Center(
          child: InkWell(
            onTap: () {
              if (onBack != null) {
                onBack!();
              } else if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: BookingColors.cardBorder),
              ),
              child: const Icon(
                Icons.arrow_back,
                color: BookingColors.heading,
                size: 20,
              ),
            ),
          ),
        ),
      ),
      actions: [
        if (trailing != null)
          trailing!
        else
          const Padding(
            padding: EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                'ĐẶT LỊCH HẸN',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  letterSpacing: 0.5,
                  color: BookingColors.primary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// 2. Khung Tiêu đề & Tiến trình (Tiêu đề và tiến trình)
class BookingHeaderSection extends StatelessWidget {
  final String title;
  final String subtitle;
  final int currentStep; // 1: Dịch vụ, 2: Lịch hẹn, 3: Xác nhận, 4: Hoàn tất
  final bool showStepper;

  const BookingHeaderSection({
    super.key,
    required this.title,
    required this.subtitle,
    required this.currentStep,
    this.showStepper = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: BookingColors.heading,
            height: 1.25,
          ),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: BookingColors.textPrimary,
              height: 1.4,
            ),
          ),
        ],
        if (showStepper) ...[
          const SizedBox(height: 12),
          BookingStepper(currentStep: currentStep),
        ],
        const SizedBox(height: 16),
      ],
    );
  }
}

/// 3. Thẻ Ghi chú hướng dẫn
class IllustrationNoteCard extends StatelessWidget {
  final String text;

  const IllustrationNoteCard({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: BookingColors.cardWarm,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: BookingColors.textPrimary,
          height: 1.45,
        ),
      ),
    );
  }
}

/// 4. Fixed Bottom Bar (Hành động cố định)
class BookingFixedBottomBar extends StatelessWidget {
  final String? summaryText;
  final String buttonText;
  final VoidCallback onPressed;
  final bool isEnabled;

  const BookingFixedBottomBar({
    super.key,
    this.summaryText,
    required this.buttonText,
    required this.onPressed,
    this.isEnabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: BookingColors.cardBorder, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (summaryText != null && summaryText!.isNotEmpty) ...[
                SizedBox(
                  height: 24,
                  child: Center(
                    child: Text(
                      summaryText!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: BookingColors.textPrimary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: isEnabled ? onPressed : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BookingColors.primary,
                    disabledBackgroundColor: BookingColors.primary.withValues(alpha: 0.5),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    buttonText,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 5. ComponentFamily / BookingSummaryCard [8111:28285]
class BookingSummaryCardWidget extends StatelessWidget {
  final BookingFlowState? flowState;
  final AppointmentItemModel? appointment;
  final bool isEditable;
  final VoidCallback? onEditService;
  final VoidCallback? onEditBranch;
  final VoidCallback? onEditDateTime;
  final VoidCallback? onEditSpecialist;
  final VoidCallback? onEditCustomer;

  const BookingSummaryCardWidget({
    super.key,
    this.flowState,
    this.appointment,
    this.isEditable = false,
    this.onEditService,
    this.onEditBranch,
    this.onEditDateTime,
    this.onEditSpecialist,
    this.onEditCustomer,
  });

  Widget _buildEditLink(String label, VoidCallback? onTap) {
    if (!isEditable || onTap == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Center(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: double.infinity,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: BookingColors.primary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final serviceName = appointment?.serviceName ??
        (flowState != null && flowState!.allSelectedServices.isNotEmpty
            ? flowState!.allSelectedServices.map((s) => s.name).join(', ')
            : 'Massage thư giãn toàn thân');
    final branchName = appointment?.branchName ??
        flowState?.selectedBranch?.name ??
        'Chi nhánh Quận 3';
    final branchAddress = appointment?.branchAddress ??
        flowState?.selectedBranch?.address ??
        '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh';
    final specialistName = appointment?.specialistName ??
        (flowState?.autoAssignSpecialist == true
            ? 'Hệ thống tự động phân bổ'
            : (flowState?.selectedSpecialist?.name ?? 'Hệ thống tự động phân bổ'));
    final customerName = appointment?.customerName ??
        (flowState?.customerName.isNotEmpty == true
            ? flowState!.customerName
            : 'Nguyễn Minh Anh');
    final customerPhone = appointment?.customerPhone ??
        (flowState?.customerPhone.isNotEmpty == true
            ? flowState!.customerPhone
            : '0912 345 678');

    final date = appointment?.appointmentDate ?? flowState?.selectedDate ?? DateTime(2026, 10, 12);
    final dateStr = '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    final timeStr = appointment?.timeSlot ?? flowState?.selectedSlot?.time ?? '14:00–15:00';
    final duration = flowState?.totalDurationMinutes ?? appointment?.durationMinutes ?? 60;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BookingColors.cardBorder, width: 1.0),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. DỊCH VỤ ĐÃ CHỌN: Hàng 1 (Dịch vụ), Hàng 2 (Thời gian), Hàng 3 (Sửa dịch vụ ở giữa)
          if (isEditable) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                'assets/images/specialist_hero_1.png',
                height: 104,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  height: 104,
                  color: BookingColors.cardWarm,
                  child: const Center(
                    child: Icon(Icons.spa, color: BookingColors.primary, size: 36),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          // Hàng 1: Tên dịch vụ
          Text(
            serviceName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          // Hàng 2: Thời lượng chăm sóc & giá
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Thời lượng chăm sóc',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: BookingColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '$duration phút',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: BookingColors.textPrimary,
                ),
              ),
            ],
          ),
          // Hàng 3: Sửa dịch vụ ở giữa
          _buildEditLink('Sửa dịch vụ', onEditService),

          const SizedBox(height: 16),

          // 2. CHI NHÁNH
          Text(
            branchName,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            branchAddress,
            style: const TextStyle(
              fontSize: 12,
              color: BookingColors.textPrimary,
              height: 1.4,
            ),
          ),
          _buildEditLink('Sửa chi nhánh', onEditBranch),

          const SizedBox(height: 16),

          // 3. NGÀY VÀ GIỜ
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Ngày hẹn',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: BookingColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                dateStr,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: BookingColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Giờ chăm sóc',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: BookingColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                timeStr,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Chuẩn bị / vệ sinh sau buổi: 15 phút. Chiếm dụng nguồn lực 14:00–15:15, không tính vào 60 phút chăm sóc.',
            style: TextStyle(
              fontSize: 12,
              color: BookingColors.textPrimary,
              height: 1.4,
            ),
          ),
          _buildEditLink('Sửa ngày và giờ', onEditDateTime),

          const SizedBox(height: 16),

          // 4. KỸ THUẬT VIÊN & GIƯỜNG ĐIỀU PHỐI TỰ ĐỘNG (BUG-036)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.auto_awesome_rounded, size: 16, color: BookingColors.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  flowState?.guestCount != null && flowState!.guestCount > 1
                      ? 'Kỹ thuật viên ($specialistName) & Giường (${flowState!.guestCount} khách): Được điều phối tự động bởi trung tâm y tế'
                      : 'Kỹ thuật viên & Giường ($specialistName): Được điều phối tự động bởi trung tâm y tế',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: BookingColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 5. KHÁCH HÀNG
          Text(
            'Khách hàng: $customerName',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            customerPhone,
            style: const TextStyle(
              fontSize: 14,
              color: BookingColors.textPrimary,
            ),
          ),
          _buildEditLink('Sửa thông tin khách hàng', onEditCustomer),
        ],
      ),
    );
  }
}

/// 6. ComponentFamily / PriceBreakdown [8111:28362]
/// Hỗ trợ bóc tách VAT 8% / 10% và hiển thị chi tiết giá trước thuế theo tiêu chuẩn Y tế MLD
class PriceBreakdownCardWidget extends StatelessWidget {
  final double subtotal;
  final double discount;
  final double packageUsed;
  final double total;
  final double deposit;
  final double remaining;
  final bool isDepositPaid;
  final double vatRate; // Mặc định 0.08 (8%) theo chính sách VAT y tế

  const PriceBreakdownCardWidget({
    super.key,
    required this.subtotal,
    this.discount = 0.0,
    this.packageUsed = 0.0,
    required this.total,
    required this.deposit,
    required this.remaining,
    this.isDepositPaid = false,
    this.vatRate = 0.08,
  });

  String _formatCurrency(double amount) {
    return amount.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  @override
  Widget build(BuildContext context) {
    final preTaxSubtotal = subtotal > 0 ? (subtotal / (1.0 + vatRate)) : 0.0;
    final vatAmount = subtotal > 0 ? (subtotal - preTaxSubtotal) : 0.0;
    final vatPercentStr = (vatRate * 100).toInt();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BookingColors.cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Chi tiết chi phí',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: BookingColors.heading,
            ),
          ),
          const SizedBox(height: 12),
          _buildRow('Giá dịch vụ (trước VAT)', '${_formatCurrency(preTaxSubtotal)}đ'),
          const SizedBox(height: 8),
          _buildRow('Thuế GTGT (VAT $vatPercentStr%)', '${_formatCurrency(vatAmount)}đ'),
          const SizedBox(height: 8),
          _buildRow('Tạm tính', '${_formatCurrency(subtotal)}đ'),
          if (discount > 0) ...[
            const SizedBox(height: 8),
            _buildRow('Ưu đãi', '-${_formatCurrency(discount)}đ'),
          ],
          if (packageUsed > 0) ...[
            const SizedBox(height: 8),
            _buildRow('Đã sử dụng gói liệu trình', '${_formatCurrency(packageUsed)}đ'),
          ],
          const SizedBox(height: 10),
          const Divider(height: 1, color: BookingColors.cardBorder),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Tổng thanh toán',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: BookingColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${_formatCurrency(total)}đ',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildRow(
            'Tiền đặt cọc',
            deposit > 0 ? '${_formatCurrency(deposit)}đ' : '0đ (Không yêu cầu cọc)',
          ),
          const SizedBox(height: 8),
          _buildRow('Hình thức thanh toán', 'Thanh toán tại cơ sở khi đến / POS'),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 5,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: BookingColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 4,
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: BookingColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}

/// 7. ComponentFamily / VoucherInput [8111:28448]
class VoucherInputCardWidget extends StatefulWidget {
  final Function(String code) onApply;

  const VoucherInputCardWidget({
    super.key,
    required this.onApply,
  });

  @override
  State<VoucherInputCardWidget> createState() => _VoucherInputCardWidgetState();
}

class _VoucherInputCardWidgetState extends State<VoucherInputCardWidget> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BookingColors.cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Mã ưu đãi',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 52,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BookingColors.cardBorder),
            ),
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'Nhập mã ưu đãi (nếu có)',
                hintStyle: TextStyle(fontSize: 14, color: BookingColors.textSecondary),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: OutlinedButton(
              onPressed: () {
                if (_controller.text.trim().isNotEmpty) {
                  widget.onApply(_controller.text.trim());
                }
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: BookingColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Áp dụng',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 8. ComponentFamily / PrepaidPackageSelector [8111:28527]
class PrepaidPackageSelectorWidget extends StatelessWidget {
  final bool isSelected;
  final ValueChanged<bool> onChanged;

  const PrepaidPackageSelectorWidget({
    super.key,
    required this.isSelected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: BookingColors.cardBorder,
          width: 1.0,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => onChanged(!isSelected),
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: isSelected ? BookingColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: BookingColors.primary),
                  ),
                  child: isSelected
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                      : null,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Sử dụng buổi trong gói đã mua',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Gói massage thư giãn — 5 buổi',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Còn 3 buổi · Hết hạn 31/12/2026',
            style: TextStyle(
              fontSize: 14,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Gói liệu trình áp dụng cho massage tại Chi nhánh Quận 3. Chỉ trừ buổi sau khi hoàn thành dịch vụ.',
            style: TextStyle(
              fontSize: 12,
              color: BookingColors.textPrimary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

/// 9. ComponentFamily / PaymentQRPlaceholder [8111:28682]
class PaymentQRPlaceholderWidget extends StatelessWidget {
  final double amount;
  final String transferCode;

  const PaymentQRPlaceholderWidget({
    super.key,
    required this.amount,
    this.transferCode = 'SPA-DEMO-000128',
  });

  String _formatCurrency(double amt) {
    return amt.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: BookingColors.cardWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BookingColors.cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            width: 112,
            height: 112,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BookingColors.qrBorder),
            ),
            child: const Icon(
              Icons.qr_code_2,
              size: 80,
              color: BookingColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Quét mã QR để chuyển khoản thanh toán',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: BookingColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          _buildInfoRow('Ngân hàng: chưa cấu hình'),
          const SizedBox(height: 4),
          _buildInfoRow('Người nhận: chưa cấu hình'),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Số tiền',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.textSecondary,
                ),
              ),
              Text(
                '${_formatCurrency(amount)}đ',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _buildInfoRow('Nội dung: $transferCode'),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: TextButton(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: transferCode));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Đã sao chép nội dung chuyển khoản!'),
                    duration: Duration(seconds: 1),
                  ),
                );
              },
              style: TextButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Sao chép nội dung',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: BookingColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          color: BookingColors.textPrimary,
        ),
      ),
    );
  }
}

/// 10. ComponentFamily / CheckInQRCode [8111:28812]
class CheckInQRCodeWidget extends StatelessWidget {
  final String note;

  const CheckInQRCodeWidget({
    super.key,
    this.note = 'Mã check-in dùng khi đến chi nhánh',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: BookingColors.cardWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BookingColors.cardBorder),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        children: [
          Container(
            width: 112,
            height: 112,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BookingColors.qrBorder),
            ),
            child: const Icon(
              Icons.qr_code_2,
              size: 84,
              color: BookingColors.primary,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            note,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: BookingColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

/// 11. ComponentFamily / BookingTimeline [8111:29014]
class BookingTimelineWidget extends StatelessWidget {
  final int activeIndex; // 0: Đã tạo, 1: Chờ xác nhận, 2: Đã xác nhận, 3: Hoàn thành

  const BookingTimelineWidget({
    super.key,
    this.activeIndex = 2,
  });

  @override
  Widget build(BuildContext context) {
    final steps = [
      'Đã tạo yêu cầu',
      'Chờ xác nhận / thanh toán',
      'Đã xác nhận',
      'Hoàn thành',
    ];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BookingColors.cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tiến trình lịch hẹn',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: BookingColors.heading,
            ),
          ),
          const SizedBox(height: 16),
          ...List.generate(steps.length, (index) {
            final isPassed = index <= activeIndex;
            final isLast = index == steps.length - 1;

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: isPassed ? BookingColors.primary : BookingColors.slotDisabledBg,
                        shape: BoxShape.circle,
                      ),
                    ),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: 36,
                        color: isPassed ? BookingColors.primary : BookingColors.slotDisabledBg,
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Text(
                      steps[index],
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: isPassed ? BookingColors.textPrimary : BookingColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}

