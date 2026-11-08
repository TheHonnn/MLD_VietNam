import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/booking_models.dart';

class BookingStatusBadge extends StatelessWidget {
  final AppointmentStatus status;
  final bool isSimulated;

  const BookingStatusBadge({
    super.key,
    required this.status,
    this.isSimulated = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;
    String label;

    switch (status) {
      case AppointmentStatus.pending:
        bg = AppColors.iceBlue;
        textColor = AppColors.primary;
        label = 'Chờ xác nhận';
        break;
      case AppointmentStatus.confirmed:
        bg = AppColors.mintBackground;
        textColor = AppColors.accent;
        label = isSimulated ? 'Đã xác nhận' : 'Đã xác nhận';
        break;
      case AppointmentStatus.inService:
        bg = AppColors.mintBackground;
        textColor = AppColors.accent;
        label = 'Đang phục vụ';
        break;
      case AppointmentStatus.completed:
        bg = AppColors.mintBackground;
        textColor = AppColors.accent;
        label = 'Hoàn thành';
        break;
      case AppointmentStatus.cancelled:
        bg = AppColors.surfaceDisabled;
        textColor = AppColors.errorDark;
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
        label.tr(context),
        style: GoogleFonts.beVietnamPro(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}
