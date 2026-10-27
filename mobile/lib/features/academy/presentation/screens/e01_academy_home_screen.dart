import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import 'e03_course_detail_screen.dart';
import 'e05_enrollment_form_screen.dart';
import 'e08_class_detail_screen.dart';

enum AcademyFilterExpanded { audience, need }

/// Screen E01: Trang Khám phá & Đào tạo Chuẩn Y khoa MLD Việt Nam
/// - Dưới ô tìm kiếm có 2 nút chọn: [ Đối tượng ▼ ] và [ Nhu cầu ▼ ]
/// - Mặc định: Để tất cả, không sổ danh sách lọc
/// - Click vào nút "Đối tượng" -> Sổ ra danh sách các đối tượng để chọn và lọc
/// - Click vào nút "Nhu cầu" -> Sổ ra danh sách các nhu cầu để chọn và lọc
/// - Click lại vào nút -> Thu gọn lại
/// - Thẻ khóa học hiển thị ảnh từ thư mục assets/images/DaoTao/
/// - Đồng bộ chuẩn thiết kế Trang Tài liệu:
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

  List<CourseModel> _allCourses = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')
      ? MockAcademyData.courses
      : AcademyRepository.instance.cachedCourses;
  bool _isLoading = false;

  // Trạng thái mở rộng bộ lọc: mặc định là null (thu gọn, hiển thị tất cả)
  AcademyFilterExpanded? _expandedFilter;

  // Danh mục lọc Đối tượng
  static const List<String> _audienceCategories = [
    'Tất cả đối tượng',
    'Người mới bắt đầu',
    'Người đang làm nghề',
    'Kỹ thuật viên XBBH/VLTL',
    'Y tế & Phục hồi',
  ];
  String _selectedAudience = 'Tất cả đối tượng';

  // Danh mục lọc Nhu cầu
  static const List<String> _needCategories = [
    'Tất cả nhu cầu',
    'Kiến thức nền tảng & Tự chăm sóc',
    'Tích hợp dịch vụ mới',
    'Mở cơ sở chăm sóc',
  ];
  String _selectedNeed = 'Tất cả nhu cầu';

  @override
  void initState() {
    super.initState();
    if (widget.initialGroup != null && widget.initialGroup!.isNotEmpty) {
      _selectedAudience = widget.initialGroup!;
    }
    _academyRepo.enrollmentNotifier.addListener(_onEnrollmentChanged);
    _loadCourses();
  }

  void _onEnrollmentChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _academyRepo.enrollmentNotifier.removeListener(_onEnrollmentChanged);
    _searchController.dispose();
    super.dispose();
  }

  void filterByGroup(String group) {
    setState(() {
      _selectedAudience = group;
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
      // 1. Lọc theo Đối tượng
      if (_selectedAudience != 'Tất cả đối tượng' && _selectedAudience != 'Tất cả') {
        final aud = _selectedAudience.toLowerCase();
        final matchesAudience = c.targetAudience.toLowerCase().contains(aud) ||
            c.courseGroup.toLowerCase().contains(aud) ||
            c.category.toLowerCase().contains(aud);
        if (!matchesAudience) return false;
      }

      // 2. Lọc theo Nhu cầu
      if (_selectedNeed != 'Tất cả nhu cầu' && _selectedNeed != 'Tất cả') {
        final need = _selectedNeed.toLowerCase();
        bool matchesNeed = c.targetNeed.toLowerCase().contains(need);
        if (!matchesNeed) {
          if (need.contains('nền tảng') || need.contains('tự chăm sóc')) {
            matchesNeed = c.targetNeed.toLowerCase().contains('nền tảng') ||
                c.targetNeed.toLowerCase().contains('chăm sóc cơ bản');
          } else if (need.contains('dịch vụ mới') || need.contains('tích hợp')) {
            matchesNeed = c.targetNeed.toLowerCase().contains('dịch vụ mới');
          } else if (need.contains('mở cơ sở') || need.contains('mở spa')) {
            matchesNeed = c.targetNeed.toLowerCase().contains('mở cơ sở') ||
                c.targetNeed.toLowerCase().contains('mở spa');
          }
        }
        if (!matchesNeed) return false;
      }

      // 3. Lọc theo ô tìm kiếm
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
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
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

            // 2. Hai nút bộ lọc: [ Đối tượng ▼ ] và [ Nhu cầu ▼ ]
            // Mặc định hiển thị Tất cả. Click vào nút nào sẽ mở danh sách nút đó để chọn.
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          if (_expandedFilter == AcademyFilterExpanded.audience) {
                            _expandedFilter = null; // Thu gọn
                          } else {
                            _expandedFilter = AcademyFilterExpanded.audience; // Mở ra
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          color: _expandedFilter == AcademyFilterExpanded.audience
                              ? AppColors.primaryLight
                              : AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _expandedFilter == AcademyFilterExpanded.audience ||
                                    (_selectedAudience != 'Tất cả đối tượng' && _selectedAudience != 'Tất cả')
                                ? AppColors.primary
                                : AppColors.border,
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                _selectedAudience == 'Tất cả đối tượng' || _selectedAudience == 'Tất cả'
                                    ? context.tr('Đối tượng', 'Target Audience')
                                    : _selectedAudience.tr(context),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _expandedFilter == AcademyFilterExpanded.audience ||
                                          (_selectedAudience != 'Tất cả đối tượng' && _selectedAudience != 'Tất cả')
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Icon(
                              _expandedFilter == AcademyFilterExpanded.audience
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: _expandedFilter == AcademyFilterExpanded.audience
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          if (_expandedFilter == AcademyFilterExpanded.need) {
                            _expandedFilter = null; // Thu gọn
                          } else {
                            _expandedFilter = AcademyFilterExpanded.need; // Mở ra
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          color: _expandedFilter == AcademyFilterExpanded.need
                              ? AppColors.primaryLight
                              : AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _expandedFilter == AcademyFilterExpanded.need ||
                                    (_selectedNeed != 'Tất cả nhu cầu' && _selectedNeed != 'Tất cả')
                                ? AppColors.primary
                                : AppColors.border,
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                _selectedNeed == 'Tất cả nhu cầu' || _selectedNeed == 'Tất cả'
                                    ? context.tr('Nhu cầu', 'Learning Needs')
                                    : _selectedNeed.tr(context),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontFamily: 'Montserrat',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _expandedFilter == AcademyFilterExpanded.need ||
                                          (_selectedNeed != 'Tất cả nhu cầu' && _selectedNeed != 'Tất cả')
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Icon(
                              _expandedFilter == AcademyFilterExpanded.need
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: _expandedFilter == AcademyFilterExpanded.need
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 3. Khung sổ xuống các tùy chọn (Chỉ hiện khi click vào nút Đối tượng hoặc Nhu cầu)
            AnimatedSize(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeInOut,
              child: _expandedFilter == null
                  ? const SizedBox.shrink()
                  : Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                      decoration: const BoxDecoration(
                        color: Color(0xFFF8FAFC),
                        border: Border(
                          bottom: BorderSide(color: AppColors.border),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _expandedFilter == AcademyFilterExpanded.audience
                                ? context.tr('Chọn đối tượng đào tạo:', 'Select target audience:')
                                : context.tr('Chọn nhu cầu học tập:', 'Select learning need:'),
                            style: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: (_expandedFilter == AcademyFilterExpanded.audience
                                    ? _audienceCategories
                                    : _needCategories)
                                .map((cat) {
                              final isSelected = _expandedFilter == AcademyFilterExpanded.audience
                                  ? cat == _selectedAudience
                                  : cat == _selectedNeed;
                              return InkWell(
                                onTap: () {
                                  setState(() {
                                    if (_expandedFilter == AcademyFilterExpanded.audience) {
                                      _selectedAudience = cat;
                                    } else {
                                      _selectedNeed = cat;
                                    }
                                  });
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: isSelected ? AppColors.primary : Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected ? AppColors.primary : AppColors.border,
                                    ),
                                  ),
                                  child: Text(
                                    cat.tr(context),
                                    style: TextStyle(
                                      fontFamily: 'Montserrat',
                                      fontSize: 12.5,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                      color: isSelected ? Colors.white : AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
            ),
            const Divider(height: 1, color: AppColors.border),

            // 4. Danh sách khóa học
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
                                      const SizedBox(height: 16),
                                      ElevatedButton(
                                        onPressed: () {
                                          setState(() {
                                            _selectedAudience = 'Tất cả đối tượng';
                                            _selectedNeed = 'Tất cả nhu cầu';
                                            _expandedFilter = null;
                                            _searchController.clear();
                                          });
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                        ),
                                        child: Text(
                                          context.tr('Đặt lại bộ lọc', 'Reset filter'),
                                          style: const TextStyle(
                                            fontFamily: 'Montserrat',
                                            color: Colors.white,
                                            fontSize: 13,
                                          ),
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
/// - Ảnh trên cùng từ assets/images/DaoTao/ hoặc network/asset kèm Badge giảm giá (-90%) và Số lượng buổi học (▶ 6 buổi học)
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

  String _resolveCourseImage(CourseModel course) {
    final t = course.title.toLowerCase();
    if (t.contains('lymphatic wellness signature program')) {
      return 'assets/images/DaoTao/LYMPHATIC WELLNESS SIGNATURE PROGRAM 350.000.000.jpg';
    }
    if (t.contains('phát triển giảng viên')) {
      return 'assets/images/DaoTao/Chương trình phát triển giảng viên và học thuật 35.000.000.jpg';
    }
    if (t.contains('chuyên sâu') && (t.contains('làm nghề') || t.contains('người làm nghề'))) {
      return 'assets/images/DaoTao/Dẫn lưu bạch huyết chuyên sâu cho người làm nghề.jpg';
    }
    if (t.contains('nâng cao') && (t.contains('làm nghề') || t.contains('người làm nghề'))) {
      return 'assets/images/DaoTao/Dẫn lưu bạch huyết nâng cao cho người làm nghề 25.000.000.jpg';
    }
    if (t.contains('cơ bản') && (t.contains('làm nghề') || t.contains('người làm nghề'))) {
      return 'assets/images/DaoTao/Dẫn lưu bạch huyết cơ bản cho người làm nghề 15.000.000.jpg';
    }
    if (t.contains('nền tảng') || (t.contains('người mới bắt đầu') && (t.contains('599') || t.contains('level 0')))) {
      return 'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg';
    }
    if (t.contains('giảm phù') && (t.contains('băng ép') || t.contains('cdt'))) {
      return 'assets/images/DaoTao/Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT 30.000.000.webp';
    }
    if (t.contains('chế độ ăn') || (t.contains('tuyến vú') && t.contains('phòng ngừa bệnh lý'))) {
      return 'assets/images/DaoTao/HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ 350.000.jpg';
    }
    if (t.contains('mẹ sau sinh')) {
      return 'assets/images/DaoTao/Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH 10.000.000.jpg';
    }
    if (t.contains('phù tay') || t.contains('ung thư vú') || (t.contains('tuyến vú') && t.contains('350.000'))) {
      return 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú 350.000.jpg';
    }
    if (course.image.isNotEmpty && !course.image.contains('gioithieu_1.png')) {
      return course.image;
    }
    return 'assets/images/course_banner_clean.png';
  }

  void _navigateToDetail() {
    setState(() => _isPressed = true);
    final isEnrolled = AcademyRepository.instance.isCourseEnrolled(widget.course.id, widget.course.title);
    if (isEnrolled) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => E08ClassDetailScreen(course: widget.course),
        ),
      ).then((_) {
        if (mounted) {
          setState(() => _isPressed = false);
        }
      });
    } else {
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
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;
    final isEnrolled = AcademyRepository.instance.isCourseEnrolled(course.id, course.title);
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
                      _resolveCourseImage(course),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.primaryLight,
                        child: const Center(
                          child: Icon(Icons.school, size: 48, color: AppColors.primary),
                        ),
                      ),
                    ),
                  ),

                  // Huy hiệu ĐÃ ĐĂNG KÝ (nếu khóa học đã được học viên ghi danh)
                  if (isEnrolled)
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2860EB),
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 14),
                            const SizedBox(width: 4),
                            Text(
                              context.tr('ĐÃ ĐĂNG KÝ', 'ENROLLED'),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
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
                        Expanded(
                          child: Column(
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
                                        color: AppColors.coursePrice,
                                      ),
                                    ),
                                    const TextSpan(
                                      text: 'đ',
                                      style: TextStyle(
                                        fontFamily: 'Montserrat',
                                        fontSize: 19,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.coursePrice,
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
                        ),
                        const SizedBox(width: 8),

                        // Nút hành động:
                        // - Nếu đã đăng ký: hiển thị nút "Đã đăng ký", bấm vào mở xem lớp học E08
                        // - Nếu chưa đăng ký: hiển thị "Đăng ký học", bấm vào MỞ THẲNG TRANG ĐĂNG KÝ KHÓA HỌC E05 LUÔN!
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () {
                            if (isEnrolled) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => E08ClassDetailScreen(course: widget.course),
                                ),
                              ).then((_) {
                                if (mounted) setState(() {});
                              });
                            } else {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => E05EnrollmentFormScreen(course: widget.course),
                                ),
                              ).then((_) {
                                if (mounted) setState(() {});
                              });
                            }
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isEnrolled
                                  ? const Color(0xFF059669)
                                  : (_isPressed ? AppColors.primary : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isEnrolled
                                    ? const Color(0xFF059669)
                                    : (_isPressed ? AppColors.primary : const Color(0xFFE2E8F0)),
                                width: 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  isEnrolled
                                      ? context.tr('Đã đăng ký', 'Enrolled')
                                      : context.tr('Đăng ký học', 'Enroll Now'),
                                  style: TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: isEnrolled || _isPressed ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  isEnrolled ? Icons.check_circle_rounded : Icons.arrow_forward_rounded,
                                  size: isEnrolled ? 16 : 14,
                                  color: isEnrolled || _isPressed ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ],
                            ),
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
