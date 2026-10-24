import 'package:flutter/material.dart';
import '../../data/models/academy_models.dart';
import '../widgets/academy_widgets.dart';
import 'e03_course_detail_screen.dart';

/// Screen E02: Khám phá khóa học [8116:25179]
/// Chuẩn 100% theo bản thiết kế gốc Figma
class E02CourseCatalogScreen extends StatefulWidget {
  final String? initialCategory;

  const E02CourseCatalogScreen({super.key, this.initialCategory});

  @override
  State<E02CourseCatalogScreen> createState() => _E02CourseCatalogScreenState();
}

class _E02CourseCatalogScreenState extends State<E02CourseCatalogScreen> {
  late String _selectedCategory;
  final TextEditingController _searchController = TextEditingController();

  String _selectedLevel = 'Tất cả';
  String _selectedDuration = 'Tất cả';
  String _selectedFeeRange = 'Tất cả';
  String _selectedFormat = 'Tất cả';
  String _selectedBranch = 'Tất cả';

  final List<String> _categories = [
    'Tất cả',
    'Massage',
    'Chăm sóc da',
    'Kỹ thuật chuyên sâu',
    'Quản lý Spa',
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'Tất cả';
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<CourseModel> get _filteredCourses {
    return MockAcademyData.courses.where((course) {
      if (_selectedCategory != 'Tất cả' && course.category != _selectedCategory) {
        return false;
      }
      if (_selectedLevel != 'Tất cả' && course.level != _selectedLevel) {
        return false;
      }
      if (_selectedDuration != 'Tất cả') {
        if (_selectedDuration == 'Dưới 8 tuần' && course.durationWeeks >= 8) {
          return false;
        } else if (_selectedDuration == '6–12 tuần' && (course.durationWeeks < 6 || course.durationWeeks > 12)) {
          return false;
        } else if (_selectedDuration == 'Trên 12 tuần' && course.durationWeeks <= 12) {
          return false;
        }
      }
      if (_selectedFeeRange != 'Tất cả') {
        if (_selectedFeeRange == 'Dưới 4 triệu' && course.tuitionFee >= 4000000) {
          return false;
        } else if ((_selectedFeeRange == '4–9 triệu đồng' || _selectedFeeRange == '4–9 triệu') &&
            (course.tuitionFee < 4000000 || course.tuitionFee > 9000000)) {
          return false;
        } else if (_selectedFeeRange == 'Trên 9 triệu' && course.tuitionFee <= 9000000) {
          return false;
        }
      }
      if (_selectedBranch != 'Tất cả' && course.branch != _selectedBranch) {
        return false;
      }
      if (_searchController.text.trim().isNotEmpty) {
        final query = _searchController.text.trim().toLowerCase();
        final matchTitle = course.title.toLowerCase().contains(query);
        final matchDesc = course.description.toLowerCase().contains(query);
        final matchInst = course.instructorName.toLowerCase().contains(query);
        if (!matchTitle && !matchDesc && !matchInst) return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Giới thiệu [8116:25184]
            const Text(
              'Khám phá khóa học',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Chọn chương trình đào tạo phù hợp với mục tiêu nghề nghiệp của bạn.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // 2. Tìm khóa học (Chuẩn Figma: Ô icon kính lúp riêng + Ô nhập riêng) [8116:25191]
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.search,
                      color: AcademyColors.primary,
                      size: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 52,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                    ),
                    child: Center(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          hintText: 'Tìm khóa học, kỹ năng hoặc chuyên ngành...',
                          hintStyle: TextStyle(
                            fontSize: 14,
                            color: AcademyColors.textSecondary,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 3. Khung danh mục (CourseCategoryChip r=12) [8116:25195]
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: _categories.map((cat) {
                  final isSelected = _selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () => setState(() => _selectedCategory = cat),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AcademyColors.primary : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AcademyColors.primary : AcademyColors.cardBorder,
                            width: 1.0,
                          ),
                        ),
                        child: Text(
                          cat,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: isSelected ? Colors.white : AcademyColors.textPrimary,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 24),

            // 4. Bộ lọc trực tiếp: "Tinh chỉnh chương trình" (Chuẩn Figma 5 ô dropdown) [8116:25203]
            const Text(
              'Tinh chỉnh chương trình',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AcademyColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            // Row 1: Trình độ + Thời lượng
            Row(
              children: [
                Expanded(
                  child: _buildFilterDropdown(
                    label: 'Trình độ',
                    value: _selectedLevel,
                    items: const ['Tất cả', 'Cơ bản', 'Chuyên nghiệp', 'Quản lý'],
                    onChanged: (val) => setState(() => _selectedLevel = val!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildFilterDropdown(
                    label: 'Thời lượng',
                    value: _selectedDuration,
                    items: const ['Tất cả', 'Dưới 8 tuần', '6–12 tuần', 'Trên 12 tuần'],
                    onChanged: (val) => setState(() => _selectedDuration = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Row 2: Học phí + Hình thức
            Row(
              children: [
                Expanded(
                  child: _buildFilterDropdown(
                    label: 'Học phí',
                    value: _selectedFeeRange,
                    items: const ['Tất cả', 'Dưới 4 triệu', '4–9 triệu đồng', 'Trên 9 triệu'],
                    onChanged: (val) => setState(() => _selectedFeeRange = val!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildFilterDropdown(
                    label: 'Hình thức',
                    value: _selectedFormat,
                    items: const ['Tất cả', 'Học trực tiếp', 'Trực tuyến & thực hành'],
                    onChanged: (val) => setState(() => _selectedFormat = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Row 3: Chi nhánh đào tạo
            _buildFilterDropdown(
              label: 'Chi nhánh đào tạo',
              value: _selectedBranch,
              items: const ['Tất cả', 'Chi nhánh Quận 3', 'Chi nhánh mẫu 02 — Quận 1'],
              onChanged: (val) => setState(() => _selectedBranch = val!),
            ),
            const SizedBox(height: 28),

            // 5. Tiêu đề mục [8116:25215]
            Text(
              '${_filteredCourses.length} chương trình đào tạo',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            const SizedBox(height: 16),

            // 6. Danh sách khóa học
            if (_filteredCourses.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.search_off, size: 48, color: AcademyColors.textSecondary),
                    SizedBox(height: 12),
                    Text(
                      'Không tìm thấy khóa học phù hợp',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AcademyColors.heading,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Vui lòng thử từ khóa khác hoặc thiết lập lại bộ lọc.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: AcademyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _filteredCourses.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final course = _filteredCourses[index];
                  return _buildCourseCard(context, course);
                },
              ),

            const SizedBox(height: 24),

            // Chú thích chân trang [8116:25245]
            const Center(
              child: Text(
                'Học phí đã bao gồm trọn gói tài liệu và dụng cụ thực hành.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterDropdown({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AcademyColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          height: 52,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: items.contains(value) ? value : items.first,
              isExpanded: true,
              icon: const Icon(
                Icons.keyboard_arrow_down_rounded,
                color: Color(0xFF80766E),
                size: 20,
              ),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AcademyColors.textPrimary,
              ),
              dropdownColor: Colors.white,
              borderRadius: BorderRadius.circular(12),
              items: items.map((item) {
                return DropdownMenuItem<String>(
                  value: item,
                  child: Text(item, overflow: TextOverflow.ellipsis),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCourseCard(BuildContext context, CourseModel course) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ảnh khóa học [8116:25219]
          SizedBox(
            height: 172,
            width: double.infinity,
            child: Image.asset(
              course.image,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: AcademyColors.cardWarm,
                child: const Center(
                  child: Icon(Icons.school, size: 52, color: AcademyColors.primary),
                ),
              ),
            ),
          ),

          // Thông tin khóa học
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.heading,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  course.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AcademyColors.textPrimary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),

                // Thông tin đào tạo
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${course.level} · ${course.schedule.contains('trực tiếp') ? 'Học trực tiếp' : 'Kết hợp'}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
                      ),
                    ),
                    const Text(
                      'Học phí',
                      style: TextStyle(
                        fontSize: 12,
                        color: AcademyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${formatCurrency(course.tuitionFee)} đ',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.primary,
                  ),
                ),
                const SizedBox(height: 14),

                // Nút Xem chi tiết
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => E03CourseDetailScreen(course: course),
                        ),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AcademyColors.primary, width: 1.2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Xem chi tiết khóa học',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
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
  }
}
