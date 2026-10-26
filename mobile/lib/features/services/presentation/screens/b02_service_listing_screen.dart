import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/service_repository.dart';
import '../../../home/presentation/widgets/vodder_service_card.dart';

/// Screen B02: Trang Danh mục dịch vụ chuẩn Y khoa MLD Việt Nam
/// Thiết kế đồng bộ 100% với Trang Chủ và Trang Đào Tạo:
/// - Ít chữ, không thêm chữ thừa, không giải thích, không note chi tiết
/// - Chỉ gồm: Tên dịch vụ, Giá tiền và Chữ Đặt lịch
/// - 2 mục lọc: Loại dịch vụ (7 lựa chọn) và Cơ sở (2 lựa chọn) + Ô tìm kiếm
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
  static const Color kPrimary = Color(0xFF168477);
  static const Color kMintBg = Color(0xFFE8F5F1);
  static const Color kMainBg = Color(0xFFFFFFFF);
  static const Color kBorderLine = Color(0xFFE2E8F0);
  static const Color kTextHeading = Color(0xFF0F172A);
  static const Color kTextNeutral = Color(0xFF475569);

  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = false;
  SpaServiceModel? _coreService;

  // 1. Danh mục lọc dịch vụ (7 lựa chọn)
  static const List<String> serviceFilterOptions = [
    'Tất cả dịch vụ',
    'Dẫn lưu Bạch huyết Giảm phù',
    'Dẫn lưu bạch huyết thủ công vùng ngực',
    'Dẫn lưu bạch huyết thủ công vùng đầu',
    'Dẫn lưu bạch huyết thủ công vùng cổ vai gáy lưng',
    'Dẫn lưu bạch huyết thủ công vùng chân',
    'Dẫn lưu bạch huyết thủ công vùng bụng',
  ];
  String _selectedServiceFilter = 'Tất cả dịch vụ';

  // 2. Danh mục lọc cơ sở (2 lựa chọn)
  static const List<String> branchFilterOptions = [
    'Tất cả',
    'Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399',
  ];
  String _selectedBranchFilter = 'Tất cả';

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
    final serviceDesc = (_coreService?.shortDescription ?? '').toLowerCase();
    final filterText = _selectedServiceFilter.toLowerCase();

    return serviceName.contains(query) ||
        serviceDesc.contains(query) ||
        filterText.contains(query) ||
        'bạch huyết'.contains(query) ||
        'vodder'.contains(query) ||
        'phù'.contains(query);
  }

  void _showServiceFilterPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: kMainBg,
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
                  'Chọn phân loại dịch vụ',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: kTextHeading,
                  ),
                ),
              ),
              const Divider(height: 1, color: kBorderLine),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: serviceFilterOptions.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: kBorderLine),
                  itemBuilder: (_, index) {
                    final opt = serviceFilterOptions[index];
                    final isSel = _selectedServiceFilter == opt;
                    return ListTile(
                      title: Text(
                        opt,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                          color: isSel ? kPrimary : kTextNeutral,
                        ),
                      ),
                      trailing: isSel
                          ? const Icon(Icons.check_circle_rounded, color: kPrimary, size: 20)
                          : null,
                      onTap: () {
                        setState(() => _selectedServiceFilter = opt);
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBranchFilterPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: kMainBg,
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
                  'Chọn cơ sở điều trị',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: kTextHeading,
                  ),
                ),
              ),
              const Divider(height: 1, color: kBorderLine),
              ...branchFilterOptions.map((opt) {
                final isSel = _selectedBranchFilter == opt;
                return ListTile(
                  title: Text(
                    opt,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? kPrimary : kTextNeutral,
                    ),
                  ),
                  trailing: isSel
                      ? const Icon(Icons.check_circle_rounded, color: kPrimary, size: 20)
                      : null,
                  onTap: () {
                    setState(() => _selectedBranchFilter = opt);
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
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadCoreServiceFromDb,
          color: kPrimary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. TIÊU ĐỀ TRANG
                Row(
                  children: [
                    if (widget.onBack != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: InkWell(
                          onTap: widget.onBack,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: kMainBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: kBorderLine),
                            ),
                            child: const Icon(Icons.arrow_back, size: 20, color: kTextHeading),
                          ),
                        ),
                      ),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Dịch vụ trị liệu',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: kTextHeading,
                              letterSpacing: -0.3,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Trung tâm Ứng dụng Khoa học Bạch huyết MLD Việt Nam',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              color: kTextNeutral,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 2. KHUNG Ô TÌM KIẾM VÀ 2 BỘ LỌC
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: kMainBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: kBorderLine),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Ô Tìm kiếm
                      Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: kMainBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: kBorderLine),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, size: 20, color: kPrimary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                onChanged: (_) => setState(() {}),
                                style: const TextStyle(fontSize: 13, color: kTextHeading),
                                decoration: const InputDecoration(
                                  hintText: 'Tìm kiếm dịch vụ dẫn lưu...',
                                  hintStyle: TextStyle(fontSize: 13, color: kTextNeutral),
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
                                child: const Icon(Icons.close, size: 18, color: kTextNeutral),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Hàng 2 Bộ lọc: Mục lọc Dịch vụ (7 lựa chọn) & Mục lọc Cơ sở (2 lựa chọn)
                      Row(
                        children: [
                          // 1) Bộ lọc Dịch vụ
                          Expanded(
                            child: InkWell(
                              onTap: _showServiceFilterPicker,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
                                decoration: BoxDecoration(
                                  color: _selectedServiceFilter != 'Tất cả dịch vụ'
                                      ? kMintBg
                                      : kMainBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedServiceFilter != 'Tất cả dịch vụ'
                                        ? kPrimary
                                        : kBorderLine,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _selectedServiceFilter,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: _selectedServiceFilter != 'Tất cả dịch vụ'
                                              ? FontWeight.w700
                                              : FontWeight.w500,
                                          color: _selectedServiceFilter != 'Tất cả dịch vụ'
                                              ? kPrimary
                                              : kTextNeutral,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      Icons.keyboard_arrow_down,
                                      size: 16,
                                      color: _selectedServiceFilter != 'Tất cả dịch vụ'
                                          ? kPrimary
                                          : kTextNeutral,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // 2) Bộ lọc Cơ sở
                          Expanded(
                            child: InkWell(
                              onTap: _showBranchFilterPicker,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
                                decoration: BoxDecoration(
                                  color: _selectedBranchFilter != 'Tất cả'
                                      ? kMintBg
                                      : kMainBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedBranchFilter != 'Tất cả'
                                        ? kPrimary
                                        : kBorderLine,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _selectedBranchFilter == 'Tất cả'
                                            ? 'Cơ sở: Tất cả'
                                            : 'Trụ sở MLD VN',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: _selectedBranchFilter != 'Tất cả'
                                              ? FontWeight.w700
                                              : FontWeight.w500,
                                          color: _selectedBranchFilter != 'Tất cả'
                                              ? kPrimary
                                              : kTextNeutral,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      Icons.keyboard_arrow_down,
                                      size: 16,
                                      color: _selectedBranchFilter != 'Tất cả'
                                          ? kPrimary
                                          : kTextNeutral,
                                    ),
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
                const SizedBox(height: 18),

                // 3. TIÊU ĐỀ DANH SÁCH & SỐ LƯỢNG
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Dịch vụ khả dụng',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: kTextHeading,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: kMintBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: kPrimary.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        _isServiceMatch ? '1 dịch vụ cốt lõi' : '0 dịch vụ',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: kPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 4. DUY NHẤT 1 DỊCH VỤ ĐIỀU TRỊ PHÙ BẠCH HUYẾT
                // Đồng bộ 100% với Trang Chủ và Trang Đào Tạo
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: CircularProgressIndicator(color: kPrimary),
                    ),
                  )
                else if (!_isServiceMatch)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                    decoration: BoxDecoration(
                      color: kMainBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: kBorderLine),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.spa_outlined, size: 48, color: kTextNeutral),
                        const SizedBox(height: 12),
                        const Text(
                          'Không tìm thấy dịch vụ phù hợp',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: kTextHeading),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Vui lòng thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc dịch vụ.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: kTextNeutral),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _selectedServiceFilter = 'Tất cả dịch vụ';
                              _selectedBranchFilter = 'Tất cả';
                              _searchController.clear();
                            });
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kPrimary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Đặt lại bộ lọc', style: TextStyle(color: Colors.white, fontSize: 13)),
                        ),
                      ],
                    ),
                  )
                else
                  VodderServiceCard(
                    service: _coreService,
                    onBooking: _handleBooking,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
