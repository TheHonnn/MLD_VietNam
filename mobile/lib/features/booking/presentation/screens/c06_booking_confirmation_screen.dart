import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import '../widgets/group_c_widgets.dart';
import 'c01_service_selection_screen.dart';
import 'c02_branch_selection_screen.dart';
import 'c03_specialist_selection_screen.dart';
import 'c04_datetime_selection_screen.dart';
import 'c05_booking_info_screen.dart';
import 'c07_payment_qr_screen.dart';

/// Screen C06: Xác nhận đặt lịch [8111:27118]
class C06BookingConfirmationScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C06BookingConfirmationScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C06BookingConfirmationScreen> createState() => _C06BookingConfirmationScreenState();
}

class _C06BookingConfirmationScreenState extends State<C06BookingConfirmationScreen> {
  late bool _agreeTerms;

  @override
  void initState() {
    super.initState();
    _agreeTerms = widget.flowState.agreeTerms;
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
    final remaining = widget.flowState.usePrepaidPackage ? 0.0 : (total - deposit).clamp(0.0, double.infinity);

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
                    title: 'Xác nhận đặt lịch',
                    subtitle: 'Kiểm tra thông tin trước khi hoàn tất.',
                    currentStep: 3, // Figma C06 là Bước 3: Xác nhận
                  ),
                  const SizedBox(height: 8),

                  // Thẻ Ghi chú
                  const IllustrationNoteCard(
                    text:
                        'Quý khách vui lòng kiểm tra lại thông tin dịch vụ, thời gian và chi nhánh trước khi thanh toán.',
                  ),
                  const SizedBox(height: 24),

                  // Thẻ BookingSummaryCard / Có thể chỉnh sửa (350x744)
                  BookingSummaryCardWidget(
                    flowState: widget.flowState,
                    isEditable: true,
                    onEditService: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => C01ServiceSelectionScreen(flowState: widget.flowState),
                        ),
                      );
                    },
                    onEditBranch: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => C02BranchSelectionScreen(flowState: widget.flowState),
                        ),
                      );
                    },
                    onEditDateTime: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => C04DateTimeSelectionScreen(flowState: widget.flowState),
                        ),
                      );
                    },
                    onEditSpecialist: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => C03SpecialistSelectionScreen(flowState: widget.flowState),
                        ),
                      );
                    },
                    onEditCustomer: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => C05BookingInfoScreen(flowState: widget.flowState),
                        ),
                      );
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

                  // Thẻ VoucherInput / Mặc định (350x172)
                  VoucherInputCardWidget(
                    onApply: (code) async {
                      final result = await BookingRepository.validateCouponOnline(
                        code,
                        widget.flowState.rawServicePrice,
                      );
                      if (!context.mounted) return;
                      if (result['isValid'] == true) {
                        setState(() {
                          widget.flowState.voucherCode = code.trim().toUpperCase();
                          widget.flowState.voucherDiscount = (result['discount'] as num).toDouble();
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(result['message'] as String),
                            backgroundColor: const Color(0xFF236B42),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(result['message'] as String),
                            backgroundColor: const Color(0xFFD64545),
                            duration: const Duration(seconds: 3),
                          ),
                        );
                      }
                    },
                  ),
                    const SizedBox(height: 16),

                    // Thẻ Chính sách đặt hẹn (350x290, fill=white, r=20)
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Chính sách đặt hẹn',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: BookingColors.heading,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Đổi lịch trước ít nhất 24 giờ: không thu phí.',
                            style: TextStyle(
                              fontSize: 14,
                              color: BookingColors.textPrimary,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Hủy lịch: tiền cọc được bảo lưu hoặc hoàn trả theo quy chế dịch vụ của MLD.',
                            style: TextStyle(
                              fontSize: 14,
                              color: BookingColors.textPrimary,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Cọc ${_formatPrice(deposit)}đ · Thanh toán phần còn lại ${_formatPrice(remaining)}đ tại cơ sở.',
                            style: const TextStyle(
                              fontSize: 14,
                              color: BookingColors.textPrimary,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 14),

                        // Checkbox: Tôi đã đọc và đồng ý...
                        InkWell(
                          onTap: () {
                            setState(() {
                              _agreeTerms = !_agreeTerms;
                              widget.flowState.agreeTerms = _agreeTerms;
                            });
                          },
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: _agreeTerms ? BookingColors.primary : Colors.white,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: BookingColors.primary),
                                ),
                                child: _agreeTerms
                                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'Tôi đã đọc và đồng ý với điều khoản dịch vụ',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: BookingColors.textPrimary,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma
            BookingFixedBottomBar(
              summaryText: 'Tổng ${_formatPrice(total)}đ · Tiền cọc ${_formatPrice(deposit)}đ',
              buttonText: 'Tiếp tục thanh toán',
              isEnabled: _agreeTerms,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => C07PaymentQrScreen(flowState: widget.flowState),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
