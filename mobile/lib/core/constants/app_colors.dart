import 'package:flutter/material.dart';

/// Bảng mã màu chuẩn MLD Việt Nam Brand Design System
/// Tông màu chủ đạo: #002A6B (rgb(0, 42, 107)) & #1995EB
class AppColors {
  // Brand Primary & Secondary Palette (#002A6B & #1995EB)
  static const Color primary = Color(0xFF002A6B); // Deep navy blue #002A6B, rgb(0, 42, 107)
  static const Color primaryDark = Color(0xFF001B45); // Dark navy #001B45
  static const Color secondary = Color(0xFF1995EB); // Vibrant blue #1995EB
  static const Color primaryLight = Color(0xFFEBF5FE); // Soft light blue tint container
  static const Color mintBackground = Color(0xFFEBF5FE); // Light tint background
  static const Color accent = Color(0xFF1995EB); // Accent #1995EB

  // Menu Color: rgb(0, 42, 107)
  static const Color menuBackground = Color(0xFF002A6B); // rgb(0, 42, 107)

  // Brand Gradient
  static const LinearGradient brandGradient = LinearGradient(
    colors: [Color(0xFF002A6B), Color(0xFF1995EB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Backgrounds & Surfaces
  static const Color background = Color(0xFFF5F7FA); // App background
  static const Color surface = Color(0xFFFFFFFF); // Surface #FFFFFF
  static const Color surfaceSecondary = Color(0xFFEBF5FE); // Soft container #EBF5FE
  static const Color backgroundCard = Color(0xFFFFFFFF);
  static const Color surfaceDisabled = Color(0xFFF1F5F9);
  static const Color surfaceMuted = Color(0xFFF1F5F9);
  static const Color border = Color(0xFFE2E8F0); // Border #E2E8F0

  // Text & Typography
  static const Color textHeading = Color(0xFF002A6B); // Deep navy heading
  static const Color textPrimary = Color(0xFF1F2937); // Primary text #1F2937
  static const Color textSecondary = Color(0xFF475569); // Secondary text #475569
  static const Color textPlaceholder = Color(0xFF94A3B8); // Muted slate #94A3B8
  static const Color textInverse = Color(0xFFFFFFFF); // White text

  // Status & Utility Accents
  static const Color accentTeal = Color(0xFF1995EB);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color errorDark = Color(0xFFB91C1C);
}
