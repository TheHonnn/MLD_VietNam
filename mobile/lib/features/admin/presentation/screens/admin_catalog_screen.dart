import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/services/auth_service.dart';
import '../../../services/data/models/home_product_model.dart';
import '../../../services/data/repositories/product_repository.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';
import '../widgets/service_form_sheet.dart';
import '../widgets/package_form_sheet.dart';
import '../widgets/product_form_sheet.dart';
import '../../../../core/services/top_notification_service.dart';
import '../../../../core/widgets/smart_image.dart';

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

  int _selectedSegment = 0;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<AdminServiceModel> _services = [];
  List<AdminTreatmentPackageModel> _packages = [];
  List<AdminCourseModel> _courses = [];
  List<HomeProductModel> _products = [];
  List<AdminBannerModel> _banners = [];
  String _selectedProductPackageGroup = 'Tất cả';
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
    } else if (widget.initialTab == 'BANNERS') {
      _selectedSegment = 4;
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
    try {
      final results = await Future.wait([
        _repository.fetchServices(),
        _repository.fetchTreatmentPackages(),
        _repository.fetchCourses(),
        ProductRepository.instance.getProducts(forceRefresh: true),
        _repository.fetchBanners(),
      ]);
      if (mounted) {
        setState(() {
          _services = results[0] as List<AdminServiceModel>;
          _packages = results[1] as List<AdminTreatmentPackageModel>;
          _courses = results[2] as List<AdminCourseModel>;
          _products = results[3] as List<HomeProductModel>;
          _banners = results[4] as List<AdminBannerModel>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<HomeProductModel> get _filteredProducts {
    return _products.where((p) {
      if (_selectedProductPackageGroup != 'Tất cả' &&
          p.treatmentPackageGroup.toLowerCase().trim() !=
              _selectedProductPackageGroup.toLowerCase().trim()) {
        return false;
      }
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return p.name.toLowerCase().contains(q) ||
          p.category.toLowerCase().contains(q) ||
          p.treatmentPackageGroup.toLowerCase().contains(q);
    }).toList();
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

  List<AdminBannerModel> get _filteredBanners {
    if (_searchQuery.isEmpty) return _banners;
    final q = _searchQuery.toLowerCase();
    return _banners
        .where((b) =>
            b.title.toLowerCase().contains(q) ||
            b.summary.toLowerCase().contains(q) ||
            b.categoryDisplay.toLowerCase().contains(q))
        .toList();
  }

  Future<void> _handleToggleService(AdminServiceModel s) async {
    if (!AuthService.instance.isAdmin) return;
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
    if (!AuthService.instance.isAdmin) return;
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
    if (!AuthService.instance.isAdmin) return;
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

  Future<void> _handleToggleProduct(HomeProductModel p) async {
    if (!AuthService.instance.isAdmin) return;
    final nextStatus = !p.isActive;
    setState(() => _togglingId = p.id);

    final success = await ProductRepository.instance.toggleProductActive(p, nextStatus);
    if (mounted) {
      setState(() => _togglingId = null);
      if (success) {
        TopNotificationService.showSuccess(
          title: 'Cập nhật sản phẩm',
          message: nextStatus
              ? 'Đã mở bán sản phẩm "${p.name}"'
              : 'Đã tạm dừng bán sản phẩm "${p.name}"',
        );
        _fetchData();
      } else {
        TopNotificationService.showError(
          message: 'Lỗi cập nhật trạng thái sản phẩm. Vui lòng thử lại.',
        );
      }
    }
  }

  void _openServiceForm([AdminServiceModel? service]) {
    if (!AuthService.instance.isAdmin) return;
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: ServiceFormSheet(
          service: service,
          onSaved: () {
            TopNotificationService.showSuccess(
              title: 'Thành công',
              message: service != null ? 'Đã lưu thay đổi dịch vụ!' : 'Đã tạo mới dịch vụ thành công!',
            );
            _fetchData();
          },
        ),
      ),
    );
  }

  void _openCourseForm([AdminCourseModel? course]) {
    TopNotificationService.showInfo(
      title: 'Quản lý khóa học',
      message: 'Chương trình đào tạo và video bài giảng được quản lý trực tiếp trên Web Admin.',
    );
  }

  void _openPackageForm([AdminTreatmentPackageModel? package]) {
    if (!AuthService.instance.isAdmin) return;
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: PackageFormSheet(
          package: package,
          onSaved: () {
            TopNotificationService.showSuccess(
              title: 'Thành công',
              message: package != null ? 'Đã lưu thay đổi liệu trình!' : 'Đã tạo mới liệu trình thành công!',
            );
            _fetchData();
          },
        ),
      ),
    );
  }

  void _openProductForm([HomeProductModel? product]) {
    if (!AuthService.instance.isAdmin) return;
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: ProductFormSheet(
          product: product,
          onSaved: () {
            TopNotificationService.showSuccess(
              title: 'Thành công',
              message: product != null ? 'Đã lưu thay đổi sản phẩm!' : 'Đã tạo mới sản phẩm thành công!',
            );
            _fetchData();
          },
        ),
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

  Widget _buildPackageThumbnail(AdminTreatmentPackageModel p) {
    String url = p.imageUrl.trim();
    if (url.isEmpty && p.serviceId != null) {
      final match = _services.where((s) => s.id == p.serviceId).toList();
      if (match.isNotEmpty && match.first.imageUrl.isNotEmpty) {
        url = match.first.imageUrl.trim();
      }
    }
    if (url.isEmpty) {
      final n = p.name.toLowerCase();
      if (n.contains('khu trú')) {
        url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80';
      } else if (n.contains('toàn diện')) {
        url = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80';
      } else {
        url = 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80';
      }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Icon(
          Icons.layers_rounded,
          color: Color(0xFF00693F),
          size: 24,
        ),
      );
    } else {
      return Image.asset(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Icon(
          Icons.layers_rounded,
          color: Color(0xFF00693F),
          size: 24,
        ),
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
                      ? '${_packages.length} gói liệu trình'
                      : _selectedSegment == 2
                          ? '${_courses.length} chương trình đào tạo'
                          : _selectedSegment == 3
                              ? '${_products.length} sản phẩm theo liệu trình'
                              : '${_banners.length} banner trang chủ',
              style: AppTypography.zaloFont(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          if (AuthService.instance.isAdmin && _selectedSegment != 2)
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: GestureDetector(
                onTap: () {
                  if (_selectedSegment == 0) {
                    _openServiceForm();
                  } else if (_selectedSegment == 1) {
                    _openPackageForm();
                  } else if (_selectedSegment == 3) {
                    _openProductForm();
                  } else if (_selectedSegment == 4) {
                    _openBannerForm();
                  }
                },
                child: Container(
                  height: 30,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F6ED),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: const Color(0xFF00693F).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.add_rounded,
                        color: Color(0xFF00693F),
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _selectedSegment == 0
                            ? 'Thêm DV'
                            : _selectedSegment == 1
                                ? 'Thêm gói'
                                : _selectedSegment == 3
                                    ? 'Thêm SP'
                                    : 'Thêm Banner',
                        style: const TextStyle(
                          color: Color(0xFF00693F),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
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
                    _buildCatalogTabButton(1, 'Liệu trình (${_packages.length})', const Color(0xFF00693F)),
                    const SizedBox(width: 4),
                    _buildCatalogTabButton(2, 'Khóa học (${_courses.length})', const Color(0xFF00693F)),
                    const SizedBox(width: 4),
                    _buildCatalogTabButton(3, 'Sản phẩm (${_products.length})', const Color(0xFF00693F)),
                    const SizedBox(width: 4),
                    _buildCatalogTabButton(4, 'Banner (${_banners.length})', const Color(0xFF00693F)),
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
                            : _selectedSegment == 3
                                ? 'Tìm sản phẩm theo liệu trình...'
                                : 'Tìm banner trang chủ...',
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

          if (_selectedSegment == 3)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['Tất cả', ...HomeProductModel.treatmentPackageGroups].map((group) {
                    final isSelected = _selectedProductPackageGroup == group;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(group),
                        selected: isSelected,
                        selectedColor: const Color(0xFFE8F6ED),
                        backgroundColor: const Color(0xFFF9FAFB),
                        labelStyle: AppTypography.zaloFont(
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? const Color(0xFF00693F) : const Color(0xFF64748B),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(
                            color: isSelected ? const Color(0xFF00693F) : const Color(0xFFE5E7EB),
                          ),
                        ),
                        showCheckmark: false,
                        onSelected: (_) {
                          setState(() => _selectedProductPackageGroup = group);
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

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
                              : _selectedSegment == 3
                                  ? _buildProductsList()
                                  : _buildBannersList(),
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
            onTap: AuthService.instance.isAdmin ? () => _openServiceForm(s) : null,
            borderRadius: BorderRadius.circular(14),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildThumbnail(s.imageUrl, isCourse: false, title: s.name),
                ),
                const SizedBox(width: 12),

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

                if (!AuthService.instance.isAdmin)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: s.isActive ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      s.isActive ? 'Đang mở' : 'Tạm dừng',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: s.isActive ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                      ),
                    ),
                  )
                else if (isToggling)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFE11D48)),
                  )
                else
                  Switch(
                    value: s.isActive,
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
            onTap: AuthService.instance.isAdmin ? () => _openCourseForm(c) : null,
            borderRadius: BorderRadius.circular(14),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildThumbnail(c.imageUrl, isCourse: true, title: c.title),
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

                if (!AuthService.instance.isAdmin)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: c.isActive ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      c.isActive ? 'Mở sinh' : 'Tạm dừng',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: c.isActive ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                      ),
                    ),
                  )
                else if (isToggling)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00693F)),
                  )
                else
                  Switch(
                    value: c.isActive,
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
          child: InkWell(
            onTap: AuthService.instance.isAdmin ? () => _openPackageForm(p) : null,
            borderRadius: BorderRadius.circular(14),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 54,
                    height: 54,
                    color: const Color(0xFFE8F6ED),
                    child: _buildPackageThumbnail(p),
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
                              '${p.totalSessions} buổi = ${p.totalSessions} ca · Hạn ${p.validityMonths} tháng',
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
                if (!AuthService.instance.isAdmin)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: p.isActive ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      p.isActive ? 'Đang mở' : 'Tạm dừng',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: p.isActive ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                      ),
                    ),
                  )
                else if (isToggling)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00693F)),
                  )
                else
                  Switch(
                    value: p.isActive,
                    onChanged: (_) => _handleTogglePackage(p),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProductThumbnail(HomeProductModel p) {
    final raw = p.imageUrl?.trim() ?? '';
    if (raw.isEmpty) {
      return const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 28);
    }
    if (raw.startsWith('data:image')) {
      try {
        final commaIdx = raw.indexOf(',');
        final base64Str = commaIdx != -1 ? raw.substring(commaIdx + 1) : raw;
        final bytes = base64Decode(base64Str);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 28),
        );
      } catch (_) {
        return const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 28);
      }
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return Image.network(
        raw,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 28),
      );
    }
    return Image.asset(
      raw,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 28),
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
        final isToggling = _togglingId == p.id;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
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
            onTap: AuthService.instance.isAdmin ? () => _openProductForm(p) : null,
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: _buildProductThumbnail(p),
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
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                p.treatmentPackageGroup,
                                style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                              ),
                            ),
                            if (!p.isActive) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEE2E2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Tạm dừng',
                                  style: AppTypography.zaloFont(fontSize: 9.5, fontWeight: FontWeight.w600, color: const Color(0xFFDC2626)),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          p.name,
                          style: AppTypography.zaloFont(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: p.isActive ? AppColors.textHeading : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${p.formattedPrice} · Đơn vị: ${p.unit}',
                          style: AppTypography.zaloFont(fontSize: 11.5, fontWeight: FontWeight.w600, color: const Color(0xFF00693F)),
                        ),
                      ],
                    ),
                  ),
                  if (!AuthService.instance.isAdmin)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: p.isActive ? const Color(0xFFE8F6ED) : const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        p.isActive ? 'Đang bán' : 'Tạm dừng',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: p.isActive ? const Color(0xFF00693F) : const Color(0xFF6B7280),
                        ),
                      ),
                    )
                  else if (isToggling)
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00693F)),
                    )
                  else
                    Switch(
                      value: p.isActive,
                      onChanged: (_) => _handleToggleProduct(p),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _handleToggleBanner(AdminBannerModel banner) async {
    if (!AuthService.instance.isAdmin) return;
    final nextPublished = !banner.isPublished;
    setState(() => _togglingId = banner.id);

    final success = await _repository.toggleBannerStatus(banner.id, nextPublished);
    if (mounted) {
      setState(() => _togglingId = null);
      if (success) {
        TopNotificationService.showSuccess(
          title: 'Cập nhật Banner',
          message: nextPublished
              ? 'Đã hiển thị banner "${banner.title}" trên trang chủ'
              : 'Đã ẩn banner "${banner.title}"',
        );
        _fetchData();
      } else {
        TopNotificationService.showError(
          message: 'Lỗi cập nhật trạng thái banner. Vui lòng thử lại.',
        );
      }
    }
  }

  Future<void> _handleDeleteBanner(AdminBannerModel banner) async {
    if (!AuthService.instance.isAdmin) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa banner?'),
        content: Text('Bạn có chắc muốn xóa banner "${banner.title}" khỏi trang chủ không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await _repository.deleteBanner(banner.id);
    if (mounted) {
      if (ok) {
        TopNotificationService.showSuccess(
          title: 'Đã xóa banner',
          message: 'Banner "${banner.title}" đã được xóa.',
        );
        _fetchData();
      } else {
        TopNotificationService.showError(message: 'Không thể xóa banner. Vui lòng thử lại.');
      }
    }
  }

  void _openBannerForm({AdminBannerModel? banner}) {
    final titleCtrl = TextEditingController(text: banner?.title ?? '');
    final summaryCtrl = TextEditingController(text: banner?.summary ?? '');
    final imageUrlCtrl = TextEditingController(text: banner?.imageUrl ?? '');
    final targetLinkCtrl = TextEditingController(text: banner?.targetLink ?? '/academy');
    final sortCtrl = TextEditingController(text: (banner?.sortOrder ?? (_banners.length + 1)).toString());
    String selectedCategory = banner?.category ?? 'DAO_TAO';
    bool isFeatured = banner?.isFeatured ?? true;
    bool isPublished = banner?.isPublished ?? true;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 18,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      banner == null ? 'Thêm Banner trang chủ' : 'Cập nhật Banner',
                      style: AppTypography.zaloFont(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(modalCtx),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tiêu đề banner *',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: summaryCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Mô tả ngắn',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: imageUrlCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Đường dẫn ảnh (URL hoặc assets/...)',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: const {'DAO_TAO', 'DICH_VU', 'KHUYEN_MAI', 'SU_KIEN'}.contains(selectedCategory)
                            ? selectedCategory
                            : 'DAO_TAO',
                        decoration: const InputDecoration(
                          labelText: 'Nhóm hiển thị',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'DAO_TAO', child: Text('Đào tạo Y khoa')),
                          DropdownMenuItem(value: 'DICH_VU', child: Text('Dịch vụ Trị liệu')),
                          DropdownMenuItem(value: 'KHUYEN_MAI', child: Text('Ưu đãi Đặc quyền')),
                          DropdownMenuItem(value: 'SU_KIEN', child: Text('Sự kiện')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => selectedCategory = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      width: 90,
                      child: TextField(
                        controller: sortCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Thứ tự',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: targetLinkCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Đường dẫn điều hướng (vd: /academy, /services)',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Hiển thị trên Trang chủ', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                  value: isPublished,
                  onChanged: (val) => setModalState(() => isPublished = val),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Nổi bật (Featured)', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                  value: isFeatured,
                  onChanged: (val) => setModalState(() => isFeatured = val),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00693F),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: isSaving
                        ? null
                        : () async {
                            final title = titleCtrl.text.trim();
                            if (title.isEmpty) {
                              TopNotificationService.showError(message: 'Vui lòng nhập tiêu đề banner.');
                              return;
                            }
                            setModalState(() => isSaving = true);
                            final ok = await _repository.saveBanner(
                              id: banner?.id,
                              data: {
                                'title': title,
                                'summary': summaryCtrl.text.trim(),
                                'image_url': imageUrlCtrl.text.trim(),
                                'category': selectedCategory,
                                'target_link': targetLinkCtrl.text.trim().isNotEmpty ? targetLinkCtrl.text.trim() : '/academy',
                                'sort_order': int.tryParse(sortCtrl.text.trim()) ?? 1,
                                'is_featured': isFeatured,
                                'status': isPublished ? 'PUBLISHED' : 'DRAFT',
                              },
                            );
                            if (modalCtx.mounted) Navigator.pop(modalCtx);
                            if (mounted) {
                              if (ok) {
                                TopNotificationService.showSuccess(
                                  title: 'Lưu Banner',
                                  message: 'Đã lưu banner "$title" thành công.',
                                );
                                _fetchData();
                              } else {
                                TopNotificationService.showError(message: 'Không thể lưu banner. Vui lòng thử lại.');
                              }
                            }
                          },
                    child: isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            banner == null ? 'Tạo Banner' : 'Cập nhật Banner',
                            style: AppTypography.zaloFont(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBannersList() {
    if (_filteredBanners.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                const Icon(Icons.photo_library_outlined, size: 48, color: Color(0xFFD1D5DB)),
                const SizedBox(height: 10),
                Text(
                  'Chưa có banner trang chủ nào',
                  style: AppTypography.zaloFont(fontSize: 13.5, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(14),
      itemCount: _filteredBanners.length,
      itemBuilder: (context, index) {
        final b = _filteredBanners[index];
        final isToggling = _togglingId == b.id;

        return InkWell(
          onTap: AuthService.instance.isAdmin ? () => _openBannerForm(banner: b) : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: b.isPublished ? const Color(0xFFE5E7EB) : const Color(0xFFFECACA),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 6,
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
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: SmartImage(
                    width: 60,
                    height: 60,
                    borderRadius: BorderRadius.circular(10),
                    imageUrl: b.imageUrl.trim().startsWith('/assets/')
                        ? b.imageUrl.trim().substring(1)
                        : (b.imageUrl.trim().isNotEmpty
                            ? b.imageUrl.trim()
                            : 'assets/images/therapy_hero_banner.jpg'),
                    fit: BoxFit.cover,
                    placeholder: Image.asset(
                      'assets/images/therapy_hero_banner.jpg',
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
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
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                b.categoryDisplay,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.zaloFont(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '#${b.sortOrder}',
                            style: AppTypography.zaloFont(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        b.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: b.isPublished ? AppColors.textHeading : AppColors.textSecondary,
                        ),
                      ),
                      if (b.summary.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          b.summary,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                        ),
                      ],
                    ],
                  ),
                ),
                if (AuthService.instance.isAdmin) ...[
                  if (isToggling)
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00693F)),
                    )
                  else
                    Transform.scale(
                      scale: 0.85,
                      child: Switch(
                        value: b.isPublished,
                        onChanged: (_) => _handleToggleBanner(b),
                      ),
                    ),
                  SizedBox(
                    width: 32,
                    height: 32,
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 20),
                      onPressed: () => _handleDeleteBanner(b),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

