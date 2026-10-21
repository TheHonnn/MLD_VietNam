import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import '../../data/repositories/booking_repository.dart';
import '../widgets/booking_status_badge.dart';
import '../widgets/cancel_booking_dialog.dart';
import '../widgets/group_c_widgets.dart';
import '../widgets/reschedule_bottom_sheet.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../../../core/widgets/qr_scanner_screen.dart';

/// Screen C10: Chi tiết lịch hẹn [8111:27574]
class C10AppointmentDetailScreen extends StatefulWidget {
  final String appointmentId;

  const C10AppointmentDetailScreen({
    super.key,
    required this.appointmentId,
  });

  @override
  State<C10AppointmentDetailScreen> createState() => _C10AppointmentDetailScreenState();
}

class _C10AppointmentDetailScreenState extends State<C10AppointmentDetailScreen> {
  final BookingRepository _repo = BookingRepository.instance;
  late AppointmentItemModel? _appointment;

  @override
  void initState() {
    super.initState();
    _loadAppointment();
  }

  void _loadAppointment() {
    _appointment = _repo.getAppointmentById(widget.appointmentId);
  }

  void _onReschedule() {
    if (_appointment == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RescheduleBottomSheet(
        appointment: _appointment!,
        onConfirmReschedule: (newDate, newSlot, newSpecialist) {
          _repo.rescheduleAppointment(
            _appointment!.id,
            newDate,
            newSlot,
            newSpecialistName: newSpecialist,
          );
          setState(() {
            _loadAppointment();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Đã đổi lịch sang ${newDate.day}/${newDate.month} · $newSlot${newSpecialist != null ? ' (NV: $newSpecialist)' : ''}',
              ),
              backgroundColor: BookingColors.heading,
            ),
          );
        },
      ),
    );
  }

  void _onCancel() {
    if (_appointment == null) return;
    showDialog(
      context: context,
      builder: (_) => CancelBookingDialog(
        appointment: _appointment!,
        onConfirmCancel: (reason) {
          _repo.cancelAppointment(_appointment!.id, reason);
          setState(() {
            _loadAppointment();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã hủy lịch hẹn theo yêu cầu'),
              backgroundColor: BookingColors.primary,
            ),
          );
        },
      ),
    );
  }

  Future<void> _handleCheckInScan() async {
    final scannedCode = await QRScannerScreen.scan(
      context,
      title: 'Check-in Lịch Hẹn',
      subtitle: 'Hướng camera về phía mã QR tại quầy tiếp tân chi nhánh',
      expectedTypeHint: 'Mã check-in (VD: MLD-CHK-${_appointment?.bookingCode})',
    );

    if (scannedCode != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Xác thực Check-in thành công cho lịch hẹn ${_appointment?.bookingCode}!'),
          backgroundColor: BookingColors.successText,
          behavior: SnackBarBehavior.floating,
        ),
      );
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
    if (_appointment == null) {
      return const Scaffold(
        backgroundColor: BookingColors.background,
        appBar: BookingAppBar(),
        body: Center(child: Text('Không tìm thấy thông tin lịch hẹn.')),
      );
    }

    final app = _appointment!;

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
                  const Text(
                    'Chi tiết lịch hẹn',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w600,
                      color: BookingColors.heading,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Badge trạng thái theo Figma
                  Row(
                    children: [
                      BookingStatusBadge(status: app.status),
                    ],
                  ),
                  const SizedBox(height: 8),

                  Text(
                    '${app.bookingCode} · Chi tiết lịch hẹn dịch vụ',
                    style: const TextStyle(
                      fontSize: 12,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // BookingSummaryCard / Mặc định (350x484)
                  BookingSummaryCardWidget(appointment: app),
                  const SizedBox(height: 24),

                  // PriceBreakdown (350x251)
                  PriceBreakdownCardWidget(
                    subtotal: app.totalAmount,
                    total: app.totalAmount,
                    deposit: app.depositAmount,
                    remaining: app.remainingAmount,
                    isDepositPaid: true,
                  ),
                  const SizedBox(height: 24),

                  // PaymentStatus / Thanh toán thành công (350x82, fill=#EFF7F0, r=16)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: BookingColors.successBg,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.check_circle_outline, size: 20, color: BookingColors.successText),
                            SizedBox(width: 8),
                            Text(
                              'Thanh toán thành công',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: BookingColors.successText,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Lịch hẹn đã được hệ thống xác nhận.',
                          style: TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  Text(
                    'Đã thanh toán cọc ${_formatPrice(app.depositAmount)} · Còn ${_formatPrice(app.remainingAmount)}.',
                    style: const TextStyle(
                      fontSize: 14,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // CheckInQRCode (350x206, fill=#F3E2CE, r=20)
                  InkWell(
                    onTap: _handleCheckInScan,
                    borderRadius: BorderRadius.circular(20),
                    child: const CheckInQRCodeWidget(
                      note: 'Chạm để mở camera quét mã check-in tại quầy tiếp tân',
                    ),
                  ),
                  const SizedBox(height: 24),

                  // BookingTimeline (350x284, fill=white, r=20)
                  BookingTimelineWidget(
                    activeIndex: app.status == AppointmentStatus.completed
                        ? 3
                        : (app.status == AppointmentStatus.confirmed ? 2 : 1),
                  ),
                  const SizedBox(height: 24),

                  // Outline Button: Hủy lịch (350x56, r=14)
                  if (app.status == AppointmentStatus.confirmed ||
                      app.status == AppointmentStatus.pending) ...[
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: OutlinedButton(
                        onPressed: _onCancel,
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: BookingColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Hủy lịch',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: BookingColors.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Outline Button: Liên hệ trung tâm (350x56, r=14)
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: OutlinedButton(
                      onPressed: () => AppLauncherHelper.makePhoneCall(context, '0393856549'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: BookingColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Liên hệ trung tâm (039.3856.549)',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Thẻ Ghi chú
                  const IllustrationNoteCard(
                    text:
                        'Quý khách có thể đổi lịch hoặc hủy lịch trước giờ hẹn ít nhất 2 tiếng theo chính sách của MLD.',
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma: Nút Đổi lịch (khi có thể đổi)
            if (app.status == AppointmentStatus.confirmed ||
                app.status == AppointmentStatus.pending)
              BookingFixedBottomBar(
                buttonText: 'Đổi lịch',
                onPressed: _onReschedule,
              ),
          ],
        ),
      ),
    );
  }
}
