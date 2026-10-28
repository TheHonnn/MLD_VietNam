import 'package:flutter/material.dart';

/// Bảng mã màu chuẩn MLD Việt Nam Brand Design System
/// Tông màu chủ đạo theo giao diện website: #2860EB
class AppColors {
  // Brand Primary & Secondary Palette
  static const Color primary = Color(0xFF2860EB); // Primary xanh dương #2860EB
  static const Color primaryDark = Color(0xFF1E4BB8); // Deep blue #1E4BB8
  static const Color secondary = Color(0xFF2860EB); // Secondary blue #2860EB
  static const Color primaryLight = Color(0xFFEFF4FE); // Soft light blue tint container #EFF4FE
  static const Color mintBackground = Color(0xFFEFF4FE); // Light tint background
  static const Color accent = Color(0xFF2860EB); // Accent #2860EB

  // Menu Color: #2860EB
  static const Color menuBackground = Color(0xFF2860EB); // Header & Menu background

  // Green Action Gradient (linear-gradient 135deg từ xanh rgb(0, 105, 63) 0% sang rgb(0, 140, 80) 100%)
  static const LinearGradient greenActionGradient = LinearGradient(
    colors: [Color(0xFF00693F), Color(0xFF008C50)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Brand Gradient
  static const LinearGradient brandGradient = LinearGradient(
    colors: [Color(0xFF2860EB), Color(0xFF4C82FB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Backgrounds & Surfaces
  static const Color background = Color(0xFFFFFFFF); // Background #FFFFFF
  static const Color surface = Color(0xFFFFFFFF); // Surface #FFFFFF
  static const Color surfaceSecondary = Color(0xFFEFF4FE); // Soft container #EFF4FE
  static const Color backgroundCard = Color(0xFFFFFFFF);
  static const Color surfaceDisabled = Color(0xFFF3F4F6); // Disabled light gray
  static const Color surfaceMuted = Color(0xFFF3F4F6);
  static const Color border = Color(0xFFE5E7EB); // Border #E5E7EB

  // Text & Typography
  static const Color textHeading = Color(0xFF1F2937); // Text heading #1F2937
  static const Color textPrimary = Color(0xFF1F2937); // Text primary #1F2937
  static const Color textSecondary = Color(0xFF616161); // Text secondary #616161
  static const Color textPlaceholder = Color(0xFF9CA3AF); // Placeholder #9CA3AF
  static const Color textInverse = Color(0xFFFFFFFF); // White text

  // Status & Utility Accents
  static const Color accentTeal = Color(0xFF2860EB);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color errorDark = Color(0xFFB91C1C);

  // Price Colors (Phân định màu sắc giá tiền chuyên biệt)
  // Khóa học: rgb(0, 105, 63) - Xanh lá y khoa đậm Vodder
  static const Color coursePrice = Color(0xFF00693F);
  // Dịch vụ: rgb(225, 29, 72) - Đỏ hồng Rose nổi bật
  static const Color servicePrice = Color(0xFFE11D48);
}
