import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import 'e03_course_detail_screen.dart';

/// Screen E01: Trang Đào tạo & Danh mục khóa học chuẩn Y khoa
/// - Áp dụng thiết kế đồng bộ với Trang Tài liệu:
///   + Header gồm AppBar trắng, ô tìm kiếm, thanh lọc danh mục ngang
///   + Không bo viền lồng chéo, bo viền vuông tròn nhẹ 8px
///   + 100% phông chữ Montserrat, màu sắc xanh dương #2860EB, không dùng xanh lá
class E01AcademyHomeScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;
  final String? initialGroup;

  const E01AcademyHomeScreen({
    super.key,
    this.onBackToHome,
    this.initialGroup,
  });

  @override
  State<E01AcademyHomeScreen> createState() => E01AcademyHomeScreenState();
}

class E01AcademyHomeScreenState extends State<E01AcademyHomeScreen> {
  final AcademyRepository _academyRepo = AcademyRepository.instance;
  final TextEditingController _searchController = TextEditingController();

  List<CourseModel> _allCourses = MockAcademyData.courses;
  bool _isLoading = false;

  // Thanh danh mục lọc ngang (Đồng bộ chuẩn Trang Tài liệu)
  static const List<String> _courseCategories = [
    'Tất cả',
    'Người mới bắt đầu',
    'Người đang làm nghề',
    'Kỹ thuật viên XBBH/VLTL',
    'Y tế & Phục hồi',
  ];
  String _selectedCategory = 'Tất cả';

