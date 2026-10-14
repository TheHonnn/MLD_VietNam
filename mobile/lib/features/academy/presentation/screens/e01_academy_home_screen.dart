import 'package:flutter/material.dart';
import '../widgets/academy_widgets.dart';
import 'e02_course_catalog_screen.dart';

/// Screen E01: Học viện đào tạo (Màn hình chính) [8116:25004]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E01AcademyHomeScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;

  const E01AcademyHomeScreen({
    super.key,
    this.onBackToHome,
  });

  @override
  State<E01AcademyHomeScreen> createState() => _E01AcademyHomeScreenState();
}

class _E01AcademyHomeScreenState extends State<E01AcademyHomeScreen> {
  final String _selectedBranch = 'Chi nhánh mẫu 01 — Quận 3';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Giới thiệu [8116:25013] (350x92)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'HỌC VIỆN ĐÀO TẠO',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: AcademyColors.primary,
                    ),
                  ),
                  Text(
                    'Dữ liệu minh họa',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: AcademyColors.textSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Học viện đào tạo',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AcademyColors.heading,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Kiến tạo kỹ năng – Phát triển nghề nghiệp',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              // 2. Chào học viên [8116:25019] (350x48)
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: AcademyColors.cardWarm,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text(
                        'MA',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Xin chào, Minh Anh!',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AcademyColors.textPrimary,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Sẵn sàng nâng cao kỹ năng hôm nay?',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AcademyColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Không có thông báo mới'),
                          duration: Duration(seconds: 2),
                        ),
                      );
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
                      child: const Center(
                        child: Icon(
                          Icons.notifications_none_rounded,
                          color: AcademyColors.primary,
                          size: 22,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Chọn cơ sở minh họa [8116:25028] (350x52)
              Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _selectedBranch,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AcademyColors.textPrimary,
                      ),
                    ),
                    const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: Color(0xFF80766E),
                      size: 22,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 4. AcademyHeroBanner / 01 [8116:25032] (350x410)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AcademyColors.cardWarm,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset(
                        'assets/images/academy_hero_classroom.png',
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Image.asset(
                          'assets/images/specialist_hero_1.png',
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'HỌC VIỆN ĐÀO TẠO NGHỀ',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: AcademyColors.primary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Khởi đầu sự nghiệp cùng nghề Spa',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.textPrimary,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Đào tạo thực hành, phát triển kỹ năng và nâng cao năng lực nghề nghiệp.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AcademyColors.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const E02CourseCatalogScreen(),
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: AcademyColors.primary, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Khám phá khóa học',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AcademyColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Chú thích chân trang [8116:25143] (350x18)
              const Center(
                child: Text(
                  'Khóa học, học phí và lịch đào tạo là dữ liệu minh họa.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AcademyColors.textSecondary,
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
