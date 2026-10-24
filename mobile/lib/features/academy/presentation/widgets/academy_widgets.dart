import 'package:flutter/material.dart';

class AcademyColors {
  static const Color background = Color(0xFFF8FAFC);
  static const Color primary = Color(0xFF0066B2);
  static const Color heading = Color(0xFF0F172A);
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color cardWarm = Color(0xFFF0F7FF);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color cardWhite = Colors.white;
  static const Color success = Color(0xFF16A34A);
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
                subtitleTag!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
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
            badgeText!.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: AcademyColors.primary,
            ),
          ),
          const SizedBox(height: 4),
        ],
        Text(
          title,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: AcademyColors.heading,
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
              color: AcademyColors.textPrimary,
              height: 1.4,
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
                      summaryText!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
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
                height: 56,
                child: ElevatedButton(
                  onPressed: isEnabled ? onPressed : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AcademyColors.primary,
                    disabledBackgroundColor: AcademyColors.primary.withValues(alpha: 0.5),
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

String formatCurrency(double amount) {
  return amount.toInt().toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]}.',
      );
}

