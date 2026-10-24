import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../directory/presentation/screens/b07_specialist_listing_screen.dart';
import '../../../academy/presentation/screens/e02_course_catalog_screen.dart';

class B04SearchScreen extends StatefulWidget {
  const B04SearchScreen({super.key});

  @override
  State<B04SearchScreen> createState() => _B04SearchScreenState();
}

class _B04SearchScreenState extends State<B04SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  int _selectedChipIndex = 0;

  final List<String> _typeChips = [
    'Tất cả',
    'Dịch vụ',
    'Khóa học',
    'Chi nhánh',
    'Chuyên viên',
  ];

  final List<String> _recentSearches = [
    'Massage thư giãn',
    'Chăm sóc da',
  ];

  final List<String> _popularSearches = [
    'Massage thư giãn',
    'Chăm sóc da',
    'Khóa học spa cơ bản',
    'Chi nhánh gần tôi',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchSubmit(String query) {
    if (query.trim().isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => B02ServiceListingScreen(
          initialQuery: query.trim(),
          onBack: () => Navigator.pop(context),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. BACK BUTTON ---
              InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.arrow_back,
                    color: AppColors.textPrimary,
                    size: 22,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 2. TITLE ---
              const Text(
                'Bạn đang tìm kiếm\nđiều gì?',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  height: 36.40 / 28,
                  color: AppColors.textHeading, // #693B20
                ),
              ),

              const SizedBox(height: 20),

              // --- 3. SEARCH BAR ---
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.search_rounded,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      height: 52,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      alignment: Alignment.centerLeft,
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: _onSearchSubmit,
                        decoration: const InputDecoration(
                          hintText: 'Tìm dịch vụ, khóa học, chuyên viên...',
                          hintStyle: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w400,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Nút "Xóa tìm kiếm"
              Align(
                alignment: Alignment.center,
                child: TextButton(
                  onPressed: () {
                    setState(() {
                      _searchController.clear();
                    });
                  },
                  child: const Text(
                    'Xóa tìm kiếm',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 8),

              // --- 4. CATEGORY FILTER CHIPS ---
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(_typeChips.length, (index) {
                  final isSelected = _selectedChipIndex == index;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedChipIndex = index;
                      });
                      final chip = _typeChips[index];
                      if (chip == 'Chi nhánh') {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const B05BranchListingScreen()));
                      } else if (chip == 'Chuyên viên') {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const B07SpecialistListingScreen()));
                      } else if (chip == 'Khóa học') {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const E02CourseCatalogScreen()));
                      } else if (chip == 'Dịch vụ') {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()));
                      }
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      child: Text(
                        _typeChips[index],
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: isSelected ? AppColors.textInverse : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  );
                }),
              ),

              const SizedBox(height: 28),

              // --- 5. TÌM KIẾM GẦN ĐÂY ---
              if (_recentSearches.isNotEmpty) ...[
                const Text(
                  'Tìm kiếm gần đây',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 12),
                ..._recentSearches.map(
                  (search) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: () => _onSearchSubmit(search),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.history_rounded,
                                color: AppColors.textSecondary,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Text(
                                search,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textSecondary),
                          onPressed: () {
                            setState(() {
                              _recentSearches.remove(search);
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // --- 6. TÌM KIẾM PHỔ BIẾN ---
              const Text(
                'Tìm kiếm phổ biến',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _popularSearches.map((query) {
                  return InkWell(
                    onTap: () => _onSearchSubmit(query),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        query,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 28),

              // --- 7. KHÁM PHÁ THEO NHU CẦU ---
              const Text(
                'Khám phá theo nhu cầu',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 12),
              _buildDiscoveryRow(
                icon: Icons.spa_outlined,
                title: 'Dịch vụ thư giãn',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()),
                ),
              ),
              _buildDiscoveryRow(
                icon: Icons.school_outlined,
                title: 'Khóa học nghề spa',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Khóa học nghề spa sắp ra mắt!')),
                  );
                },
              ),
              _buildDiscoveryRow(
                icon: Icons.store_mall_directory_outlined,
                title: 'Hệ thống chi nhánh',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B05BranchListingScreen()),
                ),
              ),
              _buildDiscoveryRow(
                icon: Icons.people_outline_rounded,
                title: 'Đội ngũ chuyên viên',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B07SpecialistListingScreen()),
                ),
              ),

              const SizedBox(height: 24),

              // --- 8. FOOTNOTE ---
              const Center(
                child: Text(
                  'Tìm kiếm dịch vụ, chuyên viên hoặc chi nhánh',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDiscoveryRow({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12.0),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.border, width: 0.8)),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 22),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}

