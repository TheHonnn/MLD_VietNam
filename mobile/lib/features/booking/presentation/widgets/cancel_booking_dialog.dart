import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';
import 'group_c_widgets.dart';

/// ComponentFamily / CancelBookingDialog [8111:29215]
class CancelBookingDialog extends StatefulWidget {
  final AppointmentItemModel appointment;
  final ValueChanged<String> onConfirmCancel;

  const CancelBookingDialog({
    super.key,
    required this.appointment,
    required this.onConfirmCancel,
  });

  @override
  State<CancelBookingDialog> createState() => _CancelBookingDialogState();
}

class _CancelBookingDialogState extends State<CancelBookingDialog> {
  final TextEditingController _reasonController = TextEditingController();
  bool _isCancelling = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.appointment.appointmentDate;
    final dStr =
        '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: BookingColors.cardBorder),
      ),
      backgroundColor: BookingColors.background,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Hủy lịch hẹn này?',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: BookingColors.heading,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.appointment.serviceName,
              style: const TextStyle(
                fontSize: 14,
                color: BookingColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$dStr · ${widget.appointment.timeSlot}',
              style: const TextStyle(
                fontSize: 14,
                color: BookingColors.textPrimary,
              ),
            ),
            const SizedBox(height: 14),

            const Text(
              'Lý do hủy (tùy chọn)',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: BookingColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: BookingColors.cardBorder),
              ),
              child: TextField(
                controller: _reasonController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Nhập lý do nếu bạn muốn chia sẻ',
                  hintStyle: TextStyle(fontSize: 14, color: BookingColors.textSecondary),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.all(12),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Ghi chú chuẩn Figma
            const IllustrationNoteCard(
              text:
                  'Xác nhận cuối rõ ràng; hoàn tiền chỉ chờ xem xét, không tự động hoàn cọc hoặc ghi giảm / trả buổi.',
            ),
            const SizedBox(height: 18),

            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: BookingColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Giữ lịch hẹn',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isCancelling
                          ? null
                          : () {
                              final nav = Navigator.of(context);
                              setState(() => _isCancelling = true);
                              widget.onConfirmCancel(_reasonController.text.trim());
                              nav.pop();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: BookingColors.errorText,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _isCancelling
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'Hủy lịch',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
