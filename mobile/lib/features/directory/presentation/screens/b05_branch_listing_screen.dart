import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/launcher_helper.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import 'b06_branch_detail_screen.dart';

class B05BranchListingScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const B05BranchListingScreen({
    super.key,
    this.onBack,
  });

  @override
  State<B05BranchListingScreen> createState() => _B05BranchListingScreenState();
}

class _B05BranchListingScreenState extends State<B05BranchListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCity = 'Tất cả tỉnh / thành phố';
  String _selectedService = 'Tất cả dịch vụ';
  bool _isMapView = false;
  int _mapSelectedBranchIndex = 0;

  List<String> _cities = [
    'Tất cả tỉnh / thành phố',
  ];

  final List<String> _services = [
    'Tất cả dịch vụ',
    'Massage',
    'Chăm sóc da',
  ];

  late List<BranchModel> _branches;

  @override
  void initState() {
    super.initState();
    _branches = BranchRepository.instance.cachedBranches.isNotEmpty
        ? BranchRepository.instance.cachedBranches
        : MockHomeRepository.getBranches();
    _extractCities(_branches);
    _loadBranches();
  }

  void _extractCities(List<BranchModel> list) {
    final citySet = <String>{};
    for (final b in list) {
      if (b.city.trim().isNotEmpty) {
        citySet.add(b.city.trim());
      }
    }
    _cities = ['Tất cả tỉnh / thành phố', ...citySet];
    if (!_cities.contains(_selectedCity)) {
      _selectedCity = 'Tất cả tỉnh / thành phố';
    }
  }

  Future<void> _loadBranches() async {
    final branches = await BranchRepository.instance.getBranches();
    if (mounted) {
      setState(() {
        _branches = branches;
        _extractCities(_branches);
      });
    }
  }

  Widget _buildBranchImage(String imageUrl, {double height = 180, double width = double.infinity, BorderRadius? borderRadius}) {
    final imgWidget = imageUrl.startsWith('http')
        ? Image.network(
            imageUrl,
            width: width,
            height: height,
            fit: BoxFit.cover,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                width: width,
                height: height,
                color: AppColors.surfaceSecondary,
                child: const Center(
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              );
            },
            errorBuilder: (_, __, ___) => Container(
              width: width,
              height: height,
              color: AppColors.surfaceSecondary,
              child: const Center(
                child: Icon(Icons.store, size: 48, color: AppColors.primary),
              ),
            ),
          )
        : Image.asset(
            imageUrl,
            width: width,
            height: height,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              width: width,
              height: height,
              color: AppColors.surfaceSecondary,
              child: const Center(
                child: Icon(Icons.store, size: 48, color: AppColors.primary),
              ),
            ),
          );

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius, child: imgWidget);
    }
    return imgWidget;
  }

  Map<String, dynamic> _branchToMap(BranchModel b) {
    return {
      'id': b.id.hashCode,
      'branchId': b.id,
      'name': b.name,
      'address': b.address,
      'city': b.city,
      'hours': b.openingHours,
      'services': b.services.join(' · '),
      'image': b.imageUrl,
      'phone': b.phone,
    };
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredBranches {
    final query = _searchController.text.toLowerCase().trim();
    return _branches.where((branch) {
      final matchesQuery = query.isEmpty ||
          branch.name.toLowerCase().contains(query) ||
          branch.address.toLowerCase().contains(query);

      final matchesCity = _selectedCity == 'Tất cả tỉnh / thành phố' ||
          branch.city.toLowerCase().contains(_selectedCity.toLowerCase()) ||
          branch.address.toLowerCase().contains(_selectedCity.toLowerCase());

      final matchesService = _selectedService == 'Tất cả dịch vụ' ||
          branch.services.any((s) => s.toLowerCase().contains(_selectedService.toLowerCase()));

      return matchesQuery && matchesCity && matchesService;
    }).map(_branchToMap).toList();
  }

  @override
  Widget build(BuildContext context) {
    final branches = _filteredBranches;

    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. HEADER ---
              Row(
                children: [
                  InkWell(
                    onTap: widget.onBack ?? () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.arrow_back, color: AppColors.textPrimary, size: 22),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hệ thống chi nhánh',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textHeading,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Tìm cơ sở phù hợp với bạn.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // --- 2. SEARCH BAR ---
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.search_rounded,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      height: 52,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      alignment: Alignment.centerLeft,
                      child: TextField(
                        controller: _searchController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          hintText: 'Tìm chi nhánh, địa chỉ...',
                          hintStyle: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // --- 3. TỈNH / THÀNH PHỐ DROPDOWN ---
              const Text(
                'Tỉnh / thành phố',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedCity,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary),
                    items: _cities.map((city) {
                      return DropdownMenuItem<String>(
                        value: city,
                        child: Text(
                          city,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCity = val);
                    },
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // --- 4. GẦN TÔI & DANH SÁCH / BẢN ĐỒ TOGGLE ---
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    // Button "Gần tôi"
                  InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Đang tải vị trí chi nhánh gần nhất'),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary),
                      ),
                      alignment: Alignment.center,
                      child: const Text(
                        'Gần tôi',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Toggle: Danh sách vs Bản đồ
                  InkWell(
                    onTap: () => setState(() => _isMapView = false),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: !_isMapView ? AppColors.primary : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: !_isMapView ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Danh sách',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: !_isMapView ? FontWeight.w600 : FontWeight.w400,
                          color: !_isMapView ? AppColors.textInverse : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () => setState(() => _isMapView = true),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: _isMapView ? AppColors.primary : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _isMapView ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Bản đồ',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: _isMapView ? FontWeight.w600 : FontWeight.w400,
                          color: _isMapView ? AppColors.textInverse : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

              const SizedBox(height: 16),

              // --- 5. DỊCH VỤ TẠI CƠ SỞ DROPDOWN ---
              const Text(
                'Dịch vụ tại cơ sở',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedService,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary),
                    items: _services.map((srv) {
                      return DropdownMenuItem<String>(
                        value: srv,
                        child: Text(
                          srv,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedService = val);
                    },
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // --- 6. NOTICE BANNER ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Hệ thống cơ sở chăm sóc và đào tạo MLD Vietnam',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 7. BRANCH CARDS LIST OR MAP VIEW ---
              if (_isMapView)
                _buildMapView(branches)
              else
                ..._buildListView(branches),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildListView(List<Map<String, dynamic>> branches) {
    return branches.map((branch) {
      return Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Photo with Badge
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: _buildBranchImage(
                    branch['image'] as String,
                    height: 180,
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surface.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Đang hoạt động',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF236B42),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Branch Details
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    branch['name'] as String,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textHeading,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          branch['address'] as String,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 16, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          branch['hours'] as String,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.spa_outlined, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          branch['services'] as String,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Actions
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => B06BranchDetailScreen(
                                  branchName: branch['name'] as String,
                                  branchAddress: branch['address'] as String,
                                  branchImage: branch['image'] as String,
                                ),
                              ),
                            );
                          },
                          child: const Text(
                            'Xem chi tiết',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            elevation: 0,
                          ),
                          onPressed: () => _showDirectionsModal(branch),
                          child: const Text(
                            'Chỉ đường',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textInverse,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildMapView(List<Map<String, dynamic>> branches) {
    if (branches.isEmpty) {
      return Container(
        height: 280,
        alignment: Alignment.center,
        child: const Text(
          'Không tìm thấy chi nhánh phù hợp',
          style: TextStyle(color: AppColors.textSecondary),
        ),
      );
    }
    final selectedBranch = branches[_mapSelectedBranchIndex.clamp(0, branches.length - 1)];

    return Column(
      children: [
        // Styled Interactive Map Visual Canvas
        Container(
          height: 300,
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFE8ECE9),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                // Stylized map roads and terrain
                CustomPaint(
                  size: Size.infinite,
                  painter: _MapCanvasPainter(),
                ),

                // Pins for each branch
                ...branches.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final b = entry.value;
                  final isSelected = idx == _mapSelectedBranchIndex;

                  final double top = idx == 0 ? 80 : 160;
                  final double left = idx == 0 ? 70 : 180;

                  return Positioned(
                    top: top,
                    left: left,
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _mapSelectedBranchIndex = idx;
                        });
                      },
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary : AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? AppColors.surface : AppColors.primary,
                                width: 1.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.15),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.spa_rounded,
                                  size: 14,
                                  color: isSelected ? AppColors.textInverse : AppColors.primary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  b['name'] as String,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: isSelected ? AppColors.textInverse : AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          CustomPaint(
                            size: const Size(12, 8),
                            painter: _TrianglePainter(
                              color: isSelected ? AppColors.primary : AppColors.surface,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),

                // Map controls overlay
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surface.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.layers_outlined, size: 14, color: AppColors.textSecondary),
                        SizedBox(width: 4),
                        Text(
                          'Bản đồ chi nhánh',
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Selected branch floating card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: _buildBranchImage(
                      selectedBranch['image'] as String,
                      width: 72,
                      height: 72,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          selectedBranch['name'] as String,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textHeading,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          selectedBranch['address'] as String,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          selectedBranch['hours'] as String,
                          style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => B06BranchDetailScreen(
                              branchName: selectedBranch['name'] as String,
                              branchAddress: selectedBranch['address'] as String,
                              branchImage: selectedBranch['image'] as String,
                            ),
                          ),
                        );
                      },
                      child: const Text(
                        'Xem chi tiết',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        elevation: 0,
                      ),
                      onPressed: () => _showDirectionsModal(selectedBranch),
                      child: const Text(
                        'Chỉ đường',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textInverse),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showDirectionsModal(Map<String, dynamic> branch) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chỉ đường tới cơ sở',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSecondary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        branch['name'] as String,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_outlined, size: 18, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              branch['address'] as String,
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Phương tiện di chuyển ước tính',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildTransportChip(
                      icon: Icons.two_wheeler_rounded,
                      label: 'Xe máy',
                      time: '~12 phút',
                      distance: '3.8 km',
                      isSelected: true,
                    ),
                    const SizedBox(width: 12),
                    _buildTransportChip(
                      icon: Icons.directions_car_rounded,
                      label: 'Ô tô',
                      time: '~18 phút',
                      distance: '4.2 km',
                      isSelected: false,
                    ),
                    const SizedBox(width: 12),
                    _buildTransportChip(
                      icon: Icons.directions_walk_rounded,
                      label: 'Đi bộ',
                      time: '~45 phút',
                      distance: '3.4 km',
                      isSelected: false,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Lộ trình gợi ý',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 10),
                _buildRouteStep('1', 'Khởi hành từ vị trí của bạn hướng về trung tâm quận'),
                _buildRouteStep('2', 'Di chuyển dọc theo trục đường chính khoảng 2.5 km'),
                _buildRouteStep('3', 'Điểm đến ${branch['name']} nằm ở bên tay phải'),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Đã sao chép địa chỉ: ${branch['address']}')),
                          );
                        },
                        icon: const Icon(Icons.copy_rounded, size: 18, color: AppColors.primary),
                        label: const Text(
                          'Sao chép địa chỉ',
                          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          AppLauncherHelper.openMapLocation(
                            context,
                            address: branch['address'] as String?,
                            label: branch['name'] as String?,
                          );
                        },
                        icon: const Icon(Icons.navigation_rounded, size: 18, color: AppColors.textInverse),
                        label: const Text(
                          'Bắt đầu đi',
                          style: TextStyle(color: AppColors.textInverse, fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    },
    );
  }

  Widget _buildTransportChip({
    required IconData icon,
    required String label,
    required String time,
    required String distance,
    required bool isSelected,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceSecondary : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 22, color: isSelected ? AppColors.primary : AppColors.textSecondary),
            const SizedBox(height: 4),
            Text(
              time,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              distance,
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteStep(String stepNumber, String instruction) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: AppColors.surfaceSecondary,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            alignment: Alignment.center,
            child: Text(
              stepNumber,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              instruction,
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapCanvasPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFF1F3ED);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke;

    final roadBorderPaint = Paint()
      ..color = const Color(0xFFE2E4DE)
      ..strokeWidth = 16
      ..style = PaintingStyle.stroke;

    final path1 = Path()
      ..moveTo(0, size.height * 0.3)
      ..cubicTo(size.width * 0.3, size.height * 0.25, size.width * 0.6, size.height * 0.6, size.width, size.height * 0.5);

    final path2 = Path()
      ..moveTo(size.width * 0.45, 0)
      ..cubicTo(size.width * 0.48, size.height * 0.4, size.width * 0.52, size.height * 0.7, size.width * 0.5, size.height);

    canvas.drawPath(path1, roadBorderPaint);
    canvas.drawPath(path1, roadPaint);
    canvas.drawPath(path2, roadBorderPaint);
    canvas.drawPath(path2, roadPaint);

    // Green park blob
    final parkPaint = Paint()..color = const Color(0xFFDCF0DF);
    final parkRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(size.width * 0.08, size.height * 0.6, 90, 60),
      const Radius.circular(12),
    );
    canvas.drawRRect(parkRect, parkPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TrianglePainter extends CustomPainter {
  final Color color;

  _TrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}


