import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../motion/app_page_transitions.dart';

class AppTheme {
  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.beVietnamProTextTheme();

    return ThemeData(
      useMaterial3: true,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: MldPageTransitionsBuilder(),
          TargetPlatform.iOS: MldPageTransitionsBuilder(),
          TargetPlatform.windows: MldPageTransitionsBuilder(),
          TargetPlatform.macOS: MldPageTransitionsBuilder(),
          TargetPlatform.linux: MldPageTransitionsBuilder(),
        },
      ),
      fontFamily: GoogleFonts.beVietnamPro().fontFamily,
      fontFamilyFallback: const ['Be Vietnam Pro', 'sans-serif'],
      scaffoldBackgroundColor: Colors.white,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: AppColors.primary,
        onPrimary: AppColors.textInverse,
        primaryContainer: Color(0xFFEFF6FF),
        onPrimaryContainer: AppColors.primary,
        secondary: Color(0xFF0EA5E9),
        onSecondary: AppColors.textInverse,
        secondaryContainer: Color(0xFFDEEAF6),
        onSecondaryContainer: Color(0xFF144874),
        surface: Colors.white,
        onSurface: Color(0xFF0F172A),
        error: AppColors.error,
        onError: AppColors.textInverse,
        outline: Colors.transparent, // Hạn chế viền
      ),
      textTheme: baseTextTheme.copyWith(
        displayLarge: baseTextTheme.displayLarge?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
        ),
        displayMedium: baseTextTheme.displayMedium?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
        ),
        displaySmall: baseTextTheme.displaySmall?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
        ),
        headlineLarge: baseTextTheme.headlineLarge?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
          fontSize: 22,
        ),
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
          fontSize: 18,
        ),
        headlineSmall: baseTextTheme.headlineSmall?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
          fontSize: 16,
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
          fontSize: 16,
        ),
        titleMedium: baseTextTheme.titleMedium?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
          fontSize: 14.5,
        ),
        titleSmall: baseTextTheme.titleSmall?.copyWith(
          color: const Color(0xFF0F172A),
          fontWeight: FontWeight.w600,
          fontSize: 13.5,
        ),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(
          color: const Color(0xFF0F172A),
          fontSize: 14,
          height: 1.45,
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(
          color: const Color(0xFF334155),
          fontSize: 13,
          height: 1.45,
        ),
        bodySmall: baseTextTheme.bodySmall?.copyWith(
          color: const Color(0xFF64748B),
          fontSize: 11.5,
          height: 1.4,
        ),
        labelLarge: baseTextTheme.labelLarge?.copyWith(
          color: const Color(0xFF0F172A),
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
        labelMedium: baseTextTheme.labelMedium?.copyWith(
          color: const Color(0xFF64748B),
          fontSize: 12,
        ),
        labelSmall: baseTextTheme.labelSmall?.copyWith(
          color: const Color(0xFF64748B),
          fontSize: 11,
          letterSpacing: 0.2,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: AppColors.primary),
        titleTextStyle: GoogleFonts.beVietnamPro(
          color: AppColors.primary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary, // 30% Brand Navy
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFFCBD5E1),
          disabledForegroundColor: const Color(0xFF94A3B8),
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
          textStyle: GoogleFonts.beVietnamPro(
            fontSize: 14.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      // MẶC ĐỊNH CARD: KHÔNG VIỀN, BO GÓC 16px, ĐỒNG BỘ 6-3-1
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide.none,
        ),
        margin: const EdgeInsets.symmetric(vertical: 8),
      ),
      // MẶC ĐỊNH INPUT: KHÔNG VIỀN, BO GÓC 16px, ĐỔ BÓNG MỎNG
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.0),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        hintStyle: GoogleFonts.beVietnamPro(
          color: const Color(0xFF94A3B8),
          fontSize: 13.5,
        ),
        labelStyle: GoogleFonts.beVietnamPro(
          color: const Color(0xFF64748B),
          fontSize: 13.5,
        ),
      ),
    );
  }
}
