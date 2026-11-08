import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../../home/presentation/widgets/vodder_service_card.dart';

enum ServiceFilterExpanded { service, branch }

/// Screen B02: Trang Danh mục dịch vụ chuẩn Y khoa MLD Việt Nam
/// - Dưới ô tìm kiếm có 2 nút chọn: [ Dịch vụ ] và [ Cơ sở ]
/// - Mặc định: Để tất cả, không sổ danh sách lọc
/// - Click vào nút "Dịch vụ" -> Sổ ra danh sách các dịch vụ để chọn và lọc
/// - Click vào nút "Cơ sở" -> Sổ ra danh sách các cơ sở để chọn và lọc
/// - Click lại vào nút -> Thu gọn lại
/// - Thiết kế đồng bộ chuẩn Trang Tài liệu:
///   + Bo viền vuông tròn nhẹ 8px
///   + 100% phông chữ Montserrat, màu sắc xanh dương #2860EB
class B02ServiceListingScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final String? initialQuery;
  final String? initialCategory;
  final String? initialBranch;

  const B02ServiceListingScreen({
    super.key,
    this.onBack,
    this.initialQuery,
    this.initialCategory,
    this.initialBranch,
  });

  @override
  State<B02ServiceListingScreen> createState() => _B02ServiceListingScreenState();
}

