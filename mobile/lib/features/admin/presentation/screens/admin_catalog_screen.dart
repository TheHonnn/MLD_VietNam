import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/service_form_sheet.dart';
import '../widgets/course_form_sheet.dart';

class AdminCatalogScreen extends StatefulWidget {
  final String? initialTab; // 'SERVICES' or 'COURSES'

  const AdminCatalogScreen({
    super.key,
    this.initialTab,
  });

  @override
  State<AdminCatalogScreen> createState() => _AdminCatalogScreenState();
}

class _AdminCatalogScreenState extends State<AdminCatalogScreen> {
  final AdminRepository _repository = AdminRepository.instance;

  int _selectedSegment = 0; // 0: Dịch vụ, 1: Khóa học
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminServiceModel> _services = [];
  List<AdminCourseModel> _courses = [];
  String? _togglingId;

  @override
  void initState() {
    super.initState();
    if (widget.initialTab == 'COURSES') {
      _selectedSegment = 1;
    }
    _fetchData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    if (_selectedSegment == 0) {
      final list = await _repository.fetchServices();
      if (mounted) {
        setState(() {
          _services = list;
          _isLoading = false;
        });
      }
    } else {
      final list = await _repository.fetchCourses();
      if (mounted) {
        setState(() {
          _courses = list;
          _isLoading = false;
        });
      }
    }
  }

  List<AdminServiceModel> get _filteredServices {
    if (_searchQuery.isEmpty) return _services;
    final q = _searchQuery.toLowerCase();
    return _services.where((s) => s.name.toLowerCase().contains(q) || s.categoryName.toLowerCase().contains(q)).toList();
  }

  List<AdminCourseModel> get _filteredCourses {
    if (_searchQuery.isEmpty) return _courses;
    final q = _searchQuery.toLowerCase();
    return _courses.where((c) => c.title.toLowerCase().contains(q) || c.code.toLowerCase().contains(q)).toList();
  }

