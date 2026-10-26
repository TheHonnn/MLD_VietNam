import 'package:flutter/material.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e03_course_detail_screen.dart';

/// Screen E01: Trang Đào tạo & Danh mục khóa học chuẩn Y khoa
/// Dựa theo thực tế từ https://hebachhuyet.vn/dao-tao
/// - Bỏ "Xin chào", nút thông báo, và chữ nhỏ "Học viện đào tạo"
/// - Thanh tìm kiếm nằm ngang hàng với 2 bộ lọc: Đối tượng (5 danh mục) & Nhu cầu (4 danh mục)
/// - Mặc định hiển thị toàn bộ khóa học cả 2 nhóm kèm giá tiền rõ ràng
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

  List<CourseModel> _allCourses = [];
  bool _isLoading = true;

  // Nhóm chính (Menu lựa chọn nhanh): 'Tất cả', 'Người mới bắt đầu', 'Người đang làm nghề'
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

  /// Cho phép Bottom Navigation Bar hoặc trang cha gọi cập nhật nhanh nhóm
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
      // 1. Lọc theo Nhóm đối tượng nhanh (Người mới bắt đầu / Người đang làm nghề)
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
                    color: AcademyColors.heading,
                  ),
                ),
              ),
              const Divider(height: 1),
              ...audienceOptions.map((opt) {
                final isSel = _selectedAudience == opt;
                return ListTile(
                  title: Text(
                    opt,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? AcademyColors.primary : AcademyColors.textPrimary,
                    ),
                  ),
                  trailing: isSel
                      ? const Icon(Icons.check_circle_rounded, color: AcademyColors.primary)
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
                    color: AcademyColors.heading,
                  ),
                ),
              ),
              const Divider(height: 1),
              ...needOptions.map((opt) {
                final isSel = _selectedNeed == opt;
                return ListTile(
                  title: Text(
                    opt,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? AcademyColors.primary : AcademyColors.textPrimary,
                    ),
                  ),
                  trailing: isSel
                      ? const Icon(Icons.check_circle_rounded, color: AcademyColors.primary)
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
      backgroundColor: AcademyColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadCourses,
          color: AcademyColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. TIÊU ĐỀ TRANG GỌN GÀNG (Chuẩn Y khoa, không có Xin chào/Chuông/Chữ nhỏ)
                const Text(
                  'Đào tạo & Khóa học',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.heading,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Trung tâm Ứng dụng Khoa học Bạch huyết Việt Nam (hebachhuyet.vn)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AcademyColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),

                // 2. KHUNG THANH TÌM KIẾM VÀ 2 BỘ LỌC (Ngang hàng / Đồng bộ theo web)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AcademyColors.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Hàng tìm kiếm
                      Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AcademyColors.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AcademyColors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, size: 20, color: AcademyColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                onChanged: (_) => setState(() {}),
                                style: const TextStyle(fontSize: 13, color: AcademyColors.textPrimary),
                                decoration: const InputDecoration(
                                  hintText: 'Từ khóa tìm kiếm khóa học...',
                                  hintStyle: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
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
                                child: const Icon(Icons.close, size: 18, color: AcademyColors.textSecondary),
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
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _selectedAudience != 'Tất cả đối tượng'
                                      ? AcademyColors.cardWarm
                                      : AcademyColors.background,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedAudience != 'Tất cả đối tượng'
                                        ? AcademyColors.primary
                                        : AcademyColors.cardBorder,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.people_outline, size: 16, color: AcademyColors.primary),
                                    const SizedBox(width: 6),
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
                                              ? AcademyColors.primaryDark
                                              : AcademyColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    const Icon(Icons.keyboard_arrow_down, size: 16, color: AcademyColors.textSecondary),
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
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _selectedNeed != 'Tất cả nhu cầu'
                                      ? AcademyColors.cardWarm
                                      : AcademyColors.background,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedNeed != 'Tất cả nhu cầu'
                                        ? AcademyColors.primary
                                        : AcademyColors.cardBorder,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.track_changes, size: 16, color: AcademyColors.primary),
                                    const SizedBox(width: 6),
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
                                              ? AcademyColors.primaryDark
                                              : AcademyColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    const Icon(Icons.keyboard_arrow_down, size: 16, color: AcademyColors.textSecondary),
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

                // 4. DANH SÁCH CÁC KHÓA HỌC KÈM GIÁ RÕ RÀNG
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: CircularProgressIndicator(color: AcademyColors.primary),
                    ),
                  )
                else if (filtered.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AcademyColors.cardBorder),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.school_outlined, size: 48, color: AcademyColors.textSecondary),
                        const SizedBox(height: 12),
                        const Text(
                          'Không tìm thấy khóa học phù hợp',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AcademyColors.heading),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Vui lòng thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc đối tượng, nhu cầu.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
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
                            backgroundColor: AcademyColors.primary,
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
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (context, index) {
                      final course = filtered[index];
                      return _buildCourseCard(course);
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
          color: isSelected ? AcademyColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AcademyColors.primary : AcademyColors.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : AcademyColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildCourseCard(CourseModel course) {
    final hasDiscount = course.originalPrice != null && course.originalPrice! > course.tuitionFee;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AcademyColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => E03CourseDetailScreen(course: course),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thẻ nhóm & Tag
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AcademyColors.cardWarm,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        course.courseGroup,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AcademyColors.primaryDark,
                        ),
                      ),
                    ),
                    Text(
                      course.level,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Tên khóa học
                Text(
                  course.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AcademyColors.heading,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 6),

                // Mô tả tóm tắt
                Text(
                  course.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AcademyColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 10),

                // Chi tiết đối tượng & nhu cầu
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    _buildMetaChip(Icons.people_outline, course.targetAudience),
                    _buildMetaChip(Icons.track_changes, course.targetNeed),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: AcademyColors.cardBorder),
                const SizedBox(height: 10),

                // Hàng Giá tiền và Nút Chi tiết
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '${formatCurrency(course.tuitionFee)} ₫',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AcademyColors.primary,
                              ),
                            ),
                            if (hasDiscount) ...[
                              const SizedBox(width: 8),
                              Text(
                                '${formatCurrency(course.originalPrice!)} ₫',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF94A3B8),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          course.schedule,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AcademyColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => E03CourseDetailScreen(course: course),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AcademyColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Text('Chi tiết', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      label: const Icon(Icons.arrow_forward_rounded, size: 14),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetaChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AcademyColors.background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AcademyColors.cardBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AcademyColors.primary),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AcademyColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
