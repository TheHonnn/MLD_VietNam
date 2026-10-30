import 'package:flutter/material.dart';
import 'e01_academy_home_screen.dart';

/// Trang Khám phá khóa học đã được hợp nhất hoàn toàn vào Trang Đào tạo chuẩn duy nhất (E01AcademyHomeScreen).
/// Toàn bộ luồng điều hướng được chuyển tiếp trực tiếp sang E01AcademyHomeScreen.
class E02CourseCatalogScreen extends StatelessWidget {
  final String? initialCategory;
  final String? initialNeed;
  final String? initialSearchQuery;

  const E02CourseCatalogScreen({
    super.key,
    this.initialCategory,
    this.initialNeed,
    this.initialSearchQuery,
  });

  @override
  Widget build(BuildContext context) {
    return E01AcademyHomeScreen(
      initialGroup: initialCategory,
      initialNeed: initialNeed,
      initialSearchQuery: initialSearchQuery,
      onBackToHome: Navigator.canPop(context) ? () => Navigator.pop(context) : null,
    );
  }
}
