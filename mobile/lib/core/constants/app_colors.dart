import 'package:flutter/material.dart';

/// Bảng mã màu chuẩn MLD Việt Nam Brand Design System (60 - 30 - 10)
/// Xanh dương chính (Deep Navy: #004890), Xanh da trời phụ (Sky Blue: #0EA5E9),
/// Điểm nhấn Bạch huyết (Lymphatic Emerald: #208C58), Nền Mint & White (#EFF6EE, #FFFFFF)
class AppColors {
  // Brand Primary (Xanh dương chính - 30% Cấu trúc)
  static const Color primary = Color(0xFF004890); // Medical Deep Navy #004890
  static const Color primaryDark = Color(0xFF003366); // Deepest Navy
  static const Color primaryNavy = Color(0xFF004890);

  // Brand Secondary (Xanh da trời phụ - 30% Cấu trúc bổ trợ)
  static const Color secondary = Color(0xFF0EA5E9); // Sky Blue #0EA5E9
  static const Color secondaryLight = Color(0xFF38BDF8); // Light Sky Blue #38BDF8
  static const Color iceBlue = Color(0xFFDEEAF6); // Soft Ice Blue Badge Background #DEEAF6
  static const Color tagText = Color(0xFF144874); // Tag text deep blue #144874

  // Brand Accent (Điểm nhấn sinh học bạch huyết - 10% CTA Hành động)
  static const Color accent = Color(0xFF208C58); // Lymphatic Emerald Green #208C58
  static const Color accentGreen = Color(0xFF208C58);
  static const Color accentTeal = Color(0xFF208C58);
  static const Color sageGreen = Color(0xFF80B470); // Sage healing green #80B470

  // Backgrounds & Containers (60% Nền tảng)
  static const Color background = Color(0xFFFFFFFF); // Pure Medical White #FFFFFF
  static const Color surface = Color(0xFFFFFFFF);
  static const Color primaryLight = Color(0xFFEFF6EE); // Sage Mint Tint Container #EFF6EE
  static const Color mintBackground = Color(0xFFEFF6EE); // Sage Mint Tint Container #EFF6EE
  static const Color surfaceSecondary = Color(0xFFEFF6EE);
  static const Color backgroundCard = Color(0xFFFFFFFF);
  static const Color surfaceDisabled = Color(0xFFF1F5F9);
  static const Color surfaceMuted = Color(0xFFF8FAFC);
  static const Color border = Color(0xFFE2E8F0); // Subtle Border #E2E8F0
  static const Color dividerAqua = Color(0xFFA4D4D8); // Soft Aqua Divider #A4D4D8

  // Header & Menu Background
  static const Color menuBackground = Color(0xFF004890); // Header & Menu

  // Gradients
  // Green Action Gradient (Dòng chảy bạch huyết Vodder)
  static const LinearGradient greenActionGradient = LinearGradient(
    colors: [Color(0xFF1B7A4B), Color(0xFF208C58)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Brand Gradient: Xanh dương chính chuyển tiếp sang Xanh da trời phụ
  static const LinearGradient brandGradient = LinearGradient(
    colors: [Color(0xFF004890), Color(0xFF0EA5E9)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Soft Hero Gradient
  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF004890), Color(0xFF0284C7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Text & Typography
  static const Color textHeading = Color(0xFF004890); // Medical Navy Heading #004890
  static const Color textPrimary = Color(0xFF344454); // Slate Charcoal Body #344454 (Chống mỏi mắt)
  static const Color textSecondary = Color(0xFF607080); // Muted Steel Gray #607080
  static const Color textPlaceholder = Color(0xFF94A3B8); // Slate Placeholder #94A3B8
  static const Color textInverse = Color(0xFFFFFFFF); // White text

  // Status & Utility Accents
  static const Color success = Color(0xFF208C58);
  static const Color error = Color(0xFFEF4444);
  static const Color errorDark = Color(0xFFB91C1C);

  // Price Colors (Phân định màu sắc giá tiền chuyên biệt)
  // Khóa học: Xanh lá bạch huyết chuẩn Vodder #208C58
  static const Color coursePrice = Color(0xFF208C58);
  // Dịch vụ: Đỏ hồng Rose nổi bật #E11D48
  static const Color servicePrice = Color(0xFFE11D48);
}
