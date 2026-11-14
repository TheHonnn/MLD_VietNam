import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../services/data/models/home_product_model.dart';
import '../../../services/data/repositories/product_repository.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/service_form_sheet.dart';
import '../widgets/course_form_sheet.dart';
import '../../../../core/services/top_notification_service.dart';

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

  int _selectedSegment = 0; // 0: Dịch vụ, 1: Gói liệu trình, 2: Khóa học, 3: Sản phẩm
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminServiceModel> _services = [];
  List<AdminTreatmentPackageModel> _packages = [];
  List<AdminCourseModel> _courses = [];
  List<HomeProductModel> _products = [];
  String? _togglingId;

  @override
  void initState() {
    super.initState();
    if (widget.initialTab == 'PACKAGES') {
      _selectedSegment = 1;
    } else if (widget.initialTab == 'COURSES') {
      _selectedSegment = 2;
    } else if (widget.initialTab == 'PRODUCTS') {
      _selectedSegment = 3;
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
    } else if (_selectedSegment == 1) {
      final list = await _repository.fetchTreatmentPackages();
      if (mounted) {
        setState(() {
          _packages = list;
          _isLoading = false;
        });
      }
    } else if (_selectedSegment == 2) {
      final list = await _repository.fetchCourses();
      if (mounted) {
        setState(() {
          _courses = list;
          _isLoading = false;
        });
      }
    } else {
      final list = await ProductRepository.instance.getProducts(forceRefresh: true);
      if (mounted) {
        setState(() {
          _products = list;
          _isLoading = false;
        });
      }
    }
  }

  List<HomeProductModel> get _filteredProducts {
    if (_searchQuery.isEmpty) return _products;
    final q = _searchQuery.toLowerCase();
    return _products.where((p) => p.name.toLowerCase().contains(q) || p.category.toLowerCase().contains(q)).toList();
  }

  List<AdminServiceModel> get _filteredServices {
    if (_searchQuery.isEmpty) return _services;
    final q = _searchQuery.toLowerCase();
    return _services.where((s) => s.name.toLowerCase().contains(q) || s.categoryName.toLowerCase().contains(q)).toList();
  }

  List<AdminTreatmentPackageModel> get _filteredPackages {
    if (_searchQuery.isEmpty) return _packages;
    final q = _searchQuery.toLowerCase();
    return _packages.where((p) => p.name.toLowerCase().contains(q) || p.description.toLowerCase().contains(q)).toList();
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
        TopNotificationService.showSuccess(
          title: 'Cập nhật dịch vụ',
          message: nextStatus
              ? 'Đã bật mở bán dịch vụ "${s.name}"'
              : 'Đã tạm dừng nhận khách dịch vụ "${s.name}"',
        );
        _fetchData();
      } else {
        TopNotificationService.showError(
          message: 'Lỗi cập nhật trạng thái. Vui lòng thử lại.',
        );
      }
    }
  }

  Future<void> _handleTogglePackage(AdminTreatmentPackageModel p) async {
    final nextStatus = !p.isActive;
    setState(() => _togglingId = p.id);

    final success = await _repository.toggleTreatmentPackageActive(p.id, nextStatus);
    if (mounted) {
      setState(() => _togglingId = null);
      if (success) {
        TopNotificationService.showSuccess(
          title: 'Cập nhật gói liệu trình',
          message: nextStatus
              ? 'Đã mở bán gói "${p.name}"'
              : 'Đã tạm dừng mở bán gói "${p.name}"',
        );
        _fetchData();
      } else {
        TopNotificationService.showError(
          message: 'Lỗi cập nhật trạng thái gói liệu trình. Vui lòng thử lại.',
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
        TopNotificationService.showSuccess(
          title: 'Cập nhật tuyển sinh',
          message: nextStatus
              ? 'Đã mở tuyển sinh khóa học "${c.title}"'
              : 'Đã tạm dừng tuyển sinh khóa "${c.title}"',
        );
        _fetchData();
      } else {
        TopNotificationService.showError(
          message: 'Lỗi cập nhật trạng thái tuyển sinh.',
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
          TopNotificationService.showSuccess(
            title: 'Thành công',
            message: service != null ? 'Đã lưu thay đổi dịch vụ!' : 'Đã tạo mới dịch vụ thành công!',
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
          TopNotificationService.showSuccess(
            title: 'Thành công',
            message: course != null ? 'Đã lưu thay đổi khóa học!' : 'Đã tạo mới khóa học thành công!',
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

  Widget _buildThumbnail(String url, {required bool isCourse, String title = ''}) {
    final fallbackIcon = Container(
      width: 54,
      height: 54,
      color: isCourse ? const Color(0xFFE8F6ED) : const Color(0xFFFFF1F2),
      child: Icon(
        isCourse ? Icons.school_rounded : Icons.spa_rounded,
        color: isCourse ? const Color(0xFF00693F) : const Color(0xFFE11D48),
        size: 24,
      ),
    );

    String resolvedUrl = url.trim();
    if (resolvedUrl.isEmpty && isCourse && title.isNotEmpty) {
      final t = title.toLowerCase();
      if (t.contains('lymphatic wellness signature program')) {
        resolvedUrl = 'assets/images/DaoTao/LYMPHATIC WELLNESS SIGNATURE PROGRAM 350.000.000.jpg';
      } else if (t.contains('phát triển giảng viên')) {
        resolvedUrl = 'assets/images/DaoTao/Chương trình phát triển giảng viên và học thuật 35.000.000.jpg';
      } else if (t.contains('chuyên sâu')) {
        resolvedUrl = 'assets/images/DaoTao/Dẫn lưu bạch huyết chuyên sâu cho người làm nghề.jpg';
      } else if (t.contains('nâng cao')) {
        resolvedUrl = 'assets/images/DaoTao/Dẫn lưu bạch huyết nâng cao cho người làm nghề 25.000.000.jpg';
      } else if (t.contains('cơ bản')) {
        resolvedUrl = 'assets/images/DaoTao/Dẫn lưu bạch huyết cơ bản cho người làm nghề 15.000.000.jpg';
      } else if (t.contains('nền tảng') || t.contains('mới bắt đầu') || t.contains('599')) {
        resolvedUrl = 'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg';
      } else if (t.contains('giảm phù') || t.contains('cdt')) {
        resolvedUrl = 'assets/images/DaoTao/Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT 30.000.000.webp';
      } else if (t.contains('chế độ ăn') || t.contains('tuyến vú')) {
        resolvedUrl = 'assets/images/DaoTao/HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ 350.000.jpg';
      } else if (t.contains('mẹ sau sinh')) {
        resolvedUrl = 'assets/images/DaoTao/Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH 10.000.000.jpg';
      } else if (t.contains('phù tay') || t.contains('ung thư vú')) {
        resolvedUrl = 'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú 350.000.jpg';
      }
    }

    if (resolvedUrl.isEmpty) {
      return fallbackIcon;
    }

    if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
      return Image.network(
        resolvedUrl,
        width: 54,
        height: 54,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallbackIcon,
      );
    } else {
      return Image.asset(
        resolvedUrl,
        width: 54,
        height: 54,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallbackIcon,
      );
    }
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
              'Danh mục & Bảng giá',
              style: AppTypography.zaloFont(
                fontSize: 15.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            Text(
              _selectedSegment == 0
                  ? '${_services.length} dịch vụ đang kinh doanh'
                  : _selectedSegment == 1
                      ? '${_packages.length} gói liệu trình định kỳ'
                      : _selectedSegment == 2
                          ? '${_courses.length} chương trình đào tạo'
                          : '${_products.length} sản phẩm & gói bổ trợ',
              style: AppTypography.zaloFont(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          if (_selectedSegment == 0 || _selectedSegment == 2)
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: ElevatedButton.icon(
                onPressed: () {
                  if (_selectedSegment == 0) {
                    _openServiceForm();
                  } else if (_selectedSegment == 2) {
                    _openCourseForm();
                  }
                },
                icon: const Icon(Icons.add_rounded, size: 16),
                label: Text(
                  _selectedSegment == 0 ? 'Thêm DV' : 'Thêm khóa',
                  style: AppTypography.zaloFont(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00693F),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(0, 34),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // 1. Segmented Control 4 Tab
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Container(
                height: 38,
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildCatalogTabButton(0, 'Dịch vụ (${_services.length})', const Color(0xFF00693F)),
                    const SizedBox(width: 4),
                    _buildCatalogTabButton(1, 'Gói liệu trình (${_packages.length})', const Color(0xFF00693F)),
                    const SizedBox(width: 4),
                    _buildCatalogTabButton(2, 'Khóa học (${_courses.length})', const Color(0xFF00693F)),
                    const SizedBox(width: 4),
                    _buildCatalogTabButton(3, 'Sản phẩm bổ trợ (${_products.length})', const Color(0xFF00693F)),
                  ],
                ),
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
                hintText: _selectedSegment == 0
                    ? 'Tìm dịch vụ...'
                    : _selectedSegment == 1
                        ? 'Tìm gói liệu trình...'
                        : _selectedSegment == 2
                            ? 'Tìm khóa học...'
                            : 'Tìm sản phẩm & vật tư bổ trợ...',
                hintStyle: AppTypography.zaloFont(fontSize: 12, color: const Color(0xFF9CA3AF)),
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
              color: const Color(0xFF00693F),
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF00693F),
                      ),
                    )
                  : _selectedSegment == 0
                      ? _buildServicesList()
                      : _selectedSegment == 1
                          ? _buildPackagesList()
                          : _selectedSegment == 2
                              ? _buildCoursesList()
                              : _buildProductsList(),
            ),
          ),
        ],
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
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 20),
      itemCount: _filteredServices.length,
      itemBuilder: (ctx, index) {
        final s = _filteredServices[index];
        final isToggling = _togglingId == s.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: InkWell(
            onTap: () => _openServiceForm(s),
            borderRadius: BorderRadius.circular(14),
            child: Row(
              children: [
                // Thumbnail Ảnh thật dịch vụ (Fallback Icon nếu không có ảnh)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildThumbnail(s.imageUrl, isCourse: false, title: s.name),
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
                        style: AppTypography.zaloFont(
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
                              style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w600, color: const Color(0xFF4B5563)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatPrice(s.price),
                            style: AppTypography.zaloFont(
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
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 20),
      itemCount: _filteredCourses.length,
      itemBuilder: (ctx, index) {
        final c = _filteredCourses[index];
        final isToggling = _togglingId == c.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: InkWell(
            onTap: () => _openCourseForm(c),
            borderRadius: BorderRadius.circular(14),
            child: Row(
              children: [
                // Thumbnail Ảnh thật khóa học (Fallback Icon nếu không có ảnh)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildThumbnail(c.imageUrl, isCourse: true, title: c.title),
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
                              style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF1B4F72)),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              c.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
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
                            style: AppTypography.zaloFont(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${c.totalHours}h · ${c.totalLessons} buổi',
                            style: AppTypography.zaloFont(fontSize: 11, color: AppColors.textSecondary),
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

  Widget _buildCatalogTabButton(int index, String label, Color activeColor) {
    final isSelected = _selectedSegment == index;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedSegment = index);
        _fetchData();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: AppTypography.zaloFont(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? activeColor : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPackagesList() {
    if (_filteredPackages.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                const Icon(Icons.layers_outlined, size: 36, color: Color(0xFF9CA3AF)),
                const SizedBox(height: 12),
                Text(
                  'Không tìm thấy gói liệu trình nào',
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  'Dữ liệu đồng bộ trực tiếp từ CSDL treatment_packages.',
                  style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 20),
      itemCount: _filteredPackages.length,
      itemBuilder: (ctx, index) {
        final p = _filteredPackages[index];
        final isToggling = _togglingId == p.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 54,
                  height: 54,
                  color: const Color(0xFFE8F6ED),
                  child: p.imageUrl.isNotEmpty
                      ? Image.network(
                          p.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.layers_rounded,
                            color: Color(0xFF00693F),
                            size: 24,
                          ),
                        )
                      : const Icon(
                          Icons.layers_rounded,
                          color: Color(0xFF00693F),
                          size: 24,
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F6ED),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '${p.totalSessions} buổi · ${p.validityMonths}T',
                            style: AppTypography.zaloFont(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            p.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
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
                          _formatPrice(p.price),
                          style: AppTypography.zaloFont(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF00693F),
                          ),
                        ),
                        if (p.discountPrice != null && p.discountPrice! > 0 && p.discountPrice! < p.price) ...[
                          const SizedBox(width: 6),
                          Text(
                            _formatPrice(p.discountPrice!),
                            style: AppTypography.zaloFont(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (p.description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        p.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 10.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (isToggling)
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00693F)),
                )
              else
                Switch(
                  value: p.isActive,
                  activeThumbColor: const Color(0xFF00693F),
                  onChanged: (_) => _handleTogglePackage(p),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProductsList() {
    if (_filteredProducts.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                  child: const Icon(Icons.shopping_bag_outlined, size: 30, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 14),
                Text(
                  'Không có sản phẩm nào phù hợp',
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                const SizedBox(height: 4),
                Text(
                  'Sản phẩm từ CSDL home_products đồng bộ với Web Admin.',
                  style: AppTypography.zaloFont(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      itemCount: _filteredProducts.length,
      itemBuilder: (ctx, index) {
        final p = _filteredProducts[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: p.imageUrl != null && p.imageUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(p.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.shopping_bag_rounded, color: AppColors.primary)),
                      )
                    : const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        p.category,
                        style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      p.name,
                      style: AppTypography.zaloFont(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${p.formattedPrice} · Đơn vị: ${p.unit}',
                      style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w600, color: const Color(0xFF00693F)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