  Future<void> _handleToggleService(AdminServiceModel s) async {
    final nextStatus = !s.isActive;
    setState(() => _togglingId = s.id);

    final success = await _repository.toggleServiceActive(s.id, nextStatus);
    if (mounted) {
      setState(() => _togglingId = null);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              nextStatus
                  ? 'Đã bật mở bán dịch vụ "${s.name}"'
                  : 'Đã tạm dừng nhận khách dịch vụ "${s.name}"',
              style: GoogleFonts.montserrat(fontSize: 12.5),
            ),
            backgroundColor: nextStatus ? const Color(0xFF00693F) : const Color(0xFF6B7280),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lỗi cập nhật trạng thái. Vui lòng thử lại.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _handleToggleCourse(AdminCourseModel c) async {
    final nextStatus = !c.isActive;
    setState(() => _togglingId = c.id);

    final success = await _repository.toggleCourseActive(c.id, nextStatus);
    if (mounted) {
      setState(() => _togglingId = null);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              nextStatus
                  ? 'Đã mở tuyển sinh khóa học "${c.title}"'
                  : 'Đã tạm dừng tuyển sinh khóa "${c.title}"',
              style: GoogleFonts.montserrat(fontSize: 12.5),
            ),
            backgroundColor: nextStatus ? const Color(0xFF00693F) : const Color(0xFF6B7280),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lỗi cập nhật trạng thái tuyển sinh.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _openServiceForm([AdminServiceModel? service]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ServiceFormSheet(
        service: service,
        onSaved: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                service != null ? 'Đã lưu thay đổi dịch vụ!' : 'Đã tạo mới dịch vụ thành công!',
                style: GoogleFonts.montserrat(fontSize: 12.5),
              ),
              backgroundColor: const Color(0xFFE11D48),
            ),
          );
          _fetchData();
        },
      ),
    );
  }

  void _openCourseForm([AdminCourseModel? course]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CourseFormSheet(
        course: course,
        onSaved: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                course != null ? 'Đã lưu thay đổi khóa học!' : 'Đã tạo mới khóa học thành công!',
                style: GoogleFonts.montserrat(fontSize: 12.5),
              ),
              backgroundColor: const Color(0xFF00693F),
            ),
          );
          _fetchData();
        },
      ),
    );
  }

  String _formatPrice(double amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)} ₫';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Danh mục Dịch vụ & Khóa học',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              _selectedSegment == 0
                  ? '${_services.length} dịch vụ trong bảng giá'
                  : '${_courses.length} chương trình đào tạo',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // 1. Segmented Control
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
            child: Container(
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _selectedSegment = 0);
                        _fetchData();
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: _selectedSegment == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _selectedSegment == 0
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'Dịch vụ Spa',
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              fontWeight: _selectedSegment == 0 ? FontWeight.w700 : FontWeight.w500,
                              color: _selectedSegment == 0
                                  ? const Color(0xFFE11D48)
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _selectedSegment = 1);
                        _fetchData();
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: _selectedSegment == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: _selectedSegment == 1
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'Khóa học Đào tạo',
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              fontWeight: _selectedSegment == 1 ? FontWeight.w700 : FontWeight.w500,
                              color: _selectedSegment == 1
                                  ? const Color(0xFF00693F)
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Ô tìm kiếm
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: _selectedSegment == 0 ? 'Tìm dịch vụ...' : 'Tìm khóa học...',
                hintStyle: GoogleFonts.montserrat(fontSize: 12, color: const Color(0xFF9CA3AF)),
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF9CA3AF)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                filled: true,
                fillColor: const Color(0xFFF9FAFB),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                ),
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // 3. Danh sách
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchData,
              color: _selectedSegment == 0 ? const Color(0xFFE11D48) : const Color(0xFF00693F),
              child: _isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                        color: _selectedSegment == 0
                            ? const Color(0xFFE11D48)
                            : const Color(0xFF00693F),
                      ),
                    )
                  : _selectedSegment == 0
                      ? _buildServicesList()
                      : _buildCoursesList(),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          if (_selectedSegment == 0) {
            _openServiceForm();
          } else {
            _openCourseForm();
          }
        },
        backgroundColor: _selectedSegment == 0 ? const Color(0xFFE11D48) : const Color(0xFF00693F),
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.add_rounded, size: 20),
        label: Text(
          _selectedSegment == 0 ? 'Thêm dịch vụ' : 'Thêm khóa học',
          style: GoogleFonts.montserrat(fontSize: 12.5, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Widget _buildServicesList() {
    if (_filteredServices.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                const Icon(Icons.spa_rounded, size: 36, color: Color(0xFF9CA3AF)),
                const SizedBox(height: 12),
                Text(
                  'Không tìm thấy dịch vụ nào',
                  style: GoogleFonts.montserrat(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
      itemCount: _filteredServices.length,
      itemBuilder: (ctx, index) {
        final s = _filteredServices[index];
        final isToggling = _togglingId == s.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: InkWell(
            onTap: () => _openServiceForm(s),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                // Icon / Thumbnail
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.spa_rounded, color: Color(0xFFE11D48), size: 24),
                ),
                const SizedBox(width: 12),

                // Thông tin
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.montserrat(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${s.durationMinutes} phút',
                              style: GoogleFonts.montserrat(fontSize: 10.5, fontWeight: FontWeight.w600, color: const Color(0xFF4B5563)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatPrice(s.price),
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFFE11D48),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Switch 1 chạm Duyệt kinh doanh
                if (isToggling)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFE11D48)),
                  )
                else
                  Switch(
                    value: s.isActive,
                    activeThumbColor: const Color(0xFF00693F),
                    onChanged: (_) => _handleToggleService(s),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCoursesList() {
    if (_filteredCourses.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                const Icon(Icons.menu_book_rounded, size: 36, color: Color(0xFF9CA3AF)),
                const SizedBox(height: 12),
                Text(
                  'Không tìm thấy khóa học nào',
                  style: GoogleFonts.montserrat(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
      itemCount: _filteredCourses.length,
      itemBuilder: (ctx, index) {
        final c = _filteredCourses[index];
        final isToggling = _togglingId == c.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: InkWell(
            onTap: () => _openCourseForm(c),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                // Icon / Thumbnail
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F6ED),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.school_rounded, color: Color(0xFF00693F), size: 24),
                ),
                const SizedBox(width: 12),

                // Thông tin
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEBF5FB),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              c.code,
                              style: GoogleFonts.montserrat(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF1B4F72)),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              c.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.montserrat(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textHeading,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Text(
                            _formatPrice(c.tuitionFee),
                            style: GoogleFonts.montserrat(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${c.totalHours}h · ${c.totalLessons} buổi',
                            style: GoogleFonts.montserrat(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Switch 1 chạm Duyệt tuyển sinh
                if (isToggling)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00693F)),
                  )
                else
                  Switch(
                    value: c.isActive,
                    activeThumbColor: const Color(0xFF00693F),
                    onChanged: (_) => _handleToggleCourse(c),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

