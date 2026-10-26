import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.montserratTextTheme();

    return ThemeData(
      useMaterial3: true,
      fontFamily: GoogleFonts.montserrat().fontFamily,
      fontFamilyFallback: const ['Montserrat', 'sans-serif'],
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: AppColors.primary,
        onPrimary: AppColors.textInverse,
        primaryContainer: AppColors.mintBackground,
        onPrimaryContainer: AppColors.primaryDark,
        secondary: AppColors.secondary,
        onSecondary: AppColors.textInverse,
        secondaryContainer: AppColors.mintBackground,
        onSecondaryContainer: AppColors.secondary,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
        error: AppColors.error,
        onError: AppColors.textInverse,
        outline: AppColors.border,
      ),
      textTheme: baseTextTheme.copyWith(
        displayLarge: baseTextTheme.displayLarge?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        displayMedium: baseTextTheme.displayMedium?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        displaySmall: baseTextTheme.displaySmall?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        headlineLarge: baseTextTheme.headlineLarge?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        headlineSmall: baseTextTheme.headlineSmall?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          color: AppColors.textHeading,
          fontWeight: FontWeight.w700,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        titleMedium: baseTextTheme.titleMedium?.copyWith(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        titleSmall: baseTextTheme.titleSmall?.copyWith(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(
          color: AppColors.textPrimary,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(
          color: AppColors.textPrimary,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        bodySmall: baseTextTheme.bodySmall?.copyWith(
          color: AppColors.textSecondary,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        labelLarge: baseTextTheme.labelLarge?.copyWith(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        labelMedium: baseTextTheme.labelMedium?.copyWith(
          color: AppColors.textSecondary,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
        labelSmall: baseTextTheme.labelSmall?.copyWith(
          color: AppColors.textSecondary,
          fontFamilyFallback: const ['Montserrat', 'sans-serif'],
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          fontFamily: 'Montserrat',
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textInverse,
          disabledBackgroundColor: AppColors.border,
          disabledForegroundColor: AppColors.textPlaceholder,
          minimumSize: const Size(0, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14), // Rule: 12-16px
          ),
          elevation: 0,
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            fontFamily: 'Montserrat',
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14), // Rule: 12-16px
          side: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        margin: const EdgeInsets.symmetric(vertical: 8),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14), // Rule: 12-16px
          borderSide: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error, width: 1.0),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        hintStyle: const TextStyle(
          color: AppColors.textPlaceholder,
          fontSize: 14,
          fontFamily: 'Montserrat',
        ),
        labelStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
          fontFamily: 'Montserrat',
        ),
      ),
    );
  }
}