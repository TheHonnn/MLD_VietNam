import 'package:flutter/material.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../../services/presentation/screens/b03_service_detail_screen.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import 'c02_branch_selection_screen.dart';
import 'c09_my_appointments_screen.dart';

/// Screen C01: Chọn dịch vụ [8111:26453]
class C01ServiceSelectionScreen extends StatefulWidget {
  final BookingFlowState? flowState;
  final VoidCallback? onBack;
  final VoidCallback? onOpenAppointments;

  const C01ServiceSelectionScreen({
    super.key,
    this.flowState,
    this.onBack,
    this.onOpenAppointments,
  });

  @override
  State<C01ServiceSelectionScreen> createState() => _C01ServiceSelectionScreenState();
}

class _C01ServiceSelectionScreenState extends State<C01ServiceSelectionScreen> {
  late BookingFlowState _flowState;
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = false;
  String _selectedCategory = 'Massage thư giãn';

  final List<String> _categories = [
    'Massage thư giãn',
    'Chăm sóc da',
    'Chăm sóc cơ thể',
    'Chăm sóc sức khỏe',
    'Gói liệu trình',
  ];

  late List<SpaServiceModel> _allServices;
  late List<SpaServiceModel> _filteredServices;
  final Set<String> _favoriteServiceIds = {'srv-001', 'srv-002'};

  @override
  void initState() {
    super.initState();
    _flowState = widget.flowState ?? BookingFlowState();

    _allServices = MockHomeRepository.getFeaturedServices();

    if (_flowState.selectedServices.isNotEmpty) {
      final updatedSelected = <SpaServiceModel>[];
      for (final sel in _flowState.selectedServices) {
        final match = _allServices.firstWhere(
          (s) => s.id == sel.id || s.name.toLowerCase().trim() == sel.name.toLowerCase().trim(),
          orElse: () => sel,
        );
        updatedSelected.add(match);
      }
      _flowState.selectedServices = updatedSelected;
      _flowState.selectedService = _flowState.selectedServices.first;
    } else if (_flowState.selectedService != null) {
      final match = _allServices.firstWhere(
        (s) => s.id == _flowState.selectedService!.id || s.name.toLowerCase().trim() == _flowState.selectedService!.name.toLowerCase().trim(),
        orElse: () => _flowState.selectedService!,
      );
      _flowState.selectedServices = [match];
      _flowState.selectedService = match;
    }

    _applyFilter(callSetState: false);
    _loadServices();
  }

  Future<void> _loadServices() async {
    setState(() => _isLoading = true);
    final liveServices = await ServiceRepository.instance.getServices();
    final liveCategories = await ServiceRepository.instance.getCategories();

    if (mounted) {
      setState(() {
        _allServices = liveServices;
        if (liveCategories.isNotEmpty) {
          _categories.clear();
          _categories.addAll(liveCategories);
          if (!_categories.contains(_selectedCategory)) {
            _selectedCategory = _categories.first;
          }
        }
        _isLoading = false;
        if (_flowState.selectedServices.isNotEmpty) {
          final updatedSelected = <SpaServiceModel>[];
          for (final sel in _flowState.selectedServices) {
            final match = _allServices.firstWhere(
              (s) => s.id == sel.id || s.name.toLowerCase().trim() == sel.name.toLowerCase().trim(),
              orElse: () => sel,
            );
            updatedSelected.add(match);
          }
          _flowState.selectedServices = updatedSelected;
          _flowState.selectedService = _flowState.selectedServices.first;
        }
        _applyFilter(callSetState: false);
      });
    }
  }

  void _applyFilter({bool callSetState = true}) {
    final query = _searchController.text.trim().toLowerCase();
    final result = _allServices.where((s) {
      final matchesQuery = query.isEmpty ||
          s.name.toLowerCase().contains(query) ||
          s.shortDescription.toLowerCase().contains(query);
      final matchesCat = _selectedCategory.isEmpty ||
          _selectedCategory == 'Tất cả' ||
          s.categoryName.toLowerCase().contains(_selectedCategory.toLowerCase());
      return matchesQuery && (matchesCat || query.isNotEmpty);
    }).toList();

    if (callSetState) {
      setState(() {
        _filteredServices = result.isNotEmpty ? result : _allServices;
      });
    } else {
      _filteredServices = result.isNotEmpty ? result : _allServices;
    }
  }

