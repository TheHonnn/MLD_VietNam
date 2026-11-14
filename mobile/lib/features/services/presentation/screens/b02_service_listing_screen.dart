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
import 'home_product_detail_screen.dart';

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
  List<SpaServiceModel> get services => _services;
  List<TreatmentPackageModel> _packages = [];
  List<TreatmentPackageModel> get packages => _packages;
  List<TherapyDisplayItem> _allTherapyItems = [];

  // Phân trang: 6 thẻ / trang
  static const int _pageSize = 6;
  int _currentTherapyPage = 1;
  int _currentProductPage = 1;

  // Bộ lọc Trị liệu (Theo chuẩn giao diện Đào tạo)
  ServiceFilterExpanded? _expandedFilter;
  List<String> get _therapyCategories {
    final list = <String>['Tất cả', 'Dịch vụ lẻ', 'Gói liệu trình'];
    for (final item in _allTherapyItems) {
      final cat = item.category.trim();
      if (cat.isNotEmpty && !list.contains(cat)) {
        list.add(cat);
      }
    }
    return list;
  }
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

  /// Đặt lịch trực tiếp cho dịch vụ hoặc gói bổ trợ
  void _handleBookingItem(TherapyDisplayItem item) async {
    final ok = await GuestAuthPrompt.ensureLoggedIn(
      context,
      title: 'Đăng nhập để đặt lịch',
      message: 'Quý khách vui lòng đăng nhập để đặt lịch dịch vụ hoặc gói bổ trợ.',
    );
    if (!ok || !mounted) return;

    BranchModel? chosenBranch;
    if (_selectedBranch != 'Tất cả cơ sở' && _selectedBranch != 'Tất cả') {
      try {
        chosenBranch = _branches.firstWhere((b) => b.name == _selectedBranch);
      } catch (_) {}
    }

    final service = item.singleService ??
        SpaServiceModel(
          id: item.package?.id ?? item.id,
          name: item.title,
          categoryName: item.category.isNotEmpty ? item.category : 'Gói liệu trình bổ trợ',
          shortDescription: item.description,
          fullDescription: item.package?.description ?? item.description,
          durationMinutes: (item.package?.sessionsCount ?? 1) * 60,
          price: item.price,
          imageUrl: item.imageUrl,
          steps: const ['Khám & tư vấn phác đồ', 'Tiến hành liệu trình chuyên sâu', 'Theo dõi phục hồi & dặn dò'],
          benefits: const ['Liệu trình chuẩn Y khoa MLD', 'Tiết kiệm chi phí', 'Cam kết hiệu quả tối ưu'],
        );

    Navigator.push(
      context,
      AppPageTransitions.modalSlideUp(
        page: AllInOneBookingScreen(
          onBack: () => Navigator.pop(context),
          initialService: service,
          initialBranch: chosenBranch,
          initialSpecialty: service.categoryName.isNotEmpty ? service.categoryName : null,
          userPackageId: item.isPackage ? (item.package?.id ?? item.id) : null,
          userPackageName: item.isPackage ? item.title : null,
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

  void _showContactSheet({
    required String title,
    required String? imageUrl,
    required String category,
    String? priceText,
    String? subtitle,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetCtx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 72,
                        height: 72,
                        color: const Color(0xFFF1F5F9),
                        child: imageUrl != null && imageUrl.isNotEmpty
                            ? _buildImageWidget(imageUrl)
                            : _buildProductPlaceholder(category, size: 32, showText: false),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.iceBlue,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              category,
                              style: AppTypography.zaloFont(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryNavy,
                              ),
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.zaloFont(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textHeading,
                              height: 1.25,
                            ),
                          ),
                          if (priceText != null && priceText.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              priceText,
                              style: AppTypography.zaloFont(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors.servicePrice,
                              ),
                            ),
                          ],
                          if (subtitle != null && subtitle.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              subtitle,
                              style: AppTypography.zaloFont(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 22),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => Navigator.pop(bottomSheetCtx),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                ),
                Text(
                  'Chọn kênh liên hệ tư vấn',
                  style: AppTypography.zaloFont(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          Navigator.pop(bottomSheetCtx);
                          await _launchContactUrl(PortalSettingsService.instance.zaloOaUrl);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          height: 46,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0068FF),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: Image.asset(
                                  'assets/icons/logo-zalo-vector-03.webp',
                                  width: 20,
                                  height: 20,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 18),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Zalo',
                                style: AppTypography.zaloFont(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          Navigator.pop(bottomSheetCtx);
                          await _launchContactUrl(PortalSettingsService.instance.messengerUrl);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          height: 46,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0084FF),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: Image.asset(
                                  'assets/icons/mesenger.jpg',
                                  width: 20,
                                  height: 20,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.messenger_outline, color: Colors.white, size: 18),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Messenger',
                                style: AppTypography.zaloFont(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                InkWell(
                  onTap: () async {
                    Navigator.pop(bottomSheetCtx);
                    final hotline = PortalSettingsService.instance.hotlineSupport.replaceAll(RegExp(r'[^0-9+]'), '');
                    await _launchContactUrl('tel:$hotline');
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 44,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.phone_in_talk_rounded, size: 18, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Text(
                          'Gọi hotline ${PortalSettingsService.instance.hotlineSupport}',
                          style: AppTypography.zaloFont(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
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
    if (url.startsWith('data:image/') || url.startsWith('data:')) {
      try {
        final commaIdx = url.indexOf(',');
        final base64Str = commaIdx != -1 ? url.substring(commaIdx + 1).trim() : url.trim();
        final bytes = base64Decode(base64Str);
        return Image.memory(
          bytes,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackImage(),
        );
      } catch (_) {
        return _buildFallbackImage();
      }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        width: double.infinity,
        height: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackImage(),
      );
    }
    if (url.startsWith('assets/')) {
      return Image.asset(
        url,
        width: double.infinity,
        height: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackImage(),
      );
    }
    try {
      if (url.length > 50) {
        final bytes = base64Decode(url.trim());
        return Image.memory(
          bytes,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackImage(),
        );
      }
    } catch (_) {}
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
                      child: CustomScrollView(
                        controller: _therapyScrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                            sliver: SliverGrid(
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 14,
                                childAspectRatio: 0.60,
                              ),
                              delegate: SliverChildBuilderDelegate(
                                (context, index) {
                                  final item = currentPageItems[index];
                                  return _buildTherapyGridCard(item);
                                },
                                childCount: currentPageItems.length,
                              ),
                            ),
                          ),
                          if (totalPages > 1 && !_isLoadingTherapy)
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 24),
                                child: _buildPaginationBar(
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
                              ),
                            ),
                        ],
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildTherapyGridCard(TherapyDisplayItem item) {
    final formatter = NumberFormat('#,###', 'vi_VN');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _handleBookingItem(item),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 9,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                      child: Container(
                        color: const Color(0xFFF1F5F9),
                        width: double.infinity,
                        height: double.infinity,
                        child: _buildImageWidget(item.imageUrl),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: item.isPackage ? AppColors.accent : AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
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
              Expanded(
                flex: 11,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                      const SizedBox(height: 6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '${formatter.format(item.price)} ₫',
                            style: AppTypography.zaloFont(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.servicePrice,
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
                      const Spacer(),
                      SizedBox(
                        width: double.infinity,
                        height: 32,
                        child: ElevatedButton(
                          onPressed: () => _handleBookingItem(item),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.calendar_month_outlined,
                                size: 14,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Đặt lịch',
                                style: AppTypography.zaloFont(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
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
                    : CustomScrollView(
                        controller: _productScrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                            sliver: SliverGrid(
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 14,
                                childAspectRatio: 0.60,
                              ),
                              delegate: SliverChildBuilderDelegate(
                                (ctx, index) {
                                  final product = currentPageProducts[index];
                                  return _buildProductCard(product);
                                },
                                childCount: currentPageProducts.length,
                              ),
                            ),
                          ),
                          if (totalPages > 1 && !_isLoadingProducts)
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 24),
                                child: _buildPaginationBar(
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
                              ),
                            ),
                        ],
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildProductCard(HomeProductModel product) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => HomeProductDetailScreen(product: product),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 9,
                child: Container(
                  width: double.infinity,
                  height: double.infinity,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                      ? ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                          child: SizedBox.expand(
                            child: _buildImageWidget(product.imageUrl!),
                          ),
                        )
                      : _buildProductPlaceholder(product.category),
                ),
              ),
              Expanded(
                flex: 11,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.iceBlue,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          product.category,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.zaloFont(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryNavy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        product.formattedPrice,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.zaloFont(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors.servicePrice,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        'Đơn vị: ${product.unit}',
                        style: AppTypography.zaloFont(
                          fontSize: 10,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const Spacer(),
                      SizedBox(
                        width: double.infinity,
                        height: 30,
                        child: ElevatedButton.icon(
                          onPressed: () => _showContactSheet(
                            title: product.name,
                            imageUrl: product.imageUrl,
                            category: product.category,
                            priceText: product.formattedPrice,
                            subtitle: 'Đơn vị: ${product.unit}',
                          ),
                          icon: const Icon(Icons.support_agent_rounded, size: 14),
                          label: Text(
                            'Liên hệ',
                            style: AppTypography.zaloFont(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEFF6EE),
                            foregroundColor: AppColors.accent,
                            elevation: 0,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
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
      color: Colors.transparent,
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
