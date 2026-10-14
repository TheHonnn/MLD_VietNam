import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import 'c08_booking_success_screen.dart';

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
    if (widget.flowState.usePrepaidPackage) {
      _selectedPaymentMethod = 'PREPAID_PACKAGE';
    }
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
                          'Minh họa tĩnh · Chưa xác nhận lịch hẹn. Không thực hiện thanh toán.',
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
                          'Còn ${_formatPrice(remaining)}đ thanh toán tại cơ sở. Giá và điều kiện đặt cọc là minh họa.',
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

                  // Phương thức 2: Thanh toán trực tuyến
                  _buildPaymentMethodTile(
                    id: 'ONLINE',
                    title: 'Thanh toán trực tuyến',
                    subtitle: 'Phương thức minh họa, chưa kết nối cổng thanh toán.',
                    isSelected: _selectedPaymentMethod == 'ONLINE',
                    onSelect: () => setState(() => _selectedPaymentMethod = 'ONLINE'),
                  ),
                  const SizedBox(height: 12),

                  // Phương thức 3: Thanh toán tại cơ sở
                  _buildPaymentMethodTile(
                    id: 'AT_BRANCH',
                    title: 'Thanh toán tại cơ sở',
                    subtitle:
                        'Chỉ được chọn khi chi nhánh cho phép. Trong ví dụ này, Quận 3 cho phép trả phần còn lại 300.000đ tại cơ sở; vẫn yêu cầu cọc 150.000đ.',
                    isSelected: _selectedPaymentMethod == 'AT_BRANCH',
                    onSelect: () => setState(() => _selectedPaymentMethod = 'AT_BRANCH'),
                  ),
                  const SizedBox(height: 12),

                  // Phương thức 4: Sử dụng gói dịch vụ đã mua
                  _buildPaymentMethodTile(
                    id: 'PREPAID_PACKAGE',
                    title: 'Sử dụng gói dịch vụ đã mua',
                    subtitle:
                        'Kiểm tra dịch vụ, chi nhánh, số buổi và hạn dùng. Chỉ trừ buổi sau khi xác nhận lịch.',
                    isSelected: _selectedPaymentMethod == 'PREPAID_PACKAGE',
                    onSelect: () {
                      setState(() {
                        _selectedPaymentMethod = 'PREPAID_PACKAGE';
                        widget.flowState.usePrepaidPackage = true;
                      });
                    },
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

                  // Thẻ Ghi chú minh họa (350x96)
                  const IllustrationNoteCard(
                    text:
                        'Không chuyển tiền bằng mẫu này. Nút chỉ là hình ảnh tĩnh; lịch chưa được xác nhận. Chỉ tình huống giữ chỗ hợp lệ và cọc thành công mô phỏng mới dẫn đến mẫu C08.',
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma
            BookingFixedBottomBar(
              summaryText: 'Chờ thanh toán · Trả ngay ${_formatPrice(payableNow)}đ (minh họa)',
              buttonText: 'Thanh toán và hoàn tất',
              onPressed: () {
                widget.flowState.paymentMethod = _selectedPaymentMethod;
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => C08BookingSuccessScreen(flowState: widget.flowState),
                  ),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
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
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 36),
                child: Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: BookingColors.textPrimary,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
