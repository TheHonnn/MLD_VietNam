import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../../home/presentation/widgets/vodder_service_card.dart';
import '../../data/models/home_product_model.dart';
import '../../data/repositories/product_repository.dart';

enum ServiceFilterExpanded { service, branch }

/// Screen B02: Trang Danh mục Dịch vụ & Sản phẩm chuẩn Y khoa MLD Việt Nam
/// - Giao diện chia đôi phân hệ: [ TRỊ LIỆU ] và [ SẢN PHẨM ]
/// - Sản phẩm lấy trực tiếp từ bảng `home_products` trên Database Supabase, đồng bộ Web Admin
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
  
  // 0: Trị liệu, 1: Sản phẩm
  late int _selectedSegment;

  // Dịch vụ trị liệu
  bool _isLoadingServices = false;
  List<SpaServiceModel> _services = [];
  ServiceFilterExpanded? _expandedFilter;
  List<String> _serviceCategories = ['Tất cả dịch vụ'];
  String _selectedServiceCategory = 'Tất cả dịch vụ';
  List<BranchModel> _branches = [];
  String _selectedBranch = 'Tất cả cơ sở';

  // Sản phẩm bổ trợ tại nhà
  bool _isLoadingProducts = false;
  List<HomeProductModel> _products = [];
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
      _selectedServiceCategory = widget.initialCategory!.trim();
      _selectedProductCategory = widget.initialCategory!.trim();
    }
    if (widget.initialBranch != null && widget.initialBranch!.trim().isNotEmpty) {
      _selectedBranch = widget.initialBranch!.trim();
    }

    _loadServicesFromDb();
    _loadBranches();
    _loadProductsFromDb();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadServicesFromDb() async {
    setState(() => _isLoadingServices = true);
    final services = await ServiceRepository.instance.getServices();
    final categories = await ServiceRepository.instance.getCategories();

    final catSet = <String>{'Tất cả dịch vụ'};
    for (final c in categories) {
      if (c != 'Tất cả' && c != 'Tất cả dịch vụ' && c.trim().isNotEmpty) {
        catSet.add(c.trim());
      }
    }
    for (final s in services) {
      if (s.categoryName.trim().isNotEmpty && s.categoryName != 'Massage thư giãn') {
        catSet.add(s.categoryName.trim());
      }
    }

    if (mounted) {
      setState(() {
        _services = services;
        _serviceCategories = catSet.toList();
        _isLoadingServices = false;
      });
    }
  }

  Future<void> _loadBranches() async {
    var list = BranchRepository.instance.cachedBranches;
    if (list.isEmpty) {
      list = await BranchRepository.instance.getBranches();
    }
    if (mounted) {
      setState(() {
        _branches = list;
      });
    }
  }

  Future<void> _loadProductsFromDb() async {
    setState(() => _isLoadingProducts = true);
    final products = await ProductRepository.instance.getProducts(forceRefresh: true);
    final categories = await ProductRepository.instance.getCategories();

    if (mounted) {
      setState(() {
        _products = products;
        if (categories.isNotEmpty) {
          _productCategories = categories;
        }
        _isLoadingProducts = false;
      });
    }
  }

  List<SpaServiceModel> get _filteredServices {
    final query = _searchController.text.trim().toLowerCase();
    return _services.where((s) {
      // 1. Lọc theo danh mục dịch vụ từ database
      if (_selectedServiceCategory != 'Tất cả dịch vụ' && _selectedServiceCategory != 'Tất cả') {
        final sCat = s.categoryName.toLowerCase().trim();
        final selCat = _selectedServiceCategory.toLowerCase().trim();
        final matchesCat = sCat == selCat || sCat.contains(selCat) || selCat.contains(sCat);
        if (!matchesCat) return false;
      }
      // 2. Lọc theo từ khóa tìm kiếm
      if (query.isNotEmpty) {
        final matchesQuery = s.name.toLowerCase().contains(query) ||
            s.shortDescription.toLowerCase().contains(query) ||
            s.fullDescription.toLowerCase().contains(query) ||
            s.categoryName.toLowerCase().contains(query);
        if (!matchesQuery) return false;
      }
      return true;
    }).toList();
  }

  List<HomeProductModel> get _filteredProducts {
    final query = _searchController.text.trim().toLowerCase();
    return _products.where((p) {
      // 1. Lọc theo danh mục sản phẩm
      if (_selectedProductCategory != 'Tất cả' && _selectedProductCategory != 'Tất cả sản phẩm') {
        if (p.category.toLowerCase().trim() != _selectedProductCategory.toLowerCase().trim()) {
          return false;
        }
      }
      // 2. Lọc theo từ khóa
      if (query.isNotEmpty) {
        final matchesName = p.name.toLowerCase().contains(query);
        final matchesCat = p.category.toLowerCase().contains(query);
        final matchesDetails = p.details.any((d) => d.toLowerCase().contains(query));
        if (!matchesName && !matchesCat && !matchesDetails) return false;
      }
      return true;
    }).toList();
  }

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
                        child: Image.network(
                          product.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildProductPlaceholder(product.category),
                        ),
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
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Chuyên viên MLD sẽ hỗ trợ tư vấn sản phẩm "${product.name}" cho quý khách!'),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                  },
                  icon: const Icon(Icons.phone_in_talk_rounded, size: 18),
                  label: Text(
                    'Tư vấn & Mua tại cơ sở',
                    style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
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

  Widget _buildProductPlaceholder(String category) {
    IconData icon;
    Color color;
    switch (category) {
      case 'Băng ép':
        icon = Icons.healing_rounded;
        color = const Color(0xFFE11D48);
        break;
      case 'Chăm sóc da':
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

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 30),
          ),
          const SizedBox(height: 8),
          Text(
            category,
            style: AppTypography.zaloFont(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
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
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                onPressed: widget.onBack,
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
                                  'TRỊ LIỆU (${_services.length})',
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

            // 2. Ô tìm kiếm
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
                  onChanged: (_) => setState(() {}),
                  style: AppTypography.zaloFont(fontSize: 13.5, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: _selectedSegment == 0
                        ? context.tr('Tìm kiếm dịch vụ trị liệu...', 'Search therapy services...')
                        : 'Tìm kiếm sản phẩm, băng ép, cẩm nang...',
                    hintStyle: AppTypography.zaloFont(fontSize: 13, color: AppColors.textPlaceholder),
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
  // PHÂN HỆ 1: DỊCH VỤ TRỊ LIỆU
  // ==========================================================
  Widget _buildTherapySection() {
    return Column(
      children: [
        // Bộ lọc 2 nút Dịch vụ & Cơ sở
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: _buildFilterTrigger(
                  label: _selectedServiceCategory,
                  icon: Icons.spa_outlined,
                  isExpanded: _expandedFilter == ServiceFilterExpanded.service,
                  isFiltered: _selectedServiceCategory != 'Tất cả dịch vụ' && _selectedServiceCategory != 'Tất cả',
                  onTap: () {
                    setState(() {
                      _expandedFilter = _expandedFilter == ServiceFilterExpanded.service ? null : ServiceFilterExpanded.service;
                    });
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildFilterTrigger(
                  label: _selectedBranch,
                  icon: Icons.location_on_outlined,
                  isExpanded: _expandedFilter == ServiceFilterExpanded.branch,
                  isFiltered: _selectedBranch != 'Tất cả cơ sở' && _selectedBranch != 'Tất cả',
                  onTap: () {
                    setState(() {
                      _expandedFilter = _expandedFilter == ServiceFilterExpanded.branch ? null : ServiceFilterExpanded.branch;
                    });
                  },
                ),
              ),
            ],
          ),
        ),

        // Danh sách sổ xuống bộ lọc
        if (_expandedFilter != null)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            constraints: const BoxConstraints(maxHeight: 180),
            child: SingleChildScrollView(
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _expandedFilter == ServiceFilterExpanded.service
                    ? _serviceCategories.map((cat) {
                        final isSel = _selectedServiceCategory == cat;
                        return ChoiceChip(
                          label: Text(cat),
                          selected: isSel,
                          selectedColor: AppColors.primary,
                          backgroundColor: const Color(0xFFF1F5F9),
                          labelStyle: AppTypography.zaloFont(
                            fontSize: 12,
                            fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                            color: isSel ? Colors.white : AppColors.textPrimary,
                          ),
                          onSelected: (_) {
                            setState(() {
                              _selectedServiceCategory = cat;
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
                          backgroundColor: const Color(0xFFF1F5F9),
                          labelStyle: AppTypography.zaloFont(
                            fontSize: 12,
                            fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                            color: isSel ? Colors.white : AppColors.textPrimary,
                          ),
                          onSelected: (_) {
                            setState(() {
                              _selectedBranch = br;
                              _expandedFilter = null;
                            });
                          },
                        );
                      }).toList(),
              ),
            ),
          ),

        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // Danh sách dịch vụ
        Expanded(
          child: _isLoadingServices
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : _filteredServices.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.find_in_page_outlined, size: 56, color: AppColors.border),
                          const SizedBox(height: 12),
                          Text('Không tìm thấy dịch vụ phù hợp', style: AppTypography.zaloFont(fontSize: 15, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text('Vui lòng thử từ khóa khác hoặc đặt lại bộ lọc.', style: AppTypography.zaloFont(fontSize: 12.5, color: AppColors.textPlaceholder)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      itemCount: _filteredServices.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        final item = _filteredServices[index];
                        return VodderServiceCard(
                          service: item,
                          onBooking: () => _handleBooking(item),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  // ==========================================================
  // PHÂN HỆ 2: SẢN PHẨM BỔ TRỢ TẠI NHÀ (TỪ DATABASE SUPABASE)
  // ==========================================================
  Widget _buildProductSection() {
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
                      setState(() => _selectedProductCategory = cat);
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
                : _filteredProducts.isEmpty
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
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 14,
                          childAspectRatio: 0.68,
                        ),
                        itemCount: _filteredProducts.length,
                        itemBuilder: (ctx, index) {
                          final product = _filteredProducts[index];
                          return _buildProductCard(product);
                        },
                      ),
          ),
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
                          child: Image.network(
                            product.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _buildProductPlaceholder(product.category),
                          ),
                        )
                      : _buildProductPlaceholder(product.category),
                ),
              ),

              // Thông tin sản phẩm
              Expanded(
                flex: 6,
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
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              product.category,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.zaloFont(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
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

  Widget _buildFilterTrigger({
    required String label,
    required IconData icon,
    required bool isExpanded,
    required bool isFiltered,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isFiltered ? const Color(0xFFEFF6FF) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isFiltered ? AppColors.primary : const Color(0xFFE5E7EB),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: isFiltered ? AppColors.primary : const Color(0xFF6B7280)),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.zaloFont(
                  fontSize: 12,
                  fontWeight: isFiltered ? FontWeight.w700 : FontWeight.w500,
                  color: isFiltered ? AppColors.primary : AppColors.textHeading,
                ),
              ),
            ),
            Icon(
              isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
              size: 18,
              color: const Color(0xFF6B7280),
            ),
          ],
        ),
      ),
    );
  }
}
