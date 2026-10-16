import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import 'a03_login_screen.dart';

class A02OnboardingScreen extends StatefulWidget {
  const A02OnboardingScreen({super.key});

  @override
  State<A02OnboardingScreen> createState() => _A02OnboardingScreenState();
}

class _A02OnboardingScreenState extends State<A02OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<Map<String, String>> _slides = [
    {
      'title': 'Chăm sóc sức khỏe mỗi ngày',
      'description':
          'Trải nghiệm các dịch vụ spa, thư giãn và chăm sóc sức khỏe chuyên nghiệp.',
      'image': 'assets/images/gioithieu_1.png',
    },
    {
      'title': 'Chăm sóc da & Trị liệu chuyên sâu',
      'description':
          'Nhật ký chăm sóc cá nhân hóa, đặt lịch liệu trình nhẹ nhàng chu đáo.',
      'image': 'assets/images/gioithieu_2.png',
    },
    {
      'title': 'Đào tạo nghề y tế & Spa chuẩn mực',
      'description':
          'Khám phá các khóa học chuyên môn, cấp chứng chỉ hành nghề và phát triển sự nghiệp.',
      'image': 'assets/images/gioithieu_3.png',
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onNext() {
    if (_currentIndex < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _navigateToLogin();
    }
  }

  void _onPrevious() {
    if (_currentIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    }
  }

  void _navigateToLogin() async {
    await AuthService.instance.setCompletedOnboarding(true);
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const A03LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: GestureDetector(
          onHorizontalDragEnd: (details) {
            if (details.primaryVelocity != null) {
              if (details.primaryVelocity! < -100) {
                _onNext();
              } else if (details.primaryVelocity! > 100) {
                _onPrevious();
              }
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // --- 1. TOP BAR (height: 48px, cố định) ---
                SizedBox(
                  height: 48,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Expanded(
                        child: Text(
                          'CHĂM SÓC & PHÁT TRIỂN',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            height: 18.60 / 12,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: _navigateToLogin,
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          height: 44,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Text(
                            'Bỏ qua',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary, // #985018
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Đưa hình ảnh xuống một chút (24px)
                const SizedBox(height: 24),

                // --- 2. THẺ ẢNH TỈ LỆ 100% (VUÔNG 1:1) ---
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(64),
                    topRight: Radius.circular(20),
                    bottomRight: Radius.circular(20),
                    bottomLeft: Radius.circular(20),
                  ),
                  child: AspectRatio(
                    aspectRatio: 1.0, // Tỉ lệ 1:1 chuẩn 100%
                    child: PageView.builder(
                      controller: _pageController,
                      itemCount: _slides.length,
                      onPageChanged: (index) {
                        setState(() {
                          _currentIndex = index;
                        });
                      },
                      itemBuilder: (context, index) {
                        final slide = _slides[index];
                        return Image.asset(
                          slide['image']!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          height: double.infinity,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.surfaceSecondary,
                            child: const Center(
                              child: Icon(
                                Icons.spa_rounded,
                                size: 64,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),

                // Khoảng cách giữa ảnh và thanh điều hướng tách nhẹ 1 chút (20px)
                const SizedBox(height: 20),

                // --- 3. BIỂU TƯỢNG ĐIỀU HƯỚNG LƯỚT (CỐ ĐỊNH VỊ TRÍ, KHÔNG TRƯỢT THEO ẢNH) ---
                SizedBox(
                  height: 24,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(
                      _slides.length,
                      (dotIndex) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        margin: EdgeInsets.only(
                          right: dotIndex < _slides.length - 1 ? 8.0 : 0.0,
                        ),
                        width: _currentIndex == dotIndex ? 24.0 : 8.0,
                        height: 8.0,
                        decoration: BoxDecoration(
                          color: _currentIndex == dotIndex
                              ? AppColors.primary // #985018
                              : AppColors.border, // #E3D1BF
                          borderRadius: BorderRadius.circular(100),
                        ),
                      ),
                    ),
                  ),
                ),

                // Đưa dòng chữ xuống một chút, tách nhẹ so với thanh điều hướng (16px)
                const SizedBox(height: 16),

                // --- 4. TIÊU ĐỀ VÀ MÔ TẢ (NÂNG LÊN CÙNG ĐÁY ẢNH) ---
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: SizedBox(
                    key: ValueKey<int>(_currentIndex),
                    width: double.infinity,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _slides[_currentIndex]['title']!,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w600,
                            height: 36.40 / 28,
                            color: AppColors.textHeading, // #693B20
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          _slides[_currentIndex]['description']!,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            height: 23.25 / 15,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Khoảng đệm tự nhiên giữa phần nội dung được nâng lên và khung nút tiếp tục
                const Spacer(),

                // --- 5. KHUNG TIẾP TỤC GIỮ NGUYÊN (height: 56px) ---
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary, // #985018
                      foregroundColor: AppColors.textInverse, // #FFFFFF
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    onPressed: _onNext,
                    child: Text(
                      _currentIndex == _slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp tục',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textInverse,
                      ),
                    ),
                  ),
                ),

                // Khung tiếp tục giữ nguyên khoảng cách cách đáy màn hình (28px)
                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
