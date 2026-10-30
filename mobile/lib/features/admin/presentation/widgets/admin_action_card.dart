import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/admin_models.dart';

class AdminActionCard extends StatelessWidget {
  final AdminActionItem item;
  final VoidCallback onAction;
  final bool isProcessing;

  const AdminActionCard({
    super.key,
    required this.item,
    required this.onAction,
    this.isProcessing = false,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeBg;
    Color badgeText;
    String badgeLabel;
    IconData badgeIcon;
    String actionBtnText;
    Color actionBtnColor;

    switch (item.type) {
      case AdminActionType.pendingBooking:
        badgeBg = const Color(0xFFEFF4FE);
        badgeText = AppColors.primary;
        badgeLabel = 'LỊCH HẸN MỚI';
        badgeIcon = Icons.calendar_today_rounded;
        actionBtnText = 'Duyệt lịch';
        actionBtnColor = AppColors.primary;
        break;
      case AdminActionType.waitingBatch:
        badgeBg = const Color(0xFFE8F6ED);
        badgeText = const Color(0xFF0D6832);
        badgeLabel = 'CHỜ XẾP LỚP';
        badgeIcon = Icons.school_rounded;
        actionBtnText = 'Xếp lớp';
        actionBtnColor = const Color(0xFF00693F);
        break;
      case AdminActionType.newQuizSubmission:
        badgeBg = const Color(0xFFFEF3C7);
        badgeText = const Color(0xFF92400E);
        badgeLabel = 'BÀI THI NỘP';
        badgeIcon = Icons.assignment_turned_in_rounded;
        actionBtnText = 'Xem bài';
        actionBtnColor = const Color(0xFFD97706);
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(badgeIcon, size: 12, color: badgeText),
                    const SizedBox(width: 4),
                    Text(
                      badgeLabel,
                      style: GoogleFonts.montserrat(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: badgeText,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                item.timeAgo,
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            item.title,
            style: GoogleFonts.montserrat(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textHeading,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            item.subtitle,
            style: GoogleFonts.montserrat(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.textSecondary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (item.secondaryInfo != null && item.secondaryInfo!.isNotEmpty)
                Row(
                  children: [
                    const Icon(Icons.phone_rounded, size: 13, color: Color(0xFF9CA3AF)),
                    const SizedBox(width: 4),
                    Text(
                      item.secondaryInfo!,
                      style: GoogleFonts.montserrat(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                )
              else
                const SizedBox(),
              ElevatedButton(
                onPressed: isProcessing ? null : onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: actionBtnColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  minimumSize: const Size(0, 34),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: isProcessing
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        actionBtnText,
                        style: GoogleFonts.montserrat(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
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
