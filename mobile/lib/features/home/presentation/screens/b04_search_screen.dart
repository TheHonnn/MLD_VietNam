import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../directory/presentation/screens/b07_specialist_listing_screen.dart';
import '../../../academy/presentation/screens/e01_academy_home_screen.dart';

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
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. BACK BUTTON ---
              InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.arrow_back_ios_new_rounded,
                    color: AppColors.textPrimary,
                    size: 18,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 2. TITLE ---
              Text(
                context.tr('Bạn đang tìm kiếm\nđiều gì?', 'What are you\nlooking for?'),
                style: const TextStyle(
                  
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 20),

              // --- 3. SEARCH BAR - BỎ VIỀN, NỔI BẬT KHỐI ---
              Container(
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.centerLeft,
                child: TextField(
                  controller: _searchController,
                  onSubmitted: _onSearchSubmit,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                    hintText: context.tr('Tìm dịch vụ, khóa học, chuyên viên...', 'Search services, courses, specialists...'),
                    hintStyle: const TextStyle(
                      fontSize: 13.5,
                      color: AppColors.textPlaceholder,
                      fontWeight: FontWeight.w400,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
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
                  child: Text(
                    context.tr('Xóa tìm kiếm', 'Clear search'),
                    style: const TextStyle(
                      
                      fontSize: 13.5,
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
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const E01AcademyHomeScreen()));
                      } else if (chip == 'Dịch vụ') {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()));
                      }
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Text(
                        _typeChips[index].tr(context),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  );
                }),
              ),

              const SizedBox(height: 28),

              // --- 5. TÌM KIẾM GẦN ĐÂY ---
              if (_recentSearches.isNotEmpty) ...[
                Text(
                  context.tr('Tìm kiếm gần đây', 'Recent Searches'),
                  style: const TextStyle(
                    
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
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
                                search.tr(context),
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
              Text(
                context.tr('Tìm kiếm phổ biến', 'Popular Searches'),
                style: const TextStyle(
                  
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _popularSearches.map((query) {
                  return InkWell(
                    onTap: () => _onSearchSubmit(query),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Text(
                        query.tr(context),
                        style: const TextStyle(
                          
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 28),

              // --- 7. KHÁM PHÁ THEO NHU CẦU ---
              Text(
                context.tr('Khám phá theo nhu cầu', 'Explore by Category'),
                style: const TextStyle(
                  
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              _buildDiscoveryRow(
                icon: Icons.spa_outlined,
                title: context.tr('Dịch vụ thư giãn', 'Relaxation Services'),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()),
                ),
              ),
              _buildDiscoveryRow(
                icon: Icons.school_outlined,
                title: context.tr('Khóa học nghề spa', 'Spa Vocational Courses'),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const E01AcademyHomeScreen()),
                ),
              ),
              _buildDiscoveryRow(
                icon: Icons.store_mall_directory_outlined,
                title: context.tr('Hệ thống chi nhánh', 'Branch Network'),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B05BranchListingScreen()),
                ),
              ),
              _buildDiscoveryRow(
                icon: Icons.people_outline_rounded,
                title: context.tr('Đội ngũ chuyên viên', 'Specialist Team'),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const B07SpecialistListingScreen()),
                ),
              ),

              const SizedBox(height: 24),

              // --- 8. FOOTNOTE ---
              Center(
                child: Text(
                  context.tr('Tìm kiếm dịch vụ, chuyên viên hoặc chi nhánh', 'Search services, specialists or branches'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    
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
                  
                  fontSize: 14.5,
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

