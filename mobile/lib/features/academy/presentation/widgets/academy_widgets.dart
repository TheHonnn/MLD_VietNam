import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';

/// Bảng mã màu Phân hệ Đào tạo - Đồng bộ 100% Brand Design System 60 - 30 - 10
class AcademyColors {
  static const Color background = AppColors.background; // 60% Nền tảng (#FFFFFF)
  static const Color primary = AppColors.primary; // 30% Cấu trúc chính (#004890)
  static const Color primaryDark = AppColors.primaryDark; // (#003366)
  static const Color heading = AppColors.textHeading; // (#004890)
  static const Color textPrimary = AppColors.textPrimary; // (#344454)
  static const Color textSecondary = AppColors.textSecondary; // (#607080)
  static const Color cardWarm = AppColors.mintBackground; // 60% Container (#EFF6EE)
  static const Color cardBorder = AppColors.border; // (#E2E8F0)
  static const Color cardWhite = AppColors.surface; // (#FFFFFF)
  static const Color success = AppColors.accent; // 10% Điểm nhấn (#208C58)
  static const Color price = AppColors.coursePrice; // 10% Điểm nhấn giá (#208C58)
}

class AcademyAppBar extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback? onBack;
  final Widget? trailing;
  final String? subtitleTag;

  const AcademyAppBar({
    super.key,
    this.onBack,
    this.trailing,
    this.subtitleTag,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AcademyColors.background,
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
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: const Icon(
                Icons.arrow_back,
                color: AcademyColors.heading,
                size: 20,
              ),
            ),
          ),
        ),
      ),
      actions: [
        if (trailing != null)
          trailing!
        else if (subtitleTag != null)
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: Center(
              child: Text(
                AppTranslation.translate(subtitleTag, isEn: context.isEn),
                style: GoogleFonts.beVietnamPro(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AcademyColors.textSecondary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class AcademyHeaderSection extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? badgeText;

  const AcademyHeaderSection({
    super.key,
    required this.title,
    required this.subtitle,
    this.badgeText,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (badgeText != null) ...[
          Text(
            AppTranslation.translate(badgeText, isEn: context.isEn).toUpperCase(),
            style: GoogleFonts.beVietnamPro(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: AcademyColors.primary,
            ),
          ),
          const SizedBox(height: 4),
        ],
        Text(
          title.tr(context),
          style: GoogleFonts.beVietnamPro(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: AcademyColors.heading,
            height: 1.25,
          ),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            subtitle.tr(context),
            style: GoogleFonts.beVietnamPro(
              fontSize: 13.5,
              fontWeight: FontWeight.w400,
              color: AcademyColors.textPrimary,
              height: 1.45,
            ),
          ),
        ],
        const SizedBox(height: 16),
      ],
    );
  }
}

class AcademyFixedBottomBar extends StatelessWidget {
  final String? summaryText;
  final String buttonText;
  final VoidCallback onPressed;
  final bool isEnabled;

  const AcademyFixedBottomBar({
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
          top: BorderSide(color: AcademyColors.cardBorder, width: 1.0),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (summaryText != null && summaryText!.isNotEmpty) ...[
                SizedBox(
                  height: 24,
                  child: Center(
                    child: Text(
                      AppTranslation.translate(summaryText, isEn: context.isEn),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.beVietnamPro(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: isEnabled ? onPressed : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent, // 10% CTA Điểm nhấn hành động chuẩn Brand System
                    disabledBackgroundColor: AppColors.accent.withValues(alpha: 0.5),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    AppTranslation.translate(buttonText, isEn: context.isEn),
                    style: GoogleFonts.beVietnamPro(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
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

String formatCurrency(double amount) {
  return amount.toInt().toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]}.',
      );
}