  void _toggleServiceSelection(SpaServiceModel service) {
    setState(() {
      final isCurrentlySelected = _flowState.selectedServices.any(
        (s) => s.id == service.id || s.name.toLowerCase().trim() == service.name.toLowerCase().trim(),
      );
      if (isCurrentlySelected) {
        _flowState.selectedServices.removeWhere(
          (s) => s.id == service.id || s.name.toLowerCase().trim() == service.name.toLowerCase().trim(),
        );
        _flowState.selectedService = _flowState.selectedServices.isNotEmpty ? _flowState.selectedServices.first : null;
      } else {
        _flowState.selectedServices.add(service);
        _flowState.selectedService = service;
      }
    });
  }

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]}.',
        );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final count = _flowState.allSelectedServices.length;
    final totalMinutes = _flowState.totalDurationMinutes;
    final totalPrice = _formatPrice(_flowState.rawServicePrice);

    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: BookingAppBar(
        onBack: () {
          if (widget.onBack != null) {
            widget.onBack!();
          } else if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          }
        },
        trailing: Padding(
          padding: const EdgeInsets.only(right: 16),
          child: Center(
            child: InkWell(
              onTap: () {
                if (widget.onOpenAppointments != null) {
                  widget.onOpenAppointments!();
                } else {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                  );
                }
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: BookingColors.cardWarm,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_month_outlined, size: 14, color: BookingColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      l10n?.myAppointments ?? 'Lịch hẹn của tôi',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: BookingColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  const SizedBox(height: 8),
                  BookingHeaderSection(
                    title: l10n?.selectService ?? 'Chọn dịch vụ',
                    subtitle: 'Lựa chọn dịch vụ chăm sóc phù hợp với bạn.',
                    currentStep: 1,
                  ),

                  // Thanh tìm kiếm chuẩn Figma
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 52,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: BookingColors.cardBorder),
                        ),
                        child: const Icon(Icons.search, color: BookingColors.heading),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          height: 52,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: BookingColors.cardBorder),
                          ),
                          child: TextField(
                            controller: _searchController,
                            onChanged: (_) => _applyFilter(),
                            decoration: InputDecoration(
                              hintText: l10n?.homeSearchHint ?? 'Tìm kiếm dịch vụ...',
                              hintStyle: const TextStyle(fontSize: 14, color: BookingColors.textSecondary),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              errorBorder: InputBorder.none,
                              disabledBorder: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Bộ lọc 5 danh mục theo Figma
                  SizedBox(
                    height: 44,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final cat = _categories[index];
                        final isSelected = _selectedCategory == cat;
                        return InkWell(
                          onTap: () {
                            setState(() {
                              _selectedCategory = isSelected ? '' : cat;
                              _applyFilter();
                            });
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            height: 44,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: isSelected ? BookingColors.primary : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? BookingColors.primary : BookingColors.cardBorder,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              cat,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: isSelected ? Colors.white : BookingColors.textPrimary,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Danh sách dịch vụ: MultiServiceSelector
                  if (_isLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: CircularProgressIndicator(color: BookingColors.primary),
                      ),
                    )
                  else if (_filteredServices.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: Text(
                          'Không có dịch vụ nào phù hợp.',
                          style: TextStyle(color: BookingColors.textSecondary, fontSize: 14),
                        ),
                      ),
                    )
                  else
                    ..._filteredServices.map((service) {
                      final isSelected = _flowState.selectedServices.any(
                        (s) => s.id == service.id || s.name.toLowerCase().trim() == service.name.toLowerCase().trim(),
                      );
                      final isFav = _favoriteServiceIds.contains(service.id);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: BookingColors.cardBorder,
                            width: 1.0,
                          ),
                        ),
                        child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header chọn dịch vụ (cao 60px)
                          InkWell(
                            onTap: () => _toggleServiceSelection(service),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                            child: Container(
                              height: 60,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? BookingColors.cardWarm.withValues(alpha: 0.3)
                                    : Colors.white,
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      color: isSelected ? BookingColors.primary : Colors.white,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: BookingColors.primary),
                                    ),
                                    child: isSelected
                                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                                        : null,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      isSelected
                                          ? 'Đã chọn · ${service.name}'
                                          : 'Chọn dịch vụ',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                        color: BookingColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Thẻ dịch vụ chăm sóc
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Ảnh 350x172 có Favorite button
                                Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(16),
                                      child: service.imageUrl.startsWith('http')
                                          ? Image.network(
                                              service.imageUrl,
                                              height: 172,
                                              width: double.infinity,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => Container(
                                                height: 172,
                                                color: BookingColors.cardWarm,
                                                child: const Center(
                                                  child: Icon(Icons.spa, color: BookingColors.primary, size: 48),
                                                ),
                                              ),
                                            )
                                          : Image.asset(
                                              service.imageUrl,
                                              height: 172,
                                              width: double.infinity,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => Container(
                                                height: 172,
                                                color: BookingColors.cardWarm,
                                                child: const Center(
                                                  child: Icon(Icons.spa, color: BookingColors.primary, size: 48),
                                                ),
                                              ),
                                            ),
                                    ),
                                    Positioned(
                                      top: 10,
                                      right: 10,
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            if (isFav) {
                                              _favoriteServiceIds.remove(service.id);
                                            } else {
                                              _favoriteServiceIds.add(service.id);
                                            }
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(12),
                                        child: Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(12),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.08),
                                                blurRadius: 4,
                                              ),
                                            ],
                                          ),
                                          child: Icon(
                                            isFav ? Icons.favorite : Icons.favorite_border,
                                            color: BookingColors.primary,
                                            size: 22,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),

                                // Thông tin dịch vụ
                                Text(
                                  service.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: BookingColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${service.durationMinutes} phút',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w400,
                                        color: BookingColors.textSecondary,
                                      ),
                                    ),
                                    Row(

                                      mainAxisSize: MainAxisSize.min,

                                      children: [

                                        if (service.discountPrice != null && service.discountPrice! < service.price) ...[

                                          Text(

                                            '${_formatPrice(service.price)}đ',

                                            style: const TextStyle(

                                              fontSize: 13,

                                              fontWeight: FontWeight.w400,

                                              color: BookingColors.textSecondary,

                                              decoration: TextDecoration.lineThrough,

                                            ),

                                          ),

                                          const SizedBox(width: 6),

                                        ],

                                        Text(

                                          '${_formatPrice(service.displayPrice)}đ',

                                          style: const TextStyle(

                                            fontSize: 16,

                                            fontWeight: FontWeight.w600,

                                            color: BookingColors.primary,

                                          ),

                                        ),

                                      ],

                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  service.shortDescription,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: BookingColors.textPrimary,
                                    height: 1.35,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                SizedBox(
                                  width: double.infinity,
                                  height: 44,
                                  child: TextButton(
                                    onPressed: () {
                                          final hasDiscount = service.discountPrice != null && service.discountPrice! < service.price;
                                          final priceFormatted = '${_formatPrice(service.displayPrice)}đ';
                                          final originalPriceFormatted = hasDiscount ? '${_formatPrice(service.price)}đ' : null;
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => B03ServiceDetailScreen(
                                                serviceId: int.tryParse(service.id.replaceAll(RegExp(r'\D'), '')) ?? 0,
                                                title: service.name,
                                                duration: '${service.durationMinutes} phút',
                                                price: priceFormatted,
                                                originalPrice: originalPriceFormatted,
                                                category: service.categoryName,
                                                image: service.imageUrl,
                                                description: service.shortDescription,
                                              ),
                                            ),
                                          );
                                    },
                                    style: TextButton.styleFrom(
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                    ),
                                    child: const Text(
                                      'Xem chi tiết',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: BookingColors.primary,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),

                  // SelectedServiceSummary / Một dịch vụ (350x82)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: BookingColors.cardWarm,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BookingColors.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          count == 0
                              ? 'Chưa chọn dịch vụ · 0 phút · 0đ'
                              : '$count dịch vụ · $totalMinutes phút · $totalPriceđ',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Chi phí dịch vụ; được kiểm tra lại theo chi nhánh.',
                          style: TextStyle(
                            fontSize: 12,
                            color: BookingColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Thẻ Ghi chú
                  const IllustrationNoteCard(
                    text: 'Bảng giá và dịch vụ niêm yết chính thức. Có thể chọn nhiều dịch vụ tương thích, thực hiện liên tiếp; cần kiểm tra chi nhánh và nguồn lực.',
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma
            BookingFixedBottomBar(
              summaryText: count == 0
                  ? 'Chưa chọn dịch vụ'
                  : '$count dịch vụ · $totalMinutes phút · $totalPriceđ · Chi phí dịch vụ',
              buttonText: l10n?.continueButton ?? 'Tiếp tục',
              isEnabled: count > 0,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => C02BranchSelectionScreen(flowState: _flowState),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
