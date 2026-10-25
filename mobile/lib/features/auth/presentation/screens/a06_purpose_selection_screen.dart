import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import '../../widgets/primary_button.dart';

class A06PurposeSelectionScreen extends StatefulWidget {
  const A06PurposeSelectionScreen({super.key});

  @override
  State<A06PurposeSelectionScreen> createState() => _A06PurposeSelectionScreenState();
}

class _A06PurposeSelectionScreenState extends State<A06PurposeSelectionScreen> {
  int _selectedIndex = -1; // Mặc định chưa chọn, người dùng tự lựa chọn
  bool _isLoading = false;

  final List<Map<String, dynamic>> _purposes = [
    {
      'title': 'Chăm sóc sức khỏe',
      'description':
          'Đặt lịch spa, chăm sóc cơ thể, theo dõi liệu trình và nhận ưu đãi.',
      'icon': Icons.spa_rounded,
    },
    {
      'title': 'Học nghề Spa',
      'description':
          'Khám phá khóa học, đăng ký đào tạo và theo dõi quá trình học tập.',
      'icon': Icons.school_rounded,
    },
    {
      'title': 'Cả hai',
      'description':
          'Trải nghiệm đầy đủ dịch vụ chăm sóc sắc đẹp và chương trình đào tạo nghề.',
      'icon': Icons.auto_awesome_rounded,
    },
  ];

  void _handleFinish() {
    if (_selectedIndex == -1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn nhu cầu của bạn để tiếp tục')),
      );
      return;
    }
    setState(() {
      _isLoading = true;
    });

    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        final int initialTab = _selectedIndex == 1 ? 3 : 0;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (_) => MainLayoutScreen(initialIndex: initialTab),
          ),
          (route) => false,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // --- BACK BUTTON ---
                        InkWell(
                          onTap: () => Navigator.pop(context),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.surface, // white
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppColors.border, // #E3D1BF
                                width: 1.0,
                              ),
                            ),
                            child: const Icon(
                              Icons.arrow_back_rounded,
                              size: 20,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),

                        // --- TIÊU ĐỀ VÀ MÔ TẢ ---
                        const Text(
                          'Bạn quan tâm đến điều gì?',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w600,
                            height: 36.40 / 28,
                            color: AppColors.textHeading, // #693B20
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Chọn nhu cầu của bạn để chúng tôi mang đến trải nghiệm phù hợp nhất.',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            height: 23.25 / 15,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),

                        const SizedBox(height: 24),

                        // --- DANH SÁCH NHU CẦU (ChoiceCards, r=20) ---
                        Column(
                          children: List.generate(_purposes.length, (index) {
                            final bool isSelected = _selectedIndex == index;
                            final item = _purposes[index];

                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedIndex = index;
                                });
                              },
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 14.0),
                                padding: const EdgeInsets.all(16.0),
                                decoration: BoxDecoration(
                                  // Selected: nền #F3E2CE, viền #985018; Unselected: nền white, viền #E3D1BF
                                  color: isSelected
                                      ? AppColors.surfaceSecondary // #F3E2CE
                                      : AppColors.surface, // white
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected
                                        ? AppColors.primary // #985018
                                        : AppColors.border, // #E3D1BF
                                    width: 1.2,
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Icon Box (44x44, r=12)
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: isSelected ? Colors.white : AppColors.surfaceSecondary,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        item['icon'] as IconData,
                                        color: AppColors.primary, // #985018
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),

                                    // Content
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.center,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  item['title'] as String,
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                    color: AppColors.textPrimary, // #40352F
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              // Radio check tròn 20x20
                                              Container(
                                                width: 20,
                                                height: 20,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  color: isSelected
                                                      ? AppColors.primary // #985018
                                                      : Colors.white,
                                                  border: Border.all(
                                                    color: isSelected
                                                        ? AppColors.primary
                                                        : AppColors.border,
                                                    width: 1.5,
                                                  ),
                                                ),
                                                child: isSelected
                                                    ? const Icon(
                                                        Icons.check,
                                                        size: 13,
                                                        color: Colors.white,
                                                      )
                                                    : null,
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            item['description'] as String,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w400,
                                              height: 1.45,
                                              color: AppColors.textSecondary, // #6B6158
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),

                    // --- PHẦN DƯỚI: Ghi chú & Nút "Khám phá ứng dụng" (56px, r=14) ---
                    Padding(
                      padding: const EdgeInsets.only(top: 16.0, bottom: 8.0),
                      child: Column(
                        children: [
                          const Center(
                            child: Text(
                              'Bạn có thể thay đổi lựa chọn này trong hồ sơ.',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textSecondary, // #6B6158
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          PrimaryButton(
                            text: 'Khám phá ứng dụng',
                            isLoading: _isLoading,
                            onPressed: _handleFinish,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
