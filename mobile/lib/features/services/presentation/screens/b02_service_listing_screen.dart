import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../../../core/services/portal_settings_service.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../data/models/home_product_model.dart';
import '../../data/repositories/product_repository.dart';
import 'b03_service_detail_screen.dart';

enum ServiceFilterExpanded { service, branch }
enum TherapyItemType { singleService, package }

/// Model hiển thị hợp nhất cho phân hệ Trị liệu (gồm cả Dịch vụ lẻ & Gói liệu trình)
class TherapyDisplayItem {
  final String id;
  final String title;
  final String category;
  final double price;
  final double originalPrice;
  final String durationOrSessions;
  final String description;
  final String imageUrl;
  final TherapyItemType type;
  final SpaServiceModel? singleService;
  final TreatmentPackageModel? package;

  const TherapyDisplayItem({
    required this.id,
    required this.title,
    required this.category,
    required this.price,
    this.originalPrice = 0.0,
    required this.durationOrSessions,
    required this.description,
    required this.imageUrl,
    required this.type,
    this.singleService,
    this.package,
  });

  bool get isPackage => type == TherapyItemType.package;
}

/// Screen B02: Trang Danh mục Dịch vụ & Gói liệu trình & Sản phẩm chuẩn Y khoa MLD
/// - Phân hệ: [ TRỊ LIỆU ] (gồm tất cả dịch vụ lẻ & gói liệu trình từ database) và [ SẢN PHẨM ]
/// - Bộ lọc 2 nút theo phong cách Đào tạo (Accordion mượt mà, chip lựa chọn nhanh)
/// - Lưới hiển thị 2 thẻ 1 hàng, thiết kế chuẩn Y khoa sắc nét
/// - Phân trang 1, 2, 3... đúng 6 thẻ mỗi trang
/// - 100% font chữ Zalo (Roboto) & màu sắc nhận diện MLD
class B02ServiceListingScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final String? initialQuery;
  final String? initialCategory;
  final String? initialBranch;
  final int initialSegment; // 0: Trị liệu, 1: Sản phẩm

  const B02ServiceListingScreen({
    super.key,
    this.onBack,
    this.initialQuery,
    this.initialCategory,
    this.initialBranch,
    this.initialSegment = 0,
  });

  @override
  State<B02ServiceListingScreen> createState() => _B02ServiceListingScreenState();
}

