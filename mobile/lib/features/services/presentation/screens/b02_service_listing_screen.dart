import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import 'b03_service_detail_screen.dart';
import '../../../home/presentation/screens/b04_search_screen.dart';

class B02ServiceListingScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const B02ServiceListingScreen({
    super.key,
    this.onBack,
  });

  @override
  State<B02ServiceListingScreen> createState() => _B02ServiceListingScreenState();
}

class _B02ServiceListingScreenState extends State<B02ServiceListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  int _selectedCategoryIndex = 0;
  String _selectedSort = 'Phổ biến ';
  final Set<int> _favoriteServices = {0}; // Service 0 is favorite by default per Figma

  final List<String> _categories = [
    'Tất cả',
    'Massage',
    'Chăm sóc da',
    'Chăm sóc cơ thể',
    'Thư giãn',
    'Gói liệu trình',
  ];

  final List<Map<String, dynamic>> _allServices = [
    {
      'id': 0,
      'title': 'Massage thư giãn toàn thân',
      'duration': '60 phút',
      'price': '450.000đ',
      'priceRaw': 450000,
      'description': 'Thả lỏng cơ thể trong không gian yên tĩnh.',
      'image': 'assets/images/gioithieu_1.png',
      'category': 'Massage',
    },
    {
      'id': 1,
      'title': 'Chăm sóc da chuyên sâu',
      'duration': '90 phút',
      'price': '650.000đ',
      'priceRaw': 650000,
      'description': 'Chăm sóc làn da với quy trình nhẹ nhàng, chu đáo.',
      'image': 'assets/images/gioithieu_2.png',
      'category': 'Chăm sóc da',
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredServices {
    final query = _searchController.text.toLowerCase().trim();
    return _allServices.where((service) {
      final matchesQuery = query.isEmpty ||
          (service['title'] as String).toLowerCase().contains(query) ||
          (service['description'] as String).toLowerCase().contains(query);

      final matchesCategory = _selectedCategoryIndex == 0 ||
          service['category'] == _categories[_selectedCategoryIndex] ||
          (_selectedCategoryIndex == 1 && service['category'] == 'Massage') ||
          (_selectedCategoryIndex == 2 && service['category'] == 'Chăm sóc da');

      return matchesQuery && matchesCategory;
    }).toList();
  }

  void _showSortPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final sortOptions = [
          'Phổ biến ',
          'Giá: Thấp đến cao',
          'Giá: Cao đến thấp',
          'Thời lượng ngắn nhất',
        ];
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Sắp xếp theo',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 12),
                ...sortOptions.map(
                  (option) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      option,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: _selectedSort == option ? FontWeight.w600 : FontWeight.w400,
                        color: _selectedSort == option ? AppColors.primary : AppColors.textPrimary,
                      ),
                    ),
                    trailing: _selectedSort == option
                        ? const Icon(Icons.check, color: AppColors.primary)
                        : null,
                    onTap: () {
                      setState(() {
                        _selectedSort = option;
                      });
                      Navigator.pop(context);
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showFilterModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Bộ lọc dịch vụ',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.textSecondary),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text(
                  'Danh mục',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(_categories.length, (index) {
                    final isSel = _selectedCategoryIndex == index;
                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedCategoryIndex = index;
                        });
                        Navigator.pop(context);
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSel ? AppColors.primary : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSel ? AppColors.primary : AppColors.border,
                          ),
                        ),
                        child: Text(
                          _categories[index],
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSel ? FontWeight.w600 : FontWeight.w400,
                            color: isSel ? AppColors.textInverse : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: const Text(
                      'Áp dụng bộ lọc',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textInverse,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final services = _filteredServices;

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. HEADER (Title & Subtitle) ---
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (widget.onBack != null)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: AppColors.textHeading),
                        onPressed: widget.onBack,
                      ),
                    ),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Dịch vụ chăm sóc',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w600,
                            height: 36.40 / 28,
                            color: AppColors.textHeading, // #693B20
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Khám phá dịch vụ phù hợp với nhu cầu của bạn.',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            height: 20 / 14,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // --- 2. SEARCH BAR ---
              Row(
                children: [
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const B04SearchScreen()),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
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
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          hintText: 'Tìm dịch vụ chăm sóc...',
                          hintStyle: TextStyle(
                            fontSize: 15,
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

              const SizedBox(height: 16),

              // --- 3. CATEGORY CHIPS (Horizontal Scrollable) ---
              SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final isSelected = _selectedCategoryIndex == index;
                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedCategoryIndex = index;
                        });
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.border,
                            width: 1.0,
                          ),
                        ),
                        child: Text(
                          _categories[index],
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            color: isSelected ? AppColors.textInverse : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // --- 4. FILTER & SORT ROW ---
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Button "Bộ lọc"
                  InkWell(
                    onTap: _showFilterModal,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      height: 52,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: const Row(
                        children: [
                          Icon(Icons.tune_rounded, size: 20, color: AppColors.primary),
                          SizedBox(width: 6),
                          Text(
                            'Bộ lọc',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Dropdown "Sắp xếp theo"
                  Expanded(
                    child: InkWell(
                      onTap: _showSortPicker,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        height: 52,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Sắp xếp theo',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _selectedSort,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 18,
                                  color: AppColors.textSecondary,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // --- 5. RESULT COUNT ---
              Text(
                '${services.length} dịch vụ phù hợp',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading,
                ),
              ),

              const SizedBox(height: 16),

              // --- 6. SERVICE CARDS LIST ---
              ...services.map((service) {
                final int id = service['id'] as int;
                final bool isFav = _favoriteServices.contains(id);

                return Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Image with Favorite Button
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                            child: SizedBox(
                              width: double.infinity,
                              height: 180,
                              child: Image.asset(
                                service['image'] as String,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  color: AppColors.surfaceSecondary,
                                  child: const Center(
                                    child: Icon(Icons.spa, size: 48, color: AppColors.primary),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          // Favorite Button
                          Positioned(
                            top: 12,
                            right: 12,
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  if (isFav) {
                                    _favoriteServices.remove(id);
                                  } else {
                                    _favoriteServices.add(id);
                                  }
                                });
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.1),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                alignment: Alignment.center,
                                child: Icon(
                                  isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                  color: isFav ? AppColors.primary : AppColors.textSecondary,
                                  size: 22,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Card Content
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Title
                            Text(
                              service['title'] as String,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textHeading,
                              ),
                            ),
                            const SizedBox(height: 6),

                            // Duration & Price
                            Row(
                              children: [
                                Text(
                                  service['duration'] as String,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  service['price'] as String,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Description
                            Text(
                              service['description'] as String,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w400,
                                height: 20 / 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Button "Xem chi tiết"
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary, width: 1.2),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  foregroundColor: AppColors.primary,
                                ),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => B03ServiceDetailScreen(
                                        serviceId: id,
                                        title: service['title'] as String,
                                        duration: service['duration'] as String,
                                        price: service['price'] as String,
                                        category: service['category'] as String,
                                        image: service['image'] as String,
                                        description: service['description'] as String,
                                      ),
                                    ),
                                  );
                                },
                                child: const Text(
                                  'Xem chi tiết',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 10),

              // --- 7. DISCLAIMER FOOTNOTE ---
              const Center(
                child: Text(
                  'Danh sách dịch vụ chăm sóc nổi bật',
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
}
