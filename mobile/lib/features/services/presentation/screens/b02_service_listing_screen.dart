import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/service_repository.dart';

/// Screen B02: Trang Danh mục dịch vụ chuẩn Y khoa MLD Việt Nam
/// Giao diện được tối ưu chuẩn theo yêu cầu:
/// - Màu xanh trạng thái chọn: #2860EB
/// - Nền chính: #FFFFFF (Nền dropdown, ô tìm kiếm và danh sách)
/// - Màu chữ nội dung: #616161 (Xám trung tính)
/// - Viền và phân cách: #E5E7EB
/// - 2 mục lọc:
///   1) Danh mục dịch vụ (7 lựa chọn)
///   2) Cơ sở (2 lựa chọn)
/// - Bên dưới: Duy nhất 1 dịch vụ điều trị phù bạch huyết lấy giá từ CSDL Database.
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
  // Bảng màu chuẩn theo phân tích UI
  static const Color kSelectBlue = Color(0xFF2860EB);
  static const Color kMainBg = Color(0xFFFFFFFF);
  static const Color kTextNeutral = Color(0xFF616161);
  static const Color kBorderLine = Color(0xFFE5E7EB);
  static const Color kTextHeading = Color(0xFF1F2937);

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

  String _formatCurrency(double amount) {
    final integerAmount = amount.toInt();
    final str = integerAmount.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
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
                          color: isSel ? kSelectBlue : kTextNeutral,
                        ),
                      ),
                      trailing: isSel
                          ? const Icon(Icons.check_circle_rounded, color: kSelectBlue, size: 20)
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
                      color: isSel ? kSelectBlue : kTextNeutral,
                    ),
                  ),
                  trailing: isSel
                      ? const Icon(Icons.check_circle_rounded, color: kSelectBlue, size: 20)
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
          color: kSelectBlue,
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

                // 2. KHUNG Ô TÌM KIẾM VÀ 2 BỘ LỌC (Nền #FFFFFF, Viền #E5E7EB)
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
                            const Icon(Icons.search, size: 20, color: kSelectBlue),
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
                                      ? const Color(0xFFF0F4FE)
                                      : kMainBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedServiceFilter != 'Tất cả dịch vụ'
                                        ? kSelectBlue
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
                                              ? kSelectBlue
                                              : kTextNeutral,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      Icons.keyboard_arrow_down,
                                      size: 16,
                                      color: _selectedServiceFilter != 'Tất cả dịch vụ'
                                          ? kSelectBlue
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
                                      ? const Color(0xFFF0F4FE)
                                      : kMainBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _selectedBranchFilter != 'Tất cả'
                                        ? kSelectBlue
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
                                              ? kSelectBlue
                                              : kTextNeutral,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      Icons.keyboard_arrow_down,
                                      size: 16,
                                      color: _selectedBranchFilter != 'Tất cả'
                                          ? kSelectBlue
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
                        color: const Color(0xFFF0F4FE),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: kSelectBlue.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        _isServiceMatch ? '1 dịch vụ cốt lõi' : '0 dịch vụ',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: kSelectBlue,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 4. DUY NHẤT 1 DỊCH VỤ ĐIỀU TRỊ PHÙ BẠCH HUYẾT
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: CircularProgressIndicator(color: kSelectBlue),
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
                            backgroundColor: kSelectBlue,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Đặt lại bộ lọc', style: TextStyle(color: Colors.white, fontSize: 13)),
                        ),
                      ],
                    ),
                  )
                else
                  _buildSingleCoreServiceCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Thẻ dịch vụ duy nhất: Điều trị dẫn lưu phù bạch huyết (Lấy giá từ Database)
  Widget _buildSingleCoreServiceCard() {
    final servicePrice = _coreService?.price ?? 650000;
    final vatRate = _coreService?.vatRate ?? 0.08;
    final vatAmount = servicePrice * vatRate;
    final priceWithVat = servicePrice + vatAmount;

    return Container(
      decoration: BoxDecoration(
        color: kMainBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorderLine, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ảnh minh họa dịch vụ
            Stack(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 180,
                  child: Image.asset(
                    'assets/images/course_banner_clean.png',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(0xFFF0F4FE),
                      child: const Center(
                        child: Icon(Icons.spa_rounded, size: 48, color: kSelectBlue),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: kSelectBlue,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _selectedServiceFilter == 'Tất cả dịch vụ'
                          ? 'Dẫn lưu Bạch huyết Giảm phù'
                          : _selectedServiceFilter,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Chuẩn Y khoa Vodder',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Nội dung chi tiết dịch vụ
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: kTextHeading,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 6),

                  const Text(
                    'Phương pháp chuẩn Y khoa Quốc tế kích hoạt hệ mao mạch bạch huyết dưới bề mặt da, hỗ trợ giải phóng dịch ứ đọng, tiêu phù nề sau phẫu thuật và giảm đau nhức cơ xương khớp.',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: kTextNeutral,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Địa điểm cơ sở tiếp nhận
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: kBorderLine),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on_rounded, size: 16, color: kSelectBlue),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _selectedBranchFilter == 'Tất cả'
                                ? 'Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399'
                                : _selectedBranchFilter,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: kTextHeading,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Divider(height: 1, color: kBorderLine),
                  const SizedBox(height: 12),

                  // Hàng giá tiền (Lấy từ Database) và Nút đặt lịch
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Đơn giá dịch vụ:',
                            style: TextStyle(fontSize: 11, color: kTextNeutral),
                          ),
                          const SizedBox(height: 2),
                          Text.rich(
                            TextSpan(
                              children: [
                                TextSpan(
                                  text: '${_formatCurrency(priceWithVat)} ',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: kSelectBlue,
                                  ),
                                ),
                                const TextSpan(
                                  text: 'đ',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: kSelectBlue,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                                TextSpan(
                                  text: ' (VAT ${(vatRate * 100).toInt()}%)',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500,
                                    color: kTextNeutral,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      ElevatedButton(
                        onPressed: _handleBooking,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kSelectBlue,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Đặt lịch ngay',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_rounded, size: 14),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