class _B02ServiceListingScreenState extends State<B02ServiceListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _therapyScrollController = ScrollController();
  final ScrollController _productScrollController = ScrollController();
  
  // Phân hệ chính: 0: Trị liệu, 1: Sản phẩm
  late int _selectedSegment;

  // Dịch vụ & Gói liệu trình
  bool _isLoadingTherapy = false;
  List<SpaServiceModel> _services = [];
  List<TreatmentPackageModel> _packages = [];
  List<TherapyDisplayItem> _allTherapyItems = [];

  // Phân trang: 6 thẻ / trang
  static const int _pageSize = 6;
  int _currentTherapyPage = 1;
  int _currentProductPage = 1;

  // Bộ lọc Trị liệu (Theo chuẩn giao diện Đào tạo)
  ServiceFilterExpanded? _expandedFilter;
  final List<String> _therapyCategories = [
    'Tất cả',
    'Dịch vụ lẻ',
    'Gói liệu trình',
    'Chăm sóc khu trú',
    'Chăm sóc mở rộng',
    'Chăm sóc toàn diện',
  ];
  String _selectedTherapyCategory = 'Tất cả';

  List<BranchModel> _branches = [];
  String _selectedBranch = 'Tất cả cơ sở';

  // Sản phẩm bổ trợ tại nhà
  bool _isLoadingProducts = false;
  List<HomeProductModel> _products = ProductRepository.defaultFallbackProducts;
  List<String> _productCategories = ['Tất cả', 'Băng ép', 'Chăm sóc da', 'Dụng cụ tập luyện', 'Tài liệu'];
  String _selectedProductCategory = 'Tất cả';

  @override
  void initState() {
    super.initState();
    _selectedSegment = widget.initialSegment;

    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _searchController.text = widget.initialQuery!.trim();
    }
    if (widget.initialCategory != null && widget.initialCategory!.trim().isNotEmpty) {
      _selectedTherapyCategory = widget.initialCategory!.trim();
      _selectedProductCategory = widget.initialCategory!.trim();
    }
    if (widget.initialBranch != null && widget.initialBranch!.trim().isNotEmpty) {
      _selectedBranch = widget.initialBranch!.trim();
    }

    _loadTherapyDataFromDb();
    _loadBranches();
    _loadProductsFromDb();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _therapyScrollController.dispose();
    _productScrollController.dispose();
    super.dispose();
  }

  /// Tải đồng thời cả Dịch vụ đơn lẻ và Gói liệu trình định kỳ từ Supabase
  Future<void> _loadTherapyDataFromDb() async {
    setState(() => _isLoadingTherapy = true);

    try {
      final results = await Future.wait([
        ServiceRepository.instance.getServices(),
        ServiceRepository.instance.getTreatmentPackages(),
      ]);

      final services = results[0] as List<SpaServiceModel>;
      final packages = results[1] as List<TreatmentPackageModel>;

      final items = <TherapyDisplayItem>[];

      // 1. Thêm các dịch vụ đơn lẻ
      for (final s in services) {
        items.add(
          TherapyDisplayItem(
            id: s.id,
            title: s.name,
            category: s.categoryName,
            price: s.displayPrice,
            originalPrice: (s.discountPrice != null && s.discountPrice! < s.price) ? s.price : 0.0,
            durationOrSessions: '${s.durationMinutes} phút / ca',
            description: s.description,
            imageUrl: s.imageUrl,
            type: TherapyItemType.singleService,
            singleService: s,
          ),
        );
      }

      // 2. Thêm các gói liệu trình định kỳ
      for (final p in packages) {
        items.add(
          TherapyDisplayItem(
            id: p.id,
            title: p.title,
            category: p.category,
            price: p.price,
            originalPrice: p.originalPrice,
            durationOrSessions: '${p.sessionsCount} buổi (${p.validityMonths} tháng)',
            description: p.description,
            imageUrl: p.imageUrl,
            type: TherapyItemType.package,
            package: p,
          ),
        );
      }

      if (mounted) {
        setState(() {
          _services = services;
          _packages = packages;
          _allTherapyItems = items;
          _isLoadingTherapy = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingTherapy = false);
      }
    }
  }

  Future<void> _loadBranches() async {
    var list = BranchRepository.instance.cachedBranches;
    if (list.isEmpty) {
      list = await BranchRepository.instance.getBranches();
    }
    if (mounted) {
      setState(() => _branches = list);
    }
  }

  Future<void> _loadProductsFromDb() async {
    if (_products.isEmpty) {
      setState(() => _isLoadingProducts = true);
    }
    final products = await ProductRepository.instance.getProducts(forceRefresh: true);
    final categories = await ProductRepository.instance.getCategories();

    if (mounted) {
      setState(() {
        if (products.isNotEmpty) {
          _products = products;
        }
        if (categories.isNotEmpty) {
          _productCategories = categories;
        }
        _isLoadingProducts = false;
      });
    }
  }

  /// Lọc dữ liệu Trị liệu theo danh mục và từ khóa
  List<TherapyDisplayItem> get _filteredTherapyItems {
    final query = _searchController.text.trim().toLowerCase();

    return _allTherapyItems.where((item) {
      // 1. Lọc theo Danh mục
      if (_selectedTherapyCategory != 'Tất cả' && _selectedTherapyCategory != 'Tất cả dịch vụ') {
        if (_selectedTherapyCategory == 'Dịch vụ lẻ') {
          if (item.isPackage) return false;
        } else if (_selectedTherapyCategory == 'Gói liệu trình') {
          if (!item.isPackage) return false;
        } else {
          final sel = _selectedTherapyCategory.toLowerCase().trim();
          final titleLower = item.title.toLowerCase();
          final catLower = item.category.toLowerCase();
          final matches = titleLower.contains(sel) || catLower.contains(sel);
          if (!matches) return false;
        }
      }

      // 2. Lọc theo Từ khóa tìm kiếm
      if (query.isNotEmpty) {
        final matchesTitle = item.title.toLowerCase().contains(query);
        final matchesDesc = item.description.toLowerCase().contains(query);
        final matchesCat = item.category.toLowerCase().contains(query);
        if (!matchesTitle && !matchesDesc && !matchesCat) return false;
      }

      return true;
    }).toList();
  }

  /// Lọc dữ liệu Sản phẩm
  List<HomeProductModel> get _filteredProducts {
    final query = _searchController.text.trim().toLowerCase();
    return _products.where((p) {
      if (_selectedProductCategory != 'Tất cả' && _selectedProductCategory != 'Tất cả sản phẩm') {
        if (p.category.toLowerCase().trim() != _selectedProductCategory.toLowerCase().trim()) {
          return false;
        }
      }
      if (query.isNotEmpty) {
        final matchesName = p.name.toLowerCase().contains(query);
        final matchesCat = p.category.toLowerCase().contains(query);
        final matchesDetails = p.details.any((d) => d.toLowerCase().contains(query));
        if (!matchesName && !matchesCat && !matchesDetails) return false;
      }
      return true;
    }).toList();
  }

  /// Điều hướng đặt lịch với đồng bộ 100% hình ảnh dịch vụ
  void _handleBooking(SpaServiceModel service) async {
    final ok = await GuestAuthPrompt.ensureLoggedIn(
      context,
      title: 'Đăng nhập để đặt lịch',
      message: 'Quý khách vui lòng đăng nhập để đặt lịch dịch vụ trị liệu.',
    );
    if (!ok || !mounted) return;

    BranchModel? chosenBranch;
    if (_selectedBranch != 'Tất cả cơ sở' && _selectedBranch != 'Tất cả') {
      try {
        chosenBranch = _branches.firstWhere((b) => b.name == _selectedBranch);
      } catch (_) {}
    }

    Navigator.push(
      context,
      AppPageTransitions.modalSlideUp(
        page: AllInOneBookingScreen(
          onBack: () => Navigator.pop(context),
          initialService: service,
          initialBranch: chosenBranch,
          initialSpecialty: service.categoryName.isNotEmpty ? service.categoryName : null,
        ),
      ),
    );
  }

  void _handlePackageBooking(TreatmentPackageModel package) async {
    final ok = await GuestAuthPrompt.ensureLoggedIn(
      context,
      title: 'Đăng nhập để đặt lịch',
      message: 'Quý khách vui lòng đăng nhập để đặt lịch gói liệu trình.',
    );
    if (!ok || !mounted) return;

    BranchModel? chosenBranch;
    if (_selectedBranch != 'Tất cả cơ sở' && _selectedBranch != 'Tất cả') {
      try {
        chosenBranch = _branches.firstWhere((b) => b.name == _selectedBranch);
      } catch (_) {}
    }

    final packageService = SpaServiceModel(
      id: package.id,
      name: package.name,
      categoryName: package.category.isNotEmpty ? package.category : 'Trị liệu',
      price: package.price,
      originalPrice: package.originalPrice > 0 ? package.originalPrice : package.price,
      durationMinutes: 60,
      description: package.description,
      imageUrl: package.imageUrl,
    );

    Navigator.push(
      context,
      AppPageTransitions.modalSlideUp(
        page: AllInOneBookingScreen(
          onBack: () => Navigator.pop(context),
          initialService: packageService,
          initialBranch: chosenBranch,
          initialSpecialty: package.category.isNotEmpty ? package.category : null,
          userPackageId: package.id,
          userPackageName: package.name,
        ),
      ),
    );
  }

  /// Hiển thị Modal chi tiết Gói Liệu Trình
  void _showPackageDetailModal(TreatmentPackageModel package) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F6ED),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'GÓI ${package.sessionsCount} BUỔI CHUẨN Y KHOA',
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF00693F),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Ảnh gói liệu trình
              Container(
                width: double.infinity,
                height: 180,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: const Color(0xFFF1F5F9),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: _buildImageWidget(package.imageUrl),
                ),
              ),
              const SizedBox(height: 16),

              Text(
                package.title,
                style: AppTypography.zaloFont(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '${formatter.format(package.price)} ₫',
                    style: AppTypography.zaloFont(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF00693F),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '/ ${package.sessionsCount} buổi',
                    style: AppTypography.zaloFont(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Thời hạn liệu trình: ${package.validityMonths} tháng kể từ ngày kích hoạt',
                style: AppTypography.zaloFont(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
              const Divider(height: 24, color: Color(0xFFE5E7EB)),

              Text(
                'Mô tả & Lợi ích trị liệu y khoa:',
                style: AppTypography.zaloFont(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                package.description.isNotEmpty
                    ? package.description
                    : 'Gói liệu trình dẫn lưu phù bạch huyết chuẩn kỹ thuật Vodder quốc tế, tối ưu hóa quá trình tiêu sưng, tăng cường tuần hoàn và hỗ trợ phục hồi sức khỏe bền vững.',
                style: AppTypography.zaloFont(
                  fontSize: 13,
                  color: AppColors.textPrimary,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),

              // Quyền lợi gói
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildBenefitRow('Tiết kiệm chi phí so với đặt lẻ từng buổi'),
                    const SizedBox(height: 6),
                    _buildBenefitRow('Theo dõi hồ sơ và nhật ký lâm sàng từng buổi trên app'),
                    const SizedBox(height: 6),
                    _buildBenefitRow('Ưu tiên giữ phòng và chuyên viên trị liệu theo yêu cầu'),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _handlePackageBooking(package);
                  },
                  icon: const Icon(Icons.calendar_month_rounded, size: 20),
                  label: Text(
                    'Đặt lịch ngay',
                    style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00693F),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handlePackageConsultation(TreatmentPackageModel package) async {
    final ok = await GuestAuthPrompt.ensureLoggedIn(
      context,
      title: 'Đăng nhập để đăng ký',
      message: 'Quý khách vui lòng đăng nhập để đăng ký tư vấn gói liệu trình.',
    );
    if (!ok || !mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Chuyên viên MLD sẽ liên hệ tư vấn "${package.title}" sớm nhất cho quý khách!'),
        backgroundColor: const Color(0xFF00693F),
      ),
    );
  }

  Widget _buildBenefitRow(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_rounded, color: Color(0xFF00693F), size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textPrimary),
          ),
        ),
      ],
    );
  }

  // Chi tiết sản phẩm modal sheet
  void _showProductDetailModal(HomeProductModel product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      product.category.toUpperCase(),
                      style: AppTypography.zaloFont(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Ảnh sản phẩm
              Container(
                width: double.infinity,
                height: 180,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: _buildImageWidget(product.imageUrl!),
                      )
                    : _buildProductPlaceholder(product.category),
              ),
              const SizedBox(height: 16),

              Text(
                product.name,
                style: AppTypography.zaloFont(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Text(
                    product.formattedPrice,
                    style: AppTypography.zaloFont(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF00693F),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '/ ${product.unit}',
                    style: AppTypography.zaloFont(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              const Divider(height: 24, color: Color(0xFFE5E7EB)),

              Text(
                'Chi tiết & Xuất xứ Y khoa:',
                style: AppTypography.zaloFont(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 8),
              if (product.details.isEmpty)
                Text(
                  'Sản phẩm hỗ trợ phục hồi và dẫn lưu bạch huyết đạt chuẩn y khoa MLD.',
                  style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textSecondary),
                )
              else
                ...product.details.map((d) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF00693F), size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            d,
                            style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textHeading),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              const SizedBox(height: 24),

              // Nút tư vấn và đặt mua
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _showProductContactDialog(product);
                  },
                  icon: const Icon(Icons.support_agent_rounded, size: 20),
                  label: Text(
                    'Liên hệ tư vấn (Zalo / Messenger)',
                    style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00693F),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Mở liên kết ngoài (Zalo / Messenger)
  Future<void> _launchContactUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        AppLauncherHelper.openWebUrl(context, url);
      }
    } catch (e) {
      debugPrint('[B02ServiceListing] Error launching contact url $url: $e');
      if (mounted) {
        AppLauncherHelper.openWebUrl(context, url);
      }
    }
  }

  /// Hiển thị Hộp thoại truy cập ở GIỮA MÀN HÌNH (Zalo hoặc Messenger) khi bấm "Liên hệ"
  void _showProductContactDialog(HomeProductModel product) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        elevation: 16,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Header: Badge & Nút đóng
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F6ED),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.verified_user_rounded, size: 14, color: Color(0xFF00693F)),
                          const SizedBox(width: 4),
                          Text(
                            PortalSettingsService.instance.consultationBadgeText,
                            style: AppTypography.zaloFont(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => Navigator.pop(dialogCtx),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Icon lớn ở giữa
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.support_agent_rounded,
                      size: 32,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Tiêu đề & Lời nhắn
                Text(
                  'Liên hệ tư vấn sản phẩm',
                  textAlign: TextAlign.center,
                  style: AppTypography.zaloFont(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Quý khách vui lòng chọn kênh liên hệ để Chuyên viên MLD hỗ trợ tư vấn và hướng dẫn đặt mua thuận tiện nhất:',
                  textAlign: TextAlign.center,
                  style: AppTypography.zaloFont(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 16),

                // Tóm tắt sản phẩm đang liên hệ
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 46,
                          height: 46,
                          color: const Color(0xFFF1F5F9),
                          child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                              ? _buildImageWidget(product.imageUrl!)
                              : _buildProductPlaceholder(product.category, size: 28, showText: false),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textHeading,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${product.formattedPrice} / ${product.unit}',
                              style: AppTypography.zaloFont(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF00693F),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // NÚT TRUY CẬP 1: ZALO
                _buildContactChannelTile(
                  channelName: 'Zalo',
                  description: 'Tư vấn trực tiếp qua Zalo OA chính thức',
                  badgeText: 'Chat ngay',
                  accentColor: const Color(0xFF0068FF),
                  iconWidget: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.asset(
                      'assets/icons/logo-zalo-vector-03.webp',
                      width: 44,
                      height: 44,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0068FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Z',
                          style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ),
                  onTap: () async {
                    Navigator.pop(dialogCtx);
                    await _launchContactUrl(PortalSettingsService.instance.zaloOaUrl);
                  },
                ),
                const SizedBox(height: 12),

                // NÚT TRUY CẬP 2: MESSENGER
                _buildContactChannelTile(
                  channelName: 'Messenger',
                  description: 'Nhắn tin Fanpage Hệ Bạch Huyết MLD',
                  badgeText: 'Nhắn tin',
                  accentColor: const Color(0xFF0084FF),
                  iconWidget: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.asset(
                      'assets/icons/mesenger.jpg',
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF00B2FE), Color(0xFF006AFF), Color(0xFF9B00E8)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 24),
                      ),
                    ),
                  ),
                  onTap: () async {
                    Navigator.pop(dialogCtx);
                    await _launchContactUrl(PortalSettingsService.instance.messengerUrl);
                  },
                ),
                const SizedBox(height: 18),

                // Hotline liên hệ trực tiếp
                InkWell(
                  onTap: () {
                    Navigator.pop(dialogCtx);
                    AppLauncherHelper.makePhoneCall(context, PortalSettingsService.instance.hotlineSupport);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      alignment: WrapAlignment.center,
                      children: [
                        const Icon(Icons.phone_in_talk_rounded, size: 15, color: Color(0xFF00693F)),
                        const SizedBox(width: 6),
                        Text(
                          'Hoặc gọi Hotline: ${PortalSettingsService.instance.hotlineSupport}',
                          style: AppTypography.zaloFont(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF00693F),
                          ),
                        ),
                      ],
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

  /// Thẻ kênh liên hệ truy cập (Zalo / Messenger)
  Widget _buildContactChannelTile({
    required String channelName,
    required String description,
    required String badgeText,
    required Color accentColor,
    required Widget iconWidget,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accentColor.withValues(alpha: 0.35), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: accentColor.withValues(alpha: 0.08),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              iconWidget,
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 2,
                      children: [
                        Text(
                          channelName,
                          style: AppTypography.zaloFont(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textHeading,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badgeText,
                            style: AppTypography.zaloFont(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: accentColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.zaloFont(
                        fontSize: 11.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 13,
                  color: accentColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProductPlaceholder(String category, {double size = 40, bool showText = true}) {
    IconData icon;
    Color color;
    switch (category) {
      case 'Băng ép':
      case 'Băng ép y khoa':
        icon = Icons.healing_rounded;
        color = const Color(0xFFE11D48);
        break;
      case 'Chăm sóc da':
      case 'Kem dưỡng da y khoa':
        icon = Icons.clean_hands_rounded;
        color = const Color(0xFF0284C7);
        break;
      case 'Tài liệu':
        icon = Icons.menu_book_rounded;
        color = const Color(0xFF7C3AED);
        break;
      default:
        icon = Icons.fitness_center_rounded;
        color = const Color(0xFF00693F);
    }

    if (!showText) {
      return Center(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: size * 0.55),
        ),
      );
    }

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: size * 0.55),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              category,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.zaloFont(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageWidget(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackImage(),
      );
    }
    if (url.startsWith('assets/')) {
      return Image.asset(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackImage(),
      );
    }
    return _buildFallbackImage();
  }

  Widget _buildFallbackImage() {
    return Container(
      color: const Color(0xFFEFF6FF),
      child: const Center(
        child: Icon(Icons.spa_rounded, color: AppColors.primary, size: 36),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          context.tr('Dịch vụ & Sản phẩm', 'Services & Products'),
          style: AppTypography.zaloFont(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
        centerTitle: false,
        leading: widget.onBack != null || Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                onPressed: widget.onBack ?? () => Navigator.pop(context),
              )
            : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined, color: AppColors.primary, size: 24),
            tooltip: context.tr('Lịch hẹn của tôi', 'My Appointments'),
            onPressed: () {
              Navigator.push(
                context,
                AppPageTransitions.drillDownSlide(page: const C09MyAppointmentsScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Phân hệ 2 Tab lớn: [ TRỊ LIỆU ] & [ SẢN PHẨM ]
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
              child: Container(
                height: 42,
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedSegment = 0;
                            _searchController.clear();
                            _currentTherapyPage = 1;
                            _expandedFilter = null;
                          });
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: _selectedSegment == 0 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(9),
                            boxShadow: _selectedSegment == 0
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
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.spa_rounded,
                                  size: 16,
                                  color: _selectedSegment == 0 ? AppColors.primary : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'TRỊ LIỆU (${_allTherapyItems.length})',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12.5,
                                    fontWeight: _selectedSegment == 0 ? FontWeight.w700 : FontWeight.w500,
                                    color: _selectedSegment == 0 ? AppColors.primary : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedSegment = 1;
                            _searchController.clear();
                            _currentProductPage = 1;
                            _expandedFilter = null;
                          });
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: _selectedSegment == 1 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(9),
                            boxShadow: _selectedSegment == 1
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
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.shopping_bag_rounded,
                                  size: 16,
                                  color: _selectedSegment == 1 ? const Color(0xFF00693F) : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'SẢN PHẨM (${_products.length})',
                                  style: AppTypography.zaloFont(
                                    fontSize: 12.5,
                                    fontWeight: _selectedSegment == 1 ? FontWeight.w700 : FontWeight.w500,
                                    color: _selectedSegment == 1 ? const Color(0xFF00693F) : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 2. Ô tìm kiếm chuẩn Y khoa
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Container(
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
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) {
                    setState(() {
                      _currentTherapyPage = 1;
                      _currentProductPage = 1;
                    });
                  },
                  style: AppTypography.zaloFont(fontSize: 13.5, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: _selectedSegment == 0
                        ? context.tr('Tìm kiếm dịch vụ, gói liệu trình...', 'Search therapy services & packages...')
                        : 'Tìm kiếm sản phẩm, băng ép, cẩm nang...',
                    hintStyle: AppTypography.zaloFont(fontSize: 13, color: AppColors.textPlaceholder),
                    prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18, color: AppColors.textSecondary),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _currentTherapyPage = 1;
                                _currentProductPage = 1;
                              });
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
            ),

            // 3. Nội dung phân hệ: TRỊ LIỆU vs SẢN PHẨM
            Expanded(
              child: _selectedSegment == 0 ? _buildTherapySection() : _buildProductSection(),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================
  // PHÂN HỆ 1: TRỊ LIỆU (DỊCH VỤ LẺ & GÓI LIỆU TRÌNH ĐỒNG BỘ ADMIN)
  // ==========================================================
  Widget _buildTherapySection() {
    final filtered = _filteredTherapyItems;
    final totalItems = filtered.length;
    final totalPages = (totalItems / _pageSize).ceil().clamp(1, 999);

    if (_currentTherapyPage > totalPages) {
      _currentTherapyPage = totalPages;
    }

    final startIndex = (_currentTherapyPage - 1) * _pageSize;
    final endIndex = (startIndex + _pageSize).clamp(0, totalItems);
    final currentPageItems = totalItems > 0 ? filtered.sublist(startIndex, endIndex) : <TherapyDisplayItem>[];

    return Column(
      children: [
        // 1. Hai nút bộ lọc [ Dịch vụ ▼ ] và [ Cơ sở ▼ ] thiết kế chuẩn như bên Đào tạo
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Row(
            children: [
              // Nút 1: Lọc Dịch vụ / Gói
              Expanded(
                child: _buildAcademyStyleFilterButton(
                  label: _selectedTherapyCategory == 'Tất cả'
                      ? context.tr('Dịch vụ & Gói', 'Services & Packages')
                      : _selectedTherapyCategory,
                  isExpanded: _expandedFilter == ServiceFilterExpanded.service,
                  isSelected: _selectedTherapyCategory != 'Tất cả',
                  onTap: () {
                    setState(() {
                      _expandedFilter = _expandedFilter == ServiceFilterExpanded.service
                          ? null
                          : ServiceFilterExpanded.service;
                    });
                  },
                ),
              ),
              const SizedBox(width: 10),

              // Nút 2: Lọc Cơ sở / Chi nhánh
              Expanded(
                child: _buildAcademyStyleFilterButton(
                  label: _selectedBranch == 'Tất cả cơ sở' || _selectedBranch == 'Tất cả'
                      ? context.tr('Cơ sở', 'Branch')
                      : _selectedBranch,
                  isExpanded: _expandedFilter == ServiceFilterExpanded.branch,
                  isSelected: _selectedBranch != 'Tất cả cơ sở' && _selectedBranch != 'Tất cả',
                  onTap: () {
                    setState(() {
                      _expandedFilter = _expandedFilter == ServiceFilterExpanded.branch
                          ? null
                          : ServiceFilterExpanded.branch;
                    });
                  },
                ),
              ),
            ],
          ),
        ),

        // 2. Khung sổ xuống các tùy chọn (Accordion mở rộng như bên Đào tạo)
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          child: _expandedFilter == null
              ? const SizedBox.shrink()
              : Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
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
                        _expandedFilter == ServiceFilterExpanded.service
                            ? context.tr('Chọn phân loại dịch vụ / gói liệu trình:', 'Select service or package category:')
                            : context.tr('Chọn cơ sở chi nhánh phục vụ:', 'Select branch clinic:'),
                        style: AppTypography.zaloFont(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _expandedFilter == ServiceFilterExpanded.service
                            ? _therapyCategories.map((cat) {
                                final isSel = _selectedTherapyCategory == cat;
                                return ChoiceChip(
                                  label: Text(cat),
                                  selected: isSel,
                                  selectedColor: AppColors.primary,
                                  backgroundColor: Colors.white,
                                  labelStyle: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                    color: isSel ? Colors.white : AppColors.textPrimary,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    side: BorderSide(
                                      color: isSel ? AppColors.primary : const Color(0xFFCBD5E1),
                                    ),
                                  ),
                                  onSelected: (_) {
                                    setState(() {
                                      _selectedTherapyCategory = cat;
                                      _currentTherapyPage = 1;
                                      _expandedFilter = null;
                                    });
                                  },
                                );
                              }).toList()
                            : ['Tất cả cơ sở', ..._branches.map((b) => b.name)].map((br) {
                                final isSel = _selectedBranch == br;
                                return ChoiceChip(
                                  label: Text(br),
                                  selected: isSel,
                                  selectedColor: AppColors.primary,
                                  backgroundColor: Colors.white,
                                  labelStyle: AppTypography.zaloFont(
                                    fontSize: 12,
                                    fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                    color: isSel ? Colors.white : AppColors.textPrimary,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    side: BorderSide(
                                      color: isSel ? AppColors.primary : const Color(0xFFCBD5E1),
                                    ),
                                  ),
                                  onSelected: (_) {
                                    setState(() {
                                      _selectedBranch = br;
                                      _currentTherapyPage = 1;
                                      _expandedFilter = null;
                                    });
                                  },
                                );
                              }).toList(),
                      ),
                    ],
                  ),
                ),
        ),

        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // 3. Lưới hiển thị 2 thẻ 1 hàng (GridView)
        Expanded(
          child: _isLoadingTherapy
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : totalItems == 0
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.find_in_page_outlined, size: 56, color: AppColors.border),
                          const SizedBox(height: 12),
                          Text('Không tìm thấy dịch vụ hoặc gói phù hợp', style: AppTypography.zaloFont(fontSize: 15, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text('Vui lòng thử từ khóa khác hoặc đặt lại bộ lọc.', style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textPlaceholder)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadTherapyDataFromDb,
                      color: AppColors.primary,
                      child: GridView.builder(
                        controller: _therapyScrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(14, 14, 14, 20),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 14,
                          childAspectRatio: 0.62,
                        ),
                        itemCount: currentPageItems.length,
                        itemBuilder: (context, index) {
                          final item = currentPageItems[index];
                          return _buildTherapyGridCard(item);
                        },
                      ),
                    ),
        ),

        // 4. Thanh phân trang 1, 2, 3... đúng 6 thẻ mỗi trang
        if (totalPages > 1 && !_isLoadingTherapy)
          _buildPaginationBar(
            currentPage: _currentTherapyPage,
            totalPages: totalPages,
            totalItems: totalItems,
            onPageChanged: (newPage) {
              setState(() => _currentTherapyPage = newPage);
              if (_therapyScrollController.hasClients) {
                _therapyScrollController.animateTo(
                  0,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOut,
                );
              }
            },
          ),
      ],
    );
  }

  /// Card Trị liệu hiển thị 2 thẻ 1 hàng (Dịch vụ lẻ vs Gói liệu trình)
  Widget _buildTherapyGridCard(TherapyDisplayItem item) {
    final formatter = NumberFormat('#,###', 'vi_VN');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (item.isPackage) {
            _showPackageDetailModal(item.package!);
          } else if (item.singleService != null) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => B03ServiceDetailScreen(serviceModel: item.singleService!),
              ),
            );
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Ảnh dịch vụ / Gói
              Expanded(
                flex: 9,
                child: Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                      ),
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                        child: _buildImageWidget(item.imageUrl),
                      ),
                    ),
                    // Badge nhận diện Dịch vụ lẻ vs Gói liệu trình
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: item.isPackage ? const Color(0xFF00693F) : AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Text(
                          item.isPackage
                              ? 'GÓI ${item.package?.sessionsCount ?? 10} BUỔI'
                              : 'DỊCH VỤ LẺ',
                          style: AppTypography.zaloFont(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 2. Thông tin nội dung
              Expanded(
                flex: 11,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Tên dịch vụ
                          Text(
                            item.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 4),

                          // Thời lượng / Số buổi
                          Row(
                            children: [
                              Icon(
                                item.isPackage ? Icons.calendar_today_rounded : Icons.access_time_rounded,
                                size: 12,
                                color: AppColors.textSecondary,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  item.durationOrSessions,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.zaloFont(
                                    fontSize: 11,
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Giá tiền & Nút thao tác
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                '${formatter.format(item.price)} ₫',
                                style: AppTypography.zaloFont(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w800,
                                  color: item.isPackage ? const Color(0xFF00693F) : const Color(0xFFDC2626),
                                ),
                              ),
                              if (item.originalPrice > item.price) ...[
                                const SizedBox(width: 4),
                                Text(
                                  '${formatter.format(item.originalPrice)} ₫',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    decoration: TextDecoration.lineThrough,
                                    color: Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 6),

                          // Nút bấm: "Đặt lịch" cho Dịch vụ lẻ hoặc "Tư vấn gói" cho Gói liệu trình
                          SizedBox(
                            width: double.infinity,
                            height: 32,
                            child: ElevatedButton(
                              onPressed: () {
                                if (item.isPackage) {
                                  _showPackageDetailModal(item.package!);
                                } else if (item.singleService != null) {
                                  _handleBooking(item.singleService!);
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: item.isPackage
                                    ? const Color(0xFFE8F6ED)
                                    : AppColors.primary,
                                foregroundColor: item.isPackage
                                    ? const Color(0xFF00693F)
                                    : Colors.white,
                                elevation: 0,
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: item.isPackage
                                      ? const BorderSide(color: Color(0xFF22C55E), width: 0.8)
                                      : BorderSide.none,
                                ),
                              ),
                              child: Text(
                                item.isPackage ? 'Tư vấn gói' : 'Đặt lịch',
                                style: AppTypography.zaloFont(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================================
  // PHÂN HỆ 2: SẢN PHẨM BỔ TRỢ TẠI NHÀ (TỪ DATABASE SUPABASE)
  // ==========================================================
  Widget _buildProductSection() {
    final filtered = _filteredProducts;
    final totalItems = filtered.length;
    final totalPages = (totalItems / _pageSize).ceil().clamp(1, 999);

    if (_currentProductPage > totalPages) {
      _currentProductPage = totalPages;
    }

    final startIndex = (_currentProductPage - 1) * _pageSize;
    final endIndex = (startIndex + _pageSize).clamp(0, totalItems);
    final currentPageProducts = totalItems > 0 ? filtered.sublist(startIndex, endIndex) : <HomeProductModel>[];

    return Column(
      children: [
        // Chips lọc danh mục sản phẩm
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _productCategories.map((cat) {
                final isSelected = _selectedProductCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(cat),
                    selected: isSelected,
                    selectedColor: const Color(0xFFE8F6ED),
                    backgroundColor: const Color(0xFFF9FAFB),
                    labelStyle: AppTypography.zaloFont(
                      fontSize: 12,
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
                      setState(() {
                        _selectedProductCategory = cat;
                        _currentProductPage = 1;
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // Lưới sản phẩm (Grid)
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadProductsFromDb,
            color: const Color(0xFF00693F),
            child: _isLoadingProducts
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00693F)))
                : totalItems == 0
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.inventory_2_outlined, size: 56, color: AppColors.border),
                            const SizedBox(height: 12),
                            Text('Chưa có sản phẩm nào phù hợp', style: AppTypography.zaloFont(fontSize: 15, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 6),
                            Text('Dữ liệu sản phẩm đồng bộ trực tiếp từ quản trị hệ thống.', style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textPlaceholder)),
                          ],
                        ),
                      )
                    : GridView.builder(
                        controller: _productScrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(14, 14, 14, 20),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 14,
                          childAspectRatio: 0.58,
                        ),
                        itemCount: currentPageProducts.length,
                        itemBuilder: (ctx, index) {
                          final product = currentPageProducts[index];
                          return _buildProductCard(product);
                        },
                      ),
          ),
        ),

        // Phân trang sản phẩm
        if (totalPages > 1 && !_isLoadingProducts)
          _buildPaginationBar(
            currentPage: _currentProductPage,
            totalPages: totalPages,
            totalItems: totalItems,
            onPageChanged: (newPage) {
              setState(() => _currentProductPage = newPage);
              if (_productScrollController.hasClients) {
                _productScrollController.animateTo(
                  0,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOut,
                );
              }
            },
          ),
      ],
    );
  }

  // Card Sản phẩm chuẩn y khoa
  Widget _buildProductCard(HomeProductModel product) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showProductDetailModal(product),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ảnh sản phẩm / Placeholder
              Expanded(
                flex: 5,
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                  ),
                  child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                      ? ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                          child: _buildImageWidget(product.imageUrl!),
                        )
                      : _buildProductPlaceholder(product.category),
                ),
              ),

              // Thông tin sản phẩm & Nút liên hệ
              Expanded(
                flex: 7,
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F6ED),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              product.category,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF00693F),
                              ),
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            product.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                              height: 1.25,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.formattedPrice,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF00693F),
                            ),
                          ),
                          Text(
                            'Đơn vị: ${product.unit}',
                            style: AppTypography.zaloFont(
                              fontSize: 10.5,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),

                          // Nút "Liên hệ" mở Dialog truy cập Zalo / Messenger ở giữa màn hình
                          SizedBox(
                            width: double.infinity,
                            height: 32,
                            child: ElevatedButton.icon(
                              onPressed: () => _showProductContactDialog(product),
                              icon: const Icon(Icons.support_agent_rounded, size: 14),
                              label: Text(
                                'Liên hệ',
                                style: AppTypography.zaloFont(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFE8F6ED),
                                foregroundColor: const Color(0xFF00693F),
                                elevation: 0,
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: const BorderSide(color: Color(0xFF22C55E), width: 0.8),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Nút bộ lọc được thiết kế chuẩn như bên Đào tạo (nổi khối, bo tròn 14px, bóng nhẹ)
  Widget _buildAcademyStyleFilterButton({
    required String label,
    required bool isExpanded,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isExpanded ? const Color(0xFFEFF6FF) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.zaloFont(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isExpanded || isSelected
                      ? AppColors.primary
                      : AppColors.textPrimary,
                ),
              ),
            ),
            Icon(
              isExpanded
                  ? Icons.keyboard_arrow_up_rounded
                  : Icons.keyboard_arrow_down_rounded,
              size: 18,
              color: isExpanded || isSelected
                  ? AppColors.primary
                  : AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  /// Thanh phân trang chuẩn 1, 2, 3... đồng bộ Admin
  Widget _buildPaginationBar({
    required int currentPage,
    required int totalPages,
    required int totalItems,
    required ValueChanged<int> onPageChanged,
  }) {
    final startIndex = ((currentPage - 1) * _pageSize) + 1;
    final endIndex = (currentPage * _pageSize).clamp(1, totalItems);

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Nút Previous
              InkWell(
                onTap: currentPage > 1 ? () => onPageChanged(currentPage - 1) : null,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: currentPage > 1 ? Colors.white : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: currentPage > 1 ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Icon(
                    Icons.chevron_left_rounded,
                    size: 20,
                    color: currentPage > 1 ? AppColors.textPrimary : const Color(0xFF94A3B8),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Các nút số trang
              ...List.generate(totalPages, (index) {
                final pageNumber = index + 1;
                final isCurrent = pageNumber == currentPage;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: InkWell(
                    onTap: () => onPageChanged(pageNumber),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: isCurrent ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isCurrent ? AppColors.primary : const Color(0xFFCBD5E1),
                        ),
                        boxShadow: isCurrent
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.25),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      child: Center(
                        child: Text(
                          '$pageNumber',
                          style: AppTypography.zaloFont(
                            fontSize: 13,
                            fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                            color: isCurrent ? Colors.white : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }),

              const SizedBox(width: 8),

              // Nút Next
              InkWell(
                onTap: currentPage < totalPages ? () => onPageChanged(currentPage + 1) : null,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: currentPage < totalPages ? Colors.white : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: currentPage < totalPages ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: currentPage < totalPages ? AppColors.textPrimary : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            'Hiển thị $startIndex–$endIndex trong $totalItems mục',
            style: AppTypography.zaloFont(
              fontSize: 11.5,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
