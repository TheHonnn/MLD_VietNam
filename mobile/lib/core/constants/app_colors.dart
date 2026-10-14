import 'package:flutter/material.dart';

/// Bảng mã màu trích xuất 100% từ Figma Design System (Node 8107:5498 & Figma Styles)
class AppColors {
  // Brand Primary & Secondary
  static const Color primary = Color(0xFF985018); // --color-primary
  static const Color primaryDark = Color(0xFF693B20); // --color-textHeading
  static const Color secondary = Color(0xFFC58D59); // --color-secondary
  static const Color primaryLight = Color(0xFFC58D59);
  static const Color accent = Color(0xFFC58D59);

  // Backgrounds & Surface
  static const Color background = Color(0xFFF8F1E8); // Screen canvas #F8F1E8
  static const Color surface = Color(0xFFFFFFFF); // --color-surface
  static const Color surfaceSecondary = Color(0xFFF3E2CE); // --color-surfaceSecondary (Soft Amber Warm Box)
  static const Color backgroundCard = Color(0xFFF3E2CE);
  static const Color surfaceDisabled = Color(0xFFEBE3DA); // --color-surfaceDisabled
  static const Color surfaceMuted = Color(0xFFEBE3DA);
  static const Color border = Color(0xFFE3D1BF); // --color-border

  // Text & Typography
  static const Color textHeading = Color(0xFF693B20); // --color-textHeading
  static const Color textPrimary = Color(0xFF40352F); // --color-textPrimary
  static const Color textSecondary = Color(0xFF6B6158); // --color-textSecondaryAccessible
  static const Color textPlaceholder = Color(0xFFA1978E);
  static const Color textInverse = Color(0xFFFFFFFF); // --color-textInverse

  // Status & Utility Accents
  static const Color accentTeal = Color(0xFF213C43);
  static const Color success = Color(0xFF2E8B57);
  static const Color error = Color(0xFFD64545);
  static const Color errorDark = Color(0xFFB63131);
}
