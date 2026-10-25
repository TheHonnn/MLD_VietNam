import 'package:flutter/material.dart';
import '../../data/models/booking_models.dart';

/// ComponentFamily / BookingStatusBadge [8111:28882]
/// 5 trạng thái lịch hẹn theo Figma:
/// - Chờ xác nhận: fill=#F3E2CE, text=#985018
/// - Đã xác nhận: fill=#F3E2CE, text=#236B42
/// - Đang phục vụ: fill=#F3E2CE, text=#985018
/// - Hoàn thành: fill=#F3E2CE, text=#236B42
/// - Đã hủy: fill=#F8F1E8, text=#B63131
class BookingStatusBadge extends StatelessWidget {
  final AppointmentStatus status;
  final bool isSimulated;

  const BookingStatusBadge({
    super.key,
    required this.status,
    this.isSimulated = true,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;
    String label;

    switch (status) {
      case AppointmentStatus.pending:
        bg = const Color(0xFFE8F5F1);
        textColor = const Color(0xFF168477);
        label = 'Chờ xác nhận';
        break;
      case AppointmentStatus.confirmed:
        bg = const Color(0xFFE8F5F1);
        textColor = const Color(0xFF145B55);
        label = isSimulated ? 'Đã xác nhận' : 'Đã xác nhận';
        break;
      case AppointmentStatus.inService:
        bg = const Color(0xFFE8F5F1);
        textColor = const Color(0xFF168477);
        label = 'Đang phục vụ';
        break;
      case AppointmentStatus.completed:
        bg = const Color(0xFFE8F5F1);
        textColor = const Color(0xFF145B55);
        label = 'Hoàn thành';
        break;
      case AppointmentStatus.cancelled:
        bg = const Color(0xFFF1F5F9);
        textColor = const Color(0xFFB63131);
        label = 'Đã hủy';
        break;
    }

    return Container(
      height: 34,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: textColor,
        ),
      ),
    );
  }
}
