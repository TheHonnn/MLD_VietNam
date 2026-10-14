import 'package:flutter/material.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import 'c03_specialist_selection_screen.dart';

/// Screen C02: Chọn chi nhánh [8111:26619]
class C02BranchSelectionScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C02BranchSelectionScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C02BranchSelectionScreen> createState() => _C02BranchSelectionScreenState();
}

class _C02BranchSelectionScreenState extends State<C02BranchSelectionScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCity = 'Tất cả tỉnh / thành phố';
  bool _isMapView = false;

  final List<String> _cities = [
    'Tất cả tỉnh / thành phố',
    'TP. Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
  ];

  late List<BranchModel> _allBranches;
  late List<BranchModel> _filteredBranches;

  @override
  void initState() {
    super.initState();
    _allBranches = MockHomeRepository.getBranches();

    // Mặc định chọn chi nhánh đầu tiên nếu chưa có
    if (widget.flowState.selectedBranch == null && _allBranches.isNotEmpty) {
      widget.flowState.selectedBranch = _allBranches.first;
    }

    _applyFilter();
  }

  void _applyFilter() {
    final query = _searchController.text.trim().toLowerCase();
    setState(() {
      _filteredBranches = _allBranches.where((b) {
        final matchesQuery = query.isEmpty ||
            b.name.toLowerCase().contains(query) ||
            b.address.toLowerCase().contains(query);
        final matchesCity = _selectedCity == 'Tất cả tỉnh / thành phố' ||
            b.address.toLowerCase().contains(_selectedCity.toLowerCase());
        return matchesQuery && matchesCity;
      }).toList();

      if (_filteredBranches.isEmpty && query.isEmpty) {
        _filteredBranches = _allBranches;
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedBranch = widget.flowState.selectedBranch;

    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: const BookingAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  const SizedBox(height: 8),
                  const BookingHeaderSection(
                    title: 'Chọn chi nhánh',
                    subtitle: 'Bạn muốn trải nghiệm dịch vụ tại cơ sở nào?',
                    currentStep: 2, // Figma C02 là Bước 2: Lịch hẹn
                  ),

                  // Thanh tìm kiếm
                  Container(
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BookingColors.cardBorder),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (_) => _applyFilter(),
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search, color: BookingColors.heading),
                        hintText: 'Tìm theo tên hoặc quận / huyện...',
                        hintStyle: TextStyle(fontSize: 14, color: BookingColors.textSecondary),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        errorBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Bộ lọc Tỉnh / thành phố
                  const Text(
                    'Tỉnh / thành phố',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: BookingColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 52,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BookingColors.cardBorder),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedCity,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down, color: BookingColors.heading),
                        items: _cities.map((c) {
                          return DropdownMenuItem<String>(
                            value: c,
                            child: Text(
                              c,
                              style: const TextStyle(fontSize: 14, color: BookingColors.textPrimary),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedCity = val);
                            _applyFilter();
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Nút chuyển chế độ: Danh sách vs Bản đồ
                  Row(
                    children: [
                      InkWell(
                        onTap: () => setState(() => _isMapView = false),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                          decoration: BoxDecoration(
                            color: !_isMapView ? BookingColors.primary : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: !_isMapView ? BookingColors.primary : BookingColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            'Danh sách',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: !_isMapView ? Colors.white : BookingColors.textPrimary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => setState(() => _isMapView = true),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                          decoration: BoxDecoration(
                            color: _isMapView ? BookingColors.primary : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _isMapView ? BookingColors.primary : BookingColors.cardBorder,
                            ),
                          ),
                          child: Text(
                            'Bản đồ',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: _isMapView ? Colors.white : BookingColors.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  if (_isMapView)
                    Container(
                      height: 260,
                      decoration: BoxDecoration(
                        color: BookingColors.cardWarm,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: BookingColors.cardBorder),
                      ),
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.map_outlined, size: 48, color: BookingColors.primary),
                            SizedBox(height: 8),
                            Text(
                              'Bản đồ minh họa — chưa cấu hình định vị thực',
                              style: TextStyle(fontSize: 13, color: BookingColors.textPrimary),
                            ),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    // Thẻ 1: BranchSelectionCard / Đang chọn (Chi nhánh Quận 3)
                    _buildBranchCard(
                      branch: _allBranches.isNotEmpty
                          ? _allBranches.first
                          : MockHomeRepository.getBranches().first,
                      isSelected: selectedBranch?.id == (_allBranches.isNotEmpty ? _allBranches.first.id : 'br-001'),
                      isAvailable: true,
                      servicesText: 'Massage · Chăm sóc da · Chăm sóc cơ thể · Chăm sóc sức khỏe · Gói liệu trình',
                      noteText: 'Giờ hoạt động, dịch vụ, giá và chính sách đều là ví dụ; chưa có giữ chỗ thực.',
                      onSelect: () {
                        setState(() {
                          widget.flowState.selectedBranch = _allBranches.isNotEmpty ? _allBranches.first : null;
                        });
                      },
                    ),
                    const SizedBox(height: 24),

                    // Thẻ 2: BranchSelectionCard / Không cung cấp dịch vụ (Chi nhánh Cầu Giấy)
                    _buildBranchCard(
                      branch: _allBranches.length > 1
                          ? _allBranches[1]
                          : MockHomeRepository.getBranches().last,
                      isSelected: false,
                      isAvailable: false,
                      servicesText: 'Chăm sóc da · Chăm sóc cơ thể',
                      noteText: 'Chưa cung cấp dịch vụ massage trong dữ liệu minh họa',
                      onSelect: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Chi nhánh này chưa cung cấp dịch vụ đã chọn trong dữ liệu minh họa.'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  ],
                  const SizedBox(height: 24),

                  // Link: Vị trí hiện tại — chưa cấu hình
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: TextButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Tính năng định vị vị trí hiện tại chưa cấu hình trong bản thử nghiệm.'),
                            duration: Duration(seconds: 1),
                          ),
                        );
                      },
                      style: TextButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Vị trí hiện tại — chưa cấu hình',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: BookingColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Thẻ Ghi chú minh họa
                  const IllustrationNoteCard(
                    text: '2 cơ sở hư cấu · Địa chỉ, giờ hoạt động và dịch vụ minh họa. Bản đồ / chỉ đường chưa cấu hình; không sử dụng vị trí hay khoảng cách thực.',
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),

            // Fixed Bottom Bar chuẩn Figma
            BookingFixedBottomBar(
              summaryText: 'Đang chọn: ${selectedBranch?.name ?? "Chi nhánh mẫu 01 — Quận 3"}',
              buttonText: 'Tiếp tục chọn chuyên viên',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => C03SpecialistSelectionScreen(flowState: widget.flowState),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchCard({
    required BranchModel branch,
    required bool isSelected,
    required bool isAvailable,
    required String servicesText,
    required String noteText,
    required VoidCallback onSelect,
  }) {
    return Container(
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
          // Radio Header cao 44px
          InkWell(
            onTap: onSelect,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected ? BookingColors.primary : Colors.white,
                      border: Border.all(
                        color: BookingColors.primary,
                        width: 1.5,
                      ),
                    ),
                    child: isSelected
                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      isAvailable
                          ? 'Có thể đặt trong dữ liệu minh họa'
                          : 'Chưa cung cấp dịch vụ trong dữ liệu minh họa',
                      style: const TextStyle(
                        fontSize: 14,
                        color: BookingColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Nội dung chi nhánh
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.asset(
                    branch.imageUrl,
                    height: 168,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 168,
                      color: BookingColors.cardWarm,
                      child: const Center(
                        child: Icon(Icons.storefront, color: BookingColors.primary, size: 48),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Dữ liệu minh họa',
                  style: TextStyle(
                    fontSize: 12,
                    color: BookingColors.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  branch.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: BookingColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  branch.address,
                  style: const TextStyle(
                    fontSize: 14,
                    color: BookingColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  '09:00–20:00 · Cả tuần (minh họa)',
                  style: TextStyle(
                    fontSize: 12,
                    color: BookingColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  servicesText,
                  style: const TextStyle(
                    fontSize: 12,
                    color: BookingColors.textPrimary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 44,
                        child: TextButton(
                          onPressed: onSelect,
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
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: SizedBox(
                        height: 44,
                        child: OutlinedButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Tính năng chỉ đường minh họa, chưa kết nối bản đồ.'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: BookingColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            'Chỉ đường',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: BookingColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  noteText,
                  style: TextStyle(
                    fontSize: 12,
                    color: isAvailable ? BookingColors.textSecondary : BookingColors.errorText,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
