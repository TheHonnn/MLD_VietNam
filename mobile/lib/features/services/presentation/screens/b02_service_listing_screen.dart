import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../../home/presentation/widgets/vodder_service_card.dart';

/// Screen B02: Trang Danh mục dịch vụ chuẩn Y khoa MLD Việt Nam
/// - Áp dụng thiết kế đồng bộ với Trang Tài liệu:
///   + Header gồm AppBar trắng, ô tìm kiếm, thanh lọc danh mục ngang
///   + Không bo viền lồng chéo, bo viền vuông tròn nhẹ 8px
///   + Không chữ thừa dưới tiêu đề dịch vụ chính
///   + 100% phông chữ Montserrat, màu sắc xanh dương #2860EB, không dùng xanh lá
class B02ServiceListingScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final String? initialQuery;

  const B02ServiceListingScreen({
    super.key,
    this.onBack,
    this.initialQuery,
  });

  @override
  State<B02ServiceListingScreen> createState() => _B02ServiceListingScreenState();
}

class _B02ServiceListingScreenState extends State<B02ServiceListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = false;
  SpaServiceModel? _coreService;

  // Danh mục lọc dịch vụ ngang chuẩn
  static const List<String> _serviceCategories = [
    'Tất cả dịch vụ',
    'Dẫn lưu Bạch huyết Giảm phù',
    'Dẫn lưu ngực',
    'Dẫn lưu đầu',
    'Dẫn lưu cổ vai gáy lưng',
    'Dẫn lưu chân',
    'Dẫn lưu bụng',
  ];
  String _selectedCategory = 'Tất cả dịch vụ';

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _searchController.text = widget.initialQuery!.trim();
    }
    _loadCoreServiceFromDb();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCoreServiceFromDb() async {
    setState(() => _isLoading = true);
    final service = await ServiceRepository.instance.getCoreVodderService();
    if (mounted) {
      setState(() {
        _coreService = service;
        _isLoading = false;
      });
    }
  }

  bool get _isServiceMatch {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return true;

    final serviceName = (_coreService?.name ?? 'Điều trị dẫn lưu phù bạch huyết').toLowerCase();
    final filterText = _selectedCategory.toLowerCase();

    return serviceName.contains(query) ||
        filterText.contains(query) ||
        'bạch huyết'.contains(query) ||
        'vodder'.contains(query) ||
        'phù'.contains(query);
  }

  void _handleBooking() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AllInOneBookingScreen(
          onBack: () => Navigator.pop(context),
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
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textHeading,
          ),
        ),
        centerTitle: false,
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                onPressed: widget.onBack,
              )
            : null,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Ô tìm kiếm dịch vụ
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
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
                    hintText: context.tr('Tìm kiếm dịch vụ dẫn lưu bạch huyết...', 'Search lymphatic drainage services...'),
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

            // 2. Thanh lọc danh mục ngang (Đồng bộ chuẩn Trang Tài liệu)
            Container(
              color: Colors.white,
              height: 48,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                scrollDirection: Axis.horizontal,
                itemCount: _serviceCategories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _serviceCategories[index];
                  final isSelected = cat == _selectedCategory;
                  return InkWell(
                    onTap: () => setState(() => _selectedCategory = cat),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      child: Text(
                        cat.tr(context),
                        style: TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 13.5,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1, color: AppColors.border),

            // 3. Danh sách dịch vụ khả dụng
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: _loadCoreServiceFromDb,
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                        children: [
                          if (!_isServiceMatch)
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 20),
                              alignment: Alignment.center,
                              child: Column(
                                children: [
                                  const Icon(Icons.find_in_page_outlined, size: 64, color: AppColors.border),
                                  const SizedBox(height: 12),
                                  Text(
                                    context.tr('Không tìm thấy dịch vụ phù hợp', 'No matching services found'),
                                    style: const TextStyle(
                                      fontFamily: 'Montserrat',
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textHeading,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
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
                                        _selectedCategory = 'Tất cả dịch vụ';
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
                            )
                          else
                            // Thẻ dịch vụ tối giản chuẩn Y khoa MLD
                            VodderServiceCard(
                              service: _coreService,
                              onBooking: _handleBooking,
                            ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
