import 'package:flutter/material.dart';
import 'e01_academy_home_screen.dart';

/// Trang Khám phá khóa học đã được hợp nhất hoàn toàn vào Trang Đào tạo chuẩn duy nhất (E01AcademyHomeScreen).
/// Toàn bộ luồng điều hướng được chuyển tiếp trực tiếp sang E01AcademyHomeScreen.
class E02CourseCatalogScreen extends StatelessWidget {
  final String? initialCategory;

  const E02CourseCatalogScreen({super.key, this.initialCategory});

  @override
  Widget build(BuildContext context) {
    return E01AcademyHomeScreen(
      initialGroup: initialCategory,
      onBackToHome: Navigator.canPop(context) ? () => Navigator.pop(context) : null,
    );
  }
}
