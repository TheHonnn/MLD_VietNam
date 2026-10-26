import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e03_course_detail_screen.dart';

/// Screen E01: Trang Đào tạo & Danh mục khóa học chuẩn Y khoa
/// Phong cách thiết kế: Modern Medical, Clean, Professional
/// - Màu sắc đồng bộ toàn diện với hệ thống App (#F5F7FA, #FFFFFF, #168477)
/// - Tiêu đề đen in đậm, chuyển sang xanh lá khi bấm
/// - Thẻ khóa học hiển thị chuẩn: Ảnh, Badge giảm giá, Buổi học, Giá sau giảm & Giá gốc gạch ngang
/// - Nút "Chi tiết →" màu trắng xám, chuyển sang xanh lá khi bấm
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

  // Nhóm phân loại chính: 'Tất cả', 'Người mới bắt đầu', 'Người đang làm nghề'
  String _selectedGroup = 'Tất cả';

  // 5 danh mục Bộ lọc Đối tượng
  static const List<String> audienceOptions = [
    'Tất cả đối tượng',
    'Người mới bắt đầu học nghề',
    'Kỹ thuật viên XBBH/PHCN/VLTL',
    'Nhân viên y tế/bác sĩ',
    'Spa & Wellness',
  ];
  String _selectedAudience = 'Tất cả đối tượng';

  // 4 danh mục Bộ lọc Nhu cầu
  static const List<String> needOptions = [
    'Tất cả nhu cầu',
    'Học nghề để mở cơ sở chăm sóc',
    'Tích hợp dịch vụ mới vào cơ sở đã có sẵn',
    'Học để có kiến thức nền tảng và tự chăm sóc cơ bản',
  ];
  String _selectedNeed = 'Tất cả nhu cầu';

  @override
  void initState() {
    super.initState();
    if (widget.initialGroup != null && widget.initialGroup!.isNotEmpty) {
      _selectedGroup = widget.initialGroup!;
    }
    _loadCourses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Cho phép cập nhật nhanh nhóm từ bên ngoài
  void filterByGroup(String group) {
    setState(() {
      _selectedGroup = group;
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
      // 1. Lọc theo Nhóm đối tượng (Tất cả / Người mới bắt đầu / Người đang làm nghề)
      if (_selectedGroup != 'Tất cả') {
        final matchesGroup = c.courseGroup.toLowerCase().contains(_selectedGroup.toLowerCase()) ||
            c.category.toLowerCase().contains(_selectedGroup.toLowerCase());
        if (!matchesGroup) return false;
      }

      // 2. Lọc theo Bộ lọc Đối tượng (5 danh mục)
      if (_selectedAudience != 'Tất cả đối tượng') {
        if (!c.targetAudience.toLowerCase().contains(_selectedAudience.toLowerCase())) {
          return false;
        }
      }

      // 3. Lọc theo Bộ lọc Nhu cầu (4 danh mục)
      if (_selectedNeed != 'Tất cả nhu cầu') {
        if (!c.targetNeed.toLowerCase().contains(_selectedNeed.toLowerCase())) {
          return false;
        }
      }

      // 4. Lọc theo từ khóa tìm kiếm
      if (query.isNotEmpty) {
        final matchTitle = c.title.toLowerCase().contains(query);
        final matchDesc = c.description.toLowerCase().contains(query);
        final matchInst = c.instructorName.toLowerCase().contains(query);
        if (!matchTitle && !matchDesc && !matchInst) return false;
      }

      return true;
    }).toList();
  }

  void _showAudiencePicker() {
    showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Text(
                  'Chọn đối tượng đào tạo',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              const Divider(height: 1, color: AppColors.border),
              ...audienceOptions.map((opt) {
                final isSel = _selectedAudience == opt;
                return ListTile(
                  title: Text(
                    opt,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? const Color(0xFF168477) : AppColors.textPrimary,
                    ),
                  ),
                  trailing: isSel
                      ? const Icon(Icons.check_circle_rounded, color: Color(0xFF168477))
                      : null,
                  onTap: () {
                    setState(() => _selectedAudience = opt);
                    Navigator.pop(ctx);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  void _showNeedPicker() {
    showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Text(
                  'Chọn nhu cầu đào tạo',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              const Divider(height: 1, color: AppColors.border),
              ...needOptions.map((opt) {
                final isSel = _selectedNeed == opt;
                return ListTile(
                  title: Text(
                    opt,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? const Color(0xFF168477) : AppColors.textPrimary,
                    ),
                  ),
                  trailing: isSel
                      ? const Icon(Icons.check_circle_rounded, color: Color(0xFF168477))
                      : null,
                  onTap: () {
                    setState(() => _selectedNeed = opt);
                    Navigator.pop(ctx);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredCourses;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadCourses,
          color: const Color(0xFF168477),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. HEADER TRANG GỌN GÀNG (Đồng bộ với các trang khác)
                Row(
                  children: [
                    if (widget.onBackToHome != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: InkWell(
                          onTap: widget.onBackToHome,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Icon(Icons.arrow_back, size: 20, color: Color(0xFF0F172A)),
                          ),
                        ),
                      ),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Đào tạo & Khóa học',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam (hebachhuyet.vn)',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 2. KHUNG TÌM KIẾM VÀ 2 BỘ LỌC NGANG HÀNG
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Thanh tìm kiếm
                      Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, size: 20, color: Color(0xFF168477)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                onChanged: (_) => setState(() {}),
                                style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
                                decoration: const InputDecoration(
                                  hintText: 'Tìm kiếm khóa học...',
                                  hintStyle: TextStyle(fontSize: 14, color: AppColors.textPlaceholder),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                            if (_searchController.text.isNotEmpty)
                              InkWell(
                                onTap: () {
                                  _searchController.clear();
                                  setState(() {});
                                },
                                child: const Icon(Icons.close, size: 18, color: AppColors.textSecondary),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Hàng 2 Dropdown ngang hàng: Đối tượng & Nhu cầu
                      Row(
                        children: [
                          // Dropdown Đối tượng (5 mục)
                          Expanded(
                            child: InkWell(
                              onTap: _showAudiencePicker,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
                                decoration: BoxDecoration(
                                  color: _selectedAudience != 'Tất cả đối tượng'
                                      ? const Color(0xFFE8F5F1)
                                      : AppColors.background,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedAudience != 'Tất cả đối tượng'
                                        ? const Color(0xFF168477)
                                        : AppColors.border,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _selectedAudience == 'Tất cả đối tượng'
                                            ? 'Đối tượng'
                                            : _selectedAudience,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: _selectedAudience != 'Tất cả đối tượng'
                                              ? FontWeight.w700
                                              : FontWeight.w500,
                                          color: _selectedAudience != 'Tất cả đối tượng'
                                              ? const Color(0xFF145B55)
                                              : AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    const Icon(Icons.keyboard_arrow_down, size: 16, color: AppColors.textSecondary),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Dropdown Nhu cầu (4 mục)
                          Expanded(
                            child: InkWell(
                              onTap: _showNeedPicker,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
                                decoration: BoxDecoration(
                                  color: _selectedNeed != 'Tất cả nhu cầu'
                                      ? const Color(0xFFE8F5F1)
                                      : AppColors.background,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedNeed != 'Tất cả nhu cầu'
                                        ? const Color(0xFF168477)
                                        : AppColors.border,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _selectedNeed == 'Tất cả nhu cầu'
                                            ? 'Nhu cầu'
                                            : _selectedNeed,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: _selectedNeed != 'Tất cả nhu cầu'
                                              ? FontWeight.w700
                                              : FontWeight.w500,
                                          color: _selectedNeed != 'Tất cả nhu cầu'
                                              ? const Color(0xFF145B55)
                                              : AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    const Icon(Icons.keyboard_arrow_down, size: 16, color: AppColors.textSecondary),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 3. THANH CHUYỂN NHÓM NHANH (Tất cả / Người mới bắt đầu / Người đang làm nghề)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      _buildGroupChip('Tất cả', 'Tất cả (${_allCourses.length})'),
                      const SizedBox(width: 8),
                      _buildGroupChip('Người mới bắt đầu', '🌱 Người mới bắt đầu'),
                      const SizedBox(width: 8),
                      _buildGroupChip('Người đang làm nghề', '💼 Người đang làm nghề'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 4. DANH SÁCH CÁC KHÓA HỌC THEO THIẾT KẾ CHUẨN
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: CircularProgressIndicator(color: Color(0xFF168477)),
                    ),
                  )
                else if (filtered.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.school_outlined, size: 48, color: AppColors.textSecondary),
                        const SizedBox(height: 12),
                        const Text(
                          'Không tìm thấy khóa học phù hợp',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Vui lòng thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc đối tượng, nhu cầu.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _selectedGroup = 'Tất cả';
                              _selectedAudience = 'Tất cả đối tượng';
                              _selectedNeed = 'Tất cả nhu cầu';
                              _searchController.clear();
                            });
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF168477),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Đặt lại bộ lọc', style: TextStyle(color: Colors.white, fontSize: 13)),
                        ),
                      ],
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final course = filtered[index];
                      return _CourseCardItem(course: course);
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGroupChip(String groupValue, String label) {
    final isSelected = _selectedGroup == groupValue;

    return InkWell(
      onTap: () => setState(() => _selectedGroup = groupValue),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF168477) : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF168477) : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
      ),
    );
  }
}

/// Thẻ Khóa học hiển thị đúng theo ảnh mô tả:
/// - Ảnh trên cùng kèm Badge giảm giá (-90%) và Số lượng buổi học (▶ 6 buổi học)
/// - Tiêu đề đen in đậm, bấm vào chuyển sang xanh lá
/// - Giá tiền sau giảm (xanh lá, đậm) và Giá gốc gạch ngang (xám)
/// - Nút "Chi tiết →" màu trắng xám, bấm vào chuyển sang xanh lá
class _CourseCardItem extends StatefulWidget {
  final CourseModel course;

  const _CourseCardItem({required this.course});

  @override
  State<_CourseCardItem> createState() => _CourseCardItemState();
}

class _CourseCardItemState extends State<_CourseCardItem> {
  bool _isPressed = false;

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
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapCancel: () => setState(() => _isPressed = false),
          onTap: _navigateToDetail,
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. KHỐI ẢNH KÈM CÁC HUY HIỆU (BADGE) TRÊN ẢNH
              Stack(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 195,
                    child: Image.asset(
                      course.image,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: const Color(0xFFE8F5F1),
                        child: const Center(
                          child: Icon(Icons.school, size: 48, color: Color(0xFF168477)),
                        ),
                      ),
                    ),
                  ),

                  // Huy hiệu Giảm giá góc trên bên phải (Đỏ, chữ trắng: -90%)
                  if (discount != null)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '-$discount%',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                    ),

                  // Huy hiệu Số lượng buổi học góc dưới bên trái (Đen bán trong suốt: ▶ 6 buổi học)
                  Positioned(
                    bottom: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xCC000000),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.play_circle_fill, color: Colors.white, size: 14),
                          const SizedBox(width: 5),
                          Text(
                            '$sessionsCount buổi học',
                            style: const TextStyle(
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

              // 2. KHỐI NỘI DUNG DƯỚI ẢNH
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tiêu đề khóa học (Bình thường: Đen in đậm | Khi bấm: Xanh lá)
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 150),
                      style: TextStyle(
                        fontFamily: 'Montserrat',
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: _isPressed ? const Color(0xFF168477) : const Color(0xFF0F172A),
                        height: 1.35,
                      ),
                      child: Text(course.title),
                    ),

                    const SizedBox(height: 14),
                    const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 14),

                    // Hàng Giá tiền và Nút Chi tiết
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Cột Giá tiền: Giá sau giảm & Giá gốc gạch ngang
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text: '${formatCurrency(course.tuitionFee)} ',
                                    style: const TextStyle(
                                      fontSize: 19,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF00693F),
                                    ),
                                  ),
                                  const TextSpan(
                                    text: 'đ',
                                    style: TextStyle(
                                      fontSize: 19,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF00693F),
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (hasDiscount) ...[
                              const SizedBox(height: 2),
                              Text(
                                '${formatCurrency(course.originalPrice!)} đ',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF94A3B8),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),

                        // Nút "Chi tiết →" (Bình thường: Màu trắng xám | Khi bấm: Đổi xanh lá)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8.5),
                          decoration: BoxDecoration(
                            color: _isPressed ? const Color(0xFF168477) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: _isPressed ? const Color(0xFF168477) : const Color(0xFFE2E8F0),
                              width: 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Chi tiết',
                                style: TextStyle(
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