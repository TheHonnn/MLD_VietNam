import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';

/// Hệ thống Typography chuẩn font chữ Zalo (Roboto UI / Vietnamese diacritics)
/// Đồng bộ 100% hiển thị tiếng Việt sắc nét, tròn đều, hiện đại như Zalo.
class AppTypography {
  AppTypography._();

  /// Hàm tạo TextStyle chuẩn font Zalo (Roboto) với cấu hình linh hoạt
  static TextStyle zaloFont({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? height,
    double? letterSpacing,
    TextDecoration? decoration,
    Color? decorationColor,
    FontStyle? fontStyle,
  }) {
    return GoogleFonts.roboto(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? AppColors.textHeading,
      height: height,
      letterSpacing: letterSpacing,
      decoration: decoration,
      decorationColor: decorationColor,
      fontStyle: fontStyle,
    );
  }

  /// Tiêu đề cực lớn (Page header, Dashboard hero)
  static TextStyle headingLarge({
    Color? color,
    FontWeight fontWeight = FontWeight.w700,
  }) {
    return zaloFont(
      fontSize: 20,
      fontWeight: fontWeight,
      color: color ?? AppColors.textHeading,
      height: 1.3,
    );
  }

  /// Tiêu đề vừa (Card title, Section header)
  static TextStyle headingMedium({
    Color? color,
    FontWeight fontWeight = FontWeight.w700,
  }) {
    return zaloFont(
      fontSize: 16,
      fontWeight: fontWeight,
      color: color ?? AppColors.textHeading,
      height: 1.3,
    );
  }

  /// Tiêu đề nhỏ (Sub-section, Item title)
  static TextStyle title({
    Color? color,
    FontWeight fontWeight = FontWeight.w600,
    double fontSize = 14,
  }) {
    return zaloFont(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? AppColors.textHeading,
      height: 1.35,
    );
  }

  /// Văn bản chính (Body text)
  static TextStyle body({
    Color? color,
    FontWeight fontWeight = FontWeight.w400,
    double fontSize = 13,
    double height = 1.45,
  }) {
    return zaloFont(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? AppColors.textPrimary,
      height: height,
    );
  }

  /// Văn bản phụ / chú thích (Caption / Secondary)
  static TextStyle caption({
    Color? color,
    FontWeight fontWeight = FontWeight.w500,
    double fontSize = 11.5,
  }) {
    return zaloFont(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? AppColors.textSecondary,
      height: 1.35,
    );
  }

  /// Nhãn nút bấm (Button / Action text)
  static TextStyle button({
    Color? color,
    FontWeight fontWeight = FontWeight.w600,
    double fontSize = 13,
  }) {
    return zaloFont(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? Colors.white,
      letterSpacing: 0.2,
    );
  }

  /// Toàn bộ TextTheme chuẩn Zalo (Roboto) cho MaterialApp theme
  static TextTheme get zaloTextTheme => GoogleFonts.robotoTextTheme();
}