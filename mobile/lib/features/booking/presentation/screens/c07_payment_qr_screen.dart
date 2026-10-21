import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import '../widgets/vietqr_payment_modal.dart';

/// Screen C07: Thanh toán [8111:27241]
class C07PaymentQrScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C07PaymentQrScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C07PaymentQrScreen> createState() => _C07PaymentQrScreenState();
}

class _C07PaymentQrScreenState extends State<C07PaymentQrScreen> {
  late bool _payFullAmount;
  String _selectedPaymentMethod = 'BANK_TRANSFER_QR'; // BANK_TRANSFER_QR, ONLINE, AT_BRANCH, PREPAID_PACKAGE

  @override
  void initState() {
    super.initState();
    _payFullAmount = widget.flowState.payFullAmount;
    _selectedPaymentMethod = 'BANK_TRANSFER_QR';
  }

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = widget.flowState.rawServicePrice;
    final discount = widget.flowState.voucherDiscount;
    final packageUsed = widget.flowState.usePrepaidPackage ? widget.flowState.servicePrice : 0.0;
    final total = widget.flowState.usePrepaidPackage ? 0.0 : widget.flowState.servicePrice;
    final deposit = widget.flowState.usePrepaidPackage ? 0.0 : 150000.0;
    final payableNow = widget.flowState.usePrepaidPackage
        ? 0.0
        : (_payFullAmount ? total : deposit);
    final remaining = widget.flowState.usePrepaidPackage
        ? 0.0
        : (total - payableNow).clamp(0.0, double.infinity);

    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: const BookingAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  const SizedBox(height: 8),
                  const BookingHeaderSection(
                    title: 'Thanh toán',
                    subtitle: 'Chọn phương thức thanh toán thuận tiện cho bạn.',
                    currentStep: 3,
                  ),
                  const SizedBox(height: 8),

                  // Badge PaymentStatus / Chờ thanh toán (350x82, fill=#F3E2CE, r=16)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: BookingColors.cardWarm,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.access_time_outlined, size: 20, color: BookingColors.primary),
                            SizedBox(width: 8),
                            Text(
                              'Chờ thanh toán',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.heading,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Vui lòng chọn phương thức thanh toán để hoàn tất đặt lịch.',
                          style: TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Thẻ chọn mức cọc / trả hết (350x208, fill=#F3E2CE, stroke=#E3D1BF, r=20)
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: BookingColors.cardWarm,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Thanh toán ngay ${_formatPrice(payableNow)}đ',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: BookingColors.heading,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Radio 1: Đặt cọc 150.000đ
                        InkWell(
                          onTap: () {
                            setState(() {
                              _payFullAmount = false;
                              widget.flowState.payFullAmount = false;
                            });
                          },
                          child: Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: !_payFullAmount ? BookingColors.primary : Colors.white,
                                  border: Border.all(
                                    color: BookingColors.primary,
                                    width: 1.5,
                                  ),
                                ),
                                child: !_payFullAmount
                                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Đặt cọc ${_formatPrice(deposit)}đ',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: BookingColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Radio 2: Thanh toán toàn bộ 450.000đ
                        InkWell(
                          onTap: () {
                            setState(() {
                              _payFullAmount = true;
                              widget.flowState.payFullAmount = true;
                            });
                          },
                          child: Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _payFullAmount ? BookingColors.primary : Colors.white,
                                  border: Border.all(
                                    color: BookingColors.primary,
                                    width: 1.5,
                                  ),
                                ),
                                child: _payFullAmount
                                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Thanh toán toàn bộ ${_formatPrice(total)}đ',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: BookingColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Còn ${_formatPrice(remaining)}đ thanh toán tại cơ sở. Thanh toán phần còn lại tại cơ sở khi đến sử dụng dịch vụ.',
                          style: const TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Phương thức 1: Chuyển khoản ngân hàng / QR (Đang chọn)
                  _buildPaymentMethodTile(
                    id: 'BANK_TRANSFER_QR',
                    title: 'Chuyển khoản ngân hàng / QR',
                    isSelected: _selectedPaymentMethod == 'BANK_TRANSFER_QR',
                    onSelect: () => setState(() => _selectedPaymentMethod = 'BANK_TRANSFER_QR'),
                  ),
                  const SizedBox(height: 12),

                  // Phương thức 2: Thanh toán tại cơ sở
                  _buildPaymentMethodTile(
                    id: 'AT_BRANCH',
                    title: 'Thanh toán tại cơ sở',
                    subtitle: 'Yêu cầu cọc tiền trước',
                    isSelected: _selectedPaymentMethod == 'AT_BRANCH',
                    onSelect: () => setState(() => _selectedPaymentMethod = 'AT_BRANCH'),
                  ),
                  const SizedBox(height: 24),

                  // Thẻ PriceBreakdown / Mặc định (350x251)
                  PriceBreakdownCardWidget(
                    subtotal: subtotal,
                    discount: discount,
                    packageUsed: packageUsed,
                    total: total,
                    deposit: deposit,
                    remaining: remaining,
                  ),
                  const SizedBox(height: 24),

                  // Thẻ BookingSummaryCard / Mặc định (350x372)
                  BookingSummaryCardWidget(flowState: widget.flowState),
                  const SizedBox(height: 24),

                  // Thẻ Ghi chú (350x96)
                  const IllustrationNoteCard(
                    text:
                        'Vui lòng kiểm tra kỹ thông tin lịch hẹn và chuyển khoản theo đúng nội dung hiển thị.',
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma
            BookingFixedBottomBar(
              summaryText: 'Chờ thanh toán · Trả ngay ${_formatPrice(payableNow)}đ',
              buttonText: 'Thanh toán và hoàn tất',
              onPressed: () {
                widget.flowState.paymentMethod = _selectedPaymentMethod;
                final bookingCode =
                    'MLD-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}';

                VietQrPaymentModal.show(
                  context: context,
                  flowState: widget.flowState,
                  payableAmount: payableNow,
                  bookingCode: bookingCode,
                  isDeposit: !_payFullAmount,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentMethodTile({
    required String id,
    required String title,
    String? subtitle,
    required bool isSelected,
    required VoidCallback onSelect,
  }) {
    return InkWell(
      onTap: onSelect,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: isSelected ? BookingColors.cardWarm : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: BookingColors.cardBorder,
            width: 1.0,
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 24,
              height: 24,
              margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? BookingColors.primary : Colors.white,
                border: Border.all(
                  color: BookingColors.primary,
                  width: 1.5,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: BookingColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
