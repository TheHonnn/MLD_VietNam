import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
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
  String _selectedCity = 'Tất cả tỉnh / thành phố';
  List<String> _cities = ['Tất cả tỉnh / thành phố'];
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

  Widget _buildBranchImage(String imageUrl, {double height = 180}) {
    if (imageUrl.startsWith('http')) {
      return Image.network(
        imageUrl,
        width: double.infinity,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Image.asset(
          'assets/images/chinhanh.webp',
          width: double.infinity,
          height: height,
          fit: BoxFit.cover,
        ),
      );
    }
    return Image.asset(
      imageUrl.isNotEmpty ? imageUrl : 'assets/images/chinhanh.webp',
      width: double.infinity,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        width: double.infinity,
        height: height,
        color: AppColors.surfaceSecondary,
        child: const Center(
          child: Icon(Icons.storefront_rounded, size: 48, color: AppColors.primary),
        ),
      ),
    );
  }

  List<BranchModel> get _filteredBranches {
    return _branches.where((branch) {
      final matchesCity = _selectedCity == 'Tất cả tỉnh / thành phố' ||
          branch.city.toLowerCase().contains(_selectedCity.toLowerCase()) ||
          branch.address.toLowerCase().contains(_selectedCity.toLowerCase());
      return matchesCity;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final branches = _filteredBranches;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // --- HEADER ---
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
              child: Row(
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
                    child: Text(
                      'Hệ thống chi nhánh',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            // --- LỌC THEO TỈNH / THÀNH PHỐ ---
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Container(
                height: 48,
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
            ),

            const SizedBox(height: 16),

            // --- DANH SÁCH CHI NHÁNH ---
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
                itemCount: branches.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final branch = branches[index];
                  final displayImage = branch.imageUrl.isNotEmpty ? branch.imageUrl : 'assets/images/chinhanh.webp';

                  return InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => B06BranchDetailScreen(
                            branch: branch,
                            branchName: branch.name,
                            branchAddress: branch.address,
                            branchImage: displayImage,
                            branchPhone: branch.phone,
                          ),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildBranchImage(displayImage, height: 180),
                          Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  branch.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textHeading,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  branch.address,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.textSecondary,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