  @override
  void initState() {
    super.initState();
    if (widget.initialGroup != null && widget.initialGroup!.isNotEmpty) {
      _selectedCategory = widget.initialGroup!;
    }
    _loadCourses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void filterByGroup(String group) {
    setState(() {
      _selectedCategory = group;
    });
  }

  Future<void> _loadCourses() async {
    setState(() => _isLoading = true);
    final courses = await _academyRepo.getCourses();
    if (mounted) {
      setState(() {
        _allCourses = courses;
        _isLoading = false;
      });
    }
  }

  List<CourseModel> get _filteredCourses {
    final query = _searchController.text.trim().toLowerCase();

    return _allCourses.where((c) {
      // Lọc theo danh mục ngang
      if (_selectedCategory != 'Tất cả') {
        final groupText = c.courseGroup.toLowerCase();
        final catText = c.category.toLowerCase();
        final filterText = _selectedCategory.toLowerCase();
        final matches = groupText.contains(filterText) ||
            catText.contains(filterText) ||
            c.targetAudience.toLowerCase().contains(filterText);
        if (!matches) return false;
      }

      // Lọc theo ô tìm kiếm
      if (query.isNotEmpty) {
        final matchTitle = c.title.toLowerCase().contains(query);
        final matchDesc = c.description.toLowerCase().contains(query);
        final matchInst = c.instructorName.toLowerCase().contains(query);
        if (!matchTitle && !matchDesc && !matchInst) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredCourses;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          context.tr('Đào tạo & Khóa học', 'Academy & Courses'),
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        centerTitle: false,
        leading: (widget.onBackToHome != null || Navigator.canPop(context))
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                onPressed: widget.onBackToHome ?? () => Navigator.pop(context),
              )
            : null,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Ô tìm kiếm khóa học
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(
                    fontFamily: 'Montserrat',
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: context.tr('Tìm kiếm khóa học dẫn lưu...', 'Search drainage courses...'),
                    hintStyle: const TextStyle(
                      fontFamily: 'Montserrat',
                      fontSize: 14,
                      color: AppColors.textPlaceholder,
                    ),
                    prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18, color: AppColors.textSecondary),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
            ),

            // 2. Thanh lọc danh mục ngang (Đồng bộ chuẩn Trang Tài liệu)
            Container(
              color: Colors.white,
              height: 48,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                scrollDirection: Axis.horizontal,
                itemCount: _courseCategories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _courseCategories[index];
                  final isSelected = cat == _selectedCategory;
                  return InkWell(
                    onTap: () => setState(() => _selectedCategory = cat),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      child: Text(
                        cat.tr(context),
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 13.5,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1, color: AppColors.border),

            // 3. Danh sách khóa học
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _loadCourses,
                      child: filtered.isEmpty
                          ? ListView(
                              children: [
                                const SizedBox(height: 80),
                                Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.find_in_page_outlined, size: 64, color: AppColors.border),
                                      const SizedBox(height: 12),
                                      Text(
                                        context.tr('Không tìm thấy khóa học phù hợp', 'No matching courses found'),
                                        style: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textHeading,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        context.tr('Vui lòng thử từ khóa khác hoặc chọn danh mục khác', 'Please try another keyword or category'),
                                        style: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontSize: 13,
                                          color: AppColors.textPlaceholder,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final course = filtered[index];
                                return _CourseCardItem(course: course);
                              },
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thẻ Khóa học hiển thị đúng theo ảnh mô tả:
/// - Ảnh trên cùng kèm Badge giảm giá (-90%) và Số lượng buổi học (▶ 6 buổi học)
/// - Tiêu đề đen in đậm, bấm vào chuyển sang màu xanh dương #2860EB (không dùng xanh lá)
/// - Giá tiền sau giảm (xanh dương #2860EB) và Giá gốc gạch ngang (xám)
/// - Nút "Chi tiết →" màu trắng xám, bấm vào chuyển sang xanh dương #2860EB
/// - Bo viền vuông, tròn nhẹ 8px
class _CourseCardItem extends StatefulWidget {
  final CourseModel course;

  const _CourseCardItem({required this.course});

  @override
  State<_CourseCardItem> createState() => _CourseCardItemState();
}

class _CourseCardItemState extends State<_CourseCardItem> {
  bool _isPressed = false;

  String _formatCurrency(double amount) {
    final integerAmount = amount.toInt();
    final str = integerAmount.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
  }

  void _navigateToDetail() {
    setState(() => _isPressed = true);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => E03CourseDetailScreen(course: widget.course),
      ),
    ).then((_) {
      if (mounted) {
        setState(() => _isPressed = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;
    final hasDiscount = course.originalPrice != null && course.originalPrice! > course.tuitionFee;
    final discount = course.discountPercentage;
    final sessionsCount = course.sessionCount;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapCancel: () => setState(() => _isPressed = false),
          onTap: _navigateToDetail,
          borderRadius: BorderRadius.circular(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Ảnh kèm Badge giảm giá và Số lượng buổi học
              Stack(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 185,
                    child: Image.asset(
                      course.image,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.primaryLight,
                        child: const Center(
                          child: Icon(Icons.school, size: 48, color: AppColors.primary),
                        ),
                      ),
                    ),
                  ),

                  // Huy hiệu Giảm giá (-90%)
                  if (discount != null)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '-$discount%',
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),

                  // Huy hiệu Số lượng buổi học (▶ 6 buổi học)
                  Positioned(
                    bottom: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xCC000000),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.play_circle_fill, color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            '$sessionsCount ${context.tr('buổi học', 'sessions')}',
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              color: Colors.white,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // 2. Nội dung khóa học
              Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tiêu đề khóa học (Bình thường: Đen in đậm | Khi chạm: #2860EB)
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 150),
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: _isPressed ? AppColors.primary : const Color(0xFF0F172A),
                        height: 1.35,
                      ),
                      child: Text(course.title.tr(context)),
                    ),

                    const SizedBox(height: 12),
                    const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 12),

                    // Hàng Giá tiền và Nút Chi tiết
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Cột Giá tiền: Giá sau giảm (#2860EB) & Giá gốc gạch ngang
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text: '${_formatCurrency(course.tuitionFee)} ',
                                    style: const TextStyle(
                                      fontFamily: 'Montserrat',
                                      fontSize: 19,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const TextSpan(
                                    text: 'đ',
                                    style: TextStyle(
                                      fontFamily: 'Montserrat',
                                      fontSize: 19,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (hasDiscount) ...[
                              const SizedBox(height: 2),
                              Text(
                                '${_formatCurrency(course.originalPrice!)} đ',
                                style: const TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF94A3B8),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),

                        // Nút "Chi tiết →" (Màu xám nhạt, khi chạm đổi sang #2860EB)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: _isPressed ? AppColors.primary : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _isPressed ? AppColors.primary : const Color(0xFFE2E8F0),
                              width: 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                context.tr('Chi tiết', 'Details'),
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _isPressed ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.arrow_forward_rounded,
                                size: 14,
                                color: _isPressed ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