class _B02ServiceListingScreenState extends State<B02ServiceListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = false;
  List<SpaServiceModel> _services = [];

  // Trạng thái mở rộng bộ lọc: mặc định là null (thu gọn, hiển thị tất cả)
  ServiceFilterExpanded? _expandedFilter;

  // Danh mục lọc dịch vụ (tự động lấy từ Database Supabase)
  List<String> _serviceCategories = ['Tất cả dịch vụ'];
  String _selectedServiceCategory = 'Tất cả dịch vụ';

  // Danh mục lọc cơ sở
  List<BranchModel> _branches = [];
  String _selectedBranch = 'Tất cả cơ sở';

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _searchController.text = widget.initialQuery!.trim();
    }
    if (widget.initialCategory != null && widget.initialCategory!.trim().isNotEmpty) {
      _selectedServiceCategory = widget.initialCategory!.trim();
    }
    if (widget.initialBranch != null && widget.initialBranch!.trim().isNotEmpty) {
      _selectedBranch = widget.initialBranch!.trim();
    }
    _loadServicesFromDb();
    _loadBranches();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadServicesFromDb() async {
    setState(() => _isLoading = true);
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
        _isLoading = false;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          context.tr('Dịch vụ trị liệu', 'Therapy Services'),
          style: GoogleFonts.beVietnamPro(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF003876),
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
            // 1. Ô tìm kiếm dịch vụ - BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
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
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: context.tr('Tìm kiếm dịch vụ trị liệu...', 'Search therapy services...'),
                    hintStyle: const TextStyle(
                      fontSize: 14,
                      color: AppColors.textPlaceholder,
                    ),
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF003876), size: 20),
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

            // 2. Hai nút bộ lọc: [ Dịch vụ ▼ ] và [ Cơ sở ▼ ]
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
                          if (_expandedFilter == ServiceFilterExpanded.service) {
                            _expandedFilter = null; // Thu gọn
                          } else {
                            _expandedFilter = ServiceFilterExpanded.service; // Mở ra
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: _expandedFilter == ServiceFilterExpanded.service
                              ? const Color(0xFFEFF6FF)
                              : Colors.white,
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
                                _selectedServiceCategory == 'Tất cả dịch vụ' || _selectedServiceCategory == 'Tất cả'
                                    ? context.tr('Dịch vụ', 'Services')
                                    : _selectedServiceCategory.tr(context),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _expandedFilter == ServiceFilterExpanded.service ||
                                          (_selectedServiceCategory != 'Tất cả dịch vụ' && _selectedServiceCategory != 'Tất cả')
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Icon(
                              _expandedFilter == ServiceFilterExpanded.service
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: _expandedFilter == ServiceFilterExpanded.service
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
                          if (_expandedFilter == ServiceFilterExpanded.branch) {
                            _expandedFilter = null; // Thu gọn
                          } else {
                            _expandedFilter = ServiceFilterExpanded.branch; // Mở ra
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: _expandedFilter == ServiceFilterExpanded.branch
                              ? const Color(0xFFEFF6FF)
                              : Colors.white,
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
                                _selectedBranch == 'Tất cả cơ sở' || _selectedBranch == 'Tất cả'
                                    ? context.tr('Cơ sở', 'Branches')
                                    : _selectedBranch.tr(context),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _expandedFilter == ServiceFilterExpanded.branch ||
                                          (_selectedBranch != 'Tất cả cơ sở' && _selectedBranch != 'Tất cả')
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Icon(
                              _expandedFilter == ServiceFilterExpanded.branch
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: _expandedFilter == ServiceFilterExpanded.branch
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

            // 3. Khung sổ xuống các tùy chọn (Chỉ hiện khi click vào nút Dịch vụ hoặc Cơ sở)
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
                            _expandedFilter == ServiceFilterExpanded.service
                                ? context.tr('Chọn loại dịch vụ:', 'Select service type:')
                                : context.tr('Chọn cơ sở / chi nhánh:', 'Select branch / facility:'),
                            style: const TextStyle(
                              
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_expandedFilter == ServiceFilterExpanded.service)
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _serviceCategories.map((cat) {
                                final isSelected = cat == _selectedServiceCategory;
                                return InkWell(
                                  onTap: () {
                                    setState(() {
                                      _selectedServiceCategory = cat;
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFF003876) : Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.04),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Text(
                                      cat.tr(context),
                                      style: TextStyle(
                                        
                                        fontSize: 12.5,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                        color: isSelected ? Colors.white : AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            )
                          else
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                // Nút Tất cả cơ sở
                                InkWell(
                                  onTap: () {
                                    setState(() => _selectedBranch = 'Tất cả cơ sở');
                                  },
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: _selectedBranch == 'Tất cả cơ sở' ? const Color(0xFF003876) : Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.04),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Text(
                                      context.tr('Tất cả cơ sở', 'All Branches'),
                                      style: TextStyle(
                                        
                                        fontSize: 12.5,
                                        fontWeight: _selectedBranch == 'Tất cả cơ sở' ? FontWeight.bold : FontWeight.w500,
                                        color: _selectedBranch == 'Tất cả cơ sở' ? Colors.white : AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                ),
                                // Các cơ sở thực tế từ Database
                                ..._branches.map((b) {
                                  final isSelected = _selectedBranch == b.name;
                                  return InkWell(
                                    onTap: () {
                                      setState(() => _selectedBranch = b.name);
                                      BranchRepository.instance.setActiveBranch(b);
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: isSelected ? const Color(0xFF003876) : Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.04),
                                            blurRadius: 6,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: Text(
                                        b.name.tr(context),
                                        style: TextStyle(
                                          
                                          fontSize: 12.5,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                          color: isSelected ? Colors.white : AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                              ],
                            ),
                        ],
                      ),
                    ),
            ),
            const SizedBox(height: 10),

            // 4. Danh sách dịch vụ khả dụng từ Database
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _loadServicesFromDb,
                      child: _filteredServices.isEmpty
                          ? ListView(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 20),
                                  alignment: Alignment.center,
                                  child: Column(
                                    children: [
                                      const Icon(Icons.find_in_page_outlined, size: 64, color: AppColors.border),
                                      const SizedBox(height: 12),
                                      Text(
                                        context.tr('Không tìm thấy dịch vụ phù hợp', 'No matching services found'),
                                        style: GoogleFonts.beVietnamPro(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textHeading,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        context.tr('Vui lòng thử từ khóa khác hoặc chọn danh mục khác', 'Please try another keyword or category'),
                                        style: GoogleFonts.beVietnamPro(
                                          fontSize: 13,
                                          color: AppColors.textPlaceholder,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      ElevatedButton(
                                        onPressed: () {
                                          setState(() {
                                            _selectedServiceCategory = 'Tất cả dịch vụ';
                                            _selectedBranch = 'Tất cả cơ sở';
                                            _expandedFilter = null;
                                            _searchController.clear();
                                          });
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                        ),
                                        child: Text(
                                          context.tr('Đặt lại bộ lọc', 'Reset filter'),
                                          style: GoogleFonts.beVietnamPro(
                                            color: Colors.white,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
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
            ),
          ],
        ),
      ),
    );
  }
}
